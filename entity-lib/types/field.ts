export interface Field {
  id: string;
  name: string;
  type:
    | "select"
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "boolean"
    | "radio"
    | "multipleSelect";
  dbType: DbType;
  relatedEntityDefinitionId?: string;
  selectorRelationId?: string;
  label: string;
  placeholder: string;
  description?: string;
  forEditPage: boolean;
  forCreatePage: boolean;
  required: boolean;
  requiredText?: string;
  forEditPageDisabled: boolean;
  displayIndex?: number;
  displayInTable?: boolean;
  sectionIndex: number; // Index of the section this field belongs to (0-3)
  entityDefinitionId: string;
  isOptionTitleField?: boolean;
  isRelationSource: boolean;
  relationFieldId?: string;
  // Relation field configuration (for primary relation fields)
  relationFieldName?: string;
  relationFieldLabel?: string;
  relationFieldRequired?: boolean;
  relationFieldRequiredText?: string;
  // Default values for different field types
  defaultStringValue?: string;
  defaultNumberValue?: number;
  defaultBooleanValue?: boolean;
  defaultDateValue?: string; // ISO date string
  // API Response Configuration - controls field visibility in different contexts
  includeInSinglePma?: boolean;
  includeInListPma?: boolean;
  includeInSingleSa?: boolean;
  includeInListSa?: boolean;
  /**
   * Auto-populate this field in API responses when applicable.
   * Defaults to false when omitted.
   */
  autoPopulate?: boolean;
  searchable?: boolean;
  // Conditional field visibility based on another field's value
  foreignKey?: string | null; // Name of the field this field depends on
  foreignKeyValue?: string | null; // Value(s) of foreignKey that make this field visible (pipe-separated: "value1|value2" or "any")
  options?: Array<{ id: string; name: string }>;
}

export enum DbType {
  VARCHAR = "varchar",
  FLOAT = "float",
  BOOLEAN = "boolean",
  TIMESTAMPTZ = "timestamptz",
  MANY_TO_ONE = "manyToOne",
  ONE_TO_MANY = "oneToMany",
  MANY_TO_MANY = "manyToMany",
  ONE_TO_ONE = "oneToOne",
}
