import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthTokens, User } from "./types";

const COOKIE_NAMES = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER_DATA: "userData",
  EXPIRES_AT: "expiresAt",
} as const;

export class ServerAuth {
  // Получение токенов из cookies на сервере
  static async getTokens(): Promise<AuthTokens | null> {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
      const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
      const expiresAt = cookieStore.get(COOKIE_NAMES.EXPIRES_AT)?.value;

      if (!accessToken || !refreshToken || !expiresAt) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10),
      };
    } catch (error) {
      console.error("Error getting tokens from server cookies:", error);
      return null;
    }
  }

  // Проверка истечения токена
  static async isTokenExpired(): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens) return true;

    const now = Date.now() / 1000; // Время в секундах
    // Добавляем буфер в 10 секунд для предотвращения edge cases
    // Если до истечения осталось меньше 10 секунд - считаем токен истекшим
    const isExpired = tokens.expiresAt <= now + 10;

    if (isExpired) {
      console.log("[ServerAuth] Token expired:", {
        expiresAt: tokens.expiresAt,
        now: now,
        diff: tokens.expiresAt - now,
      });
    }

    return isExpired;
  }

  // Обновление токенов - только для API Routes
  static async refreshTokens(): Promise<AuthTokens | null> {
    const tokens = await this.getTokens();
    if (!tokens?.refreshToken) {
      console.log("[ServerAuth] No refresh token available");
      return null;
    }

    try {
      console.log("[ServerAuth] Refreshing tokens...");

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "https://dummyjson.com"
        }/api/authentication/refresh-tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        }
      );

      if (!response.ok) {
        console.error("[ServerAuth] Refresh failed:", response.status);
        return null;
      }

      const data = await response.json();

      // Ваш бэкенд возвращает: { accessToken, refreshToken, exp, email }
      // exp - это Unix timestamp в СЕКУНДАХ
      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.exp, // Используем exp напрямую из ответа (уже в секундах)
      };

      console.log("[ServerAuth] Tokens refreshed successfully:", {
        expiresAt: newTokens.expiresAt,
        now: Date.now() / 1000,
        timeLeft: newTokens.expiresAt - Date.now() / 1000,
      });

      // Сохраняем новые токены и данные пользователя
      await this.setTokens(newTokens);

      if (data.email) {
        await this.setUser({ email: data.email });
      }

      return newTokens;
    } catch (error) {
      console.error("[ServerAuth] Error refreshing tokens:", error);
      return null;
    }
  }

  // Сохранение токенов в cookies
  static async setTokens(tokens: AuthTokens): Promise<void> {
    try {
      const cookieStore = await cookies();

      // Access token - короткий срок жизни
      cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 минут
        path: "/",
      });

      // Refresh token - длинный срок жизни
      cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 дней
        path: "/",
      });

      // Время истечения
      cookieStore.set(COOKIE_NAMES.EXPIRES_AT, tokens.expiresAt.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 дней
        path: "/",
      });
    } catch (error) {
      console.error("Error setting tokens in server cookies:", error);
    }
  }

  // Получение данных пользователя
  static async getUser(): Promise<User | null> {
    try {
      const cookieStore = await cookies();
      const userData = cookieStore.get(COOKIE_NAMES.USER_DATA)?.value;

      if (!userData) {
        return null;
      }

      return JSON.parse(userData);
    } catch (error) {
      console.error("Error getting user from server cookies:", error);
      return null;
    }
  }

  // Сохранение данных пользователя
  static async setUser(user: User): Promise<void> {
    try {
      const cookieStore = await cookies();
      console.log("user", user, COOKIE_NAMES.USER_DATA);
      cookieStore.set(COOKIE_NAMES.USER_DATA, JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 дней
        path: "/",
      });
    } catch (error) {
      console.error("Error setting user in server cookies:", error);
    }
  }

  // Очистка всех cookies авторизации
  static async clearAuth(): Promise<void> {
    try {
      const cookieStore = await cookies();

      Object.values(COOKIE_NAMES).forEach((cookieName) => {
        cookieStore.delete(cookieName);
      });
    } catch (error) {
      console.error("Error clearing auth cookies:", error);
    }
  }

  // Простая проверка авторизации - только чтение cookies
  static async checkAuth(): Promise<{
    user: User | null;
    isAuthenticated: boolean;
  }> {
    try {
      // Проверяем наличие токенов
      const tokens = await this.getTokens();
      if (!tokens) {
        return { user: null, isAuthenticated: false };
      }

      // Получаем данные пользователя из cookies
      const user = await this.getUser();
      if (!user) {
        return { user: null, isAuthenticated: false };
      }

      return { user, isAuthenticated: true };
    } catch (error) {
      console.error("Error in checkAuth:", error);
      return { user: null, isAuthenticated: false };
    }
  }

  // Проверка авторизации с редиректом
  static async requireAuth(): Promise<User | null> {
    const { user, isAuthenticated } = await this.checkAuth();

    if (!isAuthenticated || !user) {
      redirect("/login");
    }

    return user;
  }
}
