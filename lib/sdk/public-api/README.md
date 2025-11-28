# Публичный API SDK

SDK для работы с entity instances и авторизацией через прямой доступ к Supabase.

---

## 📦 Установка

SDK уже включен в проект. Импортируйте нужный клиент:

```typescript
// Для Server Components
import { ServerPublicAPIClient } from "@/lib/sdk/public-api/server";

// Для Client Components
import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";
```

---

## 🚀 Быстрый старт

### Server Component

```typescript
import { ServerPublicAPIClient } from "@/lib/sdk/public-api/server";

export default async function MyPage({ params }) {
  const { projectId } = await params;

  // Создаем SDK клиент
  const sdk = await ServerPublicAPIClient.create(projectId, {
    enableCache: true, // кэшировать конфигурацию (по умолчанию)
  });

  // Получаем список экземпляров
  const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
    page: 1,
    limit: 20,
  });

  return <div>{/* ... */}</div>;
}
```

### Client Component

```typescript
"use client";

import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";

export function MyComponent({ projectId, entityDefinitionId }) {
  // Создаем SDK клиент
  const sdk = ClientPublicAPIClient.create(projectId, {
    enableCache: true, // кэшировать конфигурацию (по умолчанию)
  });

  const loadData = async () => {
    // Получаем список экземпляров
    const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
      page: 1,
      limit: 20,
    });

    return { data, pagination };
  };

  return <div>{/* ... */}</div>;
}
```

---

## 📚 API Reference

### Создание клиента

#### Server SDK

```typescript
const sdk = await ServerPublicAPIClient.create(projectId, options?);
```

#### Client SDK

```typescript
const sdk = ClientPublicAPIClient.create(projectId, options?);
```

**Параметры:**

- `projectId` (string) - ID проекта
- `options` (SDKOptions, опционально):
  - `enableCache` (boolean) - включить кэширование (default: `true`)
  - `cacheTTL` (number) - время жизни кэша в миллисекундах (default: `5 * 60 * 1000`)

---

### CRUD операции

#### Получить список экземпляров

```typescript
const { data, pagination } = await sdk.getInstances(
  entityDefinitionId,
  {
    page?: number,              // номер страницы (default: 1)
    limit?: number,              // количество на странице (default: 20)
    search?: string,             // поисковый запрос
    filters?: Record<string, string[]>, // фильтры
    sortBy?: string,             // поле для сортировки
    sortOrder?: 'asc' | 'desc',  // порядок сортировки
    includeRelations?: string[], // поля для загрузки связей
    relationsAsIds?: boolean,    // связи как ID или объекты
  }
);
```

**Пример:**

```typescript
const { data, pagination } = await sdk.getInstances("entity-def-id", {
  page: 1,
  limit: 20,
  search: "test",
  includeRelations: ["author", "tags"],
  relationsAsIds: false,
});
```

#### Получить один экземпляр

```typescript
const instance = await sdk.getInstance(
  entityDefinitionId,
  instanceId,
  {
    includeRelations?: string[], // поля для загрузки связей
    relationsAsIds?: boolean,    // связи как ID или объекты
  }
);
```

**Пример:**

```typescript
const instance = await sdk.getInstance("entity-def-id", "instance-id", {
  includeRelations: ["author"],
  relationsAsIds: false,
});
```

#### Создать экземпляр

```typescript
const instance = await sdk.createInstance(entityDefinitionId, {
  data: {
    name: "Example",
    description: "Description",
    // ... другие поля
  },
  relations: {
    author: ["author-id-1"],
    tags: ["tag-id-1", "tag-id-2"],
  },
});
```

#### Обновить экземпляр

```typescript
const instance = await sdk.updateInstance(entityDefinitionId, instanceId, {
  data: {
    name: "Updated Name",
    // ... другие поля для обновления
  },
  relations: {
    tags: ["tag-id-3"],
  },
});
```

#### Удалить экземпляр

```typescript
await sdk.deleteInstance(entityDefinitionId, instanceId);
```

---

### Авторизация

#### Вход в систему

```typescript
const result = await sdk.signIn(email, password);
// result содержит: accessToken, refreshToken, expiresAt, expiresIn, user
```

#### Регистрация

```typescript
const result = await sdk.signUp({
  email: "user@example.com",
  password: "password123",
  firstName: "John",
  lastName: "Doe",
});
```

#### Выход из системы

```typescript
await sdk.signOut();
```

#### Получить текущего пользователя

```typescript
const user = await sdk.getCurrentUser();
// user или null если не авторизован
```

---

### Конфигурация (опционально)

#### Получить конфигурацию entityDefinition

```typescript
const config = await sdk.getEntityDefinitionConfig(entityDefinitionId);
// config содержит: entityDefinition + fields
```

**Используйте когда:**

- Нужна конфигурация для построения UI (таблицы, формы)
- Нужна проверка разрешений (readPermission, createPermission и т.д.)

---

## ⚙️ Кэширование

### Для публичного API (рекомендуется)

```typescript
const sdk = ClientPublicAPIClient.create(projectId, {
  enableCache: true, // кэшировать конфигурацию (по умолчанию)
});
```

**Преимущества:**

- Быстрее загрузка (fields кэшируются на 5 минут)
- Меньше запросов к БД

### Для админки

```typescript
const sdk = ClientPublicAPIClient.create(projectId, {
  enableCache: false, // не кэшировать (всегда свежие данные)
});
```

**Преимущества:**

- Всегда актуальные данные
- Подходит когда конфигурация может меняться

---

## 🛠️ Обработка ошибок

```typescript
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
  AuthenticationError,
} from "@/lib/sdk/public-api/errors";

try {
  const instance = await sdk.getInstance(entityDefinitionId, id);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Обработка 404
  } else if (error instanceof PermissionDeniedError) {
    // Обработка 403
  } else if (error instanceof ValidationError) {
    // Обработка 400
  } else if (error instanceof AuthenticationError) {
    // Обработка 401
  } else {
    // Другая ошибка
  }
}
```

---

## 📝 Примеры использования

### Пример 1: Список с пагинацией

```typescript
const sdk = ClientPublicAPIClient.create(projectId);

const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
  page: 1,
  limit: 20,
  search: "test",
});

console.log(`Найдено ${pagination.total} записей`);
console.log(`Страница ${pagination.page} из ${pagination.totalPages}`);
```

### Пример 2: Создание с relations

```typescript
const sdk = ClientPublicAPIClient.create(projectId);

const instance = await sdk.createInstance(entityDefinitionId, {
  data: {
    title: "New Post",
    content: "Post content",
  },
  relations: {
    author: ["author-id-1"],
    tags: ["tag-id-1", "tag-id-2"],
  },
});
```

### Пример 3: Авторизация

```typescript
const sdk = ClientPublicAPIClient.create(projectId);

try {
  const result = await sdk.signIn("user@example.com", "password123");

  // Сохраняем токен
  localStorage.setItem("accessToken", result.accessToken);

  // Получаем пользователя
  const user = result.user;
  console.log(`Добро пожаловать, ${user.firstName}!`);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Ошибка авторизации:", error.message);
  }
}
```

---

## 🔄 Миграция с существующих сервисов

### Было:

```typescript
import { getInstances } from "@/lib/universal-entity/instance-service";

const instances = await getInstances(entityDefinitionId, projectId, {
  limit: 20,
  offset: 0,
});
```

### Стало:

```typescript
import { ServerPublicAPIClient } from "@/lib/sdk/public-api/server";

const sdk = await ServerPublicAPIClient.create(projectId);
const { data: instances, pagination } = await sdk.getInstances(
  entityDefinitionId,
  {
    page: 1,
    limit: 20,
  }
);
```

---

## 📦 Структура

```
lib/sdk/public-api/
├── types.ts              # Типы
├── errors.ts             # Классы ошибок
├── utils.ts              # Утилиты
├── base/
│   └── base-client.ts    # Базовый класс
├── server/
│   └── server-client.ts  # Server SDK
├── client/
│   └── client-client.ts # Client SDK
└── index.ts              # Главный экспорт
```

---

**Готово к использованию!** 🚀
