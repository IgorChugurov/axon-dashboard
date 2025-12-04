import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { FieldFormNew } from "@/components/entity-definition/FieldFormNew";
import { FieldFormUniversal } from "@/components/entity-definition/FieldFormUniversal";
import {
  getEntityDefinitionById,
  getEntityDefinitions,
  getFields,
  getFieldById,
} from "@/lib/universal-entity/config-service";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EditFieldPageProps {
  params: Promise<{
    projectId: string;
    entityDefId: string;
    fieldId: string;
  }>;
  searchParams: Promise<{ useUniversal?: string }>;
}

export default async function EditFieldPage({
  params,
  searchParams,
}: EditFieldPageProps) {
  const { projectId, entityDefId, fieldId } = await params;
  const { useUniversal } = await searchParams;
  const useUniversalForm = useUniversal === "true";

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

  // Загружаем field
  const field = await getFieldById(fieldId);

  if (!field || field.entityDefinitionId !== entityDefId) {
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
        fieldId={fieldId}
        fieldName={field.label || field.name}
      />

      <FieldFormUniversal
        projectId={projectId}
        entityDefinitionId={entityDefId}
        mode="edit"
        fieldId={fieldId}
        initialData={field}
        availableEntities={availableEntities}
        availableFields={availableFields}
      />

      {/* <FieldFormSwitcher
        useUniversal={useUniversalForm}
        projectId={projectId}
        entityDefId={entityDefId}
        fieldId={fieldId}
        mode="edit"
      />

      <div className="rounded-lg border bg-card p-6">
        {useUniversalForm ? (
          <FieldFormUniversal
            projectId={projectId}
            entityDefinitionId={entityDefId}
            mode="edit"
            fieldId={fieldId}
            initialData={field}
            availableEntities={availableEntities}
            availableFields={availableFields}
          />
        ) : (
          <FieldFormNew
            projectId={projectId}
            entityDefinitionId={entityDefId}
            mode="edit"
            fieldId={fieldId}
            initialData={field}
            availableEntities={availableEntities}
            availableFields={availableFields}
          />
        )}
      </div> */}
    </div>
  );
}
