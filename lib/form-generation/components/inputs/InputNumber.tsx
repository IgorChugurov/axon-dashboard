/**
 * Number Input Component
 * Adapted from wd-ui-components with shadcn/ui styling
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Field } from "@igorchugurov/public-api-sdk";
import type { FormData } from "../../types";

interface InputNumberProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputNumber({ field, control, disabled }: InputNumberProps) {
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
            id={field.name}
            type="number"
            step="any"
            placeholder={field.placeholder || ""}
            disabled={disabled}
            onChange={(e) => {
              const value = e.target.value;
              formField.onChange(value === "" ? 0 : parseFloat(value));
            }}
            value={typeof formField.value === "number" ? formField.value : ""}
            onBlur={formField.onBlur}
            name={formField.name}
          />

          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}

          {error && (
            <p className="text-xs text-red-500 font-medium">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}
