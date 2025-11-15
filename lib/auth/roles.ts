/**
 * Утилиты для работы с ролями пользователей
 * Получает роли из таблицы admins в Supabase
 */

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "./types";

/**
 * Получение роли пользователя из базы данных
 * @param userId - ID пользователя из auth.users
 * @returns Роль пользователя: 'user', 'admin' или 'superAdmin'
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const supabase = await createClient();

    // Используем функцию из БД для получения роли
    const { data, error } = await supabase.rpc(
      "get_user_role",
      {
        user_uuid: userId,
      } as unknown as undefined
    );

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

/**
 * Получение роли пользователя с кешированием (опционально)
 * Можно использовать для оптимизации, если роль редко меняется
 */
const roleCache = new Map<string, { role: UserRole; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export async function getUserRoleCached(
  userId: string
): Promise<UserRole> {
  const cached = roleCache.get(userId);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.role;
  }

  const role = await getUserRole(userId);
  roleCache.set(userId, { role, timestamp: Date.now() });

  return role;
}

/**
 * Инвалидация кеша роли пользователя
 * Вызывать при изменении роли пользователя
 */
export function invalidateRoleCache(userId: string): void {
  roleCache.delete(userId);
}

