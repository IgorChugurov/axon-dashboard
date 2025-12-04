/**
 * Сервис для работы с environments через Supabase
 * Прямые запросы к Supabase без API роутов
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Environment,
  CreateEnvironmentData,
  UpdateEnvironmentData,
  EnvironmentsResponse,
} from "./types";
import { transformEnvironment } from "./transformers";

/**
 * Получение списка environments для проекта с пагинацией и поиском
 */
export async function getEnvironments(
  projectId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<EnvironmentsResponse> {
  const supabase = await createClient();

  // Проверяем авторизацию
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[Environments Service] Auth error:", authError);
  }

  console.log("[Environments Service] Getting environments:", {
    projectId,
    page: params.page || 1,
    limit: params.limit || 20,
    search: params.search,
    userId: user?.id || "not authenticated",
  });

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

  // Сортировка по ключу
  query = query.order("key", { ascending: true });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Environments Service] Query error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: JSON.stringify(error, null, 2),
    });
    const errorMessage =
      error.message ||
      error.details ||
      error.hint ||
      JSON.stringify(error) ||
      "Unknown error occurred";
    throw new Error(`Failed to fetch environments: ${errorMessage}`);
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  console.log("[Environments Service] Success:", {
    count: data?.length || 0,
    total,
    page,
    totalPages,
  });

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
 * Получение одного environment по ID
 */
export async function getEnvironmentById(id: string): Promise<Environment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("environments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[Environments Service] Get error:", error);
    throw new Error(`Failed to fetch environment: ${error.message}`);
  }

  return transformEnvironment(data);
}

/**
 * Создание нового environment
 */
export async function createEnvironment(
  projectId: string,
  data: CreateEnvironmentData
): Promise<Environment> {
  const supabase = await createClient();

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
    console.error("[Environments Service] Create error:", error);
    throw new Error(`Failed to create environment: ${error.message}`);
  }

  return transformEnvironment(created);
}

/**
 * Обновление environment
 */
export async function updateEnvironment(
  id: string,
  data: UpdateEnvironmentData
): Promise<Environment> {
  const supabase = await createClient();

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
    console.error("[Environments Service] Update error:", error);
    throw new Error(`Failed to update environment: ${error.message}`);
  }

  return transformEnvironment(updated);
}

/**
 * Удаление environment
 */
export async function deleteEnvironment(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("environments").delete().eq("id", id);

  if (error) {
    console.error("[Environments Service] Delete error:", error);
    throw new Error(`Failed to delete environment: ${error.message}`);
  }
}

