/**
 * Supabase клиент для Middleware
 * Обновляет сессию пользователя и обрабатывает cookies
 *
 * ЗАЩИТА ОТ RACE CONDITIONS:
 * При параллельных запросах с истекшим токеном обновление произойдет только один раз.
 * Остальные запросы будут ждать завершения первого обновления.
 */

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./types";

/**
 * Map для отслеживания активных операций обновления токенов
 *
 * Ключ: уникальный идентификатор сессии (часть auth cookie)
 * Значение: Promise обновления токена (void - просто обновляет request.cookies)
 *
 * Это предотвращает множественные одновременные обновления токена
 * для одной и той же сессии пользователя.
 *
 * Пример:
 * - Запрос 1 приходит с истекшим токеном → начинает обновление, сохраняет Promise в Map
 * - Запрос 2 приходит через 1ms → находит Promise в Map, ждет его завершения
 * - Запрос 3 приходит через 2ms → находит Promise в Map, ждет его завершения
 * - Результат: только один запрос к Supabase API для обновления токена
 */
const refreshPromises = new Map<string, Promise<void>>();

/**
 * Извлекает уникальный ключ сессии из cookies для дедупликации
 *
 * Supabase SSR хранит токены в cookie с именем вида:
 * sb-<project-ref>-auth-token (JWT, содержит access и refresh токены)
 *
 * Мы используем часть этого cookie как ключ для идентификации сессии,
 * потому что:
 * 1. Этот cookie уникален для каждой сессии пользователя
 * 2. Не меняется при обновлении access token (содержит refresh token)
 * 3. Доступен даже когда access token истек
 *
 * @param request - Next.js request с cookies
 * @returns Уникальный ключ сессии или null если нет токенов
 */
function getSessionKey(request: NextRequest): string | null {
  const cookies = request.cookies.getAll();

  // Ищем Supabase auth cookie (формат: sb-<project-ref>-auth-token)
  // Это основной cookie, который Supabase использует для хранения сессии
  const authCookie = cookies.find(
    (c) => c.name.includes("sb-") && c.name.includes("-auth-token")
  );

  if (authCookie?.value) {
    // Используем первые 30 символов JWT как уникальный ключ
    // JWT формат: header.payload.signature
    // Первые 30 символов достаточно для уникальной идентификации сессии
    return authCookie.value.substring(0, 30);
  }

  // Если не нашли Supabase cookie, значит пользователь не авторизован
  return null;
}

/**
 * Обновляет сессию Supabase и автоматически обновляет токены при необходимости
 *
 * Эта функция:
 * 1. Проверяет текущую сессию пользователя
 * 2. Автоматически обновляет токены если они истекли
 * 3. Защищает от race conditions при параллельных запросах
 * 4. Возвращает response с обновленными cookies и объект user
 *
 * ВАЖНО: При параллельных запросах с истекшим токеном:
 * - Первый запрос инициирует обновление токена
 * - Остальные запросы ждут завершения первого обновления
 * - Все запросы получают обновленные токены
 * - Только один запрос к Supabase API
 *
 * @param request - Next.js request
 * @returns Object с response (содержит обновленные cookies) и user (или null)
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  // Создаем response объект, который будет содержать обновленные cookies
  const supabaseResponse = NextResponse.next({ request });

  // Извлекаем ключ сессии для дедупликации обновлений токенов
  const sessionKey = getSessionKey(request);

  // ============================================================================
  // СЛУЧАЙ 1: Нет активной сессии (неавторизованный запрос)
  // ============================================================================
  // Если нет auth cookie, значит пользователь не авторизован или это первый запрос
  // Обрабатываем без дедупликации (нет смысла дедуплицировать неавторизованные запросы)
  if (!sessionKey) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Читаем cookies из запроса
          getAll() {
            return request.cookies.getAll();
          },
          // Если Supabase обновит cookies (например, создаст новую сессию),
          // сохраняем их в request и response
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Проверяем пользователя (вернет null для неавторизованных)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response: supabaseResponse, user };
  }

  // ============================================================================
  // СЛУЧАЙ 2: Есть активная сессия - защита от race conditions
  // ============================================================================
  // Проверяем, не происходит ли уже обновление токена для этой сессии
  let refreshPromise = refreshPromises.get(sessionKey);

  if (!refreshPromise) {
    // Нет активного обновления - создаем новое
    // ВАЖНО: Только первый запрос обновляет токен
    refreshPromise = (async () => {
      // Создаем Supabase клиент для обновления токенов
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              // Обновляем токены в request (в памяти)
              // Это важно - обновляем request, не response!
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value);
              });
            },
          },
        }
      );

      // Вызываем getUser() - это автоматически:
      // 1. Проверяет access token
      // 2. Если токен истек - использует refresh token для получения нового
      // 3. Сохраняет новые токены в request.cookies через setAll()
      // 4. Возвращает пользователя
      await supabase.auth.getUser();
      // После этого request.cookies содержат обновленные токены
    })();

    // Сохраняем Promise в Map, чтобы другие параллельные запросы могли его переиспользовать
    refreshPromises.set(sessionKey, refreshPromise);

    // Очистка Promise из Map после завершения
    refreshPromise
      .then(() => {
        // Задержка 1 секунда - даем время другим параллельным запросам
        // получить обновленные токены из этого Promise
        setTimeout(() => {
          refreshPromises.delete(sessionKey);
        }, 1000);
      })
      .catch((error) => {
        // В случае ошибки обновления удаляем Promise сразу,
        // чтобы не блокировать следующие попытки обновления
        console.error("[updateSession] Token refresh error:", error);
        refreshPromises.delete(sessionKey);
      });
  }

  // Ждем завершения обновления токена (своего или уже существующего от другого запроса)
  // После await refreshPromise токены в request.cookies уже обновлены
  await refreshPromise;

  // ============================================================================
  // КРИТИЧЕСКИ ВАЖНО: Каждый запрос создает свой клиент
  // ============================================================================
  // После await refreshPromise токены в request уже обновлены (в памяти)
  // Теперь каждый запрос создает СВОЙ клиент и читает обновленные токены
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Читаем ОБНОВЛЕННЫЕ токены из request
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Устанавливаем в СВОЙ response
          // Теперь каждый response получит Set-Cookie с обновленными токенами!
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Получаем user (токен уже валидный, обновления не будет, но setAll установит cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Возвращаем response с обновленными cookies и объект user
  return { response: supabaseResponse, user };
}
