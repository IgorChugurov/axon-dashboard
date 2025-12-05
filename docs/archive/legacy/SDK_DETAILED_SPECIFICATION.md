# Детальная спецификация SDK для публичного API

**Дата создания:** 2025-01-29  
**Статус:** Спецификация  
**Приоритет:** Высокий

---

## 📋 Ответы на вопросы

### 1. Кэширование: Стратегия с флагом

**Проблема:**

- Для публичного API: данные меняются редко → нужен кэш
- Для админки: данные могут меняться → кэш не нужен

**Решение:** Флаг `enableCache` при создании SDK

```typescript
// Для публичного API (с кэшем)
const sdk = ClientPublicAPIClient.create(projectId, {
  enableCache: true, // по умолчанию true
  cacheTTL: 5 * 60 * 1000, // 5 минут
});

// Для админки (без кэша)
const adminSdk = ClientPublicAPIClient.create(projectId, {
  enableCache: false, // отключаем кэш
});
```

**Реализация:**

```typescript
interface SDKOptions {
  enableCache?: boolean; // default: true
  cacheTTL?: number; // default: 5 минут
}

class BasePublicAPIClient {
  private enableCache: boolean;
  private cacheTTL: number;
  private entityConfigCache: Map<string, CacheEntry> = new Map();

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
    const cached = this.entityConfigCache.get(entityDefinitionId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.config;
    }

    // Загружаем и кэшируем
    const config = await this.loadEntityDefinitionFromDB(entityDefinitionId);
    this.entityConfigCache.set(entityDefinitionId, {
      config,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return config;
  }
}
```

---

### 2. Технические требования

#### 2.1. Supabase-js v2

✅ **Уже используется:** `@supabase/supabase-js": "^2.81.1"`

#### 2.2. Автогенерация типов

**Текущая ситуация:**

- Типы в `lib/supabase/types.ts` написаны вручную
- Нужно настроить автогенерацию через Supabase CLI

**Настройка автогенерации:**

1. Установить Supabase CLI:

```bash
npm install -g supabase
```

2. Добавить скрипт в `package.json`:

```json
{
  "scripts": {
    "generate:types": "supabase gen types typescript --project-id <project-id> > lib/supabase/types-generated.ts"
  }
}
```

3. Или использовать локальную БД:

```json
{
  "scripts": {
    "generate:types": "supabase gen types typescript --local > lib/supabase/types-generated.ts"
  }
}
```

**Структура типов:**

```typescript
// lib/supabase/types-generated.ts (автогенерированный)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      entity_instance: {
        Row: {
          id: string;
          entity_definition_id: string;
          project_id: string;
          data: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          /* ... */
        };
        Update: {
          /* ... */
        };
      };
      // ... другие таблицы
    };
  };
}

// lib/supabase/types.ts (расширенные типы, если нужны)
import type { Database } from "./types-generated";

export type { Database };
// Добавляем кастомные типы если нужно
```

**Использование:**

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types-generated";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### 2.3. Доменные модели (DTO → Domain)

**Вопрос:** Нужны ли доменные модели для каждого типа entityInstance?

**Ответ:** Да, но используем **generic типы** для типобезопасности.

**Подход:**

1. **DTO (Data Transfer Object)** - данные из БД (snake_case, JSONB)
2. **Domain Model** - доменная модель (camelCase, типизированные поля)

**Текущая ситуация:**

- Уже есть трансформации: `transformProject`, `transformEntityDefinition`, `transformField`
- Используется `EntityInstanceWithFields` - это уже доменная модель

**Для SDK:**

```typescript
// DTO (из Supabase)
type EntityInstanceDTO = Database["public"]["Tables"]["entity_instance"]["Row"];

// Domain Model (для SDK)
interface EntityInstanceDomain<TData = Record<string, FieldValue>> {
  id: string;
  entityDefinitionId: string;
  projectId: string;
  data: TData;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Трансформация DTO → Domain
function transformToDomain(dto: EntityInstanceDTO): EntityInstanceDomain {
  return {
    id: dto.id,
    entityDefinitionId: dto.entity_definition_id,
    projectId: dto.project_id,
    data: dto.data as Record<string, FieldValue>,
    createdBy: dto.created_by,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
```

**Для каждого типа entityInstance:**

Не нужно создавать отдельные доменные модели для каждого типа. Используем **generic типы**:

```typescript
// Generic тип для любой сущности
type EntityInstance<
  TFields extends Record<string, FieldValue> = Record<string, FieldValue>
> = {
  id: string;
  entityDefinitionId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
} & TFields;

// Использование с конкретными полями (если известны)
type PostInstance = EntityInstance<{
  title: string;
  content: string;
  authorId: string;
}>;

// Или использовать как есть (динамические поля)
const instance: EntityInstance = await sdk.getInstance(entityDefinitionId, id);
```

**Вывод:** Используем generic типы, не создаем отдельные доменные модели для каждого типа.

---

### 3. Utilities & Errors

**Вопрос:** Нужны ли Utilities & Errors?

**Ответ:** Да, нужны для:

1. Обработки ошибок
2. Валидации данных
3. Утилит для работы с данными

#### 3.1. Errors

**Структура:**

```typescript
// lib/sdk/public-api/errors.ts

export class SDKError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "SDKError";
  }
}

export class NotFoundError extends SDKError {
  constructor(resource: string, id?: string) {
    super(
      "NOT_FOUND",
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404
    );
  }
}

export class PermissionDeniedError extends SDKError {
  constructor(action: string, resource: string) {
    super(
      "PERMISSION_DENIED",
      `Permission denied: cannot ${action} ${resource}`,
      403
    );
  }
}

export class ValidationError extends SDKError {
  constructor(field: string, message: string) {
    super(
      "VALIDATION_ERROR",
      `Validation failed for ${field}: ${message}`,
      400,
      {
        field,
        message,
      }
    );
  }
}

export class AuthenticationError extends SDKError {
  constructor(message = "Authentication required") {
    super("AUTHENTICATION_REQUIRED", message, 401);
  }
}

// Утилита для обработки ошибок Supabase
export function handleSupabaseError(error: any): never {
  if (error.code === "PGRST116") {
    throw new NotFoundError("Resource");
  }
  if (error.code === "23505") {
    throw new SDKError("DUPLICATE_ENTRY", "Duplicate entry", 409);
  }
  if (error.code === "23503") {
    throw new SDKError("FOREIGN_KEY_VIOLATION", "Foreign key violation", 400);
  }

  throw new SDKError(
    "UNKNOWN_ERROR",
    error.message || "Unknown error",
    500,
    error
  );
}
```

**Использование:**

```typescript
try {
  const instance = await sdk.getInstance(entityDefinitionId, id);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Обработка 404
  } else if (error instanceof PermissionDeniedError) {
    // Обработка 403
  } else {
    // Другая ошибка
  }
}
```

#### 3.2. Utilities

**Структура:**

```typescript
// lib/sdk/public-api/utils.ts

/**
 * Валидация данных на основе fields конфигурации
 */
export function validateInstanceData(
  data: Record<string, unknown>,
  fields: FieldConfig[]
): { valid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of fields) {
    const value = data[field.name];

    // Проверка required
    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push({
        field: field.name,
        message: field.requiredText || `${field.name} is required`,
      });
      continue;
    }

    // Проверка типа
    if (value !== undefined && value !== null) {
      const typeError = validateFieldType(value, field);
      if (typeError) {
        errors.push({ field: field.name, message: typeError });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Проверка типа поля
 */
function validateFieldType(value: unknown, field: FieldConfig): string | null {
  switch (field.dbType) {
    case "varchar":
      if (typeof value !== "string") {
        return `Expected string, got ${typeof value}`;
      }
      break;
    case "float":
      if (typeof value !== "number") {
        return `Expected number, got ${typeof value}`;
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        return `Expected boolean, got ${typeof value}`;
      }
      break;
    // ... другие типы
  }
  return null;
}

/**
 * Трансформация snake_case → camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Трансформация camelCase → snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Нормализация значения поля
 */
export function normalizeFieldValue(
  value: unknown,
  field: FieldConfig
): FieldValue {
  if (value === null || value === undefined) {
    // Возвращаем значение по умолчанию
    if (field.defaultStringValue !== null) return field.defaultStringValue;
    if (field.defaultNumberValue !== null) return field.defaultNumberValue;
    if (field.defaultBooleanValue !== null) return field.defaultBooleanValue;
    return null;
  }

  // Нормализация по dbType
  switch (field.dbType) {
    case "float":
      return typeof value === "string" ? parseFloat(value) : (value as number);
    case "boolean":
      return typeof value === "string"
        ? value.toLowerCase() === "true"
        : Boolean(value);
    case "varchar":
    case "timestamptz":
      return String(value);
    default:
      return value as FieldValue;
  }
}
```

---

## 🏗️ Обновленная структура SDK

```
lib/sdk/public-api/
├── types.ts                    # Общие типы
├── errors.ts                   # Классы ошибок
├── utils.ts                   # Утилиты (валидация, трансформация)
├── base/
│   ├── base-client.ts        # Базовый класс
│   └── types.ts              # Типы базового класса
├── server/
│   ├── server-client.ts      # Server SDK
│   └── index.ts
├── client/
│   ├── client-client.ts      # Client SDK
│   └── index.ts
└── index.ts                   # Главный экспорт
```

---

## 📝 Пример использования с ошибками

```typescript
import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/sdk/public-api/errors";

const sdk = ClientPublicAPIClient.create(projectId, {
  enableCache: true, // для публичного API
});

try {
  const instance = await sdk.getInstance(entityDefinitionId, id);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error("Instance not found");
  } else if (error instanceof PermissionDeniedError) {
    console.error("Permission denied");
  } else {
    console.error("Unknown error:", error);
  }
}
```

---

## ✅ Итоговые решения

1. **Кэширование:** Флаг `enableCache` в конструкторе SDK

   - `enableCache: true` - для публичного API (по умолчанию)
   - `enableCache: false` - для админки

2. **Типы:**

   - Использовать автогенерацию через `supabase gen types typescript`
   - Использовать generic типы для entityInstance (не создавать отдельные модели)

3. **Utilities & Errors:** Да, нужны
   - `errors.ts` - классы ошибок (NotFoundError, PermissionDeniedError, ValidationError и т.д.)
   - `utils.ts` - валидация, трансформация, нормализация

---

**Готов к реализации!** 🚀
