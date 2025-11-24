/**
 * Form Generation Library
 * Public API exports
 */

// Types
export type {
  FormSection,
  FormStructure,
  FormData,
  FieldValue,
  FormWithSectionsProps,
  InputProps,
} from "./types";

export {
  FIELD_TYPE_BY_DB_TYPE,
  RELATION_FIELD_NAMES,
  RELATION_DB_TYPES,
} from "./types";

// Utilities
export {
  isRelationDbType,
  isRelationType,
  isRelationField,
  getDefaultValueForField,
  getDefaultValueForFieldType,
  getDefaultValueForRelationField,
  areValuesEqual,
  isFieldVisible,
  getVisibleFields,
  getSectionTitle,
  validateFieldValue,
} from "./utils/fieldHelpers";

export { createSchema, createInitialFormData } from "./utils/createSchema";

export { getItemForEdit, cleanFormDataForSubmit } from "./utils/getItemForEdit";

export {
  createFormStructure,
  filterVisibleSections,
  getValidatableFields,
} from "./utils/createFormStructure";

// Components
export { FormWithSections } from "./components/FormWithSections";
export { FormWithSectionsShadcn } from "./components/FormWithSectionsShadcn";
export { GetInputForField } from "./components/GetInputForField";
export { GetInputForFieldShadcn } from "./components/GetInputForFieldShadcn";

// Individual Input Components
export { InputText } from "./components/inputs/InputText";
export { InputNumber } from "./components/inputs/InputNumber";
export { InputSwitch } from "./components/inputs/InputSwitch";
export { InputDate } from "./components/inputs/InputDate";
export { InputSelect } from "./components/inputs/InputSelect";
export { InputRelation } from "./components/inputs/InputRelation";

// Shadcn Input Components
export { InputArrayShadcn } from "./components/inputs-shadcn/InputArrayShadcn";
