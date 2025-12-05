/**
 * Утилиты для работы с ролями пользователей
 * Получает роли из таблицы admins в Supabase
 *
 * ОБЕРТКА над SDK для удобства использования в Next.js
 * Внутри использует @igorchugurov/auth-sdk/server
 */

import { createClient } from "@/lib/supabase/server";
import {
  getUserRole as sdkGetUserRole,
  isAdmin as sdkIsAdmin,
  isSuperAdmin as sdkIsSuperAdmin,
  canManageAdmins as sdkCanManageAdmins,
} from "@igorchugurov/auth-sdk/server";
import type { UserRole } from "@igorchugurov/auth-sdk";

/**
 * Получение роли пользователя из базы данных
 * @param userId - ID пользователя из auth.users
 * @returns Роль пользователя: 'user', 'admin' или 'superAdmin'
 *
 * ПРИМЕЧАНИЕ: Эта функция всегда делает RPC-запрос к БД.
 * Для middleware используйте getUserRoleWithCache() из SDK напрямую.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();
  return sdkGetUserRole(supabase, userId);
}

/**
 * Проверка, является ли пользователь админом (любого типа)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  return sdkIsAdmin(supabase, userId);
}

/**
 * Проверка, является ли пользователь суперадмином
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  return sdkIsSuperAdmin(supabase, userId);
}

/**
 * Проверка, может ли пользователь управлять админами
 * Только superAdmin может управлять админами
 */
export async function canManageAdmins(userId: string): Promise<boolean> {
  const supabase = await createClient();
  return sdkCanManageAdmins(supabase, userId);
}
