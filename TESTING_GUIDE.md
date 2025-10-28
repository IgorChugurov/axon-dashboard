# 🧪 Руководство по тестированию системы авторизации

## Подготовка

1. **Запустите dev сервер:**

```bash
cd /Users/igorchugurov/Documents/GitHub/OUR-pack/chadcn
pnpm dev
```

2. **Откройте консоль браузера** (F12 → Console)
3. **Откройте консоль сервера** (терминал где запущен `pnpm dev`)

## 🧪 Тест 1: Нормальная работа (все токены валидны)

### Шаги:

1. Авторизуйтесь на странице `/login`
2. Проверьте что попали на главную страницу `/`
3. Данные загрузились

### Ожидаемые логи (сервер):

```
[Utils] Reading cookies: { hasAccessToken: true, hasRefreshToken: true, hasExpiresAt: true }
[Page] Initial tokens check: { hasTokens: true, hasAccessToken: "YES", hasRefreshToken: "YES", isExpired: false }
[Page] Loading data with valid tokens...
```

### ✅ Успех если:

- Нет попыток refresh
- Данные загрузились
- Нет редиректов

---

## 🧪 Тест 2: Удаление accessToken (должен сработать refresh)

### Шаги:

1. Авторизуйтесь
2. Откройте DevTools → Application → Cookies → localhost:3000
3. **Удалите ТОЛЬКО `accessToken`** cookie
4. **НЕ удаляйте** `refreshToken`, `userData`, `expiresAt`
5. Перезагрузите страницу (F5)

### Ожидаемые логи (сервер):

```
[Utils] Reading cookies: { hasAccessToken: false, hasRefreshToken: true, hasExpiresAt: true }
[Utils] Incomplete token set, returning null
[Page] Initial tokens check: { hasTokens: false, hasAccessToken: "NO", hasRefreshToken: "NO", isExpired: "N/A" }
[Page] Tokens expired or missing, refreshing...
[ServerAction] Refreshing tokens...
[ServerAction] Tokens refreshed successfully
[Page] After refresh: { hasTokens: true, hasAccessToken: "YES", hasRefreshToken: "YES" }
[Page] Refresh successful, continuing...
[Page] Loading data with valid tokens...
```

### ✅ Успех если:

- Произошел refresh токенов
- Новый `accessToken` появился в cookies
- Данные загрузились
- **НЕТ редиректа на /login**

### ❌ Ошибка если:

- Сразу редирект на `/login` без попытки refresh
- Ошибка `Cookies can only be modified...`
- В логах: `[ServerAction] Refresh failed: 400`

---

## 🧪 Тест 3: Невалидный refresh token (должен редирект на login)

### Шаги:

1. Авторизуйтесь
2. Откройте DevTools → Application → Cookies
3. **Измените** `refreshToken` на случайное значение (например, добавьте "xxx" в конец)
4. Перезагрузите страницу

### Ожидаемые логи (сервер):

```
[Utils] Reading cookies: { hasAccessToken: true, hasRefreshToken: true, hasExpiresAt: true }
[Page] Initial tokens check: { ... }
[Page] Tokens expired or missing, refreshing...
[ServerAction] Refreshing tokens...
[ServerAction] Refresh failed: 400 Bad Request
[Page] After refresh: { hasTokens: false, hasAccessToken: "NO", hasRefreshToken: "NO" }
[Page] Refresh failed, redirecting to login
```

### ✅ Успех если:

- Попытка refresh вернула 400
- Произошел redirect на `/login`
- **НЕТ ошибки** `Cookies can only be modified...`

---

## 🧪 Тест 4: Удаление всех cookies (должен редирект через middleware)

### Шаги:

1. Авторизуйтесь
2. Откройте DevTools → Application → Cookies
3. **Удалите ВСЕ** cookies (accessToken, refreshToken, userData, expiresAt)
4. Перезагрузите страницу

### Ожидаемые логи (сервер):

```
Никаких логов из page.tsx - middleware перехватывает сразу
```

### ✅ Успех если:

- **Мгновенный** redirect на `/login` (до загрузки page component)
- Cookies очищены middleware

---

## 🧪 Тест 5: Истекший accessToken (должен refresh)

### Шаги:

1. Авторизуйтесь
2. Откройте DevTools → Application → Cookies
3. **Измените** `expiresAt` на время в прошлом (например, `1700000000`)
4. Перезагрузите страницу

### Ожидаемые логи (сервер):

```
[Utils] Reading cookies: { hasAccessToken: true, hasRefreshToken: true, hasExpiresAt: true }
[Page] Initial tokens check: { hasTokens: true, ..., isExpired: true }
[Page] Tokens expired or missing, refreshing...
[ServerAction] Refreshing tokens...
[ServerAction] Tokens refreshed successfully
[Page] After refresh: { hasTokens: true, hasAccessToken: "YES", hasRefreshToken: "YES" }
[Page] Refresh successful, continuing...
```

### ✅ Успех если:

- Обнаружено истечение токена
- Произошел успешный refresh
- Данные загрузились
- Нет редиректа

---

## 📊 Таблица ожидаемых результатов

| Тест | accessToken | refreshToken  | expiresAt  | Ожидаемый результат  |
| ---- | ----------- | ------------- | ---------- | -------------------- |
| 1    | ✅ валидный | ✅ валидный   | ✅ будущее | Данные загружаются   |
| 2    | ❌ нет      | ✅ валидный   | ✅ есть    | Refresh → Данные     |
| 3    | ✅ есть     | ❌ невалидный | ✅ есть    | Refresh 400 → /login |
| 4    | ❌ нет      | ❌ нет        | ❌ нет     | Middleware → /login  |
| 5    | ✅ есть     | ✅ валидный   | ❌ прошлое | Refresh → Данные     |

---

## 🐛 Что делать если тест провалился

### Тест 2 провалился (редирект вместо refresh):

**Проблема:** `getAuthTokens()` возвращает `null` если нет `accessToken`

**Проверьте:**

1. В логах есть `[Utils] Incomplete token set, returning null`?
2. В логах есть `[Page] Tokens expired or missing, refreshing...`?
3. В логах есть `[ServerAction] Refreshing tokens...`?

**Если нет refresh логов:**

- Значит код не доходит до `refreshAuthTokens()`
- Проверьте что `refreshToken` действительно есть в cookies перед удалением accessToken

**Если есть `Refresh failed: 400`:**

- URL бэкенда неправильный → проверьте `.env.local`
- Refresh token истек или невалиден → получите новые токены через логин

### Ошибка "Cookies can only be modified...":

**Проблема:** Попытка вызвать Server Action для модификации cookies из Server Component

**Решение:**

1. Убедитесь что используете последнюю версию кода
2. В `page.tsx` не должно быть вызовов `clearAuthCookies()`
3. В `base.ts` не должно быть вызовов `clearAuthCookies()`

---

## 📝 Checklist для полного тестирования

- [ ] Тест 1: Нормальная работа
- [ ] Тест 2: Удаление accessToken (самый важный!)
- [ ] Тест 3: Невалидный refresh token
- [ ] Тест 4: Удаление всех cookies
- [ ] Тест 5: Истекший accessToken
- [ ] Логаут работает
- [ ] Повторный логин работает

---

## 🎯 Что должно работать идеально:

1. ✅ **Автоматическое обновление токенов** при истечении accessToken
2. ✅ **Redirect на /login** только когда refresh token тоже невалиден
3. ✅ **Нет ошибок** `Cookies can only be modified...`
4. ✅ **Middleware** перехватывает запросы без токенов
5. ✅ **Прозрачное обновление** - пользователь не замечает refresh

---

## 💡 Совет по отладке

Если что-то не работает:

1. **Откройте 2 окна:** браузер + терминал с сервером
2. **Следите за логами** в обоих окнах одновременно
3. **Копируйте логи** и сравнивайте с ожидаемыми

Удачи! 🚀
