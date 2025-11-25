import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import { FieldsListClient } from "@/components/universal-entity-list";
import fieldsConfig from "@/config/fields.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

interface FieldsPageProps {
  params: Promise<{ projectId: string; entityDefinitionId: string }>;
}

export default async function FieldsPage({ params }: FieldsPageProps) {
  const { projectId, entityDefinitionId } = await params;

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
  const entityDefinition = await getEntityDefinitionById(entityDefinitionId);

  if (!entityDefinition || entityDefinition.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter
        projectId={projectId}
        entityDefinitionId={entityDefinitionId}
        entityDefinitionName={entityDefinition.name}
      />

      <FieldsListClient
        projectId={projectId}
        entityDefinitionId={entityDefinitionId}
        config={fieldsConfig as unknown as EntityConfigFile}
        routing={{
          createUrlTemplate:
            "/projects/{projectId}/entity-definition/{entityDefinitionId}/fields/new",
          editUrlTemplate:
            "/projects/{projectId}/entity-definition/{entityDefinitionId}/fields/{instanceId}/edit",
          detailsUrlTemplate:
            "/projects/{projectId}/entity-definition/{entityDefinitionId}/fields/{instanceId}",
        }}
      />
    </div>
  );
}
