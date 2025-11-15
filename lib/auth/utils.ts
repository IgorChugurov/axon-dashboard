/**
 * Утилиты для работы с токенами и cookies
 * Включает как чтение, так и запись cookies (только в Route Handler контексте)
 */

import { cookies } from "next/headers";
import { User } from "./types";

const COOKIE_NAMES = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER_DATA: "userData",
} as const;

/**
 * Получение токенов из cookies (только чтение)
 */
export async function getAuthTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

    console.log("[Utils] Reading cookies:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    if (!accessToken && !refreshToken) {
      console.log("[Utils] Incomplete token set, returning null");
      return null;
    }

    return {
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
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
 * Установка access token в httpOnly cookie (только в Route Handler контексте)
 */
export async function setAccessTokenCookie(accessToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 минут
    path: "/",
  });

  console.log("[Utils] Access token cookie set");
}

/**
 * Установка refresh token в httpOnly cookie (только в Route Handler контексте)
 */
export async function setRefreshTokenCookie(
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 дней
    path: "/",
  });

  console.log("[Utils] Refresh token cookie set");
}

/**
 * Очистка всех auth cookies (только в Route Handler контексте)
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  Object.values(COOKIE_NAMES).forEach((cookieName) => {
    cookieStore.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  });

  console.log("[Utils] Auth cookies cleared");
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
