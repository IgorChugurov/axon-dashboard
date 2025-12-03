/**
 * Хук для получения роли пользователя в клиентских компонентах
 * Использует React Query для кэширования результата
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UserRole } from "@/packages/auth-sdk/src/types";

/**
 * Хук для получения роли текущего пользователя
 * @returns Объект с ролью, статусом загрузки и ошибкой
 */
export function useUserRole() {
  const { user } = useAuth();

  const {
    data: role,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async (): Promise<UserRole> => {
      if (!user?.id) {
        return "user";
      }

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("get_user_role", {
        user_uuid: user.id,
      });

      if (rpcError) {
        console.error("[useUserRole] RPC Error:", rpcError);
        throw new Error(`Failed to get user role: ${rpcError.message}`);
      }

      return (data as UserRole) || "user";
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут - роль не меняется часто
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  return {
    role: role || "user",
    isLoading,
    error: error instanceof Error ? error : null,
    isSuperAdmin: role === "superAdmin",
    isAdmin: role === "admin" || role === "superAdmin",
  };
}

