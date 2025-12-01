/**
 * Клиентский клиент авторизации
 * Используется в Client Components
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { transformSupabaseUser } from "../utils/transform";
import type {
  User,
  LoginCredentials,
  SignUpData,
  ResetPasswordData,
  AuthResponse,
  OAuthProviderType,
} from "../types";
import { AuthenticationError, OAuthError } from "../errors";

export class ClientAuthClient {
  constructor(private supabase: SupabaseClient, private redirectTo?: string) {}

  /**
   * Вход через email/password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new AuthenticationError(error.message, error.status?.toString());
      }

      if (!data.user) {
        throw new AuthenticationError("Login failed: no user returned");
      }

      const user = transformSupabaseUser(data.user);

      if (!user) {
        throw new AuthenticationError("Failed to transform user");
      }

      return {
        user,
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        error instanceof Error ? error.message : "Login failed"
      );
    }
  }

  /**
   * Регистрация нового пользователя
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const { data: signUpData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
          emailRedirectTo: this.redirectTo
            ? `${this.redirectTo}/auth/callback`
            : undefined,
        },
      });

      if (error) {
        throw new AuthenticationError(error.message, error.status?.toString());
      }

      if (!signUpData.user) {
        throw new AuthenticationError("Sign up failed: no user returned");
      }

      const user = transformSupabaseUser(signUpData.user);

      if (!user) {
        throw new AuthenticationError("Failed to transform user");
      }

      return {
        user,
        session: signUpData.session
          ? {
              accessToken: signUpData.session.access_token,
              refreshToken: signUpData.session.refresh_token,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        error instanceof Error ? error.message : "Sign up failed"
      );
    }
  }

  /**
   * Вход через OAuth провайдера
   */
  async loginWithOAuth(provider: OAuthProviderType): Promise<void> {
    try {
      const redirectTo = this.redirectTo
        ? `${this.redirectTo}/auth/callback`
        : `${window.location.origin}/auth/callback`;

      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        // Улучшенная обработка ошибок для более понятных сообщений
        if (
          error.message.includes("provider is not enabled") ||
          error.message.includes("Unsupported provider")
        ) {
          throw new OAuthError(
            `${
              provider === "google" ? "Google" : "GitHub"
            } провайдер не включен в настройках Supabase. ` +
              `Пожалуйста, включите его в Supabase Dashboard: Authentication → Providers → ${
                provider === "google" ? "Google" : "GitHub"
              }.`,
            provider,
            error.status?.toString()
          );
        }

        throw new OAuthError(error.message, provider, error.status?.toString());
      }

      // Редирект произойдет автоматически через OAuth провайдера
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        error instanceof Error ? error.message : "OAuth authentication failed",
        provider
      );
    }
  }

  /**
   * Выход из системы
   */
  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw new AuthenticationError(error.message, error.status?.toString());
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        error instanceof Error ? error.message : "Logout failed"
      );
    }
  }

  /**
   * Отправка email для сброса пароля
   *
   * Supabase обработает токен на своем домене и редиректит на redirectTo
   * с токеном в hash (#access_token=...&type=recovery)
   * Страница /auth/reset-password обработает hash и покажет форму для ввода нового пароля
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      // Редиректим напрямую на страницу сброса пароля
      // Supabase передаст токен через hash
      const redirectTo = this.redirectTo
        ? `${this.redirectTo}/auth/reset-password`
        : `${window.location.origin}/auth/reset-password`;

      const { error } = await this.supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo,
        }
      );

      if (error) {
        throw new AuthenticationError(error.message, error.status?.toString());
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        error instanceof Error ? error.message : "Reset password failed"
      );
    }
  }

  /**
   * Обновление пароля (после сброса)
   *
   * ВАЖНО: После успешного обновления пароля Supabase автоматически создает новую обычную сессию
   * Recovery сессия превращается в обычную сессию с полными правами доступа
   *
   * @returns Обновленные данные пользователя и сессии (если успешно)
   */
  async updatePassword(newPassword: string): Promise<{
    user: User | null;
    session: any | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new AuthenticationError(error.message, error.status?.toString());
      }

      // Supabase возвращает обновленные данные пользователя и сессии
      // После обновления пароля recovery сессия превращается в обычную сессию
      // Примечание: data может содержать user и session, но TypeScript типы могут не включать session
      return {
        user: transformSupabaseUser(data.user),
        session: (data as any).session || null,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        error instanceof Error ? error.message : "Update password failed"
      );
    }
  }

  /**
   * Получение текущего пользователя
   */
  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user: supabaseUser },
      } = await this.supabase.auth.getUser();

      return transformSupabaseUser(supabaseUser);
    } catch (error) {
      console.error("[ClientAuth] Error getting user:", error);
      return null;
    }
  }

  /**
   * Получение текущей сессии
   */
  async getSession() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error("[ClientAuth] Error getting session:", error);
      return null;
    }
  }

  /**
   * Подписка на изменения авторизации
   * @param callback - Функция обратного вызова при изменении состояния
   * @returns Функция для отписки
   */
  onAuthStateChange(
    callback: (event: string, session: any) => void
  ): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Получение Supabase клиента (для внутреннего использования)
   */
  getSupabaseClient() {
    return this.supabase;
  }
}

/**
 * Создание клиентского клиента авторизации
 * @param supabase - Supabase клиент (созданный через createBrowserSupabaseClient)
 * @param redirectTo - Базовый URL для редиректов (опционально)
 * @returns ClientAuthClient
 */
export function createClientAuthClient(
  supabase: SupabaseClient,
  redirectTo?: string
): ClientAuthClient {
  return new ClientAuthClient(supabase, redirectTo);
}
