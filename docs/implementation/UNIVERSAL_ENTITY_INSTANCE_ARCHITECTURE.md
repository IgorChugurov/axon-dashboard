# Архитектура универсальной системы сущностей (Entity Instance System)

**Дата:** 2025-01-XX  
**Статус:** 🟡 Проектирование

## 📋 Обзор

Переход от системы с отдельными таблицами для каждой сущности к универсальной системе с двумя основными таблицами:

- `entityInstance` - все экземпляры сущностей
- `fieldValue` - значения полей для каждого экземпляра
- `entityRelation` - связи между экземплярами (many-to-many)

## 🎯 Цели

1. **Универсальность**: Одна таблица для всех типов сущностей
2. **Гибкость**: Динамическое создание страниц на основе конфигурации
3. **Масштабируемость**: Легко добавлять новые типы сущностей без миграций
4. **Производительность**: Эффективные запросы и индексы

## 🗄️ Предлагаемая структура таблиц

### 1. Таблица `entityInstance`

```sql
CREATE TABLE entity_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Индексы
  CONSTRAINT entity_instance_entity_definition_fk
    FOREIGN KEY (entity_definition_id)
    REFERENCES entity_definition(id)
);

-- Индексы для производительности
CREATE INDEX idx_entity_instance_entity_definition_id
  ON entity_instance(entity_definition_id);
CREATE INDEX idx_entity_instance_project_id
  ON entity_instance(project_id);
CREATE INDEX idx_entity_instance_created_at
  ON entity_instance(created_at DESC);
```

**Особенности:**

- ✅ Все экземпляры всех сущностей в одной таблице
- ✅ Связь с `entity_definition` определяет тип сущности
- ✅ Связь с `project_id` для изоляции по проектам
- ✅ Минимальная структура - только метаданные

### 2. Таблица `fieldValue`

```sql
CREATE TABLE field_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,

  -- Универсальное хранение значений (JSONB для гибкости)
  value JSONB NOT NULL,

  -- Типизированные колонки для производительности (опционально)
  -- Можно использовать только JSONB или добавить колонки для частых типов
  string_value TEXT GENERATED ALWAYS AS (value->>'string') STORED,
  number_value NUMERIC GENERATED ALWAYS AS ((value->>'number')::numeric) STORED,
  boolean_value BOOLEAN GENERATED ALWAYS AS ((value->>'boolean')::boolean) STORED,
  date_value TIMESTAMPTZ GENERATED ALWAYS AS ((value->>'date')::timestamptz) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность: один field на один instance
  CONSTRAINT field_value_unique
    UNIQUE (entity_instance_id, field_id)
);

-- Индексы
CREATE INDEX idx_field_value_entity_instance_id
  ON field_value(entity_instance_id);
CREATE INDEX idx_field_value_field_id
  ON field_value(field_id);
CREATE INDEX idx_field_value_string_value
  ON field_value(string_value) WHERE string_value IS NOT NULL;
CREATE INDEX idx_field_value_number_value
  ON field_value(number_value) WHERE number_value IS NOT NULL;

-- GIN индекс для JSONB поиска
CREATE INDEX idx_field_value_value_gin
  ON field_value USING GIN (value);
```

**Структура JSONB value:**

```json
{
  "type": "string" | "number" | "boolean" | "date",
  "string": "текстовое значение",
  "number": 123.45,
  "boolean": true,
  "date": "2025-01-15T10:00:00Z"
}
```

**Альтернативный подход (без JSONB):**

```sql
-- Более строгий подход с отдельными колонками
CREATE TABLE field_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_instance_id UUID NOT NULL,
  field_id UUID NOT NULL,

  -- Одна из колонок будет заполнена в зависимости от типа поля
  string_value TEXT,
  number_value NUMERIC,
  boolean_value BOOLEAN,
  date_value TIMESTAMPTZ,

  -- CHECK constraint для валидации
  CONSTRAINT field_value_type_check CHECK (
    (string_value IS NOT NULL)::int +
    (number_value IS NOT NULL)::int +
    (boolean_value IS NOT NULL)::int +
    (date_value IS NOT NULL)::int = 1
  ),

  CONSTRAINT field_value_unique UNIQUE (entity_instance_id, field_id)
);
```

**Рекомендация:** Использовать JSONB подход для максимальной гибкости, но добавить generated columns для производительности.

### 3. Таблица `entityRelation` (many-to-many)

```sql
CREATE TABLE entity_relation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь определяется через field с типом manyToMany
  source_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  target_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,

  -- Поле, которое определяет эту связь
  relation_field_id UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,

  -- Обратное поле (для двунаправленных связей)
  reverse_field_id UUID REFERENCES field(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность: одна связь между двумя экземплярами через одно поле
  CONSTRAINT entity_relation_unique
    UNIQUE (source_instance_id, target_instance_id, relation_field_id),

  -- Проверка: нельзя связать экземпляр с самим собой
  CONSTRAINT entity_relation_no_self_reference
    CHECK (source_instance_id != target_instance_id)
);

-- Индексы
CREATE INDEX idx_entity_relation_source_instance_id
  ON entity_relation(source_instance_id);
CREATE INDEX idx_entity_relation_target_instance_id
  ON entity_relation(target_instance_id);
CREATE INDEX idx_entity_relation_relation_field_id
  ON entity_relation(relation_field_id);
CREATE INDEX idx_entity_relation_reverse_field_id
  ON entity_relation(reverse_field_id) WHERE reverse_field_id IS NOT NULL;

-- Композитный индекс для быстрого поиска связей
CREATE INDEX idx_entity_relation_source_field
  ON entity_relation(source_instance_id, relation_field_id);
CREATE INDEX idx_entity_relation_target_field
  ON entity_relation(target_instance_id, reverse_field_id)
  WHERE reverse_field_id IS NOT NULL;
```

**Пример использования:**

- Blocks (id: block1) имеет поле `tags` (field_id: tags_field_id)
- Tags (id: tag1, tag2) связаны с block1
- В `entityRelation`:
  - `source_instance_id = block1`, `target_instance_id = tag1`, `relation_field_id = tags_field_id`
  - `source_instance_id = block1`, `target_instance_id = tag2`, `relation_field_id = tags_field_id`

## 🔄 Сценарии использования

### Сценарий 1: Создание блока (Block)

**Входные данные:**

```typescript
{
  name: "My Block",
  body: "Block content",
  tags: [tagId1, tagId2] // массив ID тегов
}
```

**Процесс:**

1. Создать запись в `entityInstance`:

   ```sql
   INSERT INTO entity_instance (entity_definition_id, project_id)
   VALUES ('blocks-definition-id', 'project-id')
   RETURNING id; -- instance_id
   ```

2. Создать записи в `fieldValue`:

   ```sql
   -- name field
   INSERT INTO field_value (entity_instance_id, field_id, value)
   VALUES (instance_id, 'name-field-id', '{"type": "string", "string": "My Block"}');

   -- body field
   INSERT INTO field_value (entity_instance_id, field_id, value)
   VALUES (instance_id, 'body-field-id', '{"type": "string", "string": "Block content"}');
   ```

3. Создать связи в `entityRelation`:
   ```sql
   -- Для каждого tagId
   INSERT INTO entity_relation (source_instance_id, target_instance_id, relation_field_id, reverse_field_id)
   VALUES
     (instance_id, tagId1, 'tags-field-id', 'blocks-field-id'),
     (instance_id, tagId2, 'tags-field-id', 'blocks-field-id');
   ```

### Сценарий 2: Получение списка блоков с тегами

**Запрос:**

```sql
-- 1. Получаем все блоки
WITH blocks AS (
  SELECT ei.id, ei.entity_definition_id, ei.created_at
  FROM entity_instance ei
  WHERE ei.entity_definition_id = 'blocks-definition-id'
    AND ei.project_id = 'project-id'
),
-- 2. Получаем значения полей
block_fields AS (
  SELECT
    b.id as block_id,
    f.name as field_name,
    fv.value
  FROM blocks b
  JOIN field_value fv ON fv.entity_instance_id = b.id
  JOIN field f ON f.id = fv.field_id
  WHERE f.name IN ('name', 'body')
),
-- 3. Получаем теги
block_tags AS (
  SELECT
    er.source_instance_id as block_id,
    er.target_instance_id as tag_id,
    tag_fields.field_name,
    tag_fields.value
  FROM entity_relation er
  JOIN blocks b ON b.id = er.source_instance_id
  JOIN field_value tag_fields ON tag_fields.entity_instance_id = er.target_instance_id
  JOIN field tag_field ON tag_field.id = tag_fields.field_id
  WHERE er.relation_field_id = 'tags-field-id'
    AND tag_field.name IN ('name', 'color')
)
-- 4. Агрегируем данные
SELECT
  b.id,
  b.created_at,
  -- Поля блока
  MAX(CASE WHEN bf.field_name = 'name' THEN bf.value->>'string' END) as name,
  MAX(CASE WHEN bf.field_name = 'body' THEN bf.value->>'string' END) as body,
  -- Теги (JSON массив)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', bt.tag_id,
        'name', MAX(CASE WHEN bt.field_name = 'name' THEN bt.value->>'string' END),
        'color', MAX(CASE WHEN bt.field_name = 'color' THEN bt.value->>'string' END)
      )
    ) FILTER (WHERE bt.tag_id IS NOT NULL),
    '[]'::json
  ) as tags
FROM blocks b
LEFT JOIN block_fields bf ON bf.block_id = b.id
LEFT JOIN block_tags bt ON bt.block_id = b.id
GROUP BY b.id, b.created_at
ORDER BY b.created_at DESC;
```

**Оптимизированный вариант с использованием функций:**

```sql
-- Создаем функцию для получения экземпляра с полями
CREATE OR REPLACE FUNCTION get_entity_instance_with_fields(
  p_instance_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ei.id,
    'entity_definition_id', ei.entity_definition_id,
    'created_at', ei.created_at,
    'fields', jsonb_object_agg(
      f.name,
      fv.value
    )
  )
  INTO result
  FROM entity_instance ei
  JOIN field_value fv ON fv.entity_instance_id = ei.id
  JOIN field f ON f.id = fv.field_id
  WHERE ei.id = p_instance_id
  GROUP BY ei.id, ei.entity_definition_id, ei.created_at;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Сценарий 3: Обновление блока

**Входные данные:**

```typescript
{
  name: "Updated Block",
  body: "Updated content",
  tags: [tagId1, tagId3] // изменили теги
}
```

**Процесс:**

1. Обновить `entityInstance.updated_at`:

   ```sql
   UPDATE entity_instance
   SET updated_at = NOW()
   WHERE id = instance_id;
   ```

2. Обновить `fieldValue`:

   ```sql
   -- name
   UPDATE field_value
   SET value = '{"type": "string", "string": "Updated Block"}',
       updated_at = NOW()
   WHERE entity_instance_id = instance_id
     AND field_id = 'name-field-id';

   -- body
   UPDATE field_value
   SET value = '{"type": "string", "string": "Updated content"}',
       updated_at = NOW()
   WHERE entity_instance_id = instance_id
     AND field_id = 'body-field-id';
   ```

3. Обновить связи (удалить старые, создать новые):

   ```sql
   -- Удалить все старые связи
   DELETE FROM entity_relation
   WHERE source_instance_id = instance_id
     AND relation_field_id = 'tags-field-id';

   -- Создать новые связи
   INSERT INTO entity_relation (source_instance_id, target_instance_id, relation_field_id, reverse_field_id)
   VALUES
     (instance_id, tagId1, 'tags-field-id', 'blocks-field-id'),
     (instance_id, tagId3, 'tags-field-id', 'blocks-field-id');
   ```

## 🎨 API и сервисный слой

### Типы TypeScript

```typescript
// lib/universal-entity/types.ts

export interface EntityInstance {
  id: string;
  entityDefinitionId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldValue {
  id: string;
  entityInstanceId: string;
  fieldId: string;
  value: {
    type: "string" | "number" | "boolean" | "date";
    string?: string;
    number?: number;
    boolean?: boolean;
    date?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EntityRelation {
  id: string;
  sourceInstanceId: string;
  targetInstanceId: string;
  relationFieldId: string;
  reverseFieldId?: string;
  createdAt: string;
}

// Расширенный тип для работы с экземпляром
export interface EntityInstanceWithFields extends EntityInstance {
  fields: Record<string, FieldValue["value"]>;
  relations?: Record<string, EntityInstanceWithFields[]>;
}
```

### Сервис для работы с экземплярами

```typescript
// lib/universal-entity/service.ts

import { createClient } from "@/lib/supabase/server";
import type {
  EntityInstance,
  FieldValue,
  EntityInstanceWithFields,
} from "./types";
import { entitiesDefinitions } from "@/entity-lib/data/entities";
import { fields } from "@/entity-lib/data/fields";

export class UniversalEntityService {
  /**
   * Создание экземпляра сущности
   */
  async createInstance(
    entityDefinitionId: string,
    projectId: string,
    fieldValues: Record<string, any>,
    relations?: Record<string, string[]> // fieldName -> [instanceIds]
  ): Promise<EntityInstanceWithFields> {
    const supabase = await createClient();

    // 1. Создаем экземпляр
    const { data: instance, error: instanceError } = await supabase
      .from("entity_instance")
      .insert({
        entity_definition_id: entityDefinitionId,
        project_id: projectId,
      })
      .select()
      .single();

    if (instanceError) throw instanceError;

    // 2. Создаем значения полей
    const fieldValueInserts = Object.entries(fieldValues).map(
      ([fieldName, value]) => {
        const field = fields.find(
          (f) =>
            f.name === fieldName && f.entityDefinitionId === entityDefinitionId
        );
        if (!field) throw new Error(`Field ${fieldName} not found`);

        return {
          entity_instance_id: instance.id,
          field_id: field.id,
          value: this.serializeValue(field.dbType, value),
        };
      }
    );

    const { error: fieldsError } = await supabase
      .from("field_value")
      .insert(fieldValueInserts);

    if (fieldsError) throw fieldsError;

    // 3. Создаем связи
    if (relations) {
      await this.createRelations(instance.id, entityDefinitionId, relations);
    }

    // 4. Возвращаем полный объект
    return this.getInstanceWithFields(instance.id);
  }

  /**
   * Получение экземпляра с полями и связями
   */
  async getInstanceWithFields(
    instanceId: string,
    includeRelations?: string[] // field names для загрузки связей
  ): Promise<EntityInstanceWithFields> {
    const supabase = await createClient();

    // 1. Получаем экземпляр
    const { data: instance, error: instanceError } = await supabase
      .from("entity_instance")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instanceError) throw instanceError;

    // 2. Получаем значения полей
    const { data: fieldValues, error: fieldsError } = await supabase
      .from("field_value")
      .select("*, field:field(*)")
      .eq("entity_instance_id", instanceId);

    if (fieldsError) throw fieldsError;

    // 3. Формируем объект fields
    const fields: Record<string, any> = {};
    fieldValues?.forEach((fv) => {
      const fieldName = (fv.field as any).name;
      fields[fieldName] = this.deserializeValue(fv.value);
    });

    // 4. Загружаем связи если нужно
    const relations: Record<string, EntityInstanceWithFields[]> = {};
    if (includeRelations && includeRelations.length > 0) {
      for (const relationFieldName of includeRelations) {
        const relationField = fields.find(
          (f) => f.name === relationFieldName && f.dbType === "manyToMany"
        );
        if (relationField) {
          relations[relationFieldName] = await this.getRelatedInstances(
            instanceId,
            relationField.id
          );
        }
      }
    }

    return {
      ...instance,
      fields,
      relations,
    };
  }

  /**
   * Получение списка экземпляров
   */
  async getInstances(
    entityDefinitionId: string,
    projectId: string,
    options?: {
      includeRelations?: string[];
      filters?: Record<string, any>;
      limit?: number;
      offset?: number;
    }
  ): Promise<EntityInstanceWithFields[]> {
    const supabase = await createClient();

    // 1. Получаем экземпляры
    let query = supabase
      .from("entity_instance")
      .select("*")
      .eq("entity_definition_id", entityDefinitionId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data: instances, error } = await query;
    if (error) throw error;

    // 2. Для каждого экземпляра загружаем поля и связи
    const result = await Promise.all(
      instances.map((instance) =>
        this.getInstanceWithFields(instance.id, options?.includeRelations)
      )
    );

    return result;
  }

  /**
   * Обновление экземпляра
   */
  async updateInstance(
    instanceId: string,
    fieldValues: Record<string, any>,
    relations?: Record<string, string[]>
  ): Promise<EntityInstanceWithFields> {
    const supabase = await createClient();

    // 1. Обновляем updated_at
    await supabase
      .from("entity_instance")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", instanceId);

    // 2. Обновляем значения полей
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      // Получаем field_id
      const { data: instance } = await supabase
        .from("entity_instance")
        .select("entity_definition_id")
        .eq("id", instanceId)
        .single();

      const field = fields.find(
        (f) =>
          f.name === fieldName &&
          f.entityDefinitionId === instance.entity_definition_id
      );
      if (!field) continue;

      // Upsert field value
      await supabase.from("field_value").upsert({
        entity_instance_id: instanceId,
        field_id: field.id,
        value: this.serializeValue(field.dbType, value),
        updated_at: new Date().toISOString(),
      });
    }

    // 3. Обновляем связи
    if (relations) {
      await this.updateRelations(instanceId, relations);
    }

    return this.getInstanceWithFields(instanceId);
  }

  /**
   * Создание связей
   */
  private async createRelations(
    sourceInstanceId: string,
    entityDefinitionId: string,
    relations: Record<string, string[]>
  ): Promise<void> {
    const supabase = await createClient();

    const relationInserts: any[] = [];

    for (const [fieldName, targetInstanceIds] of Object.entries(relations)) {
      const field = fields.find(
        (f) =>
          f.name === fieldName && f.entityDefinitionId === entityDefinitionId
      );
      if (!field || field.dbType !== "manyToMany") continue;

      const reverseField = field.relationFieldId
        ? fields.find((f) => f.id === field.relationFieldId)
        : null;

      for (const targetInstanceId of targetInstanceIds) {
        relationInserts.push({
          source_instance_id: sourceInstanceId,
          target_instance_id: targetInstanceId,
          relation_field_id: field.id,
          reverse_field_id: reverseField?.id || null,
        });
      }
    }

    if (relationInserts.length > 0) {
      await supabase.from("entity_relation").insert(relationInserts);
    }
  }

  /**
   * Обновление связей (удаление старых + создание новых)
   */
  private async updateRelations(
    sourceInstanceId: string,
    relations: Record<string, string[]>
  ): Promise<void> {
    const supabase = await createClient();

    // Получаем entity_definition_id для определения полей
    const { data: instance } = await supabase
      .from("entity_instance")
      .select("entity_definition_id")
      .eq("id", sourceInstanceId)
      .single();

    // Удаляем старые связи для указанных полей
    const fieldIds = Object.keys(relations)
      .map((fieldName) => {
        const field = fields.find(
          (f) =>
            f.name === fieldName &&
            f.entityDefinitionId === instance.entity_definition_id
        );
        return field?.id;
      })
      .filter(Boolean);

    if (fieldIds.length > 0) {
      await supabase
        .from("entity_relation")
        .delete()
        .eq("source_instance_id", sourceInstanceId)
        .in("relation_field_id", fieldIds);
    }

    // Создаем новые связи
    await this.createRelations(
      sourceInstanceId,
      instance.entity_definition_id,
      relations
    );
  }

  /**
   * Получение связанных экземпляров
   */
  private async getRelatedInstances(
    sourceInstanceId: string,
    relationFieldId: string
  ): Promise<EntityInstanceWithFields[]> {
    const supabase = await createClient();

    // Получаем ID связанных экземпляров
    const { data: relations, error } = await supabase
      .from("entity_relation")
      .select("target_instance_id")
      .eq("source_instance_id", sourceInstanceId)
      .eq("relation_field_id", relationFieldId);

    if (error) throw error;

    const targetInstanceIds = relations.map((r) => r.target_instance_id);

    if (targetInstanceIds.length === 0) return [];

    // Загружаем экземпляры с полями
    return Promise.all(
      targetInstanceIds.map((id) => this.getInstanceWithFields(id))
    );
  }

  /**
   * Сериализация значения в JSONB формат
   */
  private serializeValue(dbType: string, value: any): any {
    switch (dbType) {
      case "varchar":
        return { type: "string", string: String(value) };
      case "float":
        return { type: "number", number: Number(value) };
      case "boolean":
        return { type: "boolean", boolean: Boolean(value) };
      case "timestamptz":
        return { type: "date", date: new Date(value).toISOString() };
      default:
        return { type: "string", string: String(value) };
    }
  }

  /**
   * Десериализация значения из JSONB
   */
  private deserializeValue(value: any): any {
    if (!value || typeof value !== "object") return value;

    switch (value.type) {
      case "string":
        return value.string;
      case "number":
        return value.number;
      case "boolean":
        return value.boolean;
      case "date":
        return value.date;
      default:
        return value;
    }
  }
}

export const universalEntityService = new UniversalEntityService();
```

## ⚠️ Проблемы и решения

### Проблема 1: Производительность запросов

**Проблема:** JOIN'ы между `entityInstance`, `fieldValue` и `entityRelation` могут быть медленными при большом количестве данных.

**Решения:**

1. **Индексы**: Все внешние ключи должны быть проиндексированы
2. **Материализованные представления**: Для часто запрашиваемых данных
3. **Кэширование**: Redis для списков и часто запрашиваемых экземпляров
4. **Пагинация**: Всегда использовать LIMIT/OFFSET
5. **Партиционирование**: По `project_id` или `entity_definition_id`

### Проблема 2: Сложность запросов

**Проблема:** Запросы становятся сложными из-за множества JOIN'ов.

**Решения:**

1. **Функции PostgreSQL**: Создать функции для типичных операций
2. **Представления (Views)**: Создать views для каждого типа сущности
3. **Триггеры**: Автоматическое обновление denormalized данных

### Проблема 3: Валидация данных

**Проблема:** Нет строгой типизации на уровне БД.

**Решения:**

1. **CHECK constraints**: Валидация JSONB структуры
2. **Триггеры**: Валидация перед вставкой/обновлением
3. **Функции валидации**: На уровне приложения

### Проблема 4: Миграция существующих данных

**Проблема:** Нужно мигрировать данные из старых таблиц.

**Решения:**

1. **Постепенная миграция**: Поддержка обеих систем параллельно
2. **Скрипт миграции**: Автоматический перенос данных
3. **Валидация**: Проверка целостности после миграции

## 🔄 Альтернативные подходы

### Вариант 1: EAV (Entity-Attribute-Value) с оптимизацией

Текущий подход - это EAV паттерн. Можно оптимизировать:

- Использовать generated columns для типизированных значений
- Создать отдельные таблицы для каждого типа данных (field_value_string, field_value_number и т.д.)

### Вариант 2: JSONB документы

Хранить весь экземпляр как JSONB документ:

```sql
CREATE TABLE entity_instance (
  id UUID PRIMARY KEY,
  entity_definition_id UUID NOT NULL,
  project_id UUID NOT NULL,
  data JSONB NOT NULL, -- все поля здесь
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIN индекс для поиска
CREATE INDEX idx_entity_instance_data_gin ON entity_instance USING GIN (data);
```

**Плюсы:**

- Проще запросы
- Быстрее чтение одного экземпляра
- Гибкость

**Минусы:**

- Сложнее фильтрация
- Нет нормализации
- Сложнее связи many-to-many

### Вариант 3: Гибридный подход

Комбинация:

- Основные поля (name, created_at) в `entityInstance`
- Дополнительные поля в `fieldValue`
- Связи в `entityRelation`

## 📊 Сравнение подходов

| Критерий           | Текущий (отдельные таблицы) | EAV (fieldValue) | JSONB документы  | Гибридный  |
| ------------------ | --------------------------- | ---------------- | ---------------- | ---------- |
| Гибкость           | ❌ Нужна миграция           | ✅ Высокая       | ✅ Очень высокая | ✅ Средняя |
| Производительность | ✅ Отличная                 | ⚠️ Средняя       | ⚠️ Средняя       | ✅ Хорошая |
| Сложность запросов | ✅ Простые                  | ❌ Сложные       | ⚠️ Средние       | ⚠️ Средние |
| Типизация          | ✅ Строгая                  | ⚠️ Слабая        | ❌ Нет           | ✅ Строгая |
| Масштабируемость   | ❌ Низкая                   | ✅ Высокая       | ✅ Высокая       | ✅ Высокая |

## 🎯 Рекомендации

### Рекомендуемый подход: **EAV с оптимизацией**

1. **Использовать JSONB** для хранения значений с generated columns для производительности
2. **Создать функции PostgreSQL** для типичных операций
3. **Добавить кэширование** на уровне приложения
4. **Использовать партиционирование** по project_id для больших проектов
5. **Создать views** для каждого типа сущности для упрощения запросов

### План внедрения

1. **Фаза 1: Создание таблиц**

   - Создать `entityInstance`, `fieldValue`, `entityRelation`
   - Настроить индексы и RLS
   - Создать функции PostgreSQL

2. **Фаза 2: Сервисный слой**

   - Реализовать `UniversalEntityService`
   - Создать типы TypeScript
   - Написать тесты

3. **Фаза 3: Миграция данных**

   - Мигрировать Blocks и Tags
   - Валидация данных
   - Тестирование

4. **Фаза 4: UI слой**

   - Динамическая генерация страниц
   - Универсальные формы
   - Универсальные списки

5. **Фаза 5: Оптимизация**
   - Профилирование запросов
   - Добавление кэширования
   - Оптимизация индексов

## 📝 Следующие шаги

1. Обсудить и утвердить архитектуру
2. Создать SQL миграцию для таблиц
3. Реализовать сервисный слой
4. Написать тесты
5. Мигрировать существующие данные
6. Обновить UI для работы с новой системой
