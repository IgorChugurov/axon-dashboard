import {
  AuthTokens,
  User,
  LoginCredentials,
  LoginResponse,
  ApiRequestConfig,
  ApiError,
} from "./types";
import { ServerAuth } from "./server-auth";

export class ServerApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Основной метод для выполнения запросов на сервере
  async request<T>(config: ApiRequestConfig): Promise<T> {
    const tokens = await ServerAuth.getTokens();

    if (!tokens) {
      throw new ApiError("No authentication tokens found", 401);
    }

    // Проверяем, нужно ли обновить токен
    if (await ServerAuth.isTokenExpired()) {
      const newTokens = await ServerAuth.refreshTokens();
      if (!newTokens) {
        throw new ApiError("Failed to refresh tokens", 401);
      }
    }

    const finalTokens = await ServerAuth.getTokens();
    if (!finalTokens) {
      throw new ApiError("No valid tokens available", 401);
    }

    const url = this.buildUrl(config.url, config.queryParams);
    const headers = this.buildHeaders(config.headers, finalTokens.accessToken);

    try {
      const response = await fetch(url, {
        method: config.method || "GET",
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      if (response.status === 401) {
        // Попытка обновить токен и повторить запрос
        try {
          const newTokens = await ServerAuth.refreshTokens();
          if (newTokens) {
            const newHeaders = this.buildHeaders(
              config.headers,
              newTokens.accessToken
            );
            const retryResponse = await fetch(url, {
              method: config.method || "GET",
              headers: newHeaders,
              body: config.body ? JSON.stringify(config.body) : undefined,
            });

            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch {
          throw new ApiError("Authentication failed after retry", 401);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData.code
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        0
      );
    }
  }

  // Авторизация пользователя
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/authentication/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || "Login failed",
        response.status,
        errorData.code
      );
    }

    const data: LoginResponse = await response.json();

    // Сохраняем токены и данные пользователя
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt ?? Date.now() / 1000 + 15 * 60, // 15 минут
    };

    await ServerAuth.setTokens(tokens);
    await ServerAuth.setUser({ email: data.email });

    return data;
  }

  // Получение данных текущего пользователя
  async getCurrentUser(): Promise<User> {
    return this.request<User>({
      url: "/api/users/profile",
    });
  }

  // Выход из системы
  async logout(): Promise<void> {
    try {
      const tokens = await ServerAuth.getTokens();

      if (tokens?.refreshToken) {
        await fetch(`${this.baseUrl}/api/authentication/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      // Очищаем cookies в любом случае
      await ServerAuth.clearAuth();
    }
  }

  // Построение URL с параметрами
  private buildUrl(
    url: string,
    queryParams?: Record<string, string | number>
  ): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return `${this.baseUrl}${url}`;
    }

    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      searchParams.append(key, value.toString());
    });

    return `${this.baseUrl}${url}?${searchParams.toString()}`;
  }

  // Построение заголовков
  private buildHeaders(
    customHeaders?: Record<string, string>,
    accessToken?: string
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders,
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    return headers;
  }
}

// Создание экземпляра серверного API клиента
export const serverApiClient = new ServerApiClient(
  process.env.NEXT_PUBLIC_API_URL || "https://dummyjson.com"
);
