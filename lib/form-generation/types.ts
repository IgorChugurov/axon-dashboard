/**
 * Types for form generation system
 */

import type { Field, EntityDefinition, FieldType, DbType } from "@/lib/universal-entity/types";

// =====================================================
// Form Structure Types
// =====================================================

/**
 * A section grouping fields together in a form
 */
export interface FormSection {
  sectionIndex: number;
  title: string;
  fields: Field[];
}

/**
 * Complete form structure with sections
 */
export interface FormStructure {
  entityDefinition: EntityDefinition;
  sections: FormSection[];
  allFields: Field[];
}

// =====================================================
// Field Value Types
// =====================================================

/**
 * Default values for different field types
 */
export type FieldValue =
  | string
  | number
  | boolean
  | Date
  | string[] // for multipleSelect, manyToMany
  | null;

/**
 * Form data object with dynamic field values
 */
export interface FormData {
  [fieldName: string]: FieldValue;
}

// =====================================================
// Validation Types
// =====================================================

/**
 * Conditional validation based on foreign key
 */
export interface ConditionalValidation {
  foreignKey: string;
  foreignKeyValue: string | string[];
}

// =====================================================
// Field Helper Types
// =====================================================

/**
 * Mapping of dbType to allowed field types
 */
export const FIELD_TYPE_BY_DB_TYPE: Record<DbType, FieldType[]> = {
  varchar: ["text", "textarea"],
  float: ["number"],
  boolean: ["boolean"],
  timestamptz: ["date"],
  manyToOne: ["select"],
  oneToMany: ["multipleSelect"],
  manyToMany: ["multipleSelect"],
  oneToOne: ["select"],
};

/**
 * Relation field names (used for clearing relation data)
 */
export const RELATION_FIELD_NAMES = [
  "relatedEntityDefinitionId",
  "relationFieldId",
  "relationFieldName",
  "relationFieldLabel",
  "relationFieldRequired",
  "relationFieldRequiredText",
] as const;

/**
 * Relation dbTypes
 */
export const RELATION_DB_TYPES: DbType[] = [
  "manyToOne",
  "oneToMany",
  "manyToMany",
  "oneToOne",
];

// =====================================================
// Form Props Types
// =====================================================

/**
 * Props for FormWithSections component
 */
export interface FormWithSectionsProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  mode: "create" | "edit";
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  cancelButtonText?: string;
}

/**
 * Props for individual input components
 */
export interface InputProps {
  field: Field;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  disabled?: boolean;
  error?: string;
}

