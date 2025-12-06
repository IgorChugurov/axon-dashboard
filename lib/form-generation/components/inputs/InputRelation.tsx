/**
 * Relation Input Component
 * For selecting related entities (manyToOne, oneToMany, manyToMany, oneToOne)
 * Wraps the existing RelationSelect component
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RelationSelect } from "@/app/projects/[projectId]/[entityDefId]/RelationSelect";
import type { Field } from "@igorchugurov/public-api-sdk";
import type { FormData } from "../../types";

interface InputRelationProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputRelation({
  field,
  control,
  disabled,
}: InputRelationProps) {
  // Extract and validate related entity ID
  const relatedEntityId = field.relatedEntityDefinitionId;

  if (!relatedEntityId) {
    return (
      <div className="space-y-2 w-full">
        <Label className="text-sm font-medium text-red-500">
          {field.label} - Missing Related Entity Configuration
        </Label>
        <p className="text-xs text-muted-foreground">
          This relation field is not properly configured. Please set the related
          entity.
        </p>
      </div>
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
      render={({ field: formField, fieldState: { error } }) => {
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
          <div className="space-y-2 w-full">
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
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 font-medium">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
