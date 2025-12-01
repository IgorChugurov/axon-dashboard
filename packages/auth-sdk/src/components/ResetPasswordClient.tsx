/**
 * Клиентский компонент для сброса и обновления пароля
 * Обрабатывает токены восстановления из email и показывает соответствующие формы
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ResetPasswordForm, UpdatePasswordForm } from "./index";
import { useAuth } from "../client/auth-provider";
import { createBrowserSupabaseClient } from "../client/supabase-client";

interface ResetPasswordClientProps {
  /**
   * Callback, вызываемый после успешного обновления пароля
   * Может использоваться для очистки кук проекта или другой постобработки
   */
  onPasswordUpdated?: () => void | Promise<void>;

  /**
   * URL для редиректа после успешного обновления пароля
   * @default "/login?passwordUpdated=true"
   */
  redirectToAfterUpdate?: string;

  /**
   * URL Supabase проекта (если не указан, берется из NEXT_PUBLIC_SUPABASE_URL)
   */
  supabaseUrl?: string;

  /**
   * Anon ключ Supabase (если не указан, берется из NEXT_PUBLIC_SUPABASE_ANON_KEY)
   */
  supabaseAnonKey?: string;
}

export function ResetPasswordClient({
  onPasswordUpdated,
  redirectToAfterUpdate = "/login?passwordUpdated=true",
  supabaseUrl,
  supabaseAnonKey,
}: ResetPasswordClientProps = {}) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword, updatePassword, isLoading } = useAuth();
  const isProcessingRef = useRef(true);

  // Получаем URL и ключ Supabase из props или env переменных
  const supabaseUrlValue = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKeyValue =
    supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Проверяем наличие токена в URL (из письма Supabase)
  // Supabase может передавать токен через query параметры (code) или через hash (access_token)
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const code = searchParams.get("code"); // PKCE code для password reset
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);

  useEffect(() => {
    const checkRecoveryToken = async () => {
      // Supabase обрабатывает токен на своем домене и редиректит на наш URL
      // Токен может передаваться через:
      // 1. Hash: #access_token=...&type=recovery (автоматически обрабатывается Supabase)
      // 2. Query: ?code=...&type=recovery (нужно обработать через exchangeCodeForSession)
      let hasRecoveryFlow = false;
      let subscription: { unsubscribe: () => void } | null = null;

      if (typeof window !== "undefined") {
        // Проверяем hash в URL (основной способ для password reset)
        const hash = window.location.hash;

        // Проверяем наличие токена в hash
        if (hash) {
          // Парсим hash для проверки наличия токена
          const hashParams = new URLSearchParams(hash.substring(1)); // Убираем #
          const accessToken = hashParams.get("access_token");
          const hashType = hashParams.get("type");

          if (hashType === "recovery" || accessToken) {
            hasRecoveryFlow = true;
          }
        }
      }

      // Проверяем query параметры (если пришли через callback или code)
      if (code) {
        // Есть code параметр - нужно обработать через exchangeCodeForSession
        hasRecoveryFlow = true;
      } else if (token && type === "recovery") {
        hasRecoveryFlow = true;
      }

      if (hasRecoveryFlow) {
        setHasRecoveryToken(true);

        try {
          const supabase = createBrowserSupabaseClient(
            supabaseUrlValue,
            supabaseAnonKeyValue
          );

          // ============================================================================
          // ОБРАБОТКА CODE ПАРАМЕТРА (PKCE flow)
          // ============================================================================
          // ПРИМЕЧАНИЕ: code может быть уже обработан в middleware
          // Сначала проверяем, есть ли уже сессия
          if (code) {
            // Сначала проверяем, есть ли уже сессия (возможно, обработана в middleware)
            const {
              data: { session: existingSession },
              error: existingError,
            } = await supabase.auth.getSession();

            if (existingSession && existingSession.user && !existingError) {
              setHasRecoveryToken(true);
              setIsProcessingToken(false);
              isProcessingRef.current = false;
              return;
            }

            // Если сессии нет, обрабатываем code на клиенте
            try {
              const { data, error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(code);

              if (exchangeError) {
                console.error(
                  "[Reset Password Client] Error exchanging code:",
                  exchangeError
                );
                setError(
                  "Invalid or expired reset link. Please request a new one."
                );
                setHasRecoveryToken(false);
                setIsProcessingToken(false);
                isProcessingRef.current = false;
                return;
              }

              if (data.session && data.user) {
                setHasRecoveryToken(true);
                setIsProcessingToken(false);
                isProcessingRef.current = false;
                return;
              }
            } catch (err) {
              console.error(
                "[Reset Password Client] Exception exchanging code:",
                err
              );
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to process reset link. Please try again."
              );
              setHasRecoveryToken(false);
              setIsProcessingToken(false);
              isProcessingRef.current = false;
              return;
            }
          }

          // ============================================================================
          // ОБРАБОТКА HASH (access_token в hash)
          // ============================================================================
          // ВАЖНО: Supabase автоматически обрабатывает токен из hash при создании клиента
          // Но нужно дать время на обработку. Проверяем сессию после небольшой задержки
          if (typeof window !== "undefined" && window.location.hash) {
            const hash = window.location.hash;
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get("access_token");
            const hashType = hashParams.get("type");

            // Если есть access_token в hash, Supabase должен обработать его автоматически
            // Но иногда нужно явно вызвать getSession() чтобы триггернуть обработку
            if (accessToken && hashType === "recovery") {
              // Даем Supabase время обработать hash
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          // Проверяем сессию напрямую (может быть уже установлена после обработки hash или code)
          const {
            data: { session: initialSession },
            error: initialError,
          } = await supabase.auth.getSession();

          if (initialSession && !initialError && initialSession.user) {
            // Сессия уже установлена (токен обработан Supabase автоматически из hash или code)
            setHasRecoveryToken(true);
            setIsProcessingToken(false);
            isProcessingRef.current = false;
            return;
          }

          // Если сессии нет, подписываемся на изменения авторизации
          // Supabase автоматически обрабатывает токен из hash при создании клиента
          const {
            data: { subscription: authSubscription },
          } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (
              event === "PASSWORD_RECOVERY" ||
              event === "SIGNED_IN" ||
              (event === "TOKEN_REFRESHED" && session)
            ) {
              // Токен обработан, сессия установлена
              const {
                data: { session: currentSession },
                error: sessionError,
              } = await supabase.auth.getSession();

              if (sessionError || !currentSession) {
                console.error(
                  "[Reset Password Client] Session error:",
                  sessionError
                );
                setError(
                  "Invalid or expired reset link. Please request a new one."
                );
                setHasRecoveryToken(false);
              } else {
                // Сессия установлена, можно показывать форму
                setHasRecoveryToken(true);
              }
              setIsProcessingToken(false);
              isProcessingRef.current = false;
              if (authSubscription) {
                authSubscription.unsubscribe();
              }
            }
          });

          subscription = authSubscription;

          // Таймаут на случай, если токен невалидный или обработка затягивается
          const timeoutId = setTimeout(() => {
            if (isProcessingRef.current) {
              setError(
                "Invalid or expired reset link. Please request a new one."
              );
              setHasRecoveryToken(false);
              setIsProcessingToken(false);
              isProcessingRef.current = false;
              if (subscription) {
                subscription.unsubscribe();
              }
            }
          }, 10000);

          // Очистка при размонтировании
          return () => {
            clearTimeout(timeoutId);
            if (subscription) {
              subscription.unsubscribe();
            }
          };
        } catch (err) {
          console.error("[Reset Password Client] Error:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to process reset link. Please try again."
          );
          setHasRecoveryToken(false);
          setIsProcessingToken(false);
          isProcessingRef.current = false;
        }
      } else {
        setIsProcessingToken(false);
        isProcessingRef.current = false;
      }
    };

    checkRecoveryToken();
  }, [token, type, code, supabaseUrlValue, supabaseAnonKeyValue]);

  const handleResetPassword = async (email: string) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reset password email. Please try again."
      );
    }
  };

  const handleUpdatePassword = async (password: string) => {
    setError(null);
    try {
      await updatePassword(password);

      // ВАЖНО: После успешного обновления пароля Supabase автоматически создает новую обычную сессию
      // Recovery сессия превращается в обычную сессию с полными правами доступа
      // Для безопасности мы делаем signOut, чтобы пользователь залогинился заново с новым паролем
      const supabase = createBrowserSupabaseClient(
        supabaseUrlValue,
        supabaseAnonKeyValue
      );

      // Выходим из сессии (которая уже стала обычной после updatePassword)
      await supabase.auth.signOut();

      // Вызываем callback для постобработки (например, очистка кук проекта)
      if (onPasswordUpdated) {
        await onPasswordUpdated();
      }

      // Редиректим на логин с сообщением об успехе
      setTimeout(() => {
        router.push(redirectToAfterUpdate);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update password. Please try again."
      );
    }
  };

  if (isProcessingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Processing reset link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {hasRecoveryToken ? (
          <UpdatePasswordForm
            onUpdatePassword={handleUpdatePassword}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <ResetPasswordForm
            onResetPassword={handleResetPassword}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
