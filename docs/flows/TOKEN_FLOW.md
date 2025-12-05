# Token Flow - Поток работы с токенами

**Дата обновления:** 2025-01-30  
**Статус:** ✅ Актуально

---

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

### ✅ Новая Next.js архитектура (Supabase SSR):

```javascript
// Клиент → Next.js Middleware → Supabase Auth
// Токены в httpOnly cookies (безопасно, недоступно из JS)

// Клиент делает запрос к Next.js
fetch("/api/projects"); // Внутренний API Next.js

// Next.js Middleware автоматически обновляет токены через Supabase
```

---

## 🔄 Полный флоу работы

### 1️⃣ Логин

```
User → /login → Supabase Auth
  ↓
Supabase: signInWithPassword()
  ↓ Response: { access_token, refresh_token, expires_at, user }
  ↓
Next.js Middleware: Сохраняет в httpOnly cookies
  ↓
Redirect → /
```

### 2️⃣ SSR - Первая загрузка страницы

```
User открывает /
  ↓
Next.js Middleware: updateSession()
  ↓
Supabase: getUser() → проверяет токен
  ↓ Токен валиден ✓
  ↓
Server Component рендерится
  ↓
Supabase Server Client: запрос к БД
  ↓
Страница рендерится с данными
```

### 3️⃣ Автоматическое обновление токенов

```
User делает запрос
  ↓
Next.js Middleware: updateSession()
  ↓
Supabase: getUser() → проверяет токен
  ↓ Токен истек!
  ↓
Supabase: refreshSession() → обновляет токен
  ↓
Сохраняет новые токены в cookies
  ↓
Продолжает обработку запроса
```

---

## 🛡️ Защита от Race Conditions

### Сценарий: 5 параллельных запросов с истекшим токеном

```
Time: 0ms
├─ Запрос 1: GET /dashboard
├─ Запрос 2: GET /projects  
├─ Запрос 3: GET /settings  
├─ Запрос 4: GET /users     
└─ Запрос 5: GET /api/data  

Time: 1ms - middleware.ts вызывает updateSession()
├─ Запрос 1: 
│   ├─ sessionKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6..." (первые 30 символов)
│   ├─ Map.get(sessionKey) → undefined (нет активного обновления)
│   ├─ Создает Promise обновления токена
│   ├─ Map.set(sessionKey, Promise)
│   └─ Начинает обновление: supabase.auth.getUser()
│
├─ Запрос 2-5 (через 1-4ms):
│   ├─ sessionKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6..." (тот же!)
│   ├─ Map.get(sessionKey) → Promise (найден!)
│   └─ await Promise (ждет завершения обновления от Запроса 1)

Time: 50ms - Supabase API возвращает новый токен
└─ Запрос 1: Promise resolve(user)
    ├─ setAll() → сохраняет новые токены в cookies
    └─ return { response, user }

Time: 51ms - Все запросы получают результат
├─ Запрос 1-5: Promise resolve → получают user
└─ Все запросы используют обновленный токен

ИТОГО: 
✅ 1 запрос к Supabase API (вместо 5)
✅ Все запросы получили обновленный токен
✅ Экономия: 4 лишних запроса предотвращены
```

### Архитектура защиты

```typescript
// lib/supabase/middleware.ts
const refreshPromises = new Map<string, Promise<User | null>>();

export async function updateSession(request: NextRequest) {
  const sessionKey = getSessionKey(request);
  
  let refreshPromise = refreshPromises.get(sessionKey);
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const supabase = createServerClient(...);
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    })();
    refreshPromises.set(sessionKey, refreshPromise);
    
    // Удаляем через 1 секунду
    setTimeout(() => refreshPromises.delete(sessionKey), 1000);
  }
  
  const user = await refreshPromise;
  return { response, user };
}
```

---

## 📊 Метрики производительности

### Сценарий: 5 параллельных запросов с истекшим токеном

| Метрика | Без защиты | С защитой | Улучшение |
|---------|-----------|-----------|-----------|
| Вызовы `getUser()` | 10 (5 × 2) | 1 | **90% ↓** |
| Запросы к Supabase API | 5 | 1 | **80% ↓** |
| Время обработки | ~250ms | ~50ms | **80% ↓** |

---

## 🔐 Важные детали

### Хранение токенов

Токены хранятся в httpOnly cookies:
- `sb-<project-ref>-auth-token` - JWT токен
- Автоматически обновляется Supabase
- Недоступен из JavaScript (безопасность)

### Проверка токенов

```typescript
// Middleware автоматически проверяет и обновляет токены
const { response, user } = await updateSession(request);

if (!user) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

---

## ⚠️ Типичные ошибки

### 1. Попытка читать httpOnly cookies на клиенте

```javascript
// ❌ НЕ РАБОТАЕТ!
const token = document.cookie.split(";").find((c) => c.includes("auth-token"));
// httpOnly cookies недоступны из JavaScript!

// ✅ ПРАВИЛЬНО
// Middleware автоматически обрабатывает токены
```

### 2. Прямые запросы к Supabase с клиента

```javascript
// ❌ НЕПРАВИЛЬНО - токены недоступны на клиенте
const { data } = await supabase.from('projects').select();

// ✅ ПРАВИЛЬНО - через Server Components или API Routes
// Server Component автоматически использует Supabase Server Client
```

---

## 📁 Структура файлов

### Серверные (работают с токенами):

- ✅ `lib/supabase/middleware.ts` - Обновление токенов с защитой от race conditions
- ✅ `lib/supabase/server.ts` - Supabase Server Client
- ✅ `middleware.ts` - Next.js Middleware

### Клиентские:

- ✅ `lib/supabase/client.ts` - Supabase Browser Client (для клиентских компонентов)
- ✅ `components/providers/AuthProvider.tsx` - Контекст авторизации

---

## ✅ Чек-лист реализации

- [x] Middleware настроен для автоматического обновления токенов
- [x] Защита от race conditions реализована
- [x] httpOnly cookies используются для безопасности
- [x] Server Components используют Supabase Server Client
- [x] Client Components используют Supabase Browser Client

---

## 📞 Связанные документы

- `architecture/auth/CURRENT_AUTH_FLOW.md` - Полное описание авторизации
- `architecture/MIDDLEWARE.md` - Детали работы middleware
- `flows/PASSWORD_RESET_FLOW.md` - Восстановление пароля

