# Исправление проблемы с редиректами при авторизации

## Проблема

При перезагрузке страницы с отсутствующим или невалидным access token и истекшим refresh token:

- Система пыталась обновить токены через `/api/authentication/refresh-tokens`
- Получала ошибку 400 (Bad Request)
- Вызывала `redirect("/login")` внутри `tryRestoreTokens()`
- **НО** исключение `NEXT_REDIRECT` перехватывалось в catch блоках
- Вместо редиректа показывались ошибки в консоли
- Пользователь оставался на странице с ошибками

## Корневая причина

Next.js использует специальное исключение для редиректов (`NEXT_REDIRECT`), которое должно всплывать без перехвата. В коде были catch блоки, которые перехватывали это исключение и просто логировали его, вместо того чтобы перебрасывать дальше.

### Проблемные места:

1. **lib/auth/server-auth.ts:getTokens()** - catch блок на строках 40-43
2. **lib/auth/server-auth.ts:tryRestoreTokens()** - делал redirect внутри служебной функции
3. **lib/server-data/base.ts:checkAuth()** - не проверял NEXT_REDIRECT
4. **app/page.tsx** - не обрабатывал ошибки авторизации

## Решение

### 1. Разделение ответственности

**До:**

```typescript
// getTokens() пытался автоматически восстанавливать токены
if (!accessToken && refreshToken) {
  return await this.tryRestoreTokens(); // Может вызвать redirect!
}
```

**После:**

```typescript
// getTokens() только читает cookies, без auto-refresh
if (accessToken && refreshToken && expiresAt) {
  return { accessToken, refreshToken, expiresAt: parseInt(expiresAt, 10) };
}
return null; // Просто возвращаем null, восстановление делается явно
```

### 2. Проверка NEXT_REDIRECT во всех catch блоках

Добавлена проверка во все catch блоки:

```typescript
catch (error) {
  // Если это NEXT_REDIRECT - перебрасываем его без изменений
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error; // Перебрасываем NEXT_REDIRECT
  }

  console.error("Error:", error);
  return null;
}
```

### 3. Перенос логики восстановления токенов

**До:** восстановление в `getTokens()` с автоматическим редиректом  
**После:** восстановление в `checkAuth()` без редиректа, редирект на уровне page

### 4. Обработка ошибок авторизации в page.tsx

Добавлен try-catch в `ProjectsPageContent`:

```typescript
async function ProjectsPageContent({ searchParams }: HomePageProps) {
  try {
    const params = parseSearchParams(await searchParams);
    const initialData = await projectsServerProvider.getProjects(params);
    return <ProjectsList initialData={initialData} />;
  } catch (error) {
    // Если ошибка авторизации - редиректим на логин
    if (
      error instanceof Error &&
      (error.message.includes("No authentication tokens found") ||
        error.message.includes("Token refresh failed"))
    ) {
      redirect("/login");
    }
    throw error;
  }
}
```

### 5. Улучшение middleware

Добавлена очистка cookies при редиректе:

```typescript
if (!accessToken && !refreshToken) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  // Очищаем все auth cookies при редиректе
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  response.cookies.delete("userData");
  response.cookies.delete("expiresAt");

  return response;
}
```

## Новый флоу авторизации

### Сценарий: Перезагрузка страницы с невалидными токенами

1. **Middleware** (первая линия защиты)

   - Проверяет наличие хотя бы одного токена
   - Если нет вообще токенов → редирект + очистка cookies
   - Если есть хоть один → пропускает дальше

2. **Page component** → `getProjects()` → `getData()` → `checkAuth()`

3. **checkAuth()** (в base.ts)

   - Вызывает `getTokens()` (только чтение)
   - Если токенов нет, читает refresh token из cookies и вызывает `refreshTokens()`
   - Если refresh не удался → возвращает ошибку (БЕЗ редиректа)
   - Если токен истек → обновляет через `refreshTokens()`
   - Возвращает валидные токены или выбрасывает ошибку

4. **page.tsx**

   - Ловит ошибку авторизации
   - Вызывает `redirect("/login")`

5. **NEXT_REDIRECT**
   - Корректно всплывает через все уровни
   - Пользователь перенаправляется на `/login`

## Файлы изменены

1. `lib/auth/server-auth.ts` - методы `getTokens()` и `tryRestoreTokens()`
2. `lib/server-data/base.ts` - метод `checkAuth()`
3. `app/page.tsx` - компонент `ProjectsPageContent`
4. `middleware.ts` - добавлена очистка cookies

## Результат

✅ При перезагрузке страницы с невалидными токенами пользователь корректно перенаправляется на `/login`  
✅ Нет ошибок `NEXT_REDIRECT` в консоли  
✅ Cookies очищаются при выходе из системы  
✅ Правильное разделение ответственности между слоями приложения  
✅ NEXT_REDIRECT исключения корректно всплывают через все уровни

## Дополнительное исправление: Очистка cookies

### Проблема

После редиректа на `/login` в cookies оставались невалидные `refreshToken` и `userData`.

### Причина

Когда `ServerAuth.clearAuth()` вызывался внутри `checkAuth()` перед выбросом ошибки, изменения cookies не всегда сохранялись из-за последующего редиректа.

### Решение

1. **Улучшен метод clearAuth()** - используется `set()` с `maxAge: 0` вместо `delete()`:

```typescript
cookieStore.set(cookieName, "", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 0, // Немедленное удаление
  path: "/",
});
```

2. **Добавлена очистка на странице логина** - при загрузке страницы вызывается API для гарантированной очистки:

```typescript
useEffect(() => {
  const clearAuth = async () => {
    await fetch("/api/auth/clear-auth", { method: "POST" });
  };
  clearAuth();
}, []);
```

### Тестирование

1. Откройте приложение в браузере
2. Если у вас невалидные токены - вы будете перенаправлены на `/login`
3. Откройте DevTools → Application → Cookies
4. Проверьте что `refreshToken`, `accessToken`, `userData`, `expiresAt` удалены

## Дата исправления

27 октября 2025

## Обновление

27 октября 2025 - Добавлена надежная очистка cookies при редиректе на логин
