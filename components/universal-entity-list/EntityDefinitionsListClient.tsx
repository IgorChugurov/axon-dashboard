/**
 * Client Component обертка для списка Entity Definitions
 * Использует фабрику сервисов для создания onLoadData и onDelete
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createEntityDefinitionListService } from "@/lib/universal-entity/list-service-factory";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { RoutingConfig } from "./types/list-types";
import type { EntityDefinition } from "@/lib/universal-entity/types";
import { useRole } from "@/hooks/use-role";

interface EntityDefinitionsListClientProps {
  projectId: string;
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function EntityDefinitionsListClient({
  projectId,
  config,
  routing,
}: EntityDefinitionsListClientProps) {
  const { isReadOnly } = useRole(projectId);
  
  // Создаем сервис через фабрику
  const listService = useMemo(
    () => createEntityDefinitionListService(projectId),
    [projectId]
  );

  return (
    <UniversalEntityListClient<EntityDefinition>
      projectId={projectId}
      serviceType="entity-definition"
      config={config}
      routing={routing}
      onLoadData={listService.onLoadData}
      onDelete={listService.onDelete}
      readOnly={isReadOnly}
    />
  );
}
