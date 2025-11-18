/**
 * Универсальная страница списка экземпляров сущности
 */

import { getInstances } from "@/lib/universal-entity/instance-service";
import { EntityListClient } from "./EntityListClient";
import { EntityDefinitionServerWrapper } from "./EntityDefinitionServerWrapper";

interface EntityListPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function EntityListPage({
  params,
  searchParams,
}: EntityListPageProps) {
  const { projectId, entityDefinitionId } = await params;
  const searchParamsResolved = await searchParams;
  const page = parseInt(searchParamsResolved.page || "1", 10);
  const search = searchParamsResolved.search || "";

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
              f.dbType === "oneToOne") &&
            f.displayInTable // Загружаем только связи, которые отображаются в таблице
        );

        const relationFieldNames = relationFields.map((f) => f.name);

        // Загружаем экземпляры с связями
        const instances = await getInstances(
          entityDefinitionId,
          projectId,
          {
            limit: 10,
            offset: (page - 1) * 10,
            includeRelations:
              relationFieldNames.length > 0 ? relationFieldNames : undefined,
            // TODO: Добавить поиск по полям
          }
        );

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {entityDefinition.name}
              </h1>
              {entityDefinition.description && (
                <p className="text-muted-foreground">
                  {entityDefinition.description}
                </p>
              )}
            </div>

            <EntityListClient
              entityDefinition={entityDefinition}
              fields={fields}
              initialInstances={instances}
              initialPage={page}
              initialSearch={search}
            />
          </div>
        );
      }}
    </EntityDefinitionServerWrapper>
  );
}
