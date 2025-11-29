/**
 * Фабрика для создания SDK клиента в Server Components (SSR)
 * Автономная версия - принимает ключи Supabase как параметры
 * Поддерживает опциональный cookie handler для SSR
 */

import {
  createServerClient,
  type CookieHandler,
} from "./supabase/server-client";
import { PublicAPIClient } from "./client";
import type { SDKOptions } from "./types";

/**
 * Создать SDK клиент для Server Components
 * @param projectId - ID проекта
 * @param config - Конфигурация Supabase
 * @param config.supabaseUrl - URL Supabase проекта
 * @param config.supabaseAnonKey - Anon ключ Supabase
 * @param config.cookies - Обработчик cookies для SSR (опционально, для Next.js и других фреймворков)
 * @param options - Опции SDK (кэширование и т.д.)
 */
export async function createServerSDK(
  projectId: string,
  config: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    cookies?: CookieHandler;
  },
  options?: SDKOptions
): Promise<PublicAPIClient> {
  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    config.cookies ? { cookies: config.cookies } : undefined
  );
  return PublicAPIClient.create(supabase, projectId, "server", options);
}
