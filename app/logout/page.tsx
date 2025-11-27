"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearCurrentProjectCookie } from "@/lib/projects/cookies";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Очищаем куку проекта на клиенте
        clearCurrentProjectCookie();
        
        // Выход через Next.js API Route
        await fetch("/api/auth/logout", {
          method: "POST",
        });
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        // Перенаправляем на страницу логина
        router.push("/login");
        router.refresh(); // Обновляем серверное состояние
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Выход из системы...</p>
      </div>
    </div>
  );
}
