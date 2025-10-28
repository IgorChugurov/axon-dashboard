# Исправление проблемы с обновлением токенов в Next.js 15

## Проблема

При попытке обновить токены получалась ошибка:

```
Error setting tokens in server cookies: Error: Cookies can only be modified in a Server Action or Route Handler.
```

### Причина

В Next.js 15 cookies можно модифицировать **ТОЛЬКО** в:

- Server Actions
- Route Handlers
- Middleware

**НО НЕ** в Server Components!

Старый код пытался обновить токены напрямую из Server Component:

```
Page Component → getData() → checkAuth() → refreshTokens() → setTokens() ❌
```

## Решение

Разделили процесс обновления токенов на два уровня:

### 1. Метод `fetchFreshTokens()` - для Route Handlers

Получает новые токены с бэкенда БЕЗ записи в cookies:

```typescript
static async fetchFreshTokens(
  refreshToken: string
): Promise<{ tokens: AuthTokens; email?: string } | null>
```

- ✅ Делает запрос к бэкенду `/api/authentication/refresh-tokens`
- ✅ Возвращает новые токены БЕЗ сохранения в cookies
- ✅ Используется в Route Handler `/api/auth/refresh`

### 2. Метод `refreshTokens()` - для Server Components

Обновляет токены через internal API:

```typescript
static async refreshTokens(): Promise<AuthTokens | null>
```

- ✅ Делает fetch к `/api/auth/refresh`
- ✅ API сам читает cookies, обновляет токены и сохраняет их
- ✅ Возвращает новые токены
- ✅ Безопасен для использования в Server Components

### 3. Route Handler `/api/auth/refresh`

Единственное место где токены записываются в cookies:

```typescript
// 1. Читает refresh token из cookies
const refreshToken = cookieStore.get("refreshToken")?.value;

// 2. Получает новые токены с бэкенда
const result = await ServerAuth.fetchFreshTokens(refreshToken);

// 3. Сохраняет в cookies (здесь это разрешено!)
await ServerAuth.setTokens(result.tokens);

// 4. Возвращает токены
return NextResponse.json({
  accessToken: result.tokens.accessToken,
  refreshToken: result.tokens.refreshToken,
  expiresAt: result.tokens.expiresAt,
});
```

## Новый флоу

### Обновление истекших токенов:

```
Page Component
    ↓
getData()
    ↓
checkAuth() - обнаруживает истекший токен
    ↓
ServerAuth.refreshTokens() - вызывает fetch
    ↓
fetch → /api/auth/refresh (Route Handler)
    ↓
fetchFreshTokens() - запрос к бэкенду
    ↓
setTokens() - ✅ сохранение в cookies (разрешено)
    ↓
← возвращает новые токены
    ↓
checkAuth() использует новые токены
    ↓
getData() успешно получает данные
```

## Измененные файлы

### 1. `lib/auth/server-auth.ts`

**Добавлено:**

- `fetchFreshTokens()` - получение токенов без записи в cookies
- Переписан `refreshTokens()` - теперь вызывает `/api/auth/refresh`
- Обновлен `tryRestoreTokens()` - использует новый `refreshTokens()`

### 2. `app/api/auth/refresh/route.ts`

**Переписан полностью:**

- Читает refresh token из cookies
- Вызывает `fetchFreshTokens()`
- Сохраняет токены в cookies (здесь разрешено)
- Возвращает токены клиенту

### 3. `lib/server-data/base.ts`

**Обновлено:**

- `checkAuth()` теперь вызывает `refreshTokens()` который использует API
- Упрощена логика восстановления токенов

## Переменные окружения

Добавьте в `.env.local`:

```bash
# API бэкенда
NEXT_PUBLIC_API_URL=https://dummyjson.com

# URL фронтенда (для internal API calls)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Для production измените `NEXT_PUBLIC_SITE_URL` на реальный домен.

## Тестирование

1. Запустите dev сервер: `pnpm dev`
2. Откройте приложение в браузере
3. Дождитесь истечения access token (15 минут)
4. Обновите страницу или сделайте запрос
5. Проверьте консоль:
   - ✅ `[ServerAuth] Refreshing tokens via API...`
   - ✅ `[RefreshAPI] Tokens refreshed and saved to cookies`
   - ✅ `[ServerAuth] Tokens refreshed via API successfully`
   - ✅ Данные успешно загружены

## Архитектура

### Разделение ответственности:

1. **Server Components** - только читают cookies и вызывают API
2. **Route Handlers** - единственное место где cookies модифицируются
3. **Server Actions** - могут модифицировать cookies (пока не используется)

### Преимущества:

- ✅ Соответствует правилам Next.js 15
- ✅ Четкое разделение ответственности
- ✅ Токены обновляются автоматически при истечении
- ✅ Работает как для Server Components, так и для Client Components
- ✅ Централизованная логика обновления токенов

## Дата исправления

27 октября 2025
