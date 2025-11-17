/**
 * Универсальная страница редактирования экземпляра сущности
 */

import { notFound } from "next/navigation";
import { getInstanceById } from "@/lib/universal-entity/instance-service";
import { EntityFormClient } from "../../EntityFormClient";
import { EntityDefinitionServerWrapper } from "../../EntityDefinitionServerWrapper";

interface EntityEditPageProps {
  params: Promise<{
    projectId: string;
    entityDefinitionId: string;
    instanceId: string;
  }>;
}

export default async function EntityEditPage({ params }: EntityEditPageProps) {
  const { projectId, entityDefinitionId, instanceId } = await params;

  return (
    <EntityDefinitionServerWrapper
      projectId={projectId}
      entityDefinitionId={entityDefinitionId}
    >
      {async ({ entityDefinition, fields }) => {
        // Определяем поля со связями для загрузки
        const relationFields = fields.filter(
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

        // Фильтруем поля для формы редактирования
        const editFields = fields.filter((f) => f.forEditPage);

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Edit {entityDefinition.name}
              </h1>
              {entityDefinition.description && (
                <p className="text-muted-foreground">
                  {entityDefinition.description}
                </p>
              )}
            </div>

            <EntityFormClient
              entityDefinition={entityDefinition}
              fields={editFields}
              mode="edit"
              initialData={formData}
              instanceId={instanceId}
            />
          </div>
        );
      }}
    </EntityDefinitionServerWrapper>
  );
}
