/**
 * Работа с проектами через Supabase
 * Заменяет старый backend API
 */

import { createClient } from "@/lib/supabase/server";
import { ServerDataParams } from "@/lib/server-data/types";
import type { Project, CreateProjectData, ProjectRole } from "./types";
import { transformProject } from "./transformers";

/**
 * Получение всех ролей пользователя в проектах одним запросом
 * Оптимизация: вместо N+1 запросов делаем один запрос к project_admins
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя
 * @returns Map с ролями: projectId -> role
 */
async function getAllUserProjectRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Map<string, ProjectRole>> {
  try {
    // Проверяем, является ли пользователь superAdmin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
      user_uuid: userId,
    } as unknown as undefined);

    const rolesMap = new Map<string, ProjectRole>();

    // Если superAdmin - для всех проектов роль будет 'superAdmin'
    if (isSuperAdmin === true) {
      // Получаем все проекты для superAdmin
      const { data: allProjects } = await supabase
        .from("projects")
        .select("id");

      if (allProjects) {
        allProjects.forEach((project: { id: string }) => {
          rolesMap.set(project.id, "superAdmin");
        });
      }
    } else {
      // Для остальных админов получаем роли из project_admins
      const { data: projectAdmins, error } = await supabase
        .from("project_admins")
        .select("project_id, admin_roles(name)")
        .eq("user_id", userId)
        .not("project_id", "is", null);

      if (error) {
        console.error(
          "[getAllUserProjectRoles] Error fetching project roles:",
          error
        );
        return rolesMap;
      }

      if (projectAdmins) {
        projectAdmins.forEach((pa: any) => {
          const projectId = pa.project_id;
          const roleName = pa.admin_roles?.name;
          if (projectId && roleName) {
            rolesMap.set(
              projectId,
              roleName as "projectSuperAdmin" | "projectAdmin"
            );
          }
        });
      }
    }

    return rolesMap;
  } catch (error) {
    console.error("[getAllUserProjectRoles] Error:", error);
    return new Map();
  }
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
 * RLS политика автоматически фильтрует только доступные проекты
 */
export async function getProjectsFromSupabase(
  params: ServerDataParams = {}
): Promise<SupabaseProjectsResponse> {
  const supabase = await createClient();

  // Настройки пагинации
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  // RLS политика автоматически отфильтрует только доступные проекты
  // superAdmin видит все, остальные админы - только свои проекты
  let query = supabase.from("projects").select("*", { count: "exact" });

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
    data: (data || []).map((row: any) => transformProject(row)),
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
 * Только superAdmin может создавать проекты
 */
export async function createProjectInSupabase(
  projectData: CreateProjectData & { status?: string }
): Promise<Project> {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    throw new Error("Unauthorized");
  }

  // Проверяем, является ли пользователь superAdmin
  const { data: isSuperAdmin, error: checkError } = await supabase.rpc(
    "is_super_admin",
    { user_uuid: user.data.user.id } as unknown as undefined
  );

  if (checkError) {
    console.error("[Supabase Projects] Check superAdmin error:", checkError);
    throw new Error(`Failed to check permissions: ${checkError.message}`);
  }

  if (!isSuperAdmin) {
    throw new Error("Only superAdmin can create projects");
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
 * Получение всех доступных проектов без пагинации (для сайдбара)
 * RLS политика автоматически фильтрует только доступные проекты
 * Оптимизация: получает роли одним запросом и кэширует их
 */
export async function getAllProjectsFromSupabase(): Promise<Project[]> {
  const supabaseClient = await createClient();
  const supabase = supabaseClient;

  // Получаем текущего пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[Supabase Projects] No user found");
    return [];
  }

  // Получаем роли из БД напрямую
  // ВАЖНО: Не используем кэш кук здесь, так как Server Components не могут устанавливать куки
  // Кэширование ролей проектов происходит через React Query на клиенте
  // или в middleware (если нужно)
  console.log("[Supabase Projects] Fetching roles from DB");
  const rolesMap = await getAllUserProjectRoles(supabase, user.id);
  console.log("[Supabase Projects] Roles fetched from DB", {
    projectCount: rolesMap.size,
  });

  // RLS политика автоматически отфильтрует только доступные проекты
  // superAdmin видит все, остальные админы - только свои проекты
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[Supabase Projects] Error loading all projects:", error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  console.log("[Supabase Projects] Loaded projects:", {
    count: data?.length || 0,
    projectIds: (data as any[])?.map((p: any) => p.id),
  });

  // Добавляем роли к проектам
  return (data || []).map((row: any): Project => {
    const projectId = row.id;
    const role = rolesMap.get(projectId) || null;
    return transformProject(row, role);
  });
}
