/**
 * Типы для JSON конфигурационных файлов в папке config/
 *
 * Эти типы описывают полную структуру конфигурационных файлов,
 * включая EntityDefinition поля, Fields и EntityUIConfig
 */

import type { EntityUIConfig } from "./ui-config-types";
import type { Field, FieldType, DbType } from "./types";

/**
 * Поля EntityDefinition, которые могут быть в конфиге
 */
export interface EntityDefinitionConfig {
  /** Имя сущности (отображается в UI) */
  entityName: string;

  /** Имя таблицы в БД */
  tableName: string;

  /** URL сущности (используется для роутинга, например "environments") */
  url?: string;

  /** API URL (например, "/api/environments") */
  apiUrl: string;

  /** API URL для получения всех записей (опционально) */
  apiUrlAll?: string;

  /** Описание сущности */
  description?: string;

  /** Тип сущности: primary, secondary, tertiary */
  type?: "primary" | "secondary" | "tertiary";

  /** Права доступа для создания */
  createPermission?: "Admin" | "ALL" | "User" | "Admin|User";

  /** Права доступа для чтения */
  readPermission?: "Admin" | "ALL" | "User" | "Admin|User";

  /** Права доступа для обновления */
  updatePermission?: "Admin" | "ALL" | "User" | "Admin|User";

  /** Права доступа для удаления */
  deletePermission?: "Admin" | "ALL" | "User" | "Admin|User";
}

/**
 * Field из JSON конфига (без обязательных полей createdAt/updatedAt)
 * Эти поля добавляются автоматически при создании EntityDefinition
 */
export type FieldFromConfig = Omit<Field, "createdAt" | "updatedAt"> & {
  /** Тип поля (может быть dynamicValue) */
  type: FieldType;
  /** DB тип */
  dbType: DbType;
  /** Для dynamicValue: имя поля, от которого зависит тип */
  typeFieldName?: string | null;
  /** Для dynamicValue: имя поля с опциями для select */
  optionsFieldName?: string | null;
};

/**
 * Полная структура конфигурационного файла
 *
 * Объединяет EntityDefinition поля, Fields и EntityUIConfig
 */
export interface EntityConfigFile
  extends EntityDefinitionConfig,
    EntityUIConfig {
  /** Комментарий к конфигу (для документации) */
  comment?: string;

  /** Массив полей формы (из JSON, без createdAt/updatedAt) */
  fields: FieldFromConfig[];
}

/**
 * Тип для импорта JSON конфига
 * Используется для type-safe импорта конфигов
 */
export type ConfigFileImport = EntityConfigFile;
