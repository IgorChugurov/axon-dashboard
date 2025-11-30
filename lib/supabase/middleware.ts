/**
 * Supabase клиент для Middleware
 *
 * НАЗНАЧЕНИЕ:
 * - Обновляет сессию пользователя на каждый запрос
 * - Автоматически обновляет истекшие access токены через refresh token
 * - Синхронизирует обновленные cookies с браузером
 *
 * ПОЧЕМУ ТАК ДЕЛАЕМ:
 * В Next.js (особенно с SSR/middleware) нужно проверять сессию на сервере,
 * потому что:
 * 1. Access token может истечь между запросами браузера
 * 2. Браузер не может обновить token самостоятельно на сервере (CORS, безопасность)
 * 3. Middleware - идеальное место для этого: срабатывает на КАЖДЫЙ запрос
 *
 * КАК SUPABASE ЗАЩИЩАЕТ ОТ RACE CONDITIONS:
 * - Если несколько запросов приходят почти одновременно с истекшим токеном
 * - Supabase позволяет повторить refresh token в течение 10 секунд (reuse interval)
 * - Все запросы получат новый access token, но видят как обновление одного токена
 * - Это предотвращает рассмотрение ситуации как "компрометирована сессия"
 *
 * ОСНОВАНИЕ:
 * Это official Best Practice от Supabase для Next.js с SSR
 * Документация: https://supabase.com/docs/guides/auth/server-side-auth
 */
/**
 * getUser() - основной метод Supabase для проверки сессии
 *
 * ЧТО ОН ДЕЛАЕТ:
 * 1. Читает access token из cookies
 * 2. Проверяет его валидность
 * 3. ЕСЛИ TOKEN ИСТЕК:
 *    - Берет refresh token
 *    - Отправляет запрос к Supabase API: "дай мне новый access token"
 *    - Получает новый access token
 *    - Вызывает setAll() чтобы обновить cookies (через функцию выше)
 * 4. Возвращает объект user или null если не авторизован
 *
 * ЭТО АВТОМАТИЧЕСКОЕ - нам не нужно писать логику обновления токена!
 * Supabase встроенный механизм autoRefreshToken делает это
 *
 * RACE CONDITIONS:
 * Если 100 запросов придут одновременно с истекшим токеном:
 * - Supabase реuse interval (10 сек) позволит всем использовать тот же refresh token
 * - Все 100 запросов получат валидный access token
 * - Никто не будет рассмотрен как атакующий
 * - (в high-load можно добавить дедупликацию, но для стартапа не нужно)
 */

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./types";

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    data: { user },
  } = await supabase.auth.getUser();
  console.log("user", user?.email);

  return { response, user };
}
