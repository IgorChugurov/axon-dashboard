/**
 * Клиентский сервис для работы с project_admins через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 *
 * Все админы хранятся в project_admins:
 * - superAdmin имеет project_id = NULL (глобальный доступ)
 * - projectSuperAdmin и projectAdmin имеют project_id = конкретный проект
 */

import { createClient } from "@/lib/supabase/client";
import type { Admin, AdminsResponse, AdminRoleName } from "./types";

/**
 * Получение списка администраторов с пагинацией и поиском
 *
 * Делает два запроса:
 * 1. Загружает project_admins с admin_roles
 * 2. Загружает profiles для полученных user_id
 *
 * Это необходимо потому что нет прямого FK между project_admins и profiles
 * (project_admins.user_id → auth.users.id, а profiles.id = auth.users.id)
 */
export async function getAdminsFromClient(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string[]>;
    projectId?: string | null; // Если null - только superAdmin, если UUID - админы проекта, если не указан - все
  } = {}
): Promise<AdminsResponse> {
  const supabase = createClient();

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Шаг 1: Загружаем project_admins
  // Сначала загружаем только project_admins, чтобы избежать проблем с RLS на admin_roles
  let query = supabase.from("project_admins").select(
    `
      id,
      project_id,
      user_id,
      role_id,
      created_at,
      updated_at,
      created_by
    `,
    { count: "exact" }
  );

  // Фильтр по project_id
  if (params.projectId !== undefined) {
    if (params.projectId === null) {
      // Только superAdmin (project_id IS NULL)
      query = query.is("project_id", null);
    } else {
      // Админы конкретного проекта
      query = query.eq("project_id", params.projectId);
    }
  }

  // Фильтр по роли (если указан)
  if (params.filters?.roleName && params.filters.roleName.length > 0) {
    // Получаем role_ids для указанных имен ролей
    type RoleRow = { id: string };
    const { data: roles } = await supabase
      .from("admin_roles")
      .select("id")
      .in("name", params.filters.roleName);

    if (roles && roles.length > 0) {
      const typedRoles = roles as RoleRow[];
      const roleIds = typedRoles.map((r) => r.id);
      query = query.in("role_id", roleIds);
    }
  }

  // Сортировка по дате создания (новые первые)
  query = query.order("created_at", { ascending: false });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  type AdminRow = {
    id: string;
    project_id: string | null;
    user_id: string;
    role_id: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
  };
  const { data: adminsData, error: adminsError, count } = await query;

  if (adminsError) {
    console.error("[Admins Client Service] Error loading admins:", {
      error: adminsError,
      message: adminsError.message,
      details: adminsError.details,
      hint: adminsError.hint,
      code: adminsError.code,
      projectId: params.projectId,
    });
    throw new Error(
      `Failed to fetch admins: ${adminsError.message || "Unknown error"}`
    );
  }

  if (!adminsData || adminsData.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasPreviousPage: page > 1,
        hasNextPage: false,
      },
    };
  }

  const typedAdminsData = adminsData as AdminRow[];

  // Шаг 2: Загружаем admin_roles для полученных role_id
  const roleIds = [...new Set(typedAdminsData.map((admin) => admin.role_id))];
  type RoleRow = {
    id: string;
    name: string;
    description: string | null;
  };
  const { data: rolesData, error: rolesError } = await supabase
    .from("admin_roles")
    .select("id, name, description")
    .in("id", roleIds);

  if (rolesError) {
    console.error("[Admins Client Service] Error loading roles:", rolesError);
    // Продолжаем без ролей, покажем то что есть
  }

  // Создаем map ролей по id для быстрого доступа
  const rolesMap = new Map<
    string,
    { name: string; description: string | null }
  >();
  if (rolesData) {
    const typedRolesData = rolesData as RoleRow[];
    typedRolesData.forEach((role) => {
      rolesMap.set(role.id, {
        name: role.name,
        description: role.description,
      });
    });
  }

  // Шаг 3: Загружаем profiles для полученных user_id
  const userIds = typedAdminsData.map((admin) => admin.user_id);

  type ProfileRow = {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error(
      "[Admins Client Service] Error loading profiles:",
      profilesError
    );
    // Продолжаем без profiles, покажем то что есть
  }

  // Создаем map profiles по id для быстрого доступа
  const profilesMap = new Map<
    string,
    {
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    }
  >();

  if (profilesData) {
    const typedProfilesData = profilesData as ProfileRow[];
    typedProfilesData.forEach((profile) => {
      profilesMap.set(profile.id, {
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
      });
    });
  }

  // Шаг 4: Объединяем данные
  let admins: Admin[] = typedAdminsData.map((row) => {
    const profile = profilesMap.get(row.user_id);
    const adminRole = rolesMap.get(row.role_id);

    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      projectId: row.project_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      // Данные из profiles
      email: profile?.email || null,
      firstName: profile?.first_name || null,
      lastName: profile?.last_name || null,
      avatarUrl: profile?.avatar_url || null,
      // Данные из admin_roles
      roleName: (adminRole?.name as Admin["roleName"]) || "projectAdmin",
      roleDescription: adminRole?.description || null,
    };
  });

  // Шаг 4: Фильтрация по поиску (email, имя) - делаем на клиенте
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    admins = admins.filter((admin) => {
      const email = admin.email?.toLowerCase() || "";
      const firstName = admin.firstName?.toLowerCase() || "";
      const lastName = admin.lastName?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        email.includes(searchLower) ||
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        fullName.includes(searchLower)
      );
    });
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return {
    data: admins,
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
 * Удаление администратора
 * Примечание: RLS политики разрешают только superAdmin и projectSuperAdmin удалять админов
 * и запрещают удаление себя
 */
export async function deleteAdminFromClient(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("project_admins").delete().eq("id", id);

  if (error) {
    console.error("[Admins Client Service] Delete error:", error);
    throw new Error(`Failed to delete admin: ${error.message}`);
  }
}

/**
 * Получение списка всех ролей (для фильтрации и выпадающих списков)
 */
export async function getAdminRolesFromClient(): Promise<
  Array<{ id: string; name: string; description: string | null }>
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("admin_roles")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    console.error("[Admins Client Service] Get roles error:", error);
    throw new Error(`Failed to fetch admin roles: ${error.message}`);
  }

  return data || [];
}

/**
 * Поиск пользователя по email в таблице profiles
 * Возвращает профиль пользователя если найден, null если не найден
 */
export async function findUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
} | null> {
  const supabase = createClient();

  type ProfileRow = {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error("[Admins Client Service] Find user error:", error);
    throw new Error(`Failed to find user: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const typedData = data as ProfileRow;
  return {
    id: typedData.id,
    email: typedData.email || email,
    firstName: typedData.first_name,
    lastName: typedData.last_name,
  };
}

/**
 * Проверка, является ли пользователь уже администратором в проекте
 * Проверяет наличие любой роли в project_admins для указанного проекта
 * @param userId - ID пользователя
 * @param projectId - ID проекта (опционально, если не указан - проверяет глобально)
 */
export async function isUserAlreadyAdmin(
  userId: string,
  projectId?: string | null
): Promise<boolean> {
  const supabase = createClient();

  let query = supabase
    .from("project_admins")
    .select("id")
    .eq("user_id", userId);

  if (projectId !== undefined) {
    if (projectId === null) {
      // Проверяем superAdmin (project_id IS NULL)
      query = query.is("project_id", null);
    } else {
      // Проверяем админа конкретного проекта
      query = query.eq("project_id", projectId);
    }
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error("[Admins Client Service] Check admin error:", error);
    throw new Error(`Failed to check admin status: ${error.message}`);
  }

  return data !== null;
}

/**
 * Создание администратора
 *
 * @param userId - ID пользователя из profiles/auth.users
 * @param roleName - Имя роли ('superAdmin', 'projectSuperAdmin' или 'projectAdmin')
 * @param projectId - ID проекта (null для superAdmin, UUID для проектных ролей)
 * @param createdBy - ID пользователя, создающего админа (опционально)
 * @returns Созданный админ
 */
export async function createAdminFromClient(
  userId: string,
  roleName: "superAdmin" | "projectSuperAdmin" | "projectAdmin",
  projectId: string | null = null,
  createdBy?: string
): Promise<Admin> {
  const supabase = createClient();

  // Валидация: superAdmin должен иметь project_id = NULL
  if (roleName === "superAdmin" && projectId !== null) {
    throw new Error("superAdmin must have project_id = NULL");
  }

  // Валидация: проектные роли должны иметь project_id
  if (roleName !== "superAdmin" && projectId === null) {
    throw new Error(`${roleName} must have project_id (cannot be NULL)`);
  }

  // Шаг 1: Получаем role_id по имени роли
  type RoleRow = { id: string };
  const { data: roleIdData, error: roleError } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleIdData) {
    console.error("[Admins Client Service] Get role error:", roleError);
    throw new Error(
      `Failed to find role '${roleName}': ${
        roleError?.message || "Role not found"
      }`
    );
  }

  const typedRoleData = roleIdData as RoleRow;

  // Шаг 2: Создаем запись в project_admins
  type AdminRow = {
    id: string;
    project_id: string | null;
    user_id: string;
    role_id: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
  };
  const { data: adminData, error: adminError } = await supabase
    .from("project_admins")
    .insert({
      user_id: userId,
      role_id: typedRoleData.id,
      project_id: projectId,
      created_by: createdBy || null,
    } as any)
    .select(
      `
      id,
      project_id,
      user_id,
      role_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .single();

  if (adminError) {
    console.error("[Admins Client Service] Create admin error:", adminError);

    // Проверяем на дубликат
    if (adminError.code === "23505") {
      throw new Error("This user is already an administrator");
    }

    throw new Error(`Failed to create admin: ${adminError.message}`);
  }

  const typedAdminData = adminData as AdminRow;

  // Шаг 3: Загружаем profile для возврата полных данных
  type ProfileRow = {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  const { data: profileData } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, avatar_url")
    .eq("id", userId)
    .single();

  const typedProfileData = profileData as ProfileRow | null;

  // Шаг 4: Загружаем описание роли
  type RoleDescriptionRow = { description: string | null };
  const { data: roleDescriptionData } = await supabase
    .from("admin_roles")
    .select("description")
    .eq("id", typedRoleData.id)
    .single();

  const typedRoleDescription = roleDescriptionData as RoleDescriptionRow | null;

  return {
    id: typedAdminData.id,
    userId: typedAdminData.user_id,
    roleId: typedAdminData.role_id,
    projectId: typedAdminData.project_id,
    createdAt: typedAdminData.created_at,
    updatedAt: typedAdminData.updated_at,
    createdBy: typedAdminData.created_by,
    email: typedProfileData?.email || null,
    firstName: typedProfileData?.first_name || null,
    lastName: typedProfileData?.last_name || null,
    avatarUrl: typedProfileData?.avatar_url || null,
    roleName: roleName,
    roleDescription: typedRoleDescription?.description || null,
  };
}

/**
 * Получение администратора по ID
 * Загружает данные из project_admins с JOIN к profiles и admin_roles
 */
export async function getAdminByIdFromClient(
  id: string
): Promise<Admin | null> {
  const supabase = createClient();

  // Шаг 1: Загружаем project_admins
  type AdminRow = {
    id: string;
    project_id: string | null;
    user_id: string;
    role_id: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
  };
  const { data: adminData, error: adminError } = await supabase
    .from("project_admins")
    .select(
      `
      id,
      project_id,
      user_id,
      role_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("id", id)
    .single();

  if (adminError) {
    if (adminError.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("[Admins Client Service] Get admin by id error:", adminError);
    throw new Error(`Failed to fetch admin: ${adminError.message}`);
  }

  if (!adminData) {
    return null;
  }

  const typedAdminData = adminData as AdminRow;

  // Шаг 2: Загружаем admin_roles
  type RoleRow = {
    id: string;
    name: string;
    description: string | null;
  };
  const { data: roleData, error: roleError } = await supabase
    .from("admin_roles")
    .select("id, name, description")
    .eq("id", typedAdminData.role_id)
    .single();

  if (roleError) {
    console.error("[Admins Client Service] Get role error:", roleError);
    // Продолжаем без роли
  }

  // Шаг 3: Загружаем profile
  type ProfileRow = {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", typedAdminData.user_id)
    .single();

  if (profileError) {
    console.error("[Admins Client Service] Get profile error:", profileError);
    // Продолжаем без профиля
  }

  const typedRoleData = roleData as RoleRow | null;
  const typedProfileData = profileData as ProfileRow | null;

  return {
    id: typedAdminData.id,
    userId: typedAdminData.user_id,
    roleId: typedAdminData.role_id,
    projectId: typedAdminData.project_id,
    createdAt: typedAdminData.created_at,
    updatedAt: typedAdminData.updated_at,
    createdBy: typedAdminData.created_by,
    email: typedProfileData?.email || null,
    firstName: typedProfileData?.first_name || null,
    lastName: typedProfileData?.last_name || null,
    avatarUrl: typedProfileData?.avatar_url || null,
    roleName: (typedRoleData?.name as Admin["roleName"]) || "projectAdmin",
    roleDescription: typedRoleData?.description || null,
  };
}

/**
 * Обновление администратора
 * Обновляет только роль (role_id) в project_admins
 *
 * @param id - ID администратора в project_admins
 * @param roleName - Имя новой роли ('superAdmin', 'projectSuperAdmin' или 'projectAdmin')
 * @returns Обновленный админ
 */
export async function updateAdminFromClient(
  id: string,
  roleName: "superAdmin" | "projectSuperAdmin" | "projectAdmin"
): Promise<Admin> {
  const supabase = createClient();

  // Шаг 1: Получаем текущего админа для проверки project_id
  const currentAdmin = await getAdminByIdFromClient(id);
  if (!currentAdmin) {
    throw new Error("Admin not found");
  }

  // Валидация: superAdmin должен иметь project_id = NULL
  if (roleName === "superAdmin" && currentAdmin.projectId !== null) {
    throw new Error("superAdmin must have project_id = NULL");
  }

  // Валидация: проектные роли должны иметь project_id
  if (roleName !== "superAdmin" && currentAdmin.projectId === null) {
    throw new Error(`${roleName} must have project_id (cannot be NULL)`);
  }

  // Шаг 2: Получаем role_id по имени роли
  type RoleRow = { id: string };
  const { data: roleIdData, error: roleError } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleIdData) {
    console.error("[Admins Client Service] Get role error:", roleError);
    throw new Error(
      `Failed to find role '${roleName}': ${
        roleError?.message || "Role not found"
      }`
    );
  }

  const typedRoleData = roleIdData as RoleRow;

  // Шаг 3: Обновляем role_id в project_admins
  type AdminRow = {
    id: string;
    project_id: string | null;
    user_id: string;
    role_id: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
  };
  const updatePayload: { role_id: string } = { role_id: typedRoleData.id };
  const { data: updatedAdminData, error: updateError } = await supabase
    .from("project_admins")
    .update(updatePayload as never)
    .eq("id", id)
    .select(
      `
      id,
      project_id,
      user_id,
      role_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .single();

  if (updateError) {
    console.error("[Admins Client Service] Update admin error:", updateError);
    throw new Error(`Failed to update admin: ${updateError.message}`);
  }

  const typedUpdatedAdminData = updatedAdminData as AdminRow;

  // Шаг 4: Загружаем profile для возврата полных данных
  type ProfileRow = {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  const { data: profileData } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, avatar_url")
    .eq("id", typedUpdatedAdminData.user_id)
    .single();

  const typedProfileData = profileData as ProfileRow | null;

  // Шаг 5: Загружаем описание роли
  type RoleDescriptionRow = { description: string | null };
  const { data: roleDescriptionData } = await supabase
    .from("admin_roles")
    .select("description")
    .eq("id", typedRoleData.id)
    .single();

  const typedRoleDescription = roleDescriptionData as RoleDescriptionRow | null;

  return {
    id: typedUpdatedAdminData.id,
    userId: typedUpdatedAdminData.user_id,
    roleId: typedUpdatedAdminData.role_id,
    projectId: typedUpdatedAdminData.project_id,
    createdAt: typedUpdatedAdminData.created_at,
    updatedAt: typedUpdatedAdminData.updated_at,
    createdBy: typedUpdatedAdminData.created_by,
    email: typedProfileData?.email || null,
    firstName: typedProfileData?.first_name || null,
    lastName: typedProfileData?.last_name || null,
    avatarUrl: typedProfileData?.avatar_url || null,
    roleName: roleName,
    roleDescription: typedRoleDescription?.description || null,
  };
}
