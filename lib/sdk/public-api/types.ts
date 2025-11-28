/**
 * Типы для публичного API SDK
 */

import type { FieldValue } from "@/lib/universal-entity/types";

/**
 * Конфигурация проекта с entityDefinitions и fields
 */
export interface ProjectConfig {
  project: {
    id: string;
    name: string;
    enableSignIn: boolean;
    enableSignUp: boolean;
  };
  entityDefinitions: EntityDefinitionConfig[];
}

/**
 * Конфигурация entityDefinition с полями
 */
export interface EntityDefinitionConfig {
  id: string;
  name: string;
  tableName: string;
  readPermission: string;
  createPermission: string;
  updatePermission: string;
  deletePermission: string;
  fields: FieldConfig[];
}

/**
 * Конфигурация поля
 */
export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  dbType: string;
  required: boolean;
  relatedEntityDefinitionId?: string | null;
  relationFieldId?: string | null;
}

/**
 * Параметры запроса для получения списка экземпляров
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string[]>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeRelations?: string[];
  relationsAsIds?: boolean;
}

/**
 * Данные для создания экземпляра
 */
export interface CreateInstanceData {
  data: Record<string, unknown>;
  relations?: Record<string, string[]>;
}

/**
 * Данные для обновления экземпляра
 */
export interface UpdateInstanceData {
  data: Record<string, unknown>;
  relations?: Record<string, string[]>;
}

/**
 * Результат пагинации
 */
export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Результат авторизации
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

/**
 * Данные для регистрации
 */
export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Опции для создания SDK клиента
 */
export interface SDKOptions {
  enableCache?: boolean; // default: true
  cacheTTL?: number; // default: 5 минут
}
