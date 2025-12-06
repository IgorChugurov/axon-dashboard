/**
 * Input Router Component
 * Routes to the appropriate input component based on field type
 */

"use client";

import { Control } from "react-hook-form";
import type { Field } from "@igorchugurov/public-api-sdk";
import type { FormData } from "../types";
import { InputText } from "./inputs/InputText";
import { InputNumber } from "./inputs/InputNumber";
import { InputSwitch } from "./inputs/InputSwitch";
import { InputDate } from "./inputs/InputDate";
import { InputSelect } from "./inputs/InputSelect";
import { InputRelation } from "./inputs/InputRelation";
import { InputFile } from "./inputs/InputFile";
import { isRelationField } from "../utils/fieldHelpers";

interface GetInputForFieldProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
  options?: Array<{ id: string; name: string }>;
  entityInstanceId?: string; // ID экземпляра (для файлов)
}

/**
 * Get the appropriate input component for a field
 */
export function GetInputForField({
  field,
  control,
  disabled,
  options = [],
  entityInstanceId,
}: GetInputForFieldProps) {
  const resolvedOptions = field.options ?? options;

  // Relation fields
  if (isRelationField(field)) {
    return (
      <InputRelation field={field} control={control} disabled={disabled} />
    );
  }

  // Regular fields by type
  switch (field.type) {
    case "text":
    case "textarea":
      return <InputText field={field} control={control} disabled={disabled} />;

    case "number":
      return (
        <InputNumber field={field} control={control} disabled={disabled} />
      );

    case "boolean":
      return (
        <InputSwitch field={field} control={control} disabled={disabled} />
      );

    case "date":
      return <InputDate field={field} control={control} disabled={disabled} />;

    case "select":
    case "multipleSelect":
      return (
        <InputSelect
          field={field}
          control={control}
          disabled={disabled}
          options={resolvedOptions}
        />
      );

    case "files":
    case "images":
      // Для файлов нужен entityInstanceId
      if (!entityInstanceId) {
        return (
          <div className="space-y-2 w-full">
            <p className="text-sm text-yellow-500">
              Загрузка файлов доступна только после создания записи
            </p>
          </div>
        );
      }
      return (
        <InputFile
          field={field}
          control={control}
          disabled={disabled}
          entityInstanceId={entityInstanceId}
        />
      );

    default:
      return (
        <div className="space-y-2 w-full">
          <p className="text-sm text-red-500">
            Unsupported field type: {field.type}
          </p>
        </div>
      );
  }
}
