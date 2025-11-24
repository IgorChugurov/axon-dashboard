/**
 * Компонент формы для создания/редактирования EntityDefinition
 * Использует FormWithSectionsShadcn с конфигурацией из JSON файла
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FormWithSectionsShadcn } from "@/lib/form-generation";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { withGlobalLoader } from "@/lib/global-loader/with-global-loader";
// Импортируем конфиг напрямую из JSON файла
import entityDefinitionConfig from "@/config/entity-definition.json";
import {
  createEntityDefinitionAction,
  updateEntityDefinitionAction,
  deleteEntityDefinitionAction,
} from "@/app/projects/[projectId]/entity-definition/actions";

interface EntityDefinitionFormUniversalProps {
  projectId: string;
  mode: "create" | "edit";
  entityDefinitionId?: string;
  initialData?: EntityDefinition;
  uiConfig: EntityUIConfig;
}

/**
 * Создает EntityDefinition и Fields из конфига
 * Все данные берутся из JSON конфига, без хардкода
 */
function createEntityDefinitionFromConfig(
  projectId: string,
  config: EntityConfigFile
): {
  entityDefinition: EntityDefinition;
  fields: Field[];
} {
  // Создаем entityDefinition из конфига - все поля из JSON
  const entityDefinition: EntityDefinition = {
    id: `${config.tableName}-form`,
    name: config.entityName,
    description: config.description || null,
    tableName: config.tableName,
    type: config.type || "secondary",
    projectId: projectId,
    createPermission: config.createPermission || "Admin",
    readPermission: config.readPermission || "ALL",
    updatePermission: config.updatePermission || "Admin",
    deletePermission: config.deletePermission || "Admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Преобразуем поля из конфига - добавляем только createdAt/updatedAt
  const fields: Field[] = config.fields.map((field) => ({
    ...field,
    entityDefinitionId: entityDefinition.id,
    dbType: field.dbType as Field["dbType"],
    type: field.type as Field["type"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) as Field[];

  return { entityDefinition, fields };
}

export function EntityDefinitionFormUniversal({
  projectId,
  mode,
  entityDefinitionId,
  initialData,
  uiConfig,
}: EntityDefinitionFormUniversalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Используем конфиг напрямую из импортированного JSON
  // Все данные (entityDefinition, fields, uiConfig) берутся из конфига
  const { entityDefinition, fields } = createEntityDefinitionFromConfig(
    projectId,
    entityDefinitionConfig as unknown as EntityConfigFile
  );

  // Подготавливаем initialData для формы
  const formInitialData: Record<string, any> = initialData
    ? {
        name: initialData.name,
        description: initialData.description || "",
        tableName: initialData.tableName,
        type: initialData.type,
        createPermission: initialData.createPermission,
        readPermission: initialData.readPermission,
        updatePermission: initialData.updatePermission,
        deletePermission: initialData.deletePermission,
        titleSection0: initialData.titleSection0 || "",
        titleSection1: initialData.titleSection1 || "",
        titleSection2: initialData.titleSection2 || "",
        titleSection3: initialData.titleSection3 || "",
        enablePagination: initialData.enablePagination ?? true,
        pageSize: initialData.pageSize ?? 20,
        enableFilters: initialData.enableFilters ?? false,
        filterEntityDefinitionIds:
          initialData.filterEntityDefinitionIds?.join(",") || "",
      }
    : {};

  const handleSubmit = async (formData: Record<string, any>) => {
    setError(null);

    await withGlobalLoader(
      (async () => {
        try {
          // Преобразуем filterEntityDefinitionIds из строки в массив
          const data: any = {
            name: formData.name,
            description: formData.description || null,
            tableName: formData.tableName,
            type: formData.type,
            createPermission: formData.createPermission,
            readPermission: formData.readPermission,
            updatePermission: formData.updatePermission,
            deletePermission: formData.deletePermission,
            titleSection0: formData.titleSection0 || null,
            titleSection1: formData.titleSection1 || null,
            titleSection2: formData.titleSection2 || null,
            titleSection3: formData.titleSection3 || null,
            enablePagination: formData.enablePagination ?? true,
            pageSize: formData.pageSize ?? 20,
            enableFilters: formData.enableFilters ?? false,
            filterEntityDefinitionIds: formData.filterEntityDefinitionIds
              ? formData.filterEntityDefinitionIds
                  .split(",")
                  .map((id: string) => id.trim())
                  .filter((id: string) => id.length > 0)
              : null,
          };

          let result;
          if (mode === "create") {
            result = await createEntityDefinitionAction(projectId, data);
          } else if (entityDefinitionId) {
            result = await updateEntityDefinitionAction(
              projectId,
              entityDefinitionId,
              data
            );
          } else {
            throw new Error("Entity Definition ID is required for update");
          }

          if (!result.success) {
            const errorMessage =
              result.error || "Failed to save entity definition";

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

          router.push(`/projects/${projectId}`);
          router.refresh();
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to save entity definition. Please try again.";

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
    if (!entityDefinitionId) {
      return;
    }

    await withGlobalLoader(
      (async () => {
        try {
          const result = await deleteEntityDefinitionAction(
            projectId,
            entityDefinitionId
          );

          if (!result.success) {
            const errorMessage =
              result.error || "Failed to delete entity definition";

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

          router.push(`/projects/${projectId}`);
          router.refresh();
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to delete entity definition. Please try again.";

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

  const itemName = formInitialData.name || "entity definition";

  return (
    <div className="space-y-6">
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
