/**
 * Страница создания нового environment
 */

import { loadUIConfigFromFile } from "@/lib/universal-entity/config-loader";
import { EnvironmentForm } from "../EnvironmentForm";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

interface EnvironmentNewPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EnvironmentNewPage({
  params,
}: EnvironmentNewPageProps) {
  const { projectId } = await params;

  // Загружаем UI конфиг
  const uiConfig = loadUIConfigFromFile("environments");

  if (!uiConfig) {
    throw new Error("Failed to load config for environments");
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter projectId={projectId} />
      
      <EnvironmentForm projectId={projectId} mode="create" uiConfig={uiConfig} />
    </div>
  );
}

