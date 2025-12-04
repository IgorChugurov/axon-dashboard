/**
 * Трансформеры для преобразования данных из БД в типы TypeScript
 * Используется в client-service и server service для устранения дублирования
 */

import type { Environment } from "./types";

/**
 * Преобразование данных из БД в типы TypeScript
 * Конвертирует snake_case из БД в camelCase для TypeScript
 */
export function transformEnvironment(row: any): Environment {
  // Парсим options из JSONB
  let options: string[] = [];
  if (row.options) {
    try {
      options = Array.isArray(row.options)
        ? row.options
        : JSON.parse(row.options);
    } catch {
      options = [];
    }
  }

  // Парсим value из JSONB в зависимости от типа
  let value: string | number | boolean | null = null;
  if (row.value !== null && row.value !== undefined) {
    switch (row.type) {
      case "string":
        value = typeof row.value === "string" ? row.value : String(row.value);
        break;
      case "number":
        value =
          typeof row.value === "number"
            ? row.value
            : parseFloat(String(row.value));
        break;
      case "boolean":
        value = typeof row.value === "boolean" ? row.value : Boolean(row.value);
        break;
      case "select":
        value = typeof row.value === "string" ? row.value : String(row.value);
        break;
      default:
        value = String(row.value);
    }
  }

  return {
    id: row.id,
    projectId: row.project_id,
    key: row.key,
    type: row.type,
    value,
    options,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

