# Финальная архитектура универсальной системы сущностей

**Дата:** 2025-01-XX  
**Статус:** ✅ Утверждено к реализации

## 📋 Обзор

Универсальная система для работы с сущностями без создания отдельных таблиц для каждого типа. Максимальная автоматизация фронтенда и бэкенда на основе конфигурации.

## 🎯 Ключевые принципы

1. **Конфигурация в БД**: `entity_definition` и `field` хранятся в БД для консистентности
2. **Без миграции старых данных**: Старые таблицы игнорируются
3. **Загрузка при старте**: Entities и fields загружаются при старте для формирования меню
4. **Все типы связей**: many-to-many, many-to-one, one-to-many, one-to-one
5. **Партиционирование**: По `project_id` для масштабирования
6. **Функции PostgreSQL**: Для типичных операций

## 🗄️ Структура таблиц

### 1. Таблица `entity_definition` (конфигурация сущностей)

```sql
CREATE TABLE entity_definition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  table_name TEXT NOT NULL, -- для обратной совместимости, не используется
  type TEXT NOT NULL CHECK (type IN ('primary', 'secondary', 'tertiary')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT entity_definition_project_name_unique
    UNIQUE (project_id, name)
);

CREATE INDEX idx_entity_definition_project_id
  ON entity_definition(project_id);
```

### 2. Таблица `field` (конфигурация полей)

```sql
CREATE TABLE field (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  db_type TEXT NOT NULL CHECK (db_type IN (
    'varchar', 'float', 'boolean', 'timestamptz',
    'manyToOne', 'oneToMany', 'manyToMany', 'oneToOne'
  )),
  type TEXT NOT NULL CHECK (type IN (
    'select', 'text', 'textarea', 'number', 'date',
    'boolean', 'radio', 'multipleSelect'
  )),

  -- UI конфигурация
  label TEXT NOT NULL,
  placeholder TEXT,
  description TEXT,
  for_edit_page BOOLEAN DEFAULT true,
  for_create_page BOOLEAN DEFAULT true,
  required BOOLEAN DEFAULT false,
  required_text TEXT,
  for_edit_page_disabled BOOLEAN DEFAULT false,
  display_index INTEGER DEFAULT 0,
  display_in_table BOOLEAN DEFAULT true,
  is_option_title_field BOOLEAN DEFAULT false,
  searchable BOOLEAN DEFAULT false,

  -- Связи
  related_entity_definition_id UUID REFERENCES entity_definition(id),
  relation_field_id UUID REFERENCES field(id), -- обратное поле
  is_relation_source BOOLEAN DEFAULT false,

  -- Значения по умолчанию
  default_string_value TEXT,
  default_number_value NUMERIC,
  default_boolean_value BOOLEAN,
  default_date_value TIMESTAMPTZ,

  -- API конфигурация
  auto_populate BOOLEAN DEFAULT false,
  include_in_single_pma BOOLEAN DEFAULT true,
  include_in_list_pma BOOLEAN DEFAULT true,
  include_in_single_sa BOOLEAN DEFAULT true,
  include_in_list_sa BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT field_entity_name_unique
    UNIQUE (entity_definition_id, name)
);

CREATE INDEX idx_field_entity_definition_id
  ON field(entity_definition_id);
CREATE INDEX idx_field_related_entity_definition_id
  ON field(related_entity_definition_id) WHERE related_entity_definition_id IS NOT NULL;
```

### 3. Таблица `entity_instance` (все экземпляры)

**Вариант A: JSONB подход (рекомендуется)**

```sql
CREATE TABLE entity_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Все поля хранятся в JSONB
  data JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (project_id);

-- Партиции (пример для одного проекта, создаются динамически)
CREATE TABLE entity_instance_p1 PARTITION OF entity_instance
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE entity_instance_p2 PARTITION OF entity_instance
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE entity_instance_p3 PARTITION OF entity_instance
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE entity_instance_p4 PARTITION OF entity_instance
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Индексы
CREATE INDEX idx_entity_instance_entity_definition_id
  ON entity_instance(entity_definition_id);
CREATE INDEX idx_entity_instance_project_id
  ON entity_instance(project_id);
CREATE INDEX idx_entity_instance_created_at
  ON entity_instance(created_at DESC);

-- GIN индекс для JSONB поиска
CREATE INDEX idx_entity_instance_data_gin
  ON entity_instance USING GIN (data);

-- Индексы для популярных полей (опционально, если они есть)
-- CREATE INDEX idx_entity_instance_name
--   ON entity_instance((data->>'name')) WHERE data ? 'name';
-- CREATE INDEX idx_entity_instance_title
--   ON entity_instance((data->>'title')) WHERE data ? 'title';
```

**Вариант B: EAV подход (альтернатива)**

```sql
CREATE TABLE entity_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (project_id);

CREATE TABLE field_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT field_value_unique
    UNIQUE (entity_instance_id, field_id)
) PARTITION BY HASH (
  (SELECT project_id FROM entity_instance WHERE id = entity_instance_id)
);
```

### 4. Таблица `entity_relation` (связи между экземплярами)

```sql
CREATE TABLE entity_relation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь
  source_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  target_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,

  -- Поле, которое определяет связь
  relation_field_id UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,

  -- Обратное поле (для двунаправленных связей)
  reverse_field_id UUID REFERENCES field(id) ON DELETE CASCADE,

  -- Тип связи (для оптимизации запросов)
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'manyToMany', 'manyToOne', 'oneToMany', 'oneToOne'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT entity_relation_unique
    UNIQUE (source_instance_id, target_instance_id, relation_field_id),
  CONSTRAINT entity_relation_no_self_reference
    CHECK (source_instance_id != target_instance_id)
) PARTITION BY HASH (
  (SELECT project_id FROM entity_instance WHERE id = source_instance_id)
);

-- Индексы
CREATE INDEX idx_entity_relation_source_instance_id
  ON entity_relation(source_instance_id);
CREATE INDEX idx_entity_relation_target_instance_id
  ON entity_relation(target_instance_id);
CREATE INDEX idx_entity_relation_relation_field_id
  ON entity_relation(relation_field_id);
CREATE INDEX idx_entity_relation_source_field
  ON entity_relation(source_instance_id, relation_field_id);
CREATE INDEX idx_entity_relation_target_reverse
  ON entity_relation(target_instance_id, reverse_field_id)
  WHERE reverse_field_id IS NOT NULL;
```

## 💬 Обсуждение подходов

### 1. JSONB подход = MongoDB в PostgreSQL?

**Ответ: Не совсем, но похоже.**

**Сходства с MongoDB:**

- ✅ Гибкая схема (нет фиксированных колонок)
- ✅ Документно-ориентированное хранение
- ✅ Быстрое чтение целого документа

**Отличия от MongoDB:**

- ✅ **ACID транзакции** - PostgreSQL гарантирует консистентность
- ✅ **JOIN'ы** - можно делать JOIN с другими таблицами
- ✅ **Индексы** - GIN индексы для JSONB очень эффективны
- ✅ **Партиционирование** - встроенная поддержка
- ✅ **RLS** - Row Level Security для безопасности
- ✅ **Типизация** - можно использовать generated columns

**Вывод:** Это гибридный подход - гибкость NoSQL с надежностью SQL.

### 2. Generated columns - что выигрываем?

**Generated columns** - это колонки, которые автоматически вычисляются из других колонок.

**Пример:**

```sql
CREATE TABLE field_value (
  value JSONB NOT NULL,
  -- Автоматически извлекается из JSONB
  string_value TEXT GENERATED ALWAYS AS (value->>'string') STORED,
  number_value NUMERIC GENERATED ALWAYS AS ((value->>'number')::numeric) STORED
);
```

**Что выигрываем:**

1. **Производительность фильтрации**:

   ```sql
   -- Без generated column (медленно)
   WHERE value->>'name' = 'test'

   -- С generated column (быстро, использует индекс)
   WHERE string_value = 'test'
   ```

2. **Индексы на типизированных значениях**:

   ```sql
   CREATE INDEX idx_field_value_string
     ON field_value(string_value) WHERE string_value IS NOT NULL;
   ```

3. **Типизация на уровне БД**: Можно добавить CHECK constraints

**НО:** Это работает только если все значения одного типа в одной колонке. В нашем случае каждое поле может быть разного типа, поэтому generated columns не очень помогают.

**Вывод:** Generated columns полезны, но не критичны для нашего случая. JSONB с GIN индексами достаточно.

### 3. Гибридный подход - не оправдан?

**Гибридный подход:** Основные поля (name, title, description) в `entity_instance`, остальные в `field_value`.

**Проблемы:**

1. ❌ Если поиск по `title`, а `title` не основное поле - все равно нужно искать в `field_value`
2. ❌ Нет универсальности - нужно знать какие поля "основные"
3. ❌ При добавлении нового "основного" поля нужна миграция
4. ❌ Сложнее логика - нужно проверять где искать поле

**Вывод:** Вы правы, гибридный подход не оправдан. JSONB подход проще и универсальнее.

### 4. Популярные поля в основной таблице?

**Вопрос:** Добавить name, title, description, isPublished в `entity_instance`?

**Анализ:**

**Плюсы:**

- ✅ Быстрее фильтрация по этим полям
- ✅ Можно использовать обычные индексы
- ✅ Проще запросы

**Минусы:**

- ❌ Нарушает универсальность - нужно знать какие поля популярные
- ❌ При добавлении нового популярного поля нужна миграция
- ❌ Дублирование данных (в JSONB и в колонках)
- ❌ Сложнее логика - нужно синхронизировать

**Альтернатива - JSONB с индексами:**

```sql
-- Индекс на конкретное поле в JSONB
CREATE INDEX idx_entity_instance_name
  ON entity_instance((data->>'name')) WHERE data ? 'name';

-- Запрос использует индекс
SELECT * FROM entity_instance
WHERE data->>'name' = 'test';
```

**Вывод:** Лучше использовать JSONB с индексами на популярные поля. Это дает производительность без потери универсальности.

## 🎯 Рекомендуемый подход: JSONB с оптимизацией

### Структура данных в JSONB

```json
{
  "name": "My Block",
  "body": "Content",
  "title": "Block Title",
  "isPublished": true,
  "publishedAt": "2025-01-15T10:00:00Z"
}
```

### Индексы для популярных полей

```sql
-- Если поле часто используется для поиска
CREATE INDEX idx_entity_instance_name
  ON entity_instance((data->>'name'))
  WHERE data ? 'name' AND entity_definition_id = 'blocks-id';

-- Для фильтрации по boolean
CREATE INDEX idx_entity_instance_is_published
  ON entity_instance((data->>'isPublished')::boolean)
  WHERE data ? 'isPublished';
```

### Преимущества

1. ✅ **Универсальность** - любая структура без миграций
2. ✅ **Производительность** - индексы на нужных полях
3. ✅ **Простота** - один запрос для получения всех данных
4. ✅ **Гибкость** - легко добавлять новые поля

## 🔄 Типы связей

### Many-to-Many

```sql
-- Blocks <-> Tags
-- В entity_relation:
source_instance_id = block_id
target_instance_id = tag_id
relation_field_id = tags_field_id (в Blocks)
reverse_field_id = blocks_field_id (в Tags)
relation_type = 'manyToMany'
```

**Запрос тегов для блока:**

```sql
SELECT target_instance_id
FROM entity_relation
WHERE source_instance_id = block_id
  AND relation_field_id = tags_field_id;
```

**Запрос блоков для тега:**

```sql
SELECT source_instance_id
FROM entity_relation
WHERE target_instance_id = tag_id
  AND reverse_field_id = blocks_field_id;
```

### Many-to-One / One-to-Many

```sql
-- Post -> Author (many-to-one)
-- В entity_relation:
source_instance_id = post_id
target_instance_id = author_id
relation_field_id = author_field_id (в Post)
relation_type = 'manyToOne'
-- reverse_field_id = NULL (не нужен для one-way связи)
```

**Запрос автора поста:**

```sql
SELECT target_instance_id
FROM entity_relation
WHERE source_instance_id = post_id
  AND relation_field_id = author_field_id;
```

**Запрос постов автора:**

```sql
SELECT source_instance_id
FROM entity_relation
WHERE target_instance_id = author_id
  AND relation_field_id = author_field_id;
```

### One-to-One

```sql
-- User -> Profile (one-to-one)
-- В entity_relation:
source_instance_id = user_id
target_instance_id = profile_id
relation_field_id = profile_field_id
relation_type = 'oneToOne'
-- Нужен UNIQUE constraint на source_instance_id + relation_field_id
```

**Запрос профиля пользователя:**

```sql
SELECT target_instance_id
FROM entity_relation
WHERE source_instance_id = user_id
  AND relation_field_id = profile_field_id;
```

## 🚀 Загрузка конфигурации при старте

### Сервис для загрузки конфигурации

```typescript
// lib/universal-entity/config-service.ts
import { createClient } from "@/lib/supabase/server";
import type { EntityDefinition, Field } from "./types";

let cachedConfig: {
  entities: EntityDefinition[];
  fields: Field[];
  loadedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export async function getEntityDefinitions(
  projectId: string,
  forceRefresh = false
): Promise<EntityDefinition[]> {
  if (!forceRefresh && cachedConfig) {
    const age = Date.now() - cachedConfig.loadedAt;
    if (age < CACHE_TTL) {
      return cachedConfig.entities.filter((e) => e.projectId === projectId);
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_definition")
    .select("*")
    .eq("project_id", projectId)
    .order("name");

  if (error) throw error;

  // Кэшируем
  if (!cachedConfig) {
    cachedConfig = {
      entities: data || [],
      fields: [],
      loadedAt: Date.now(),
    };
  } else {
    cachedConfig.entities = data || [];
    cachedConfig.loadedAt = Date.now();
  }

  return data || [];
}

export async function getFields(
  entityDefinitionId?: string,
  forceRefresh = false
): Promise<Field[]> {
  if (!forceRefresh && cachedConfig?.fields.length) {
    const age = Date.now() - cachedConfig.loadedAt;
    if (age < CACHE_TTL) {
      if (entityDefinitionId) {
        return cachedConfig.fields.filter(
          (f) => f.entityDefinitionId === entityDefinitionId
        );
      }
      return cachedConfig.fields;
    }
  }

  const supabase = await createClient();
  let query = supabase.from("field").select("*").order("display_index");

  if (entityDefinitionId) {
    query = query.eq("entity_definition_id", entityDefinitionId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Кэшируем
  if (!cachedConfig) {
    cachedConfig = {
      entities: [],
      fields: data || [],
      loadedAt: Date.now(),
    };
  } else {
    cachedConfig.fields = data || [];
    cachedConfig.loadedAt = Date.now();
  }

  return data || [];
}

export async function getFullConfig(
  projectId: string,
  forceRefresh = false
): Promise<{ entities: EntityDefinition[]; fields: Field[] }> {
  const [entities, fields] = await Promise.all([
    getEntityDefinitions(projectId, forceRefresh),
    getFields(undefined, forceRefresh),
  ]);

  return { entities, fields };
}
```

### Использование в layout для меню

```typescript
// app/layout.tsx
import { getFullConfig } from "@/lib/universal-entity/config-service";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Загружаем конфигурацию для формирования меню
  const { entities } = await getFullConfig(currentProjectId);

  return (
    <html>
      <body>
        <Sidebar entities={entities} />
        {children}
      </body>
    </html>
  );
}
```

## 📊 Фильтрация и поиск

### Поиск по полям в JSONB

```sql
-- Простой поиск
SELECT * FROM entity_instance
WHERE data->>'name' ILIKE '%search%'
  AND entity_definition_id = 'blocks-id';

-- С индексом (если создан)
CREATE INDEX idx_entity_instance_name_search
  ON entity_instance USING GIN ((data->>'name') gin_trgm_ops)
  WHERE entity_definition_id = 'blocks-id';

-- Полнотекстовый поиск
CREATE INDEX idx_entity_instance_fulltext
  ON entity_instance USING GIN (to_tsvector('english', data::text))
  WHERE entity_definition_id = 'blocks-id';

SELECT * FROM entity_instance
WHERE to_tsvector('english', data::text) @@ to_tsquery('english', 'search');
```

### Фильтрация по нескольким полям

```sql
-- Фильтр по нескольким полям
SELECT * FROM entity_instance
WHERE entity_definition_id = 'blocks-id'
  AND (data->>'name' ILIKE '%search%' OR data->>'title' ILIKE '%search%')
  AND (data->>'isPublished')::boolean = true;
```

## 🗂️ Структура проекта

```
lib/
  universal-entity/          # Новая папка для универсальной системы
    ├── types.ts            # TypeScript типы
    ├── config-service.ts   # Загрузка конфигурации
    ├── instance-service.ts # Работа с экземплярами
    ├── relation-service.ts # Работа со связями
    └── index.ts            # Экспорты
```

## 📝 План реализации

### Фаза 1: Таблицы и миграция конфигурации (1-2 дня)

1. ✅ Создать таблицы `entity_definition`, `field`
2. ✅ Мигрировать данные из `entity-lib/data/` в БД
3. ✅ Создать таблицы `entity_instance`, `entity_relation`
4. ✅ Настроить индексы и RLS

### Фаза 2: Сервисный слой (2-3 дня)

1. ✅ `config-service.ts` - загрузка конфигурации
2. ✅ `instance-service.ts` - CRUD экземпляров
3. ✅ `relation-service.ts` - работа со связями
4. ✅ Типы TypeScript

### Фаза 3: Интеграция (2-3 дня)

1. ✅ Загрузка конфигурации в layout
2. ✅ Формирование меню из entities
3. ✅ Тестирование с данными из файлов

### Фаза 4: UI слой (3-5 дней)

1. ✅ Универсальный список
2. ✅ Универсальная форма
3. ✅ Динамическая генерация страниц

## ✅ Итоговые решения

1. **JSONB подход** - основной способ хранения данных
2. **Индексы на популярные поля** - для производительности
3. **Партиционирование** - по project_id
4. **Функции PostgreSQL** - для сложных операций
5. **Конфигурация в БД** - для консистентности
6. **Загрузка при старте** - для формирования меню
7. **Все типы связей** - many-to-many, many-to-one, one-to-many, one-to-one
