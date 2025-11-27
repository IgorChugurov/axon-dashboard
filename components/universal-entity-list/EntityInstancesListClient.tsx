/**
 * Client Component обертка для списка Entity Instances
 * Формирует EntityConfigFile из данных БД (EntityDefinition + Fields)
 * Использует фабрику сервисов для создания onLoadData и onDelete
 * Загружает options для relation-полей с filterableInList: true
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createEntityInstanceListService } from "@/lib/universal-entity/list-service-factory";
import { createEntityConfigFileFromDbData } from "@/lib/universal-entity/config-utils";
import { useRelationFieldOptions } from "./hooks/use-relation-field-options";
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
  // Загружаем options для relation-полей с filterableInList: true
  const { fieldsWithOptions, isLoading: optionsLoading } =
    useRelationFieldOptions(fields);

  // DEBUG: Проверка данных для фильтров

  // Формируем EntityConfigFile из данных БД (с обогащенными полями)
  const config = useMemo(
    () => createEntityConfigFileFromDbData(entityDefinition, fieldsWithOptions),
    [entityDefinition, fieldsWithOptions]
  );
  //console.log("EntityInstancesListClient config", config);

  // Определяем поля со связями для загрузки (только displayInTable)
  const relationFieldNames = useMemo(() => {
    return fieldsWithOptions
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
  }, [fieldsWithOptions]);

  // Определяем relation-поля для фильтрации (filterableInList: true)
  const relationFiltersInfo = useMemo(() => {
    return fieldsWithOptions
      .filter(
        (f) =>
          f.filterableInList &&
          f.relatedEntityDefinitionId &&
          (f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne")
      )
      .map((f) => ({
        fieldName: f.name,
        fieldId: f.id,
      }));
  }, [fieldsWithOptions]);

  // Определяем searchable поля для поиска в JSONB
  const searchableFields = useMemo(() => {
    const searchable = fieldsWithOptions
      .filter((f) => f.searchable)
      .map((f) => f.name);
    // Если нет searchable полей, используем "name" по умолчанию
    return searchable.length > 0 ? searchable : ["name"];
  }, [fieldsWithOptions]);

  // Создаем сервис через фабрику с опциями для relations
  const listService = useMemo(
    () =>
      createEntityInstanceListService(entityDefinition.id, projectId, {
        includeRelations:
          relationFieldNames.length > 0 ? relationFieldNames : undefined,
        relationsAsIds: false, // Загружаем полные объекты для отображения в таблице
        relationFilters:
          relationFiltersInfo.length > 0 ? relationFiltersInfo : undefined,
        searchableFields,
      }),
    [
      entityDefinition.id,
      projectId,
      relationFieldNames,
      relationFiltersInfo,
      searchableFields,
    ]
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
