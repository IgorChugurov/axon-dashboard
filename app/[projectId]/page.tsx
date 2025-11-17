import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/projects/types";
import { useEntityDefinitions } from "@/components/providers/EntityDefinitionsProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Settings, List } from "lucide-react";
import { isAdmin } from "@/lib/auth/roles";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  // Проверяем существование проекта
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  // Проверяем права доступа
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdminUser = user ? await isAdmin(user.id) : false;

  // Получаем entityDefinitions из Context через специальный компонент
  // Но так как это server component, мы не можем использовать Context напрямую
  // Поэтому загружаем их заново (они будут из кеша)
  const { getEntityDefinitions } = await import(
    "@/lib/universal-entity/config-service"
  );
  const entityDefinitions = await getEntityDefinitions(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {(project as Project).name}
        </h1>
        {(project as Project).description && (
          <p className="text-muted-foreground">
            {(project as Project).description}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Entities</h2>
          {isAdminUser && (
            <Button asChild>
              <Link href={`/${projectId}/entity-definition/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Entity
              </Link>
            </Button>
          )}
        </div>
        {entityDefinitions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No entities configured for this project.
            </p>
            {isAdminUser && (
              <Button asChild variant="outline">
                <Link href={`/${projectId}/entity-definition/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Entity
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entityDefinitions.map((entity) => (
              <div
                key={entity.id}
                className="rounded-lg border p-4 hover:bg-accent transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/${projectId}/entities/${entity.id}`}
                    className="flex-1"
                  >
                    <h3 className="font-semibold">{entity.name}</h3>
                    {entity.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entity.description}
                      </p>
                    )}
                  </Link>
                </div>
                {isAdminUser && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/${projectId}/entity-definition/${entity.id}/edit`}
                      >
                        <Settings className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/${projectId}/entity-definition/${entity.id}/fields`}
                      >
                        <List className="mr-1 h-3 w-3" />
                        Fields
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

