/**
 * Утилиты для работы с ролями пользователей
 * Получает роли из таблицы admins в Supabase
 */

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "./types";
import type { NextRequest, NextResponse } from "next/server";
import { getCachedRole, setCachedRole } from "./role-cache";

/**
 * Получение роли пользователя из базы данных
 * @param userId - ID пользователя из auth.users
 * @returns Роль пользователя: 'user', 'admin' или 'superAdmin'
 *
 * ПРИМЕЧАНИЕ: Эта функция всегда делает RPC-запрос к БД.
 * Для middleware используйте getUserRoleWithCache() для оптимизации.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const supabase = await createClient();

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
 * @param userId - ID пользователя из auth.users
 * @param request - NextRequest объект для чтения cookies
 * @param response - NextResponse объект для записи cookies
 * @returns Роль пользователя: 'user', 'admin' или 'superAdmin'
 */
export async function getUserRoleWithCache(
  userId: string,
  request: NextRequest,
  response: NextResponse
): Promise<UserRole> {
  // ШАГ 1: Проверяем кэш
  const cachedRole = getCachedRole(request, userId);

  if (cachedRole) {
    // Кэш валиден - возвращаем роль из кэша (без RPC-запроса)
    console.log("[Roles] Using cached role", { userId, role: cachedRole });
    return cachedRole;
  }

  // ШАГ 2: Кэш отсутствует/истек - делаем RPC-запрос
  console.log("[Roles] Cache MISS - fetching from DB", { userId });
  const role = await getUserRole(userId);

  // ШАГ 3: Сохраняем роль в кэш для следующих запросов
  setCachedRole(response, userId, role);

  return role;
}

/**
 * Проверка, является ли пользователь админом (любого типа)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin" || role === "superAdmin";
}

/**
 * Проверка, является ли пользователь суперадмином
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "superAdmin";
}

/**
 * Проверка, может ли пользователь управлять админами
 * Только superAdmin может управлять админами
 */
export async function canManageAdmins(userId: string): Promise<boolean> {
  return await isSuperAdmin(userId);
}
