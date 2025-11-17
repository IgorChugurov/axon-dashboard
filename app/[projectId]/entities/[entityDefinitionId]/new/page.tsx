/**
 * Универсальная страница создания экземпляра сущности
 */

import { EntityFormClient } from "../EntityFormClient";
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
        // Фильтруем поля для формы создания
        const createFields = fields.filter((f) => f.forCreatePage);

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

            {createFields.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-4">
                <p className="text-lg font-semibold">
                  No fields configured for this entity.
                </p>
                <div className="text-sm space-y-1">
                  <p>Entity ID: {entityDefinitionId}</p>
                  <p>Entity Name: {entityDefinition.name}</p>
                  <p className="mt-4 text-xs">
                    Check server logs for details. If fields exist in database
                    but are not loading, try clearing the cache or check the
                    migration was completed successfully.
                  </p>
                </div>
              </div>
            ) : (
              <EntityFormClient
                entityDefinition={entityDefinition}
                fields={createFields}
                mode="create"
              />
            )}
          </div>
        );
      }}
    </EntityDefinitionServerWrapper>
  );
}
