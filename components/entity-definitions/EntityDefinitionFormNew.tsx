/**
 * Обёртка для UniversalEntityFormNew для работы с EntityDefinition
 * Использует конфиг из JSON файла и клиентские сервисы Supabase
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import {
  createEntityDefinitionFromClient,
  updateEntityDefinitionFromClient,
  deleteEntityDefinitionFromClient,
} from "@/lib/universal-entity/entity-definition-client-service";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityDefinition, FieldValue } from "@/lib/universal-entity/types";
import { useRole } from "@/hooks/use-role";

// Импортируем конфиг напрямую (статический импорт)
import entityDefinitionConfig from "@/config/entity-definition.json";

interface EntityDefinitionFormNewProps {
  projectId: string;
  mode: "create" | "edit";
  entityDefinitionId?: string;
  initialData?: {
    name: string;
    description?: string | null;
    tableName: string;
    type: "primary" | "secondary" | "tertiary";
    createPermission?: string;
    readPermission?: string;
    updatePermission?: string;
    deletePermission?: string;
    titleSection0?: string | null;
    titleSection1?: string | null;
    titleSection2?: string | null;
    titleSection3?: string | null;
    enablePagination?: boolean | null;
    pageSize?: number | null;
    enableFilters?: boolean | null;
  };
}

export function EntityDefinitionFormNew({
  projectId,
  mode,
  entityDefinitionId,
  initialData,
}: EntityDefinitionFormNewProps) {
  const { isReadOnly } = useRole(projectId);
  
  // Создаём entityDefinition и fields из JSON конфига
  const { entityDefinition, fields } = useMemo(
    () =>
      createEntityDefinitionAndFieldsFromConfig(
        projectId,
        entityDefinitionConfig as unknown as EntityConfigFile
      ),
    [projectId]
  );

  // Извлекаем uiConfig из конфига (всё кроме fields)
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...rest } = entityDefinitionConfig;
    return rest as unknown as EntityUIConfig;
  }, []);

  // Подготавливаем initialData для формы
  const formInitialData: Record<string, FieldValue> = initialData
    ? {
        name: initialData.name,
        description: initialData.description,
        tableName: initialData.tableName,
        type: initialData.type,
        createPermission: initialData.createPermission,
        readPermission: initialData.readPermission,
        updatePermission: initialData.updatePermission,
        deletePermission: initialData.deletePermission,
        titleSection0: initialData.titleSection0,
        titleSection1: initialData.titleSection1,
        titleSection2: initialData.titleSection2,
        titleSection3: initialData.titleSection3,
        enablePagination: initialData.enablePagination,
        pageSize: initialData.pageSize,
        enableFilters: initialData.enableFilters,
      }
    : {};

  // Функция создания - адаптер для client-service
  const handleCreate = async (
    data: Record<string, FieldValue>
  ): Promise<EntityDefinition> => {
    const createData = {
      name: typeof data.name === "string" ? data.name : String(data.name ?? ""),
      description: typeof data.description === "string" || data.description === null ? data.description : null,
      tableName: typeof data.tableName === "string" ? data.tableName : String(data.tableName ?? ""),
      type: (typeof data.type === "string" ? data.type : "primary") as "primary" | "secondary" | "tertiary",
      createPermission: typeof data.createPermission === "string" ? data.createPermission : undefined,
      readPermission: typeof data.readPermission === "string" ? data.readPermission : undefined,
      updatePermission: typeof data.updatePermission === "string" ? data.updatePermission : undefined,
      deletePermission: typeof data.deletePermission === "string" ? data.deletePermission : undefined,
      titleSection0: typeof data.titleSection0 === "string" || data.titleSection0 === null ? data.titleSection0 : null,
      titleSection1: typeof data.titleSection1 === "string" || data.titleSection1 === null ? data.titleSection1 : null,
      titleSection2: typeof data.titleSection2 === "string" || data.titleSection2 === null ? data.titleSection2 : null,
      titleSection3: typeof data.titleSection3 === "string" || data.titleSection3 === null ? data.titleSection3 : null,
      enablePagination: typeof data.enablePagination === "boolean" || data.enablePagination === null ? data.enablePagination : true,
      pageSize: typeof data.pageSize === "number" || data.pageSize === null ? data.pageSize : 20,
      enableFilters: typeof data.enableFilters === "boolean" || data.enableFilters === null ? data.enableFilters : false,
    };

    return createEntityDefinitionFromClient(projectId, createData);
  };

  // Функция обновления - адаптер для client-service
  const handleUpdate = async (
    id: string,
    data: Record<string, FieldValue>
  ): Promise<EntityDefinition> => {
    const updateData = {
      name: typeof data.name === "string" ? data.name : undefined,
      description: typeof data.description === "string" || data.description === null ? data.description : undefined,
      type: typeof data.type === "string" ? (data.type as "primary" | "secondary" | "tertiary") : undefined,
      createPermission: typeof data.createPermission === "string" ? data.createPermission : undefined,
      readPermission: typeof data.readPermission === "string" ? data.readPermission : undefined,
      updatePermission: typeof data.updatePermission === "string" ? data.updatePermission : undefined,
      deletePermission: typeof data.deletePermission === "string" ? data.deletePermission : undefined,
      titleSection0: typeof data.titleSection0 === "string" || data.titleSection0 === null ? data.titleSection0 : undefined,
      titleSection1: typeof data.titleSection1 === "string" || data.titleSection1 === null ? data.titleSection1 : undefined,
      titleSection2: typeof data.titleSection2 === "string" || data.titleSection2 === null ? data.titleSection2 : undefined,
      titleSection3: typeof data.titleSection3 === "string" || data.titleSection3 === null ? data.titleSection3 : undefined,
      enablePagination: typeof data.enablePagination === "boolean" || data.enablePagination === null ? data.enablePagination : undefined,
      pageSize: typeof data.pageSize === "number" || data.pageSize === null ? data.pageSize : undefined,
      enableFilters: typeof data.enableFilters === "boolean" || data.enableFilters === null ? data.enableFilters : undefined,
    };

    return updateEntityDefinitionFromClient(id, updateData);
  };

  // Функция удаления - адаптер для client-service
  const handleDelete = async (id: string): Promise<void> => {
    return deleteEntityDefinitionFromClient(projectId, id);
  };

  // URL для редиректа после успешной операции (список entity definitions на главной странице проекта)
  const redirectUrl = `/projects/${projectId}`;

  // Query key для инвалидации кэша React Query
  const queryKey = ["list", projectId, "entityDefinition"];

  return (
    <UniversalEntityFormNew
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode={mode}
      initialData={formInitialData}
      instanceId={entityDefinitionId}
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
