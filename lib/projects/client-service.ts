/**
 * Клиентский сервис для работы с projects через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 */

import { createClient } from "@/lib/supabase/client";
import type { Project, CreateProjectData, UpdateProjectData } from "./types";

export interface ProjectsResponse {
  data: Project[];
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

/**
 * Получение списка projects с пагинацией и поиском
 * Используется в Client Components для SPA навигации
 * Фильтрует проекты по доступным для текущего пользователя (использует get_accessible_project_ids)
 */
export async function getProjectsFromClient(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string[]>;
  } = {}
): Promise<ProjectsResponse> {
  const supabase = createClient();

  // Получаем текущего пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Получаем доступные проекты через RPC функцию
  const { data: accessibleProjectIds, error: rpcError } = await supabase.rpc(
    "get_accessible_project_ids",
    { user_uuid: user.id }
  );

  if (rpcError) {
    console.error("[Projects Client Service] RPC Error:", rpcError);
    throw new Error(`Failed to get accessible projects: ${rpcError.message}`);
  }

  // Если нет доступных проектов, возвращаем пустой список
  if (!accessibleProjectIds || accessibleProjectIds.length === 0) {
    return {
      data: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    };
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Начинаем запрос с фильтрацией по доступным проектам
  let query = supabase
    .from("projects")
    .select("*", { count: "exact" })
    .in("id", accessibleProjectIds);

  // Поиск по имени (если указан)
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Применяем фильтры
  if (params.filters) {
    Object.entries(params.filters).forEach(([fieldName, values]) => {
      if (values && values.length > 0) {
        query = query.in(fieldName, values);
      }
    });
  }

  // Сортировка по дате создания (новые первыми)
  query = query.order("created_at", { ascending: false });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Projects Client Service] Error:", error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

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
 * Получение проекта по ID
 */
export async function getProjectByIdFromClient(id: string): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[Projects Client Service] Get by ID error:", error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return transformProject(data);
}

/**
 * Удаление project
 * Используется в Client Components для мутаций
 */
export async function deleteProjectFromClient(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("[Projects Client Service] Delete error:", error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

/**
 * Создание нового project
 * Используется в Client Components для мутаций
 * Только superAdmin может создавать проекты
 */
export async function createProjectFromClient(
  data: CreateProjectData
): Promise<Project> {
  const supabase = createClient();

  // Получаем текущего пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Проверяем, является ли пользователь superAdmin
  const { data: isSuperAdmin, error: checkError } = await supabase.rpc(
    "is_super_admin",
    { user_uuid: user.id }
  );

  if (checkError) {
    console.error("[Projects Client Service] Check superAdmin error:", checkError);
    throw new Error(`Failed to check permissions: ${checkError.message}`);
  }

  if (!isSuperAdmin) {
    throw new Error("Only superAdmin can create projects");
  }

  const insertData = {
    name: data.name,
    description: data.description || null,
    status: "active",
    created_by: user.id,
    enable_sign_in: data.enableSignIn ?? true,
    enable_sign_up: data.enableSignUp ?? true,
  };

  const { data: created, error } = await supabase
    .from("projects")
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    console.error("[Projects Client Service] Create error:", error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return transformProject(created);
}

/**
 * Обновление project
 * Используется в Client Components для мутаций
 */
export async function updateProjectFromClient(
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.enableSignIn !== undefined)
    updateData.enable_sign_in = data.enableSignIn;
  if (data.enableSignUp !== undefined)
    updateData.enable_sign_up = data.enableSignUp;

  const { data: updated, error } = await supabase
    .from("projects")
    .update(updateData as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Projects Client Service] Update error:", error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return transformProject(updated);
}
