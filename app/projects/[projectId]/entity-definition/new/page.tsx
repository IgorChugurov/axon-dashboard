import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { EntityDefinitionForm } from "@/components/entity-definition/EntityDefinitionForm";
import { createEntityDefinitionAction } from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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
      <Breadcrumbs
        projectId={projectId}
      />

      <div className="rounded-lg border bg-card p-6">
        <EntityDefinitionForm
          projectId={projectId}
          mode="create"
          onSubmit={async (data) => {
            "use server";
            return await createEntityDefinitionAction(projectId, data);
          }}
        />
      </div>
    </div>
  );
}

