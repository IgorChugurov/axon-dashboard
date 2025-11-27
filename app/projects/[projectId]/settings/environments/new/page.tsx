/**
 * Страница создания нового environment
 * Использует UniversalEntityFormNew с React Query мутациями
 */

import { EnvironmentFormNew } from "@/components/environments/EnvironmentFormNew";

interface EnvironmentNewPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EnvironmentNewPage({
  params,
}: EnvironmentNewPageProps) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <EnvironmentFormNew projectId={projectId} mode="create" />
    </div>
  );
}
