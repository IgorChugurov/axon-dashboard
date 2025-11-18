/**
 * Create form structure with sections from fields
 */

import type { Field, EntityDefinition } from "@/lib/universal-entity/types";
import type { FormSection, FormStructure } from "../types";
import { getSectionTitle } from "./fieldHelpers";

/**
 * Group fields into sections based on sectionIndex
 * Filters out sections with no visible fields
 */
export function createFormStructure(
  entityDefinition: EntityDefinition,
  fields: Field[],
  mode: "create" | "edit"
): FormStructure {
  // Filter fields for current mode
  const relevantFields = fields.filter((field) => {
    if (mode === "create") return field.forCreatePage;
    if (mode === "edit") return field.forEditPage;
    return false;
  });

  // Sort fields by displayIndex within each section
  const sortedFields = [...relevantFields].sort((a, b) => {
    // First by sectionIndex
    if (a.sectionIndex !== b.sectionIndex) {
      return a.sectionIndex - b.sectionIndex;
    }
    // Then by displayIndex
    return a.displayIndex - b.displayIndex;
  });

  // Group fields by section
  const sectionMap = new Map<number, Field[]>();

  sortedFields.forEach((field) => {
    const sectionIndex = field.sectionIndex ?? 0;
    if (!sectionMap.has(sectionIndex)) {
      sectionMap.set(sectionIndex, []);
    }
    sectionMap.get(sectionIndex)!.push(field);
  });

  // Create sections array
  const sections: FormSection[] = [];

  // Process sections 0-3
  for (let i = 0; i <= 3; i++) {
    const sectionFields = sectionMap.get(i);

    // Skip empty sections
    if (!sectionFields || sectionFields.length === 0) {
      continue;
    }

    sections.push({
      sectionIndex: i,
      title: getSectionTitle(i, entityDefinition),
      fields: sectionFields,
    });
  }

  return {
    entityDefinition,
    sections,
    allFields: sortedFields,
  };
}

/**
 * Filter form structure to only include visible fields
 * (based on foreignKey dependencies)
 */
export function filterVisibleSections(
  formStructure: FormStructure,
  formData: Record<string, unknown>
): FormSection[] {
  return formStructure.sections
    .map((section) => {
      const visibleFields = section.fields.filter((field) =>
        isFieldVisible(field, formData)
      );

      return {
        ...section,
        fields: visibleFields,
      };
    })
    .filter((section) => section.fields.length > 0); // Remove empty sections
}

/**
 * Check if field is visible (based on foreignKey)
 * Supports only one level: A -> B
 */
function isFieldVisible(
  field: Field,
  formData: Record<string, unknown>
): boolean {
  // No dependency - always visible
  if (!field.foreignKey || !field.foreignKeyValue) return true;

  // Get parent value
  const parentValue = formData[field.foreignKey];
  if (parentValue == null) return false;

  const parentValueStr = String(parentValue);

  // Handle "any" condition
  if (field.foreignKeyValue === "any") {
    return Boolean(parentValueStr) && parentValueStr !== "none";
  }

  // Check against allowed values
  const allowedValues = field.foreignKeyValue.split("|");
  return allowedValues.includes(parentValueStr);
}

/**
 * Get all fields that should be validated
 * (only visible fields)
 */
export function getValidatableFields(
  fields: Field[],
  formData: Record<string, unknown>
): Field[] {
  return fields.filter((field) => isFieldVisible(field, formData));
}

