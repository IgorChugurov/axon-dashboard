import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Получаем путь
  const pathname = request.nextUrl.pathname;

  // Публичные маршруты - пропускаем проверку
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/logout") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico")
  ) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  // Проверяем наличие refreshToken cookie
  const refreshToken = request.cookies.get("refreshToken");

  // ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ОТЛАДКИ
  // Если нет refreshToken, редиректим на логин
  if (!refreshToken) {
    console.log("[Middleware] No refreshToken found, pathname:", pathname);
    console.log(
      "[Middleware] Request cookies:",
      request.cookies.getAll().map((c) => c.name)
    );
    // ВРЕМЕННО ОТКЛЮЧЕНО - разрешаем проход без редиректа для отладки
    // const response = NextResponse.redirect(new URL("/login", request.url));
    // response.cookies.delete("accessToken");
    // response.cookies.delete("refreshToken");
    // response.cookies.delete("userData");
    // return response;

    // Пропускаем запрос дальше для отладки
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    response.headers.set("x-debug-no-refresh-token", "true");
    return response;
  }

  // Передаем информацию о пути в заголовках для layout.tsx
  const response = NextResponse.next();
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
