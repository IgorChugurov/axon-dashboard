/**
 * Универсальная страница редактирования экземпляра сущности
 */

import { notFound } from "next/navigation";
import { getInstanceById } from "@/lib/universal-entity/instance-service";
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";
import { UniversalEntityForm } from "@/components/UniversalEntityForm";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EntityEditPageProps {
  params: Promise<{
    projectId: string;
    entityDefinitionId: string;
    instanceId: string;
  }>;
}

export default async function EntityEditPage({ params }: EntityEditPageProps) {
  const { projectId, entityDefinitionId, instanceId } = await params;

  // Получаем entity definition с полями и UI конфигом
  const config = await getEntityDefinitionWithUIConfig(entityDefinitionId);

  if (!config) {
    notFound();
  }

  // Определяем поля со связями для загрузки
  const relationFields = config.fields.filter(
    (f) =>
      f.relatedEntityDefinitionId &&
      (f.dbType === "manyToMany" ||
        f.dbType === "manyToOne" ||
        f.dbType === "oneToMany" ||
        f.dbType === "oneToOne")
  );

  const relationFieldNames = relationFields.map((f) => f.name);

  // Загружаем экземпляр с связями как ID (для редактирования)
  const instance = await getInstanceById(
    instanceId,
    relationFieldNames.length > 0 ? relationFieldNames : undefined,
    { relationsAsIds: true }
  );

  if (!instance || instance.entityDefinitionId !== entityDefinitionId) {
    notFound();
  }

  // Подготавливаем данные для формы (все поля уже на верхнем уровне, включая relations как ID)
  const formData: Record<string, any> = {};

  // Копируем все поля кроме системных
  const systemFields = [
    "id",
    "entityDefinitionId",
    "projectId",
    "createdAt",
    "updatedAt",
  ];
  for (const [key, value] of Object.entries(instance)) {
    if (!systemFields.includes(key)) {
      formData[key] = value;
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefinitionId}
        entityDefinitionName={config.entityDefinition.name}
      />

      <UniversalEntityForm
        entityDefinition={config.entityDefinition}
        fields={config.fields}
        uiConfig={config.uiConfig}
        mode="edit"
        initialData={formData}
        instanceId={instanceId}
        projectId={projectId}
      />
    </div>
  );
}
