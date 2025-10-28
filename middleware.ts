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

  // Проверяем наличие accessToken ИЛИ refreshToken
  const accessToken = request.cookies.get("accessToken");
  const refreshToken = request.cookies.get("refreshToken");

  // Если нет ни одного токена, очищаем все auth cookies и редиректим на логин
  if (!accessToken && !refreshToken) {
    const response = NextResponse.redirect(new URL("/login", request.url));

    // Очищаем все auth cookies при редиректе
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    response.cookies.delete("userData");
    response.cookies.delete("expiresAt");

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
