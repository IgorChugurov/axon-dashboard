import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { FieldForm } from "@/components/entity-definition/FieldForm";
import {
  getEntityDefinitionById,
  getEntityDefinitions,
  getFields,
  getFieldById,
} from "@/lib/universal-entity/config-service";
import { updateFieldAction } from "../actions";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EditFieldPageProps {
  params: Promise<{
    projectId: string;
    entityDefId: string;
    fieldId: string;
  }>;
}

export default async function EditFieldPage({ params }: EditFieldPageProps) {
  const { projectId, entityDefId, fieldId } = await params;

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

      <div className="rounded-lg border bg-card p-6">
        <FieldForm
          projectId={projectId}
          entityDefinitionId={entityDefId}
          mode="edit"
          initialData={field}
          availableEntities={availableEntities}
          availableFields={availableFields}
          onSubmit={async (data) => {
            "use server";
            return await updateFieldAction(
              projectId,
              entityDefId,
              fieldId,
              data
            );
          }}
        />
      </div>
    </div>
  );
}

