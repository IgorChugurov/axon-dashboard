/**
 * Утилиты для публичного API SDK
 */

import type { FieldConfig } from "./types";
import type { FieldValue } from "./types/entity-types";

/**
 * Результат валидации данных
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Валидация данных на основе fields конфигурации
 */
export function validateInstanceData(
  data: Record<string, unknown>,
  fields: FieldConfig[]
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of fields) {
    const value = data[field.name];

    // Проверка required
    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push({
        field: field.name,
        message: `${field.name} is required`,
      });
      continue;
    }

    // Проверка типа
    if (value !== undefined && value !== null) {
      const typeError = validateFieldType(value, field);
      if (typeError) {
        errors.push({ field: field.name, message: typeError });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Проверка типа поля
 */
function validateFieldType(value: unknown, field: FieldConfig): string | null {
  switch (field.dbType) {
    case "varchar":
    case "timestamptz":
      if (typeof value !== "string") {
        return `Expected string, got ${typeof value}`;
      }
      break;
    case "float":
      if (typeof value !== "number") {
        return `Expected number, got ${typeof value}`;
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        return `Expected boolean, got ${typeof value}`;
      }
      break;
    // Relations - должны быть массивами строк (ID)
    case "manyToMany":
    case "oneToMany":
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        return `Expected array of strings (IDs), got ${typeof value}`;
      }
      break;
    case "manyToOne":
    case "oneToOne":
      if (typeof value !== "string") {
        return `Expected string (ID), got ${typeof value}`;
      }
      break;
  }
  return null;
}

/**
 * Нормализация значения поля
 */
export function normalizeFieldValue(
  value: unknown,
  field: FieldConfig
): FieldValue {
  if (value === null || value === undefined) {
    return null;
  }

  // Нормализация по dbType
  switch (field.dbType) {
    case "float":
      return typeof value === "string" ? parseFloat(value) : (value as number);
    case "boolean":
      return typeof value === "string"
        ? value.toLowerCase() === "true"
        : Boolean(value);
    case "varchar":
    case "timestamptz":
      return String(value);
    default:
      return value as FieldValue;
  }
}

/**
 * Трансформация snake_case → camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Трансформация camelCase → snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
