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
