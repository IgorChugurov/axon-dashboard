import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { EntityDefinitionFormNew } from "@/components/entity-definitions/EntityDefinitionFormNew";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EditEntityDefinitionPageProps {
  params: Promise<{ projectId: string; entityDefId: string }>;
}

export default async function EditEntityDefinitionPage({
  params,
}: EditEntityDefinitionPageProps) {
  const { projectId, entityDefId } = await params;

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
    redirect(`/projects/${projectId}`);
  }

  // Загружаем entityDefinition
  const entityDefinition = await getEntityDefinitionById(entityDefId);

  if (!entityDefinition || entityDefinition.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
        entityDefinitionName={entityDefinition.name}
      />

      <div className="rounded-lg border bg-card p-6">
        <EntityDefinitionFormNew
          projectId={projectId}
          mode="edit"
          entityDefinitionId={entityDefId}
          initialData={entityDefinition}
        />
      </div>
    </div>
  );
}
