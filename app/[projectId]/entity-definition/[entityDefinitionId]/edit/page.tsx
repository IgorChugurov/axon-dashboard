import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { EntityDefinitionForm } from "@/components/entity-definition/EntityDefinitionForm";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import { updateEntityDefinitionAction } from "../../actions";

interface EditEntityDefinitionPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function EditEntityDefinitionPage({
  params,
}: EditEntityDefinitionPageProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Entity Definition
        </h1>
        <p className="text-muted-foreground">
          Modify {entityDefinition.name} configuration
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <EntityDefinitionForm
          projectId={projectId}
          mode="edit"
          initialData={entityDefinition}
          onSubmit={async (data) => {
            "use server";
            return await updateEntityDefinitionAction(
              projectId,
              entityDefinitionId,
              data
            );
          }}
        />
      </div>
    </div>
  );
}

