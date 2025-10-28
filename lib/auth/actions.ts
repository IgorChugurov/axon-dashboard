"use server";

/**
 * Server Actions для работы с cookies авторизации
 * ЕДИНСТВЕННОЕ место где cookies модифицируются
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
 * Сохранение токенов и данных пользователя в cookies
 * Вызывается после успешного логина или refresh
 */
export async function setAuthCookies(
  tokens: AuthTokens,
  user: User
): Promise<void> {
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
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  // Данные пользователя
  cookieStore.set(COOKIE_NAMES.USER_DATA, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  console.log("[ServerAction] Auth cookies set successfully");
  //await new Promise((resolve) => setTimeout(resolve, 100000));
}

/**
 * Очистка всех cookies авторизации
 * Вызывается при logout или при ошибках авторизации
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

  console.log("[ServerAction] Auth cookies cleared");
}

/**
 * Обновление токенов через refresh token
 * Вызывается когда access token истек
 */
export async function refreshAuthTokens(): Promise<AuthTokens | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      console.log("[ServerAction] No refresh token found");
      return null;
    }

    console.log("[ServerAction] Refreshing tokens...");

    // Запрос к бэкенду для обновления токенов
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/authentication/refresh-tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "[ServerAction] Refresh failed:",
        response.status,
        response.statusText,
        "URL:",
        response.url
      );
      // НЕ вызываем clearAuthCookies здесь - пусть вызывающий код решает
      return null;
    }

    const data = await response.json();
    console.log("data:", data);
    const newTokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.exp,
    };

    const user: User = {
      email: data.email,
    };

    // Сохраняем новые токены
    await setAuthCookies(newTokens, user);

    console.log("[ServerAction] Tokens refreshed successfully");

    return newTokens;
  } catch (error) {
    console.error("[ServerAction] Error refreshing tokens:", error);
    // НЕ вызываем clearAuthCookies здесь - это вызывает проблемы с вложенными Server Actions
    return null;
  }
}
