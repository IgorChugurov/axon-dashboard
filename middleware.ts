import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getUserRoleCached } from "@/lib/auth/roles";

/**
 * Next.js Middleware
 *
 * Выполняется на каждом запросе перед рендерингом страницы.
 *
 * Основные задачи:
 * 1. Обновление сессии Supabase (автоматическое обновление токенов)
 * 2. Проверка авторизации пользователя
 * 3. Проверка ролей и прав доступа
 * 4. Редиректы для неавторизованных или ограниченных пользователей
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Публичные маршруты - не требуют авторизации
  const publicRoutes = [
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
  // Вызываем updateSession() для:
  // - Автоматического обновления токенов если они истекли
  // - Получения объекта user для проверки авторизации
  // updateSession() возвращает:
  // - response: NextResponse с обновленными cookies
  // - user: объект пользователя или null если не авторизован
  const { response, user } = await updateSession(request);
  //console.log("user", user);

  // ============================================================================
  // ШАГ 2: Публичные маршруты
  // ============================================================================
  // Для публичных маршрутов проверяем особые случаи
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
  // Если пользователь не авторизован (user === null),
  // редиректим на страницу логина с сохранением URL для возврата
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    const loginResponse = NextResponse.redirect(redirectUrl);
    loginResponse.headers.set("x-pathname", pathname);
    return loginResponse;
  }

  // ============================================================================
  // ШАГ 4: Проверка ролей и прав доступа
  // ============================================================================
  // Получаем роль пользователя из базы данных
  // Используем кешированную версию для производительности
  const userRole = await getUserRoleCached(user.id);

  // Если обычный пользователь (role: "user") пытается попасть в админ-панель,
  // редиректим его на страницу /welcome (для обычных пользователей)
  if (userRole === "user" && !pathname.startsWith("/welcome")) {
    const welcomeUrl = new URL("/welcome", request.url);
    const welcomeResponse = NextResponse.redirect(welcomeUrl);
    welcomeResponse.headers.set("x-pathname", pathname);
    return welcomeResponse;
  }

  // ============================================================================
  // ШАГ 5: Успешная авторизация
  // ============================================================================
  // Пользователь авторизован и имеет необходимые права
  // Пропускаем запрос дальше
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
