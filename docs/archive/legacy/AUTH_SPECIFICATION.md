# Подробная спецификация авторизации с JWT токенами для Next.js приложения

## Обзор архитектуры

Ваше приложение использует Next.js как прокси-сервер между фронтендом и удаленным backend API. Это позволяет:

1. **Централизовать управление токенами** - Next.js обрабатывает refresh токены и автоматически обновляет access токены
2. **Скрыть backend API** - клиент не знает о существовании удаленного сервера
3. **Упростить обработку ошибок** - все ошибки авторизации обрабатываются на уровне Next.js
4. **Использовать HTTP-only cookies** - refresh токены хранятся в безопасных cookies

## Архитектурная схема

```
[Frontend] → [Next.js API Routes] → [Remote Backend API]
     ↓              ↓                        ↓
[AuthContext] → [Token Management] → [JWT Generation]
     ↓              ↓                        ↓
[UI Components] → [Middleware] → [Authentication Logic]
```

## 1. Структура файлов

```
your-app/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts
│   │       ├── logout/route.ts
│   │       ├── refresh-token/route.ts
│   │       ├── me/route.ts
│   │       ├── signup/route.ts
│   │       ├── forgot-password/route.ts
│   │       └── reset-password/route.ts
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── settings/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── context/
│   └── AuthContext.tsx
├── lib/
│   └── api.ts
├── middleware.ts
└── types/
    └── auth.ts
```

## 2. Типы данных

Создайте файл `types/auth.ts`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  requires2FA?: boolean;
  tempToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
```

## 3. API Routes (Next.js прокси)

### 3.1 Login Route (`app/api/auth/login/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    const data = await res.json();

    // Создаем ответ с теми же данными
    const response = NextResponse.json(data, { status: res.status });

    // Пересылаем cookies от backend к клиенту
    const backendCookie = res.headers.get("set-cookie");
    if (backendCookie) {
      response.headers.set("set-cookie", backendCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 3.2 Refresh Token Route (`app/api/auth/refresh-token/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "", // Пересылаем cookies
      },
      credentials: "include",
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });

    // Обновляем cookies если backend их изменил
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
```

### 3.3 Logout Route (`app/api/auth/logout/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      credentials: "include",
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });

    // Очищаем cookies на клиенте
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
```

### 3.4 User Info Route (`app/api/auth/me/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization");

    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: token || "",
        cookie: req.headers.get("cookie") || "",
      },
      credentials: "include",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
```

### 3.5 Signup Route (`app/api/auth/signup/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
```

## 4. AuthContext (`context/AuthContext.tsx`)

```typescript
"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User, AuthResponse } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Ref для предотвращения множественных refresh запросов
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refresh = async () => {
    // Если уже идет процесс обновления токена, ждем его завершения
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const data = await api("/api/auth/refresh-token", { method: "POST" });
        setAccessToken(data.accessToken);

        // Получаем информацию о пользователе
        const userData = await api("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        });
        setUser(userData.user);
      } catch (err) {
        console.error("❌ refresh() failed:", err);
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push("/login");
    }
  };

  const isAuthenticated = !!accessToken && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        setAccessToken,
        refresh,
        logout,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
```

## 5. API Utility (`lib/api.ts`)

```typescript
// Ref для предотвращения множественных refresh запросов
let refreshPromise: Promise<string | null> | null = null;

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: "include", // Важно для cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "Request failed");
  }

  return res.json();
}

// Утилита для API вызовов с автоматическим обновлением токена
export async function authenticatedApi(
  path: string,
  options: RequestInit = {},
  accessToken: string | null,
  refreshToken: () => Promise<void>
) {
  const headers = {
    ...options.headers,
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };

  try {
    return await api(path, { ...options, headers });
  } catch (error: any) {
    // Если токен истек, пытаемся обновить
    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      await refreshToken();

      // Повторяем запрос с новым токеном
      const newHeaders = {
        ...options.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      };
      return await api(path, { ...options, headers: newHeaders });
    }
    throw error;
  }
}

// Улучшенная версия с предотвращением race conditions
export async function apiWithRefresh(
  path: string,
  options: RequestInit = {},
  getAccessToken: () => string | null,
  refreshToken: () => Promise<void>
) {
  const headers = {
    ...options.headers,
    ...(getAccessToken() && { Authorization: `Bearer ${getAccessToken()}` }),
  };

  try {
    return await api(path, { ...options, headers });
  } catch (error: any) {
    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      // Если уже идет процесс обновления, ждем его
      if (refreshPromise) {
        await refreshPromise;
      } else {
        // Создаем новый процесс обновления
        refreshPromise = (async () => {
          await refreshToken();
          return getAccessToken();
        })();
        await refreshPromise;
        refreshPromise = null;
      }

      // Повторяем запрос с обновленным токеном
      const newHeaders = {
        ...options.headers,
        ...(getAccessToken() && {
          Authorization: `Bearer ${getAccessToken()}`,
        }),
      };
      return await api(path, { ...options, headers: newHeaders });
    }
    throw error;
  }
}
```

## 6. Middleware (`middleware.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken");
  const { pathname } = req.nextUrl;

  // Защищенные роуты
  const protectedRoutes = ["/dashboard", "/settings", "/profile"];
  const authRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Если пользователь авторизован и пытается зайти на auth страницы
  if (refreshToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Если пользователь не авторизован и пытается зайти на защищенные страницы
  if (!refreshToken && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/forgot-password",
    "/reset-password",
  ],
};
```

## 7. Страницы

### 7.1 Login Page (`app/login/page.tsx`)

```typescript
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LoginRequest } from "@/types/auth";

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAccessToken } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (res.requires2FA) {
        // Обработка 2FA (если нужно)
        localStorage.setItem("tempToken", res.tempToken);
        router.push("/2fa");
      } else {
        setAccessToken(res.accessToken);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-semibold mb-4">Login</h2>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full px-3 py-2 border rounded mb-3"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full px-3 py-2 border rounded mb-4"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-right mt-4">
          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </a>
        </p>
      </form>
    </div>
  );
}
```

### 7.2 Dashboard Page (`app/dashboard/page.tsx`)

```typescript
"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
        <h2 className="text-xl mb-4">Welcome, {user?.name}!</h2>

        <div className="mb-6 space-y-2">
          <p>You're logged in 🎉</p>
          <p className="text-sm text-gray-600">Email: {user?.email}</p>

          <button
            onClick={() => router.push("/settings")}
            className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-700 transition"
          >
            Go to Settings
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
```

## 8. Layout (`app/layout.tsx`)

```typescript
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your App",
  description: "Your app description",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

## 9. Переменные окружения

Создайте файл `.env.local`:

```env
BACKEND_URL=http://your-backend-server.com
NEXTAUTH_SECRET=your-secret-key
```

## 10. Ключевые особенности реализации

### 10.1 Управление токенами

- **Access Token**: хранится в состоянии React (временный)
- **Refresh Token**: хранится в HTTP-only cookies (безопасный)
- **Автоматическое обновление**: при истечении access token

### 10.2 Безопасность

- Все API вызовы к backend проходят через Next.js API routes
- Refresh токены недоступны для JavaScript (HTTP-only cookies)
- Автоматическая очистка токенов при logout

### 10.3 Обработка ошибок

- Централизованная обработка ошибок авторизации
- Автоматический retry с обновленным токеном
- Graceful fallback на страницу логина

### 10.4 Middleware

- Защита роутов на уровне Next.js
- Редиректы для неавторизованных пользователей
- Предотвращение доступа к auth страницам для авторизованных

## 11. Интеграция с вашим backend

Ваш backend должен поддерживать:

1. **Login endpoint**: `POST /api/auth/login`

   - Возвращает: `{ accessToken, user, requires2FA? }`
   - Устанавливает refresh token в HTTP-only cookie

2. **Refresh endpoint**: `POST /api/auth/refresh-token`

   - Читает refresh token из cookies
   - Возвращает: `{ accessToken }`
   - Обновляет refresh token в cookies

3. **Logout endpoint**: `POST /api/auth/logout`

   - Очищает refresh token cookie

4. **User info endpoint**: `GET /api/auth/me`
   - Принимает Authorization header с access token
   - Возвращает: `{ user }`

## 12. Преимущества этой архитектуры

1. **Безопасность**: Refresh токены недоступны для XSS атак
2. **Простота**: Фронтенд не знает о сложности управления токенами
3. **Масштабируемость**: Легко добавить новые endpoints
4. **Централизация**: Вся логика авторизации в одном месте
5. **SSR совместимость**: Работает с Server-Side Rendering

## 13. Сценарии работы с токенами

### 13.1 Перезагрузка страницы

- Access token теряется (хранится в памяти)
- Refresh token остается (HTTP-only cookie)
- При загрузке страницы автоматически вызывается refresh()
- Получается новый access token

### 13.2 Работа более 15 минут

- Access token истекает
- При следующем API запросе получаем 401 ошибку
- Автоматически вызывается refresh()
- Получается новый access token
- Запрос повторяется с новым токеном

### 13.3 Множественные запросы при истекшем токене

- Используется механизм предотвращения race conditions
- Только один refresh запрос выполняется одновременно
- Остальные запросы ждут завершения refresh
- Все запросы повторяются с новым токеном

Эта архитектура позволит вам легко интегрировать авторизацию в ваше Next.js приложение, используя удаленный backend как источник данных, но управляя всей логикой авторизации на уровне Next.js.
