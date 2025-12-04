/**
 * Middleware функция для Next.js
 * Обновляет сессию Supabase и проверяет авторизацию
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { transformSupabaseUser } from "../utils/transform";
import { getUserRoleWithCache } from "./role-service";
import type { User, MiddlewareConfig } from "../types";

/**
 * Результат обновления сессии
 */
export interface UpdateSessionResult {
  response: NextResponse;
  user: User | null;
  supabaseUser: SupabaseUser | null;
}

/**
 * Обновление сессии Supabase в middleware
 * Автоматически обновляет истекшие токены
 */
export async function updateSession(
  request: NextRequest,
  config: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  }
): Promise<UpdateSessionResult> {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = transformSupabaseUser(supabaseUser);

  return { response, user, supabaseUser };
}

/**
 * Создание middleware функции для Next.js
 * @param config - Конфигурация middleware
 * @returns Функция middleware для Next.js
 */
export function createAuthMiddleware(config: MiddlewareConfig) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const pathname = request.nextUrl.pathname;

    // Публичные маршруты - не требуют авторизации
    const publicRoutes = config.publicRoutes || [
      "/login",
      "/signup",
      "/auth/callback",
      "/welcome",
      "/api/auth/",
      "/_next/",
      "/favicon.ico",
    ];

    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // ============================================================================
    // ШАГ 1: Обновление сессии Supabase
    // ============================================================================
    const { response, user, supabaseUser } = await updateSession(request, {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    });

    // ============================================================================
    // ШАГ 2: Публичные маршруты
    // ============================================================================
    if (isPublicRoute) {
      // Редирект авторизованных пользователей с login/signup на главную
      if (user && (pathname === "/login" || pathname === "/signup")) {
        const homeUrl = new URL("/", request.url);
        const redirectResponse = NextResponse.redirect(homeUrl);
        redirectResponse.headers.set("x-pathname", pathname);
        return redirectResponse;
      }

      response.headers.set("x-pathname", pathname);
      return response;
    }

    // ============================================================================
    // ШАГ 3: Проверка авторизации
    // ============================================================================
    // КРИТИЧНО: Проверяем не только наличие пользователя, но и валидность сессии
    // Если нет валидной сессии Supabase, но есть кука роли - это ошибка безопасности
    if (!user || !supabaseUser) {
      // Очищаем куку роли и куку проекта, если они остались без валидной сессии
      const cookieHandler = {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookies: Array<{ name: string; value: string; options?: any }>
        ) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      };

      // Очищаем куку роли (проблема безопасности)
      const { clearCachedRole } = await import("../utils/role-cache");
      clearCachedRole(cookieHandler);

      // Очищаем куку проекта (не нужна без авторизации)
      // Имя куки проекта: "currentProjectId" (хардкод, так как это внутренняя логика приложения)
      response.cookies.set("currentProjectId", "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });

      const redirectPath = config.onAuthRequired
        ? config.onAuthRequired({ url: request.url, pathname })
        : "/login";

      const redirectUrl = new URL(redirectPath, request.url);
      if (redirectPath === "/login") {
        redirectUrl.searchParams.set("redirect", pathname);
      }
      const loginResponse = NextResponse.redirect(redirectUrl);
      loginResponse.headers.set("x-pathname", pathname);
      return loginResponse;
    }

    // Дополнительная проверка: убеждаемся, что сессия валидна
    // Создаем клиент для проверки сессии
    const supabaseForSessionCheck = createServerClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { session },
      error: sessionError,
    } = await supabaseForSessionCheck.auth.getSession();

    // Если нет валидной сессии, редиректим на login
    if (!session || sessionError) {
      // Очищаем куку роли и куку проекта
      const cookieHandler = {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookies: Array<{ name: string; value: string; options?: any }>
        ) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      };
      const { clearCachedRole } = await import("../utils/role-cache");
      clearCachedRole(cookieHandler);

      // Очищаем куку проекта
      // Имя куки проекта: "currentProjectId" (хардкод, так как это внутренняя логика приложения)
      response.cookies.set("currentProjectId", "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });

      const redirectPath = config.onAuthRequired
        ? config.onAuthRequired({ url: request.url, pathname })
        : "/login";

      const redirectUrl = new URL(redirectPath, request.url);
      if (redirectPath === "/login") {
        redirectUrl.searchParams.set("redirect", pathname);
      }
      const loginResponse = NextResponse.redirect(redirectUrl);
      loginResponse.headers.set("x-pathname", pathname);
      return loginResponse;
    }

    // ============================================================================
    // ШАГ 4: Проверка ролей и прав доступа
    // ============================================================================
    // Создаем CookieHandler для работы с кэшем ролей
    const cookieHandler = {
      getAll: () => request.cookies.getAll(),
      setAll: (
        cookies: Array<{ name: string; value: string; options?: any }>
      ) => {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    };

    // Создаем Supabase клиент для получения роли
    const supabaseForRole = createServerClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Проверяем доступ к дашборду с кэшированием
    const { hasAdminAccessWithCache } = await import("./role-service");
    const hasAccess = await hasAdminAccessWithCache(
      supabaseForRole,
      user.id!,
      cookieHandler,
      config.roleCacheTtl
    );

    // Если нет доступа - редиректим на /welcome
    if (!hasAccess) {
      const welcomeUrl = new URL("/welcome", request.url);
      const welcomeResponse = NextResponse.redirect(welcomeUrl);
      welcomeResponse.headers.set("x-pathname", pathname);
      return welcomeResponse;
    }

    // Получаем роль для headers (superAdmin или user)
    const { getUserRole } = await import("./role-service");
    const userRole = await getUserRole(supabaseForRole, user.id!);

    // Устанавливаем headers для передачи данных в Server Components
    response.headers.set("x-user-id", user.id || "");
    response.headers.set("x-user-role", userRole);
    response.headers.set("x-user-email", user.email || "");

    // Передаем дополнительные поля из user_metadata
    if (user.firstName) {
      response.headers.set("x-user-first-name", user.firstName);
    }
    if (user.lastName) {
      response.headers.set("x-user-last-name", user.lastName);
    }
    if (user.avatar) {
      response.headers.set("x-user-avatar", user.avatar);
    }

    // Проверка ролей через callback (для обратной совместимости)
    if (config.onRoleCheck) {
      const roleRedirect = config.onRoleCheck(user, userRole, {
        url: request.url,
        pathname,
      });

      if (roleRedirect) {
        const redirectUrl = new URL(roleRedirect, request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        // Передаем данные и в редирект
        redirectResponse.headers.set("x-user-id", user.id || "");
        redirectResponse.headers.set("x-user-role", userRole);
        redirectResponse.headers.set("x-user-email", user.email || "");
        if (user.firstName) {
          redirectResponse.headers.set("x-user-first-name", user.firstName);
        }
        if (user.lastName) {
          redirectResponse.headers.set("x-user-last-name", user.lastName);
        }
        if (user.avatar) {
          redirectResponse.headers.set("x-user-avatar", user.avatar);
        }
        redirectResponse.headers.set("x-pathname", pathname);
        return redirectResponse;
      }
    }

    // ============================================================================
    // ШАГ 5: Успешная авторизация
    // ============================================================================
    response.headers.set("x-pathname", pathname);
    return response;
  };
}
