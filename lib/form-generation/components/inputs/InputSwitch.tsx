/**
 * Switch (Boolean) Input Component
 * Adapted from wd-ui-components with shadcn/ui styling
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import type { Field } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputSwitchProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
}

export function InputSwitch({ field, control, disabled }: InputSwitchProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => {
        // Normalize value to boolean
        const booleanValue = typeof formField.value === "boolean" 
          ? formField.value 
          : false;
        
        return (
          <div className="space-y-2 w-full">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={field.name}
                checked={booleanValue}
                onChange={(e) => formField.onChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            <Label htmlFor={field.name} className="text-sm font-medium cursor-pointer">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>

          {field.description && (
            <p className="text-xs text-muted-foreground pl-7">
              {field.description}
            </p>
          )}

            {error && (
              <p className="text-xs text-red-500 font-medium pl-7">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

