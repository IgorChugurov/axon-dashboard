/**
 * Клиентский сервис для работы с entity definitions через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 */

import { createClient } from "@/lib/supabase/client";
import type { EntityDefinition } from "./types";

/**
 * Преобразование данных из БД в типы TypeScript
 */
function transformEntityDefinition(row: any): EntityDefinition {
  return {
    id: row.id,
    name: row.name,
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
    filterEntityDefinitionIds: row.filter_entity_definition_ids,
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
