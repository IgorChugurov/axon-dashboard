/**
 * Универсальная страница создания экземпляра сущности
 */

import { notFound } from "next/navigation";
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";
import { UniversalEntityForm } from "@/components/UniversalEntityForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface EntityNewPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function EntityNewPage({ params }: EntityNewPageProps) {
  const { projectId, entityDefinitionId } = await params;

  // Получаем entity definition с полями и UI конфигом
  const config = await getEntityDefinitionWithUIConfig(entityDefinitionId);

  if (!config) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        projectId={projectId}
        entityDefinitionId={entityDefinitionId}
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
