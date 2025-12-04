/**
 * Генерация UI конфигурации из EntityDefinition и Fields
 * Единый источник истины для генерации UI конфигурации в SDK
 *
 * Основная логика:
 * 1. Генерируем defaults на основе имени сущности
 * 2. Мержим с custom конфигом из entityDefinition.uiConfig
 * 3. Генерируем колонки таблицы из полей с displayInTable: true
 */

import type { EntityDefinition, Field } from "../types/entity-types";
import type {
  EntityUIConfig,
  ListPageConfig,
  FormPageConfig,
  MessagesConfig,
  ColumnConfig,
} from "../types/ui-config-types";

/**
 * Генерирует полную UI конфигурацию с defaults
 * @param entityDefinition - Определение сущности из БД
 * @param fields - Поля сущности из БД
 * @returns Полная UI конфигурация со всеми значениями
 */
export function generateUIConfig(
  entityDefinition: EntityDefinition,
  fields: Field[]
): EntityUIConfig {
  // 1. Генерируем defaults
  const defaults = generateDefaults(entityDefinition, fields);

  // 2. Мержим с custom конфигом (если есть)
  if (entityDefinition.uiConfig) {
    return deepMerge(
      defaults,
      entityDefinition.uiConfig as Partial<EntityUIConfig>
    );
  }

  return defaults;
}

/**
 * Генерирует defaults на основе EntityDefinition
 */
function generateDefaults(
  entityDefinition: EntityDefinition,
  fields: Field[]
): EntityUIConfig {
  const name = entityDefinition.name;
  const nameLower = name.toLowerCase();
  const namePlural = pluralize(nameLower);
  const tableName = entityDefinition.tableName;

  // Генерируем searchableFields из полей с searchable: true
  // Если нет таких полей, используем поле "name" по умолчанию
  const searchableFields = fields
    .filter((f) => f.searchable)
    .map((f) => f.name);

  // Если нет searchable полей, используем "name" по умолчанию
  const finalSearchableFields =
    searchableFields.length > 0 ? searchableFields : ["name"];

  // List configuration
  const list: ListPageConfig = {
    pageTitle: name,
    searchPlaceholder: `Search for ${namePlural}...`,
    emptyStateTitle: `You have no ${namePlural}`,
    emptyStateMessages: [
      `${name}s that you create will end up here.`,
      `Add a ${nameLower} to get started.`,
    ],
    showCreateButton: true,
    createButtonText: `New ${nameLower}`,
    showSearch: true,
    enablePagination: entityDefinition.enablePagination ?? true,
    pageSize: entityDefinition.pageSize ?? 20,
    enableFilters: entityDefinition.enableFilters ?? false,
    searchableFields: finalSearchableFields,
    columns: generateColumns(fields),
  };

  // Form configuration
  const form: FormPageConfig = {
    createPageTitle: `Create new ${nameLower}`,
    editPageTitle: `Edit ${nameLower}`,
    pageHeader: `${name} details`,
    createButtonLabel: "Create",
    updateButtonLabel: "Update",
    cancelButtonLabel: "Cancel",
    sectionTitles: {
      0: entityDefinition.titleSection0 || "General Information",
      1: entityDefinition.titleSection1 || "Section 1",
      2: entityDefinition.titleSection2 || "Section 2",
      3: entityDefinition.titleSection3 || "Section 3",
    },
  };

  // Messages configuration
  const messages: MessagesConfig = {
    afterCreate: `${name} was created successfully!`,
    afterUpdate: `${name} was updated successfully!`,
    afterDelete: `${name} was deleted successfully!`,
    errorCreate: `Failed to create ${nameLower}. Please try again.`,
    errorUpdate: `Failed to update ${nameLower}. Please try again.`,
    deleteModalTitle: `Confirm deleting ${nameLower}`,
    deleteModalText: `Are you sure you want to delete "{itemName}"? This action cannot be undone.`,
    deleteModalButtonText: "Delete",
    reloadEvents: {
      create: `reload${name}`,
      update: `reload${name}`,
      delete: `reload${name}`,
    },
  };

  return {
    apiUrl: `/api/${tableName}`,
    apiUrlAll: `/api/entity-instances/all`,
    list,
    form,
    messages,
  };
}

/**
 * Проверяет, является ли поле связью
 */
function isRelationField(field: Field): boolean {
  return (
    field.dbType === "manyToOne" ||
    field.dbType === "oneToOne" ||
    field.dbType === "manyToMany" ||
    field.dbType === "oneToMany"
  );
}

/**
 * Генерирует колонки таблицы из полей с displayInTable: true
 */
function generateColumns(fields: Field[]): ColumnConfig[] {
  // Фильтруем поля для отображения в таблице
  const displayFields = fields
    .filter((f) => f.displayInTable)
    .sort((a, b) => a.displayIndex - b.displayIndex);
  // Генерируем колонки из полей
  const columns: ColumnConfig[] = displayFields.map((field, index) => {
    const columnType = index === 0 ? "naigateToDetails" : getColumnType(field);
    const isRelation = isRelationField(field);

    const column: ColumnConfig = {
      field: field.name,
      headerName: field.label || field.name,
      flex: 1,
      type: columnType,
      sortable: true,

      // Добавляем relationDbType для полей-связей
      ...(isRelation && {
        relationDbType: field.dbType as
          | "manyToOne"
          | "oneToOne"
          | "manyToMany"
          | "oneToMany",
      }),
    };

    return column;
  });

  // Добавляем колонку действий
  columns.push({
    field: "actions",
    headerName: "",
    type: "actions",
    width: 100,
    actions: [
      {
        action: "edit",
        link: true,
      },
      {
        action: "delete",
      },
    ],
  });

  return columns;
}

/**
 * Определяет тип колонки по типу поля
 */
function getColumnType(field: Field): ColumnConfig["type"] {
  // Сначала проверяем, является ли поле связью
  if (isRelationField(field)) {
    return "relation";
  }

  // Для обычных полей определяем тип по field.type
  switch (field.type) {
    case "date":
      return "date";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "text";
  }
}

/**
 * Простая плюрализация (можно заменить на библиотеку pluralize если нужно)
 */
function pluralize(word: string): string {
  // Простые правила английской плюрализации
  if (word.endsWith("y")) {
    return word.slice(0, -1) + "ies";
  }
  if (
    word.endsWith("s") ||
    word.endsWith("x") ||
    word.endsWith("ch") ||
    word.endsWith("sh")
  ) {
    return word + "es";
  }
  return word + "s";
}

/**
 * Deep merge двух объектов
 * custom перезаписывает defaults
 */
function deepMerge<T extends Record<string, any>>(
  defaults: T,
  custom: Partial<T>
): T {
  const result = { ...defaults };

  for (const key in custom) {
    const customValue = custom[key];
    const defaultValue = defaults[key];

    // Пропускаем undefined и null
    if (customValue === undefined || customValue === null) {
      continue;
    }

    // Рекурсивный merge для объектов (не массивов)
    if (
      typeof customValue === "object" &&
      !Array.isArray(customValue) &&
      typeof defaultValue === "object" &&
      !Array.isArray(defaultValue) &&
      defaultValue !== null
    ) {
      result[key] = deepMerge(
        defaultValue as Record<string, any>,
        customValue as Record<string, any>
      ) as any;
    } else {
      // Для примитивов и массивов - просто перезаписываем
      result[key] = customValue as any;
    }
  }

  return result;
}

/**
 * Утилита для форматирования колонок из старого формата
 * Для обратной совместимости с config/*.json
 */
export function getColumnsFromFields(fields: Field[]): ColumnConfig[] {
  return fields
    .filter((field) => field.displayInTable)
    .map((field, i) => ({
      type: i === 0 ? ("naigateToDetails" as const) : undefined,
      field: field.name,
      headerName: field.label || field.name,
      flex: 1,
    }));
}
