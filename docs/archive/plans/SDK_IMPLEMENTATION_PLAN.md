# План реализации SDK для публичного API

**Дата создания:** 2025-01-29  
**Статус:** Готов к реализации  
**Приоритет:** Высокий

---

## 📋 Понимание задачи

Создать SDK в отдельной папке проекта для:

1. **Авторизации** - sign-in, sign-up, sign-out, OAuth
2. **Работы с entityInstance** - CRUD операции через прямой доступ к Supabase
3. **Использования в текущем проекте** - для начала, потом можно вынести в npm

---

## 🎯 Ответы на вопросы

### 1. Кэширование: In-Memory или Redis?

**Ответ:** In-Memory кэш на стороне клиента (браузер или Node.js процесс).

**Важно понимать:**

- Supabase кэширует данные на своем уровне (CDN, edge)
- Мы кэшируем **трансформированные данные** (entityDefinitions + fields) чтобы не делать JOIN запрос каждый раз
- Если загружать одну entityDefinition или все сразу - **разница есть**:
  - **Одна сущность:** Быстрее первый запрос, меньше данных
  - **Все сразу:** Медленнее первый запрос, но потом все в кэше

**Рекомендация:** Ленивая загрузка (загружать только нужную сущность) + кэш на 5 минут.

### 2. Что значит "прямой код"?

**"Прямой код"** = код в том же проекте, не отдельный npm пакет.

**Варианты:**

- ✅ **Прямой код** (в проекте) - `lib/sdk/` - легко отлаживать, быстро разрабатывать
- ❌ **NPM пакет** - нужен отдельный репозиторий, сложнее отладка

**Для разработки:** Используем прямой код в проекте. Потом можно вынести в npm.

### 3. Отладка и разработка

**Если npm пакет:**

- Нужен отдельный репозиторий
- Нужно публиковать версии
- Сложнее отлаживать (нужно link пакет)

**Если прямой код:**

- Все в одном проекте
- Легко отлаживать
- Быстро вносить изменения
- Потом можно вынести в npm когда будет готово

**Рекомендация:** Начать с прямого кода, потом вынести в npm.

---

## 🏗️ Структура SDK

### Предлагаемая структура:

```
lib/
└── sdk/
    ├── public-api/                    # Публичный SDK
    │   ├── types.ts                   # Общие типы
    │   ├── base/
    │   │   ├── base-client.ts        # Базовый класс
    │   │   └── types.ts              # Типы базового класса
    │   ├── server/
    │   │   ├── server-client.ts      # Server SDK (для Server Components)
    │   │   └── index.ts
    │   ├── client/
    │   │   ├── client-client.ts     # Client SDK (для Client Components)
    │   │   └── index.ts
    │   └── index.ts                  # Главный экспорт
    └── README.md                      # Документация SDK
```

### Использование:

```typescript
// В Server Component
import { ServerPublicAPIClient } from "@/lib/sdk/public-api/server";

const sdk = await ServerPublicAPIClient.create(projectId);
const instances = await sdk.getInstances(entityDefinitionId);

// В Client Component
import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";

const sdk = ClientPublicAPIClient.create(projectId);
const instances = await sdk.getInstances(entityDefinitionId);
```

---

## 📦 Детальная структура файлов

### 1. `lib/sdk/public-api/types.ts`

**Использование автогенерированных типов:**

```typescript
import type { Database } from "@/lib/supabase/types-generated";

// Используем типы из Supabase
type EntityInstanceDTO = Database["public"]["Tables"]["entity_instance"]["Row"];
```

**Общие типы для SDK:**

```typescript
/**
 * Общие типы для публичного API SDK
 */

export interface ProjectConfig {
  project: {
    id: string;
    name: string;
    enableSignIn: boolean;
    enableSignUp: boolean;
  };
  entityDefinitions: EntityDefinitionConfig[];
}

export interface EntityDefinitionConfig {
  id: string;
  name: string;
  tableName: string;
  readPermission: string;
  createPermission: string;
  updatePermission: string;
  deletePermission: string;
  fields: FieldConfig[];
}

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  dbType: string;
  required: boolean;
  // ... другие поля по необходимости
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string[]>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeRelations?: string[];
}

export interface CreateInstanceData {
  data: Record<string, unknown>;
  relations?: Record<string, string[]>;
}

export interface UpdateInstanceData {
  data: Record<string, unknown>;
  relations?: Record<string, string[]>;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}
```

### 2. `lib/sdk/public-api/errors.ts`

Классы ошибок для обработки различных ситуаций:

```typescript
export class SDKError extends Error {
  /* ... */
}
export class NotFoundError extends SDKError {
  /* ... */
}
export class PermissionDeniedError extends SDKError {
  /* ... */
}
export class ValidationError extends SDKError {
  /* ... */
}
export class AuthenticationError extends SDKError {
  /* ... */
}
export function handleSupabaseError(error: any): never {
  /* ... */
}
```

### 3. `lib/sdk/public-api/utils.ts`

Утилиты для валидации, трансформации, нормализации:

```typescript
export function validateInstanceData(
  data: Record<string, unknown>,
  fields: FieldConfig[]
): ValidationResult;
export function normalizeFieldValue(
  value: unknown,
  field: FieldConfig
): FieldValue;
export function toCamelCase(str: string): string;
export function toSnakeCase(str: string): string;
```

### 4. `lib/sdk/public-api/base/base-client.ts`

Базовый класс с общей логикой:

- Кэширование конфигурации (с флагом `enableCache`)
- Общие методы для CRUD
- Трансформация DTO → Domain (используя generic типы)

### 5. `lib/sdk/public-api/server/server-client.ts`

Server SDK - использует `createClient` из `@/lib/supabase/server`, работает с cookies.

### 6. `lib/sdk/public-api/client/client-client.ts`

Client SDK - использует `createClient` из `@/lib/supabase/client`, работает в браузере.

---

## 🔄 Интеграция с существующим кодом

### Использование для авторизации

**Текущий код:**

```typescript
// components/providers/AuthProvider.tsx
const login = async (credentials: LoginCredentials) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  // ...
};
```

**С SDK:**

```typescript
// components/providers/AuthProvider.tsx
import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";

const sdk = ClientPublicAPIClient.create(projectId);
const result = await sdk.signIn(email, password);
// result содержит accessToken, refreshToken, user
```

### Использование для entityInstance

**Текущий код:**

```typescript
// lib/universal-entity/instance-service.ts
export async function getInstances(
  entityDefinitionId: string,
  projectId: string,
  options?: GetInstancesOptions
): Promise<EntityInstanceWithFields[]> {
  const supabase = await createClient();
  // ... прямой запрос к Supabase
}
```

**С SDK:**

```typescript
// В компоненте
import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";

const sdk = ClientPublicAPIClient.create(projectId);
const { data, pagination } = await sdk.getInstances(entityDefinitionId, {
  page: 1,
  limit: 20,
  search: "...",
});
```

**Важно:** SDK будет использовать существующие сервисы (`instance-service`, `relation-service`) внутри, но предоставит единый API.

---

## 💾 Кэширование конфигурации

### Стратегия: Ленивая загрузка + In-Memory кэш с флагом

**Важно:** Для публичного API - кэшируем (данные меняются редко), для админки - не кэшируем.

```typescript
interface SDKOptions {
  enableCache?: boolean; // default: true
  cacheTTL?: number; // default: 5 минут
}

class BasePublicAPIClient {
  private enableCache: boolean;
  private cacheTTL: number;
  private entityConfigCache: Map<
    string,
    {
      config: EntityDefinitionConfig;
      expiresAt: number;
    }
  > = new Map();

  constructor(
    supabase: SupabaseClient,
    projectId: string,
    options: SDKOptions = {}
  ) {
    this.enableCache = options.enableCache ?? true;
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000;
  }

  async getEntityDefinitionConfig(
    entityDefinitionId: string,
    forceRefresh = false
  ): Promise<EntityDefinitionConfig> {
    // Если кэш отключен - всегда загружаем из БД
    if (!this.enableCache || forceRefresh) {
      return this.loadEntityDefinitionFromDB(entityDefinitionId);
    }

    // Проверяем кэш
    const cacheKey = `entity-${entityDefinitionId}`;
    const cached = this.entityConfigCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.config;
    }

    // Загружаем и кэшируем
    const config = await this.loadEntityDefinitionFromDB(entityDefinitionId);
    this.entityConfigCache.set(cacheKey, {
      config,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return config;
  }
}
```

**Использование:**

```typescript
// Для публичного API (с кэшем)
const sdk = ClientPublicAPIClient.create(projectId, {
  enableCache: true, // по умолчанию
});

// Для админки (без кэша)
const adminSdk = ClientPublicAPIClient.create(projectId, {
  enableCache: false,
});
```

**Преимущества:**

- Гибкое управление кэшированием
- Загружаем только нужную сущность (быстрее)
- Кэшируем на 5 минут (меньше запросов)
- Легко инвалидировать кэш

---

## 🚀 План реализации

### Этап 0: Настройка автогенерации типов (30 минут)

1. Установить Supabase CLI (если еще не установлен)
2. Добавить скрипт в `package.json`:
   ```json
   {
     "scripts": {
       "generate:types": "supabase gen types typescript --project-id <project-id> > lib/supabase/types-generated.ts"
     }
   }
   ```
3. Запустить генерацию типов
4. Обновить импорты в существующем коде

### Этап 1: Базовая структура (3-4 часа)

1. Создать структуру папок `lib/sdk/public-api/`
2. Создать `errors.ts` с классами ошибок
3. Создать `utils.ts` с утилитами (валидация, трансформация)
4. Создать типы в `types.ts` (используя автогенерированные типы)
5. Создать базовый класс `BasePublicAPIClient` с:
   - Кэшированием конфигурации (с флагом `enableCache`)
   - Методом `getEntityDefinitionConfig`
   - Абстрактными методами для CRUD
   - Трансформацией DTO → Domain (generic типы)

### Этап 2: Server SDK (3-4 часа)

1. Создать `ServerPublicAPIClient` extends `BasePublicAPIClient`
2. Реализовать CRUD операции:
   - Использовать существующий `instance-service` внутри
   - Обернуть в единый API
3. Реализовать авторизацию:
   - `signIn`, `signUp`, `signOut`, `getCurrentUser`
   - Использовать `supabase.auth` методы

### Этап 3: Client SDK (3-4 часа)

1. Создать `ClientPublicAPIClient` extends `BasePublicAPIClient`
2. Реализовать CRUD операции:
   - Использовать `instance-client-service` внутри
   - Или прямой доступ к Supabase (если нужно)
3. Реализовать авторизацию (аналогично Server SDK)

### Этап 4: Интеграция (2-3 часа)

1. Использовать SDK в `AuthProvider` для авторизации
2. Использовать SDK в компонентах для работы с entityInstance
3. Протестировать все операции

### Этап 5: Документация (1 час)

1. Создать README.md с примерами использования
2. Добавить комментарии в код
3. Документировать использование флага `enableCache`
4. Документировать обработку ошибок

---

## 📝 Примеры использования

### Пример 1: Авторизация

```typescript
// components/providers/AuthProvider.tsx
"use client";

import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";
import { useProject } from "@/hooks/use-project"; // или из контекста

export function AuthProvider({ children }) {
  const { projectId } = useProject();
  const sdk = ClientPublicAPIClient.create(projectId);

  const login = async (email: string, password: string) => {
    try {
      const result = await sdk.signIn(email, password);
      // result содержит accessToken, refreshToken, user
      setUser(result.user);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // ...
}
```

### Пример 2: Получение списка экземпляров

```typescript
// components/EntityList.tsx
"use client";

import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";
import { useProject } from "@/hooks/use-project";

export function EntityList({ entityDefinitionId }) {
  const { projectId } = useProject();
  const sdk = ClientPublicAPIClient.create(projectId);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, pagination } = await sdk.getInstances(
          entityDefinitionId,
          {
            page: 1,
            limit: 20,
          }
        );
        setInstances(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entityDefinitionId]);

  // ...
}
```

### Пример 3: Создание экземпляра

```typescript
// components/CreateEntityForm.tsx
"use client";

import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";

export function CreateEntityForm({ entityDefinitionId, projectId }) {
  const sdk = ClientPublicAPIClient.create(projectId);

  const handleSubmit = async (formData: FormData) => {
    try {
      const instance = await sdk.createInstance(entityDefinitionId, {
        data: {
          name: formData.get("name"),
          description: formData.get("description"),
        },
        relations: {
          tags: ["tag-id-1", "tag-id-2"],
        },
      });
      // Успешно создано
    } catch (error) {
      console.error(error);
    }
  };

  // ...
}
```

---

## ✅ Критерии готовности

- [ ] Базовая структура SDK создана
- [ ] Server SDK реализован и протестирован
- [ ] Client SDK реализован и протестирован
- [ ] Кэширование конфигурации работает
- [ ] Авторизация работает через SDK
- [ ] CRUD операции работают через SDK
- [ ] Интегрировано в существующий код
- [ ] Документация написана

---

## 🔄 Миграция существующего кода

### Постепенная миграция

1. **Этап 1:** Создать SDK, протестировать отдельно
2. **Этап 2:** Использовать SDK для авторизации (заменить в `AuthProvider`)
3. **Этап 3:** Использовать SDK для entityInstance в новых компонентах
4. **Этап 4:** Постепенно мигрировать старый код на SDK

**Важно:** Старый код (`instance-service`, `instance-client-service`) остается и используется внутри SDK. Это позволяет:

- Не ломать существующий код
- Постепенно мигрировать
- SDK использует проверенные сервисы

---

## 📦 Будущее: Вынос в NPM

Когда SDK будет готов и протестирован:

1. Создать отдельный репозиторий `axon-public-api-sdk`
2. Скопировать код из `lib/sdk/public-api/`
3. Настроить сборку (TypeScript → JavaScript)
4. Опубликовать в npm как `@axon-digital/public-api-sdk`
5. Использовать в клиентских приложениях

**Но сначала:** Реализуем в проекте, протестируем, потом вынесем.

---

## ❓ Вопросы для обсуждения

1. **Кэширование:** Ленивая загрузка (одна сущность) или загружать все сразу?

   - **Рекомендация:** Ленивая загрузка

2. **Интеграция:** Использовать существующие сервисы внутри SDK или прямой доступ к Supabase?

   - **Рекомендация:** Использовать существующие сервисы (проверенный код)

3. **Миграция:** Сразу мигрировать весь код или постепенно?
   - **Рекомендация:** Постепенно (сначала авторизация, потом entityInstance)

---

**Готов к реализации!** 🚀
