/**
 * Text and Textarea Input Component
 * Adapted from wd-ui-components with shadcn/ui styling
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Field } from "@igorchugurov/public-api-sdk";
import type { FormData } from "../../types";

interface InputTextProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputText({ field, control, disabled }: InputTextProps) {
  const isTextarea = field.type === "textarea";

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => {
        // Normalize value to string
        const stringValue =
          typeof formField.value === "string" ? formField.value : "";

        return (
          <div className="space-y-2 w-full">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {isTextarea ? (
              <textarea
                id={field.name}
                placeholder={field.placeholder || ""}
                disabled={disabled}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={stringValue}
                onChange={formField.onChange}
                onBlur={formField.onBlur}
                name={formField.name}
              />
            ) : (
              <Input
                id={field.name}
                type="text"
                placeholder={field.placeholder || ""}
                disabled={disabled}
                value={stringValue}
                onChange={formField.onChange}
                onBlur={formField.onBlur}
                name={formField.name}
              />
            )}

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
