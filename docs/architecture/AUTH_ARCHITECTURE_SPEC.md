# ⚠️ УСТАРЕВШИЙ ДОКУМЕНТ

**Этот документ описывает старую архитектуру с Backend API.**

**Текущая архитектура:** Supabase SSR + Next.js 15

**Актуальная документация:**
- `CURRENT_AUTH_FLOW.md` - Текущий флоу авторизации с Supabase
- `DEVELOPMENT_GUIDE.md` - Руководство по разработке

---

# [УСТАРЕЛО] Техническое задание: Система авторизации и управления токенами

## Технологический стек (УСТАРЕЛО)

- Next.js 15.5.6 (App Router)
- React 19.1.0
- TypeScript 5
- ~~Backend API: REST API с JWT токенами~~ (заменено на Supabase Auth)

## Требования к системе

### 1. Типы токенов

- **Access Token**: короткий срок жизни (15 минут), используется для API запросов
- **Refresh Token**: длинный срок жизни (7 дней), используется для обновления access token
- **Хранение**: HttpOnly cookies для безопасности

### 2. Cookies структура

```
accessToken: string (httpOnly, secure, sameSite: lax, maxAge: 15 min)
refreshToken: string (httpOnly, secure, sameSite: lax, maxAge: 7 days)
expiresAt: number (unix timestamp в секундах)
userData: JSON string (email пользователя)
```

## Правила работы с cookies в Next.js 15

### ✅ Где МОЖНО модифицировать cookies:

1. **Server Actions** (функции с 'use server')
2. **Route Handlers** (app/api/\*\*/route.ts)
3. **Middleware** (middleware.ts)

### ❌ Где НЕЛЬЗЯ модифицировать cookies:

1. Server Components (page.tsx, layout.tsx)
2. Client Components
3. Обычные серверные функции вне Server Actions

### ✅ Где МОЖНО читать cookies:

- Везде на сервере через `cookies()` из 'next/headers'

## Архитектура системы авторизации

### Уровень 1: Middleware (первичная защита)

**Файл**: `middleware.ts`
**Функция**: Проверка наличия хотя бы одного токена

```
Запрос → Middleware
         ↓
    Есть refresh ИЛИ access token?
         ↓ ДА          ↓ НЕТ
    Пропустить    Redirect /login + очистка cookies
```

**Не делает**:

- ❌ Не проверяет истечение токенов
- ❌ Не обновляет токены
- ❌ Не делает запросы к API

### Уровень 2: Server Actions (операции с cookies)

**Файл**: `lib/auth/actions.ts`
**Функция**: Все операции с cookies

**Server Actions:**

```typescript
// 1. Сохранение токенов после логина
async function setAuthCookies(tokens, user);

// 2. Очистка всех auth cookies
async function clearAuthCookies();

// 3. Обновление токенов (вызывает бэкенд и сохраняет)
async function refreshAuthTokens();
```

**Правило**: Server Actions - ЕДИНСТВЕННОЕ место где cookies модифицируются

### Уровень 3: Server Components (чтение и проверка)

**Файлы**: `page.tsx`, `layout.tsx`
**Функция**: Чтение токенов и проверка валидности

```
Page Component
    ↓
Читает cookies (токены)
    ↓
Токены есть и валидны?
    ↓ ДА                    ↓ НЕТ
Загружает данные      Вызывает Server Action для refresh
                            ↓
                      Обновились?
                            ↓ ДА         ↓ НЕТ
                      Загружает     redirect('/login')
```

### Уровень 4: API Route Handlers (публичные endpoints)

**Файлы**: `app/api/auth/**/route.ts`
**Функция**: HTTP endpoints для клиента

**Endpoints:**

- `POST /api/auth/login` - авторизация
- `POST /api/auth/logout` - выход
- `GET /api/auth/me` - текущий пользователь

## Детальный флоу процессов

### ПРОЦЕСС 1: Вход в систему (Login)

```
1. Client отправляет POST /api/auth/login {email, password}
   ↓
2. Route Handler получает запрос
   ↓
3. Отправляет credentials на бэкенд
   ↓
4. Бэкенд возвращает {accessToken, refreshToken, exp, email}
   ↓
5. Route Handler вызывает Server Action setAuthCookies()
   ↓
6. Server Action сохраняет токены в cookies
   ↓
7. Возвращает успех клиенту
   ↓
8. Client делает redirect на главную страницу
```

**Код структура:**

```typescript
// app/api/auth/login/route.ts
export async function POST(request) {
  // 1. Получить credentials
  // 2. Запрос к бэкенду
  // 3. Вызвать setAuthCookies(tokens, user) <- Server Action
  // 4. Вернуть success
}

// lib/auth/actions.ts
'use server'
export async function setAuthCookies(tokens, user) {
  const cookieStore = await cookies()
  cookieStore.set('accessToken', ...)
  cookieStore.set('refreshToken', ...)
  // ...
}
```

### ПРОЦЕСС 2: Загрузка защищенной страницы

```
1. User открывает страницу /
   ↓
2. Middleware проверяет наличие токенов
   ↓ есть хоть один
3. Page Component загружается
   ↓
4. Читает токены из cookies
   ↓
5. Проверяет: accessToken валиден?
   ↓ НЕТ (истек или отсутствует)
6. Есть refreshToken?
   ↓ ДА
7. Вызывает Server Action refreshAuthTokens()
   ↓
8. Server Action:
   - Читает refreshToken из cookies
   - Делает запрос к бэкенду /refresh-tokens
   - Получает новые токены
   - Сохраняет в cookies
   - Возвращает новые токены
   ↓
9. Page Component использует свежие токены
   ↓
10. Делает запрос к защищенному API
```

**Код структура:**

```typescript
// app/page.tsx
export default async function HomePage() {
  // 1. Читаем токены
  let tokens = await getAuthTokens() // просто читает cookies

  // 2. Проверяем истечение
  if (!tokens || isExpired(tokens)) {
    // 3. Пытаемся обновить через Server Action
    tokens = await refreshAuthTokens() // Server Action!

    if (!tokens) {
      redirect('/login')
    }
  }

  // 4. Загружаем данные
  const data = await fetchData(tokens.accessToken)

  return <PageContent data={data} />
}

// lib/auth/actions.ts
'use server'
export async function refreshAuthTokens() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refreshToken')?.value

  if (!refreshToken) return null

  // Запрос к бэкенду
  const response = await fetch(BACKEND_API + '/refresh-tokens', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  })

  if (!response.ok) return null

  const newTokens = await response.json()

  // Сохраняем в cookies (разрешено в Server Action!)
  cookieStore.set('accessToken', newTokens.accessToken, {...})
  cookieStore.set('refreshToken', newTokens.refreshToken, {...})
  cookieStore.set('expiresAt', newTokens.exp.toString(), {...})

  return newTokens
}
```

### ПРОЦЕСС 3: Выход из системы (Logout)

```
1. User нажимает "Выйти"
   ↓
2. Client отправляет POST /api/auth/logout
   ↓
3. Route Handler вызывает Server Action clearAuthCookies()
   ↓
4. Server Action очищает все cookies
   ↓
5. Возвращает успех
   ↓
6. Client делает redirect на /login
```

### ПРОЦЕСС 4: Автоматическое обновление токенов при API запросах

```
1. Page/Component делает запрос к protected API
   ↓
2. Проверяет: токен скоро истечет? (< 1 мин)
   ↓ ДА
3. Превентивно вызывает refreshAuthTokens() <- Server Action
   ↓
4. Получает свежие токены
   ↓
5. Использует их для API запроса
```

## Структура файлов

```
lib/auth/
  ├── actions.ts          # Server Actions (ЕДИНСТВЕННОЕ место модификации cookies)
  ├── utils.ts            # Утилиты (чтение cookies, проверка истечения)
  ├── types.ts            # TypeScript типы
  └── backend-api.ts      # Клиент для бэкенд API

app/api/auth/
  ├── login/route.ts      # POST - вход
  ├── logout/route.ts     # POST - выход
  └── me/route.ts         # GET - текущий пользователь

app/
  ├── page.tsx            # Главная (защищенная)
  ├── layout.tsx          # Layout с проверкой auth
  └── login/page.tsx      # Страница входа

middleware.ts             # Первичная защита маршрутов
```

## Правила реализации

### ✅ DO (Делать):

1. Все операции с cookies только через Server Actions
2. Server Components только ЧИТАЮТ cookies
3. Проверять истечение токенов перед каждым API запросом
4. Использовать revalidatePath() после обновления токенов
5. Обрабатывать все ошибки обновления токенов
6. Redirect на /login при невозможности обновить токены

### ❌ DON'T (Не делать):

1. НЕ модифицировать cookies в Server Components
2. НЕ делать fetch к своему же API из Server Components для обновления токенов
3. НЕ хранить токены в localStorage/sessionStorage
4. НЕ передавать токены через query параметры
5. НЕ пытаться обновлять токены в middleware (слишком часто)
6. НЕ создавать циклические зависимости между модулями

## Ключевые принципы

1. **Единственность ответственности**: Server Actions = модификация cookies
2. **Простота**: Минимум абстракций, прямой флоу
3. **Предсказуемость**: Четкий путь данных
4. **Безопасность**: HttpOnly cookies, Server-side проверки
5. **Производительность**: Превентивное обновление, кеширование

## Переменные окружения

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

Только URL бэкенда. Не нужны внутренние URL для internal API calls.

## Тестовые сценарии

1. ✅ Вход с валидными credentials → успех, редирект на /
2. ✅ Вход с невалидными credentials → ошибка
3. ✅ Загрузка защищенной страницы с валидными токенами → успех
4. ✅ Загрузка защищенной страницы с истекшим access, но валидным refresh → автообновление
5. ✅ Загрузка защищенной страницы с истекшими обоими токенами → редирект на /login
6. ✅ Выход → очистка cookies, редирект на /login
7. ✅ Попытка доступа к защищенной странице без токенов → редирект на /login (middleware)

## Итого

Это ФИНАЛЬНАЯ архитектура. Следующий шаг - имплементация согласно этому документу БЕЗ изменений в архитектуре.
