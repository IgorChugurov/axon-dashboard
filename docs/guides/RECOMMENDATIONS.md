# Рекомендации по оптимизации архитектуры

## 🎯 Что было сделано

### ✅ Обновлена система токенов:

1. **`app/api/projects/route.ts`** - теперь работает как прокси к бэкенду

   - Автоматическая проверка токенов
   - Автоматическое обновление при истечении
   - Правильная обработка `exp` в секундах
   - Логирование для отладки

2. **`lib/auth/server-auth.ts`** - обновлена логика refresh

   - Использование `exp` напрямую из ответа бэкенда
   - Буфер 10 секунд для предотвращения race conditions
   - Подробное логирование

3. **`app/page.tsx`** - добавлена обработка ошибок
   - Редирект на `/login` при 401
   - Улучшенная обработка ошибок
   - Поддержка разных форматов ответа

## 📋 Следующие шаги

### 1. Настроить переменные окружения

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-actual-backend-url.com
```

### 2. Проверить формат ответа бэкенда

Убедитесь что ваш бэкенд возвращает правильный формат:

**POST /api/authentication/sign-in:**

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "exp": 1761573754, // Unix timestamp в СЕКУНДАХ
  "email": "user@example.com"
}
```

**POST /api/authentication/refresh-tokens:**

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "exp": 1761573754, // Unix timestamp в СЕКУНДАХ
  "email": "user@example.com"
}
```

**GET /api/projects:**
Может быть любой формат, например:

```json
{
  "data": [...],
  "pagination": {...}
}
```

или просто:

```json
[...]
```

### 3. Протестировать флоу авторизации

**Тест 1: Логин**

```bash
1. Откройте /login
2. Введите credentials
3. Проверьте что перенаправляет на /
4. Откройте DevTools → Application → Cookies
5. Проверьте наличие: accessToken, refreshToken, expiresAt, userData
```

**Тест 2: SSR с валидным токеном**

```bash
1. После логина сразу откройте /
2. Страница должна загрузиться с данными без спиннера
3. В консоли сервера (terminal) должны быть логи:
   [ServerAuth] Token not expired
   [Projects API] Fetching from backend: ...
```

**Тест 3: Обновление токена**

```bash
1. Подождите пока токен истечёт (или искусственно измените exp в cookies)
2. Нажмите "Обновить список"
3. В консоли должно быть:
   [Projects API] Token expired, refreshing...
   [ServerAuth] Refreshing tokens...
   [ServerAuth] Tokens refreshed successfully
   [Projects API] Fetching from backend: ...
4. Данные должны обновиться
```

**Тест 4: Неудачный refresh**

```bash
1. Удалите refreshToken из cookies (DevTools)
2. Нажмите "Обновить список"
3. Должен произойти редирект на /login
4. В консоли: "Unauthorized, redirecting to login..."
```

### 4. Создать API Routes для других сущностей

Используйте `app/api/projects/route.ts` как шаблон:

```typescript
// app/api/entities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";

export async function GET(request: NextRequest) {
  // 1. Проверка токенов
  const tokens = await ServerAuth.getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Обновление если истёк
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
    cache: "no-store",
  });

  if (response.status === 401) {
    await ServerAuth.clearAuth();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Backend request failed", details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

// Аналогично для POST, PUT, DELETE
```

### 5. Создать универсальный хелпер (опционально)

Для уменьшения дублирования кода:

```typescript
// lib/auth/api-proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "./server-auth";

interface ProxyConfig {
  backendPath: string;
  method?: string;
  body?: any;
}

export async function proxyToBackend(
  request: NextRequest,
  config: ProxyConfig
): Promise<NextResponse> {
  // 1. Проверка токенов
  const tokens = await ServerAuth.getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Обновление если истёк
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

  // 4. Построить URL
  const { searchParams } = new URL(request.url);
  const backendUrl = new URL(
    `${process.env.NEXT_PUBLIC_API_URL}${config.backendPath}`
  );
  searchParams.forEach((value, key) =>
    backendUrl.searchParams.append(key, value)
  );

  // 5. Запрос к бэкенду
  const response = await fetch(backendUrl.toString(), {
    method: config.method || request.method,
    headers: {
      Authorization: `Bearer ${validTokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: config.body ? JSON.stringify(config.body) : undefined,
    cache: "no-store",
  });

  // 6. Обработка ответа
  if (response.status === 401) {
    await ServerAuth.clearAuth();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Backend request failed", details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

// Использование:
// app/api/entities/route.ts
export async function GET(request: NextRequest) {
  return proxyToBackend(request, { backendPath: "/api/entities" });
}
```

### 6. Удалить deprecated код

После полного перехода на новую архитектуру:

```bash
# Эти файлы больше не нужны (не могут работать с httpOnly cookies)
- lib/auth/client-api-client.ts
- lib/auth/client-cookies.ts

# Или пометить их как deprecated
```

### 7. Настроить обработку ошибок глобально

```typescript
// lib/auth/fetch-with-auth.ts
export async function fetchWithAuth(url: string, options?: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Глобальная обработка 401
    console.log("Unauthorized, redirecting to login...");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Использование в компонентах:
const data = await fetchWithAuth("/api/projects");
```

## 🚨 Важные моменты

### 1. Время жизни токенов

Ваш бэкенд возвращает `exp` в **секундах** (Unix timestamp):

```javascript
exp: 1761573754; // Это секунды!
```

В коде всегда используйте:

```javascript
const now = Date.now() / 1000; // Делим на 1000!
const isExpired = exp <= now + 10;
```

### 2. HttpOnly Cookies

- ❌ Не доступны из JavaScript на клиенте
- ✅ Доступны только в Server Components и API Routes
- ✅ Автоматически передаются в запросах

### 3. API Routes как прокси

Все запросы к бэкенду **ДОЛЖНЫ** идти через Next.js API Routes:

```javascript
// ❌ НЕПРАВИЛЬНО
fetch("https://backend.com/api/projects");

// ✅ ПРАВИЛЬНО
fetch("/api/projects"); // Next.js добавит токен
```

### 4. Обработка 401 на клиенте

Всегда проверяйте статус 401 и делайте редирект:

```javascript
if (response.status === 401) {
  window.location.href = "/login";
  return;
}
```

## 📊 Мониторинг и отладка

### Логи сервера (terminal):

```
[ServerAuth] Token expired: { expiresAt: ..., now: ..., diff: ... }
[ServerAuth] Refreshing tokens...
[ServerAuth] Tokens refreshed successfully: { expiresAt: ..., timeLeft: ... }
[Projects API] Fetching from backend: https://...
```

### Логи клиента (browser console):

```
Unauthorized, redirecting to login...
```

### DevTools Cookies:

```
accessToken: ABC123...
refreshToken: XYZ789...
expiresAt: 1761573754
userData: {"email":"user@example.com"}
```

## 🔐 Безопасность

### Преимущества httpOnly cookies:

1. **Защита от XSS**: токены недоступны из JavaScript
2. **Автоматическая передача**: браузер сам добавляет cookies
3. **Защита от CSRF**: sameSite: 'lax'
4. **Контроль времени жизни**: maxAge

### Best Practices:

1. Всегда используйте `secure: true` в production
2. Используйте `sameSite: 'lax'` или `'strict'`
3. Устанавливайте разные maxAge для access и refresh токенов
4. Логируйте попытки неудачного refresh
5. Очищайте все cookies при logout

## 🎯 Итоговая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
│  • fetch('/api/projects')                               │
│  • HttpOnly cookies автоматически передаются            │
│  • НЕТ доступа к токенам из JavaScript                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Next.js API Routes (Server)                │
│  • Читает httpOnly cookies                              │
│  • Проверяет exp (в секундах!)                          │
│  • Обновляет токены если нужно                          │
│  • Делает запрос к бэкенду с Bearer token               │
│  • Возвращает данные клиенту                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Your Backend API                       │
│  • /api/authentication/sign-in                          │
│  • /api/authentication/refresh-tokens                   │
│  • /api/projects, /api/entities, etc.                   │
│  • Возвращает: { accessToken, refreshToken, exp }       │
└─────────────────────────────────────────────────────────┘
```

## ✅ Финальный чеклист

### Обязательно:

- [ ] Настроить `NEXT_PUBLIC_API_URL` в `.env.local`
- [ ] Убедиться что бэкенд возвращает `exp` в секундах
- [ ] Протестировать логин
- [ ] Протестировать refresh токена
- [ ] Протестировать кнопку "Обновить список"
- [ ] Проверить обработку 401 ошибок
- [ ] Проверить что cookies устанавливаются правильно

### Рекомендуется:

- [ ] Создать API Routes для всех сущностей
- [ ] Создать универсальный прокси-хелпер
- [ ] Добавить глобальную обработку ошибок
- [ ] Настроить логирование в production
- [ ] Удалить deprecated client-side код
- [ ] Добавить unit тесты для auth логики
- [ ] Настроить monitoring для failed refresh

### Опционально:

- [ ] Добавить SSR для других страниц
- [ ] Настроить кеширование (revalidate)
- [ ] Добавить optimistic UI updates
- [ ] Реализовать retry логику для failed requests
- [ ] Добавить rate limiting для refresh токена

## 🆘 Частые проблемы и решения

### Проблема: Токен постоянно истекает

**Решение:** Проверьте что бэкенд возвращает `exp` в секундах, а не миллисекундах

### Проблема: Refresh токен не работает

**Решение:** Проверьте endpoint бэкенда и формат тела запроса

### Проблема: Cookies не сохраняются

**Решение:** Проверьте что используете `await cookies()` и что домены совпадают

### Проблема: 401 после обновления страницы

**Решение:** Проверьте middleware и что токены правильно читаются из cookies

### Проблема: CORS ошибки

**Решение:** Все запросы должны идти через Next.js API Routes, не напрямую к бэкенду

## 📚 Дополнительные ресурсы

- `NEXTJS_AUTH_ARCHITECTURE.md` - Полная документация архитектуры
- `TOKEN_FLOW_SUMMARY.md` - Краткая справка по флоу токенов
- `AUTH_README.md` - Документация текущей системы авторизации

## 🎉 Готово!

Ваша система теперь готова к работе. Основные преимущества:

1. ✅ Безопасное хранение токенов
2. ✅ Автоматическое обновление
3. ✅ SSR с данными
4. ✅ Простое клиентское API
5. ✅ Единая точка авторизации

Удачи с разработкой админ-панели! 🚀
