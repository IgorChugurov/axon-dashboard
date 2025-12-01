/**
 * Утилиты для кэширования роли пользователя в cookies
 *
 * ОПТИМИЗАЦИЯ:
 * - Кэширует роль пользователя на 5 минут в httpOnly cookie
 * - Избегает повторных RPC-запросов к БД на каждом запросе
 * - Работает в multi-instance окружении (Next.js на нескольких серверах)
 *
 * БЕЗОПАСНОСТЬ:
 * - httpOnly: true - cookie недоступна из JavaScript
 * - secure: true - только HTTPS в production
 * - sameSite: 'lax' - защита от CSRF
 * - Валидация userId - кэш привязан к конкретному пользователю
 */

import type { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "./types";

const ROLE_CACHE_COOKIE_NAME = "x-user-role-cache";
const CACHE_TTL_SECONDS = 5 * 60; // 5 минут
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

interface RoleCacheData {
  role: UserRole;
  userId: string;
  expiresAt: number; // Unix timestamp в миллисекундах
}

/**
 * Чтение роли из кэша (cookie)
 * @param request - NextRequest объект
 * @param userId - ID текущего пользователя для валидации
 * @returns Роль пользователя или null если кэш отсутствует/истек/невалиден
 */
export function getCachedRole(
  request: NextRequest,
  userId: string
): UserRole | null {
  try {
    const cacheCookie = request.cookies.get(ROLE_CACHE_COOKIE_NAME);

    if (!cacheCookie?.value) {
      return null;
    }

    const cacheData: RoleCacheData = JSON.parse(cacheCookie.value);
    const now = Date.now();

    // Валидация: проверяем userId (защита от подмены)
    if (cacheData.userId !== userId) {
      console.log("[RoleCache] Cache invalid: userId mismatch", {
        cached: cacheData.userId,
        current: userId,
      });
      return null;
    }

    // Валидация: проверяем срок действия
    if (cacheData.expiresAt < now) {
      console.log("[RoleCache] Cache expired", {
        expiresAt: new Date(cacheData.expiresAt).toISOString(),
        now: new Date(now).toISOString(),
      });
      return null;
    }

    // Валидация: проверяем наличие роли
    if (!cacheData.role) {
      console.log("[RoleCache] Cache invalid: missing role");
      return null;
    }

    console.log("[RoleCache] Cache HIT", {
      userId,
      role: cacheData.role,
      expiresIn: Math.round((cacheData.expiresAt - now) / 1000),
    });

    return cacheData.role;
  } catch (error) {
    console.error("[RoleCache] Error reading cache:", error);
    return null;
  }
}

/**
 * Сохранение роли в кэш (cookie)
 * @param response - NextResponse объект
 * @param userId - ID пользователя
 * @param role - Роль пользователя
 */
export function setCachedRole(
  response: NextResponse,
  userId: string,
  role: UserRole
): void {
  try {
    const expiresAt = Date.now() + CACHE_TTL_MS;
    const cacheData: RoleCacheData = {
      role,
      userId,
      expiresAt,
    };

    const cookieValue = JSON.stringify(cacheData);

    response.cookies.set(ROLE_CACHE_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CACHE_TTL_SECONDS,
      path: "/",
    });

    console.log("[RoleCache] Cache SET", {
      userId,
      role,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("[RoleCache] Error setting cache:", error);
  }
}

/**
 * Очистка кэша роли (при logout или изменении роли)
 * @param response - NextResponse объект
 */
export function clearCachedRole(response: NextResponse): void {
  response.cookies.delete(ROLE_CACHE_COOKIE_NAME);
  console.log("[RoleCache] Cache CLEARED");
}
