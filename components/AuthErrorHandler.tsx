"use client";

import { useEffect } from "react";

interface AuthErrorHandlerProps {
  error: Error;
}

export default function AuthErrorHandler({ error }: AuthErrorHandlerProps) {
  useEffect(() => {
    // Принудительно перенаправляем на страницу логина с полным обновлением страницы
    // Это гарантирует, что layout перерендерится корректно
    window.location.href = "/login";
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Ошибка авторизации
        </h2>
        <p className="text-gray-600 mb-4">
          Ваша сессия истекла. Перенаправляем на страницу входа...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}
