-- =====================================================
-- Миграция: Универсальная система сущностей
-- =====================================================
-- Дата: 2025-01-XX
-- Описание: Создание таблиц для универсальной системы
--           entityInstance, fieldValue, entityRelation
-- =====================================================

-- =====================================================
-- 1. Таблица entityInstance
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT entity_instance_entity_definition_fk 
    FOREIGN KEY (entity_definition_id) 
    REFERENCES entity_definition(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_entity_instance_entity_definition_id 
  ON entity_instance(entity_definition_id);
CREATE INDEX IF NOT EXISTS idx_entity_instance_project_id 
  ON entity_instance(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_instance_created_at 
  ON entity_instance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_instance_project_definition 
  ON entity_instance(project_id, entity_definition_id);

-- =====================================================
-- 2. Таблица fieldValue
-- =====================================================

CREATE TABLE IF NOT EXISTS field_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,
  
  -- Универсальное хранение значений в JSONB
  value JSONB NOT NULL,
  
  -- Generated columns для производительности (опционально)
  string_value TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN value->>'type' = 'string' THEN value->>'string'
      ELSE NULL
    END
  ) STORED,
  
  number_value NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN value->>'type' = 'number' THEN (value->>'number')::numeric
      ELSE NULL
    END
  ) STORED,
  
  boolean_value BOOLEAN GENERATED ALWAYS AS (
    CASE 
      WHEN value->>'type' = 'boolean' THEN (value->>'boolean')::boolean
      ELSE NULL
    END
  ) STORED,
  
  date_value TIMESTAMPTZ GENERATED ALWAYS AS (
    CASE 
      WHEN value->>'type' = 'date' THEN (value->>'date')::timestamptz
      ELSE NULL
    END
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один field на один instance
  CONSTRAINT field_value_unique 
    UNIQUE (entity_instance_id, field_id),
  
  -- Валидация структуры JSONB
  CONSTRAINT field_value_jsonb_check 
    CHECK (
      value ? 'type' AND
      value->>'type' IN ('string', 'number', 'boolean', 'date')
    )
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_field_value_entity_instance_id 
  ON field_value(entity_instance_id);
CREATE INDEX IF NOT EXISTS idx_field_value_field_id 
  ON field_value(field_id);
CREATE INDEX IF NOT EXISTS idx_field_value_string_value 
  ON field_value(string_value) WHERE string_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_value_number_value 
  ON field_value(number_value) WHERE number_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_value_boolean_value 
  ON field_value(boolean_value) WHERE boolean_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_value_date_value 
  ON field_value(date_value) WHERE date_value IS NOT NULL;

-- GIN индекс для JSONB поиска
CREATE INDEX IF NOT EXISTS idx_field_value_value_gin 
  ON field_value USING GIN (value);

-- Композитный индекс для быстрого поиска полей экземпляра
CREATE INDEX IF NOT EXISTS idx_field_value_instance_field 
  ON field_value(entity_instance_id, field_id);

-- =====================================================
-- 3. Таблица entityRelation (many-to-many)
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_relation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связь между экземплярами
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
CREATE INDEX IF NOT EXISTS idx_entity_relation_source_instance_id 
  ON entity_relation(source_instance_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_target_instance_id 
  ON entity_relation(target_instance_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_relation_field_id 
  ON entity_relation(relation_field_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_reverse_field_id 
  ON entity_relation(reverse_field_id) WHERE reverse_field_id IS NOT NULL;

-- Композитные индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_entity_relation_source_field 
  ON entity_relation(source_instance_id, relation_field_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_target_reverse 
  ON entity_relation(target_instance_id, reverse_field_id) 
  WHERE reverse_field_id IS NOT NULL;

-- =====================================================
-- 4. Триггеры для updated_at
-- =====================================================

-- Функция обновления updated_at (если еще не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры
CREATE TRIGGER update_entity_instance_updated_at
  BEFORE UPDATE ON entity_instance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_value_updated_at
  BEFORE UPDATE ON field_value
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. Триггеры валидации
-- =====================================================

-- Валидация типов связей
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
  IF expected_target_def IS NOT NULL AND target_entity_def != expected_target_def THEN
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

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Включаем RLS
ALTER TABLE entity_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_value ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relation ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Политики для entity_instance
-- =====================================================

-- Чтение: доступно всем (или по проектам)
CREATE POLICY "Anyone can view entity instances"
  ON entity_instance FOR SELECT
  USING (true);

-- Создание: только админы
CREATE POLICY "Admins can create entity instances"
  ON entity_instance FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- Обновление: только админы
CREATE POLICY "Admins can update entity instances"
  ON entity_instance FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete entity instances"
  ON entity_instance FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- =====================================================
-- Политики для field_value
-- =====================================================

-- Чтение: доступно всем
CREATE POLICY "Anyone can view field values"
  ON field_value FOR SELECT
  USING (true);

-- Создание: только админы
CREATE POLICY "Admins can create field values"
  ON field_value FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- Обновление: только админы
CREATE POLICY "Admins can update field values"
  ON field_value FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete field values"
  ON field_value FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- =====================================================
-- Политики для entity_relation
-- =====================================================

-- Чтение: доступно всем
CREATE POLICY "Anyone can view entity relations"
  ON entity_relation FOR SELECT
  USING (true);

-- Создание: только админы
CREATE POLICY "Admins can create entity relations"
  ON entity_relation FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete entity relations"
  ON entity_relation FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM admins WHERE role IN ('admin', 'superAdmin')
    )
  );

-- =====================================================
-- 7. Вспомогательные функции
-- =====================================================

-- Функция для получения экземпляра с полями
CREATE OR REPLACE FUNCTION get_entity_instance_with_fields(
  p_instance_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
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
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения связанных экземпляров
CREATE OR REPLACE FUNCTION get_related_instances(
  p_source_instance_id UUID,
  p_relation_field_id UUID
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
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
    WHERE er.source_instance_id = p_source_instance_id
      AND er.relation_field_id = p_relation_field_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. Проверка создания таблиц
-- =====================================================

SELECT 'Migration completed successfully!' AS status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('entity_instance', 'field_value', 'entity_relation')
ORDER BY table_name;

-- =====================================================
-- Конец миграции
-- =====================================================

