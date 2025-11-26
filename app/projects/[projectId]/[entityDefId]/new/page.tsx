/**
 * Универсальная страница создания экземпляра сущности
 * URL: /projects/:projectId/:entityDefId/new
 */

import { notFound } from "next/navigation";
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";
import { UniversalEntityForm } from "@/components/UniversalEntityForm";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EntityNewPageProps {
  params: Promise<{ projectId: string; entityDefId: string }>;
}

export default async function EntityNewPage({ params }: EntityNewPageProps) {
  const { projectId, entityDefId } = await params;

  // Получаем entity definition с полями и UI конфигом
  const config = await getEntityDefinitionWithUIConfig(entityDefId);

  if (!config) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
        entityDefinitionName={config.entityDefinition.name}
      />

      <UniversalEntityForm
        entityDefinition={config.entityDefinition}
        fields={config.fields}
        uiConfig={config.uiConfig}
        mode="create"
        projectId={projectId}
      />
    </div>
  );
}

