import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import {
  getEntityDefinitionWithFields,
} from "@/lib/universal-entity/config-service";
import { loadUIConfigFromFile } from "@/lib/universal-entity/config-loader";
import { UniversalEntityList } from "@/components/UniversalEntityList";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { EntityDefinition } from "@/lib/universal-entity/types";

interface FieldsPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function FieldsPage({ params }: FieldsPageProps) {
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

  // Загружаем entityDefinition и fields
  const result = await getEntityDefinitionWithFields(entityDefinitionId);

  if (!result || result.entityDefinition.projectId !== projectId) {
    notFound();
  }

  const { entityDefinition, fields } = result;

  // Загружаем UI конфиг для fields
  const uiConfig = loadUIConfigFromFile("fields");

  if (!uiConfig) {
    throw new Error("Failed to load UI config for fields");
  }

  // Создаем фиктивную entityDefinition для использования в UniversalEntityList
  const entityDefinitionForList: EntityDefinition = {
    id: "field-list",
    name: "Field",
    url: "/api/entity-fields",
    tableName: "field",
    type: "primary",
    projectId: projectId,
    createPermission: "Admin",
    readPermission: "ALL",
    updatePermission: "Admin",
    deletePermission: "Admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Сортируем поля по displayIndex
  const sortedFields = [...fields].sort(
    (a, b) => a.displayIndex - b.displayIndex
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        projectId={projectId}
        entityDefinitionId={entityDefinitionId}
        entityDefinitionName={entityDefinition.name}
      />

      <UniversalEntityList
        entityDefinition={entityDefinitionForList}
        fields={[]}
        uiConfig={uiConfig}
        initialInstances={sortedFields}
        initialPage={1}
        initialSearch=""
        projectId={projectId}
      />
    </div>
  );
}

