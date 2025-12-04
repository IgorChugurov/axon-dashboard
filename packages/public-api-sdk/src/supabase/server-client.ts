/**
 * Фабрика для создания Supabase клиента на сервере
 * Автономная версия - не зависит от Next.js или других фреймворков
 * Поддерживает опциональный cookie handler для SSR
 */

import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Интерфейс для обработки cookies (универсальный для любых фреймворков)
 */
export interface CookieHandler {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (
    cookies: Array<{ name: string; value: string; options?: any }>
  ) => void;
}

/**
 * Создать Supabase клиент для сервера
 * @param supabaseUrl - URL Supabase проекта
 * @param supabaseAnonKey - Anon ключ Supabase
 * @param options - Опции для SSR (опционально)
 * @param options.cookies - Обработчик cookies для SSR (опционально)
 * @returns Supabase клиент
 */
export function createServerClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: {
    cookies?: CookieHandler;
  }
): SupabaseClient<Database> {
  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: options?.cookies || {
      getAll: () => [],
      setAll: () => {
        // No-op when cookies handler is not provided
      },
    },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
