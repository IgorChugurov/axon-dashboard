/**
 * Типы для универсальной системы сущностей
 */

// =====================================================
// Конфигурация сущностей
// =====================================================

export interface EntityDefinition {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;

  // Права доступа
  createPermission: "ALL" | "User" | "Admin" | "Admin|User";
  readPermission: "ALL" | "User" | "Admin" | "Admin|User";
  updatePermission: "ALL" | "User" | "Admin" | "Admin|User";
  deletePermission: "ALL" | "User" | "Admin" | "Admin|User";

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
  | "multipleSelect";

export type DbType =
  | "varchar"
  | "float"
  | "boolean"
  | "timestamptz"
  | "manyToOne"
  | "oneToMany"
  | "manyToMany"
  | "oneToOne";

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
  isOptionTitleField: boolean;
  searchable: boolean;

  // Связи
  relatedEntityDefinitionId?: string | null;
  relationFieldId?: string | null;
  isRelationSource: boolean;
  selectorRelationId?: string | null;

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

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Экземпляры сущностей
// =====================================================

export interface EntityInstance {
  id: string;
  entityDefinitionId: string;
  projectId: string;

  // Все поля хранятся в JSONB (внутреннее представление)
  data: Record<string, any>;

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
export interface EntityInstanceWithFields {
  id: string;
  entityDefinitionId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;

  // Динамические поля (обычные поля + поля связей)
  [key: string]: any;
}

/**
 * Конфигурация для получения списка экземпляров
 */
export interface GetInstancesOptions {
  includeRelations?: string[]; // имена полей для загрузки связей
  relationsAsIds?: boolean; // если true, связи как ID, иначе как объекты (default: false)
  filters?: Record<string, any>; // фильтры по полям
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Данные для создания/обновления экземпляра
 */
export interface InstanceData {
  [fieldName: string]: any;
}

/**
 * Связи для создания/обновления
 */
export interface RelationsData {
  [fieldName: string]: string[]; // массив ID связанных экземпляров
}
