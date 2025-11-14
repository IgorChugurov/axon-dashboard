# Next.js Admin Panel Authentication Architecture

## 🎯 Цель

Создать оптимальную архитектуру аутентификации для админ-панели на Next.js с SSR и Client-side взаимодействием.

## 📊 Сравнение: SPA React vs Next.js

### Старая SPA архитектура (React):

```
Browser → localStorage → Direct Backend API calls
- Токены в localStorage
- Все запросы напрямую к бэкенду
- Обновление токенов на клиенте
```

### Новая Next.js архитектура:

```
Browser → Next.js API Routes → Backend API
- Токены в httpOnly cookies (безопаснее)
- Запросы через Next.js API routes (прокси)
- Обновление токенов на сервере Next.js
```

## 🏗️ Архитектура

### 1. Initial Page Load (SSR)

```typescript
// app/page.tsx (Server Component)
export default async function ProjectsPage() {
  // 1. Next.js проверяет cookies на сервере
  const tokens = await ServerAuth.getTokens();

  // 2. Если токен истек -> обновляем через refresh
  if (await ServerAuth.isTokenExpired()) {
    await ServerAuth.refreshTokens();
  }

  // 3. Делаем запрос к бэкенду С СЕРВЕРА
  const projects = await serverApiClient.request({
    url: "/api/projects",
  });

  // 4. Рендерим страницу с данными
  return <ProjectsList initialData={projects} />;
}
```

**Преимущества:**

- ✅ Быстрый первый рендер
- ✅ SEO-friendly
- ✅ Токены автоматически обновляются на сервере
- ✅ Пользователь сразу видит данные

### 2. Client-side Updates (CSR)

```typescript
// app/page.tsx (Client Component part)
"use client";

export function ProjectsList({ initialData }) {
  const [projects, setProjects] = useState(initialData);

  const refreshProjects = async () => {
    // Запрос к ВНУТРЕННЕМУ API Next.js
    const response = await fetch("/api/projects");
    const data = await response.json();
    setProjects(data);
  };

  return (
    <>
      <Button onClick={refreshProjects}>Обновить</Button>
      {projects.map((project) => (
        <ProjectCard key={project.id} {...project} />
      ))}
    </>
  );
}
```

**Что происходит при клике:**

1. `fetch('/api/projects')` - идёт к Next.js API route
2. Next.js API route проверяет cookies (httpOnly)
3. Если токен истёк -> обновляет через refresh token
4. Делает запрос к бэкенду с валидным токеном
5. Возвращает данные клиенту
6. Клиент обновляет UI

## 🔐 Token Flow

### Формат токенов из вашего бэкенда:

```javascript
{
  accessToken: 'D01FFA41149C003055F9F9D49B7DC2033842EB08E375908B4DD294BEE285C136',
  exp: 1761573754,  // Unix timestamp в секундах
  refreshToken: 'AB0714B5A7B01B7E899B2650022DE99C23DA3689934796F166AC38E0F4317C75',
  email: 'super.admin@opiesoftware.com'
}
```

### Хранение:

```typescript
// В httpOnly cookies (безопасно, недоступно из JS)
cookies.set("accessToken", token.accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 15 * 60, // 15 минут
});

cookies.set("refreshToken", token.refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60, // 7 дней
});

cookies.set("expiresAt", token.exp.toString(), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60,
});
```

### Проверка истечения токена:

```typescript
// lib/auth/server-auth.ts
static async isTokenExpired(): Promise<boolean> {
  const tokens = await this.getTokens();
  if (!tokens) return true;

  const now = Date.now() / 1000; // Текущее время в секундах

  // Буфер 10 секунд для предотвращения race conditions
  return tokens.expiresAt <= now + 10;
}
```

### Обновление токенов:

```typescript
// lib/auth/server-auth.ts
static async refreshTokens(): Promise<AuthTokens | null> {
  const tokens = await this.getTokens();
  if (!tokens?.refreshToken) return null;

  try {
    // Запрос к вашему бэкенду
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/authentication/refresh-tokens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.exp // Используем exp из ответа
    };

    // Сохраняем новые токены в cookies
    await this.setTokens(newTokens);
    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}
```

## 🔄 Complete Request Flow

### Scenario 1: SSR (Initial Page Load)

```
1. User opens /projects
2. Next.js middleware checks cookies
   → accessToken exists ✓
   → refreshToken exists ✓
3. Server Component renders
4. ServerAuth.isTokenExpired() checks exp
   → exp: 1761573754
   → now: 1761573744
   → expired: false (still 10 seconds left)
5. Make request to backend with accessToken
6. Backend returns projects data
7. Page renders with data
```

### Scenario 2: SSR with Expired Token

```
1. User opens /projects
2. Next.js middleware checks cookies
   → accessToken exists ✓
   → refreshToken exists ✓
3. Server Component renders
4. ServerAuth.isTokenExpired() checks exp
   → exp: 1761573744
   → now: 1761573754
   → expired: true (10 seconds passed)
5. ServerAuth.refreshTokens() is called
   → POST to backend /api/authentication/refresh-tokens
   → Backend returns new tokens with new exp
   → Save new tokens to cookies
6. Make request to backend with NEW accessToken
7. Backend returns projects data
8. Page renders with data
```

### Scenario 3: Client-side Refresh Button

```
1. User clicks "Обновить список"
2. Frontend: fetch('/api/projects')
3. Next.js API Route: /app/api/projects/route.ts
   → Read httpOnly cookies (accessToken, refreshToken, expiresAt)
   → Check if token expired
   → If expired: call backend refresh-tokens endpoint
   → Update cookies with new tokens
   → Make request to backend with valid token
   → Return data to client
4. Client updates UI with new data
```

### Scenario 4: Token Refresh Failed

```
1. User action triggers API call
2. Next.js API route tries to refresh token
3. Backend returns 401 (refresh token expired/invalid)
4. Next.js API route clears all cookies
5. Next.js API route returns 401 to client
6. Client redirects to /login
```

## 📁 File Structure

```
/app
  /api
    /projects
      route.ts          # Прокси к бэкенду для проектов
    /entities
      route.ts          # Прокси к бэкенду для сущностей
    /auth
      /refresh
        route.ts        # Endpoint для обновления токенов
      /set-tokens
        route.ts        # Endpoint для сохранения токенов
      /clear-auth
        route.ts        # Endpoint для очистки auth
  /projects
    page.tsx            # Server Component + Client logic
  page.tsx              # Главная страница

/lib
  /auth
    server-auth.ts      # Серверные функции работы с токенами
    server-api-client.ts # HTTP клиент для серверных запросов
    client-api-client.ts # HTTP клиент для клиентских запросов (DEPRECATED)
    types.ts            # Типы
```

## 🚀 Implementation Steps

### Step 1: Update API Route for Projects

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";

export async function GET(request: NextRequest) {
  try {
    // 1. Проверяем токены
    const tokens = await ServerAuth.getTokens();
    if (!tokens) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Проверяем истечение и обновляем если нужно
    if (await ServerAuth.isTokenExpired()) {
      const newTokens = await ServerAuth.refreshTokens();
      if (!newTokens) {
        await ServerAuth.clearAuth();
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }
    }

    // 3. Получаем актуальный токен
    const validTokens = await ServerAuth.getTokens();
    if (!validTokens) {
      return NextResponse.json({ error: "No valid tokens" }, { status: 401 });
    }

    // 4. Делаем запрос к бэкенду
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL(
      `${process.env.NEXT_PUBLIC_API_URL}/api/projects`
    );
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      headers: {
        Authorization: `Bearer ${validTokens.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Backend request failed");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
```

### Step 2: Create Server Component for SSR

```typescript
// app/projects/page.tsx
import { ServerAuth } from "@/lib/auth/server-auth";
import { serverApiClient } from "@/lib/auth/server-api-client";
import { ProjectsList } from "./ProjectsList";

export default async function ProjectsPage() {
  // Проверяем авторизацию (редирект если нет)
  await ServerAuth.requireAuth();

  try {
    // Получаем проекты на сервере
    const projects = await serverApiClient.request({
      url: "/api/projects",
    });

    return <ProjectsList initialData={projects} />;
  } catch (error) {
    return <div>Ошибка загрузки проектов</div>;
  }
}
```

### Step 3: Create Client Component for Interactions

```typescript
// app/projects/ProjectsList.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProjectsList({ initialData }) {
  const [projects, setProjects] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleRefresh} disabled={loading}>
        {loading ? "Загрузка..." : "Обновить список"}
      </Button>

      {projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

## ⚠️ Важные моменты

### 1. HttpOnly Cookies

- ❌ **НЕ ДОСТУПНЫ** из JavaScript (`document.cookie`)
- ✅ **ДОСТУПНЫ** только на сервере (Next.js API routes, Server Components)
- ✅ **БЕЗОПАСНО** - защита от XSS атак

### 2. Время жизни токенов

Из вашего бэкенда приходит `exp` в **секундах** Unix timestamp:

```javascript
exp: 1761573754; // Это СЕКУНДЫ, не миллисекунды!
```

В JavaScript нужно:

```javascript
const now = Date.now() / 1000; // Делим на 1000!
const isExpired = tokens.expiresAt <= now + 10; // Буфер 10 сек
```

### 3. Refresh Token Strategy

- Проверка ПЕРЕД каждым запросом
- Автоматическое обновление если exp <= now + 10
- Retry запроса после обновления токена
- Logout если refresh failed

### 4. Error Handling

```typescript
// В API routes
if (response.status === 401) {
  await ServerAuth.clearAuth();
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// На клиенте
if (response.status === 401) {
  window.location.href = "/login";
}
```

## 🔍 Debugging

### Проверка токенов в cookies:

```typescript
// В Server Component или API Route
const tokens = await ServerAuth.getTokens();
console.log("Access Token:", tokens?.accessToken);
console.log("Refresh Token:", tokens?.refreshToken);
console.log("Expires At:", tokens?.expiresAt);
console.log("Current Time:", Date.now() / 1000);
console.log("Is Expired:", await ServerAuth.isTokenExpired());
```

### Проверка запросов к бэкенду:

```typescript
console.log("Request URL:", backendUrl.toString());
console.log("Request Headers:", {
  Authorization: `Bearer ${tokens.accessToken.substring(0, 20)}...`,
});
```

## 📊 Performance Considerations

### SSR (Initial Load):

- ⚡ Fast First Contentful Paint
- ⚡ SEO-friendly
- ⚡ No loading spinners

### CSR (Client Updates):

- ⚡ Optimistic UI updates
- ⚡ Background refresh
- ⚡ No full page reload

### Caching:

```typescript
// Можно добавить кеширование в Next.js
export const revalidate = 60; // Revalidate every 60 seconds
```

## 🎯 Best Practices

1. **Всегда используйте Server Components для начальной загрузки данных**
2. **Client Components только для интерактивности**
3. **Все запросы к бэкенду через Next.js API routes** (никогда напрямую с клиента)
4. **Обновление токенов ТОЛЬКО на сервере**
5. **Проверка exp с буфером 10 секунд**
6. **Logout при failed refresh**
7. **Единая обработка ошибок**

## 🔐 Security Benefits vs SPA

### Old SPA (localStorage):

- ❌ Vulnerable to XSS
- ❌ Tokens accessible from JavaScript
- ❌ Hard to implement proper refresh logic

### New Next.js (httpOnly cookies):

- ✅ Protected from XSS
- ✅ Tokens not accessible from JavaScript
- ✅ Server-side token refresh
- ✅ Automatic token management

## 📝 Migration Checklist

- [ ] Обновить ServerAuth для работы с вашим бэкендом
- [ ] Создать API routes для всех сущностей (/api/projects, /api/entities, etc.)
- [ ] Конвертировать страницы в Server Components
- [ ] Выделить интерактивные части в Client Components
- [ ] Удалить ClientApiClient (deprecated)
- [ ] Обновить middleware для корректной проверки
- [ ] Настроить правильное время exp (секунды!)
- [ ] Тестировать флоу refresh token
- [ ] Добавить обработку ошибок 401
- [ ] Убрать моковые данные, подключить реальный бэкенд
