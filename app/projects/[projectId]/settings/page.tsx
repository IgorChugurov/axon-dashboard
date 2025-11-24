import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversalEntityListClient } from "@/components/universal-entity-list";
import { ProjectSettingsTab } from "./ProjectSettingsTab";
import environmentsConfig from "@/config/environments.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: ProjectSettingsPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams.tab || "environments";

  // Server Component только для структуры страницы
  // Данные загружаются на клиенте через React Query

  return (
    <div className="space-y-6">
      <Breadcrumbs projectId={projectId} />

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="settings">Project Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="mt-6">
          <UniversalEntityListClient
            projectId={projectId}
            serviceType="environment"
            config={environmentsConfig as unknown as EntityConfigFile}
            routing={{
              createUrlTemplate:
                "/projects/{projectId}/settings/environment/new",
              editUrlTemplate:
                "/projects/{projectId}/settings/environment/{instanceId}",
              detailsUrlTemplate:
                "/projects/{projectId}/settings/environment/{instanceId}",
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ProjectSettingsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
