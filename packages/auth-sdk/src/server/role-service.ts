/**
 * Сервис для работы с ролями пользователей
 * Получает роли из таблицы project_admins в Supabase через RPC функцию
 * Все админы хранятся в project_admins:
 * - superAdmin имеет project_id = NULL (глобальный доступ)
 * - projectSuperAdmin и projectAdmin имеют project_id = конкретный проект
 *
 * УПРОЩЕННАЯ АРХИТЕКТУРА:
 * - Используем только 3 функции: is_super_admin(), is_any_admin(), get_user_project_role()
 * - Убрали промежуточный 'admin' из UserRole
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "../types";
import { getCachedAccess, setCachedAccess } from "../utils/role-cache";
import type { CookieHandler } from "../types";

/**
 * Проверка, является ли пользователь суперадмином
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя из auth.users
 * @returns true если пользователь является superAdmin
 */
export async function isSuperAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_super_admin", {
      user_uuid: userId,
    } as unknown as undefined);

    if (error) {
      console.error("[Roles] Error checking super admin:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("[Roles] Error checking super admin:", error);
    return false;
  }
}

/**
 * Проверка, является ли пользователь любым админом (для middleware)
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя из auth.users
 * @returns true если пользователь имеет любую роль админа
 */
export async function isAnyAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_any_admin", {
      user_uuid: userId,
    } as unknown as undefined);

    if (error) {
      console.error("[Roles] Error checking admin access:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("[Roles] Error checking admin access:", error);
    return false;
  }
}

/**
 * Проверка доступа к дашборду с кэшированием (для middleware)
 *
 * ОПТИМИЗАЦИЯ:
 * - Сначала проверяет кэш в cookie
 * - Если кэш валиден - возвращает результат из кэша (без RPC-запроса)
 * - Если кэш отсутствует/истек - делает RPC-запрос и сохраняет в кэш
 *
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя из auth.users
 * @param cookies - CookieHandler для работы с cookies
 * @param cacheTtl - TTL для кэша в секундах (по умолчанию 5 минут)
 * @returns true если пользователь имеет доступ к дашборду (любая роль админа)
 */
export async function hasAdminAccessWithCache(
  supabase: SupabaseClient,
  userId: string,
  cookies: CookieHandler,
  cacheTtl?: number
): Promise<boolean> {
  // ШАГ 1: Проверяем кэш
  const cachedAccess = getCachedAccess(cookies, userId);

  if (cachedAccess !== null) {
    // Кэш валиден - возвращаем результат из кэша (без RPC-запроса)
    return cachedAccess;
  }

  // ШАГ 2: Кэш отсутствует/истек - делаем RPC-запрос
  const hasAccess = await isAnyAdmin(supabase, userId);

  // ШАГ 3: Сохраняем результат в кэш для следующих запросов
  setCachedAccess(cookies, userId, hasAccess, cacheTtl);

  return hasAccess;
}

/**
 * Получение глобальной роли пользователя (для обратной совместимости)
 * @param supabase - Supabase клиент
 * @param userId - ID пользователя из auth.users
 * @returns Роль пользователя: 'superAdmin' или 'user'
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  const isSuper = await isSuperAdmin(supabase, userId);
  return isSuper ? "superAdmin" : "user";
}

/**
 * Получение роли пользователя с кэшированием (для обратной совместимости)
 * @deprecated Используйте hasAdminAccessWithCache() для middleware
 */
export async function getUserRoleWithCache(
  supabase: SupabaseClient,
  userId: string,
  cookies: CookieHandler,
  cacheTtl?: number
): Promise<UserRole> {
  const isSuper = await isSuperAdmin(supabase, userId);
  return isSuper ? "superAdmin" : "user";
}

/**
 * Проверка, является ли пользователь админом (любого типа)
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  return await isAnyAdmin(supabase, userId);
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
