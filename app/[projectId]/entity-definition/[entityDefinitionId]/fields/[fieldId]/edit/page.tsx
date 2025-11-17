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
import { updateFieldAction } from "../../actions";

interface EditFieldPageProps {
  params: Promise<{
    projectId: string;
    entityDefinitionId: string;
    fieldId: string;
  }>;
}

export default async function EditFieldPage({ params }: EditFieldPageProps) {
  const { projectId, entityDefinitionId, fieldId } = await params;

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

  // Загружаем entityDefinition
  const entityDefinition = await getEntityDefinitionById(entityDefinitionId);

  if (!entityDefinition || entityDefinition.projectId !== projectId) {
    notFound();
  }

  // Загружаем field
  const field = await getFieldById(fieldId);

  if (!field || field.entityDefinitionId !== entityDefinitionId) {
    notFound();
  }

  // Загружаем все entity definitions проекта (для relations)
  const availableEntities = await getEntityDefinitions(projectId);

  // Загружаем все fields (для relationFieldId)
  const availableFields = await getFields();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Field</h1>
        <p className="text-muted-foreground">
          Modify {field.label} ({field.name}) in {entityDefinition.name}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <FieldForm
          projectId={projectId}
          entityDefinitionId={entityDefinitionId}
          mode="edit"
          initialData={field}
          availableEntities={availableEntities}
          availableFields={availableFields}
          onSubmit={async (data) => {
            "use server";
            return await updateFieldAction(
              projectId,
              entityDefinitionId,
              fieldId,
              data
            );
          }}
        />
      </div>
    </div>
  );
}

