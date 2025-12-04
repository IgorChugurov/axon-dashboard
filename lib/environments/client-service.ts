/**
 * Клиентский сервис для работы с environments через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 */

import { createClient } from "@/lib/supabase/client";
import type {
  Environment,
  CreateEnvironmentData,
  UpdateEnvironmentData,
  EnvironmentsResponse,
} from "./types";
import { transformEnvironment } from "./transformers";

/**
 * Получение списка environments для проекта с пагинацией и поиском
 * Используется в Client Components для SPA навигации
 */
export async function getEnvironmentsFromClient(
  projectId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string[]>;
  } = {}
): Promise<EnvironmentsResponse> {
  const supabase = createClient(); // Браузерный клиент

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Начинаем запрос
  let query = supabase
    .from("environments")
    .select("*", { count: "exact" })
    .eq("project_id", projectId);

  // Поиск по ключу (если указан)
  if (params.search) {
    query = query.ilike("key", `%${params.search}%`);
  }

  // Применяем фильтры
  if (params.filters) {
    Object.entries(params.filters).forEach(([fieldName, values]) => {
      if (values && values.length > 0) {
        // Для множественного выбора используем .in()
        query = query.in(fieldName, values);
      }
    });
  }

  // Сортировка по ключу
  query = query.order("key", { ascending: true });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Environments Client Service] Error:", error);
    throw new Error(`Failed to fetch environments: ${error.message}`);
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return {
    data: (data || []).map(transformEnvironment),
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
 * Удаление environment
 * Используется в Client Components для мутаций
 */
export async function deleteEnvironmentFromClient(
  projectId: string,
  id: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("environments")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId); // Дополнительная проверка безопасности

  if (error) {
    console.error("[Environments Client Service] Delete error:", error);
    throw new Error(`Failed to delete environment: ${error.message}`);
  }
}

/**
 * Создание нового environment
 * Используется в Client Components для мутаций
 */
export async function createEnvironmentFromClient(
  projectId: string,
  data: CreateEnvironmentData
): Promise<Environment> {
  const supabase = createClient();

  // Подготавливаем данные для вставки
  const insertData = {
    project_id: projectId,
    key: data.key,
    type: data.type,
    value: data.value !== null ? data.value : null,
    options: data.options || [],
  };

  const { data: created, error } = await supabase
    .from("environments")
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    console.error("[Environments Client Service] Create error:", error);
    throw new Error(`Failed to create environment: ${error.message}`);
  }

  return transformEnvironment(created);
}

/**
 * Обновление environment
 * Используется в Client Components для мутаций
 */
export async function updateEnvironmentFromClient(
  id: string,
  data: UpdateEnvironmentData
): Promise<Environment> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (data.key !== undefined) updateData.key = data.key;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.options !== undefined) updateData.options = data.options;

  const { data: updated, error } = await supabase
    .from("environments")
    .update(updateData as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Environments Client Service] Update error:", error);
    throw new Error(`Failed to update environment: ${error.message}`);
  }

  return transformEnvironment(updated);
}
