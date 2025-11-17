# Глубокий разбор системы связей (Entity Relations)

## 🔗 Проблема: Двунаправленные связи many-to-many

### Текущая ситуация

В вашей конфигурации:

- **Blocks** имеет поле `tags` (manyToMany) → связывается с Tags
- **Tags** имеет поле `blocks` (manyToMany) → связывается с Blocks

Это **обратные поля** (`relationFieldId` указывает друг на друга):

- `tags` поле в Blocks: `relationFieldId = "d2256c14-8531-4513-b5ea-20b5ae1f7fd3"` (blocks поле в Tags)
- `blocks` поле в Tags: `relationFieldId = "88f76ee8-d4f3-43b0-a396-0f3afa5322a5"` (tags поле в Blocks)

### Вопрос: Нужны ли две записи в entityRelation?

**Вариант 1: Одна запись с reverse_field_id**

```sql
-- Когда создаем блок с тегами
INSERT INTO entity_relation (
  source_instance_id,  -- block_id
  target_instance_id,   -- tag_id
  relation_field_id,    -- tags field id (в Blocks)
  reverse_field_id      -- blocks field id (в Tags)
) VALUES (
  'block-1',
  'tag-1',
  'tags-field-id',
  'blocks-field-id'
);
```

**Запрос тегов для блока:**

```sql
SELECT target_instance_id
FROM entity_relation
WHERE source_instance_id = 'block-1'
  AND relation_field_id = 'tags-field-id';
```

**Запрос блоков для тега:**

```sql
SELECT source_instance_id
FROM entity_relation
WHERE target_instance_id = 'tag-1'
  AND reverse_field_id = 'blocks-field-id';
```

**Плюсы:**

- ✅ Одна запись на связь
- ✅ Нет дублирования
- ✅ Легко обновлять

**Минусы:**

- ⚠️ Нужны два индекса для эффективного поиска в обе стороны
- ⚠️ Запросы немного сложнее

**Вариант 2: Две записи (симметричные)**

```sql
-- При создании связи создаем две записи
INSERT INTO entity_relation (
  source_instance_id,
  target_instance_id,
  relation_field_id,
  reverse_field_id
) VALUES
  -- Запись 1: блок -> тег
  ('block-1', 'tag-1', 'tags-field-id', 'blocks-field-id'),
  -- Запись 2: тег -> блок (обратная)
  ('tag-1', 'block-1', 'blocks-field-id', 'tags-field-id');
```

**Запрос тегов для блока:**

```sql
SELECT target_instance_id
FROM entity_relation
WHERE source_instance_id = 'block-1'
  AND relation_field_id = 'tags-field-id';
```

**Запрос блоков для тега:**

```sql
SELECT target_instance_id
FROM entity_relation
WHERE target_instance_id = 'tag-1'
  AND relation_field_id = 'blocks-field-id';
```

**Плюсы:**

- ✅ Простые запросы (всегда ищем по source)
- ✅ Симметричная структура
- ✅ Легче понять

**Минусы:**

- ❌ Дублирование данных (2 записи на связь)
- ❌ Нужно синхронизировать при обновлении
- ❌ Больше места в БД

### 🎯 Рекомендация: Вариант 1 (одна запись)

**Почему:**

1. Меньше данных = быстрее запросы
2. Нет проблем с синхронизацией
3. Индексы решают проблему производительности

**Оптимизация запросов:**

```sql
-- Индекс для поиска в прямом направлении
CREATE INDEX idx_entity_relation_source_field
  ON entity_relation(source_instance_id, relation_field_id);

-- Индекс для поиска в обратном направлении
CREATE INDEX idx_entity_relation_target_reverse
  ON entity_relation(target_instance_id, reverse_field_id)
  WHERE reverse_field_id IS NOT NULL;
```

## 🔄 Сценарии работы с relations

### Сценарий 1: Создание блока с тегами

**Входные данные:**

```typescript
{
  name: "My Block",
  body: "Content",
  tags: ["tag-id-1", "tag-id-2"]
}
```

**Процесс:**

```typescript
// 1. Создаем instance
const instance = await createInstance("blocks-def-id", "project-id", {
  name: "My Block",
  body: "Content",
});

// 2. Создаем relations
await createRelations(instance.id, {
  tags: ["tag-id-1", "tag-id-2"],
});
```

**SQL:**

```sql
-- Создаем связи
INSERT INTO entity_relation (
  source_instance_id,
  target_instance_id,
  relation_field_id,
  reverse_field_id
)
SELECT
  'block-instance-id',
  unnest(ARRAY['tag-id-1', 'tag-id-2']::UUID[]),
  'tags-field-id',
  'blocks-field-id';
```

### Сценарий 2: Обновление тегов блока

**Входные данные:**

```typescript
{
  tags: ["tag-id-2", "tag-id-3"]; // изменили: убрали tag-id-1, добавили tag-id-3
}
```

**Процесс:**

```typescript
// 1. Удаляем все старые связи для поля tags
await deleteRelations(instanceId, "tags-field-id");

// 2. Создаем новые связи
await createRelations(instanceId, {
  tags: ["tag-id-2", "tag-id-3"],
});
```

**SQL:**

```sql
-- Удаляем старые связи
DELETE FROM entity_relation
WHERE source_instance_id = 'block-instance-id'
  AND relation_field_id = 'tags-field-id';

-- Создаем новые связи
INSERT INTO entity_relation (...)
VALUES
  ('block-instance-id', 'tag-id-2', 'tags-field-id', 'blocks-field-id'),
  ('block-instance-id', 'tag-id-3', 'tags-field-id', 'blocks-field-id');
```

### Сценарий 3: Получение блока с тегами

**Запрос:**

```typescript
const block = await getInstanceWithFields(blockId, ['tags']);
// Результат:
{
  id: "block-id",
  fields: {
    name: "My Block",
    body: "Content"
  },
  relations: {
    tags: [
      { id: "tag-id-1", fields: { name: "Tag 1", color: "red" } },
      { id: "tag-id-2", fields: { name: "Tag 2", color: "blue" } }
    ]
  }
}
```

**SQL (оптимизированный):**

```sql
-- 1. Получаем блок с полями
WITH block_data AS (
  SELECT
    ei.id,
    ei.entity_definition_id,
    jsonb_object_agg(f.name, fv.value) as fields
  FROM entity_instance ei
  JOIN field_value fv ON fv.entity_instance_id = ei.id
  JOIN field f ON f.id = fv.field_id
  WHERE ei.id = 'block-id'
  GROUP BY ei.id, ei.entity_definition_id
),
-- 2. Получаем связанные теги
block_tags AS (
  SELECT
    er.target_instance_id as tag_id,
    jsonb_object_agg(f.name, fv.value) as fields
  FROM entity_relation er
  JOIN block_data bd ON bd.id = er.source_instance_id
  JOIN field_value fv ON fv.entity_instance_id = er.target_instance_id
  JOIN field f ON f.id = fv.field_id
  WHERE er.relation_field_id = 'tags-field-id'
  GROUP BY er.target_instance_id
)
-- 3. Объединяем
SELECT
  bd.id,
  bd.fields,
  jsonb_agg(
    jsonb_build_object(
      'id', bt.tag_id,
      'fields', bt.fields
    )
  ) as tags
FROM block_data bd
LEFT JOIN block_tags bt ON true
GROUP BY bd.id, bd.fields;
```

## 🚨 Проблемы и решения

### Проблема 1: Производительность при большом количестве связей

**Проблема:** Если у блока 1000 тегов, запрос будет медленным.

**Решение 1: Пагинация связей**

```typescript
async getInstanceWithFields(
  instanceId: string,
  includeRelations?: string[],
  relationLimit?: number // лимит для каждой связи
): Promise<EntityInstanceWithFields>
```

**Решение 2: Ленивая загрузка**

```typescript
// Загружаем связи только при необходимости
const block = await getInstance(blockId);
const tags = await getRelatedInstances(blockId, "tags-field-id", { limit: 50 });
```

**Решение 3: Денормализация**

```sql
-- Добавить колонку для кэширования количества связей
ALTER TABLE entity_instance
ADD COLUMN tags_count INTEGER DEFAULT 0;

-- Обновлять через триггер
CREATE TRIGGER update_tags_count
AFTER INSERT OR DELETE ON entity_relation
FOR EACH ROW
WHEN (relation_field_id = 'tags-field-id')
EXECUTE FUNCTION update_relation_count();
```

### Проблема 2: Циклические зависимости

**Проблема:** Что если блок A связан с блоком B, а блок B связан с блоком A?

**Решение:** Проверка в constraint или триггере

```sql
-- Предотвращаем циклические связи для same entity type
CREATE OR REPLACE FUNCTION check_cyclic_relation()
RETURNS TRIGGER AS $$
DECLARE
  source_entity_def UUID;
  target_entity_def UUID;
BEGIN
  SELECT entity_definition_id INTO source_entity_def
  FROM entity_instance WHERE id = NEW.source_instance_id;

  SELECT entity_definition_id INTO target_entity_def
  FROM entity_instance WHERE id = NEW.target_instance_id;

  -- Если это связь между экземплярами одного типа
  IF source_entity_def = target_entity_def THEN
    -- Проверяем на циклы (можно упростить для начала)
    -- TODO: реализовать проверку циклов
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_cyclic_relations
BEFORE INSERT ON entity_relation
FOR EACH ROW
EXECUTE FUNCTION check_cyclic_relation();
```

### Проблема 3: Каскадное удаление

**Проблема:** При удалении блока нужно удалить все его связи.

**Решение:** ON DELETE CASCADE в foreign key

```sql
ALTER TABLE entity_relation
ADD CONSTRAINT entity_relation_source_fk
FOREIGN KEY (source_instance_id)
REFERENCES entity_instance(id)
ON DELETE CASCADE;
```

### Проблема 4: Валидация связей

**Проблема:** Как проверить, что связываемые экземпляры правильного типа?

**Решение:** Триггер валидации

```sql
CREATE OR REPLACE FUNCTION validate_relation_types()
RETURNS TRIGGER AS $$
DECLARE
  source_entity_def UUID;
  target_entity_def UUID;
  expected_target_def UUID;
BEGIN
  -- Получаем entity_definition для source
  SELECT entity_definition_id INTO source_entity_def
  FROM entity_instance WHERE id = NEW.source_instance_id;

  -- Получаем entity_definition для target
  SELECT entity_definition_id INTO target_entity_def
  FROM entity_instance WHERE id = NEW.target_instance_id;

  -- Получаем ожидаемый entity_definition из field
  SELECT related_entity_definition_id INTO expected_target_def
  FROM field WHERE id = NEW.relation_field_id;

  -- Проверяем соответствие
  IF target_entity_def != expected_target_def THEN
    RAISE EXCEPTION 'Target instance type mismatch. Expected %, got %',
      expected_target_def, target_entity_def;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_relation_types_trigger
BEFORE INSERT OR UPDATE ON entity_relation
FOR EACH ROW
EXECUTE FUNCTION validate_relation_types();
```

## 📊 Оптимизация запросов

### Оптимизация 1: Материализованное представление для списков

```sql
CREATE MATERIALIZED VIEW blocks_with_tags AS
SELECT
  ei.id as block_id,
  ei.created_at,
  -- Поля блока
  MAX(CASE WHEN f.name = 'name' THEN fv.value->>'string' END) as name,
  MAX(CASE WHEN f.name = 'body' THEN fv.value->>'string' END) as body,
  -- Теги как JSON массив
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', tag_ei.id,
        'name', MAX(CASE WHEN tag_f.name = 'name' THEN tag_fv.value->>'string' END),
        'color', MAX(CASE WHEN tag_f.name = 'color' THEN tag_fv.value->>'string' END)
      )
    ) FILTER (WHERE tag_ei.id IS NOT NULL),
    '[]'::json
  ) as tags
FROM entity_instance ei
JOIN field_value fv ON fv.entity_instance_id = ei.id
JOIN field f ON f.id = fv.field_id
LEFT JOIN entity_relation er ON er.source_instance_id = ei.id
  AND er.relation_field_id = 'tags-field-id'
LEFT JOIN entity_instance tag_ei ON tag_ei.id = er.target_instance_id
LEFT JOIN field_value tag_fv ON tag_fv.entity_instance_id = tag_ei.id
LEFT JOIN field tag_f ON tag_f.id = tag_fv.field_id
WHERE ei.entity_definition_id = 'blocks-definition-id'
GROUP BY ei.id, ei.created_at;

-- Обновление при изменении данных
CREATE INDEX idx_blocks_with_tags_block_id ON blocks_with_tags(block_id);
```

**Обновление:**

```sql
-- Можно обновлять по расписанию или через триггер
REFRESH MATERIALIZED VIEW CONCURRENTLY blocks_with_tags;
```

### Оптимизация 2: Функция для получения экземпляра с relations

```sql
CREATE OR REPLACE FUNCTION get_entity_instance_full(
  p_instance_id UUID,
  p_include_relations BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  relations JSONB;
BEGIN
  -- Получаем базовую информацию
  SELECT jsonb_build_object(
    'id', ei.id,
    'entityDefinitionId', ei.entity_definition_id,
    'projectId', ei.project_id,
    'createdAt', ei.created_at,
    'updatedAt', ei.updated_at,
    'fields', (
      SELECT jsonb_object_agg(f.name, fv.value)
      FROM field_value fv
      JOIN field f ON f.id = fv.field_id
      WHERE fv.entity_instance_id = ei.id
    )
  )
  INTO result
  FROM entity_instance ei
  WHERE ei.id = p_instance_id;

  -- Если нужно, загружаем связи
  IF p_include_relations THEN
    SELECT jsonb_object_agg(
      f.name,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rel_ei.id,
            'fields', (
              SELECT jsonb_object_agg(rel_f.name, rel_fv.value)
              FROM field_value rel_fv
              JOIN field rel_f ON rel_f.id = rel_fv.field_id
              WHERE rel_fv.entity_instance_id = rel_ei.id
            )
          )
        )
        FROM entity_relation er
        JOIN entity_instance rel_ei ON rel_ei.id = er.target_instance_id
        WHERE er.source_instance_id = p_instance_id
          AND er.relation_field_id = f.id
      )
    )
    INTO relations
    FROM field f
    WHERE f.entity_definition_id = (result->>'entityDefinitionId')::UUID
      AND f.db_type = 'manyToMany';

    result := result || jsonb_build_object('relations', relations);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Использование:**

```sql
SELECT get_entity_instance_full('block-id', true);
```

## 🎯 Итоговые рекомендации

### Для relations:

1. **Использовать одну запись** с `reverse_field_id`
2. **Создать индексы** для обоих направлений поиска
3. **Добавить валидацию** через триггеры
4. **Использовать функции PostgreSQL** для сложных запросов
5. **Рассмотреть материализованные представления** для часто запрашиваемых списков

### Для производительности:

1. **Пагинация** для списков и relations
2. **Ленивая загрузка** relations
3. **Кэширование** на уровне приложения
4. **Партиционирование** по project_id для больших проектов

### Для валидации:

1. **Триггеры** для проверки типов
2. **CHECK constraints** для базовых правил
3. **Валидация на уровне приложения** перед записью
