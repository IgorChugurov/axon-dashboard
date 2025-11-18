/**
 * Генерация UI конфигурации из EntityDefinition и Fields
 * Заменяет lib/form-generation/utils/createJSONDefinitionForEntity.ts
 * 
 * Основная логика:
 * 1. Генерируем defaults на основе имени сущности
 * 2. Мержим с custom конфигом из entityDefinition.uiConfig
 * 3. Генерируем колонки таблицы из полей с displayInTable: true
 */

import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import type {
  EntityUIConfig,
  ListPageConfig,
  FormPageConfig,
  MessagesConfig,
  ColumnConfig,
} from "@/lib/universal-entity/ui-config-types";

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
    return deepMerge(defaults, entityDefinition.uiConfig as Partial<EntityUIConfig>);
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
    filterEntityDefinitionIds: entityDefinition.filterEntityDefinitionIds ?? [],
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
  };

  // Messages configuration
  const messages: MessagesConfig = {
    afterCreate: `${name} was created successfully!`,
    afterUpdate: `${name} was updated successfully!`,
    afterDelete: `${name} was deleted successfully!`,
    errorCreate: `Failed to create ${nameLower}. Please try again.`,
    errorUpdate: `Failed to update ${nameLower}. Please try again.`,
    deleteModalTitle: `Confirm deleting ${nameLower}`,
    deleteModalText: `Are you sure you want to delete this ${nameLower}? This action cannot be undone.`,
    deleteModalButtonText: "Delete",
    reloadEvents: {
      create: `reload${name}`,
      update: `reload${name}`,
      delete: `reload${name}`,
    },
  };

  return {
    collectionName: tableName,
    apiUrl: entityDefinition.url || `/api/${tableName}`,
    apiUrlAll: `/api/entity-instances/all`,
    list,
    form,
    messages,
  };
}

/**
 * Генерирует колонки таблицы из полей с displayInTable: true
 */
function generateColumns(
  fields: Field[]
): ColumnConfig[] {
  // Фильтруем поля для отображения в таблице
  const displayFields = fields
    .filter((f) => f.displayInTable)
    .sort((a, b) => a.displayIndex - b.displayIndex);

  // Генерируем колонки из полей
  const columns: ColumnConfig[] = displayFields.map((field, index) => {
    const column: ColumnConfig = {
      field: field.name,
      headerName: field.label || field.name,
      flex: 1,
      type: index === 0 ? "naigateToDetails" : getColumnType(field),
      sortable: true,
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

