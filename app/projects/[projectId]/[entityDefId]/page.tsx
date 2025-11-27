/**
 * Универсальная страница списка экземпляров сущности
 * URL: /projects/:projectId/:entityDefId
 */

import { notFound } from "next/navigation";
import {
  getEntityDefinitionById,
  getFields,
} from "@/lib/universal-entity/config-service";
import { EntityInstancesListClient } from "@/components/universal-entity-list";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EntityListPageProps {
  params: Promise<{ projectId: string; entityDefId: string }>;
}

export default async function EntityListPage({ params }: EntityListPageProps) {
  const { projectId, entityDefId } = await params;

  // Загружаем entityDefinition
  const entityDefinition = await getEntityDefinitionById(entityDefId);

  if (!entityDefinition) {
    notFound();
  }

  // Проверяем, что entityDefinition принадлежит проекту
  if (entityDefinition.projectId !== projectId) {
    notFound();
  }

  // Загружаем поля
  const fields = await getFields(entityDefId);
  //console.log("fields", fields);

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
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
          createUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/new",
          editUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
          detailsUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
        }}
      />
    </div>
  );
}
