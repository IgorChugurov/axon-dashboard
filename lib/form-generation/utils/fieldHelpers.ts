/**
 * Helper functions for field operations
 */

import type { Field, DbType, FieldType } from "@/lib/universal-entity/types";
import type { FieldValue } from "../types";

/**
 * Check if a dbType is a relation type
 */
export function isRelationDbType(dbType: DbType): boolean {
  return ["manyToOne", "oneToMany", "manyToMany", "oneToOne"].includes(dbType);
}

/**
 * Check if a field type is a relation type
 */
export function isRelationType(type: FieldType): boolean {
  return ["select", "multipleSelect"].includes(type);
}

/**
 * Check if a field represents a relation
 */
export function isRelationField(field: Field): boolean {
  return (
    isRelationDbType(field.dbType) && field.relatedEntityDefinitionId != null
  );
}

/**
 * Get default value for a field based on its type
 */
export function getDefaultValueForField(field: Field): FieldValue {
  // Check for explicit default values first
  if (field.defaultStringValue != null) return field.defaultStringValue;
  if (field.defaultNumberValue != null) return field.defaultNumberValue;
  if (field.defaultBooleanValue != null) return field.defaultBooleanValue;
  if (field.defaultDateValue != null) return field.defaultDateValue;

  // Otherwise, use type-based defaults
  switch (field.type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
      return null;
    case "multipleSelect":
    case "array":
      return [];
    case "select":
      return isRelationField(field) ? [] : null;
    case "text":
    case "textarea":
    default:
      return "";
  }
}

/**
 * Get default value for a specific field type (without Field object)
 */
export function getDefaultValueForFieldType(type: FieldType): FieldValue {
  switch (type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
      return null;
    case "multipleSelect":
    case "array":
      return [];
    case "select":
      return null;
    case "text":
    case "textarea":
    default:
      return "";
  }
}

/**
 * Get default value for relation field (for clearing)
 */
export function getDefaultValueForRelationField(
  fieldName: string
): string | boolean | null {
  if (fieldName === "relatedEntityDefinitionId") return null;
  if (fieldName === "relationFieldRequired") return false;
  return "";
}

/**
 * Check if two values are equal (handles arrays)
 */
export function areValuesEqual(
  value1: FieldValue,
  value2: FieldValue
): boolean {
  if (Array.isArray(value1) && Array.isArray(value2)) {
    return (
      value1.length === value2.length && value1.every((v, i) => v === value2[i])
    );
  }
  return value1 === value2;
}

/**
 * Check if a field should be visible based on its foreignKey dependency
 * Supports only one level of dependency (A -> B)
 */
export function isFieldVisible(
  field: Field,
  formData: Record<string, FieldValue>
): boolean {
  // No dependency - always visible
  if (!field.foreignKey || !field.foreignKeyValue) return true;

  // Get parent value
  const parentValue = formData[field.foreignKey];
  if (parentValue == null) return false;

  // Convert to string for comparison
  const parentValueStr = String(parentValue);

  // Check if "any" - any non-empty value matches
  if (field.foreignKeyValue === "any") {
    return Boolean(parentValueStr) && parentValueStr !== "none";
  }

  // Check against allowed values
  const allowedValues = field.foreignKeyValue.split("|");
  return allowedValues.includes(parentValueStr);
}

/**
 * Filter fields that should be visible based on their dependencies
 */
export function getVisibleFields(
  fields: Field[],
  formData: Record<string, FieldValue>
): Field[] {
  return fields.filter((field) => isFieldVisible(field, formData));
}

/**
 * Get the title for a section
 * @param sectionIndex - Index of the section (0-3)
 * @param sectionTitles - Optional section titles from uiConfig.form.sectionTitles
 * @returns Section title with defaults
 */
export function getSectionTitle(
  sectionIndex: number,
  sectionTitles?: { [key: number]: string | undefined }
): string {
  // Check if custom title is provided
  if (sectionTitles && sectionTitles[sectionIndex]) {
    const customTitle = sectionTitles[sectionIndex];
    if (typeof customTitle === "string" && customTitle.trim()) {
      return customTitle.trim();
    }
  }

  // Defaults
  if (sectionIndex === 0) return "General Information";
  return `Section ${sectionIndex}`;
}

/**
 * Validate field value
 */
export function validateFieldValue(
  field: Field,
  value: FieldValue
): string | null {
  // Required validation
  if (field.required) {
    if (value == null || value === "") {
      return field.requiredText || "This field is required";
    }

    if (Array.isArray(value) && value.length === 0) {
      return field.requiredText || "This field is required";
    }

    if (field.type === "select" && value === "none") {
      return field.requiredText || "Please select a value";
    }
  }

  return null;
}
