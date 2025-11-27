/**
 * Клиентский сервис для работы с admins через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 */

import { createClient } from "@/lib/supabase/client";
import type { Admin, AdminsResponse } from "./types";

/**
 * Получение списка администраторов с пагинацией и поиском
 * 
 * Делает два запроса:
 * 1. Загружает admins с admin_roles
 * 2. Загружает profiles для полученных user_id
 * 
 * Это необходимо потому что нет прямого FK между admins и profiles
 * (admins.user_id → auth.users.id, а profiles.id = auth.users.id)
 */
export async function getAdminsFromClient(params: {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string[]>;
} = {}): Promise<AdminsResponse> {
  const supabase = createClient();

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Шаг 1: Загружаем admins с admin_roles
  let query = supabase
    .from("admins")
    .select(
      `
      id,
      user_id,
      role_id,
      created_at,
      updated_at,
      admin_roles (
        name,
        description
      )
    `,
      { count: "exact" }
    );

  // Фильтр по роли (если указан)
  if (params.filters?.roleName && params.filters.roleName.length > 0) {
    // Получаем role_ids для указанных имен ролей
    const { data: roles } = await supabase
      .from("admin_roles")
      .select("id")
      .in("name", params.filters.roleName);

    if (roles && roles.length > 0) {
      const roleIds = roles.map((r) => r.id);
      query = query.in("role_id", roleIds);
    }
  }

  // Сортировка по дате создания (новые первые)
  query = query.order("created_at", { ascending: false });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data: adminsData, error: adminsError, count } = await query;

  if (adminsError) {
    console.error("[Admins Client Service] Error loading admins:", adminsError);
    throw new Error(`Failed to fetch admins: ${adminsError.message}`);
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

  // Шаг 2: Загружаем profiles для полученных user_id
  const userIds = adminsData.map((admin) => admin.user_id);
  
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("[Admins Client Service] Error loading profiles:", profilesError);
    // Продолжаем без profiles, покажем то что есть
  }

  // Создаем map profiles по id для быстрого доступа
  const profilesMap = new Map<string, {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  }>();

  if (profilesData) {
    profilesData.forEach((profile) => {
      profilesMap.set(profile.id, {
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
      });
    });
  }

  // Шаг 3: Объединяем данные
  let admins: Admin[] = adminsData.map((row) => {
    const profile = profilesMap.get(row.user_id);
    const adminRole = row.admin_roles as { name: string; description: string | null } | null;

    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Данные из profiles
      email: profile?.email || null,
      firstName: profile?.first_name || null,
      lastName: profile?.last_name || null,
      avatarUrl: profile?.avatar_url || null,
      // Данные из admin_roles
      roleName: (adminRole?.name as "admin" | "superAdmin") || "admin",
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
 * Примечание: RLS политики разрешают только superAdmin удалять админов
 * и запрещают удаление других superAdmin
 */
export async function deleteAdminFromClient(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("admins").delete().eq("id", id);

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
export async function findUserByEmail(
  email: string
): Promise<{ id: string; email: string; firstName: string | null; lastName: string | null } | null> {
  const supabase = createClient();

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

  return {
    id: data.id,
    email: data.email || email,
    firstName: data.first_name,
    lastName: data.last_name,
  };
}

/**
 * Проверка, является ли пользователь уже администратором
 */
export async function isUserAlreadyAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

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
 * @param roleName - Имя роли ('admin' или 'superAdmin')
 * @returns Созданный админ
 */
export async function createAdminFromClient(
  userId: string,
  roleName: "admin" | "superAdmin" = "admin"
): Promise<Admin> {
  const supabase = createClient();

  // Шаг 1: Получаем role_id по имени роли
  const { data: roleData, error: roleError } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleData) {
    console.error("[Admins Client Service] Get role error:", roleError);
    throw new Error(`Failed to find role '${roleName}': ${roleError?.message || "Role not found"}`);
  }

  // Шаг 2: Создаем запись в admins
  const { data: adminData, error: adminError } = await supabase
    .from("admins")
    .insert({
      user_id: userId,
      role_id: roleData.id,
    })
    .select(`
      id,
      user_id,
      role_id,
      created_at,
      updated_at
    `)
    .single();

  if (adminError) {
    console.error("[Admins Client Service] Create admin error:", adminError);
    
    // Проверяем на дубликат
    if (adminError.code === "23505") {
      throw new Error("This user is already an administrator");
    }
    
    throw new Error(`Failed to create admin: ${adminError.message}`);
  }

  // Шаг 3: Загружаем profile для возврата полных данных
  const { data: profileData } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, avatar_url")
    .eq("id", userId)
    .single();

  return {
    id: adminData.id,
    userId: adminData.user_id,
    roleId: adminData.role_id,
    createdAt: adminData.created_at,
    updatedAt: adminData.updated_at,
    email: profileData?.email || null,
    firstName: profileData?.first_name || null,
    lastName: profileData?.last_name || null,
    avatarUrl: profileData?.avatar_url || null,
    roleName: roleName,
    roleDescription: null,
  };
}
