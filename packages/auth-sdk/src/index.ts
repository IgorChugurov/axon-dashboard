/**
 * Auth SDK - Главный экспорт
 * 
 * @example
 * // Серверный модуль
 * import { createServerAuthClient, createAuthMiddleware } from '@axon-dashboard/auth-sdk/server';
 * 
 * // Клиентский модуль
 * import { createClientAuthClient, AuthProvider, useAuth } from '@axon-dashboard/auth-sdk/client';
 * 
 * // UI компоненты
 * import { LoginForm, SignUpForm } from '@axon-dashboard/auth-sdk/components';
 */

// Типы
export * from "./types";
export * from "./errors";

// Серверный модуль (экспортируется через server/index.ts)
// Клиентский модуль (экспортируется через client/index.ts)
// UI компоненты (экспортируются через components/index.tsx)

