/**
 * Client Component обертка для списка Entity Instances
 * Формирует EntityConfigFile из данных БД (EntityDefinition + Fields)
 * Использует фабрику сервисов для создания onLoadData и onDelete
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createEntityInstanceListService } from "@/lib/universal-entity/list-service-factory";
import { createEntityConfigFileFromDbData } from "@/lib/universal-entity/config-utils";
import type { RoutingConfig } from "./types/list-types";
import type {
  EntityDefinition,
  Field,
  EntityInstanceWithFields,
} from "@/lib/universal-entity/types";

interface EntityInstancesListClientProps {
  projectId: string;
  entityDefinition: EntityDefinition;
  fields: Field[];
  routing: RoutingConfig;
}

export function EntityInstancesListClient({
  projectId,
  entityDefinition,
  fields,
  routing,
}: EntityInstancesListClientProps) {
  // Формируем EntityConfigFile из данных БД
  const config = useMemo(
    () => createEntityConfigFileFromDbData(entityDefinition, fields),
    [entityDefinition, fields]
  );
  //console.log("EntityInstancesListClient config", config);

  // Определяем поля со связями для загрузки (только displayInTable)
  const relationFieldNames = useMemo(() => {
    return fields
      .filter(
        (f) =>
          f.relatedEntityDefinitionId &&
          (f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne") &&
          f.displayInTable
      )
      .map((f) => f.name);
  }, [fields]);

  // Создаем сервис через фабрику с опциями для relations
  const listService = useMemo(
    () =>
      createEntityInstanceListService(entityDefinition.id, projectId, {
        includeRelations:
          relationFieldNames.length > 0 ? relationFieldNames : undefined,
        relationsAsIds: false, // Загружаем полные объекты для отображения в таблице
      }),
    [entityDefinition.id, projectId, relationFieldNames]
  );

  // Заменяем {entityDefinitionId} в шаблонах URL
  const resolvedRouting = useMemo<RoutingConfig>(() => {
    return {
      createUrlTemplate: routing.createUrlTemplate.replace(
        "{entityDefinitionId}",
        entityDefinition.id
      ),
      editUrlTemplate: routing.editUrlTemplate.replace(
        "{entityDefinitionId}",
        entityDefinition.id
      ),
      detailsUrlTemplate: routing.detailsUrlTemplate.replace(
        "{entityDefinitionId}",
        entityDefinition.id
      ),
    };
  }, [routing, entityDefinition.id]);

  return (
    <UniversalEntityListClient<EntityInstanceWithFields>
      projectId={projectId}
      serviceType="entity-instance"
      config={config}
      routing={resolvedRouting}
      onLoadData={listService.onLoadData}
      onDelete={listService.onDelete}
    />
  );
}
