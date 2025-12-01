# @axon-dashboard/auth-sdk

Переиспользуемый модуль авторизации для Axon Dashboard и других клиентских приложений, работающих с той же базой данных.

## 📦 Установка

```bash
# В монорепо (локально)
pnpm add @axon-dashboard/auth-sdk@workspace:*

# Или после публикации в npm
pnpm add @axon-dashboard/auth-sdk
```

## 🚀 Быстрый старт

### 1. Настройка серверного модуля (Next.js Middleware)

```typescript
// middleware.ts
import { createAuthMiddleware } from '@axon-dashboard/auth-sdk/server';

export const middleware = createAuthMiddleware({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  publicRoutes: ['/login', '/signup', '/auth/callback'],
  onAuthRequired: ({ pathname }) => {
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  },
  onRoleCheck: (user, role, { pathname }) => {
    // Редирект обычных пользователей на welcome страницу
    if (role === 'user' && !pathname.startsWith('/welcome')) {
      return '/welcome';
    }
    return null;
  },
  roleCacheTtl: 300, // 5 минут (по умолчанию)
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 2. Настройка клиентского модуля

```typescript
// app/layout.tsx или providers.tsx
'use client';

import { AuthProvider, createClientAuthClient, createBrowserSupabaseClient } from '@axon-dashboard/auth-sdk/client';

const authClient = createClientAuthClient(
  createBrowserSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ),
  window.location.origin // для редиректов OAuth
);

export function Providers({ children, initialUser }) {
  return (
    <AuthProvider authClient={authClient} initialUser={initialUser}>
      {children}
    </AuthProvider>
  );
}
```

### 3. Использование в компонентах

```typescript
// app/login/page.tsx
'use client';

import { LoginForm } from '@axon-dashboard/auth-sdk/components';
import { useAuth } from '@axon-dashboard/auth-sdk/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const { login, loginWithOAuth, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (error) {
      // Ошибка обрабатывается в LoginForm
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <LoginForm
          onLogin={handleLogin}
          onOAuthLogin={loginWithOAuth}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
```

## 📚 API Reference

### Серверный модуль (`@axon-dashboard/auth-sdk/server`)

#### `createServerAuthClient(supabase: SupabaseClient)`

Создает серверный клиент авторизации.

```typescript
import { createServerAuthClient, createServerSupabaseClient } from '@axon-dashboard/auth-sdk/server';
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const supabase = createServerSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    getAll: () => cookieStore.getAll(),
    setAll: (cookies) => {
      cookies.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  }
);

const authClient = createServerAuthClient(supabase);
const user = await authClient.getUser();
```

#### `createAuthMiddleware(config: MiddlewareConfig)`

Создает middleware функцию для Next.js.

**Параметры:**
- `supabaseUrl` - URL Supabase проекта
- `supabaseAnonKey` - Anon ключ Supabase
- `publicRoutes` - Массив публичных маршрутов (опционально)
- `onAuthRequired` - Функция для определения редиректа при отсутствии авторизации (опционально)
- `onRoleCheck` - Функция для проверки ролей и редиректов (опционально)
- `roleCacheTtl` - TTL для кэша ролей в секундах (по умолчанию 300)

### Клиентский модуль (`@axon-dashboard/auth-sdk/client`)

#### `createClientAuthClient(supabase: SupabaseClient, redirectTo?: string)`

Создает клиентский клиент авторизации.

```typescript
import { createClientAuthClient, createBrowserSupabaseClient } from '@axon-dashboard/auth-sdk/client';

const supabase = createBrowserSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const authClient = createClientAuthClient(supabase, window.location.origin);
```

#### `AuthProvider`

React Provider для управления состоянием авторизации.

**Пропсы:**
- `authClient` - ClientAuthClient экземпляр
- `initialUser` - Начальный пользователь (опционально)
- `onSignOut` - Callback при выходе (опционально)

#### `useAuth()`

Хук для доступа к функциям авторизации.

```typescript
const {
  user,
  isAuthenticated,
  isLoading,
  login,
  loginWithOAuth,
  logout,
  signUp,
  resetPassword,
  refreshUser,
} = useAuth();
```

### UI компоненты (`@axon-dashboard/auth-sdk/components`)

#### `LoginForm`

Форма входа с поддержкой email/password и OAuth.

**Пропсы:**
- `onLogin: (credentials: LoginCredentials) => Promise<void>`
- `onOAuthLogin: (provider: OAuthProviderType) => Promise<void>`
- `isLoading?: boolean`
- `error?: string | null`
- `showOAuth?: boolean` (по умолчанию `true`)
- `showSignUpLink?: boolean` (по умолчанию `true`)
- `signUpLinkHref?: string` (по умолчанию `/signup`)

#### `SignUpForm`

Форма регистрации.

**Пропсы:**
- `onSignUp: (data: SignUpData) => Promise<void>`
- `onOAuthSignUp: (provider: OAuthProviderType) => Promise<void>`
- `isLoading?: boolean`
- `error?: string | null`
- `showOAuth?: boolean` (по умолчанию `true`)
- `showLoginLink?: boolean` (по умолчанию `true`)
- `loginLinkHref?: string` (по умолчанию `/login`)

#### `ResetPasswordForm`

Форма сброса пароля.

**Пропсы:**
- `onResetPassword: (email: string) => Promise<void>`
- `isLoading?: boolean`
- `error?: string | null`

#### `OAuthButtons`

Кнопки OAuth провайдеров.

**Пропсы:**
- `onOAuthClick: (provider: OAuthProviderType) => Promise<void>`
- `isLoading?: boolean`
- `providers?: OAuthProviderType[]` (по умолчанию `['google', 'github']`)

## 🔧 Типы

```typescript
type UserRole = 'user' | 'admin' | 'superAdmin';

interface User {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

type OAuthProviderType = 'google' | 'github';
```

## 🎯 Примеры использования

### Полный пример страницы входа

```typescript
'use client';

import { LoginForm } from '@axon-dashboard/auth-sdk/components';
import { useAuth } from '@axon-dashboard/auth-sdk/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { login, loginWithOAuth, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleLogin = async (credentials) => {
    setError(null);
    try {
      await login(credentials);
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleOAuthLogin = async (provider) => {
    setError(null);
    try {
      await loginWithOAuth(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <LoginForm
          onLogin={handleLogin}
          onOAuthLogin={handleOAuthLogin}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
```

### Использование серверного клиента в Server Components

```typescript
import { createServerAuthClient, createServerSupabaseClient } from '@axon-dashboard/auth-sdk/server';
import { cookies } from 'next/headers';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      getAll: () => cookieStore.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    }
  );

  const authClient = createServerAuthClient(supabase);
  const user = await authClient.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

## 🔐 Безопасность

- Все токены хранятся в httpOnly cookies
- Роли кэшируются на 5 минут для оптимизации
- Валидация userId при проверке кэша ролей
- Поддержка CSRF защиты через sameSite cookies

## 📝 Примечания

- Модуль требует наличия RPC функции `get_user_role` в Supabase
- Роли хранятся в таблице `admins` в базе данных
- OAuth провайдеры должны быть настроены в Supabase Dashboard

## 🚧 Разработка

```bash
# Установка зависимостей
pnpm install

# Сборка
pnpm build

# Проверка типов
pnpm type-check

# Режим разработки (watch mode)
pnpm dev
```

## 📄 Лицензия

MIT

