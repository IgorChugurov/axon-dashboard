/**
 * Date Input Component (Shadcn UI version)
 * Uses Field components from shadcn/ui
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
} from "@/components/ui/field";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputDateShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputDateShadcn({
  field,
  control,
  disabled,
}: InputDateShadcnProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState }) => {
        // Format date for datetime-local input
        const formatDateForInput = (value: any): string => {
          if (!value) return "";
          if (typeof value === "string") {
            // If it's already a string, try to format it
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString().slice(0, 16);
            }
            return value.slice(0, 16);
          }
          if (value instanceof Date) {
            return value.toISOString().slice(0, 16);
          }
          return "";
        };

        return (
          <Field data-invalid={fieldState.invalid ? "true" : undefined}>
            <FieldLabel htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FieldLabel>

            <FieldContent>
              <Input
                {...formField}
                id={field.name}
                type="datetime-local"
                placeholder={field.placeholder || ""}
                disabled={disabled}
                value={formatDateForInput(formField.value)}
                onChange={(e) => {
                  const value = e.target.value;
                  formField.onChange(value ? new Date(value).toISOString() : null);
                }}
                aria-invalid={fieldState.invalid}
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

