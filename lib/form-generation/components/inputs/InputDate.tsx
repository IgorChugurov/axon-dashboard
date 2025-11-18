/**
 * Date Input Component
 * Adapted from wd-ui-components with shadcn/ui styling
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Field } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputDateProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputDate({ field, control, disabled }: InputDateProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => (
        <div className="space-y-2 w-full">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>

          <Input
            {...formField}
            id={field.name}
            type="datetime-local"
            placeholder={field.placeholder || ""}
            disabled={disabled}
            value={
              formField.value
                ? typeof formField.value === "string"
                  ? formField.value.slice(0, 16) // Format for datetime-local
                  : ""
                : ""
            }
          />

          {field.description && (
            <p className="text-xs text-muted-foreground">
              {field.description}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 font-medium">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}

