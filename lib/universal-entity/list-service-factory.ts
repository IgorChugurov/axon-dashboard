/**
 * Фабрика для создания сервисов загрузки данных и мутаций для универсального списка
 * Каждая функция возвращает объект с методами onLoadData, onDelete и опционально onCreate, onUpdate
 */

import type {
  LoadDataFn,
  LoadDataResult,
  LoadParams,
} from "@/components/universal-entity-list/types/list-types";
import {
  getEnvironmentsFromClient,
  deleteEnvironmentFromClient,
} from "@/lib/environments/client-service";
import type { Environment } from "@/lib/environments/types";
import {
  getEntityInstancesFromClient,
  deleteEntityInstanceFromClient,
} from "./instance-client-service";
import {
  getEntityDefinitionsFromClient,
  deleteEntityDefinitionFromClient,
} from "./entity-definition-client-service";
import {
  getFieldsFromClient,
  deleteFieldFromClient,
} from "./field-client-service";
import type {
  EntityInstanceWithFields,
  EntityDefinition,
  Field,
} from "./types";

/**
 * Интерфейс для сервиса списка
 */
export interface ListService<TData extends { id: string }> {
  onLoadData: LoadDataFn<TData>;
  onDelete: (id: string) => Promise<void>;
  onCreate?: (data: Partial<TData>) => Promise<TData>;
  onUpdate?: (id: string, data: Partial<TData>) => Promise<TData>;
}

/**
 * Создает сервис для работы со списком Environments
 */
export function createEnvironmentListService(
  projectId: string
): ListService<Environment> {
  const onLoadData: LoadDataFn<Environment> = async (params, _signal) => {
    const result = await getEnvironmentsFromClient(projectId, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      filters: params.filters,
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
  };

  const onDelete = async (id: string) => {
    await deleteEnvironmentFromClient(projectId, id);
  };

  return {
    onLoadData,
    onDelete,
  };
}

/**
 * Создает сервис для работы со списком Entity Instances
 *
 * @param entityDefinitionId - ID определения сущности
 * @param projectId - ID проекта
 * @param includeRelations - Опциональный массив имен полей-связей для загрузки
 *                          Если не указан, связи не загружаются
 *                          Если указан, загружаются только указанные связи
 * @param relationsAsIds - Если true, связи возвращаются как массивы ID, иначе как полные объекты
 */
export function createEntityInstanceListService(
  entityDefinitionId: string,
  projectId: string,
  options?: {
    includeRelations?: string[]; // имена полей для загрузки связей
    relationsAsIds?: boolean; // если true, связи как ID, иначе как объекты
  }
): ListService<EntityInstanceWithFields> {
  const onLoadData: LoadDataFn<EntityInstanceWithFields> = async (
    params,
    _signal
  ) => {
    const result = await getEntityInstancesFromClient(
      entityDefinitionId,
      projectId,
      {
        page: params.page,
        limit: params.limit,
        search: params.search,
        filters: params.filters,
        includeRelations: options?.includeRelations,
        relationsAsIds: options?.relationsAsIds,
      }
    );

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
  };

  const onDelete = async (id: string) => {
    await deleteEntityInstanceFromClient(projectId, id);
  };

  return {
    onLoadData,
    onDelete,
  };
}

/**
 * Создает сервис для работы со списком Entity Definitions
 */
export function createEntityDefinitionListService(
  projectId: string
): ListService<EntityDefinition> {
  const onLoadData: LoadDataFn<EntityDefinition> = async (params, _signal) => {
    const result = await getEntityDefinitionsFromClient(projectId, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      filters: params.filters,
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
  };

  const onDelete = async (id: string) => {
    await deleteEntityDefinitionFromClient(projectId, id);
  };

  return {
    onLoadData,
    onDelete,
  };
}

/**
 * Создает сервис для работы со списком Fields
 */
export function createFieldListService(
  entityDefinitionId: string,
  _projectId: string
): ListService<Field> {
  const onLoadData: LoadDataFn<Field> = async (params, _signal) => {
    const result = await getFieldsFromClient(entityDefinitionId, {
      page: params.page,
      limit: params.limit,
      search: params.search,
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
  };

  const onDelete = async (id: string) => {
    await deleteFieldFromClient(id);
  };

  return {
    onLoadData,
    onDelete,
  };
}
