/**
 * Array Field Input Component (Shadcn UI version)
 * Uses useFieldArray for dynamic array fields
 * Example: array of email addresses, phone numbers, etc.
 */

"use client";

import { useFieldArray, Control, Controller, useWatch, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldContent,
} from "@/components/ui/field";
import { XIcon, PlusIcon } from "lucide-react";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputArrayShadcnProps {
  field: FieldType;
  control: Control<FormData>;
  disabled?: boolean;
  minItems?: number;
  maxItems?: number;
  itemLabel?: string; // Label for each item (e.g., "Email Address")
  addButtonText?: string; // Text for add button
}

/**
 * Component for array fields using useFieldArray
 * Supports dynamic add/remove of items
 * 
 * Example usage:
 * - Array of email addresses
 * - Array of phone numbers
 * - Array of custom objects
 */
export function InputArrayShadcn({
  field,
  control,
  disabled,
  minItems = 1,
  maxItems = 10,
  itemLabel,
  addButtonText = "Add Item",
}: InputArrayShadcnProps) {
  // Получаем setValue из FormContext (если доступен)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setValue: ((name: string, value: any, options?: { shouldValidate?: boolean }) => void) | undefined;
  try {
    const formContext = useFormContext();
    setValue = formContext.setValue;
  } catch {
    // FormContext не доступен - это нормально, setValue будет undefined
    setValue = undefined;
  }

  // Следим за значением value (для environments - если поле называется "options")
  const valueField = useWatch({
    control,
    name: "value",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { fields, append, remove } = useFieldArray({
    control: control as any,
    name: field.name,
  });

  // Ensure at least minItems
  const shouldShowRemove = fields.length > minItems;

  // Получаем текущие значения опций
  const currentOptions = useWatch({
    control,
    name: field.name,
  }) as string[] | undefined;

  // Обработчик удаления опции
  const handleRemove = (index: number) => {
    // Если это поле options в environments, проверяем, выбрана ли удаляемая опция в value
    if (field.name === "options" && valueField && Array.isArray(currentOptions) && setValue) {
      const optionToRemove = currentOptions[index];
      
      // Если удаляемая опция выбрана в value, сбрасываем value
      if (optionToRemove && String(valueField) === optionToRemove) {
        setValue("value", null, { shouldValidate: false });
      }
    }
    
    remove(index);
  };

  return (
    <FieldSet className="space-y-4">
      <FieldLegend variant="label">{field.label}</FieldLegend>
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}

      <FieldGroup className="gap-4">
        {fields.map((arrayField, index) => (
          <Controller
            key={arrayField.id}
            name={`${field.name}.${index}` as any}
            control={control}
            render={({ field: formField, fieldState }) => {
              // Normalize value to string
              const stringValue =
                typeof formField.value === "string" ? formField.value : "";

              return (
                <Field
                  orientation="horizontal"
                  data-invalid={fieldState.invalid ? "true" : undefined}
                  className="items-start"
                >
                  <FieldContent className="flex-1">
                    <Input
                      {...formField}
                      value={stringValue}
                      onChange={(e) => formField.onChange(e.target.value)}
                      id={`${field.name}-${index}`}
                      placeholder={field.placeholder || itemLabel || "Enter value"}
                      disabled={disabled}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  {shouldShowRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                      aria-label={`Remove ${itemLabel || "item"} ${index + 1}`}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </Field>
              );
            }}
          />
        ))}
      </FieldGroup>

      {fields.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append("")}
          disabled={disabled || fields.length >= maxItems}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {addButtonText}
        </Button>
      )}

      {fields.length >= maxItems && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxItems} items allowed
        </p>
      )}
    </FieldSet>
  );
}

