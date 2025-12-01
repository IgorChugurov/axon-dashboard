import { type NextRequest } from "next/server";
import { createAuthMiddleware } from "@/packages/auth-sdk/src/server/middleware";

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
const authMiddleware = createAuthMiddleware({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  publicRoutes: [
    "/login",
    "/logout", // Страница logout должна быть публичной
    "/signup",
    "/auth/callback",
    "/auth/reset-password",
    "/welcome",
    "/api/auth/",
    "/_next/",
    "/favicon.ico",
  ],
  onAuthRequired: ({ pathname }) => {
    // Редирект на логин с сохранением URL для возврата
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  },
  onRoleCheck: (user, role, { pathname }) => {
    // Если обычный пользователь (role: "user") пытается попасть в админ-панель,
    // редиректим его на страницу /welcome (для обычных пользователей)
    if (role === "user" && !pathname.startsWith("/welcome")) {
      return "/welcome";
    }
    return null;
  },
  roleCacheTtl: 300, // 5 минут
});

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
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
