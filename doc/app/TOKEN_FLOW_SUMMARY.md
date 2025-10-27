# Token Flow Summary - Quick Reference

## 🎯 Ключевые изменения в архитектуре

### ❌ Старая SPA архитектура (React):

```javascript
// Клиент → localStorage → Прямой запрос к бэкенду
localStorage.setItem(
  "user",
  JSON.stringify({ accessToken, refreshToken, exp })
);

// При запросе
const token = JSON.parse(localStorage.getItem("user")).accessToken;
fetch("https://backend.com/api/projects", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### ✅ Новая Next.js архитектура:

```javascript
// Клиент → Next.js API Route → Бэкенд
// Токены в httpOnly cookies (безопасно, недоступно из JS)

// Клиент делает запрос к Next.js
fetch("/api/projects"); // Внутренний API Next.js

// Next.js API Route обрабатывает токены и делает запрос к бэкенду
```

## 🔄 Полный флоу работы

### 1️⃣ Логин

```
User → /login → POST /api/auth/login
  ↓
Backend: POST /api/authentication/sign-in
  ↓ Response: { accessToken, refreshToken, exp, email }
  ↓
Next.js: Сохраняет в httpOnly cookies
  ↓
Redirect → /
```

### 2️⃣ SSR - Первая загрузка страницы

```
User открывает /
  ↓
Next.js Middleware: Проверяет cookies (accessToken, refreshToken)
  ↓ Есть токены ✓
  ↓
Server Component рендерится
  ↓
ServerAuth.isTokenExpired()
  ↓ exp: 1761573754, now: 1761573744 → NOT expired
  ↓
ServerApiClient.request('/api/projects')
  ↓ Authorization: Bearer {accessToken}
  ↓
Backend возвращает проекты
  ↓
Страница рендерится с данными
```

### 3️⃣ SSR с истекшим токеном

```
User открывает /
  ↓
Server Component рендерится
  ↓
ServerAuth.isTokenExpired()
  ↓ exp: 1761573744, now: 1761573754 → EXPIRED!
  ↓
ServerAuth.refreshTokens()
  ↓ POST /api/authentication/refresh-tokens
  ↓ Backend: { accessToken, refreshToken, exp, email }
  ↓ Сохраняет новые токены в cookies
  ↓
ServerApiClient.request('/api/projects') с НОВЫМ токеном
  ↓
Backend возвращает проекты
  ↓
Страница рендерится с данными
```

### 4️⃣ Клик по кнопке "Обновить список"

```
User нажимает "Обновить список"
  ↓
fetch('/api/projects')  ← Запрос к Next.js API Route
  ↓
/app/api/projects/route.ts (GET handler)
  ↓
1. ServerAuth.getTokens() - читает httpOnly cookies
  ↓
2. ServerAuth.isTokenExpired() - проверяет exp
  ↓ Если истёк → ServerAuth.refreshTokens()
  ↓
3. fetch('BACKEND_URL/api/projects', {
     headers: { Authorization: `Bearer ${accessToken}` }
   })
  ↓
4. Backend возвращает проекты
  ↓
5. NextResponse.json(data) → Клиенту
  ↓
setProjects(data.data) - обновляет UI
```

## 🔐 Важные детали токенов

### Формат ответа от вашего бэкенда:

```javascript
{
  accessToken: 'D01FFA41149C003055F9F9D49B7DC2033842EB08E375908B4DD294BEE285C136',
  exp: 1761573754,  // ← СЕКУНДЫ, не миллисекунды!
  refreshToken: 'AB0714B5A7B01B7E899B2650022DE99C23DA3689934796F166AC38E0F4317C75',
  email: 'super.admin@opiesoftware.com'
}
```

### Проверка истечения (ВАЖНО!):

```typescript
// ❌ НЕПРАВИЛЬНО - сравнение миллисекунд с секундами
const now = Date.now(); // 1761573754000
const isExpired = tokens.expiresAt <= now; // ВСЕГДА true!

// ✅ ПРАВИЛЬНО - всё в секундах
const now = Date.now() / 1000; // 1761573754
const isExpired = tokens.expiresAt <= now + 10; // Буфер 10 секунд
```

### Хранение в cookies:

```typescript
cookies.set("accessToken", token, {
  httpOnly: true, // ← НЕ доступен из JavaScript!
  secure: true, // ← Только HTTPS в production
  sameSite: "lax",
  maxAge: 15 * 60, // 15 минут
});

cookies.set("expiresAt", exp.toString(), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60, // 7 дней
});
```

## 📁 Структура файлов

### Серверные (работают с httpOnly cookies):

- ✅ `lib/auth/server-auth.ts` - Управление токенами на сервере
- ✅ `lib/auth/server-api-client.ts` - HTTP клиент для Server Components
- ✅ `app/api/projects/route.ts` - API Route (прокси к бэкенду)
- ✅ `app/api/auth/*/route.ts` - Auth endpoints

### Клиентские (НЕ имеют доступа к httpOnly cookies):

- ✅ `app/page.tsx` - Client Component для UI
- ⚠️ `lib/auth/client-api-client.ts` - DEPRECATED (не может читать httpOnly cookies!)
- ⚠️ `lib/auth/client-cookies.ts` - DEPRECATED (не работает с httpOnly!)

## 🚀 Как добавить новую сущность

### Пример: создание API для entities

**1. Создать API Route:**

```typescript
// app/api/entities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";

export async function GET(request: NextRequest) {
  // 1. Проверить токены
  const tokens = await ServerAuth.getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Обновить если истёк
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

  // 3. Получить актуальные токены
  const validTokens = await ServerAuth.getTokens();
  if (!validTokens) {
    return NextResponse.json({ error: "No valid tokens" }, { status: 401 });
  }

  // 4. Запрос к бэкенду
  const { searchParams } = new URL(request.url);
  const backendUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/entities`);
  searchParams.forEach((value, key) =>
    backendUrl.searchParams.append(key, value)
  );

  const response = await fetch(backendUrl.toString(), {
    headers: {
      Authorization: `Bearer ${validTokens.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    await ServerAuth.clearAuth();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Backend request failed" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
```

**2. Использовать на клиенте:**

```typescript
// app/entities/page.tsx
"use client";

export function EntitiesList() {
  const [entities, setEntities] = useState([]);

  const fetchEntities = async () => {
    const response = await fetch("/api/entities");

    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await response.json();
    setEntities(data);
  };

  return <button onClick={fetchEntities}>Загрузить сущности</button>;
}
```

## ⚠️ Типичные ошибки

### 1. Попытка читать httpOnly cookies на клиенте

```javascript
// ❌ НЕ РАБОТАЕТ!
const token = document.cookie.split(";").find((c) => c.includes("accessToken"));
// httpOnly cookies недоступны из JavaScript!

// ✅ ПРАВИЛЬНО
const response = await fetch("/api/projects"); // Next.js читает cookies
```

### 2. Неправильное сравнение времени

```javascript
// ❌ НЕПРАВИЛЬНО
const isExpired = tokens.expiresAt <= Date.now(); // Миллисекунды!

// ✅ ПРАВИЛЬНО
const isExpired = tokens.expiresAt <= Date.now() / 1000; // Секунды
```

### 3. Прямые запросы к бэкенду с клиента

```javascript
// ❌ НЕПРАВИЛЬНО - токены недоступны на клиенте
fetch("https://backend.com/api/projects", {
  headers: { Authorization: `Bearer ${token}` }, // Откуда token?
});

// ✅ ПРАВИЛЬНО - через Next.js API Route
fetch("/api/projects"); // Next.js добавит токен автоматически
```

## 🐛 Дебаг

### Проверка токенов в консоли сервера:

```typescript
// В API Route или Server Component
const tokens = await ServerAuth.getTokens();
console.log("Tokens:", {
  hasAccessToken: !!tokens?.accessToken,
  hasRefreshToken: !!tokens?.refreshToken,
  expiresAt: tokens?.expiresAt,
  now: Date.now() / 1000,
  timeLeft: tokens ? tokens.expiresAt - Date.now() / 1000 : 0,
  isExpired: await ServerAuth.isTokenExpired(),
});
```

### Проверка запроса к бэкенду:

```typescript
console.log("Backend request:", {
  url: backendUrl.toString(),
  token: validTokens.accessToken.substring(0, 20) + "...",
  method: "GET",
});
```

## ✅ Чек-лист реализации

- [x] API Route для проектов создан (`/app/api/projects/route.ts`)
- [x] Правильная проверка `exp` в секундах
- [x] Автоматическое обновление токенов при истечении
- [x] Обработка 401 ошибок на клиенте
- [x] Логирование для отладки
- [ ] Подключить реальный бэкенд (заменить `NEXT_PUBLIC_API_URL`)
- [ ] Убедиться что бэкенд возвращает `exp` в секундах
- [ ] Протестировать флоу с истекшим токеном
- [ ] Создать API Routes для всех сущностей
- [ ] Удалить deprecated client-side код

## 🔧 Настройка окружения

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 📞 Endpoints бэкенда

```
POST /api/authentication/sign-in          - Логин
POST /api/authentication/refresh-tokens   - Обновление токенов
GET  /api/projects                        - Список проектов
POST /api/projects                        - Создание проекта
GET  /api/entities                        - Список сущностей
... (добавить остальные)
```

## 🎯 Итоговый результат

### Преимущества новой архитектуры:

1. ✅ **Безопасность**: токены в httpOnly cookies, недоступны из JS
2. ✅ **SSR**: быстрая первая загрузка с данными
3. ✅ **Автоматизация**: токены обновляются автоматически
4. ✅ **Простота**: клиент не думает о токенах, просто делает fetch
5. ✅ **Надёжность**: единая точка обработки авторизации
6. ✅ **SEO**: страницы рендерятся с данными на сервере

### Флоу работы:

```
Логин → Cookies установлены → SSR (данные сразу) →
Клик "Обновить" → API Route → Проверка токенов →
Обновление если нужно → Запрос к бэкенду → Данные клиенту
```

Всё работает прозрачно для пользователя! 🎉
