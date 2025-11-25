import { EnvironmentsListClient } from "@/components/universal-entity-list/EnvironmentsListClient";
import environmentsConfig from "@/config/environments.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

interface EnvironmentsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EnvironmentsPage({
  params,
}: EnvironmentsPageProps) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter projectId={projectId} />
      
      <EnvironmentsListClient
        projectId={projectId}
        config={environmentsConfig as unknown as EntityConfigFile}
        routing={{
          createUrlTemplate: "/projects/{projectId}/settings/environments/new",
          editUrlTemplate:
            "/projects/{projectId}/settings/environments/{instanceId}",
          detailsUrlTemplate:
            "/projects/{projectId}/settings/environments/{instanceId}",
        }}
      />
    </div>
  );
}
