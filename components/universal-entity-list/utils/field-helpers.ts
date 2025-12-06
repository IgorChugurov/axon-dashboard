/**
 * Утилиты для работы с полями в списках
 */

import type { Field } from "@igorchugurov/public-api-sdk";

/**
 * Определяет, является ли поле relation-полем
 */
export function isRelationField(field: Field): boolean {
  return (
    !!field.relatedEntityDefinitionId &&
    (field.dbType === "manyToMany" ||
      field.dbType === "manyToOne" ||
      field.dbType === "oneToMany" ||
      field.dbType === "oneToOne")
  );
}

/**
 * Получает имена relation-полей для загрузки в таблице
 * Только поля с displayInTable: true
 */
export function getRelationFieldNames(fields: Field[]): string[] {
  return fields
    .filter((f) => isRelationField(f) && f.displayInTable)
    .map((f) => f.name);
}

/**
 * Получает информацию о relation-полях для фильтрации
 * Только поля с filterableInList: true
 *
 * @deprecated Больше не используется - SDK сам определяет relation-поля из fields
 */
export function getRelationFiltersInfo(fields: Field[]): Array<{
  fieldName: string;
  fieldId: string;
}> {
  return fields
    .filter((f) => isRelationField(f) && f.filterableInList)
    .map((f) => ({
      fieldName: f.name,
      fieldId: f.id,
    }));
}

/**
 * Получает имена searchable полей для поиска
 */
export function getSearchableFields(fields: Field[]): string[] {
  const searchable = fields.filter((f) => f.searchable).map((f) => f.name);
  // Если нет searchable полей, используем "name" по умолчанию
  return searchable.length > 0 ? searchable : ["name"];
}
