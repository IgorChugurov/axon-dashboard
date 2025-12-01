/**
 * Типы для публичного API SDK
 */

import type {
  FieldValue,
  FieldType,
  DbType,
  FieldOption,
} from "./types/entity-types";
import type { PartialUIConfig } from "./types/ui-config-types";

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
 * Расширенная версия со всеми полями для админки и публичного API
 */
export interface EntityDefinitionConfig {
  id: string;
  name: string;
  description?: string | null;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;
  readPermission: string;
  createPermission: string;
  updatePermission: string;
  deletePermission: string;
  // Section titles for form organization
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;
  // UI Configuration
  uiConfig?: PartialUIConfig | null;
  // Pagination settings
  enablePagination?: boolean | null;
  pageSize?: number | null;
  // Filter settings
  enableFilters?: boolean | null;
  // File upload limits
  maxFileSizeMb?: number | null;
  maxFilesCount?: number | null;
  createdAt: string;
  updatedAt: string;
  fields: FieldConfig[];
}

/**
 * Конфигурация поля
 * Расширенная версия со всеми полями для админки и публичного API
 */
export interface FieldConfig {
  id: string;
  entityDefinitionId: string;
  name: string;
  dbType: DbType;
  type: FieldType;
  // UI конфигурация
  label: string;
  placeholder?: string | null;
  description?: string | null;
  forEditPage: boolean;
  forCreatePage: boolean;
  required: boolean;
  requiredText?: string | null;
  forEditPageDisabled: boolean;
  displayIndex: number;
  displayInTable: boolean;
  sectionIndex: number;
  isOptionTitleField: boolean;
  searchable: boolean;
  filterableInList?: boolean;
  options?: FieldOption[];
  // Связи
  relatedEntityDefinitionId?: string | null;
  relationFieldId?: string | null;
  isRelationSource: boolean;
  selectorRelationId?: string | null;
  relationFieldName?: string | null;
  relationFieldLabel?: string | null;
  // Значения по умолчанию
  defaultStringValue?: string | null;
  defaultNumberValue?: number | null;
  defaultBooleanValue?: boolean | null;
  defaultDateValue?: string | null;
  // API конфигурация
  autoPopulate: boolean;
  includeInSinglePma: boolean;
  includeInListPma: boolean;
  includeInSingleSa: boolean;
  includeInListSa: boolean;
  // Conditional field visibility
  foreignKey?: string | null;
  foreignKeyValue?: string | null;
  // Dynamic value field configuration
  typeFieldName?: string | null;
  optionsFieldName?: string | null;
  // File upload configuration
  acceptFileTypes?: string | null;
  maxFileSize?: number | null;
  maxFiles?: number | null;
  storageBucket?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Информация о фильтре для relation-поля
 */
export interface RelationFilterInfo {
  fieldName: string;
  fieldId: string; // ID поля в таблице field
}

/**
 * Режим фильтрации для relation полей
 * - 'any': хотя бы одно из выбранных значений (OR) - по умолчанию
 * - 'all': все выбранные значения (AND)
 */
export type RelationFilterMode = "any" | "all";

/**
 * Параметры запроса для получения списка экземпляров
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  // searchableFields удален - SDK сам определяет из fields с searchable: true
  filters?: Record<string, string[]>;
  // relationFilters удален - SDK сам определяет relation-поля из fields
  relationFilterModes?: Record<string, RelationFilterMode>; // режимы фильтрации для каждого поля: 'any' (по умолчанию) или 'all'
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  // includeRelations удален - SDK сам определяет из fields с displayInTable: true
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
