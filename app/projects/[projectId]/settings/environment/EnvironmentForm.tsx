/**
 * Компонент формы для создания/редактирования environment
 * Использует FormWithSectionsShadcn с фиктивными Field[] (entityDefinition больше не требуется)
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FormWithSectionsShadcn } from "@/lib/form-generation";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { withGlobalLoader } from "@/lib/global-loader/with-global-loader";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
// Импортируем конфиг напрямую из JSON файла
import environmentsConfig from "@/config/environments.json";
import {
  createEnvironmentAction,
  updateEnvironmentAction,
  deleteEnvironmentAction,
} from "./actions";

interface EnvironmentFormProps {
  projectId: string;
  mode: "create" | "edit";
  environmentId?: string;
  initialData?: {
    key: string;
    type: "string" | "number" | "boolean" | "select";
    value: string | number | boolean | null;
    options: string[];
  };
  uiConfig: EntityUIConfig;
}

export function EnvironmentForm({
  projectId,
  mode,
  environmentId,
  initialData,
  uiConfig,
}: EnvironmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Используем конфиг напрямую из импортированного JSON
  // Все данные (entityDefinition, fields, uiConfig) берутся из конфига
  const { entityDefinition, fields } =
    createEntityDefinitionAndFieldsFromConfig(
      projectId,
      environmentsConfig as unknown as EntityConfigFile
    );

  const formInitialData: Record<string, any> = initialData
    ? {
        key: initialData.key,
        type: initialData.type,
        value: initialData.value,
        options: initialData.options || [],
      }
    : {};

  const handleSubmit = async (formData: Record<string, any>) => {
    setError(null);

    await withGlobalLoader(
      (async () => {
        try {
          const data = {
            key: formData.key,
            type: formData.type,
            value: formData.value ?? null,
            options: Array.isArray(formData.options) ? formData.options : [],
          };

          let result;
          if (mode === "create") {
            result = await createEnvironmentAction(projectId, data);
          } else if (environmentId) {
            result = await updateEnvironmentAction(
              projectId,
              environmentId,
              data
            );
          } else {
            throw new Error("Environment ID is required for update");
          }

          if (!result.success) {
            const errorMessage = result.error || "Failed to save environment";

            toast({
              variant: "destructive",
              title: "Error",
              description: errorMessage,
            });
            setError(errorMessage);
            return; // Выходим, остаемся на странице
          }

          toast({
            variant: "success",
            title: "Success",
            description:
              mode === "create"
                ? uiConfig.messages.afterCreate
                : uiConfig.messages.afterUpdate,
          });

          router.push(`/projects/${projectId}/settings?tab=environments`);
          router.refresh();
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to save environment. Please try again.";

          toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
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
    if (!environmentId) {
      return;
    }

    await withGlobalLoader(
      (async () => {
        try {
          const result = await deleteEnvironmentAction(
            projectId,
            environmentId
          );

          if (!result.success) {
            const errorMessage = result.error || "Failed to delete environment";

            toast({
              variant: "destructive",
              title: "Error",
              description: errorMessage,
            });
            return; // Выходим, остаемся на странице
          }

          toast({
            variant: "success",
            title: "Success",
            description: uiConfig.messages.afterDelete,
          });

          router.push(`/projects/${projectId}/settings?tab=environments`);
          router.refresh();
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to delete environment. Please try again.";

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

  const itemName = formInitialData.key || "environment";

  return (
    <div className="space-y-6">
      {/* {uiConfig.form.pageHeader && (
          <p className="text-muted-foreground">{uiConfig.form.pageHeader}</p>
        )} */}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <FormWithSectionsShadcn
        fields={fields}
        mode={mode}
        initialData={formInitialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={mode === "edit" ? handleDelete : undefined}
        uiConfig={uiConfig}
        itemName={itemName}
      />
    </div>
  );
}
