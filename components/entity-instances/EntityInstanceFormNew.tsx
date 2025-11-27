/**
 * Обёртка для UniversalEntityFormNew для работы с Entity Instances
 * Использует динамическую конфигурацию из EntityDefinition + Fields
 * Поддерживает JSONB данные и relations
 */

"use client";

import { useMemo, useCallback } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import {
  createEntityInstanceFromClient,
  updateEntityInstanceFromClient,
  deleteEntityInstanceFromClient,
} from "@/lib/universal-entity/instance-client-service";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type {
  EntityDefinition,
  Field,
  EntityInstanceWithFields,
} from "@/lib/universal-entity/types";

interface EntityInstanceFormNewProps {
  projectId: string;
  entityDefinition: EntityDefinition;
  fields: Field[];
  uiConfig: EntityUIConfig;
  mode: "create" | "edit";
  instanceId?: string;
  initialData?: Record<string, any>;
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
    (formData: Record<string, any>) => {
      const relations: Record<string, string[]> = {};
      const data: Record<string, any> = {};

      for (const [key, value] of Object.entries(formData)) {
        if (relationFieldNames.includes(key)) {
          // Поле связи - преобразуем в массив ID
          relations[key] = Array.isArray(value) ? value : value ? [value] : [];
        } else {
          // Обычное поле для JSONB
          data[key] = value;
        }
      }

      return { data, relations };
    },
    [relationFieldNames]
  );

  // Функция создания - адаптер для client-service
  const handleCreate = useCallback(
    async (
      formData: Record<string, any>
    ): Promise<EntityInstanceWithFields> => {
      const { data, relations } = separateDataAndRelations(formData);

      return createEntityInstanceFromClient(
        entityDefinition.id,
        projectId,
        data,
        Object.keys(relations).length > 0 ? relations : undefined
      );
    },
    [entityDefinition.id, projectId, separateDataAndRelations]
  );

  // Функция обновления - адаптер для client-service
  const handleUpdate = useCallback(
    async (
      id: string,
      formData: Record<string, any>
    ): Promise<EntityInstanceWithFields> => {
      const { data, relations } = separateDataAndRelations(formData);

      return updateEntityInstanceFromClient(
        id,
        data,
        Object.keys(relations).length > 0 ? relations : undefined
      );
    },
    [separateDataAndRelations]
  );

  // Функция удаления - адаптер для client-service
  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      return deleteEntityInstanceFromClient(projectId, id);
    },
    [projectId]
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
