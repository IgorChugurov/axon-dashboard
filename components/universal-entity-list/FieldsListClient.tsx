/**
 * Client Component обертка для списка Fields
 * Использует фабрику сервисов для создания onLoadData и onDelete
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "./UniversalEntityListClient";
import { createFieldListService } from "@/lib/universal-entity/list-service-factory";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { RoutingConfig } from "./types/list-types";
import type { Field } from "@/lib/universal-entity/types";
import { useRole } from "@/hooks/use-role";

interface FieldsListClientProps {
  projectId: string;
  entityDefinitionId: string;
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function FieldsListClient({
  projectId,
  entityDefinitionId,
  config,
  routing,
}: FieldsListClientProps) {
  const { isReadOnly } = useRole(projectId);
  
  // Создаем сервис через фабрику
  const listService = useMemo(
    () => createFieldListService(entityDefinitionId, projectId),
    [entityDefinitionId, projectId]
  );

  // Заменяем {entityDefinitionId} в шаблонах URL
  const resolvedRouting = useMemo<RoutingConfig>(() => {
    return {
      createUrlTemplate: routing.createUrlTemplate.replace(
        "{entityDefinitionId}",
        entityDefinitionId
      ),
      editUrlTemplate: routing.editUrlTemplate.replace(
        "{entityDefinitionId}",
        entityDefinitionId
      ),
      detailsUrlTemplate: routing.detailsUrlTemplate.replace(
        "{entityDefinitionId}",
        entityDefinitionId
      ),
    };
  }, [routing, entityDefinitionId]);

  return (
    <UniversalEntityListClient<Field>
      projectId={projectId}
      serviceType="field"
      config={config}
      routing={resolvedRouting}
      onLoadData={listService.onLoadData}
      onDelete={listService.onDelete}
      readOnly={isReadOnly}
    />
  );
}
