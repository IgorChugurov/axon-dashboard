/**
 * Утилиты для чтения и проверки токенов
 * НЕ модифицируют cookies - только чтение!
 */

import { cookies } from "next/headers";
import { AuthTokens, User } from "./types";

const COOKIE_NAMES = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER_DATA: "userData",
  EXPIRES_AT: "expiresAt",
} as const;

/**
 * Получение токенов из cookies (только чтение)
 */
export async function getAuthTokens(): Promise<AuthTokens | null> {
  try {
    const cookieStore = await cookies();
    //console.log("cookieStore:", cookieStore);
    const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
    const expiresAtStr = cookieStore.get(COOKIE_NAMES.EXPIRES_AT)?.value;

    console.log("[Utils] Reading cookies:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasExpiresAt: !!expiresAtStr,
    });

    if (!accessToken || !refreshToken || !expiresAtStr) {
      console.log("[Utils] Incomplete token set, returning null");
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: parseInt(expiresAtStr, 10),
    };
  } catch (error) {
    console.error("[Utils] Error reading tokens:", error);
    return null;
  }
}

/**
 * Получение данных пользователя из cookies
 */
export async function getAuthUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get(COOKIE_NAMES.USER_DATA)?.value;

    if (!userData) {
      return null;
    }

    return JSON.parse(userData);
  } catch (error) {
    console.error("[Utils] Error reading user:", error);
    return null;
  }
}

/**
 * Проверка истечения токена
 */
export function isTokenExpired(expiresAt: number): boolean {
  const now = Date.now() / 1000;
  // Добавляем буфер 10 секунд
  return expiresAt <= now + 800;
}

/**
 * Проверка наличия refresh token
 */
export async function hasRefreshToken(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
    return !!refreshToken;
  } catch {
    return false;
  }
}

/**
 * Простая проверка наличия токенов без валидации
 */
export async function hasAnyToken(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
    return !!(accessToken || refreshToken);
  } catch {
    return false;
  }
}
