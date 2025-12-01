/**
 * Утилиты для работы с авторизацией Supabase на сервере
 */

import { createClient } from "./server";
import { User } from "@/lib/auth/types";
import { getUserRole } from "@/lib/auth/roles";
import { transformSupabaseUser } from "./transform";

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
