# План исправлений найденных проблем

## Проблема 1: Двойное форматирование ответа

### Текущая ситуация:

```typescript
// lib/api/server.ts
const formatted = formatEntityResponse(backendData, entity); // Форматирование 1
return formatted;

// lib/server-data/base.ts
const data = await getEntityData(entity, params); // Уже отформатировано!
return this.formatResponse(data); // Форматирование 2 (избыточно!)
```

### Проблема:

- `formatEntityResponse()` уже возвращает структуру `{ data, pagination, config }`
- `formatResponse()` пытается форматировать уже отформатированные данные
- Это избыточно и может привести к ошибкам

### Решение:

**Вариант 1 (рекомендуется):** Убрать форматирование из `getEntityData()`, оставить только в `ServerDataProvider`

- `getEntityData()` возвращает сырые данные от бэкенда
- `ServerDataProvider.formatResponse()` форматирует их

**Вариант 2:** Убрать `formatResponse()` из `ServerDataProvider`, использовать только `formatEntityResponse()`

- Проще, но теряем возможность переопределения в наследниках

**Рекомендация:** Вариант 1 - сохраняет гибкость для наследников

---

## Проблема 2: Дублирование между base.ts и server.ts

### Текущая ситуация:

```typescript
// lib/api/server.ts
export async function getEntityData(entity, params) {
  const backendData = await getEntityDataFromBackend(entity, params);
  const formatted = formatEntityResponse(backendData, entity);
  return formatted;
}

// lib/server-data/base.ts
async getData(params) {
  const entity = this.apiEndpoint.replace("/api/", "");
  const data = await getEntityData(entity, params);
  return this.formatResponse(data);
}
```

### Анализ:

**Нужно ли разделение?**

- ✅ **ДА** - есть смысл разделения:
  - `getEntityData()` - низкоуровневая функция для прямого вызова
  - `ServerDataProvider.getData()` - высокоуровневый метод класса с дополнительной логикой

**Но можно упростить:**

- `getEntityData()` не должен форматировать (см. проблему 1)
- `ServerDataProvider.getData()` должен только извлекать entity и вызывать `getEntityData()`

### Решение:

1. `getEntityData()` возвращает сырые данные от бэкенда
2. `ServerDataProvider.getData()` извлекает entity, вызывает `getEntityData()`, форматирует через `formatResponse()`
3. Убрать избыточное форматирование

---

## Проблема 3: Ошибка авторизации не перенаправляет

### Текущая ситуация:

```typescript
// app/page.tsx
catch (error) {
  if (error.message.includes("Unauthorized")) {
    return <AuthErrorHandler error={error} />; // ❌ Показывает компонент, но не редиректит
  }
}

// components/AuthErrorHandler.tsx
useEffect(() => {
  // window.location.href = "/login"; // ❌ Закомментировано!
}, [error]);
```

### Проблема:

1. В Server Component нельзя использовать `window.location.href`
2. `AuthErrorHandler` - Client Component, но редирект закомментирован
3. Нужно использовать `redirect()` из `next/navigation` в Server Component

### Решение:

**В Server Component (app/page.tsx):**

```typescript
catch (error) {
  if (error instanceof Error && error.message.includes("Unauthorized")) {
    redirect("/login"); // ✅ Используем redirect() из next/navigation
  }
  throw error;
}
```

**Убрать `AuthErrorHandler`** - он не нужен, редирект делается на уровне Server Component

---

## Проблема 4: createData() использует старый подход

### Текущая ситуация:

```typescript
// lib/server-data/base.ts
async createData(data) {
  const fullUrl = this.getFullUrl(this.apiEndpoint); // ❌ Метод не существует!
  const response = await fetch(fullUrl, { ... }); // ❌ HTTP fetch к своему API
}
```

### Проблема:

- `getFullUrl()` удален, но используется в `createData()`
- Использует старый подход с HTTP fetch

### Решение:

Создать функцию `createEntityData()` в `lib/api/server.ts` аналогично `getEntityData()`

---

## Проблема 5: Обработка ошибок авторизации

### Текущая ситуация:

```typescript
// lib/api/handlers.ts
if (!tokens) {
  throw new Error("Unauthorized"); // ✅ Правильно
}

// Но нужно проверить все места где может быть ошибка авторизации
```

### Нужно проверить:

1. ✅ `getEntityDataFromBackend()` - бросает `Error("Unauthorized")`
2. ✅ `fetchFromBackend()` - возвращает 401, но не бросает ошибку
3. ❓ Нужно ли бросать ошибку при 401 после refresh?

---

## План действий

### Шаг 1: Исправить двойное форматирование

- [ ] Убрать `formatEntityResponse()` из `getEntityData()`
- [ ] `getEntityData()` возвращает сырые данные
- [ ] `ServerDataProvider.formatResponse()` форматирует данные

### Шаг 2: Упростить дублирование

- [ ] Оставить разделение функций (это правильно)
- [ ] Убрать избыточное форматирование

### Шаг 3: Исправить редирект при ошибке авторизации

- [ ] В `app/page.tsx` использовать `redirect("/login")` вместо `AuthErrorHandler`
- [ ] Удалить или оставить `AuthErrorHandler` для других случаев (если нужен)

### Шаг 4: Исправить createData()

- [ ] Создать `createEntityData()` в `lib/api/server.ts`
- [ ] Обновить `ServerDataProvider.createData()` для использования новой функции

### Шаг 5: Проверить обработку ошибок

- [ ] Убедиться, что все ошибки авторизации правильно обрабатываются
- [ ] Проверить, что `redirect()` не перехватывается catch блоками

---

## Дополнительные проверки

### Стандартная логика админ-панели:

1. **Авторизация:**

   - ✅ Middleware проверяет токены
   - ✅ При отсутствии токенов → редирект на `/login`
   - ❌ При ошибке авторизации в Server Component → нужно редиректить

2. **Обработка ошибок:**

   - ✅ Ошибки авторизации → редирект на `/login`
   - ✅ Другие ошибки → показывать пользователю
   - ❌ Сейчас ошибки авторизации показываются, но не редиректят

3. **Очистка cookies:**

   - ✅ Middleware очищает cookies при редиректе
   - ✅ Route handlers могут модифицировать cookies
   - ✅ Server Components НЕ могут модифицировать cookies

4. **Refresh токенов:**
   - ✅ Автоматический refresh при 401
   - ✅ Если refresh не удался → редирект на `/login`

---

## Итоговый план

1. **Убрать двойное форматирование** - оставить только в `ServerDataProvider`
2. **Исправить редирект** - использовать `redirect()` в Server Component
3. **Исправить createData()** - использовать новый подход
4. **Проверить обработку ошибок** - убедиться что все работает правильно
