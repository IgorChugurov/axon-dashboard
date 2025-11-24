/**
 * Select Input Component (Shadcn UI version)
 * Uses Field components from shadcn/ui
 */

"use client";

import { Controller, Control } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
  FieldGroup,
} from "@/components/ui/field";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface SelectOption {
  id: string;
  name: string;
}

interface InputSelectShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
  options: SelectOption[];
}

export function InputSelectShadcn({
  field,
  control,
  disabled,
  options,
}: InputSelectShadcnProps) {
  const isMultiple = field.type === "multipleSelect";

  // For single select
  if (!isMultiple) {
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
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </FieldLabel>

              <FieldContent>
                <Select
                  value={stringValue || ""}
                  onValueChange={formField.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
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

  // For multiple select - use checkboxes
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState }) => {
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
          <Field data-invalid={fieldState.invalid ? "true" : undefined}>
            <FieldLabel>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </FieldLabel>

            <FieldContent>
              {/* Selected values display */}
              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedValues.map((valueId) => {
                    const option = options.find((opt) => opt.id === valueId);
                    if (!option) return null;
                    return (
                      <div
                        key={valueId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                      >
                        <span>{option.name}</span>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => toggleValue(valueId)}
                            className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                            aria-label={`Remove ${option.name}`}
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Options list */}
              <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                {options.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No options available
                  </p>
                ) : (
                  <FieldGroup data-slot="checkbox-group">
                    {options.map((option) => (
                      <Field
                        key={option.id}
                        orientation="horizontal"
                        className="items-center"
                      >
                        <FieldContent>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${field.name}-${option.id}`}
                              checked={selectedValues.includes(option.id)}
                              onCheckedChange={() => toggleValue(option.id)}
                              disabled={disabled}
                            />
                            <FieldLabel
                              htmlFor={`${field.name}-${option.id}`}
                              className="text-sm cursor-pointer font-normal"
                            >
                              {option.name}
                            </FieldLabel>
                          </div>
                        </FieldContent>
                      </Field>
                    ))}
                  </FieldGroup>
                )}
              </div>

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

