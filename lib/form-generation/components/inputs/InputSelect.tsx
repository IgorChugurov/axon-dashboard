/**
 * Select Input Component
 * Using shadcn/ui Select instead of MUI
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Field } from "@igorchugurov/public-api-sdk";
import type { FormData } from "../../types";

interface SelectOption {
  id: string;
  name: string;
}

interface InputSelectProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
  options: SelectOption[];
}

export function InputSelect({
  field,
  control,
  disabled,
  options,
}: InputSelectProps) {
  const isMultiple = field.type === "multipleSelect";

  // For single select
  if (!isMultiple) {
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

              <Select
                value={stringValue || ""}
                onValueChange={formField.onChange}
                disabled={disabled}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder={field.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {!field.required && (
                    <SelectItem value="none">
                      <span className="text-muted-foreground">None</span>
                    </SelectItem>
                  )}
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

  // For multiple select - use checkboxes for simplicity
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => {
        // Normalize value to string array
        const selectedValues: string[] = Array.isArray(formField.value)
          ? formField.value.filter((v): v is string => typeof v === "string")
          : [];

        const toggleValue = (optionId: string) => {
          const newValues = selectedValues.includes(optionId)
            ? selectedValues.filter((id) => id !== optionId)
            : [...selectedValues, optionId];
          formField.onChange(newValues);
        };

        return (
          <div className="space-y-2 w-full">
            <Label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No options available
                </p>
              ) : (
                options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${field.name}-${option.id}`}
                      checked={selectedValues.includes(option.id)}
                      onChange={() => toggleValue(option.id)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Label
                      htmlFor={`${field.name}-${option.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.name}
                    </Label>
                  </div>
                ))
              )}
            </div>

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
