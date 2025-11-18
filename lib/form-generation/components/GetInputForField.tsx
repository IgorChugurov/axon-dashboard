/**
 * Input Router Component
 * Routes to the appropriate input component based on field type
 */

"use client";

import { Control } from "react-hook-form";
import type { Field } from "@/lib/universal-entity/types";
import type { FormData } from "../types";
import { InputText } from "./inputs/InputText";
import { InputNumber } from "./inputs/InputNumber";
import { InputSwitch } from "./inputs/InputSwitch";
import { InputDate } from "./inputs/InputDate";
import { InputSelect } from "./inputs/InputSelect";
import { InputRelation } from "./inputs/InputRelation";
import { isRelationField } from "../utils/fieldHelpers";

interface GetInputForFieldProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
  options?: Array<{ id: string; name: string }>;
}

/**
 * Get the appropriate input component for a field
 */
export function GetInputForField({
  field,
  control,
  disabled,
  options = [],
}: GetInputForFieldProps) {
  // Relation fields
  if (isRelationField(field)) {
    return <InputRelation field={field} control={control} disabled={disabled} />;
  }

  // Regular fields by type
  switch (field.type) {
    case "text":
    case "textarea":
      return <InputText field={field} control={control} disabled={disabled} />;

    case "number":
      return <InputNumber field={field} control={control} disabled={disabled} />;

    case "boolean":
      return <InputSwitch field={field} control={control} disabled={disabled} />;

    case "date":
      return <InputDate field={field} control={control} disabled={disabled} />;

    case "select":
    case "multipleSelect":
      return (
        <InputSelect
          field={field}
          control={control}
          disabled={disabled}
          options={options}
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

