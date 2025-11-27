import { AdminsListClient } from "@/components/universal-entity-list/AdminsListClient";
import adminsConfig from "@/config/admins.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";

interface AdminsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AdminsPage({ params }: AdminsPageProps) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <AdminsListClient
        projectId={projectId}
        config={adminsConfig as unknown as EntityConfigFile}
        routing={{
          // Для Admins пока нет страниц create/edit, но нужны для routing config
          createUrlTemplate: "/projects/{projectId}/admins/new",
          editUrlTemplate: "/projects/{projectId}/admins/{instanceId}",
          detailsUrlTemplate: "/projects/{projectId}/admins/{instanceId}",
        }}
      />
    </div>
  );
}

