"use client";

import { ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/packages/auth-sdk/src/types";
import {
  AuthProvider as SDKAuthProvider,
  useAuth as useSDKAuth,
  createClientAuthClient,
  createBrowserSupabaseClient,
} from "@/packages/auth-sdk/src/client";

/**
 * Обертка над SDK AuthProvider для совместимости с текущим кодом
 */
export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const router = useRouter();

  // Создаем auth client один раз
  const authClient = useMemo(() => {
    const supabase = createBrowserSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Используем window.location.origin только на клиенте
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    return createClientAuthClient(supabase, redirectTo);
  }, []);

  return (
    <SDKAuthProvider
      authClient={authClient}
      initialUser={initialUser}
      onSignOut={() => {
        router.push("/login");
        router.refresh();
      }}
    >
      {children}
    </SDKAuthProvider>
  );
}

/**
 * Хук для доступа к функциям авторизации
 * Экспортирует useAuth из SDK для совместимости
 */
export { useSDKAuth as useAuth };
