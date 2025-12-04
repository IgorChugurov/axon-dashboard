import { AdminsListClient } from "@/components/universal-entity-list/AdminsListClient";
import adminsConfig from "@/config/admins.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

interface AdminsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AdminsPage({ params }: AdminsPageProps) {
  const { projectId } = await params;

  // Проверка прав доступа - только суперадмин может видеть список админов
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userIsSuperAdmin = await isSuperAdmin(user.id);
  if (!userIsSuperAdmin) {
    redirect(`/projects/${projectId}`);
  }

  return (
    <AdminsListClient
      projectId={projectId}
      config={adminsConfig as unknown as EntityConfigFile}
      routing={{
        // Для Admins пока нет страниц create/edit, но нужны для routing config
        createUrlTemplate: "/projects/{projectId}/admins/new",
        editUrlTemplate: "/projects/{projectId}/admins/{instanceId}",
        detailsUrlTemplate: "/projects/{projectId}/admins/{instanceId}",
      }}
    />
  );
}
