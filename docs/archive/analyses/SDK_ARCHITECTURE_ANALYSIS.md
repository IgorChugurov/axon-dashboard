# Анализ архитектуры SDK для публичного API

**Дата создания:** 2025-01-29  
**Статус:** Анализ и обсуждение  
**Приоритет:** Высокий

---

## 📋 Понимание задачи

Создание SDK для клиентских приложений, которые будут обращаться напрямую к Supabase для работы с `entityInstance` через `entityDefinition`. SDK должен поддерживать:

1. CRUD операции с экземплярами сущностей
2. Авторизацию (sign-in, sign-up, sign-out, OAuth)
3. Загрузку конфигурации проекта (entityDefinitions + fields)
4. Работу в Next.js (server и client компоненты)

---

## 🔐 1. Безопасность: Передача ключей

### 1.1. Anon Key - это нормально?

**Да, это безопасно!** `NEXT_PUBLIC_SUPABASE_ANON_KEY` специально предназначен для использования в клиентском коде.

#### Почему это безопасно:

1. **RLS защищает данные** - даже если кто-то получит anon key, он не сможет получить доступ к данным без авторизации
2. **Anon key ограничен** - работает только с RLS политиками, не может обойти их
3. **Стандартная практика** - все Supabase приложения используют anon key на клиенте
4. **Service Role Key скрыт** - никогда не передается клиенту (только на сервере)

#### Что нужно передать клиенту:

```typescript
// Безопасные для клиента
const SUPABASE_URL = "https://xxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGci..."; // Публичный ключ

// НИКОГДА не передавать клиенту!
const SUPABASE_SERVICE_ROLE_KEY = "..."; // Только на сервере
```

### 1.2. Как передавать ключи клиентскому приложению?

#### Вариант 1: Environment Variables (рекомендуется)

Клиентское приложение создает `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Преимущества:**

- Стандартный подход
- Легко настроить
- Безопасно (anon key публичный)

**Недостатки:**

- Нужно вручную передавать ключи
- Риск утечки при неправильной настройке

#### Вариант 2: API Endpoint для получения ключей

Создать endpoint `/api/public/config` который возвращает ключи:

```typescript
// app/api/public/config/route.ts
export async function GET() {
  return Response.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
```

**Преимущества:**

- Централизованное управление
- Можно добавить логику (например, разные ключи для разных проектов)

**Недостатки:**

- Дополнительный запрос при инициализации
- Ключи все равно видны в браузере (но это нормально)

#### Вариант 3: Передача через props/context (для Next.js)

Если клиентское приложение - это тот же Next.js проект:

```typescript
// Передаем через Server Component
export default async function PublicPage() {
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };

  return <PublicClient config={config} />;
}
```

**Рекомендация:** Использовать **Вариант 1** (Environment Variables) - это стандарт для Supabase.

---

## 🏗️ 2. Структура SDK

### 2.1. Два SDK для Next.js (Server и Client)

В Next.js действительно нужны два варианта SDK из-за различий в работе сервера и клиента.

#### Структура файлов:

```
lib/sdk/
├── types.ts                    # Общие типы
├── config.ts                   # Конфигурация (ключи, URL)
├── base/
│   ├── base-client.ts         # Базовый класс SDK
│   └── types.ts               # Типы базового класса
├── server/
│   ├── server-client.ts       # Server SDK (для Server Components)
│   └── index.ts
└── client/
    ├── client-client.ts       # Client SDK (для Client Components)
    └── index.ts
```

### 2.2. Базовый класс SDK

```typescript
// lib/sdk/base/base-client.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface ProjectConfig {
  project: {
    id: string;
    name: string;
    enableSignIn: boolean;
    enableSignUp: boolean;
  };
  entityDefinitions: Array<{
    id: string;
    name: string;
    tableName: string;
    readPermission: string;
    createPermission: string;
    updatePermission: string;
    deletePermission: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
      dbType: string;
      required: boolean;
      // ... другие поля
    }>;
  }>;
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

export abstract class BasePublicAPIClient {
  protected supabase: SupabaseClient<Database>;
  protected projectId: string;
  private configCache: Map<
    string,
    { config: ProjectConfig; expiresAt: number }
  > = new Map();
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 минут

  constructor(supabase: SupabaseClient<Database>, projectId: string) {
    this.supabase = supabase;
    this.projectId = projectId;
  }

  // Загрузка конфигурации проекта (кэшируется)
  async getProjectConfig(forceRefresh = false): Promise<ProjectConfig> {
    const cacheKey = `project-${this.projectId}`;

    // Проверяем кэш
    if (!forceRefresh) {
      const cached = this.configCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.config;
      }
    }

    // Загружаем проект
    const { data: project, error: projectError } = await this.supabase
      .from("projects")
      .select("id, name, enable_sign_in, enable_sign_up")
      .eq("id", this.projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    // Загружаем entityDefinitions с полями одним запросом (JOIN)
    const { data: entityDefinitions, error: entitiesError } =
      await this.supabase
        .from("entity_definition")
        .select(
          `
        *,
        field!field_entity_definition_id_fkey (*)
      `
        )
        .eq("project_id", this.projectId)
        .order("name");

    if (entitiesError) {
      throw new Error(
        `Failed to load entity definitions: ${entitiesError.message}`
      );
    }

    // Трансформируем данные
    const config: ProjectConfig = {
      project: {
        id: project.id,
        name: project.name,
        enableSignIn: project.enable_sign_in ?? true,
        enableSignUp: project.enable_sign_up ?? true,
      },
      entityDefinitions: (entityDefinitions || []).map((ed: any) => ({
        id: ed.id,
        name: ed.name,
        tableName: ed.table_name,
        readPermission: ed.read_permission,
        createPermission: ed.create_permission,
        updatePermission: ed.update_permission,
        deletePermission: ed.delete_permission,
        fields: (ed.field || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          dbType: f.db_type,
          required: f.required,
          // ... другие поля
        })),
      })),
    };

    // Сохраняем в кэш
    this.configCache.set(cacheKey, {
      config,
      expiresAt: Date.now() + this.CONFIG_CACHE_TTL,
    });

    return config;
  }

  // CRUD операции
  abstract getInstances(
    entityDefinitionId: string,
    params?: QueryParams
  ): Promise<{ data: any[]; pagination: any }>;

  abstract getInstance(
    entityDefinitionId: string,
    id: string,
    params?: { includeRelations?: string[] }
  ): Promise<any>;

  abstract createInstance(
    entityDefinitionId: string,
    data: CreateInstanceData
  ): Promise<any>;

  abstract updateInstance(
    entityDefinitionId: string,
    id: string,
    data: UpdateInstanceData
  ): Promise<any>;

  abstract deleteInstance(
    entityDefinitionId: string,
    id: string
  ): Promise<void>;

  // Авторизация
  abstract signIn(email: string, password: string): Promise<any>;
  abstract signUp(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<any>;
  abstract signOut(): Promise<void>;
  abstract getCurrentUser(): Promise<any>;
}
```

### 2.3. Server SDK

```typescript
// lib/sdk/server/server-client.ts
import { createClient } from "@/lib/supabase/server";
import { BasePublicAPIClient } from "../base/base-client";
import type { Database } from "@/lib/supabase/types";

export class ServerPublicAPIClient extends BasePublicAPIClient {
  private static instances: Map<string, ServerPublicAPIClient> = new Map();

  private constructor(projectId: string) {
    // Создаем server client (async)
    // Но конструктор не может быть async, поэтому используем фабрику
    super(null as any, projectId);
  }

  static async create(projectId: string): Promise<ServerPublicAPIClient> {
    const cacheKey = `server-${projectId}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    const supabase = await createClient(); // Server client
    const client = new ServerPublicAPIClient(projectId);
    client.supabase = supabase;

    this.instances.set(cacheKey, client);
    return client;
  }

  async getInstances(entityDefinitionId: string, params?: QueryParams) {
    const config = await this.getProjectConfig();
    const entityDef = config.entityDefinitions.find(
      (ed) => ed.id === entityDefinitionId
    );

    if (!entityDef) {
      throw new Error(`Entity definition not found: ${entityDefinitionId}`);
    }

    // Используем instance-service для загрузки данных
    // RLS автоматически применит разрешения
    // ... реализация
  }

  // ... остальные методы
}
```

### 2.4. Client SDK

```typescript
// lib/sdk/client/client-client.ts
import { createClient } from "@/lib/supabase/client";
import { BasePublicAPIClient } from "../base/base-client";
import type { Database } from "@/lib/supabase/types";

export class ClientPublicAPIClient extends BasePublicAPIClient {
  private static instances: Map<string, ClientPublicAPIClient> = new Map();

  static create(projectId: string): ClientPublicAPIClient {
    if (this.instances.has(projectId)) {
      return this.instances.get(projectId)!;
    }

    const supabase = createClient(); // Client client (синхронный)
    const client = new ClientPublicAPIClient(supabase, projectId);

    this.instances.set(projectId, client);
    return client;
  }

  async getInstances(entityDefinitionId: string, params?: QueryParams) {
    const config = await this.getProjectConfig();
    const entityDef = config.entityDefinitions.find(
      (ed) => ed.id === entityDefinitionId
    );

    if (!entityDef) {
      throw new Error(`Entity definition not found: ${entityDefinitionId}`);
    }

    // Прямой запрос к Supabase
    // RLS автоматически применит разрешения
    let query = this.supabase
      .from("entity_instance")
      .select("*", { count: "exact" })
      .eq("entity_definition_id", entityDefinitionId);

    // Применяем фильтры, поиск, пагинацию
    // ... реализация

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch instances: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        // ... вычисление пагинации
      },
    };
  }

  // ... остальные методы
}
```

---

## 💾 3. Кэширование конфигурации

### 3.1. Проблема: Загрузка всех entityDefinitions и fields

**Проблема:** Загрузка всех `entityDefinitions` с `fields` может быть медленной, особенно если в проекте много сущностей.

### 3.2. Решения для кэширования

#### Вариант 1: In-Memory кэш (текущий подход)

```typescript
private configCache: Map<string, { config: ProjectConfig; expiresAt: number }> = new Map();
private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 минут
```

**Преимущества:**

- Быстро (нет запросов к БД)
- Просто реализовать
- Работает для одного процесса

**Недостатки:**

- Не работает между процессами (если несколько серверов)
- Сбрасывается при перезапуске
- Не синхронизируется между серверами

#### Вариант 2: Redis кэш (для production)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async getProjectConfig(forceRefresh = false): Promise<ProjectConfig> {
  const cacheKey = `project-config:${this.projectId}`;

  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // Загружаем из БД
  const config = await this.loadConfigFromDB();

  // Сохраняем в Redis на 5 минут
  await redis.setex(cacheKey, 300, JSON.stringify(config));

  return config;
}
```

**Преимущества:**

- Работает между серверами
- Персистентный
- Можно инвалидировать извне

**Недостатки:**

- Требует Redis
- Дополнительная зависимость

#### Вариант 3: HTTP кэш (для клиента)

```typescript
// Используем fetch с кэшированием
async getProjectConfig(forceRefresh = false): Promise<ProjectConfig> {
  const cacheKey = `project-config-${this.projectId}`;

  if (!forceRefresh) {
    // Проверяем localStorage
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { config, expiresAt } = JSON.parse(cached);
      if (Date.now() < expiresAt) {
        return config;
      }
    }
  }

  // Загружаем из БД
  const config = await this.loadConfigFromDB();

  // Сохраняем в localStorage
  localStorage.setItem(cacheKey, JSON.stringify({
    config,
    expiresAt: Date.now() + 5 * 60 * 1000,
  }));

  return config;
}
```

**Преимущества:**

- Работает в браузере
- Не требует сервера

**Недостатки:**

- Ограничен размером localStorage
- Не синхронизируется между вкладками

### 3.3. Оптимизация загрузки конфигурации

#### Вариант A: Загружать только нужную сущность

```typescript
async getEntityDefinitionConfig(entityDefinitionId: string): Promise<EntityDefinitionConfig> {
  // Загружаем только одну сущность с полями
  const { data, error } = await this.supabase
    .from('entity_definition')
    .select(`
      *,
      field!field_entity_definition_id_fkey (*)
    `)
    .eq('id', entityDefinitionId)
    .single();

  // ... трансформация
}
```

**Преимущества:**

- Быстрее (меньше данных)
- Меньше памяти

**Недостатки:**

- Нужно знать entityDefinitionId заранее

#### Вариант B: Ленивая загрузка

```typescript
private entityConfigCache: Map<string, EntityDefinitionConfig> = new Map();

async getEntityDefinitionConfig(entityDefinitionId: string): Promise<EntityDefinitionConfig> {
  // Проверяем кэш
  if (this.entityConfigCache.has(entityDefinitionId)) {
    return this.entityConfigCache.get(entityDefinitionId)!;
  }

  // Загружаем только эту сущность
  const config = await this.loadEntityDefinitionFromDB(entityDefinitionId);

  // Кэшируем
  this.entityConfigCache.set(entityDefinitionId, config);

  return config;
}
```

**Рекомендация:** Использовать **Вариант B (ленивая загрузка)** - загружать конфигурацию только для нужных сущностей.

---

## 📦 4. Распространение SDK

### 4.1. Подходы к распространению

#### Вариант 1: NPM Package (рекомендуется)

Создать отдельный репозиторий и опубликовать в npm:

```
@axon-digital/public-api-sdk
```

**Структура пакета:**

```
packages/
  public-api-sdk/
    ├── src/
    │   ├── server/
    │   │   └── index.ts
    │   ├── client/
    │   │   └── index.ts
    │   ├── base/
    │   │   └── base-client.ts
    │   └── types.ts
    ├── package.json
    └── tsconfig.json
```

**package.json:**

```json
{
  "name": "@axon-digital/public-api-sdk",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./server": {
      "import": "./dist/server/index.js",
      "require": "./dist/server/index.cjs"
    },
    "./client": {
      "import": "./dist/client/index.js",
      "require": "./dist/client/index.cjs"
    }
  },
  "peerDependencies": {
    "@supabase/supabase-js": "^2.81.1",
    "@supabase/ssr": "^0.7.0"
  }
}
```

**Использование:**

```bash
npm install @axon-digital/public-api-sdk
```

```typescript
// В клиентском приложении
import { ClientPublicAPIClient } from "@axon-digital/public-api-sdk/client";

const sdk = ClientPublicAPIClient.create(projectId);
const instances = await sdk.getInstances(entityDefinitionId);
```

**Преимущества:**

- Стандартный подход
- Версионирование
- Легко обновлять
- TypeScript типы из коробки

**Недостатки:**

- Нужно публиковать в npm
- Нужно поддерживать версии

#### Вариант 2: Git Submodule

Добавить SDK как git submodule в клиентское приложение:

```bash
git submodule add https://github.com/axon-digital/public-api-sdk.git lib/sdk
```

**Преимущества:**

- Просто для разработки
- Прямой доступ к коду

**Недостатки:**

- Неудобно для production
- Нужно вручную обновлять
- Проблемы с зависимостями

#### Вариант 3: Monorepo (если один проект)

Если клиентское приложение - это часть того же проекта:

```
axon-dashboard/
├── apps/
│   ├── admin/          # Админка
│   └── public/         # Публичное приложение
└── packages/
    └── sdk/            # SDK
```

**Преимущества:**

- Единая кодовая база
- Легко синхронизировать изменения
- Общие типы

**Недостатки:**

- Только для одного проекта
- Не подходит для внешних клиентов

#### Вариант 4: CDN / UMD Bundle

Собрать SDK в один файл и загружать через CDN:

```html
<script src="https://cdn.axondigital.xyz/sdk/v1/public-api-sdk.js"></script>
<script>
  const sdk = new PublicAPIClient({
    supabaseUrl: "...",
    supabaseAnonKey: "...",
    projectId: "...",
  });
</script>
```

**Преимущества:**

- Не требует установки
- Работает везде

**Недостатки:**

- Нет TypeScript типов
- Сложнее отлаживать
- Нужен CDN

#### Вариант 5: API Endpoint (гибридный)

SDK делает запросы к вашему API, который работает с Supabase:

```typescript
// SDK делает запросы к вашему API
class PublicAPIClient {
  constructor(private apiUrl: string, private projectId: string) {}

  async getInstances(entityDefinitionId: string) {
    const response = await fetch(
      `${this.apiUrl}/api/public/${this.projectId}/${entityDefinitionId}`
    );
    return response.json();
  }
}
```

**Преимущества:**

- Не нужно передавать ключи
- Полный контроль на сервере
- Можно добавить rate limiting, кэширование

**Недостатки:**

- Дополнительный hop через сервер
- Медленнее чем прямой доступ

### 4.2. Рекомендация

**Для вашего случая рекомендую:**

1. **Краткосрочно:** Использовать код напрямую в проекте (`lib/sdk/`)
2. **Долгосрочно:** Вынести в NPM package (`@axon-digital/public-api-sdk`)

**Почему:**

- Сначала нужно протестировать SDK в реальных условиях
- Потом вынести в отдельный пакет для переиспользования
- NPM package - стандарт для распространения SDK

---

## 🎯 5. План реализации

### Этап 1: Базовая структура SDK (2-3 часа)

1. Создать базовый класс `BasePublicAPIClient`
2. Реализовать `getProjectConfig` с кэшированием
3. Создать типы для всех операций

### Этап 2: Server SDK (2-3 часа)

1. Создать `ServerPublicAPIClient`
2. Реализовать CRUD операции через `instance-service`
3. Реализовать авторизацию

### Этап 3: Client SDK (2-3 часа)

1. Создать `ClientPublicAPIClient`
2. Реализовать CRUD операции через прямой доступ к Supabase
3. Реализовать авторизацию

### Этап 4: Тестирование (1-2 дня)

1. Протестировать в реальном Next.js приложении
2. Проверить кэширование
3. Проверить производительность

### Этап 5: Вынос в NPM package (опционально, 1 день)

1. Создать отдельный репозиторий
2. Настроить сборку (TypeScript → JavaScript)
3. Опубликовать в npm

---

## ❓ Вопросы для обсуждения

1. **Кэширование:** Какой вариант кэширования использовать?

   - In-Memory (простой)
   - Redis (для production)
   - HTTP кэш (для клиента)

2. **Распространение:** Как распространять SDK?

   - NPM package (рекомендуется)
   - Git submodule
   - Прямой код в проекте

3. **Конфигурация:** Загружать всю конфигурацию или лениво?

   - Вся конфигурация (проще, но медленнее)
   - Ленивая загрузка (быстрее, но сложнее)

4. **Ключи:** Как передавать ключи клиенту?
   - Environment variables (рекомендуется)
   - API endpoint
   - Props/context

---

## 📝 Следующие шаги

1. Обсудить вопросы выше
2. Утвердить подход к кэшированию
3. Утвердить способ распространения
4. Начать реализацию базового класса

---

**Готов к обсуждению!** 🚀
