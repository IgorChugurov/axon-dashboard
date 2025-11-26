import { EntityDefinitionsListClient } from "@/components/universal-entity-list";
import entityDefinitionConfig from "@/config/entity-definition.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return (
    <>
      <EntityDefinitionsListClient
        projectId={projectId}
        config={entityDefinitionConfig as unknown as EntityConfigFile}
        routing={{
          createUrlTemplate: "/projects/{projectId}/entity-definition/new",
          editUrlTemplate:
            "/projects/{projectId}/entity-definition/{instanceId}",
          detailsUrlTemplate:
            "/projects/{projectId}/entity-definition/{instanceId}",
        }}
      />
    </>
  );
}
