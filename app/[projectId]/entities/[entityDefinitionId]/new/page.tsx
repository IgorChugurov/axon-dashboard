/**
 * Универсальная страница создания экземпляра сущности
 */

import { EntityFormWithSections } from "../EntityFormWithSections";
import { EntityDefinitionServerWrapper } from "../EntityDefinitionServerWrapper";

interface EntityNewPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function EntityNewPage({ params }: EntityNewPageProps) {
  const { projectId, entityDefinitionId } = await params;

  return (
    <EntityDefinitionServerWrapper
      projectId={projectId}
      entityDefinitionId={entityDefinitionId}
    >
      {async ({ entityDefinition, fields }) => {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Create {entityDefinition.name}
              </h1>
              {entityDefinition.description && (
                <p className="text-muted-foreground">
                  {entityDefinition.description}
                </p>
              )}
            </div>

            <EntityFormWithSections
              entityDefinition={entityDefinition}
              fields={fields}
              mode="create"
            />
          </div>
        );
      }}
    </EntityDefinitionServerWrapper>
  );
}
