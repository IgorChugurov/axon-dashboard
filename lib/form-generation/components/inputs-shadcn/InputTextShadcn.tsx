/**
 * Text and Textarea Input Component (Shadcn UI version)
 * Uses Field components from shadcn/ui
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
} from "@/components/ui/field";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputTextShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputTextShadcn({
  field,
  control,
  disabled,
}: InputTextShadcnProps) {
  const isTextarea = field.type === "textarea";

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState }) => {
        // Normalize value to string
        const stringValue =
          typeof formField.value === "string" ? formField.value : "";

        return (
          <Field data-invalid={fieldState.invalid ? "true" : undefined}>
            <FieldLabel htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FieldLabel>

            <FieldContent>
              {isTextarea ? (
                <Textarea
                  {...formField}
                  id={field.name}
                  placeholder={field.placeholder || ""}
                  disabled={disabled}
                  value={stringValue}
                  aria-invalid={fieldState.invalid}
                  rows={6}
                  className="min-h-24 resize-none"
                />
              ) : (
                <Input
                  {...formField}
                  id={field.name}
                  type="text"
                  placeholder={field.placeholder || ""}
                  disabled={disabled}
                  value={stringValue}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
              )}

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

