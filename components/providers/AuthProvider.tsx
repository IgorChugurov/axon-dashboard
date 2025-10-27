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

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
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
    isLoading: false,
  });
  const router = useRouter();

  // Обновляем состояние при изменении initialUser
  useEffect(() => {
    if (initialUser) {
      setAuthState({
        user: initialUser,
        tokens: null,
        isAuthenticated: true,
        isLoading: false,
      });
    }
  }, [initialUser]);

  const login = async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Авторизация через Next.js API Route
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Login failed");
      }

      const data = await response.json();

      setAuthState({
        user: { email: data.email },
        tokens: null,
        isAuthenticated: true,
        isLoading: false,
      });

      router.push("/");
      router.refresh(); // Обновляем данные сервера
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Выход через Next.js API Route
      await fetch("/api/auth/logout", {
        method: "POST",
      });
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
      router.refresh(); // Обновляем данные сервера
    }
  };

  const refreshUser = async () => {
    try {
      // Получаем актуальные данные пользователя через Next.js API Route
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const user = await response.json();

      setAuthState((prev) => ({
        ...prev,
        user,
        isAuthenticated: true,
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
