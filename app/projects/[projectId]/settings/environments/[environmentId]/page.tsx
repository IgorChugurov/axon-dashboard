/**
 * Страница редактирования environment
 * Использует UniversalEntityFormNew с React Query мутациями
 */

import { notFound } from "next/navigation";
import { EnvironmentFormNew } from "@/components/environments/EnvironmentFormNew";
import { getEnvironmentById } from "@/lib/environments/service";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EnvironmentEditPageProps {
  params: Promise<{ projectId: string; environmentId: string }>;
}

export default async function EnvironmentEditPage({
  params,
}: EnvironmentEditPageProps) {
  const { projectId, environmentId } = await params;

  let environment;
  try {
    environment = await getEnvironmentById(environmentId);
  } catch (error) {
    console.error("[Environment Edit Page] Error loading environment:", error);
    notFound();
  }

  if (environment.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        environmentId={environmentId}
        environmentName={environment.key}
      />

      <EnvironmentFormNew
        projectId={projectId}
        mode="edit"
        environmentId={environmentId}
        initialData={{
          key: environment.key,
          type: environment.type,
          value: environment.value,
          options: environment.options,
        }}
      />
    </div>
  );
}
