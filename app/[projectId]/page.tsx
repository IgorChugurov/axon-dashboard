import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/projects/types";
import { isAdmin } from "@/lib/auth/roles";
import { getEntityDefinitions } from "@/lib/universal-entity/config-service";
import { loadUIConfigFromFile } from "@/lib/universal-entity/config-loader";
import { UniversalEntityList } from "@/components/UniversalEntityList";
import type { EntityDefinition } from "@/lib/universal-entity/types";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  // Проверяем существование проекта
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  // Проверяем права доступа
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdminUser = user ? await isAdmin(user.id) : false;

  // Получаем entityDefinitions
  const entityDefinitions = await getEntityDefinitions(projectId);

  // Загружаем UI конфиг для entityDefinitions
  const uiConfig = loadUIConfigFromFile("entity-definitions");

  if (!uiConfig) {
    throw new Error("Failed to load UI config for entity definitions");
  }

  // Создаем фиктивную entityDefinition для использования в UniversalEntityList
  // (так как entityDefinitions сами являются определениями, а не экземплярами)
  const entityDefinitionForList: EntityDefinition = {
    id: "entity-definition-list",
    name: "Entity Definition",
    url: "/api/entity-definitions",
    tableName: "entity_definition",
    type: "primary",
    projectId: projectId,
    createPermission: "Admin",
    readPermission: "ALL",
    updatePermission: "Admin",
    deletePermission: "Admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {(project as Project).name}
        </h1>
        {(project as Project).description && (
          <p className="text-muted-foreground">
            {(project as Project).description}
          </p>
        )}
      </div>

      <UniversalEntityList
        entityDefinition={entityDefinitionForList}
        fields={[]}
        uiConfig={uiConfig}
        initialInstances={entityDefinitions}
        initialPage={1}
        initialSearch=""
        projectId={projectId}
      />
    </div>
  );
}

