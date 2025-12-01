"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearCurrentProjectCookie } from "@/lib/projects/cookies";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Очищаем куку проекта на клиенте
        clearCurrentProjectCookie();

        // Выход через SDK (он сам очистит все cookies через API route)
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
        // В любом случае редиректим на логин
        router.push("/login");
        router.refresh();
      }
    };

    handleLogout();
  }, [router, logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Выход из системы...</p>
      </div>
    </div>
  );
}
