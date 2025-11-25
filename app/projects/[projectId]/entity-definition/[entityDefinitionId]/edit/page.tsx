import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { EntityDefinitionFormUniversal } from "@/components/entity-definition/EntityDefinitionFormUniversal";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import { loadUIConfigFromFile } from "@/lib/universal-entity/config-loader";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

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
    redirect(`/projects/${projectId}`);
  }

  // Загружаем entityDefinition
  const entityDefinition = await getEntityDefinitionById(entityDefinitionId);

  if (!entityDefinition || entityDefinition.projectId !== projectId) {
    notFound();
  }

  // Загружаем UI конфиг
  const uiConfig = loadUIConfigFromFile("entity-definition");

  if (!uiConfig) {
    throw new Error("Failed to load config for entity-definition");
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter
        projectId={projectId}
        entityDefinitionId={entityDefinitionId}
        entityDefinitionName={entityDefinition.name}
      />

      <div className="rounded-lg border bg-card p-6">
        <EntityDefinitionFormUniversal
          projectId={projectId}
          mode="edit"
          entityDefinitionId={entityDefinitionId}
          initialData={entityDefinition}
          uiConfig={uiConfig}
        />
      </div>
    </div>
  );
}
