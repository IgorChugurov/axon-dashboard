"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignUpForm } from "@igorchugurov/auth-sdk/components";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, loginWithOAuth, isLoading } = useAuth();

  const handleSignUp = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    setError(null);
    try {
      await signUp(data);
      // Если регистрация успешна и есть сессия, редирект произойдет автоматически
      // Если нужна подтверждение email, SignUpForm покажет сообщение
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    }
  };

  const handleOAuthSignUp = async (provider: "google" | "github") => {
    setError(null);
    try {
      await loginWithOAuth(provider);
      // Редирект произойдет автоматически через OAuth провайдера
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to sign up with ${provider}. Please try again.`
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <SignUpForm
          onSignUp={handleSignUp}
          onOAuthSignUp={handleOAuthSignUp}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
