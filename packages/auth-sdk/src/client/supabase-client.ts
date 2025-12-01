/**
 * Создание Supabase клиента для браузера
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Создание Supabase клиента для браузера
 * @param supabaseUrl - URL Supabase проекта
 * @param supabaseAnonKey - Anon ключ Supabase
 * @returns Supabase клиент
 */
export function createBrowserSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

