/**
 * Environment Value Input Component (Shadcn UI version)
 * Динамически рендерит нужный input в зависимости от типа environment
 * Используется для поля "value" в environments
 */

"use client";

import { useWatch, Control, useFormContext } from "react-hook-form";
import { useEffect, useRef } from "react";
import { InputTextShadcn } from "./InputTextShadcn";
import { InputNumberShadcn } from "./InputNumberShadcn";
import { InputSwitchShadcn } from "./InputSwitchShadcn";
import { InputSelectShadcn } from "./InputSelectShadcn";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputEnvironmentValueProps {
  field: FieldType; // Поле "value"
  control: Control<FormData>;
  disabled?: boolean;
  typeFieldName?: string; // Имя поля "type" (по умолчанию "type")
  optionsFieldName?: string; // Имя поля "options" (по умолчанию "options")
}

/**
 * Компонент для динамического поля value в environments
 * Следит за полем type и рендерит соответствующий input
 */
export function InputEnvironmentValue({
  field,
  control,
  disabled,
  typeFieldName = "type",
  optionsFieldName = "options",
}: InputEnvironmentValueProps) {
  const { setValue } = useFormContext();
  const previousTypeRef = useRef<string | undefined>(undefined);

  // Следим за значением поля type
  const typeValue = useWatch({
    control,
    name: typeFieldName,
  }) as string | undefined;

  // Следим за значением поля value
  const currentValue = useWatch({
    control,
    name: field.name,
  });

  // Следим за значением поля options (для select типа)
  const optionsValue = useWatch({
    control,
    name: optionsFieldName,
  }) as string[] | undefined;

  // Сбрасываем value при изменении type, если значение не соответствует новому типу
  useEffect(() => {
    if (
      previousTypeRef.current !== undefined &&
      previousTypeRef.current !== typeValue
    ) {
      // Тип изменился - проверяем, соответствует ли текущее значение новому типу
      if (currentValue !== null && currentValue !== undefined) {
        let shouldReset = false;

        switch (typeValue) {
          case "string":
            if (typeof currentValue !== "string") shouldReset = true;
            break;
          case "number":
            if (typeof currentValue !== "number") shouldReset = true;
            break;
          case "boolean":
            if (typeof currentValue !== "boolean") shouldReset = true;
            break;
          case "select":
            // Для select проверяем, есть ли значение в options
            if (
              !Array.isArray(optionsValue) ||
              !optionsValue.includes(String(currentValue))
            ) {
              shouldReset = true;
            }
            break;
        }

        if (shouldReset) {
          setValue(field.name, null);
        }
      }
    }

    previousTypeRef.current = typeValue;
  }, [typeValue, currentValue, optionsValue, setValue, field.name]);

  // Преобразуем options в формат для InputSelectShadcn
  // Используем сами значения строк как id, чтобы правильно работать с value
  const selectOptions =
    typeValue === "select" && Array.isArray(optionsValue)
      ? optionsValue
          .filter((opt) => opt && typeof opt === "string" && opt.trim() !== "")
          .map((opt) => ({
            id: opt, // Используем саму строку как id
            name: opt,
          }))
      : [];

  // Рендерим нужный input в зависимости от типа
  switch (typeValue) {
    case "string":
      return (
        <InputTextShadcn field={field} control={control} disabled={disabled} />
      );

    case "number":
      return (
        <InputNumberShadcn
          field={field}
          control={control}
          disabled={disabled}
        />
      );

    case "boolean":
      return (
        <InputSwitchShadcn
          field={field}
          control={control}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <InputSelectShadcn
          field={field}
          control={control}
          disabled={disabled}
          options={selectOptions}
        />
      );

    default:
      // Если тип еще не выбран, показываем placeholder
      return (
        <Field data-invalid={false}>
          <FieldLabel htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FieldLabel>
          <div className="text-sm text-muted-foreground">
            Please select a type first
          </div>
        </Field>
      );
  }
}
