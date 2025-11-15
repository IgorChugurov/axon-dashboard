# План реализации авторизации через Supabase Auth

## Текущее состояние

Проект использует:
- Next.js 15.5.6 (App Router)
- Кастомный backend API с JWT токенами
- Система авторизации через `/api/auth/*` routes
- Middleware для защиты маршрутов
- AuthProvider для управления состоянием на клиенте

## Цели миграции

1. ✅ Заменить кастомную авторизацию на Supabase Auth
2. ✅ Поддержка множественных OAuth провайдеров (Google, GitHub, и др.)
3. ✅ Сохранить существующую архитектуру (Middleware, AuthProvider)
4. ✅ Миграция данных пользователей (если нужно)

---

## 📋 Детальный план реализации

### 1. Настройка Supabase

#### 1.1 Создание проекта Supabase
- [ ] Создать проект в Supabase Dashboard
- [ ] Получить `SUPABASE_URL` и `SUPABASE_ANON_KEY`
- [ ] Получить `SUPABASE_SERVICE_ROLE_KEY` (для Admin API)

#### 1.2 Настройка OAuth провайдеров

**Google OAuth:**
- [ ] Создать OAuth 2.0 Client в Google Cloud Console
- [ ] Получить Client ID и Client Secret
- [ ] Настроить Authorized redirect URIs:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`
  - `http://localhost:3000/auth/callback` (для разработки)
- [ ] Добавить в Supabase Dashboard: Authentication → Providers → Google

**GitHub OAuth (рекомендуется добавить):**
- [ ] Создать OAuth App в GitHub Settings → Developer settings
- [ ] Получить Client ID и Client Secret
- [ ] Настроить Authorization callback URL:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`
- [ ] Добавить в Supabase Dashboard

**Другие провайдеры (по необходимости):**
- [ ] Microsoft/Azure AD
- [ ] Apple
- [ ] Discord
- [ ] и др.

#### 1.3 Настройка Email/Password (опционально)
- [ ] Включить Email provider в Supabase Dashboard
- [ ] Настроить email templates
- [ ] Настроить SMTP (или использовать Supabase по умолчанию)

---

### 2. Установка зависимостей

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**Почему `@supabase/ssr` вместо `@supabase/auth-helpers-nextjs`?**
- `@supabase/ssr` - это современная библиотека для Next.js 13+ (App Router)
- `@supabase/auth-helpers-nextjs` устарела и не рекомендуется для новых проектов
- `@supabase/ssr` лучше работает с Server Components и Middleware

---

### 3. Frontend интеграция

#### 3.1 Создание Supabase клиентов

**Структура файлов:**
```
lib/
  supabase/
    ├── client.ts          # Client-side Supabase client (для Client Components)
    ├── server.ts          # Server-side Supabase client (для Server Components)
    └── middleware.ts      # Middleware Supabase client
```

**Реализация:**

`lib/supabase/client.ts` - для Client Components:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`lib/supabase/server.ts` - для Server Components:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

`lib/supabase/middleware.ts` - для Middleware:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from './types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Обновляем сессию пользователя
  await supabase.auth.getUser()

  return supabaseResponse
}
```

#### 3.2 Обновление Middleware

**Текущий `middleware.ts` → новый:**

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Публичные маршруты
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return updateSession(request)
  }

  // Обновляем сессию
  const response = await updateSession(request)
  
  // Проверяем авторизацию
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
```

#### 3.3 Компоненты входа

**Создать `app/login/page.tsx` с поддержкой OAuth:**

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const supabase = createClient()

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      console.error('OAuth error:', error)
    }
  }

  return (
    <div>
      <Button onClick={() => handleOAuthLogin('google')}>
        Войти через Google
      </Button>
      <Button onClick={() => handleOAuthLogin('github')}>
        Войти через GitHub
      </Button>
    </div>
  )
}
```

#### 3.4 Callback обработчик

**Создать `app/auth/callback/route.ts`:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
```

#### 3.5 Обновление AuthProvider

**Адаптировать `components/providers/AuthProvider.tsx`:**

- Использовать `supabase.auth.getUser()` вместо кастомных API routes
- Использовать `supabase.auth.onAuthStateChange()` для отслеживания изменений
- Обновить методы `login`, `logout`, `refreshUser`

---

### 4. Backend интеграция

#### 4.1 Обновление API Routes

**Заменить существующие routes:**

- `/api/auth/login` → использовать `supabase.auth.signInWithPassword()` или OAuth
- `/api/auth/logout` → использовать `supabase.auth.signOut()`
- `/api/auth/me` → использовать `supabase.auth.getUser()`
- `/api/auth/refresh-token` → Supabase автоматически обновляет токены

**Пример `/api/auth/logout/route.ts`:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
```

#### 4.2 Защита API endpoints

**Для защиты API routes использовать:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Ваша логика здесь
  return NextResponse.json({ data: 'protected data' })
}
```

#### 4.3 Использование Admin API (опционально)

**Для серверных операций, требующих повышенных прав:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Только на сервере!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Использовать для админских операций
```

---

### 5. База данных и RLS

#### 5.1 Таблица `auth.users`

**Автоматически создается Supabase:**
- `id` (UUID)
- `email`
- `created_at`
- `updated_at`
- и др. стандартные поля

#### 5.2 Создание `public.profiles`

**SQL миграция:**

```sql
-- Создание таблицы profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать свой профиль
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Политика: пользователи могут обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Политика: пользователи могут создавать свой профиль
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 5.3 Дополнительные таблицы (если нужно)

Если у вас есть другие таблицы, связанные с пользователями, нужно:
- [ ] Добавить внешние ключи на `auth.users(id)`
- [ ] Настроить RLS политики
- [ ] Обновить запросы для использования `auth.uid()`

---

### 6. Миграция данных (если нужно)

Если у вас уже есть пользователи в старом backend:

1. **Экспорт данных** из старой БД
2. **Импорт в Supabase:**
   - Создать пользователей через Admin API
   - Импортировать профили в `public.profiles`
   - Сохранить связи с другими таблицами

**Пример скрипта миграции:**

```typescript
// scripts/migrate-users.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateUsers() {
  // 1. Получить пользователей из старого API
  // 2. Создать их в Supabase через Admin API
  // 3. Создать профили
}
```

---

## 🔄 План миграции (поэтапно)

### Этап 1: Подготовка (1-2 дня)
- [ ] Создать проект Supabase
- [ ] Настроить OAuth провайдеры
- [ ] Установить зависимости
- [ ] Создать базовую структуру файлов

### Этап 2: Базовая интеграция (2-3 дня)
- [ ] Создать Supabase клиенты (client, server, middleware)
- [ ] Обновить Middleware
- [ ] Создать callback route
- [ ] Обновить AuthProvider

### Этап 3: Компоненты входа (1-2 дня)
- [ ] Обновить страницу логина с OAuth кнопками
- [ ] Добавить обработку ошибок
- [ ] Добавить loading состояния

### Этап 4: API Routes (1-2 дня)
- [ ] Обновить `/api/auth/*` routes
- [ ] Защитить существующие API endpoints
- [ ] Тестирование

### Этап 5: База данных (1-2 дня)
- [ ] Создать таблицу `profiles`
- [ ] Настроить RLS политики
- [ ] Создать триггеры для автоматического создания профилей

### Этап 6: Тестирование и финализация (2-3 дня)
- [ ] Тестирование всех провайдеров
- [ ] Тестирование защищенных маршрутов
- [ ] Исправление багов
- [ ] Документация

---

## ❓ Вопросы для обсуждения

### 1. Какие OAuth провайдеры нужны?
- ✅ Google (уже в плане)
- ❓ GitHub?
- ❓ Microsoft/Azure AD?
- ❓ Apple?
- ❓ Другие?

### 2. Нужна ли поддержка Email/Password?
- Если да, то нужны ли:
  - Регистрация через email?
  - Восстановление пароля?
  - Подтверждение email?

### 3. Миграция существующих пользователей?
- Есть ли уже пользователи в текущей системе?
- Нужна ли миграция данных?
- Как обрабатывать дубликаты?

### 4. Дополнительные поля профиля?
- Какие поля нужны в `profiles` таблице?
- Нужны ли кастомные роли/разрешения?

### 5. Интеграция с существующим backend?
- Нужно ли сохранить интеграцию с текущим backend API?
- Или полностью перейти на Supabase?

### 6. Стратегия развертывания?
- Постепенная миграция (feature flag)?
- Полная замена сразу?
- Параллельная работа двух систем?

---

## 📝 Рекомендации

1. **Начните с одного провайдера** (Google), затем добавляйте остальные
2. **Используйте feature flag** для постепенной миграции
3. **Тестируйте на staging** перед продакшеном
4. **Документируйте изменения** в процессе работы
5. **Создайте backup** перед миграцией данных

---

## 🔗 Полезные ссылки

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OAuth Providers Setup](https://supabase.com/docs/guides/auth/social-login)

