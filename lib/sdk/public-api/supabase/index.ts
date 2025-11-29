/**
 * Экспорты для Supabase модулей SDK
 */

export type { Database, Json } from "./types";
export { createBrowserClient } from "./browser-client";
export { createServerClient, type CookieHandler } from "./server-client";
