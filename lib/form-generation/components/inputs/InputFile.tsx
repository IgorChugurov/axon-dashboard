/**
 * File Upload Input Component
 * Поддерживает типы files и images
 */

"use client";

import { Controller, Control } from "react-hook-form";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import type { Field } from "@/lib/universal-entity/types";
import type { FormData } from "../../types";

interface InputFileProps {
  field: Field;
  control: Control<FormData>;
  disabled?: boolean;
  entityInstanceId: string;
}

export function InputFile({
  field,
  control,
  disabled,
  entityInstanceId,
}: InputFileProps) {
  // Определяем displayMode на основе типа поля
  const displayMode = field.type === "images" ? "images" : "files";

  // Получаем лимиты из поля или используем значения по умолчанию
  const maxSize = field.maxFileSize || undefined; // в байтах
  const maxFiles = field.maxFiles || undefined;
  const accept = field.acceptFileTypes || undefined;
  const bucket = field.storageBucket || undefined;

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => {
        // Нормализуем значение к массиву строк (ID файлов)
        const fileIds =
          Array.isArray(formField.value) && formField.value.every((v) => typeof v === "string")
            ? formField.value
            : [];

        return (
          <div className="space-y-2 w-full">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}

            <FileUpload
              value={fileIds}
              onChange={(newFileIds) => {
                formField.onChange(newFileIds);
                formField.onBlur();
              }}
              entityInstanceId={entityInstanceId}
              fieldId={field.id}
              displayMode={displayMode}
              accept={accept}
              maxSize={maxSize}
              maxFiles={maxFiles}
              bucket={bucket}
              folder={`${field.entityDefinitionId}/${field.name}`}
              disabled={disabled}
            />

            {error && (
              <p className="text-sm text-red-500">
                {error.message || field.requiredText || "Это поле обязательно"}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

