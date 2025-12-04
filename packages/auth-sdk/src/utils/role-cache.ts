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

import type { UserRole } from "../types";
import type { CookieHandler, CookieOptions } from "../types";

const ROLE_CACHE_COOKIE_NAME = "x-user-role-cache";
const ACCESS_CACHE_COOKIE_NAME = "x-user-access-cache";
const PROJECT_ROLES_CACHE_COOKIE_NAME = "x-user-project-roles-cache";
const DEFAULT_CACHE_TTL_SECONDS = 5 * 60; // 5 минут

interface RoleCacheData {
  role: UserRole;
  userId: string;
  expiresAt: number; // Unix timestamp в миллисекундах
}

interface AccessCacheData {
  hasAccess: boolean;
  userId: string;
  expiresAt: number; // Unix timestamp в миллисекундах
}

export type ProjectRole = "superAdmin" | "projectSuperAdmin" | "projectAdmin";

interface ProjectRolesCacheData {
  userId: string;
  globalRole: "superAdmin" | "user";
  projectRoles: { [projectId: string]: ProjectRole };
  expiresAt: number; // Unix timestamp в миллисекундах
}

/**
 * Чтение роли из кэша (cookie)
 * @param cookies - CookieHandler для чтения cookies
 * @param userId - ID текущего пользователя для валидации
 * @returns Роль пользователя или null если кэш отсутствует/истек/невалиден
 */
export function getCachedRole(
  cookies: CookieHandler,
  userId: string
): UserRole | null {
  try {
    const allCookies = cookies.getAll();
    const cacheCookie = allCookies.find(
      (c) => c.name === ROLE_CACHE_COOKIE_NAME
    );

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
 * @param cookies - CookieHandler для записи cookies
 * @param userId - ID пользователя
 * @param role - Роль пользователя
 * @param ttlSeconds - TTL в секундах (по умолчанию 5 минут)
 */
export function setCachedRole(
  cookies: CookieHandler,
  userId: string,
  role: UserRole,
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS
): void {
  try {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const cacheData: RoleCacheData = {
      role,
      userId,
      expiresAt,
    };

    const cookieValue = JSON.stringify(cacheData);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ttlSeconds,
      path: "/",
    };

    cookies.setAll([
      {
        name: ROLE_CACHE_COOKIE_NAME,
        value: cookieValue,
        options: cookieOptions,
      },
    ]);

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
 * @param cookies - CookieHandler для удаления cookies
 */
export function clearCachedRole(cookies: CookieHandler): void {
  try {
    cookies.setAll([
      {
        name: ROLE_CACHE_COOKIE_NAME,
        value: "",
        options: {
          maxAge: 0,
          path: "/",
        },
      },
      {
        name: ACCESS_CACHE_COOKIE_NAME,
        value: "",
        options: {
          maxAge: 0,
          path: "/",
        },
      },
      {
        name: PROJECT_ROLES_CACHE_COOKIE_NAME,
        value: "",
        options: {
          maxAge: 0,
          path: "/",
        },
      },
    ]);
    console.log("[RoleCache] Cache CLEARED");
  } catch (error) {
    console.error("[RoleCache] Error clearing cache:", error);
  }
}

/**
 * Чтение доступа из кэша (cookie)
 * @param cookies - CookieHandler для чтения cookies
 * @param userId - ID текущего пользователя для валидации
 * @returns true/false если кэш валиден, null если кэш отсутствует/истек/невалиден
 */
export function getCachedAccess(
  cookies: CookieHandler,
  userId: string
): boolean | null {
  try {
    const allCookies = cookies.getAll();
    const cacheCookie = allCookies.find(
      (c) => c.name === ACCESS_CACHE_COOKIE_NAME
    );

    if (!cacheCookie?.value) {
      return null;
    }

    const cacheData: AccessCacheData = JSON.parse(cacheCookie.value);
    const now = Date.now();

    // Валидация: проверяем userId (защита от подмены)
    if (cacheData.userId !== userId) {
      console.log("[RoleCache] Access cache invalid: userId mismatch", {
        cached: cacheData.userId,
        current: userId,
      });
      return null;
    }

    // Валидация: проверяем срок действия
    if (cacheData.expiresAt < now) {
      console.log("[RoleCache] Access cache expired", {
        expiresAt: new Date(cacheData.expiresAt).toISOString(),
        now: new Date(now).toISOString(),
      });
      return null;
    }

    console.log("[RoleCache] Access cache HIT", {
      userId,
      hasAccess: cacheData.hasAccess,
      expiresIn: Math.round((cacheData.expiresAt - now) / 1000),
    });

    return cacheData.hasAccess;
  } catch (error) {
    console.error("[RoleCache] Error reading access cache:", error);
    return null;
  }
}

/**
 * Сохранение доступа в кэш (cookie)
 * @param cookies - CookieHandler для записи cookies
 * @param userId - ID пользователя
 * @param hasAccess - Есть ли доступ к дашборду
 * @param ttlSeconds - TTL в секундах (по умолчанию 5 минут)
 */
export function setCachedAccess(
  cookies: CookieHandler,
  userId: string,
  hasAccess: boolean,
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS
): void {
  try {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const cacheData: AccessCacheData = {
      hasAccess,
      userId,
      expiresAt,
    };

    const cookieValue = JSON.stringify(cacheData);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ttlSeconds,
      path: "/",
    };

    cookies.setAll([
      {
        name: ACCESS_CACHE_COOKIE_NAME,
        value: cookieValue,
        options: cookieOptions,
      },
    ]);

    console.log("[RoleCache] Access cache SET", {
      userId,
      hasAccess,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("[RoleCache] Error setting access cache:", error);
  }
}

/**
 * Чтение ролей проектов из кэша (cookie)
 * @param cookies - CookieHandler для чтения cookies
 * @param userId - ID текущего пользователя для валидации
 * @returns Роли проектов или null если кэш отсутствует/истек/невалиден
 */
export function getCachedProjectRoles(
  cookies: CookieHandler,
  userId: string
): {
  globalRole: "superAdmin" | "user";
  projectRoles: { [projectId: string]: ProjectRole };
} | null {
  try {
    const allCookies = cookies.getAll();
    const cacheCookie = allCookies.find(
      (c) => c.name === PROJECT_ROLES_CACHE_COOKIE_NAME
    );

    if (!cacheCookie?.value) {
      return null;
    }

    const cacheData: ProjectRolesCacheData = JSON.parse(cacheCookie.value);
    const now = Date.now();

    // Валидация: проверяем userId (защита от подмены)
    if (cacheData.userId !== userId) {
      console.log("[RoleCache] Project roles cache invalid: userId mismatch", {
        cached: cacheData.userId,
        current: userId,
      });
      return null;
    }

    // Валидация: проверяем срок действия
    if (cacheData.expiresAt < now) {
      console.log("[RoleCache] Project roles cache expired", {
        expiresAt: new Date(cacheData.expiresAt).toISOString(),
        now: new Date(now).toISOString(),
      });
      return null;
    }

    console.log("[RoleCache] Project roles cache HIT", {
      userId,
      globalRole: cacheData.globalRole,
      projectCount: Object.keys(cacheData.projectRoles).length,
      expiresIn: Math.round((cacheData.expiresAt - now) / 1000),
    });

    return {
      globalRole: cacheData.globalRole,
      projectRoles: cacheData.projectRoles,
    };
  } catch (error) {
    console.error("[RoleCache] Error reading project roles cache:", error);
    return null;
  }
}

/**
 * Сохранение ролей проектов в кэш (cookie)
 * @param cookies - CookieHandler для записи cookies
 * @param userId - ID пользователя
 * @param globalRole - Глобальная роль пользователя
 * @param projectRoles - Роли пользователя в проектах
 * @param ttlSeconds - TTL в секундах (по умолчанию 5 минут)
 */
export function setCachedProjectRoles(
  cookies: CookieHandler,
  userId: string,
  globalRole: "superAdmin" | "user",
  projectRoles: { [projectId: string]: ProjectRole },
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS
): void {
  try {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const cacheData: ProjectRolesCacheData = {
      userId,
      globalRole,
      projectRoles,
      expiresAt,
    };

    const cookieValue = JSON.stringify(cacheData);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ttlSeconds,
      path: "/",
    };

    cookies.setAll([
      {
        name: PROJECT_ROLES_CACHE_COOKIE_NAME,
        value: cookieValue,
        options: cookieOptions,
      },
    ]);

    console.log("[RoleCache] Project roles cache SET", {
      userId,
      globalRole,
      projectCount: Object.keys(projectRoles).length,
      projectIds: Object.keys(projectRoles),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("[RoleCache] Error setting project roles cache:", error);
  }
}

/**
 * Очистка кэша ролей проектов (при logout или изменении роли)
 * @param cookies - CookieHandler для удаления cookies
 */
export function clearCachedProjectRoles(cookies: CookieHandler): void {
  try {
    cookies.setAll([
      {
        name: PROJECT_ROLES_CACHE_COOKIE_NAME,
        value: "",
        options: {
          maxAge: 0,
          path: "/",
        },
      },
    ]);
    console.log("[RoleCache] Project roles cache CLEARED");
  } catch (error) {
    console.error("[RoleCache] Error clearing project roles cache:", error);
  }
}
