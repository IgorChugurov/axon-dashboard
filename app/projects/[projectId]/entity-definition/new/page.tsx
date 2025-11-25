import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { EntityDefinitionFormUniversal } from "@/components/entity-definition/EntityDefinitionFormUniversal";
import { loadUIConfigFromFile } from "@/lib/universal-entity/config-loader";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

interface NewEntityDefinitionPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewEntityDefinitionPage({
  params,
}: NewEntityDefinitionPageProps) {
  const { projectId } = await params;

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

  // Загружаем UI конфиг
  const uiConfig = loadUIConfigFromFile("entity-definition");

  if (!uiConfig) {
    throw new Error("Failed to load config for entity-definition");
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter projectId={projectId} />

      <div className="rounded-lg border bg-card p-6">
        <EntityDefinitionFormUniversal
          projectId={projectId}
          mode="create"
          uiConfig={uiConfig}
        />
      </div>
    </div>
  );
}
