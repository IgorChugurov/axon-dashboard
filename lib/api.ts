/**
 * API utility для клиентских запросов
 * Автоматически включает cookies и обрабатывает ошибки
 */

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: "include", // Важно для cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "Request failed");
  }

  return res.json();
}
