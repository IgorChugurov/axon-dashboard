# Public API SDK

Унифицированный SDK для работы с экземплярами сущностей (Entity Instances) в проекте Axon Dashboard.

## 📋 Что это?

SDK предоставляет единый интерфейс для работы с экземплярами универсальных сущностей через Supabase. Он абстрагирует сложность работы с:

- JSONB данными
- Relations (связями между сущностями)
- Файлами и изображениями
- Фильтрацией и поиском
- Пагинацией
- Кэшированием конфигурации

## 🎯 Для чего используется?

### Основные задачи:

1. **CRUD операции** с экземплярами сущностей

   - Получение списка с фильтрацией, поиском, пагинацией
   - Получение одного экземпляра
   - Создание, обновление, удаление

2. **Работа с relations** (связями)

   - Автоматическая загрузка связанных объектов
   - Создание и обновление связей
   - Фильтрация по relations

3. **Работа с конфигурацией**

   - Получение EntityDefinition и Fields
   - Генерация UI конфигурации
   - Кэширование для оптимизации

4. **Авторизация**
   - Вход, регистрация, выход
   - Управление сессиями

## 🏗️ Архитектура

SDK полностью самодостаточен и не зависит от других частей проекта:

- ✅ Все зависимости - только внешние библиотеки (`@supabase/supabase-js`, `@supabase/ssr`)
- ✅ Все типы определены внутри SDK
- ✅ Все утилиты изолированы в SDK
- ✅ Нет зависимостей от `@/lib/universal-entity` или других модулей проекта

### Структура:

```
packages/public-api-sdk/src/
├── index.ts                 # Главный экспорт (только client SDK)
├── server.ts                # Server SDK (для SSR)
├── browser.ts               # Client SDK (для браузера)
├── client.ts                # Основной класс PublicAPIClient
├── base/
│   └── base-client.ts      # Базовый класс с общей логикой
├── types.ts                 # API типы (QueryParams, PaginationResult и т.д.)
├── types/
│   ├── entity-types.ts     # Типы EntityDefinition, Field, EntityInstance
│   └── ui-config-types.ts  # Типы UI конфигурации
├── errors.ts                # Классы ошибок
├── utils/
│   ├── instance-utils.ts   # Утилиты для работы с instances
│   └── generateUIConfig.ts # Генерация UI конфигурации
└── supabase/
    ├── server-client.ts     # Supabase client для сервера
    ├── browser-client.ts    # Supabase client для браузера
    └── types.ts             # Типы Database из Supabase
```

## 🚀 Использование

### 1. Server Components (SSR)

Используйте `createServerSDK` для Server Components:

```typescript
import { createServerSDK } from "@axon-dashboard/public-api-sdk/server";
import { cookies } from "next/headers";

export default async function MyPage({ params }) {
  const { projectId } = await params;
  const cookieStore = await cookies();

  // Создаем SDK клиент
  const sdk = await createServerSDK(
    projectId,
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Игнорируем ошибки в Server Components
          }
        },
      },
    },
    {
      enableCache: true, // Кэшировать конфигурацию
    }
  );

  // Используем SDK
  const config = await sdk.getEntityDefinitionWithUIConfig(entityDefId);
  const { data, pagination } = await sdk.getInstances(entityDefId, {
    page: 1,
    limit: 20,
  });

  return <div>{/* ... */}</div>;
}
```

### 2. Client Components (рекомендуемый способ)

Используйте `useSDK()` hook из провайдера:

```typescript
"use client";

import { useSDK } from "@/components/providers/SDKProvider";

export function MyComponent() {
  const { sdk } = useSDK();

  const loadData = async () => {
    const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
      page: 1,
      limit: 20,
      search: "test",
    });
    return { data, pagination };
  };

  return <div>{/* ... */}</div>;
}
```

**Важно:** Компонент должен быть обернут в `SDKProvider` (обычно это делается в layout):

```typescript
// app/projects/[projectId]/layout.tsx
import { SDKProviderWrapper } from "@/components/providers/SDKProviderWrapper";

export default async function ProjectLayout({ children, params }) {
  const { projectId } = await params;

  return (
    <SDKProviderWrapper projectId={projectId} enableCache={true}>
      {children}
    </SDKProviderWrapper>
  );
}
```

### 3. Прямое создание (не рекомендуется)

Если нужно создать SDK напрямую без провайдера:

```typescript
"use client";

import { createClientSDK } from "@axon-dashboard/public-api-sdk";

const sdk = createClientSDK(
  projectId,
  {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  {
    enableCache: true,
  }
);
```

**⚠️ Не рекомендуется:** Лучше использовать `useSDK()` для единого экземпляра и кэширования.

## 📚 API Reference

### CRUD операции

#### Получить список экземпляров

```typescript
const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
  page: number, // номер страницы (default: 1)
  limit: number, // количество на странице (default: 20)
  search: string, // поисковый запрос
  filters: Record<string, string[]>, // фильтры (SDK сам определяет relation-поля)
  relationFilterModes: Record<string, "any" | "all">, // режимы фильтрации
  sortBy: string, // поле для сортировки (default: "created_at")
  sortOrder: "asc" | "desc", // порядок сортировки (default: "desc")
  relationsAsIds: boolean, // связи как ID или объекты (default: false)
});
```

**Особенности:**

- SDK **сам определяет** `searchableFields` из fields с `searchable: true`
- SDK **сам определяет** `includeRelations` из fields с `displayInTable: true`
- SDK **сам определяет** relation-поля для фильтрации из fields

**Пример:**

```typescript
const { data, pagination } = await sdk.getInstances("entity-def-id", {
  page: 1,
  limit: 20,
  search: "test",
  filters: {
    status: ["active", "pending"],
    author: ["author-id-1"], // relation-поле - SDK сам определит
  },
  relationFilterModes: {
    author: "any", // хотя бы один из выбранных
  },
});
```

#### Получить один экземпляр

```typescript
const instance = await sdk.getInstance(entityDefinitionId, instanceId, {
  relationsAsIds: boolean, // связи как ID или объекты (default: false)
});
```

**Пример:**

```typescript
const instance = await sdk.getInstance("entity-def-id", "instance-id", {
  relationsAsIds: true, // для редактирования - нужны только ID
});
```

#### Создать экземпляр

```typescript
const instance = await sdk.createInstance(entityDefinitionId, {
  data: {
    name: "Example",
    description: "Description",
    // ... другие поля для JSONB
  },
  relations: {
    author: ["author-id-1"],
    tags: ["tag-id-1", "tag-id-2"],
  },
});
```

**Особенности:**

- Автоматически устанавливает `created_by` из текущего пользователя
- Поддерживает создание relations в одном запросе

#### Обновить экземпляр

```typescript
const instance = await sdk.updateInstance(entityDefinitionId, instanceId, {
  data: {
    name: "Updated Name",
    // ... другие поля для обновления
  },
  relations: {
    tags: ["tag-id-3"], // заменит все существующие связи для этого поля
  },
});
```

#### Удалить экземпляр

```typescript
await sdk.deleteInstance(entityDefinitionId, instanceId);
```

### Конфигурация

#### Получить EntityDefinition с полями

```typescript
const config = await sdk.getEntityDefinitionConfig(entityDefinitionId);
// config содержит: { entityDefinition, fields }
```

#### Получить EntityDefinition с UI конфигурацией

```typescript
const config = await sdk.getEntityDefinitionWithUIConfig(entityDefinitionId);
// config содержит: { entityDefinition, fields, uiConfig }
```

**Используйте когда:**

- Нужна конфигурация для построения UI (таблицы, формы)
- Нужна проверка разрешений (readPermission, createPermission и т.д.)

### Авторизация

#### Вход в систему

```typescript
const result = await sdk.signIn(email, password);
// result: { accessToken, refreshToken, expiresAt, expiresIn, user }
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

## ⚙️ Кэширование

SDK поддерживает кэширование конфигурации (EntityDefinition и Fields) для оптимизации:

```typescript
const sdk = await createServerSDK(projectId, config, {
  enableCache: true, // включить кэш (default: true)
  cacheTTL: 5 * 60 * 1000, // время жизни кэша в мс (default: 5 минут)
});
```

**Преимущества:**

- Быстрее загрузка (fields кэшируются)
- Меньше запросов к БД
- Автоматическая инвалидация при изменении

**Когда отключить кэш:**

- В админке, где конфигурация может часто меняться
- Для тестирования

## 🛠️ Обработка ошибок

SDK использует типизированные ошибки:

```typescript
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
  AuthenticationError,
  SDKError,
} from "@axon-dashboard/public-api-sdk";

try {
  const instance = await sdk.getInstance(entityDefinitionId, id);
} catch (error) {
  if (error instanceof NotFoundError) {
    // 404 - экземпляр не найден
    notFound();
  } else if (error instanceof PermissionDeniedError) {
    // 403 - нет прав доступа
    notFound(); // Не раскрываем информацию о существовании
  } else if (error instanceof ValidationError) {
    // 400 - ошибка валидации
    console.error("Validation error:", error.message);
  } else if (error instanceof AuthenticationError) {
    // 401 - ошибка авторизации
    redirect("/login");
  } else if (error instanceof SDKError) {
    // Другие ошибки SDK
    console.error("[SDK Error]", error.code, error.message);
  } else {
    // Неизвестная ошибка
    throw error;
  }
}
```

## 📝 Примеры использования

### Пример 1: Список с фильтрацией

```typescript
const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
  page: 1,
  limit: 20,
  search: "test",
  filters: {
    status: ["active"],
    category: ["cat-1", "cat-2"],
  },
  relationFilterModes: {
    category: "any", // хотя бы одна категория
  },
});
```

### Пример 2: Создание с relations

```typescript
const instance = await sdk.createInstance(entityDefinitionId, {
  data: {
    title: "New Post",
    content: "Post content",
    published: true,
  },
  relations: {
    author: ["author-id-1"],
    tags: ["tag-id-1", "tag-id-2"],
    category: ["cat-id-1"],
  },
});
```

### Пример 3: Редактирование (relations как ID)

```typescript
// Загружаем для редактирования
const instance = await sdk.getInstance(entityDefinitionId, instanceId, {
  relationsAsIds: true, // нужны только ID для формы
});

// Обновляем
const updated = await sdk.updateInstance(entityDefinitionId, instanceId, {
  data: {
    title: "Updated Title",
  },
  relations: {
    tags: ["new-tag-id"], // заменит все существующие связи
  },
});
```

## 🔄 Миграция с legacy кода

### Было (legacy):

```typescript
import { getInstances } from "@/lib/universal-entity/instance-service";

const instances = await getInstances(entityDefinitionId, projectId, {
  limit: 20,
  offset: 0,
});
```

### Стало (SDK):

```typescript
import { createServerSDK } from "@axon-dashboard/public-api-sdk/server";

const sdk = await createServerSDK(projectId, config);
const { data: instances, pagination } = await sdk.getInstances(
  entityDefinitionId,
  {
    page: 1,
    limit: 20,
  }
);
```

## ✅ Преимущества SDK

1. **Единый интерфейс** - один способ работы с данными
2. **Автоматизация** - SDK сам определяет метаданные из fields
3. **Кэширование** - оптимизация запросов
4. **Типизация** - полная поддержка TypeScript
5. **Обработка ошибок** - типизированные ошибки
6. **Изоляция** - SDK не зависит от других частей проекта

## 📦 Зависимости

SDK зависит только от:

- `@supabase/supabase-js` - клиент Supabase
- `@supabase/ssr` - SSR поддержка для Supabase

**Нет зависимостей от других частей проекта!**

---

**Готово к использованию!** 🚀
