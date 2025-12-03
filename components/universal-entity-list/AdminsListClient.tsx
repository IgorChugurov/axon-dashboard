/**
 * Client Component обертка для списка Admins
 * Использует фабрику сервисов для создания onLoadData и onDelete
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createAdminListService } from "@/lib/universal-entity/list-service-factory";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { RoutingConfig } from "./types/list-types";
import type { Admin } from "@/lib/admins/types";

interface AdminsListClientProps {
  projectId: string;
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function AdminsListClient({
  projectId,
  config,
  routing,
}: AdminsListClientProps) {
  // Создаем сервис через фабрику с projectId для фильтрации админов проекта
  const listService = useMemo(() => createAdminListService(projectId), [projectId]);

  return (
    <UniversalEntityListClient<Admin>
      projectId={projectId}
      serviceType="admin"
      config={config}
      routing={routing}
      onLoadData={listService.onLoadData}
      onDelete={listService.onDelete}
    />
  );
}

