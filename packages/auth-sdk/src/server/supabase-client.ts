/**
 * Создание Supabase клиента для сервера
 * Поддерживает разные фреймворки через CookieHandler
 */

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieHandler } from "../types";

/**
 * Создание Supabase клиента для сервера
 * @param supabaseUrl - URL Supabase проекта
 * @param supabaseAnonKey - Anon ключ Supabase
 * @param cookies - Обработчик cookies (опционально)
 * @returns Supabase клиент
 */
export function createServerSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  cookies?: CookieHandler
): SupabaseClient {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookies
      ? {
          getAll: () => cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookies.setAll(
              cookiesToSet.map(({ name, value, options }) => {
                // Преобразуем опции, фильтруя несовместимые типы
                const cookieOptions:
                  | import("../types").CookieOptions
                  | undefined = options
                  ? {
                      httpOnly: options.httpOnly,
                      secure: options.secure,
                      sameSite:
                        typeof options.sameSite === "string"
                          ? options.sameSite
                          : undefined,
                      maxAge: options.maxAge,
                      path: options.path,
                      domain: options.domain,
                    }
                  : undefined;
                return {
                  name,
                  value,
                  options: cookieOptions,
                };
              })
            );
          },
        }
      : {
          getAll: () => [],
          setAll: () => {
            // No-op when cookies handler is not provided
          },
        },
    global: {
      fetch: (url: URL | RequestInfo, options?: RequestInit) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
