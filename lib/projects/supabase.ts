/**
 * Работа с проектами через Supabase
 * Заменяет старый backend API
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ServerDataParams } from "@/lib/server-data/types";
import type { Project, CreateProjectData } from "./types";

/**
 * Преобразование данных из БД в типы TypeScript
 * Конвертирует snake_case из БД в camelCase для TypeScript
 */
function transformProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    enableSignIn: row.enable_sign_in ?? true,
    enableSignUp: row.enable_sign_up ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SupabaseProjectsResponse {
  data: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

/**
 * Получение проектов из Supabase с пагинацией и поиском
 */
export async function getProjectsFromSupabase(
  params: ServerDataParams = {}
): Promise<SupabaseProjectsResponse> {
  const supabase = await createClient();

  // Настройки пагинации
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  console.log("[Supabase Projects] Getting projects with params:", {
    page,
    limit,
    offset,
    search: params.search,
    filters: params.filters,
  });

  // Начинаем запрос
  // RLS автоматически применит правильные политики:
  // - Админы увидят все проекты
  // - Обычные пользователи увидят только свои
  let query = supabase.from("projects").select("*", { count: "exact" }); // count для получения общего количества

  // Поиск по имени (если указан)
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Фильтрация по статусу (если указан)
  if (params.filters?.status) {
    query = query.eq("status", params.filters.status);
  }

  // Сортировка
  const sortBy = params.sortBy || "created_at";
  const sortOrder = params.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Supabase Projects] Error:", error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  console.log("[Supabase Projects] Success:", {
    count: data?.length || 0,
    total,
    page,
    totalPages,
  });

  return {
    data: (data || []).map(transformProject),
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
 * Создание проекта в Supabase
 */
export async function createProjectInSupabase(
  projectData: CreateProjectData & { status?: string }
): Promise<Project> {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    throw new Error("Unauthorized");
  }

  const insertData = {
    name: projectData.name,
    description: projectData.description || null,
    status: projectData.status || "active",
    created_by: user.data.user.id,
    enable_sign_in: projectData.enableSignIn ?? true,
    enable_sign_up: projectData.enableSignUp ?? true,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    console.error("[Supabase Projects] Create error:", error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return transformProject(data);
}

/**
 * Обновление проекта в Supabase
 */
export async function updateProjectInSupabase(
  id: string,
  projectData: Partial<
    Pick<
      Project,
      "name" | "description" | "status" | "enableSignIn" | "enableSignUp"
    >
  >
): Promise<Project> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (projectData.name !== undefined) updateData.name = projectData.name;
  if (projectData.description !== undefined)
    updateData.description = projectData.description;
  if (projectData.status !== undefined) updateData.status = projectData.status;
  if (projectData.enableSignIn !== undefined)
    updateData.enable_sign_in = projectData.enableSignIn;
  if (projectData.enableSignUp !== undefined)
    updateData.enable_sign_up = projectData.enableSignUp;

  const { data, error } = await supabase
    .from("projects")
    .update(updateData as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Supabase Projects] Update error:", error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return transformProject(data);
}

/**
 * Удаление проекта из Supabase
 */
export async function deleteProjectFromSupabase(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("[Supabase Projects] Delete error:", error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

/**
 * Получение всех проектов без пагинации (для сайдбара)
 */
export async function getAllProjectsFromSupabase(): Promise<Project[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[Supabase Projects] Error loading all projects:", error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return (data as Project[]) || [];
}
