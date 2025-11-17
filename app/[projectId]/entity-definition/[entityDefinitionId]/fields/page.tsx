import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  getEntityDefinitionWithFields,
} from "@/lib/universal-entity/config-service";
import { FieldListClient } from "./FieldListClient";

interface FieldsPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function FieldsPage({ params }: FieldsPageProps) {
  const { projectId, entityDefinitionId } = await params;

  // Проверка прав доступа
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdminUser = await isAdmin(user.id);
  if (!isAdminUser) {
    redirect(`/${projectId}`);
  }

  // Загружаем entityDefinition и fields
  const result = await getEntityDefinitionWithFields(entityDefinitionId);

  if (!result || result.entityDefinition.projectId !== projectId) {
    notFound();
  }

  const { entityDefinition, fields } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {entityDefinition.name} Fields
        </h1>
        <p className="text-muted-foreground">
          Manage fields for this entity definition
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/${projectId}/entity-definition/${entityDefinitionId}/edit`}
          >
            Edit Entity
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${projectId}/entities/${entityDefinitionId}`}>
            View Instances
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <FieldListClient
          projectId={projectId}
          entityDefinitionId={entityDefinitionId}
          fields={fields}
        />
      </div>
    </div>
  );
}

