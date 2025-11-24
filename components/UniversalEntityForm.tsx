/**
 * Универсальный компонент для отображения формы создания/редактирования любой сущности
 *
 * Использует EntityUIConfig для автоматической настройки UI:
 * - Заголовки страниц из uiConfig.form
 * - Тексты кнопок из uiConfig.form
 * - Сообщения об успехе/ошибке из uiConfig.messages
 * - Toast уведомления
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import { FormWithSectionsShadcn } from "@/lib/form-generation";
import { useToast } from "@/hooks/use-toast";
import {
  createEntityInstance,
  updateEntityInstance,
  deleteEntityInstance,
} from "@/app/projects/[projectId]/entity-instances/[entityDefinitionId]/actions";
import { withGlobalLoader } from "@/lib/global-loader/with-global-loader";

interface UniversalEntityFormProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  uiConfig: EntityUIConfig;
  mode: "create" | "edit";
  initialData?: Record<string, any>;
  instanceId?: string;
  projectId: string;
}

export function UniversalEntityForm({
  entityDefinition,
  fields,
  uiConfig,
  mode,
  initialData = {},
  instanceId,
  projectId,
}: UniversalEntityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const { messages } = uiConfig;

  const handleSubmit = async (formData: Record<string, any>) => {
    setError(null);

    await withGlobalLoader(
      (async () => {
        try {
          // Разделяем данные и связи
          const relations: Record<string, string[]> = {};
          const data: Record<string, any> = {};

          for (const [key, value] of Object.entries(formData)) {
            const field = fields.find((f) => f.name === key);
            if (
              field &&
              (field.dbType === "manyToMany" ||
                field.dbType === "manyToOne" ||
                field.dbType === "oneToMany" ||
                field.dbType === "oneToOne")
            ) {
              // Поле связи
              relations[key] = Array.isArray(value)
                ? value
                : value
                ? [value]
                : [];
            } else {
              // Обычное поле
              data[key] = value;
            }
          }

          let result;
          if (mode === "create") {
            result = await createEntityInstance(
              projectId,
              entityDefinition.id,
              data,
              Object.keys(relations).length > 0 ? relations : undefined
            );
          } else if (instanceId) {
            result = await updateEntityInstance(
              projectId,
              entityDefinition.id,
              instanceId,
              data,
              Object.keys(relations).length > 0 ? relations : undefined
            );
          } else {
            throw new Error("Instance ID is required for update");
          }

          if (!result.success) {
            // Показываем ошибку через toast
            const errorMessage =
              (mode === "create"
                ? messages.errorCreate
                : messages.errorUpdate) ||
              result.error ||
              "Failed to save. Please try again.";

            toast({
              variant: "destructive",
              title: "Error",
              description: errorMessage,
            });

            setError(result.error || errorMessage);
            return; // Выходим, остаемся на странице
          }

          // Успех - показываем toast и перенаправляем
          const successMessage =
            mode === "create" ? messages.afterCreate : messages.afterUpdate;

          toast({
            variant: "success",
            title: "Success",
            description: successMessage,
          });

          router.push(
            `/projects/${projectId}/entity-instances/${entityDefinition.id}`
          );
          router.refresh();
        } catch (err) {
          // Обработка неожиданных ошибок
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to save. Please try again.";

          const errorText =
            (mode === "create" ? messages.errorCreate : messages.errorUpdate) ||
            errorMessage;

          toast({
            variant: "destructive",
            title: "Error",
            description: errorText,
          });

          setError(errorMessage);
          // НЕ делаем throw, чтобы избежать дублирования ошибок
        }
      })()
    );
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDelete = async () => {
    if (!instanceId) {
      return;
    }

    await withGlobalLoader(
      (async () => {
        try {
          const result = await deleteEntityInstance(
            projectId,
            entityDefinition.id,
            instanceId
          );

          if (!result.success) {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to delete item",
            });
            return; // Выходим, остаемся на странице
          }

          // Success - show toast and redirect
          toast({
            variant: "success",
            title: "Success",
            description: messages.afterDelete,
          });

          router.push(
            `/projects/${projectId}/entity-instances/${entityDefinition.id}`
          );
          router.refresh();
        } catch (err) {
          // Обработка неожиданных ошибок
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to delete. Please try again.";

          toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
          });
          // НЕ делаем throw, чтобы избежать дублирования ошибок
        }
      })()
    );
  };

  // Get item name for delete confirmation (try to find a name field)
  const itemName =
    initialData?.name || initialData?.title || entityDefinition.name;

  return (
    <div className="space-y-6">
      {/* Описание (если есть) */}
      {/* {entityDefinition.description && (
        <p className="text-muted-foreground">{entityDefinition.description}</p>
      )}
      {uiConfig.form.pageHeader && (
        <p className="text-muted-foreground">{uiConfig.form.pageHeader}</p>
      )} */}

      {/* Inline ошибка (дополнительно к toast) */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Форма */}
      <FormWithSectionsShadcn
        fields={fields}
        mode={mode}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={mode === "edit" ? handleDelete : undefined}
        uiConfig={uiConfig}
        itemName={itemName}
      />
    </div>
  );
}
