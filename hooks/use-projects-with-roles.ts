/**
 * Хук для получения всех проектов с ролями пользователя
 * Использует React Query для кэширования
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Project, ProjectRole } from "@/lib/projects/types";

/**
 * Получение всех ролей пользователя в проектах одним запросом (клиентская версия)
 */
async function getAllUserProjectRolesClient(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Map<string, ProjectRole>> {
  try {
    // Проверяем, является ли пользователь superAdmin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
      user_uuid: userId,
    } as unknown as undefined);

    const rolesMap = new Map<string, ProjectRole>();

    // Если superAdmin - для всех проектов роль будет 'superAdmin'
    if (isSuperAdmin === true) {
      // Получаем все проекты для superAdmin
      const { data: allProjects } = await supabase
        .from("projects")
        .select("id");

      if (allProjects) {
        allProjects.forEach((project: { id: string }) => {
          rolesMap.set(project.id, "superAdmin");
        });
      }
    } else {
      // Для остальных админов получаем роли из project_admins
      const { data: projectAdmins, error } = await supabase
        .from("project_admins")
        .select("project_id, admin_roles(name)")
        .eq("user_id", userId)
        .not("project_id", "is", null);

      if (error) {
        console.error(
          "[getAllUserProjectRolesClient] Error fetching project roles:",
          error
        );
        return rolesMap;
      }

      if (projectAdmins) {
        projectAdmins.forEach((pa: any) => {
          const projectId = pa.project_id;
          const roleName = pa.admin_roles?.name;
          if (projectId && roleName) {
            rolesMap.set(
              projectId,
              roleName as "projectSuperAdmin" | "projectAdmin"
            );
          }
        });
      }
    }

    return rolesMap;
  } catch (error) {
    console.error("[getAllUserProjectRolesClient] Error:", error);
    return new Map();
  }
}

/**
 * Хук для получения всех проектов с ролями пользователя
 */
export function useProjectsWithRoles() {
  const { user } = useAuth();

  const {
    data: projectsWithRoles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projectsWithRoles", user?.id],
    queryFn: async (): Promise<Project[]> => {
      if (!user?.id) {
        return [];
      }

      const supabase = createClient();

      // Получаем роли одним запросом
      const rolesMap = await getAllUserProjectRolesClient(supabase, user.id);

      // Получаем проекты (RLS автоматически отфильтрует доступные)
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("name", { ascending: true });

      if (projectsError) {
        console.error(
          "[useProjectsWithRoles] Error fetching projects:",
          projectsError
        );
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      // Добавляем роли к проектам
      return (projects || []).map((project: any): Project => {
        const role = rolesMap.get(project.id) || null;
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdBy: project.created_by,
          enableSignIn: project.enable_sign_in ?? true,
          enableSignUp: project.enable_sign_up ?? true,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          role,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  return {
    projects: projectsWithRoles || [],
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
