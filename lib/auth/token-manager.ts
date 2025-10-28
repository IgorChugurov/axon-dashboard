/**
 * Token Manager - централизованное управление токенами
 * Работает ТОЛЬКО в Route Handler контексте
 */

import { getAuthTokens, isTokenExpired } from "./utils";
import { AuthTokens } from "./types";

class TokenManager {
  private refreshPromise: Promise<AuthTokens | null> | null = null;
  private isRefreshing = false;

  /**
   * Получение валидных токенов с автоматическим обновлением
   * Предотвращает гонку запросов - если уже идет refresh, ждет его завершения
   */
  async getValidTokens(): Promise<AuthTokens | null> {
    try {
      // 1. Читаем текущие токены
      const tokens = await getAuthTokens();

      console.log("[TokenManager] Current tokens check:", {
        hasTokens: !!tokens,
        hasAccessToken: tokens?.accessToken ? "YES" : "NO",
        hasRefreshToken: tokens?.refreshToken ? "YES" : "NO",
        expiresAt: tokens?.expiresAt,
        isExpired: tokens ? isTokenExpired(tokens.expiresAt) : "N/A",
      });

      // 2. Если токенов нет - возвращаем null
      if (!tokens) {
        console.log("[TokenManager] No tokens found");
        return null;
      }

      // 3. Проверяем истечение access token
      if (!isTokenExpired(tokens.expiresAt)) {
        console.log("[TokenManager] Access token is valid");
        return tokens;
      }

      // 4. Access token истек - обновляем
      console.log("[TokenManager] Access token expired, refreshing...");
      return await this.refreshTokens();
    } catch (error) {
      console.error("[TokenManager] Error getting valid tokens:", error);
      return null;
    }
  }

  /**
   * Обновление токенов с предотвращением гонки запросов
   */
  async refreshTokens(): Promise<AuthTokens | null> {
    // Если уже идет обновление - ждем его завершения
    if (this.isRefreshing && this.refreshPromise) {
      console.log("[TokenManager] Refresh already in progress, waiting...");
      return await this.refreshPromise;
    }

    // Начинаем новое обновление
    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      // Сбрасываем флаги после завершения
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Выполнение обновления токенов через Route Handler
   */
  private async performRefresh(): Promise<AuthTokens | null> {
    try {
      console.log("[TokenManager] Performing token refresh...");

      // Вызываем Route Handler который МОЖЕТ устанавливать cookies
      // В серверном контексте нужен полный URL
      const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const newTokens: AuthTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        };

        console.log("[TokenManager] Tokens refreshed successfully");
        return newTokens;
      } else {
        console.log("[TokenManager] Token refresh failed:", response.status);
        return null;
      }
    } catch (error) {
      console.error("[TokenManager] Error during refresh:", error);
      return null;
    }
  }

  /**
   * Проверка наличия refresh token
   */
  async hasRefreshToken(): Promise<boolean> {
    try {
      const tokens = await getAuthTokens();
      return !!tokens?.refreshToken;
    } catch {
      return false;
    }
  }

  /**
   * Сброс состояния (для тестирования)
   */
  reset(): void {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
