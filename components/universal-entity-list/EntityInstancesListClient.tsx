/**
 * Client Component обертка для списка Entity Instances
 * Формирует EntityConfigFile из данных БД (EntityDefinition + Fields)
 * Использует SDK напрямую для загрузки данных и удаления
 * Options для фильтров загружаются лениво при открытии фильтра
 */

"use client";

import { useMemo, useCallback } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createEntityConfigFileFromDbData } from "@/lib/universal-entity/config-utils";
import { useSDK } from "@/components/providers/SDKProvider";
// Примечание: relationFieldNames и searchableFields больше не нужны - SDK сам определяет из fields
import type { RoutingConfig, LoadDataFn, LoadParams } from "./types/list-types";
import type {
  EntityDefinition,
  Field,
  EntityInstanceWithFields,
} from "@igorchugurov/public-api-sdk";

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
  // Получаем SDK клиент из провайдера
  const { sdk } = useSDK();

  // Формируем EntityConfigFile из данных БД
  // Options для фильтров будут загружены лениво при открытии фильтра
  const config = useMemo(
    () => createEntityConfigFileFromDbData(entityDefinition, fields),
    [entityDefinition, fields]
  );

  // Примечание: relationFieldNames, searchableFields и relationFiltersInfo больше не нужны
  // SDK сам определяет все это из fields внутри getInstances()

  // Функция загрузки данных через SDK
  const onLoadData = useCallback<LoadDataFn<EntityInstanceWithFields>>(
    async (params: LoadParams) => {
      // Передаем режимы фильтрации для каждого relation-поля отдельно
      const relationFilterModes = params.filterModes || {};

      const result = await sdk.getInstances(entityDefinition.id, {
        page: params.page,
        limit: params.limit,
        search: params.search,
        // searchableFields, includeRelations и relationFilters удалены - SDK сам определяет из fields
        filters: params.filters,
        relationFilterModes,
        relationsAsIds: false, // Загружаем полные объекты для отображения в таблице
      });

      return {
        data: result.data || [],
        pagination: result.pagination || {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    },
    [sdk, entityDefinition.id]
  );

  // Функция удаления через SDK
  const onDelete = useCallback(
    async (id: string) => {
      await sdk.deleteInstance(entityDefinition.id, id);
    },
    [sdk, entityDefinition.id]
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
      onLoadData={onLoadData}
      onDelete={onDelete}
    />
  );
}
