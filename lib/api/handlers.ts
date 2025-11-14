/**
 * Общая логика для работы с бэкендом
 * Используется в route handlers и серверных компонентах
 */

import { getAuthTokens } from "@/lib/auth/utils";
import { ServerDataParams } from "@/lib/server-data/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiBaseUrl) {
  console.warn("[API Handlers] NEXT_PUBLIC_API_URL is not set");
}

/**
 * Построение URL к бэкенду с параметрами
 */
export function buildBackendUrl(
  entity: string,
  params?: ServerDataParams | URLSearchParams
): string {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  const url = new URL(`${apiBaseUrl}/api/${entity}`);

  if (params instanceof URLSearchParams) {
    // Если передан URLSearchParams (из request.url)
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  } else if (params) {
    // Если передан ServerDataParams
    if (params.page)
      url.searchParams.set("currentPage", params.page.toString());
    if (params.limit) url.searchParams.set("perPage", params.limit.toString());
    if (params.search) url.searchParams.set("search", params.search);
    if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
    if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
    }
  }

  return url.toString();
}

/**
 * Выполнение запроса к бэкенду с обработкой 401 и refresh токенов
 */
export async function fetchFromBackend(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    accessToken: string;
    onTokenRefresh?: (newToken: string) => void | Promise<void>;
    cookieHeader?: string; // Для передачи cookies в refresh (из route handler)
  }
): Promise<Response> {
  const {
    method = "GET",
    body,
    accessToken,
    onTokenRefresh,
    cookieHeader,
  } = options;

  // Первый запрос
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Если 401 - обновляем токен и повторяем
  if (response.status === 401 && onTokenRefresh) {
    console.log("[API Handlers] Got 401, refreshing token...");

    // Обновляем токен через callback
    const newToken = await refreshTokenAndGetNew(cookieHeader);
    if (!newToken) {
      return response; // Возвращаем оригинальный 401 ответ
    }

    // Вызываем callback для обновления токена
    await onTokenRefresh(newToken);

    // Повторяем запрос с новым токеном
    const retryResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${newToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    return retryResponse;
  }

  return response;
}

/**
 * Обновление токена через внутренний API endpoint
 * Используется в route handlers и серверных компонентах
 */
async function refreshTokenAndGetNew(
  cookieHeader?: string
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
    const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      cache: "no-store",
    });

    if (!refreshResponse.ok) {
      console.error("[API Handlers] Token refresh failed");
      return null;
    }

    const refreshData = await refreshResponse.json();
    return refreshData.accessToken || null;
  } catch (error) {
    console.error("[API Handlers] Error refreshing token:", error);
    return null;
  }
}

/**
 * Получение данных сущности с бэкенда
 * Общая логика для route handlers и серверных компонентов
 */
export async function getEntityDataFromBackend(
  entity: string,
  params?: ServerDataParams | URLSearchParams
): Promise<unknown> {
  // 1. Получаем токены из cookies
  const tokens = await getAuthTokens();
  if (!tokens) {
    throw new Error("Unauthorized");
  }

  // 2. Строим URL к бэкенду
  const backendUrl = buildBackendUrl(entity, params);
  console.log(`[API Handlers] Backend URL: ${backendUrl}`);

  // 3. Делаем запрос с обработкой refresh
  let currentToken = tokens.accessToken;
  const response = await fetchFromBackend(backendUrl, {
    accessToken: currentToken,
    onTokenRefresh: async (newToken) => {
      currentToken = newToken;
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API Handlers] Backend error: ${errorText}`);

    // Если 401 после refresh - это ошибка авторизации
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    throw new Error(`Backend request failed: ${errorText}`);
  }

  // 4. Возвращаем данные
  const data = await response.json();
  return data;
}

/**
 * Форматирование ответа от бэкенда
 */
export function formatEntityResponse(data: unknown, entity: string) {
  const responseData = data as {
    items?: unknown[];
    meta?: {
      currentPage: number;
      perPage: number;
      totalItems: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    };
  };

  return {
    data: responseData.items || data,
    pagination: responseData.meta
      ? {
          page: responseData.meta.currentPage,
          limit: responseData.meta.perPage,
          total: responseData.meta.totalItems,
          totalPages: responseData.meta.totalPages,
          hasPreviousPage: responseData.meta.hasPreviousPage,
          hasNextPage: responseData.meta.hasNextPage,
        }
      : undefined,
    config: getConfigForEntity(entity),
  };
}

/**
 * Получение конфига для сущности
 */
function getConfigForEntity(entity: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`@/config/${entity}.json`);
  } catch {
    return null;
  }
}
