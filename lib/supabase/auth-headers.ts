/**
 * Server-only функции для работы с авторизацией через headers
 *
 * ВАЖНО: Этот файл использует next/headers и может быть импортирован
 * ТОЛЬКО в Server Components или Server Actions
 */

import { headers } from "next/headers";
import { User, UserRole } from "@/lib/auth/types";

/**
 * Получение пользователя из headers (установленных middleware)
 * Используется в Server Components для избежания повторных запросов
 *
 * Middleware устанавливает headers:
 * - x-user-id: ID пользователя
 * - x-user-role: роль пользователя
 * - x-user-email: email пользователя
 * - x-user-first-name: имя пользователя (опционально)
 * - x-user-last-name: фамилия пользователя (опционально)
 * - x-user-avatar: аватар пользователя (опционально)
 *
 * Если headers нет (публичный маршрут), возвращает null
 */
export async function getServerUserFromHeaders(): Promise<User | null> {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const userRole = headersList.get("x-user-role") as UserRole | null;
    const userEmail = headersList.get("x-user-email");
    const firstName = headersList.get("x-user-first-name");
    const lastName = headersList.get("x-user-last-name");
    const avatar = headersList.get("x-user-avatar");

    // Если headers нет - значит это публичный маршрут или неавторизованный пользователь
    // Возвращаем null, не делаем fallback
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      email: userEmail || "",
      role: userRole || "user",
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      avatar: avatar || undefined,
    };
  } catch (error) {
    console.error("[Auth] Error reading from headers:", error);
    return null;
  }
}
