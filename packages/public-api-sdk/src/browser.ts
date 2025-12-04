/**
 * Фабрика для создания SDK клиента в Client Components
 * Автономная версия - принимает ключи Supabase как параметры
 */

import { createBrowserClient } from "./supabase/browser-client";
import { PublicAPIClient } from "./client";
import type { SDKOptions } from "./types";

/**
 * Создать SDK клиент для Client Components
 * @param projectId - ID проекта
 * @param config - Конфигурация Supabase
 * @param config.supabaseUrl - URL Supabase проекта
 * @param config.supabaseAnonKey - Anon ключ Supabase
 * @param options - Опции SDK (кэширование и т.д.)
 */
export function createClientSDK(
  projectId: string,
  config: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  },
  options?: SDKOptions
): PublicAPIClient {
  const supabase = createBrowserClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
  return PublicAPIClient.create(supabase, projectId, "client", options);
}
