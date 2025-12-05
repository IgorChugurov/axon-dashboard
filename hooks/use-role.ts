/**
 * Единый хук для получения роли пользователя
 * Объединяет функциональность useUserRole и useProjectRole
 *
 * ОПТИМИЗАЦИЯ:
 * - Один RPC запрос вместо нескольких
 * - Единый API для всех проверок ролей
 * - Кэширование через React Query
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UserRole } from "@igorchugurov/auth-sdk";

export type ProjectRole =
  | "superAdmin"
  | "projectSuperAdmin"
  | "projectAdmin"
  | null;

export interface RoleData {
  // Глобальная роль (для middleware и общего доступа)
  globalRole: UserRole; // 'superAdmin' | 'user'

  // Роль в проекте (если projectId передан)
  projectRole: ProjectRole; // 'superAdmin' | 'projectSuperAdmin' | 'projectAdmin' | null

  // Флаги для удобства
  isSuperAdmin: boolean;
  isProjectSuperAdmin: boolean;
  isProjectAdmin: boolean;
  isReadOnly: boolean; // true для projectAdmin
  canEdit: boolean; // true для superAdmin и projectSuperAdmin (в контексте проекта)
  isAdmin: boolean; // true если любая роль админа

  // Для отображения
  displayRole: string; // 'superAdmin' | 'projectSuperAdmin' | 'projectAdmin' | 'user'
}

/**
 * Единый хук для получения роли пользователя
 * @param projectId - Опциональный ID проекта. Если передан, возвращает роль в проекте
 * @returns Объект с ролью, флагами и статусом загрузки
 */
export function useRole(projectId?: string | undefined): RoleData & {
  isLoading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();

  const {
    data: roleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["role", projectId, user?.id],
    queryFn: async (): Promise<RoleData> => {
      if (!user?.id) {
        return {
          globalRole: "user",
          projectRole: null,
          isSuperAdmin: false,
          isProjectSuperAdmin: false,
          isProjectAdmin: false,
          isReadOnly: true,
          canEdit: false,
          isAdmin: false,
          displayRole: "user",
        };
      }

      const supabase = createClient();

      // Если передан projectId - получаем роль в проекте
      if (projectId) {
        const { data: projectRole, error: rpcError } = await supabase.rpc(
          "get_user_project_role",
          {
            p_project_id: projectId,
            p_user_id: user.id,
          } as unknown as undefined
        );

        if (rpcError) {
          console.error(
            "[useRole] RPC Error (get_user_project_role):",
            rpcError
          );
          throw new Error(`Failed to get project role: ${rpcError.message}`);
        }

        const role = (projectRole as ProjectRole) || null;
        const isSuper = role === "superAdmin";
        const isProjectSuper = role === "projectSuperAdmin";
        const isProjectAdmin = role === "projectAdmin";

        // Определяем глобальную роль (superAdmin или user)
        const globalRole: UserRole = isSuper ? "superAdmin" : "user";

        return {
          globalRole,
          projectRole: role,
          isSuperAdmin: isSuper,
          isProjectSuperAdmin: isProjectSuper,
          isProjectAdmin: isProjectAdmin,
          isReadOnly: isProjectAdmin, // projectAdmin имеет только права на чтение
          canEdit: isSuper || isProjectSuper, // superAdmin и projectSuperAdmin могут редактировать
          isAdmin: role !== null, // любая роль админа
          displayRole: role || "user",
        };
      }

      // Если projectId не передан - получаем глобальную роль
      // Проверяем, является ли superAdmin
      const { data: isSuper, error: superError } = await supabase.rpc(
        "is_super_admin",
        {
          user_uuid: user.id,
        } as unknown as undefined
      );

      if (superError) {
        console.error("[useRole] RPC Error (is_super_admin):", superError);
        throw new Error(`Failed to check super admin: ${superError.message}`);
      }

      if (isSuper === true) {
        return {
          globalRole: "superAdmin",
          projectRole: null, // не определен для глобальной роли
          isSuperAdmin: true,
          isProjectSuperAdmin: false,
          isProjectAdmin: false,
          isReadOnly: false,
          canEdit: true,
          isAdmin: true,
          displayRole: "superAdmin",
        };
      }

      // Проверяем, является ли любым админом
      const { data: isAnyAdmin, error: adminError } = await supabase.rpc(
        "is_any_admin",
        {
          user_uuid: user.id,
        } as unknown as undefined
      );

      if (adminError) {
        console.error("[useRole] RPC Error (is_any_admin):", adminError);
        throw new Error(`Failed to check admin access: ${adminError.message}`);
      }

      if (isAnyAdmin === true) {
        // Получаем роль из первого доступного проекта для отображения
        const { data: projects } = await supabase
          .from("project_admins")
          .select("project_id")
          .eq("user_id", user.id)
          .not("project_id", "is", null)
          .limit(1);

        let displayRole = "Administrator";

        if (projects && projects.length > 0 && projects[0]) {
          const firstProjectId = (projects[0] as { project_id: string })
            .project_id;
          if (firstProjectId) {
            const { data: projectRole } = await supabase.rpc(
              "get_user_project_role",
              {
                p_project_id: firstProjectId,
                p_user_id: user.id,
              } as unknown as undefined
            );
            displayRole =
              projectRole && typeof projectRole === "string"
                ? projectRole
                : "Administrator";
          }
        }

        return {
          globalRole: "user", // Глобальная роль - не superAdmin
          projectRole: null, // не определен для глобальной роли
          isSuperAdmin: false,
          isProjectSuperAdmin: false,
          isProjectAdmin: false,
          isReadOnly: false, // для глобальной роли не применимо
          canEdit: false, // для глобальной роли не применимо
          isAdmin: true,
          displayRole,
        };
      }

      return {
        globalRole: "user",
        projectRole: null,
        isSuperAdmin: false,
        isProjectSuperAdmin: false,
        isProjectAdmin: false,
        isReadOnly: true,
        canEdit: false,
        isAdmin: false,
        displayRole: "user",
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут - роль не меняется часто
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  // Возвращаем дефолтные значения если данные еще не загружены
  const defaultData: RoleData = {
    globalRole: "user",
    projectRole: null,
    isSuperAdmin: false,
    isProjectSuperAdmin: false,
    isProjectAdmin: false,
    isReadOnly: true,
    canEdit: false,
    isAdmin: false,
    displayRole: "user",
  };

  return {
    ...(roleData || defaultData),
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
