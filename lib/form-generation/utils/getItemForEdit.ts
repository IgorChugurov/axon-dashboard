/**
 * Prepare item data for editing
 * Normalizes null values and applies defaults
 */

import type { Field } from "@/lib/universal-entity/types";

/**
 * Transform server data for form editing
 * - Handles null values
 * - Applies field defaults
 * - Normalizes relation fields
 */
export function getItemForEdit(
  fields: Field[],
  serverData?: Record<string, any>
): Record<string, any> {
  const formData: Record<string, any> = {};

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
function normalizeValue(value: any, field: Field): any {
  switch (field.type) {
    case "select":
      // If null or "none", return appropriate default
      if (value === null || value === "none") {
        return null;
      }
      return value;

    case "multipleSelect":
    case "array":
      // Ensure array
      if (!Array.isArray(value)) {
        return value ? [value] : [];
      }
      return value;

    case "number":
      if (value === null || value === undefined) return 0;
      return Number(value);

    case "boolean":
      if (value === null || value === undefined) return false;
      return Boolean(value);

    case "date":
      if (value === null) return null;
      return value;

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
function getDefaultForNull(field: Field): any {
  switch (field.type) {
    case "select":
      return null;

    case "multipleSelect":
    case "array":
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
  formData: Record<string, any>,
  fields: Field[]
): Record<string, any> {
  const cleaned: Record<string, any> = {};

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

