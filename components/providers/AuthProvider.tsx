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
import { transformSupabaseUser } from "@/lib/supabase/transform";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithOAuth: (provider: "google" | "github") => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    isLoading: !!initialUser ? false : true, // Если есть initialUser, не загружаем
  });
  const router = useRouter();
  const supabase = createClient();

  // Инициализация и отслеживание изменений авторизации
  useEffect(() => {
    // Используем initialUser как основной источник данных
    if (initialUser) {
      setAuthState({
        user: initialUser,
        tokens: null,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      // Только если нет initialUser, проверяем сессию
      // Это может быть на публичных страницах или при первой загрузке
      supabase.auth.getSession().then(({ data: { session } }) => {
        const user = transformSupabaseUser(session?.user ?? null);
        setAuthState({
          user,
          tokens: null,
          isAuthenticated: !!user,
          isLoading: false,
        });
      });
    }

    // Подписываемся на изменения авторизации для синхронизации
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

      // Убираем избыточный router.refresh() при SIGNED_IN
      // onAuthStateChange уже обновляет состояние, этого достаточно
      // router.refresh() вызовется автоматически при навигации

      // При выходе редиректим на логин
      if (event === "SIGNED_OUT") {
        router.push("/login");
        router.refresh(); // Только при выходе для очистки серверного состояния
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser, router, supabase.auth]);

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
      // router.refresh() не нужен - навигация обновит страницу автоматически
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
      router.refresh(); // Нужен для очистки серверного состояния при выходе
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
