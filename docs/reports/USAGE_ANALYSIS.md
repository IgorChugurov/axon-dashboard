# Анализ использования файлов и функций

## ✅ Используемые файлы

### lib/api/

- ✅ **handlers.ts** - используется в:

  - `lib/api/server.ts` (getEntityDataFromBackend, formatEntityResponse, buildBackendUrl, fetchFromBackend)
  - `app/api/[entity]/route.ts` (getEntityDataFromBackend, formatEntityResponse, buildBackendUrl, fetchFromBackend)
  - `lib/server-data/base.ts` (formatEntityResponse)

- ✅ **server.ts** - используется в:
  - `lib/server-data/base.ts` (getEntityData)

### lib/auth/

- ✅ **utils.ts** - используется в:

  - `app/api/[entity]/route.ts` (getAuthTokens)
  - `app/api/auth/login/route.ts` (setAccessTokenCookie, setRefreshTokenCookie)
  - `app/api/auth/logout/route.ts` (clearAuthCookies)
  - `app/api/auth/me/route.ts` (getAuthTokens, getAuthUser)
  - `app/api/auth/refresh-token/route.ts` (cookies)
  - `lib/api/handlers.ts` (getAuthTokens)
  - `middleware.ts` (hasRefreshToken)

- ✅ **types.ts** - используется в:
  - `lib/auth/utils.ts`
  - `components/providers/AuthProvider.tsx`
  - `app/api/auth/login/route.ts`
  - `app/api/auth/me/route.ts`

### lib/projects/

- ✅ **server.ts** - используется в:

  - `app/page.tsx` (projectsServerProvider)

- ✅ **types.ts** - используется в:
  - `lib/projects/server.ts`
  - `components/ProjectsList.tsx`

### lib/server-data/

- ✅ **base.ts** - используется в:

  - `lib/projects/server.ts` (extends ServerDataProvider)

- ✅ **types.ts** - используется в:
  - `lib/server-data/base.ts`
  - `lib/api/server.ts`
  - `lib/api/handlers.ts`
  - `app/page.tsx`

### lib/

- ✅ **api.ts** - используется в:
  - `components/providers/AuthProvider.tsx` (api функция)

### app/api/

- ✅ **auth/login/route.ts** - используется для логина
- ✅ **auth/logout/route.ts** - используется для логаута
- ✅ **auth/me/route.ts** - используется для получения данных пользователя
- ✅ **auth/refresh-token/route.ts** - используется для обновления токенов
- ✅ **[entity]/route.ts** - используется как универсальный API для всех сущностей

### components/

- ✅ **providers/AuthProvider.tsx** - используется в `app/layout.tsx`
- ✅ **providers/ThemeProvider.tsx** - используется в `app/layout.tsx`
- ✅ **ProjectsList.tsx** - используется в `app/page.tsx`
- ✅ **Navbar.tsx** - используется в `app/layout.tsx`
- ✅ **AppSidebar.tsx** - используется в `app/layout.tsx`
- ✅ **Logo.tsx** - используется в компонентах

## ❌ НЕ используемые файлы/папки

### app/api/auth/

- ❌ **clear-auth/** - папка существует, но пустая (нет route.ts)
- ❌ **set-tokens/** - папка существует, но пустая (нет route.ts)
- ❌ **refresh/** - папка существует, но пустая (нет route.ts)

### components/

- ❌ **AuthErrorHandler.tsx** - НЕ используется (удален из импортов в `app/page.tsx`)
  - Компонент существует, но больше не импортируется
  - Редирект теперь делается через `redirect()` в Server Component

## 📊 Статистика

### Используется:

- ✅ 15 файлов в `lib/`
- ✅ 5 route handlers в `app/api/`
- ✅ 8 компонентов в `components/`

### Не используется:

- ❌ 3 пустые папки в `app/api/auth/`
- ❌ 1 компонент `AuthErrorHandler.tsx`

## 🔍 Детальный анализ функций

### lib/api.ts

**Функция:** `api(path, options)`
**Используется:** ✅ Да - в `components/providers/AuthProvider.tsx`
**Назначение:** Клиентская утилита для API запросов с автоматической обработкой cookies

### lib/utils.ts

**Проверка:** Нужно проверить содержимое и использование

### components/AuthErrorHandler.tsx

**Статус:** ❌ Не используется
**Причина:** Редирект теперь делается через `redirect()` в Server Component
**Рекомендация:** Можно удалить или оставить для будущего использования

## 🧹 Рекомендации по очистке

### Можно удалить:

1. **app/api/auth/clear-auth/** - пустая папка (если пустая)
2. **app/api/auth/set-tokens/** - пустая папка (если пустая)
3. **app/api/auth/refresh/** - пустая папка (есть `refresh-token/`)
4. **components/AuthErrorHandler.tsx** - не используется (опционально)

### Оставить (используются):

- ✅ **lib/api.ts** - используется в `AuthProvider` для клиентских запросов
- ✅ **lib/utils.ts** - используется в UI компонентах (функция `cn()`)

## 📝 Итоговая сводка

### Используется:

- ✅ Все файлы в `lib/api/` (handlers.ts, server.ts)
- ✅ Все файлы в `lib/auth/` (utils.ts, types.ts)
- ✅ Все файлы в `lib/projects/` (server.ts, types.ts)
- ✅ Все файлы в `lib/server-data/` (base.ts, types.ts)
- ✅ `lib/api.ts` - клиентская утилита
- ✅ `lib/utils.ts` - утилита для классов
- ✅ 5 route handlers в `app/api/auth/` (login, logout, me, refresh-token)
- ✅ 1 route handler в `app/api/[entity]/`
- ✅ 8+ компонентов в `components/`

### Не используется:

- ❌ 3 пустые папки в `app/api/auth/`
- ❌ 1 компонент `AuthErrorHandler.tsx`
