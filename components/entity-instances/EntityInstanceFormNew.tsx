/**
 * Обёртка для UniversalEntityFormNew для работы с Entity Instances
 * Использует динамическую конфигурацию из EntityDefinition + Fields
 * Поддерживает JSONB данные и relations
 */

"use client";

import { useMemo, useCallback } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import { useSDK } from "@/components/providers/SDKProvider";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type {
  EntityDefinition,
  Field,
  EntityInstanceWithFields,
  FieldValue,
} from "@igorchugurov/public-api-sdk";

interface EntityInstanceFormNewProps {
  projectId: string;
  entityDefinition: EntityDefinition;
  fields: Field[];
  uiConfig: EntityUIConfig;
  mode: "create" | "edit";
  instanceId?: string;
  initialData?: Record<string, FieldValue>;
}

export function EntityInstanceFormNew({
  projectId,
  entityDefinition,
  fields,
  uiConfig,
  mode,
  instanceId,
  initialData = {},
}: EntityInstanceFormNewProps) {
  // Получаем SDK из провайдера (должен быть обернут в SDKProvider)
  const { sdk } = useSDK();

  // Определяем поля связей
  const relationFieldNames = useMemo(() => {
    return fields
      .filter(
        (f) =>
          f.dbType === "manyToMany" ||
          f.dbType === "manyToOne" ||
          f.dbType === "oneToMany" ||
          f.dbType === "oneToOne"
      )
      .map((f) => f.name);
  }, [fields]);

  // Функция для разделения данных формы на data и relations
  const separateDataAndRelations = useCallback(
    (formData: Record<string, FieldValue>) => {
      const relations: Record<string, string[]> = {};
      const data: Record<string, FieldValue> = {};

      for (const [key, value] of Object.entries(formData)) {
        if (relationFieldNames.includes(key)) {
          // Поле связи - преобразуем в массив ID
          if (Array.isArray(value)) {
            relations[key] = value.map((v) => String(v ?? "")).filter(Boolean);
          } else if (value) {
            relations[key] = [String(value)];
          } else {
            relations[key] = [];
          }
        } else {
          // Обычное поле для JSONB
          data[key] = value;
        }
      }

      return { data, relations };
    },
    [relationFieldNames]
  );

  // Функция создания - использует SDK
  const handleCreate = useCallback(
    async (
      formData: Record<string, FieldValue>
    ): Promise<EntityInstanceWithFields> => {
      const { data, relations } = separateDataAndRelations(formData);

      return sdk.createInstance(entityDefinition.id, {
        data,
        ...(Object.keys(relations).length > 0 ? { relations } : {}),
      });
    },
    [entityDefinition.id, sdk, separateDataAndRelations]
  );

  // Функция обновления - использует SDK
  const handleUpdate = useCallback(
    async (
      id: string,
      formData: Record<string, FieldValue>
    ): Promise<EntityInstanceWithFields> => {
      const { data, relations } = separateDataAndRelations(formData);

      return sdk.updateInstance(entityDefinition.id, id, {
        data,
        ...(Object.keys(relations).length > 0 ? { relations } : {}),
      });
    },
    [entityDefinition.id, sdk, separateDataAndRelations]
  );

  // Функция удаления - использует SDK
  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      return sdk.deleteInstance(entityDefinition.id, id);
    },
    [entityDefinition.id, sdk]
  );

  // URL для редиректа после успешной операции
  const redirectUrl = `/projects/${projectId}/${entityDefinition.id}`;

  // Query key для инвалидации кэша React Query
  // Используем prefix ["list", projectId, "entity-instance"] - это инвалидирует все запросы списка
  const queryKey = useMemo(
    () => ["list", projectId, "entity-instance"],
    [projectId]
  );

  return (
    <UniversalEntityFormNew
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode={mode}
      initialData={initialData}
      instanceId={instanceId}
      projectId={projectId}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      redirectUrl={redirectUrl}
      queryKey={queryKey}
    />
  );
}
