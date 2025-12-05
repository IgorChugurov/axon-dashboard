/**
 * Prepare item data for editing
 * Normalizes null values and applies defaults
 */

import type { Field, FieldValue } from "@/lib/universal-entity/types";

/**
 * Transform server data for form editing
 * - Handles null values
 * - Applies field defaults
 * - Normalizes relation fields
 */
export function getItemForEdit(
  fields: Field[],
  serverData?: Record<string, unknown>
): Record<string, FieldValue> {
  const formData: Record<string, FieldValue> = {};

  fields.forEach((field) => {
    const serverValue = serverData?.[field.name];

    // If server has a value, use it (but normalize nulls)
    if (serverValue !== null && serverValue !== undefined) {
      formData[field.name] = normalizeValue(serverValue, field);
      return;
    }

    // Server value is null/undefined - use defaults
    formData[field.name] = getDefaultForNull(field);
  });

  return formData;
}

/**
 * Normalize a value from server based on field type
 */
function normalizeValue(value: unknown, field: Field): FieldValue {
  //console.log("normalizeValue", value, field);
  switch (field.type) {
    case "select":
      // If null or "none", return appropriate default
      if (value === null || value === "none") {
        return null;
      }
      // For select, value should be a string
      return typeof value === "string" ? value : String(value);

    case "multipleSelect":
    case "array":
    case "files":
    case "images":
      // Ensure array
      if (!Array.isArray(value)) {
        // Convert single value to array, ensuring it's a string
        if (value === null || value === undefined) return [];
        return [String(value)];
      }
      // Type assertion: value is already checked as array
      return value as string[];

    case "number":
      if (value === null || value === undefined) return 0;
      return Number(value);

    case "boolean":
      if (value === null || value === undefined) return false;
      return Boolean(value);

    case "date":
      if (value === null) return null;
      // Date can be string (ISO) or Date object
      if (value instanceof Date) return value;
      if (typeof value === "string") return value;
      return String(value);

    case "dynamicValue":
      // Для dynamicValue возвращаем значение как есть - тип определяется динамически
      // Преобразуем unknown в FieldValue с проверкой типов
      if (value === null) return null;
      if (typeof value === "string") return value;
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value;
      if (value instanceof Date) return value;
      if (Array.isArray(value)) return value as string[];
      // Fallback: преобразуем в строку
      return String(value);

    case "text":
    case "textarea":
    default:
      if (value === null || value === undefined) return "";
      return String(value);
  }
}

/**
 * Get default value for null server value
 */
function getDefaultForNull(field: Field): FieldValue {
  switch (field.type) {
    case "select":
      return null;

    case "multipleSelect":
    case "array":
    case "files":
    case "images":
      return [];

    case "number":
      return field.defaultNumberValue ?? 0;

    case "boolean":
      return field.defaultBooleanValue ?? false;

    case "date":
      return field.defaultDateValue ?? null;

    case "text":
    case "textarea":
    default:
      return field.defaultStringValue ?? "";
  }
}

/**
 * Clean form data before sending to server
 * - Removes empty arrays for non-required fields
 * - Converts null to appropriate type
 * - Handles relation fields
 */
export function cleanFormDataForSubmit(
  formData: Record<string, FieldValue>,
  fields: Field[]
): Record<string, FieldValue> {
  const cleaned: Record<string, FieldValue> = {};

  fields.forEach((field) => {
    const value = formData[field.name];

    // Skip undefined
    if (value === undefined) return;

    // Handle null
    if (value === null) {
      cleaned[field.name] = null;
      return;
    }

    // Handle empty string
    if (value === "" && !field.required) {
      cleaned[field.name] = null;
      return;
    }

    // Handle empty array
    if (Array.isArray(value) && value.length === 0 && !field.required) {
      cleaned[field.name] = null;
      return;
    }

    // Handle "none" for select
    if (value === "none" && field.type === "select") {
      cleaned[field.name] = null;
      return;
    }

    // Otherwise, keep the value
    cleaned[field.name] = value;
  });

  return cleaned;
}
