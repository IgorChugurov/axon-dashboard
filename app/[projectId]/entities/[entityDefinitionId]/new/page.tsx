/**
 * Универсальная страница создания экземпляра сущности
 */

import { notFound } from "next/navigation";
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";
import { UniversalEntityForm } from "@/components/UniversalEntityForm";

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
    <UniversalEntityForm
      entityDefinition={config.entityDefinition}
      fields={config.fields}
      uiConfig={config.uiConfig}
      mode="create"
      projectId={projectId}
    />
  );
}
