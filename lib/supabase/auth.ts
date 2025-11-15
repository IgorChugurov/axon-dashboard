/**
 * Утилиты для работы с авторизацией Supabase на сервере
 */

import { createClient } from "./server";
import { User } from "@/lib/auth/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Преобразование Supabase User в наш User тип
 */
function transformSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    firstName:
      supabaseUser.user_metadata?.first_name ||
      supabaseUser.user_metadata?.full_name?.split(" ")[0],
    lastName:
      supabaseUser.user_metadata?.last_name ||
      supabaseUser.user_metadata?.full_name?.split(" ").slice(1).join(" "),
    avatar:
      supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture,
    role: supabaseUser.user_metadata?.role,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at,
  };
}

/**
 * Получение текущего пользователя на сервере
 * Включает роль пользователя из таблицы admins
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return null;
    }

    const user = transformSupabaseUser(supabaseUser);

    // Получаем роль из таблицы admins
    if (user) {
      const { getUserRole } = await import("@/lib/auth/roles");
      const role = await getUserRole(user.id!);
      user.role = role;
    }

    return user;
  } catch (error) {
    console.error("[Supabase Auth] Error getting user:", error);
    return null;
  }
}

/**
 * Получение access token для использования в API запросах
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      return null;
    }

    return session.access_token;
  } catch (error) {
    console.error("[Supabase Auth] Error getting access token:", error);
    return null;
  }
}

