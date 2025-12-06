/**
 * Обёртка для UniversalEntityFormNew для работы с Environment
 * Использует конфиг из JSON файла и клиентские сервисы Supabase
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import {
  createEnvironmentFromClient,
  updateEnvironmentFromClient,
  deleteEnvironmentFromClient,
} from "@/lib/environments/client-service";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { Environment } from "@/lib/environments/types";
import type { FieldValue } from "@igorchugurov/public-api-sdk";
import { useRole } from "@/hooks/use-role";

// Импортируем конфиг напрямую (статический импорт)
import environmentsConfig from "@/config/environments.json";

interface EnvironmentFormNewProps {
  projectId: string;
  mode: "create" | "edit";
  environmentId?: string;
  initialData?: {
    key: string;
    type: "string" | "number" | "boolean" | "select";
    value: string | number | boolean | null;
    options: string[];
  };
}

export function EnvironmentFormNew({
  projectId,
  mode,
  environmentId,
  initialData,
}: EnvironmentFormNewProps) {
  const { isReadOnly } = useRole(projectId);

  // Создаём entityDefinition и fields из JSON конфига
  const { entityDefinition, fields } = useMemo(
    () =>
      createEntityDefinitionAndFieldsFromConfig(
        projectId,
        environmentsConfig as unknown as EntityConfigFile
      ),
    [projectId]
  );

  // Извлекаем uiConfig из конфига (всё кроме fields)
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...rest } = environmentsConfig;
    return rest as unknown as EntityUIConfig;
  }, []);

  // Подготавливаем initialData для формы
  const formInitialData: Record<string, FieldValue> = initialData
    ? {
        key: initialData.key,
        type: initialData.type,
        value: initialData.value,
        options: initialData.options || [],
      }
    : {};

  // Функция создания - адаптер для client-service
  const handleCreate = async (
    data: Record<string, FieldValue>
  ): Promise<Environment> => {
    const createData = {
      key: typeof data.key === "string" ? data.key : String(data.key ?? ""),
      type: (typeof data.type === "string" ? data.type : "string") as
        | "string"
        | "number"
        | "boolean"
        | "select",
      value:
        typeof data.value === "string" ||
        typeof data.value === "number" ||
        typeof data.value === "boolean" ||
        data.value === null
          ? data.value
          : null,
      options: Array.isArray(data.options) ? data.options : [],
    };

    return createEnvironmentFromClient(projectId, createData);
  };

  // Функция обновления - адаптер для client-service
  const handleUpdate = async (
    id: string,
    data: Record<string, FieldValue>
  ): Promise<Environment> => {
    const updateData = {
      key: typeof data.key === "string" ? data.key : undefined,
      type:
        typeof data.type === "string"
          ? (data.type as "string" | "number" | "boolean" | "select")
          : undefined,
      value:
        typeof data.value === "string" ||
        typeof data.value === "number" ||
        typeof data.value === "boolean" ||
        data.value === null
          ? data.value
          : undefined,
      options: Array.isArray(data.options) ? data.options : undefined,
    };

    return updateEnvironmentFromClient(id, updateData);
  };

  // Функция удаления - адаптер для client-service
  const handleDelete = async (id: string): Promise<void> => {
    return deleteEnvironmentFromClient(projectId, id);
  };

  // URL для редиректа после успешной операции
  const redirectUrl = `/projects/${projectId}/settings/environments`;

  // Query key для инвалидации кэша React Query
  const queryKey = ["list", projectId, "environment"];

  return (
    <UniversalEntityFormNew
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode={mode}
      initialData={formInitialData}
      instanceId={environmentId}
      projectId={projectId}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      redirectUrl={redirectUrl}
      queryKey={queryKey}
      readOnly={isReadOnly}
    />
  );
}
