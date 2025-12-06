/* eslint-disable */
// @ts-nocheck
/**
 * Утилиты для конфигурации таблиц entity instances
 */

import type {
  Field,
  EntityInstanceWithFields,
} from "@igorchugurov/public-api-sdk";

/**
 * Конфигурация столбца таблицы
 */
export interface TableColumn {
  id: string;
  fieldName: string;
  label: string;
  field: Field;
  isRelation: boolean;
  displayIndex: number;
}

/**
 * Создает конфигурацию столбцов таблицы на основе полей сущности
 */
export function buildTableColumns(fields: Field[]): TableColumn[] {
  // Фильтруем поля, которые должны отображаться в таблице
  const tableFields = fields.filter((f) => f.displayInTable);

  // Сортируем по displayIndex
  const sortedFields = [...tableFields].sort(
    (a, b) => a.displayIndex - b.displayIndex
  );

  // Создаем конфигурацию столбцов
  return sortedFields.map((field) => ({
    id: field.id,
    fieldName: field.name,
    label: field.label,
    field,
    isRelation:
      field.dbType === "manyToMany" ||
      field.dbType === "manyToOne" ||
      field.dbType === "oneToMany" ||
      field.dbType === "oneToOne",
    displayIndex: field.displayIndex,
  }));
}

/**
 * Получает значение для отображения из связанного экземпляра
 * Ищет поле для отображения в следующем порядке:
 * 1. Стандартные поля: name, Name, title, Title
 * 2. Первое строковое поле (кроме служебных)
 * 3. ID
 */
function getRelatedInstanceDisplayValue(item: any): string {
  if (!item || typeof item !== "object") return "-";

  // Служебные поля, которые не должны использоваться для отображения
  const systemFields = new Set([
    "id",
    "entityDefinitionId",
    "projectId",
    "createdAt",
    "updatedAt",
  ]);

  // 1. Сначала ищем стандартные поля (с разными регистрами)
  const standardFields = ["name", "Name", "title", "Title"];
  for (const fieldName of standardFields) {
    if (item[fieldName] !== undefined && item[fieldName] !== null) {
      const value = String(item[fieldName]).trim();
      if (value) return value;
    }
  }

  // 2. Ищем первое строковое поле (кроме служебных)
  for (const [key, value] of Object.entries(item)) {
    if (!systemFields.has(key) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  // 3. В крайнем случае используем ID
  return item.id || "-";
}

/**
 * Форматирует значение для отображения в ячейке таблицы
 */
export function formatCellValue(
  instance: EntityInstanceWithFields,
  column: TableColumn
): string {
  const value = instance[column.fieldName];

  // Если значение отсутствует
  if (value === undefined || value === null) {
    return "-";
  }

  // Для полей связей
  if (column.isRelation) {
    if (!Array.isArray(value)) {
      return "-";
    }

    // Для множественных связей
    if (
      column.field.type === "multipleSelect" ||
      column.field.dbType === "manyToMany" ||
      column.field.dbType === "oneToMany"
    ) {
      if (value.length === 0) {
        return "-";
      }

      // Находим поле для отображения названия связанной сущности
      const names = value
        .map((relatedInstance: any) =>
          getRelatedInstanceDisplayValue(relatedInstance)
        )
        .filter((name) => name && name !== "-");

      return names.length > 0 ? `${value.length} (${names.join(", ")})` : "-";
    }

    // Для одиночных связей (manyToOne, oneToOne)
    const relatedInstance = value[0];
    if (!relatedInstance) {
      return "-";
    }

    return getRelatedInstanceDisplayValue(relatedInstance);
  }

  // Для обычных полей
  if (typeof value === "object") {
    // Для объектов показываем JSON (компактно)
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  // Для boolean
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Для чисел и строк
  return String(value);
}

/**
 * Получает название экземпляра для отображения
 */
export function getInstanceTitle(
  instance: EntityInstanceWithFields,
  fields: Field[]
): string {
  // Ищем поле, помеченное как isOptionTitleField
  const titleField = fields.find((f) => f.isOptionTitleField);

  if (titleField) {
    const value = instance[titleField.name];
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  // Если не найдено, используем первое текстовое поле
  const firstTextField = fields.find(
    (f) => f.dbType === "varchar" && instance[f.name]
  );
  if (firstTextField) {
    return String(instance[firstTextField.name]);
  }

  // В крайнем случае - ID
  return instance.id;
}
