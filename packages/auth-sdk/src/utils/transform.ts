/**
 * Утилиты для преобразования типов Supabase
 *
 * Этот файл НЕ содержит Server-only зависимостей и может быть
 * импортирован как в Server Components, так и в Client Components
 */

import type { User } from "../types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Преобразование Supabase User в наш User тип
 * Вынесено в отдельный файл для использования в Client Components
 */
export function transformSupabaseUser(
  supabaseUser: SupabaseUser | null
): User | null {
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

