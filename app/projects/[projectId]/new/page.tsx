import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { EntityDefinitionFormNew } from "@/components/entity-definitions/EntityDefinitionFormNew";

interface NewEntityDefinitionPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewEntityDefinitionPage({
  params,
}: NewEntityDefinitionPageProps) {
  const { projectId } = await params;

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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <EntityDefinitionFormNew projectId={projectId} mode="create" />
      </div>
    </div>
  );
}
