/**
 * Relation Input Component (Shadcn UI version)
 * For selecting related entities (manyToOne, oneToMany, manyToMany, oneToOne)
 * Uses Field components from shadcn/ui
 */

"use client";

import { Controller, Control } from "react-hook-form";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
} from "@/components/ui/field";
import { RelationSelect } from "@/app/projects/[projectId]/entity-instances/[entityDefinitionId]/RelationSelect";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputRelationShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputRelationShadcn({
  field,
  control,
  disabled,
}: InputRelationShadcnProps) {
  // Extract and validate related entity ID
  const relatedEntityId = field.relatedEntityDefinitionId;

  if (!relatedEntityId) {
    return (
      <Field data-invalid={true}>
        <FieldLabel className="text-destructive">
          {field.label} - Missing Related Entity Configuration
        </FieldLabel>
        <FieldDescription>
          This relation field is not properly configured. Please set the related
          entity.
        </FieldDescription>
      </Field>
    );
  }

  const isMultiple =
    field.type === "multipleSelect" ||
    field.dbType === "manyToMany" ||
    field.dbType === "oneToMany";

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState }) => {
        // Normalize value to string array for RelationSelect
        const rawValue = formField.value;
        const valueAsArray: string[] = Array.isArray(rawValue)
          ? rawValue.filter((v): v is string => typeof v === "string")
          : typeof rawValue === "string"
          ? [rawValue]
          : [];

        const handleChange = (ids: string[]) => {
          // For single select, extract first value
          if (!isMultiple) {
            formField.onChange(ids.length > 0 ? ids[0] : null);
          } else {
            formField.onChange(ids);
          }
        };

        return (
          <Field data-invalid={fieldState.invalid ? "true" : undefined}>
            <FieldLabel>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </FieldLabel>

            <FieldContent>
              <RelationSelect
                fieldId={field.id}
                relatedEntityDefinitionId={relatedEntityId}
                value={valueAsArray}
                onChange={handleChange}
                multiple={isMultiple}
                required={field.required}
                disabled={disabled}
              />

              {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
              )}

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldContent>
          </Field>
        );
      }}
    />
  );
}
