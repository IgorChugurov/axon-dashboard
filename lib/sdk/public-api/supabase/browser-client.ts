/**
 * Фабрика для создания Supabase клиента в браузере
 * Автономная версия - не зависит от внешних модулей проекта
 */

import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Создать Supabase клиент для браузера
 * @param supabaseUrl - URL Supabase проекта
 * @param supabaseAnonKey - Anon ключ Supabase
 * @returns Supabase клиент
 */
export function createBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> {
  return createSSRBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
