/**
 * Input Router Component for Fields (Extended version)
 * Routes to the appropriate input component based on field type
 * Supports dynamic options filtering
 */

"use client";

import { Control } from "react-hook-form";
import type {
  Field as FieldType,
  FieldOption,
} from "@/lib/universal-entity/types";
import type { FormData } from "../types";
import { InputTextShadcn } from "./inputs-shadcn/InputTextShadcn";
import { InputNumberShadcn } from "./inputs-shadcn/InputNumberShadcn";
import { InputSwitchShadcn } from "./inputs-shadcn/InputSwitchShadcn";
import { InputDateShadcn } from "./inputs-shadcn/InputDateShadcn";
import { InputSelectShadcn } from "./inputs-shadcn/InputSelectShadcn";
import { InputRelationShadcn } from "./inputs-shadcn/InputRelationShadcn";
import { InputArrayShadcn } from "./inputs-shadcn/InputArrayShadcn";
import { InputEnvironmentValue } from "./inputs-shadcn/InputEnvironmentValue";
import { InputFile } from "./inputs/InputFile";
import { isRelationField } from "../utils/fieldHelpers";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

interface GetInputForFieldForFieldsProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
  options?: FieldOption[];
  entityInstanceId?: string;
}

/**
 * Get the appropriate input component for a field
 * Extended version with support for dynamic options
 */
export function GetInputForFieldForFields({
  field,
  control,
  disabled,
  options = [],
  entityInstanceId,
}: GetInputForFieldForFieldsProps) {
  // Use provided dynamic options, fallback to field.options
  const resolvedOptions = options.length > 0 ? options : field.options ?? [];

  // Dynamic value field (кастомный тип)
  if (field.type === "dynamicValue") {
    return (
      <InputEnvironmentValue
        field={field}
        control={control}
        disabled={disabled}
        typeFieldName={field.typeFieldName || undefined}
        optionsFieldName={field.optionsFieldName || undefined}
      />
    );
  }

  // Relation fields
  if (isRelationField(field)) {
    return (
      <InputRelationShadcn
        field={field}
        control={control}
        disabled={disabled}
      />
    );
  }

  // Regular fields by type
  switch (field.type) {
    case "text":
    case "textarea":
      return (
        <InputTextShadcn field={field} control={control} disabled={disabled} />
      );

    case "number":
      return (
        <InputNumberShadcn
          field={field}
          control={control}
          disabled={disabled}
        />
      );

    case "boolean":
      return (
        <InputSwitchShadcn
          field={field}
          control={control}
          disabled={disabled}
        />
      );

    case "date":
      return (
        <InputDateShadcn field={field} control={control} disabled={disabled} />
      );

    case "select":
    case "multipleSelect":
      return (
        <InputSelectShadcn
          field={field}
          control={control}
          disabled={disabled}
          options={resolvedOptions}
        />
      );

    case "array":
      return (
        <InputArrayShadcn field={field} control={control} disabled={disabled} />
      );

    case "files":
    case "images":
      // Для файлов нужен entityInstanceId
      if (!entityInstanceId) {
        return (
          <Field>
            <FieldLabel className="text-yellow-600">
              Загрузка файлов доступна только после создания записи
            </FieldLabel>
          </Field>
        );
      }
      return (
        <InputFile
          field={field}
          control={control}
          disabled={disabled}
          entityInstanceId={entityInstanceId}
        />
      );

    default:
      return (
        <Field data-invalid={true}>
          <FieldLabel className="text-destructive">
            Unsupported field type: {field.type}
          </FieldLabel>
          <FieldError
            errors={[
              {
                message: `Field type "${field.type}" is not supported`,
              },
            ]}
          />
        </Field>
      );
  }
}
