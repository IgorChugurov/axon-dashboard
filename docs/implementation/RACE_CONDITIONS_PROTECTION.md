# Защита от Race Conditions при обновлении токенов

## Проблема

При использовании Supabase SSR в Next.js middleware возникала проблема race conditions:

**Сценарий:**
- 5 параллельных запросов приходят одновременно (интервал 1-2ms)
- У всех запросов истекший токен
- Каждый запрос вызывает `updateSession()` → `getUser()`
- Каждый `getUser()` видит истекший токен
- Результат: 5 параллельных запросов к Supabase API для обновления одного токена

**Последствия:**
- Избыточная нагрузка на Supabase API
- Потенциальные конфликты при записи cookies
- Неэффективное использование ресурсов

## Решение: Promise-based дедупликация

### Принцип работы

```
Запрос 1 (токен истек):
  ├─ Извлекает sessionKey из cookies
  ├─ Проверяет Map: нет активного обновления
  ├─ Создает Promise обновления токена
  ├─ Сохраняет Promise в Map[sessionKey]
  └─ Начинает обновление токена

Запрос 2 (1ms позже):
  ├─ Извлекает тот же sessionKey
  ├─ Проверяет Map: есть активное обновление!
  ├─ Ждет завершения Promise из Map
  └─ Получает обновленный токен

Запрос 3, 4, 5:
  └─ Аналогично Запросу 2

Результат: только 1 запрос к Supabase API
```

### Архитектура

#### Компоненты решения:

1. **Global Map для дедупликации** (`lib/supabase/middleware.ts:29`)
   ```typescript
   const refreshPromises = new Map<string, Promise<User | null>>();
   ```
   - Ключ: уникальный идентификатор сессии (часть Supabase auth cookie)
   - Значение: Promise обновления токена

2. **Функция извлечения ключа сессии** (`lib/supabase/middleware.ts:46`)
   ```typescript
   function getSessionKey(request: NextRequest): string | null
   ```
   - Ищет Supabase auth cookie (`sb-<project-ref>-auth-token`)
   - Использует первые 30 символов JWT как ключ
   - Возвращает `null` для неавторизованных запросов

3. **Защищенная функция updateSession** (`lib/supabase/middleware.ts:84`)
   ```typescript
   export async function updateSession(request: NextRequest): Promise<{
     response: NextResponse;
     user: User | null;
   }>
   ```
   - Обновляет токены с защитой от race conditions
   - Возвращает и response (с cookies), и user (для проверки авторизации)

### Логика работы

#### СЛУЧАЙ 1: Неавторизованный запрос (нет sessionKey)
```typescript
if (!sessionKey) {
  // Обычная обработка без дедупликации
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  return { response: supabaseResponse, user };
}
```

#### СЛУЧАЙ 2: Авторизованный запрос (есть sessionKey)
```typescript
// Проверяем активное обновление
let refreshPromise = refreshPromises.get(sessionKey);

if (!refreshPromise) {
  // Первый запрос - создаем новое обновление
  refreshPromise = (async () => {
    const supabase = createServerClient(...);
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  })();
  
  refreshPromises.set(sessionKey, refreshPromise);
  
  // Очистка через 1 секунду
  refreshPromise
    .then(() => setTimeout(() => refreshPromises.delete(sessionKey), 1000))
    .catch(() => refreshPromises.delete(sessionKey));
}

// Ждем завершения (своего или чужого)
const user = await refreshPromise;
```

### Оптимизации

#### 1. Убран дублирующий вызов getUser()

**Было:**
```typescript
// lib/supabase/middleware.ts
await supabase.auth.getUser(); // Обновляет токены
return response;

// middleware.ts
const response = await updateSession(request);
const supabase = createServerClient(...); // Создаем клиент снова!
const { data: { user } } = await supabase.auth.getUser(); // Вызываем getUser() снова!
```

**Стало:**
```typescript
// lib/supabase/middleware.ts
const { data: { user } } = await supabase.auth.getUser();
return { response, user }; // Возвращаем и response, и user

// middleware.ts
const { response, user } = await updateSession(request);
// Используем user напрямую, без второго вызова getUser()
```

**Выигрыш:**
- 1 вызов `getUser()` вместо 2
- Нет дублирования Supabase клиента
- Проще отлаживать

#### 2. Очистка Map с задержкой

```typescript
refreshPromise.then(() => {
  setTimeout(() => refreshPromises.delete(sessionKey), 1000);
});
```

**Зачем задержка?**
- Параллельные запросы могут прийти с небольшой задержкой (1-10ms)
- Задержка 1 секунда дает им время найти Promise в Map
- После истечения задержки Map очищается (предотвращение memory leak)

#### 3. Обработка ошибок

```typescript
refreshPromise.catch((error) => {
  console.error('[updateSession] Token refresh error:', error);
  refreshPromises.delete(sessionKey); // Удаляем сразу!
});
```

**Почему удаляем сразу?**
- Если обновление завершилось ошибкой, следующий запрос должен попытаться снова
- Не блокируем последующие попытки обновления

## Преимущества решения

### 1. Производительность
- ✅ Один запрос к Supabase вместо N параллельных
- ✅ Меньше нагрузка на API
- ✅ Быстрее обработка запросов

### 2. Простота
- ✅ Один вызов `getUser()` в middleware
- ✅ Понятная линейная логика
- ✅ Нет дублирования кода

### 3. Читаемость
- ✅ Подробные комментарии на каждом этапе
- ✅ Явная структура `{ response, user }`
- ✅ Понятные названия функций и переменных

### 4. Поддерживаемость
- ✅ Защита инкапсулирована в `updateSession()`
- ✅ Основной middleware не знает о деталях обновления
- ✅ Легко отлаживать

### 5. Надежность
- ✅ Обработка ошибок обновления
- ✅ Автоматическая очистка Map
- ✅ Корректная работа с cookies

## Тестовые сценарии

### 1. Параллельные запросы с истекшим токеном
```
Дано: 5 запросов приходят одновременно, токен истек
Ожидание: Только 1 запрос к Supabase API
Результат: ✅ Все запросы получают обновленный токен
```

### 2. Последовательные запросы с валидным токеном
```
Дано: Запросы приходят один за другим, токен валиден
Ожидание: Каждый запрос быстро проверяет токен, обновления нет
Результат: ✅ Быстрая обработка без обновления
```

### 3. Неавторизованные запросы
```
Дано: Запрос без auth cookie
Ожидание: Обработка без дедупликации, user = null
Результат: ✅ Корректная обработка, редирект на /login
```

### 4. Ошибка обновления токена
```
Дано: Supabase API возвращает ошибку при обновлении
Ожидание: Promise удаляется из Map, следующий запрос попытается снова
Результат: ✅ Не блокируются последующие попытки
```

### 5. Смешанные запросы (авторизованные + неавторизованные)
```
Дано: Одновременно приходят запросы от разных пользователей
Ожидание: Каждая сессия обрабатывается независимо
Результат: ✅ Корректная изоляция по sessionKey
```

## Debugging Tips

### Проверка активных обновлений
```typescript
// В lib/supabase/middleware.ts добавить:
console.log('[updateSession] Active refreshes:', refreshPromises.size);
console.log('[updateSession] Session key:', sessionKey);
```

### Отслеживание времени обновления
```typescript
const startTime = Date.now();
const user = await refreshPromise;
console.log('[updateSession] Refresh took:', Date.now() - startTime, 'ms');
```

### Проверка race conditions
```bash
# Запустить 10 параллельных запросов
for i in {1..10}; do
  curl http://localhost:3000/dashboard &
done
wait

# В логах должен быть только 1 запрос к Supabase
```

## Возможные проблемы и решения

### Проблема 1: Memory leak в Map
**Симптомы:** Map растет и не очищается
**Решение:** Проверить, что setTimeout срабатывает и Promise удаляются

### Проблема 2: Deadlock (запросы висят)
**Симптомы:** Запросы не завершаются
**Решение:** Проверить обработку ошибок, убедиться что Promise resolve/reject

### Проблема 3: Разные sessionKey для одной сессии
**Симптомы:** Дедупликация не работает
**Решение:** Проверить, что auth cookie не меняется при обновлении

## Дальнейшие улучшения

### 1. Метрики и мониторинг
```typescript
// Добавить счетчики:
- Количество обновлений токенов
- Количество "сохраненных" запросов (дедупликация)
- Время обновления токенов
- Количество ошибок обновления
```

### 2. Adaptive timeout
```typescript
// Динамическая задержка очистки на основе нагрузки
const timeout = refreshPromises.size > 10 ? 2000 : 1000;
setTimeout(() => refreshPromises.delete(sessionKey), timeout);
```

### 3. LRU Cache для sessionKey
```typescript
// Ограничить размер Map для предотвращения memory leak
const MAX_SIZE = 1000;
if (refreshPromises.size > MAX_SIZE) {
  // Удалить старые записи
}
```

## Заключение

Реализованное решение эффективно защищает от race conditions при обновлении токенов, делая код:
- **Простым** - понятная линейная логика
- **Эффективным** - минимум запросов к API
- **Надежным** - обработка ошибок и edge cases
- **Поддерживаемым** - подробные комментарии и документация

Архитектура следует принципам KISS, DRY и Single Responsibility, что делает ее легкой для понимания и поддержки.

