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
    // ВАЖНО: Этот callback вызывается ТОЛЬКО если hasAccess = true
    // Это означает, что пользователь уже прошел проверку is_any_admin()
    // Поэтому даже если глобальная роль = "user" (для projectAdmin/projectSuperAdmin),
    // у пользователя есть доступ к дашборду и не нужно редиректить на /welcome

    // Редиректим на /welcome только если:
    // 1. Роль = "user" (не superAdmin)
    // 2. И пользователь пытается попасть на страницу, которая не /welcome
    // 3. НО это не должно происходить, так как hasAccess уже проверен выше

    // На самом деле, если мы дошли до этого места, значит hasAccess = true,
    // поэтому не нужно редиректить на /welcome
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
