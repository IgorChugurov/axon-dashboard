# План исправления ошибки 404 в API запросах

## Проблема

Серверный компонент делает HTTP fetch на собственный API (`http://localhost:3000/api/projects`), что приводит к 404 ошибке, так как Next.js не может правильно маршрутизировать такой запрос в серверном контексте.

## Решение

### Вариант 1: Прямой вызов логики API (Рекомендуется)

Создать серверную функцию, которая напрямую вызывает логику API без HTTP слоя.

**Преимущества:**

- Нет накладных расходов на HTTP
- Прямой доступ к cookies и контексту
- Быстрее и эффективнее

**Шаги:**

1. Вынести логику из `app/api/[entity]/route.ts` в отдельную функцию
2. Создать серверную функцию `getEntityData()` в `lib/api/server.ts`
3. Использовать эту функцию в `ServerDataProvider` вместо fetch

### Вариант 2: Использование внутреннего API вызова

Использовать специальный способ вызова API роутов в Next.js для серверных компонентов.

**Шаги:**

1. Создать функцию-обертку для вызова API роутов
2. Использовать `NextRequest` и `NextResponse` напрямую
3. Передавать cookies через заголовки правильно

### Вариант 3: Гибридный подход

Комбинировать прямой вызов для серверных компонентов и HTTP для клиентских.

## Рекомендуемый план действий

1. **Создать серверную функцию для получения данных сущности**

   - Файл: `lib/api/server.ts`
   - Функция: `getEntityData(entity: string, params: ServerDataParams)`
   - Логика: Прямой вызов логики без HTTP

2. **Рефакторинг `ServerDataProvider`**

   - Заменить fetch на прямой вызов функции
   - Убрать `getFullUrl()` для серверных вызовов
   - Оставить fetch только для клиентских компонентов

3. **Вынести общую логику из route handler**

   - Создать `lib/api/handlers.ts` с логикой обработки запросов
   - Использовать эту логику и в route handler, и в серверной функции

4. **Тестирование**
   - Проверить работу в серверных компонентах
   - Проверить передачу cookies
   - Проверить обработку ошибок авторизации

## Детальный план реализации

### Шаг 1: Создать `lib/api/server.ts`

```typescript
// Прямой вызов логики API для серверных компонентов
export async function getEntityData(
  entity: string,
  params: ServerDataParams
): Promise<ServerDataResponse>;
```

### Шаг 2: Рефакторинг `lib/server-data/base.ts`

**Что значит "заменить fetch на прямой вызов"?**

**Сейчас (не работает):**

```typescript
// lib/server-data/base.ts
async getData(params) {
  // ❌ HTTP запрос внутри Next.js (не работает в серверном контексте)
  const fullUrl = `http://localhost:3000/api/projects`;
  const response = await fetch(fullUrl, {
    headers: { Cookie: cookieHeader }
  });
  return response.json();
}
```

**После исправления (работает):**

```typescript
// lib/server-data/base.ts
async getData(params) {
  // ✅ Прямой вызов функции (работает!)
  const data = await getEntityData('projects', params);
  return this.formatResponse(data);
}
```

**Важно понимать:**

- ❌ НЕ означает получение данных из клиентского компонента
- ❌ НЕ означает отказ от запросов к удаленному бэкенду
- ✅ Означает вызов функции напрямую, без HTTP слоя внутри Next.js
- ✅ Запрос к удаленному бэкенду (`NEXT_PUBLIC_API_URL`) ОСТАЕТСЯ!

**Что происходит при первом рендере (SSR):**

1. Server Component вызывает `projectsServerProvider.getProjects()`
2. `ServerDataProvider` вызывает `getEntityData('projects', params)`
3. `getEntityData` получает токены из cookies напрямую (без HTTP)
4. `getEntityData` делает `fetch` к **удаленному бэкенду** (`NEXT_PUBLIC_API_URL`)
5. Данные возвращаются с удаленного сервера

**Изменения:**

- Убрать `getFullUrl()` - больше не нужен
- Заменить `fetch('http://localhost:3000/api/...')` на прямой вызов функции
- Упростить логику получения данных

### Шаг 3: Обновить `lib/projects/server.ts`

- Использовать новую логику

### Шаг 4: Тестирование

- Проверить работу на странице проектов
- Проверить обработку ошибок
