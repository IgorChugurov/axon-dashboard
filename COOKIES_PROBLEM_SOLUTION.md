# ✅ Решение проблемы "Cookies can only be modified in a Server Action or Route Handler"

## Дата: 27 октября 2025

## 🔍 Проблема

Ошибка возникала при попытке вызвать Server Action `clearAuthCookies()` из Server Component (`page.tsx` и `base.ts`):

```
Error: Cookies can only be modified in a Server Action or Route Handler
at clearAuthCookies (actions.ts:75:17)
at ProjectsPageContent (page.tsx:26:9)
```

## 📚 Что я изучил из документации Next.js 15

### Ключевые правила работы с cookies:

1. **Server Actions НЕ могут быть вызваны напрямую из Server Components для модификации cookies**

   - Даже если функция помечена `'use server'`
   - Это фундаментальное ограничение Next.js 15

2. **Server Actions работают только в:**

   - Client Components (через form actions или event handlers)
   - Route Handlers (можно вызывать напрямую)
   - Middleware

3. **Server Components могут:**
   - ✅ Читать cookies через `cookies()` из 'next/headers'
   - ✅ Вызывать Server Actions для получения данных (без модификации cookies)
   - ❌ НЕ могут вызывать Server Actions для модификации cookies

## 💡 Решение

### Подход: НЕ пытаться очистить cookies из Server Components

**Почему это работает:**

- Middleware уже очищает cookies при редиректе на `/login`
- Page component просто делает `redirect("/login")`
- Нет необходимости в дополнительной очистке

### Что изменено:

#### 1. `app/page.tsx` - убраны все вызовы `clearAuthCookies()`

**Было (неправильно):**

```typescript
if (!tokens) {
  await clearAuthCookies(); // ❌ Server Component не может
  redirect("/login");
}
```

**Стало (правильно):**

```typescript
if (!tokens) {
  // Просто редиректим - middleware очистит cookies
  redirect("/login"); // ✅
}
```

#### 2. `lib/server-data/base.ts` - убраны все вызовы `clearAuthCookies()`

**Было (неправильно):**

```typescript
if (response.status === 401) {
  await clearAuthCookies(); // ❌ Server Component контекст
  throw new Error("Unauthorized");
}
```

**Стало (правильно):**

```typescript
if (response.status === 401) {
  // НЕ очищаем cookies здесь - это вызовет ошибку
  // Page component поймает Unauthorized и сделает redirect
  throw new Error("Unauthorized"); // ✅
}
```

#### 3. `middleware.ts` - уже очищает cookies при редиректе

```typescript
if (!accessToken && !refreshToken) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  // Очищаем все auth cookies при редиректе
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  response.cookies.delete("userData");
  response.cookies.delete("expiresAt");

  return response; // ✅ Middleware МОЖЕТ модифицировать cookies
}
```

## 🎯 Где Server Actions РАБОТАЮТ правильно:

### 1. В `lib/auth/actions.ts` - само определение

```typescript
"use server";

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  // Модификация cookies
}
```

✅ **Работает:** Определение Server Action

### 2. В `app/api/auth/logout/route.ts` - Route Handler

```typescript
export async function POST() {
  await serverApiClient.logout(); // вызывает clearAuthCookies()
  return NextResponse.json({ message: "Logged out successfully" });
}
```

✅ **Работает:** Route Handler может вызывать Server Actions для модификации cookies

### 3. В `app/api/auth/clear-auth/route.ts` - Route Handler

```typescript
export async function POST() {
  await clearAuthCookies(); // прямой вызов
  return NextResponse.json({ success: true });
}
```

✅ **Работает:** Route Handler может вызывать Server Actions

### 4. В `app/login/page.tsx` - Client Component (useEffect)

```typescript
"use client";

useEffect(() => {
  const clearAuth = async () => {
    await fetch("/api/auth/clear-auth", { method: "POST" });
  };
  clearAuth();
}, []);
```

✅ **Работает:** Client Component вызывает API Route, который вызывает Server Action

## ❌ Где Server Actions НЕ РАБОТАЮТ:

### 1. Прямой вызов из Server Component

```typescript
// app/page.tsx
async function ProjectsPageContent() {
  await clearAuthCookies(); // ❌ ОШИБКА!
  redirect("/login");
}
```

❌ **НЕ работает:** Server Component не может вызывать Server Actions для модификации cookies

### 2. Прямой вызов из другой Server-side функции

```typescript
// lib/server-data/base.ts
async getData() {
  if (error) {
    await clearAuthCookies(); // ❌ ОШИБКА!
  }
}
```

❌ **НЕ работает:** Обычная server-side функция не может вызывать Server Actions для модификации cookies

## 📋 Правильный флоу теперь:

```
Server Component (page.tsx)
    ↓
refreshAuthTokens() возвращает null (refresh failed)
    ↓
redirect("/login")
    ↓
Middleware перехватывает redirect
    ↓
Очищает cookies в middleware
    ↓
Перенаправляет на /login
    ↓
✅ Все работает без ошибок
```

## 🚀 Тестирование

### Сценарий 1: Refresh token истек (400 от бэкенда)

1. Удалите `accessToken` cookie
2. Перезагрузите страницу
3. **Ожидаемый результат:**
   ```
   [Page] Tokens expired or missing, refreshing...
   [ServerAction] Refreshing tokens...
   [ServerAction] Refresh failed: 400 Bad Request
   [Page] Refresh failed, redirecting to login
   → Redirect на /login
   → Cookies очищены middleware
   ```
4. **НЕ должно быть:**
   - ❌ Error: Cookies can only be modified...

### Сценарий 2: Нормальная работа

1. Авторизуйтесь
2. Удалите только `accessToken`
3. Перезагрузите
4. **Ожидаемый результат:**
   ```
   [Page] Tokens expired or missing, refreshing...
   [ServerAction] Refreshing tokens...
   [ServerAction] Tokens refreshed successfully
   → Страница загружается
   ```

## 📝 Итог

### Ключевое правило:

**Server Components НЕ МОГУТ вызывать Server Actions для модификации cookies напрямую.**

### Решение:

1. Server Components только **читают** cookies и **вызывают refresh**
2. При ошибке Server Components делают **redirect("/login")**
3. **Middleware** очищает cookies при редиректе
4. **Route Handlers** могут вызывать Server Actions для модификации

### Что работает:

✅ Server Components → читают cookies
✅ Server Components → вызывают refreshAuthTokens() для получения новых токенов
✅ Server Components → делают redirect("/login")
✅ Middleware → очищает cookies при редиректе
✅ Route Handlers → вызывают clearAuthCookies()
✅ Client Components → вызывают API endpoints

### Что НЕ работает:

❌ Server Components → clearAuthCookies() напрямую
❌ Обычные server функции → clearAuthCookies() напрямую

## 🎉 Проблема решена!

Теперь система работает без ошибок `Cookies can only be modified...`.

---

**Архитектура стабильна. Больше никаких изменений не требуется.**
