/**
 * Хук для получения роли пользователя в клиентских компонентах
 *
 * @deprecated Используйте useRole() вместо этого хука
 * Оставлен для обратной совместимости
 *
 * УПРОЩЕННАЯ АРХИТЕКТУРА:
 * - Проверяет is_super_admin() для определения superAdmin
 * - Для отображения роли использует get_user_project_role() первого доступного проекта
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UserRole } from "@igorchugurov/auth-sdk";

/**
 * Хук для получения роли текущего пользователя
 * @returns Объект с ролью, статусом загрузки и ошибкой
 */
export function useUserRole() {
  const { user } = useAuth();

  const {
    data: roleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async (): Promise<{
      role: UserRole;
      isAdmin: boolean;
      displayRole?: string;
    }> => {
      if (!user?.id) {
        return { role: "user", isAdmin: false };
      }

      const supabase = createClient();

      // Проверяем, является ли superAdmin
      const { data: isSuper, error: superError } = await supabase.rpc(
        "is_super_admin",
        {
          user_uuid: user.id,
        } as unknown as undefined
      );

      if (superError) {
        console.error("[useUserRole] RPC Error (is_super_admin):", superError);
        throw new Error(`Failed to check super admin: ${superError.message}`);
      }

      if (isSuper === true) {
        return { role: "superAdmin", isAdmin: true, displayRole: "superAdmin" };
      }

      // Проверяем, является ли любым админом
      const { data: isAnyAdmin, error: adminError } = await supabase.rpc(
        "is_any_admin",
        {
          user_uuid: user.id,
        } as unknown as undefined
      );

      if (adminError) {
        console.error("[useUserRole] RPC Error (is_any_admin):", adminError);
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

        if (projects && projects.length > 0 && projects[0]) {
          const projectId = (projects[0] as { project_id: string }).project_id;
          if (projectId) {
            const { data: projectRole } = await supabase.rpc(
              "get_user_project_role",
              {
                p_project_id: projectId,
                p_user_id: user.id,
              } as unknown as undefined
            );

            return {
              role: "user", // Глобальная роль - не superAdmin
              isAdmin: true,
              displayRole: projectRole || "Administrator",
            };
          }
        }

        return { role: "user", isAdmin: true, displayRole: "Administrator" };
      }

      return { role: "user", isAdmin: false };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут - роль не меняется часто
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  return {
    role: roleData?.role || "user",
    displayRole: roleData?.displayRole || roleData?.role || "user",
    isLoading,
    error: error instanceof Error ? error : null,
    isSuperAdmin: roleData?.role === "superAdmin",
    isAdmin: roleData?.isAdmin || false,
  };
}
