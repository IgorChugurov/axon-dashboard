/**
 * Страница редактирования администратора
 * Использует AdminFormEdit с динамическими опциями ролей (без superAdmin)
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { AdminFormEdit } from "@/components/admins/AdminFormEdit";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";
import type { FieldOption } from "@/lib/universal-entity/types";
import type { Admin } from "@/lib/admins/types";

interface AdminEditPageProps {
  params: Promise<{ projectId: string; adminId: string }>;
}

export default async function AdminEditPage({ params }: AdminEditPageProps) {
  const { projectId, adminId } = await params;

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

  // Загружаем админа через серверный клиент
  let admin: Admin | null = null;
  try {
    // Шаг 1: Загружаем project_admins
    type AdminRow = {
      id: string;
      project_id: string | null;
      user_id: string;
      role_id: string;
      created_at: string;
      updated_at: string;
      created_by: string | null;
    };
    const { data: adminData, error: adminError } = await supabase
      .from("project_admins")
      .select(
        `
        id,
        project_id,
        user_id,
        role_id,
        created_at,
        updated_at,
        created_by
      `
      )
      .eq("id", adminId)
      .single();

    if (adminError) {
      if (adminError.code === "PGRST116") {
        // Not found
        notFound();
      }
      console.error("[Admin Edit Page] Error loading admin:", adminError);
      notFound();
    }

    if (!adminData) {
      notFound();
    }

    const typedAdminData = adminData as AdminRow;

    // Шаг 2: Загружаем admin_roles
    type RoleRow = {
      id: string;
      name: string;
      description: string | null;
    };
    const { data: roleData, error: roleError } = await supabase
      .from("admin_roles")
      .select("id, name, description")
      .eq("id", typedAdminData.role_id)
      .single();

    if (roleError) {
      console.error("[Admin Edit Page] Get role error:", roleError);
    }

    // Шаг 3: Загружаем profile
    type ProfileRow = {
      id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, avatar_url")
      .eq("id", typedAdminData.user_id)
      .single();

    if (profileError) {
      console.error("[Admin Edit Page] Get profile error:", profileError);
    }

    const typedRoleData = roleData as RoleRow | null;
    const typedProfileData = profileData as ProfileRow | null;

    admin = {
      id: typedAdminData.id,
      userId: typedAdminData.user_id,
      roleId: typedAdminData.role_id,
      projectId: typedAdminData.project_id,
      createdAt: typedAdminData.created_at,
      updatedAt: typedAdminData.updated_at,
      createdBy: typedAdminData.created_by,
      email: typedProfileData?.email || null,
      firstName: typedProfileData?.first_name || null,
      lastName: typedProfileData?.last_name || null,
      avatarUrl: typedProfileData?.avatar_url || null,
      roleName: (typedRoleData?.name as Admin["roleName"]) || "projectAdmin",
      roleDescription: typedRoleData?.description || null,
    };
  } catch (error) {
    console.error("[Admin Edit Page] Error loading admin:", error);
    notFound();
  }

  if (!admin) {
    notFound();
  }

  // Проверяем, что админ принадлежит проекту (или это superAdmin)
  if (admin.projectId !== null && admin.projectId !== projectId) {
    notFound();
  }

  // Загружаем список ролей через серверный клиент
  let roles: Array<{ id: string; name: string; description: string | null }> =
    [];
  try {
    const { data: rolesData, error: rolesError } = await supabase
      .from("admin_roles")
      .select("id, name, description")
      .order("name", { ascending: true });

    if (rolesError) {
      console.error("[Admin Edit Page] Error loading roles:", rolesError);
    } else {
      roles = rolesData || [];
    }
  } catch (error) {
    console.error("[Admin Edit Page] Error loading roles:", error);
    // Продолжаем с дефолтными опциями из конфига
  }

  // Фильтруем роли: исключаем superAdmin и старую роль admin (устаревшая)
  const filteredRoles = roles.filter(
    (role) => role.name !== "superAdmin" && role.name !== "admin"
  );

  // Формируем опции для селекта
  const roleOptions: FieldOption[] = filteredRoles.map((role) => ({
    id: role.name,
    name:
      role.name === "projectAdmin"
        ? "Project Admin"
        : role.name === "projectSuperAdmin"
        ? "Project Super Admin"
        : role.name,
  }));

  // Формируем имя для breadcrumbs (email или имя)
  const adminName =
    admin.email ||
    (admin.firstName || admin.lastName
      ? `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
      : "Administrator");

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater adminId={adminId} adminName={adminName} />

      <div className="rounded-lg border bg-card p-6">
        <AdminFormEdit
          projectId={projectId}
          adminId={adminId}
          initialData={{
            email: admin.email || "",
            roleName: admin.roleName,
          }}
          roleOptions={roleOptions}
        />
      </div>
    </div>
  );
}
