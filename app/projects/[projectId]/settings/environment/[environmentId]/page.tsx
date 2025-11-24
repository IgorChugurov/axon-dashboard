/**
 * Страница редактирования environment
 */

import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EnvironmentForm } from "../EnvironmentForm";
import { getEnvironmentById } from "@/lib/environments/service";
import { loadUIConfigFromFile } from "@/lib/universal-entity/config-loader";

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

  const uiConfig = loadUIConfigFromFile("environments");

  if (!uiConfig) {
    throw new Error("Failed to load config for environments");
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs projectId={projectId} />

      <EnvironmentForm
        projectId={projectId}
        mode="edit"
        environmentId={environmentId}
        initialData={{
          key: environment.key,
          type: environment.type,
          value: environment.value,
          options: environment.options,
        }}
        uiConfig={uiConfig}
      />
    </div>
  );
}

