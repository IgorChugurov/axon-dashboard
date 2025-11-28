/**
 * Публичный API SDK
 *
 * Использование:
 *
 * // Server Component
 * import { ServerPublicAPIClient } from '@/lib/sdk/public-api/server';
 * const sdk = await ServerPublicAPIClient.create(projectId);
 *
 * // Client Component
 * import { ClientPublicAPIClient } from '@/lib/sdk/public-api/client';
 * const sdk = ClientPublicAPIClient.create(projectId);
 */

export * from "./types";
export * from "./errors";
export * from "./utils";
export { ServerPublicAPIClient } from "./server";
export { ClientPublicAPIClient } from "./client";
