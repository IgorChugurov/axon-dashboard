import { EntityDefinitionsListClient } from "@/components/universal-entity-list";
import entityDefinitionConfig from "@/config/entity-definition.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { ProjectPageHeader } from "@/components/projects/ProjectPageHeader";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth/roles";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  // Проверяем, является ли пользователь суперадмином
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIsSuperAdmin = user ? await isSuperAdmin(user.id) : false;

  return (
    <>
      {userIsSuperAdmin && (
        <ProjectPageHeader projectId={projectId} />
      )}
      <EntityDefinitionsListClient
        projectId={projectId}
        config={entityDefinitionConfig as unknown as EntityConfigFile}
        routing={{
          createUrlTemplate: "/projects/{projectId}/new",
          editUrlTemplate:
            "/projects/{projectId}/{instanceId}/edit",
          detailsUrlTemplate:
            "/projects/{projectId}/{instanceId}",
        }}
      />
    </>
  );
}
