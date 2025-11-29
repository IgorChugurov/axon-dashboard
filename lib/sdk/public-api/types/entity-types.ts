/**
 * Типы для универсальной системы сущностей
 * Единый источник истины для типов сущностей в SDK
 */

import type { PartialUIConfig } from "./ui-config-types";

// =====================================================
// Конфигурация сущностей
// =====================================================

export interface EntityDefinition {
  id: string;
  name: string;
  description?: string | null;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;

  // Права доступа
  createPermission:
    | "ALL"
    | "User"
    | "Admin"
    | "Admin|User"
    | "Owner"
    | "Owner|Admin"
    | "Owner|User";
  readPermission:
    | "ALL"
    | "User"
    | "Admin"
    | "Admin|User"
    | "Owner"
    | "Owner|Admin"
    | "Owner|User";
  updatePermission:
    | "ALL"
    | "User"
    | "Admin"
    | "Admin|User"
    | "Owner"
    | "Owner|Admin"
    | "Owner|User";
  deletePermission:
    | "ALL"
    | "User"
    | "Admin"
    | "Admin|User"
    | "Owner"
    | "Owner|Admin"
    | "Owner|User";

  // Section titles for form organization
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;

  // UI Configuration
  uiConfig?: PartialUIConfig | null; // Partial override для UI метаданных

  // Pagination settings
  enablePagination?: boolean | null; // default: true
  pageSize?: number | null; // default: 20

  // Filter settings
  enableFilters?: boolean | null; // default: false

  // File upload limits
  maxFileSizeMb?: number | null; // по умолчанию 5
  maxFilesCount?: number | null; // по умолчанию 10

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Конфигурация полей
// =====================================================

export type FieldType =
  | "select"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "radio"
  | "multipleSelect"
  | "array"
  | "dynamicValue" // Кастомный тип: динамическое поле, меняющее тип в зависимости от других полей
  | "files" // Файлы (отображение как список)
  | "images"; // Изображения (отображение как img теги)

export type DbType =
  | "varchar"
  | "float"
  | "boolean"
  | "timestamptz"
  | "manyToOne"
  | "oneToMany"
  | "manyToMany"
  | "oneToOne"
  | "files"; // Для файлов (хранит массив ID из entity_file)

export interface FieldOption {
  id: string;
  name: string;
}

export interface Field {
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
  sectionIndex: number; // Index of the section this field belongs to (0-3)
  isOptionTitleField: boolean;
  searchable: boolean;
  filterableInList?: boolean; // Показывать это поле в фильтрах списка
  options?: FieldOption[];

  // Связи
  relatedEntityDefinitionId?: string | null;
  relationFieldId?: string | null;
  isRelationSource: boolean;
  selectorRelationId?: string | null;

  // Информация о связанном поле (для отображения при редактировании)
  relationFieldName?: string | null; // Имя связанного поля
  relationFieldLabel?: string | null; // Лейбл связанного поля

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

  // Conditional field visibility based on another field's value
  foreignKey?: string | null; // Name of the field this field depends on
  foreignKeyValue?: string | null; // Value(s) of foreignKey that make this field visible (pipe-separated: "value1|value2" or "any")

  // Dynamic value field configuration (for type: "dynamicValue")
  typeFieldName?: string | null; // Name of the field that determines the input type (default: "type")
  optionsFieldName?: string | null; // Name of the field that contains options for select type (default: "options")

  // File upload configuration (for type: "files" or "images")
  acceptFileTypes?: string | null; // "image/*", "application/pdf", etc.
  maxFileSize?: number | null; // в байтах (переопределяет лимит из EntityDefinition)
  maxFiles?: number | null; // для типа "files"/"images" (переопределяет лимит из EntityDefinition)
  storageBucket?: string | null; // имя bucket (default: "files")

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Типы значений полей
// =====================================================

/**
 * Возможные типы значений полей в зависимости от DbType
 */
export type FieldValue =
  | string
  | number
  | boolean
  | Date
  | string[] // для массивов связей
  | null
  | undefined;

/**
 * Маппинг DbType на TypeScript типы
 */
export type DbTypeToTSType = {
  varchar: string;
  float: number;
  boolean: boolean;
  timestamptz: string | Date;
  manyToOne: string; // ID связанной сущности
  oneToMany: string[]; // массив ID
  manyToMany: string[]; // массив ID
  oneToOne: string; // ID связанной сущности
  files: string[]; // массив ID из entity_file
};

/**
 * Generic тип для данных сущности с типобезопасностью
 */
export type EntityData<
  T extends Record<string, FieldValue> = Record<string, FieldValue>
> = T;

// =====================================================
// Экземпляры сущностей
// =====================================================

export interface EntityInstance<
  TData extends Record<string, FieldValue> = Record<string, FieldValue>
> {
  id: string;
  entityDefinitionId: string;
  projectId: string;

  // Все поля хранятся в JSONB (внутреннее представление)
  data: EntityData<TData>;

  // Владелец записи (для политик "только свои записи")
  createdBy?: string | null;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Связи между экземплярами
// =====================================================

export type RelationType =
  | "manyToMany"
  | "manyToOne"
  | "oneToMany"
  | "oneToOne";

export interface EntityRelation {
  id: string;
  sourceInstanceId: string;
  targetInstanceId: string;
  relationFieldId: string;
  reverseFieldId?: string | null;
  relationType: RelationType;
  createdAt: string;
}

// =====================================================
// Расширенные типы
// =====================================================

/**
 * Экземпляр сущности с полями и связями (плоская структура)
 * Все поля размещены на верхнем уровне, без data и relations
 */
export type EntityInstanceWithFields<
  TFields extends Record<string, FieldValue> = Record<string, FieldValue>
> = {
  id: string;
  entityDefinitionId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
} & TFields;

/**
 * Тип фильтра для поля
 */
export type FilterValue = FieldValue | FieldValue[];

/**
 * Конфигурация для получения списка экземпляров
 */
export interface GetInstancesOptions<
  TFilters extends Record<string, FilterValue> = Record<string, FilterValue>
> {
  includeRelations?: string[]; // имена полей для загрузки связей
  relationsAsIds?: boolean; // если true, связи как ID, иначе как объекты (default: false)
  filters?: TFilters; // фильтры по полям
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Данные для создания/обновления экземпляра
 */
export type InstanceData<
  TData extends Record<string, FieldValue> = Record<string, FieldValue>
> = TData;

/**
 * Связи для создания/обновления
 */
export interface RelationsData {
  [fieldName: string]: string[]; // массив ID связанных экземпляров
}

// =====================================================
// Utility Types для безопасной работы
// =====================================================

/**
 * Type guard для проверки, что значение является валидным FieldValue
 */
export function isFieldValue(value: unknown): value is FieldValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date ||
    (Array.isArray(value) && value.every((v) => typeof v === "string")) ||
    value === null ||
    value === undefined
  );
}

/**
 * Type guard для проверки EntityData
 */
export function isEntityData(
  value: unknown
): value is Record<string, FieldValue> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return Object.values(value).every(isFieldValue);
}

/**
 * Безопасное извлечение значения поля с типом
 */
export function getFieldValue<T extends FieldValue>(
  data: Record<string, FieldValue>,
  fieldName: string,
  defaultValue?: T
): T | undefined {
  const value = data[fieldName];
  return value !== undefined ? (value as T) : defaultValue;
}

/**
 * Partial тип для обновления данных сущности
 */
export type PartialInstanceData<T extends Record<string, FieldValue>> =
  Partial<T>;

// =====================================================
// Файлы
// =====================================================

/**
 * Файл, привязанный к экземпляру сущности
 */
export interface EntityFile {
  id: string;
  entityInstanceId: string;
  fieldId?: string | null;
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageBucket: string;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
