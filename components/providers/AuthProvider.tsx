"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthState, LoginCredentials, User } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithOAuth: (provider: "google" | "github") => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Преобразование Supabase User в наш User тип
function transformSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    firstName:
      supabaseUser.user_metadata?.first_name ||
      supabaseUser.user_metadata?.full_name?.split(" ")[0],
    lastName:
      supabaseUser.user_metadata?.last_name ||
      supabaseUser.user_metadata?.full_name?.split(" ").slice(1).join(" "),
    avatar:
      supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture,
    role: supabaseUser.user_metadata?.role,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at,
  };
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const [authState, setAuthState] = useState<AuthState>({
    user: initialUser,
    tokens: null,
    isAuthenticated: !!initialUser,
    isLoading: true, // Начинаем с загрузки, чтобы проверить сессию
  });
  const router = useRouter();
  const supabase = createClient();

  // Инициализация и отслеживание изменений авторизации
  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = transformSupabaseUser(session?.user ?? null);
      setAuthState({
        user,
        tokens: null,
        isAuthenticated: !!user,
        isLoading: false,
      });
    });

    // Отслеживаем изменения авторизации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = transformSupabaseUser(session?.user ?? null);

      setAuthState({
        user,
        tokens: null,
        isAuthenticated: !!user,
        isLoading: false,
      });

      // При успешном входе обновляем страницу
      if (event === "SIGNED_IN" && user) {
        router.refresh();
      }

      // При выходе редиректим на логин
      if (event === "SIGNED_OUT") {
        router.push("/login");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  // Обновляем состояние при изменении initialUser (от сервера)
  useEffect(() => {
    if (initialUser) {
      setAuthState((prev) => ({
        ...prev,
        user: initialUser,
        isAuthenticated: true,
        isLoading: false,
      }));
    }
  }, [initialUser]);

  const login = async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      const user = transformSupabaseUser(data.user);
      setAuthState({
        user,
        tokens: null,
        isAuthenticated: true,
        isLoading: false,
      });

      router.push("/");
      router.refresh();
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const loginWithOAuth = async (provider: "google" | "github") => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));

        // Улучшенная обработка ошибок для более понятных сообщений
        if (
          error.message.includes("provider is not enabled") ||
          error.message.includes("Unsupported provider")
        ) {
          throw new Error(
            `${
              provider === "google" ? "Google" : "GitHub"
            } провайдер не включен в настройках Supabase. ` +
              `Пожалуйста, включите его в Supabase Dashboard: Authentication → Providers → ${
                provider === "google" ? "Google" : "GitHub"
              }. ` +
              `См. инструкции в SUPABASE_SETUP_GUIDE.md`
          );
        }

        throw new Error(error.message);
      }

      // Редирект произойдет автоматически через OAuth провайдера
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });

      router.push("/login");
      router.refresh();
    }
  };

  const refreshUser = async () => {
    try {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      const user = transformSupabaseUser(supabaseUser);

      setAuthState((prev) => ({
        ...prev,
        user,
        isAuthenticated: !!user,
      }));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        loginWithOAuth,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
