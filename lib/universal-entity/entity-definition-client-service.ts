/**
 * Клиентский сервис для работы с entity definitions через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 */

import { createClient } from "@/lib/supabase/client";
import type { EntityDefinition } from "@igorchugurov/public-api-sdk";

/**
 * Преобразование данных из БД в типы TypeScript
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 * any используется для row, так как данные приходят из Supabase без строгой типизации
 */
function transformEntityDefinition(row: any): EntityDefinition {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    tableName: row.table_name,
    type: row.type,
    projectId: row.project_id,
    createPermission: row.create_permission,
    readPermission: row.read_permission,
    updatePermission: row.update_permission,
    deletePermission: row.delete_permission,
    titleSection0: row.title_section_0,
    titleSection1: row.title_section_1,
    titleSection2: row.title_section_2,
    titleSection3: row.title_section_3,
    // UI Configuration
    uiConfig: row.ui_config,
    enablePagination: row.enable_pagination,
    pageSize: row.page_size,
    enableFilters: row.enable_filters,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Интерфейс для ответа со списком entity definitions
 */
export interface EntityDefinitionsResponse {
  data: EntityDefinition[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

/**
 * Получение списка entity definitions для проекта с пагинацией и поиском
 * Используется в Client Components для SPA навигации
 */
export async function getEntityDefinitionsFromClient(
  projectId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string[]>;
  } = {}
): Promise<EntityDefinitionsResponse> {
  const supabase = createClient(); // Браузерный клиент

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Начинаем запрос
  let query = supabase
    .from("entity_definition")
    .select("*", { count: "exact" })
    .eq("project_id", projectId);

  // Поиск по name и tableName (если указан)
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,table_name.ilike.%${params.search}%`
    );
  }

  // Применяем фильтры
  if (params.filters) {
    Object.entries(params.filters).forEach(([fieldName, values]) => {
      if (values && values.length > 0) {
        // Преобразуем camelCase в snake_case для БД
        const dbFieldName = fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
        query = query.in(dbFieldName, values);
      }
    });
  }

  // Сортировка по имени
  query = query.order("name", { ascending: true });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Entity Definitions Client Service] Error:", error);
    throw new Error(`Failed to fetch entity definitions: ${error.message}`);
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return {
    data: (data || []).map(transformEntityDefinition),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage,
      hasNextPage,
    },
  };
}

/**
 * Данные для создания entity definition
 */
export interface CreateEntityDefinitionData {
  name: string;
  description?: string | null;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  createPermission?: string;
  readPermission?: string;
  updatePermission?: string;
  deletePermission?: string;
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;
  enablePagination?: boolean | null;
  pageSize?: number | null;
  enableFilters?: boolean | null;
}

/**
 * Данные для обновления entity definition
 */
export interface UpdateEntityDefinitionData {
  name?: string;
  description?: string | null;
  type?: "primary" | "secondary" | "tertiary";
  createPermission?: string;
  readPermission?: string;
  updatePermission?: string;
  deletePermission?: string;
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;
  enablePagination?: boolean | null;
  pageSize?: number | null;
  enableFilters?: boolean | null;
}

/**
 * Создание entity definition
 * Используется в Client Components для мутаций
 */
export async function createEntityDefinitionFromClient(
  projectId: string,
  data: CreateEntityDefinitionData
): Promise<EntityDefinition> {
  const supabase = createClient();

  // Валидация
  if (!data.name || data.name.length < 2) {
    throw new Error("Name must be at least 2 characters long");
  }

  if (!data.tableName || !/^[a-z_]+$/.test(data.tableName)) {
    throw new Error(
      "Table name must be lowercase with underscores only (e.g., my_table)"
    );
  }

  // Валидация pageSize
  if (data.pageSize !== null && data.pageSize !== undefined) {
    if (data.pageSize < 1 || data.pageSize > 100) {
      throw new Error("Page size must be between 1 and 100");
    }
  }

  // Проверка уникальности name в проекте
  const { data: existingByName } = await supabase
    .from("entity_definition")
    .select("id")
    .eq("project_id", projectId)
    .eq("name", data.name)
    .single();

  if (existingByName) {
    throw new Error(
      `Entity with name "${data.name}" already exists in this project`
    );
  }

  // Проверка уникальности table_name в проекте
  const { data: existingByTableName } = await supabase
    .from("entity_definition")
    .select("id")
    .eq("project_id", projectId)
    .eq("table_name", data.tableName)
    .single();

  if (existingByTableName) {
    throw new Error(
      `Entity with table name "${data.tableName}" already exists in this project`
    );
  }

  // Генерация уникального slug
  const { generateUniqueSlugForEntityDefinition } = await import(
    "@/lib/utils/slug"
  );
  const slug = await generateUniqueSlugForEntityDefinition(
    data.name,
    projectId,
    async (slugToCheck, projectIdToCheck) => {
      const { data: existing } = await supabase
        .from("entity_definition")
        .select("id")
        .eq("project_id", projectIdToCheck)
        .eq("slug", slugToCheck)
        .single();
      return !!existing;
    }
  );

  // Создание
  const { data: created, error } = await supabase
    .from("entity_definition")
    .insert({
      name: data.name,
      slug: slug,
      description: data.description || null,
      table_name: data.tableName,
      type: data.type,
      project_id: projectId,
      create_permission: data.createPermission || "Admin",
      read_permission: data.readPermission || "ALL",
      update_permission: data.updatePermission || "Admin",
      delete_permission: data.deletePermission || "Admin",
      title_section_0: data.titleSection0 || null,
      title_section_1: data.titleSection1 || null,
      title_section_2: data.titleSection2 || null,
      title_section_3: data.titleSection3 || null,
      enable_pagination: data.enablePagination ?? true,
      page_size: data.pageSize ?? 20,
      enable_filters: data.enableFilters ?? false,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[Entity Definitions Client Service] Create error:", error);
    throw new Error(`Failed to create entity definition: ${error.message}`);
  }

  return transformEntityDefinition(created);
}

/**
 * Обновление entity definition
 * Используется в Client Components для мутаций
 */
export async function updateEntityDefinitionFromClient(
  id: string,
  data: UpdateEntityDefinitionData
): Promise<EntityDefinition> {
  const supabase = createClient();

  // Валидация name
  if (data.name !== undefined && data.name.length < 2) {
    throw new Error("Name must be at least 2 characters long");
  }

  // Валидация pageSize
  if (data.pageSize !== null && data.pageSize !== undefined) {
    if (data.pageSize < 1 || data.pageSize > 100) {
      throw new Error("Page size must be between 1 and 100");
    }
  }

  // Подготовка данных для обновления
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // any используется для updateData, так как структура данных для Supabase может варьироваться
  const updateData: Record<string, any> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.createPermission !== undefined)
    updateData.create_permission = data.createPermission;
  if (data.readPermission !== undefined)
    updateData.read_permission = data.readPermission;
  if (data.updatePermission !== undefined)
    updateData.update_permission = data.updatePermission;
  if (data.deletePermission !== undefined)
    updateData.delete_permission = data.deletePermission;
  if (data.titleSection0 !== undefined)
    updateData.title_section_0 = data.titleSection0;
  if (data.titleSection1 !== undefined)
    updateData.title_section_1 = data.titleSection1;
  if (data.titleSection2 !== undefined)
    updateData.title_section_2 = data.titleSection2;
  if (data.titleSection3 !== undefined)
    updateData.title_section_3 = data.titleSection3;
  if (data.enablePagination !== undefined)
    updateData.enable_pagination = data.enablePagination;
  if (data.pageSize !== undefined) updateData.page_size = data.pageSize;
  if (data.enableFilters !== undefined)
    updateData.enable_filters = data.enableFilters;

  // Обновление
  const { data: updated, error } = await supabase
    .from("entity_definition")
    // @ts-expect-error - Dynamic update payload
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Entity Definitions Client Service] Update error:", error);
    throw new Error(`Failed to update entity definition: ${error.message}`);
  }

  return transformEntityDefinition(updated);
}

/**
 * Удаление entity definition
 * Используется в Client Components для мутаций
 */
export async function deleteEntityDefinitionFromClient(
  projectId: string,
  id: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("entity_definition")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId); // Дополнительная проверка безопасности

  if (error) {
    console.error("[Entity Definitions Client Service] Delete error:", error);
    throw new Error(`Failed to delete entity definition: ${error.message}`);
  }
}
