/**
 * Трансформеры для преобразования данных из БД в типы TypeScript
 * Используется в client-service и supabase для устранения дублирования
 */

import type { Project, ProjectRole } from "./types";

/**
 * Преобразование данных из БД в типы TypeScript
 * Конвертирует snake_case из БД в camelCase для TypeScript
 * @param row - Строка из БД
 * @param role - Опциональная роль пользователя в проекте
 */
export function transformProject(row: any, role?: ProjectRole): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    enableSignIn: row.enable_sign_in ?? true,
    enableSignUp: row.enable_sign_up ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role,
  };
}

