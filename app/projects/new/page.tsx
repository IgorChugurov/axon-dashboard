/**
 * Страница создания нового проекта
 * Использует UniversalEntityFormNew для создания проекта
 * Только superAdmin может создавать проекты
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectFormNew } from "@/components/projects/ProjectFormNew";

export default async function NewProjectPage() {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Проверяем, является ли пользователь superAdmin
  const { data: isSuperAdmin, error: checkError } = await supabase.rpc(
    "is_super_admin",
    { user_uuid: user.id }
  );

  if (checkError) {
    console.error("[New Project Page] Check superAdmin error:", checkError);
    redirect("/projects");
  }

  if (!isSuperAdmin) {
    // Редиректим на список проектов, если не superAdmin
    redirect("/projects");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create New Project</h1>
        <p className="text-muted-foreground">
          Create a new project to organize your entities
        </p>
      </div>

      <ProjectFormNew mode="create" />
    </div>
  );
}
