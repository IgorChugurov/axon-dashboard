/**
 * Публичный API SDK
 *
 * Использование:
 *
 * // Server Component (SSR)
 * import { createServerSDK } from '@axon-dashboard/public-api-sdk/server';
 * import { cookies } from 'next/headers';
 * const cookieStore = await cookies();
 * const sdk = await createServerSDK(projectId, {
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *   cookies: { getAll: () => cookieStore.getAll(), setAll: ... }
 * });
 *
 * // Client Component
 * import { createClientSDK } from '@axon-dashboard/public-api-sdk';
 * const sdk = createClientSDK(projectId, {
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 * });
 */

// SDK типы (API типы)
export * from "./types";

// Entity и UI типы (единый источник истины)
export * from "./types/entity-types";
export * from "./types/ui-config-types";

// Ошибки
export * from "./errors";

// Утилиты
export * from "./utils";
export * from "./utils/generateUIConfig";

// Фабричная функция для Client Components
// ВАЖНО: НЕ экспортируем createServerSDK здесь, чтобы избежать включения next/headers в client bundle
export { createClientSDK } from "./browser";

// Основной класс (можно использовать напрямую с Dependency Injection)
export { PublicAPIClient } from "./client";
