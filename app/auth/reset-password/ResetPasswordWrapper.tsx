"use client";

import { ResetPasswordClient } from "@igorchugurov/auth-sdk/components";
import { clearCurrentProjectCookie } from "@/lib/projects/cookies";

/**
 * Клиентская обертка для ResetPasswordClient
 * Обеспечивает очистку куки проекта после успешного обновления пароля
 */
export function ResetPasswordWrapper() {
  return (
    <ResetPasswordClient
      onPasswordUpdated={async () => {
        // Очищаем куку проекта на клиенте после успешного обновления пароля
        clearCurrentProjectCookie();
      }}
    />
  );
}
