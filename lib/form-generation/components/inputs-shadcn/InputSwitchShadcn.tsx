/**
 * Switch (Boolean) Input Component (Shadcn UI version)
 * Uses Field components from shadcn/ui
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
} from "@/components/ui/field";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputSwitchShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputSwitchShadcn({
  field,
  control,
  disabled,
}: InputSwitchShadcnProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState }) => {
        // Normalize value to boolean
        const booleanValue =
          typeof formField.value === "boolean" ? formField.value : false;

        return (
          <Field
            data-invalid={fieldState.invalid ? "true" : undefined}
            orientation="horizontal"
          >
            <FieldContent>
              <div className="flex items-center space-x-3">
                <Switch
                  id={field.name}
                  checked={booleanValue}
                  onCheckedChange={formField.onChange}
                  disabled={disabled}
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel htmlFor={field.name} className="cursor-pointer">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FieldLabel>
              </div>

              {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
              )}

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </FieldContent>
          </Field>
        );
      }}
    />
  );
}

