# Текущий флоу авторизации (Supabase SSR)

**Дата обновления:** 15 ноября 2025  
**Версия:** Next.js 15.5.6 + Supabase SSR

## Архитектура

Система использует **Supabase Authentication** с SSR (Server-Side Rendering) для Next.js.

### Ключевые компоненты

```
1. Supabase Auth Server (облако)
   └─ Управляет токенами, пользователями, refresh logic

2. Next.js Middleware
   └─ Обновляет токены, проверяет авторизацию

3. Supabase Clients
   ├─ Server Client (SSR, Server Actions)
   ├─ Browser Client (Client Components)
   └─ Admin Client (административные операции)
```

## Типы токенов

### Access Token

- **Срок жизни:** 1 час (по умолчанию в Supabase)
- **Формат:** JWT
- **Использование:** Авторизация API запросов
- **Хранение:** httpOnly cookies (`sb-xxx-auth-token`)

### Refresh Token

- **Срок жизни:** 7+ дней (настраивается в Supabase)
- **Формат:** Уникальная строка
- **Использование:** Получение нового access token
- **Хранение:** httpOnly cookies (`sb-xxx-auth-token`)

## Cookies структура

Supabase SSR создает следующие cookies:

```
sb-<project-ref>-auth-token: {
  "access_token": "eyJhbGci...",    // JWT access token
  "refresh_token": "v1.MRV...",     // Refresh token
  "expires_at": 1234567890,         // Unix timestamp
  "expires_in": 3600,               // Seconds
  "token_type": "bearer"
}
```

**Параметры cookies:**

- `httpOnly: true` - Не доступны из JavaScript
- `secure: true` - Только HTTPS (в production)
- `sameSite: 'lax'` - CSRF защита
- `path: '/'` - Доступны во всем приложении

## Флоу процессов

### 1. Вход в систему (Login)

```
User → Login Page (Client Component)
  ↓
[Browser] AuthProvider.login()
  ├─ supabase.auth.signInWithPassword({ email, password })
  └─ Supabase API: POST /auth/v1/token
  ↓
[Supabase] Проверяет credentials
  ├─ Создает access + refresh tokens
  └─ Возвращает { session, user }
  ↓
[Browser] Supabase Client
  ├─ Сохраняет токены в cookies (автоматически!)
  └─ Обновляет состояние AuthProvider
  ↓
[Browser] Navigate('/') → редирект на главную
  ↓
[Server] Middleware перехватывает запрос
  ├─ updateSession() → проверяет токены
  └─ Пропускает (токены валидные)
  ↓
[Server] Page Component рендерится
  └─ HTML отправляется клиенту ✅
```

**Код:**

```typescript
// components/providers/AuthProvider.tsx
const login = async ({ email, password }: LoginCredentials) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  setUser(transformUser(data.user));
  router.push("/"); // Автоматический редирект
};
```

### 2. Автоматическое обновление токенов

#### 2.1. Обновление в Middleware (Server-side)

```
Browser → GET /projects
  ↓
[Server] Middleware.ts
  ├─ updateSession(request)
  └─ Передает в lib/supabase/middleware.ts
  ↓
[Server] lib/supabase/middleware.ts
  ├─ getSessionKey(request) → извлекает sessionKey из cookies
  ├─ Проверяет refreshPromises.get(sessionKey)
  │   ├─ Если нет → создает новый Promise обновления
  │   └─ Если есть → переиспользует существующий (RACE CONDITION PROTECTION!)
  ↓
[Server] createServerClient()
  ├─ cookies.getAll() → читает текущие cookies
  ├─ supabase.auth.getUser()
  │   ├─ Локально проверяет access token
  │   ├─ Если истек → автоматически использует refresh token
  │   │   └─ POST /auth/v1/token?grant_type=refresh_token
  │   └─ Получает новые токены
  └─ cookies.setAll() → записывает обновленные токены в response
  ↓
[Server] Middleware
  ├─ Получает { response, user }
  ├─ Проверяет авторизацию и роль
  └─ Пропускает запрос дальше
  ↓
[Server] Page Component рендерится с обновленными токенами ✅
```

**Код:**

```typescript
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  const sessionKey = getSessionKey(request);

  // RACE CONDITION PROTECTION
  let refreshPromise = refreshPromises.get(sessionKey);

  if (!refreshPromise) {
    // Только первый запрос обновляет токен
    refreshPromise = (async () => {
      const supabase = createServerClient({
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Обновляем request.cookies в памяти
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
          },
        },
      });

      await supabase.auth.getUser(); // Автоматически обновляет токен
    })();

    refreshPromises.set(sessionKey, refreshPromise);
  }

  // Все параллельные запросы ждут завершения первого
  await refreshPromise;

  // Каждый запрос создает СВОЙ клиент и получает Set-Cookie
  const supabase = createServerClient({
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Устанавливает в СВОЙ response
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}
```

#### 2.2. Обновление в Browser Client (Client-side)

```
User на странице 15+ минут → Access token истек
  ↓
User кликает "Load Projects"
  ↓
[Browser] ProjectsList.tsx
  └─ supabase.from('projects').select()
  ↓
[Browser] Supabase Client
  ├─ Добавляет Authorization: Bearer <access_token> в headers
  └─ GET https://xxx.supabase.co/rest/v1/projects
  ↓
[Supabase API] Проверяет токен
  └─ 401 Unauthorized (токен истек)
  ↓
[Browser] Supabase Client (АВТОМАТИЧЕСКИ!)
  ├─ Перехватывает 401 ошибку
  ├─ Проверяет: уже идет refresh?
  │   ├─ ДА → ждет завершения (ВСТРОЕННАЯ ЗАЩИТА ОТ RACE CONDITIONS!)
  │   └─ НЕТ → начинает refresh
  ├─ POST /auth/v1/token?grant_type=refresh_token
  ├─ Получает новые токены
  ├─ Сохраняет в cookies
  └─ Повторяет оригинальный запрос с новым токеном
  ↓
[Supabase API] Возвращает проекты ✅
  ↓
[Browser] React обновляет UI
```

**Код:**

```typescript
// components/ProjectsList.tsx
const loadProjects = async (page: number) => {
  const supabase = createClient(); // Browser Client

  // ПРЯМОЙ запрос к Supabase
  // Обновление токена происходит АВТОМАТИЧЕСКИ при 401!
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .range((page - 1) * 10, page * 10 - 1);

  if (error) throw error;

  setProjects(data);
};
```

### 3. Выход из системы (Logout)

```
User → Кликает "Sign out"
  ↓
[Browser] AuthProvider.logout()
  └─ supabase.auth.signOut()
  ↓
[Browser] Supabase Client
  ├─ POST /auth/v1/logout
  ├─ Очищает cookies (автоматически!)
  └─ Обновляет состояние
  ↓
[Browser] Navigate('/login')
  └─ Редирект на страницу входа ✅
```

**Код:**

```typescript
// components/providers/AuthProvider.tsx
const logout = async () => {
  await supabase.auth.signOut();
  setUser(null);
  router.push("/login");
};
```

### 4. Первая загрузка приложения

```
User → Открывает приложение (GET /)
  ↓
[Server] Middleware
  ├─ updateSession() → проверяет/обновляет токены
  └─ Проверяет авторизацию
  ↓
[Server] app/layout.tsx
  ├─ getServerUser() → получает user + role
  │   ├─ createClient() → Server Client
  │   ├─ supabase.auth.getUser()
  │   └─ getUserRole(user.id) → запрос к БД
  └─ Передает user в AuthProvider
  ↓
[Browser] AuthProvider hydration
  ├─ Устанавливает initialUser
  └─ Подписывается на onAuthStateChange
  ↓
[Browser] Page Component рендерится ✅
```

### 5. Race Conditions Protection

#### Проблема:

5 параллельных запросов с истекшим токеном → 5 попыток refresh

#### Решение Server-side (Middleware):

```typescript
// Map для дедупликации
const refreshPromises = new Map<string, Promise<void>>();

// Запрос 1: создает Promise обновления
refreshPromises.set(sessionKey, updatePromise);

// Запросы 2-5: находят Promise в Map, ждут его завершения
await refreshPromises.get(sessionKey);

// Результат: только 1 refresh на все запросы ✅
```

#### Решение Client-side (Supabase SDK):

Встроенная защита в `@supabase/supabase-js`:

```typescript
// Внутри Supabase Client
private refreshPromise: Promise<Session> | null = null

async refreshSession() {
  // Если уже идет refresh - переиспользуем Promise
  if (this.refreshPromise) {
    return await this.refreshPromise;
  }

  this.refreshPromise = this._refreshSession();

  try {
    return await this.refreshPromise;
  } finally {
    this.refreshPromise = null;
  }
}
```

**Результат:** Параллельные запросы из браузера автоматически дедуплицируются!

## Локации клиентов

### Server Client (`lib/supabase/server.ts`)

**Используется в:**

- Server Components (page.tsx, layout.tsx)
- Server Actions
- API Routes (внутренние)

**Создание:**

```typescript
import { createClient } from "@/lib/supabase/server";

// В async функции
const supabase = await createClient();
const { data } = await supabase.from("projects").select();
```

### Browser Client (`lib/supabase/client.ts`)

**Используется в:**

- Client Components ('use client')
- Прямые запросы к Supabase из браузера

**Создание:**

```typescript
import { createClient } from "@/lib/supabase/client";

// В Client Component
const supabase = createClient();
const { data } = await supabase.from("projects").select();
```

### Admin Client (`lib/supabase/admin.ts`)

**Используется в:**

- Server Actions для административных операций
- Обход RLS (Row Level Security)

**Создание:**

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

// В Server Action
'use server'
const supabase = createAdminClient();
await supabase.from('admins').insert(...); // Обходит RLS
```

## Роли и права доступа

### Роли пользователей

1. **user** - Обычный пользователь (ограниченный доступ)
2. **admin** - Администратор
3. **superAdmin** - Супер-администратор

### Проверка ролей

```typescript
// В middleware.ts
const { getUserRoleCached } = await import("@/lib/auth/roles");
const userRole = await getUserRoleCached(user.id);

if (userRole === "user" && !pathname.startsWith("/welcome")) {
  // Редирект на welcome страницу
  return NextResponse.redirect(new URL("/welcome", request.url));
}
```

### RLS (Row Level Security)

Защита данных на уровне Supabase БД:

```sql
-- Пример RLS политики для projects
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
  )
  OR owner_id = auth.uid()
);
```

## Безопасность

### ✅ Реализовано

1. **httpOnly cookies** - Токены не доступны из JavaScript
2. **Secure cookies** - Только HTTPS в production
3. **SameSite: lax** - CSRF защита
4. **Race conditions protection** - Дедупликация refresh запросов
5. **RLS** - Защита данных на уровне БД
6. **Middleware auth check** - Первая линия защиты
7. **Server-side validation** - Проверка токенов на сервере

### ⚠️ Важные замечания

1. **НЕ** храните токены в localStorage/sessionStorage
2. **НЕ** передавайте токены через URL
3. **НЕ** выполняйте авторизованные запросы из Client Components напрямую к Next.js API (используйте Supabase Client)
4. **ВСЕГДА** проверяйте авторизацию в Server Components/Actions
5. **ВСЕГДА** используйте RLS для защиты данных

## Переменные окружения

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # Только для server-side

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Тестирование

### Проверка race conditions (Server):

```bash
# 10 параллельных запросов
for i in {1..10}; do
  curl http://localhost:3000/projects &
done
wait

# Проверить логи - должен быть только 1 refresh
```

### Проверка race conditions (Client):

```typescript
// В браузере
const promises = [
  supabase.from("projects").select(),
  supabase.from("users").select(),
  supabase.from("tasks").select(),
];

await Promise.all(promises);

// В Network tab - только 1 запрос к /auth/v1/token
```

## Связанные документы

- `RACE_CONDITIONS_PROTECTION.md` - Детальное описание защиты от race conditions
- `TOKEN_REFRESH_FLOW.md` - Визуализация работы обновления токенов
- `HYBRID_ARCHITECTURE_GUIDE.md` - Гибридная архитектура (SSR + Browser Client)
- `MIDDLEWARE_EXPLANATION.md` - Объяснение работы middleware

## Отличия от старой архитектуры (Backend API)

| Аспект              | Старая (Backend API) | Новая (Supabase)                   |
| ------------------- | -------------------- | ---------------------------------- |
| Управление токенами | Backend API          | Supabase Auth Server               |
| Хранение токенов    | Вручную в cookies    | Автоматически Supabase Client      |
| Обновление токенов  | Server Actions       | Автоматически + Middleware         |
| Race conditions     | Вручную              | Встроенная защита + Middleware Map |
| API запросы         | Next.js API Routes   | Прямо к Supabase (RLS)             |
| Сложность           | Высокая              | Низкая                             |

---

**Итог:** Текущая архитектура использует Supabase SSR с автоматическим управлением токенами, встроенной защитой от race conditions и гибридным подходом (SSR + Browser Client).
