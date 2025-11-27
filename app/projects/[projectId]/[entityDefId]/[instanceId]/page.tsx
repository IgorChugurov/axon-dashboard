/**
 * Универсальная страница редактирования экземпляра сущности
 * URL: /projects/:projectId/:entityDefId/:instanceId
 * Использует UniversalEntityFormNew с React Query мутациями
 */

import { notFound } from "next/navigation";
import { getInstanceById } from "@/lib/universal-entity/instance-service";
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";
import { EntityInstanceFormNew } from "@/components/entity-instances/EntityInstanceFormNew";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EntityEditPageProps {
  params: Promise<{
    projectId: string;
    entityDefId: string;
    instanceId: string;
  }>;
}

export default async function EntityEditPage({ params }: EntityEditPageProps) {
  const { projectId, entityDefId, instanceId } = await params;

  // Получаем entity definition с полями и UI конфигом
  const config = await getEntityDefinitionWithUIConfig(entityDefId);

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

  if (!instance || instance.entityDefinitionId !== entityDefId) {
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
        entityDefinitionId={entityDefId}
        entityDefinitionName={config.entityDefinition.name}
      />

      <EntityInstanceFormNew
        projectId={projectId}
        entityDefinition={config.entityDefinition}
        fields={config.fields}
        uiConfig={config.uiConfig}
        mode="edit"
        instanceId={instanceId}
        initialData={formData}
      />
    </div>
  );
}
