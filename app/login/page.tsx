"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/packages/auth-sdk/src/components/LoginForm";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithOAuth, resetPassword, isLoading } = useAuth();

  // Проверяем ошибки и успешные сообщения из URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const passwordUpdated = searchParams.get("passwordUpdated");

    if (errorParam === "auth_failed") {
      setError("Authentication failed. Please try again.");
    }

    if (passwordUpdated === "true") {
      setSuccessMessage(
        "Password updated successfully! Please sign in with your new password."
      );
      // Очищаем параметр из URL
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const handleLogin = async (credentials: {
    email: string;
    password: string;
  }) => {
    setError(null);
    try {
      await login(credentials);
      // Редирект произойдет автоматически через AuthProvider (router.push("/"))
      // Но нужно обновить Server Components для правильного отображения layout
      const redirect = searchParams.get("redirect");
      const targetPath = redirect || "/";

      // Используем window.location для полного редиректа с обновлением Server Components
      // Это гарантирует, что middleware обработает запрос и установит правильные headers
      window.location.href = targetPath;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setError(null);
    try {
      await loginWithOAuth(provider);
      // Редирект произойдет автоматически через OAuth провайдера
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to sign in with ${provider}. Please try again.`
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {successMessage && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md">
            <p className="font-medium">{successMessage}</p>
          </div>
        )}
        <LoginForm
          onLogin={handleLogin}
          onOAuthLogin={handleOAuthLogin}
          onResetPassword={async (email) => {
            try {
              await resetPassword(email);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to send reset password email"
              );
            }
          }}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
