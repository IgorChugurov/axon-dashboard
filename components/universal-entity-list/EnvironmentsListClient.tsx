/**
 * Client Component обертка для списка Environments
 * Использует фабрику сервисов для создания onLoadData и onDelete
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createEnvironmentListService } from "@/lib/universal-entity/list-service-factory";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { RoutingConfig } from "./types/list-types";
import type { Environment } from "@/lib/environments/types";

interface EnvironmentsListClientProps {
  projectId: string;
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function EnvironmentsListClient({
  projectId,
  config,
  routing,
}: EnvironmentsListClientProps) {
  // Создаем сервис через фабрику
  const listService = useMemo(
    () => createEnvironmentListService(projectId),
    [projectId]
  );

  return (
    <UniversalEntityListClient<Environment>
      projectId={projectId}
      serviceType="environment"
      config={config}
      routing={routing}
      onLoadData={listService.onLoadData}
      onDelete={listService.onDelete}
    />
  );
}

