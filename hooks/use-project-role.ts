/**
 * Хук для получения роли пользователя в конкретном проекте
 * 
 * @deprecated Используйте useRole(projectId) вместо этого хука
 * Оставлен для обратной совместимости
 * 
 * Использует React Query для кэширования результата
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export type ProjectRole = "superAdmin" | "projectSuperAdmin" | "projectAdmin" | null;

/**
 * Хук для получения роли текущего пользователя в проекте
 * @param projectId - ID проекта
 * @returns Объект с ролью, статусом загрузки и ошибкой
 */
export function useProjectRole(projectId: string | undefined) {
  const { user } = useAuth();

  const {
    data: role,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projectRole", projectId, user?.id],
    queryFn: async (): Promise<ProjectRole> => {
      if (!user?.id || !projectId) {
        return null;
      }

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "get_user_project_role",
        {
          p_project_id: projectId,
          p_user_id: user.id,
        } as unknown as undefined
      );

      if (rpcError) {
        console.error("[useProjectRole] RPC Error:", rpcError);
        throw new Error(`Failed to get project role: ${rpcError.message}`);
      }

      return (data as ProjectRole) || null;
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 минут - роль не меняется часто
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  return {
    role: role || null,
    isLoading,
    error: error instanceof Error ? error : null,
    isSuperAdmin: role === "superAdmin",
    isProjectSuperAdmin: role === "projectSuperAdmin",
    isProjectAdmin: role === "projectAdmin",
    isReadOnly: role === "projectAdmin", // projectAdmin имеет только права на чтение
  };
}

