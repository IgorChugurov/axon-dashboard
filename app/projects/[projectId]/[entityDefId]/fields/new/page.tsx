import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { FieldFormNew } from "@/components/entity-definition/FieldFormNew";
import {
  getEntityDefinitionById,
  getEntityDefinitions,
  getFields,
} from "@/lib/universal-entity/config-service";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface NewFieldPageProps {
  params: Promise<{ projectId: string; entityDefId: string }>;
}

export default async function NewFieldPage({ params }: NewFieldPageProps) {
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

  // Загружаем все entity definitions проекта (для relations)
  const availableEntities = await getEntityDefinitions(projectId);

  // Загружаем все fields (для relationFieldId)
  const availableFields = await getFields();

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
        entityDefinitionName={entityDefinition.name}
      />

      <div className="rounded-lg border bg-card p-6">
        <FieldFormNew
          projectId={projectId}
          entityDefinitionId={entityDefId}
          mode="create"
          availableEntities={availableEntities}
          availableFields={availableFields}
        />
      </div>
    </div>
  );
}
