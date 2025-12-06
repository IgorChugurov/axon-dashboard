/**
 * Обёртка для UniversalEntityFormNew для работы с Project
 * Использует конфиг из JSON файла и клиентские сервисы Supabase
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import {
  createProjectFromClient,
  updateProjectFromClient,
  deleteProjectFromClient,
} from "@/lib/projects/client-service";
import { clearCurrentProjectCookie } from "@/lib/projects/cookies";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { Project } from "@/lib/projects/types";
import type { FieldValue } from "@igorchugurov/public-api-sdk";
import { useRole } from "@/hooks/use-role";

// Импортируем конфиг напрямую (статический импорт)
import projectsConfig from "@/config/projects.json";

interface ProjectFormNewProps {
  mode: "create" | "edit";
  projectId?: string;
  initialData?: {
    name: string;
    description?: string | null;
    status?: string;
    enableSignIn?: boolean;
    enableSignUp?: boolean;
  };
}

export function ProjectFormNew({
  mode,
  projectId,
  initialData,
}: ProjectFormNewProps) {
  // Для режима редактирования проверяем права на редактирование проекта
  // Если нет прав на редактирование, форма будет в режиме readOnly
  const {
    isSuperAdmin,
    canEdit: canEditProject,
    isLoading: isCheckingProject,
  } = useRole(mode === "edit" ? projectId : undefined);

  // Определяем readOnly: true если это редактирование и нет прав на редактирование
  const readOnly = mode === "edit" && !isCheckingProject && !canEditProject;

  // Создаём entityDefinition и fields из JSON конфига
  // Используем "global" как pseudo-projectId
  const { entityDefinition, fields } = useMemo(
    () =>
      createEntityDefinitionAndFieldsFromConfig(
        "global",
        projectsConfig as unknown as EntityConfigFile
      ),
    []
  );

  // Извлекаем uiConfig из конфига (всё кроме fields)
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...rest } = projectsConfig;
    return rest as unknown as EntityUIConfig;
  }, []);

  // Подготавливаем initialData для формы
  const formInitialData: Record<string, FieldValue> = initialData
    ? {
        name: initialData.name,
        description: initialData.description || "",
        status: initialData.status || "active",
        enableSignIn: initialData.enableSignIn ?? true,
        enableSignUp: initialData.enableSignUp ?? true,
      }
    : {};

  // Функция создания - адаптер для client-service
  const handleCreate = async (
    data: Record<string, FieldValue>
  ): Promise<Project> => {
    const createData = {
      name: typeof data.name === "string" ? data.name : String(data.name ?? ""),
      description:
        typeof data.description === "string" || data.description === null
          ? data.description
          : null,
      enableSignIn:
        typeof data.enableSignIn === "boolean" ? data.enableSignIn : true,
      enableSignUp:
        typeof data.enableSignUp === "boolean" ? data.enableSignUp : true,
    };

    return createProjectFromClient(createData);
  };

  // Функция обновления - адаптер для client-service
  const handleUpdate = async (
    id: string,
    data: Record<string, FieldValue>
  ): Promise<Project> => {
    const updateData = {
      name: typeof data.name === "string" ? data.name : undefined,
      description:
        typeof data.description === "string" || data.description === null
          ? data.description
          : undefined,
      enableSignIn:
        typeof data.enableSignIn === "boolean" ? data.enableSignIn : undefined,
      enableSignUp:
        typeof data.enableSignUp === "boolean" ? data.enableSignUp : undefined,
    };

    return updateProjectFromClient(id, updateData);
  };

  // Функция удаления - адаптер для client-service
  const handleDelete = async (id: string): Promise<void> => {
    await deleteProjectFromClient(id);
    // Очищаем куку текущего проекта при удалении
    clearCurrentProjectCookie();
  };

  // URL для редиректа после успешной операции
  const redirectUrl = "/projects";

  // Query key для инвалидации кэша React Query
  const queryKey = ["list", "global", "project"];

  return (
    <UniversalEntityFormNew
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode={mode}
      initialData={formInitialData}
      instanceId={projectId}
      projectId="global"
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={mode === "edit" && isSuperAdmin ? handleDelete : undefined}
      redirectUrl={redirectUrl}
      queryKey={queryKey}
      readOnly={readOnly}
    />
  );
}
