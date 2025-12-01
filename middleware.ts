import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getUserRoleWithCache } from "@/lib/auth/roles";

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
  // Получаем роль пользователя с кэшированием (проверяет cookie, если нет - делает RPC-запрос)
  const userRole = await getUserRoleWithCache(user.id, request, response);

  // Устанавливаем headers для передачи данных в Server Components
  // Это позволяет избежать повторных запросов к Supabase и БД
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", userRole);
  response.headers.set("x-user-email", user.email || "");

  // Передаем дополнительные поля из user_metadata
  const firstName =
    user.user_metadata?.first_name ||
    user.user_metadata?.full_name?.split(" ")[0];
  const lastName =
    user.user_metadata?.last_name ||
    user.user_metadata?.full_name?.split(" ").slice(1).join(" ");
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  if (firstName) {
    response.headers.set("x-user-first-name", firstName);
  }
  if (lastName) {
    response.headers.set("x-user-last-name", lastName);
  }
  if (avatar) {
    response.headers.set("x-user-avatar", avatar);
  }

  // Если обычный пользователь (role: "user") пытается попасть в админ-панель,
  // редиректим его на страницу /welcome (для обычных пользователей)
  if (userRole === "user" && !pathname.startsWith("/welcome")) {
    const welcomeUrl = new URL("/welcome", request.url);
    const welcomeResponse = NextResponse.redirect(welcomeUrl);
    // Передаем данные и в редирект
    welcomeResponse.headers.set("x-user-id", user.id);
    welcomeResponse.headers.set("x-user-role", userRole);
    welcomeResponse.headers.set("x-user-email", user.email || "");
    if (firstName) {
      welcomeResponse.headers.set("x-user-first-name", firstName);
    }
    if (lastName) {
      welcomeResponse.headers.set("x-user-last-name", lastName);
    }
    if (avatar) {
      welcomeResponse.headers.set("x-user-avatar", avatar);
    }
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
