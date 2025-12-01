/**
 * React Provider для управления состоянием авторизации
 * Используется в Client Components
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type {
  AuthState,
  User,
  LoginCredentials,
  OAuthProviderType,
} from "../types";
import { ClientAuthClient } from "./auth-client";
import { transformSupabaseUser } from "../utils/transform";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithOAuth: (provider: OAuthProviderType) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{
    user: User | null;
    session: any | null;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  authClient: ClientAuthClient;
  initialUser?: User | null;
  onSignOut?: () => void;
}

export function AuthProvider({
  children,
  authClient,
  initialUser,
  onSignOut,
}: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: initialUser || null,
    tokens: null,
    isAuthenticated: !!initialUser,
    isLoading: !!initialUser ? false : true,
  });
  const router = useRouter();

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
      // НО: не редиректим на логин, если мы на странице reset-password
      // (там может быть recovery сессия, которая обрабатывается отдельно)
      const isResetPasswordPage =
        typeof window !== "undefined" &&
        window.location.pathname.includes("/auth/reset-password");

      authClient.getSession().then((session) => {
        const user = transformSupabaseUser(session?.user ?? null);
        setAuthState({
          user,
          tokens: null,
          isAuthenticated: !!user,
          isLoading: false,
        });

        // Не редиректим на логин, если мы на странице reset-password
        // даже если сессии нет (она может быть установлена позже из hash)
        if (!user && !isResetPasswordPage) {
          // Сессии нет и мы не на странице reset-password
          // Но не редиректим здесь - пусть middleware или страница решает
        }
      });
    }

    // Подписываемся на изменения авторизации через Supabase
    const unsubscribe = authClient.onAuthStateChange(async (event, session) => {
      const user = transformSupabaseUser(session?.user ?? null);

      setAuthState({
        user,
        tokens: null,
        isAuthenticated: !!user,
        isLoading: false,
      });

      // При выходе редиректим на логин (но не на странице reset-password)
      if (event === "SIGNED_OUT") {
        // Не редиректим, если мы на странице сброса пароля
        // (токен может временно установить сессию, которая потом сбросится)
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/auth/reset-password")
        ) {
          router.push("/login");
          router.refresh();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [initialUser, authClient, router]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await authClient.login(credentials);
        setAuthState({
          user: result.user,
          tokens: result.session
            ? {
                accessToken: result.session.accessToken,
                refreshToken: result.session.refreshToken,
                expiresAt: Date.now() + 3600000, // 1 час
              }
            : null,
          isAuthenticated: true,
          isLoading: false,
        });

        // НЕ делаем редирект здесь - пусть страница логина сама решает, куда редиректить
        // Это позволяет использовать параметр redirect из URL
      } catch (error) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [authClient]
  );

  const loginWithOAuth = useCallback(
    async (provider: OAuthProviderType) => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        await authClient.loginWithOAuth(provider);
        // Редирект произойдет автоматически через OAuth провайдера
      } catch (error) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [authClient]
  );

  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Сначала очищаем state, чтобы UI сразу обновился
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Очищаем куку проекта на клиенте
      // Middleware автоматически очистит куку проекта при редиректе на /login
      if (typeof document !== "undefined") {
        document.cookie = "currentProjectId=; path=/; max-age=0; SameSite=Lax";
      }

      // Выходим из Supabase сессии
      // Middleware автоматически очистит куку проекта и куку роли при редиректе на /login
      await authClient.logout();

      if (onSignOut) {
        onSignOut();
      }

      // КРИТИЧНО: Используем window.location для полного редиректа
      // Это гарантирует, что middleware обработает запрос после очистки cookies
      // router.push() + router.refresh() может не сработать, если cookies еще не очищены
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // В любом случае редиректим на логин
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
      window.location.href = "/login";
    }
  }, [authClient, onSignOut]);

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await authClient.signUp(data);
        setAuthState({
          user: result.user,
          tokens: result.session
            ? {
                accessToken: result.session.accessToken,
                refreshToken: result.session.refreshToken,
                expiresAt: Date.now() + 3600000,
              }
            : null,
          isAuthenticated: !!result.session,
          isLoading: false,
        });

        if (result.session) {
          router.push("/");
        }
      } catch (error) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [authClient, router]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        await authClient.resetPassword({ email });
      } catch (error) {
        throw error;
      }
    },
    [authClient]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      try {
        const result = await authClient.updatePassword(newPassword);
        return result;
      } catch (error) {
        throw error;
      }
    },
    [authClient]
  );

  const refreshUser = useCallback(async () => {
    try {
      const user = await authClient.getUser();
      setAuthState((prev) => ({
        ...prev,
        user,
        isAuthenticated: !!user,
      }));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [authClient]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        loginWithOAuth,
        logout,
        refreshUser,
        signUp,
        resetPassword,
        updatePassword,
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
