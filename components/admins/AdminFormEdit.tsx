/**
 * Обёртка для UniversalEntityFormNew для редактирования Admin
 * Использует конфиг из JSON файла и клиентские сервисы Supabase
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import { updateAdminFromClient } from "@/lib/admins/client-service";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { Field, FieldOption } from "@/lib/universal-entity/types";
import type { Admin } from "@/lib/admins/types";

// Импортируем конфиг напрямую (статический импорт)
import adminsConfig from "@/config/admins.json";

interface AdminFormEditProps {
  projectId: string;
  adminId: string;
  initialData: {
    email: string | null;
    roleName: string;
  };
  roleOptions?: FieldOption[]; // Динамические опции ролей (без superAdmin)
}

export function AdminFormEdit({
  projectId,
  adminId,
  initialData,
  roleOptions,
}: AdminFormEditProps) {
  // Создаём entityDefinition и fields из JSON конфига
  const { entityDefinition, fields: baseFields } = useMemo(
    () =>
      createEntityDefinitionAndFieldsFromConfig(
        projectId,
        adminsConfig as unknown as EntityConfigFile
      ),
    [projectId]
  );

  // Обновляем опции для поля roleName, если переданы динамические опции
  const fields = useMemo(() => {
    if (!roleOptions || roleOptions.length === 0) {
      return baseFields;
    }

    return baseFields.map((field) => {
      if (field.name === "roleName") {
        return {
          ...field,
          options: roleOptions,
        };
      }
      return field;
    });
  }, [baseFields, roleOptions]);

  // Извлекаем uiConfig из конфига (всё кроме fields)
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...rest } = adminsConfig;
    return rest as unknown as EntityUIConfig;
  }, []);

  // Подготавливаем initialData для формы
  const formInitialData: Record<string, any> = {
    email: initialData.email || "",
    roleName: initialData.roleName,
  };

  // Функция обновления - адаптер для client-service
  const handleUpdate = async (
    id: string,
    data: Record<string, any>
  ): Promise<Admin> => {
    const roleName = data.roleName as
      | "superAdmin"
      | "projectSuperAdmin"
      | "projectAdmin";

    if (!roleName) {
      throw new Error("Role name is required");
    }

    return updateAdminFromClient(id, roleName);
  };

  // URL для редиректа после успешной операции
  const redirectUrl = `/projects/${projectId}/admins`;

  // Query key для инвалидации кэша React Query
  const queryKey = ["list", projectId, "admin"];

  return (
    <UniversalEntityFormNew
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode="edit"
      initialData={formInitialData}
      instanceId={adminId}
      projectId={projectId}
      onUpdate={handleUpdate}
      redirectUrl={redirectUrl}
      queryKey={queryKey}
    />
  );
}

