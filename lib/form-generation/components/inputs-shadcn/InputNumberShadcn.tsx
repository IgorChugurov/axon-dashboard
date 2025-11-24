/**
 * Number Input Component (Shadcn UI version)
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

interface InputNumberShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputNumberShadcn({
  field,
  control,
  disabled,
}: InputNumberShadcnProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? "true" : undefined}>
          <FieldLabel htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FieldLabel>

          <FieldContent>
            <Input
              id={field.name}
              type="number"
              step="any"
              placeholder={field.placeholder || ""}
              disabled={disabled}
              value={typeof formField.value === "number" ? formField.value : ""}
              onChange={(e) => {
                const value = e.target.value;
                formField.onChange(value === "" ? 0 : parseFloat(value));
              }}
              onBlur={formField.onBlur}
              name={formField.name}
              aria-invalid={fieldState.invalid}
            />

            {field.description && (
              <FieldDescription>{field.description}</FieldDescription>
            )}

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </FieldContent>
        </Field>
      )}
    />
  );
}

