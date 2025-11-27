/**
 * Утилиты для работы с куками проекта
 * Используются для запоминания последнего выбранного проекта
 */

const COOKIE_NAME = "currentProjectId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 год

/**
 * Устанавливает куку с текущим проектом (client-side)
 */
export function setCurrentProjectCookie(projectId: string): void {
  if (typeof document === "undefined") return;
  
  document.cookie = `${COOKIE_NAME}=${projectId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Получает ID текущего проекта из куки (client-side)
 */
export function getCurrentProjectCookie(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === COOKIE_NAME) {
      return value || null;
    }
  }
  return null;
}

/**
 * Удаляет куку текущего проекта (client-side)
 */
export function clearCurrentProjectCookie(): void {
  if (typeof document === "undefined") return;
  
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Получает ID текущего проекта из cookies объекта (server-side)
 * Используется в Server Components и middleware
 */
export function getCurrentProjectFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined }
): string | null {
  const cookie = cookies.get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Имя куки для экспорта (для использования в server-side)
 */
export const PROJECT_COOKIE_NAME = COOKIE_NAME;

