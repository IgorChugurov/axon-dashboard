/**
 * Create Yup validation schema from fields
 */

import * as Yup from "yup";
import type { Field } from "@/lib/universal-entity/types";

/**
 * Create Yup validation schema for form fields
 * Supports conditional validation based on foreignKey
 */
export function createSchema(fields: Field[]): Yup.ObjectSchema<any> {
  const shape = fields.reduce<Record<string, Yup.AnySchema>>(
    (schema, field) => {
      let validator = getValidatorForType(field);

      // Apply required validation
      if (field.required) {
        const message = field.requiredText || "This field is required";

        // Conditional validation if field has foreignKey
        if (field.foreignKey && field.foreignKeyValue) {
          validator = applyConditionalValidation(validator, field, message);
        } else {
          // Normal required validation
          validator = applyRequiredValidation(validator, field, message);
        }
      }

      schema[field.name] = validator;
      return schema;
    },
    {}
  );

  return Yup.object().shape(shape);
}

/**
 * Get base Yup validator for a field
 */
function getValidatorForType(field: Field): Yup.AnySchema {
  switch (field.type) {
    case "number":
      return Yup.number().nullable().transform((value, originalValue) => {
        // Transform empty string to null
        return originalValue === "" ? null : value;
      });

    case "boolean":
      return Yup.boolean();

    case "date":
      return Yup.date()
        .nullable()
        .transform((value, originalValue) => {
          // Transform empty string to null
          return originalValue === "" ? null : value;
        });

    case "multipleSelect":
    case "array":
      return Yup.array().of(Yup.string());

    case "select":
      // For relation fields, allow array or string
      if (
        field.dbType === "manyToOne" ||
        field.dbType === "oneToOne" ||
        field.relatedEntityDefinitionId
      ) {
        return Yup.mixed();
      }
      return Yup.string();

    case "text":
    case "textarea":
    default:
      return Yup.string();
  }
}

/**
 * Apply required validation to a validator
 */
function applyRequiredValidation(
  validator: Yup.AnySchema,
  field: Field,
  message: string
): Yup.AnySchema {
  switch (field.type) {
    case "multipleSelect":
    case "array":
      return (validator as any).min(1, message);

    case "select":
      // For selects, reject "none" value
      return (validator as any).test(
        "not-none",
        message,
        (value: any) => {
          if (value == null) return false;
          if (Array.isArray(value)) return value.length > 0;
          return value !== "none" && value !== "";
        }
      );

    case "number":
      return (validator as Yup.NumberSchema).required(message);

    case "boolean":
      // Booleans are always valid (true/false)
      return validator;

    case "date":
      return (validator as Yup.DateSchema).required(message);

    case "text":
    case "textarea":
    default:
      return (validator as Yup.StringSchema).required(message);
  }
}

/**
 * Apply conditional validation based on foreignKey
 */
function applyConditionalValidation(
  validator: Yup.AnySchema,
  field: Field,
  message: string
): Yup.AnySchema {
  const conditions = field.foreignKeyValue?.split("|") || [];

  return validator.when(field.foreignKey!, {
    is: (value: any) => {
      const stringVal = String(value);

      // Handle "any" condition
      if (field.foreignKeyValue === "any") {
        return (
          stringVal &&
          stringVal !== "none" &&
          stringVal !== "undefined" &&
          stringVal !== "null"
        );
      }

      // Handle specific conditions
      return conditions.includes(stringVal);
    },
    then: (schema) => applyRequiredValidation(schema, field, message),
    otherwise: (schema) => schema.notRequired(),
  });
}

/**
 * Create initial form data from fields
 */
export function createInitialFormData(
  fields: Field[],
  existingData?: Record<string, any>
): Record<string, any> {
  const initialData: Record<string, any> = {};

  fields.forEach((field) => {
    // Use existing data if available
    if (existingData && existingData[field.name] !== undefined) {
      initialData[field.name] = existingData[field.name];
      return;
    }

    // Otherwise use default value
    if (field.defaultStringValue != null) {
      initialData[field.name] = field.defaultStringValue;
    } else if (field.defaultNumberValue != null) {
      initialData[field.name] = field.defaultNumberValue;
    } else if (field.defaultBooleanValue != null) {
      initialData[field.name] = field.defaultBooleanValue;
    } else if (field.defaultDateValue != null) {
      initialData[field.name] = field.defaultDateValue;
    } else {
      // Type-based defaults
      switch (field.type) {
        case "number":
          initialData[field.name] = 0;
          break;
        case "boolean":
          initialData[field.name] = false;
          break;
        case "date":
          initialData[field.name] = null;
          break;
        case "multipleSelect":
        case "array":
          initialData[field.name] = [];
          break;
        case "select":
          initialData[field.name] = null;
          break;
        default:
          initialData[field.name] = "";
      }
    }
  });

  return initialData;
}

