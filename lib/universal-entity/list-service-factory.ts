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
  getProjectsFromClient,
  deleteProjectFromClient,
} from "@/lib/projects/client-service";
import type { Project } from "@/lib/projects/types";
import {
  getAdminsFromClient,
  deleteAdminFromClient,
} from "@/lib/admins/client-service";
import type { Admin } from "@/lib/admins/types";
import {
  getEntityDefinitionsFromClient,
  deleteEntityDefinitionFromClient,
} from "./entity-definition-client-service";
import {
  getFieldsFromClient,
  deleteFieldFromClient,
} from "./field-client-service";
import type { EntityDefinition, Field } from "./types";

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

/**
 * Создает сервис для работы со списком Projects
 * Примечание: Projects не привязаны к projectId, поэтому загружаем все проекты
 */
export function createProjectListService(): ListService<Project> {
  const onLoadData: LoadDataFn<Project> = async (params, _signal) => {
    const result = await getProjectsFromClient({
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
    await deleteProjectFromClient(id);
  };

  return {
    onLoadData,
    onDelete,
  };
}

/**
 * Создает сервис для работы со списком Admins проекта
 * Примечание: Показывает только админов конкретного проекта (projectSuperAdmin и projectAdmin)
 * superAdmin (project_id = NULL) не показывается в списке админов проекта
 * Доступ контролируется RLS политиками (только superAdmin и projectSuperAdmin могут видеть/управлять)
 */
export function createAdminListService(projectId: string): ListService<Admin> {
  const onLoadData: LoadDataFn<Admin> = async (params, _signal) => {
    const result = await getAdminsFromClient({
      page: params.page,
      limit: params.limit,
      search: params.search,
      filters: params.filters,
      projectId: projectId, // Фильтруем только админов этого проекта
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
    await deleteAdminFromClient(id);
  };

  return {
    onLoadData,
    onDelete,
  };
}
