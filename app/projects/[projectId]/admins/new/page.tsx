/**
 * Страница создания нового администратора
 */

import { AdminFormNew } from "@/components/admins/AdminFormNew";

interface AdminNewPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AdminNewPage({ params }: AdminNewPageProps) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <AdminFormNew projectId={projectId} />
    </div>
  );
}

