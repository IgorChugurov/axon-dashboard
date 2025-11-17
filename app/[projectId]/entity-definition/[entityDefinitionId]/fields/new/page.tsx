import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { FieldForm } from "@/components/entity-definition/FieldForm";
import {
  getEntityDefinitionById,
  getEntityDefinitions,
  getFields,
} from "@/lib/universal-entity/config-service";
import { createFieldAction } from "../actions";

interface NewFieldPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function NewFieldPage({ params }: NewFieldPageProps) {
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

  // Загружаем entityDefinition
  const entityDefinition = await getEntityDefinitionById(entityDefinitionId);

  if (!entityDefinition || entityDefinition.projectId !== projectId) {
    notFound();
  }

  // Загружаем все entity definitions проекта (для relations)
  const availableEntities = await getEntityDefinitions(projectId);

  // Загружаем все fields (для relationFieldId)
  const availableFields = await getFields();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Field</h1>
        <p className="text-muted-foreground">
          Add a new field to {entityDefinition.name}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <FieldForm
          projectId={projectId}
          entityDefinitionId={entityDefinitionId}
          mode="create"
          availableEntities={availableEntities}
          availableFields={availableFields}
          onSubmit={async (data) => {
            "use server";
            return await createFieldAction(projectId, entityDefinitionId, data);
          }}
        />
      </div>
    </div>
  );
}

