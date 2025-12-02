/**
 * Сервис для работы с ролями пользователей
 * Получает роли из таблицы admins в Supabase через RPC функцию
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "../types";
import { getCachedRole, setCachedRole } from "../utils/role-cache";
import type { CookieHandler } from "../types";

/**
 * Получение роли пользователя из базы данных
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя из auth.users
 * @returns Роль пользователя: 'user', 'admin' или 'superAdmin'
 *
 * ПРИМЕЧАНИЕ: Эта функция всегда делает RPC-запрос к БД.
 * Для middleware используйте getUserRoleWithCache() для оптимизации.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  try {
    // Используем функцию из БД для получения роли
    const { data, error } = await supabase.rpc("get_user_role", {
      user_uuid: userId,
    } as unknown as undefined);

    if (error) {
      console.error("[Roles] Error getting user role:", error);
      return "user"; // По умолчанию обычный пользователь
    }

    return (data as UserRole) || "user";
  } catch (error) {
    console.error("[Roles] Error getting user role:", error);
    return "user";
  }
}

/**
 * Получение роли пользователя с кэшированием (для middleware)
 *
 * ОПТИМИЗАЦИЯ:
 * - Сначала проверяет кэш в cookie
 * - Если кэш валиден - возвращает роль из кэша (без RPC-запроса)
 * - Если кэш отсутствует/истек - делает RPC-запрос и сохраняет в кэш
 *
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя из auth.users
 * @param cookies - CookieHandler для работы с cookies
 * @param cacheTtl - TTL для кэша в секундах (по умолчанию 5 минут)
 * @returns Роль пользователя: 'user', 'admin' или 'superAdmin'
 */
export async function getUserRoleWithCache(
  supabase: SupabaseClient,
  userId: string,
  cookies: CookieHandler,
  cacheTtl?: number
): Promise<UserRole> {
  // ШАГ 1: Проверяем кэш
  const cachedRole = getCachedRole(cookies, userId);

  if (cachedRole) {
    // Кэш валиден - возвращаем роль из кэша (без RPC-запроса)
    //console.log("[Roles] Using cached role", { userId, role: cachedRole });
    return cachedRole;
  }

  // ШАГ 2: Кэш отсутствует/истек - делаем RPC-запрос
  //console.log("[Roles] Cache MISS - fetching from DB", { userId });
  const role = await getUserRole(supabase, userId);

  // ШАГ 3: Сохраняем роль в кэш для следующих запросов
  setCachedRole(cookies, userId, role, cacheTtl);

  return role;
}

/**
 * Проверка, является ли пользователь админом (любого типа)
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId);
  return role === "admin" || role === "superAdmin";
}

/**
 * Проверка, является ли пользователь суперадмином
 */
export async function isSuperAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId);
  return role === "superAdmin";
}

/**
 * Проверка, может ли пользователь управлять админами
 * Только superAdmin может управлять админами
 */
export async function canManageAdmins(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  return await isSuperAdmin(supabase, userId);
}
