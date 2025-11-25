/**
 * Универсальная страница списка экземпляров сущности
 */

import { notFound } from "next/navigation";
import {
  getEntityDefinitionById,
  getFields,
} from "@/lib/universal-entity/config-service";
import { EntityInstancesListClient } from "@/components/universal-entity-list";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

interface EntityListPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function EntityListPage({ params }: EntityListPageProps) {
  const { projectId, entityDefinitionId } = await params;

  // Загружаем entityDefinition
  const entityDefinition = await getEntityDefinitionById(entityDefinitionId);

  if (!entityDefinition) {
    notFound();
  }

  // Проверяем, что entityDefinition принадлежит проекту
  if (entityDefinition.projectId !== projectId) {
    notFound();
  }

  // Загружаем поля
  const fields = await getFields(entityDefinitionId);

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter
        projectId={projectId}
        entityDefinitionId={entityDefinitionId}
        entityDefinitionName={entityDefinition.name}
      />

      {entityDefinition.description && (
        <p className="text-muted-foreground">{entityDefinition.description}</p>
      )}

      <EntityInstancesListClient
        projectId={projectId}
        entityDefinition={entityDefinition}
        fields={fields}
        routing={{
          createUrlTemplate:
            "/projects/{projectId}/entity-instances/{entityDefinitionId}/new",
          editUrlTemplate:
            "/projects/{projectId}/entity-instances/{entityDefinitionId}/{instanceId}/edit",
          detailsUrlTemplate:
            "/projects/{projectId}/entity-instances/{entityDefinitionId}/{instanceId}",
        }}
      />
    </div>
  );
}
