import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import { FieldsListClient } from "@/components/universal-entity-list";
import fieldsConfig from "@/config/fields.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface FieldsPageProps {
  params: Promise<{ projectId: string; entityDefId: string }>;
}

export default async function FieldsPage({ params }: FieldsPageProps) {
  const { projectId, entityDefId } = await params;

  // Проверка прав доступа
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdminUser = await isAdmin(user.id);
  if (!isAdminUser) {
    redirect(`/projects/${projectId}`);
  }

  // Проверяем, что entityDefinition существует и принадлежит проекту
  const entityDefinition = await getEntityDefinitionById(entityDefId);

  if (!entityDefinition || entityDefinition.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
        entityDefinitionName={entityDefinition.name}
      />

      <FieldsListClient
        projectId={projectId}
        entityDefinitionId={entityDefId}
        config={fieldsConfig as unknown as EntityConfigFile}
        routing={{
          createUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/fields/new",
          editUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/fields/{instanceId}",
          detailsUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/fields/{instanceId}",
        }}
      />
    </div>
  );
}

