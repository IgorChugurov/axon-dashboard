-- =====================================================
-- Миграция: Универсальная система сущностей (Финальная)
-- =====================================================
-- Дата: 2025-01-XX
-- Описание: 
--   1. Создание таблиц entity_definition и field (конфигурация)
--   2. Миграция данных из entity-lib/data/ в БД
--   3. Создание таблиц entity_instance и entity_relation
--   4. Настройка индексов, RLS, функций
-- =====================================================

-- =====================================================
-- 1. Таблица entity_definition (конфигурация сущностей)
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_definition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  table_name TEXT NOT NULL, -- для обратной совместимости
  type TEXT NOT NULL CHECK (type IN ('primary', 'secondary', 'tertiary')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Права доступа (разрешения)
  -- Значения: 'ALL' (все, включая неавторизованных), 'User' (только зарегистрированные), 
  -- 'Admin' (только админы), 'Admin|User' (админы и пользователи)
  create_permission TEXT NOT NULL DEFAULT 'Admin' 
    CHECK (create_permission IN ('ALL', 'User', 'Admin', 'Admin|User')),
  read_permission TEXT NOT NULL DEFAULT 'ALL' 
    CHECK (read_permission IN ('ALL', 'User', 'Admin', 'Admin|User')),
  update_permission TEXT NOT NULL DEFAULT 'Admin' 
    CHECK (update_permission IN ('ALL', 'User', 'Admin', 'Admin|User')),
  delete_permission TEXT NOT NULL DEFAULT 'Admin' 
    CHECK (delete_permission IN ('ALL', 'User', 'Admin', 'Admin|User')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT entity_definition_project_name_unique 
    UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_entity_definition_project_id 
  ON entity_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_definition_type 
  ON entity_definition(type);

-- =====================================================
-- 2. Таблица field (конфигурация полей)
-- =====================================================

CREATE TABLE IF NOT EXISTS field (
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
  relation_field_id UUID REFERENCES field(id),
  is_relation_source BOOLEAN DEFAULT false,
  selector_relation_id UUID REFERENCES field(id),
  
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

CREATE INDEX IF NOT EXISTS idx_field_entity_definition_id 
  ON field(entity_definition_id);
CREATE INDEX IF NOT EXISTS idx_field_related_entity_definition_id 
  ON field(related_entity_definition_id) WHERE related_entity_definition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_relation_field_id 
  ON field(relation_field_id) WHERE relation_field_id IS NOT NULL;

-- =====================================================
-- 3. Таблица entity_instance (JSONB подход)
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Все поля хранятся в JSONB
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Партиционирование по project_id (опционально, для больших проектов)
-- Можно включить позже:
-- ALTER TABLE entity_instance PARTITION BY HASH (project_id);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_entity_instance_entity_definition_id 
  ON entity_instance(entity_definition_id);
CREATE INDEX IF NOT EXISTS idx_entity_instance_project_id 
  ON entity_instance(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_instance_created_at 
  ON entity_instance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_instance_project_definition 
  ON entity_instance(project_id, entity_definition_id);

-- GIN индекс для JSONB поиска
CREATE INDEX IF NOT EXISTS idx_entity_instance_data_gin 
  ON entity_instance USING GIN (data);

-- Индексы для популярных полей (примеры, создаются по необходимости)
-- CREATE INDEX IF NOT EXISTS idx_entity_instance_name 
--   ON entity_instance((data->>'name')) 
--   WHERE data ? 'name' AND entity_definition_id = 'blocks-id';
-- CREATE INDEX IF NOT EXISTS idx_entity_instance_title 
--   ON entity_instance((data->>'title')) 
--   WHERE data ? 'title' AND entity_definition_id = 'blocks-id';

-- =====================================================
-- 4. Таблица entity_relation (связи)
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_relation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связь
  source_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  target_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  
  -- Поле, которое определяет связь
  relation_field_id UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,
  
  -- Обратное поле (для двунаправленных связей)
  reverse_field_id UUID REFERENCES field(id) ON DELETE CASCADE,
  
  -- Тип связи
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'manyToMany', 'manyToOne', 'oneToMany', 'oneToOne'
  )),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT entity_relation_unique 
    UNIQUE (source_instance_id, target_instance_id, relation_field_id),
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
CREATE INDEX IF NOT EXISTS idx_entity_relation_source_field 
  ON entity_relation(source_instance_id, relation_field_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_target_reverse 
  ON entity_relation(target_instance_id, reverse_field_id) 
  WHERE reverse_field_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_relation_type 
  ON entity_relation(relation_type);

-- =====================================================
-- 5. Триггеры для updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entity_definition_updated_at
  BEFORE UPDATE ON entity_definition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_updated_at
  BEFORE UPDATE ON field
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_instance_updated_at
  BEFORE UPDATE ON entity_instance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Триггеры валидации
-- =====================================================

-- Валидация типов связей
CREATE OR REPLACE FUNCTION validate_relation_types()
RETURNS TRIGGER AS $$
DECLARE
  source_entity_def UUID;
  target_entity_def UUID;
  expected_target_def UUID;
  field_db_type TEXT;
BEGIN
  -- Получаем entity_definition для source
  SELECT entity_definition_id INTO source_entity_def
  FROM entity_instance WHERE id = NEW.source_instance_id;
  
  -- Получаем entity_definition для target
  SELECT entity_definition_id INTO target_entity_def
  FROM entity_instance WHERE id = NEW.target_instance_id;
  
  -- Получаем ожидаемый entity_definition и db_type из field
  SELECT related_entity_definition_id, db_type 
  INTO expected_target_def, field_db_type
  FROM field WHERE id = NEW.relation_field_id;
  
  -- Проверяем соответствие
  IF expected_target_def IS NOT NULL AND target_entity_def != expected_target_def THEN
    RAISE EXCEPTION 'Target instance type mismatch. Expected %, got %', 
      expected_target_def, target_entity_def;
  END IF;
  
  -- Проверяем тип связи
  IF NEW.relation_type != field_db_type THEN
    RAISE EXCEPTION 'Relation type mismatch. Field type: %, relation type: %', 
      field_db_type, NEW.relation_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_relation_types_trigger
  BEFORE INSERT OR UPDATE ON entity_relation
  FOR EACH ROW
  EXECUTE FUNCTION validate_relation_types();

-- =====================================================
-- 7. Row Level Security (RLS)
-- =====================================================

ALTER TABLE entity_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE field ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relation ENABLE ROW LEVEL SECURITY;

-- Политики для entity_definition
CREATE POLICY "Anyone can view entity definitions"
  ON entity_definition FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage entity definitions"
  ON entity_definition FOR ALL
  USING (
    auth.uid() IN (
      SELECT a.user_id 
      FROM admins a
      JOIN admin_roles ar ON a.role_id = ar.id
      WHERE ar.name IN ('admin', 'superAdmin')
    )
  );

-- Политики для field
CREATE POLICY "Anyone can view fields"
  ON field FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage fields"
  ON field FOR ALL
  USING (
    auth.uid() IN (
      SELECT a.user_id 
      FROM admins a
      JOIN admin_roles ar ON a.role_id = ar.id
      WHERE ar.name IN ('admin', 'superAdmin')
    )
  );

-- Функции для проверки разрешений
CREATE OR REPLACE FUNCTION check_permission(
  p_permission TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  is_user BOOLEAN;
BEGIN
  -- Если разрешение 'ALL' - доступно всем
  IF p_permission = 'ALL' THEN
    RETURN true;
  END IF;
  
  -- Если пользователь не авторизован
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Проверяем, является ли админом
  SELECT EXISTS (
    SELECT 1 
    FROM admins a
    JOIN admin_roles ar ON a.role_id = ar.id
    WHERE a.user_id = p_user_id 
      AND ar.name IN ('admin', 'superAdmin')
  ) INTO is_admin;
  
  -- Проверяем, является ли зарегистрированным пользователем
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id
  ) INTO is_user;
  
  -- Проверяем разрешение
  IF p_permission = 'Admin' THEN
    RETURN is_admin;
  ELSIF p_permission = 'User' THEN
    RETURN is_user;
  ELSIF p_permission = 'Admin|User' THEN
    RETURN is_admin OR is_user;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Политики для entity_instance с учетом разрешений
CREATE POLICY "View entity instances based on read_permission"
  ON entity_instance FOR SELECT
  USING (
    check_permission(
      (SELECT read_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid()
    )
  );

CREATE POLICY "Create entity instances based on create_permission"
  ON entity_instance FOR INSERT
  WITH CHECK (
    check_permission(
      (SELECT create_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid()
    )
  );

CREATE POLICY "Update entity instances based on update_permission"
  ON entity_instance FOR UPDATE
  USING (
    check_permission(
      (SELECT update_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid()
    )
  );

CREATE POLICY "Delete entity instances based on delete_permission"
  ON entity_instance FOR DELETE
  USING (
    check_permission(
      (SELECT delete_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid()
    )
  );

-- Политики для entity_relation
CREATE POLICY "Anyone can view entity relations"
  ON entity_relation FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage entity relations"
  ON entity_relation FOR ALL
  USING (
    auth.uid() IN (
      SELECT a.user_id 
      FROM admins a
      JOIN admin_roles ar ON a.role_id = ar.id
      WHERE ar.name IN ('admin', 'superAdmin')
    )
  );

-- =====================================================
-- 8. Вспомогательные функции
-- =====================================================

-- Функция для получения экземпляра с данными
CREATE OR REPLACE FUNCTION get_entity_instance_full(
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
    'data', ei.data
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
        'data', rel_ei.data
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
-- 9. Миграция данных из entity-lib/data/
-- =====================================================
-- Данные из entities.ts и fields.ts

-- Вставляем entity definitions
-- По умолчанию: все могут просматривать, только админы могут создавать/редактировать/удалять
INSERT INTO entity_definition (
  id, name, url, table_name, type, project_id,
  create_permission, read_permission, update_permission, delete_permission
)
VALUES
  (
    '0de37a7e-d42a-4b51-9f38-a8f616f80d51',
    'Tags',
    '/api/tags',
    'tags',
    'secondary',
    'd82f1022-a904-424f-bf20-cc032974c37c',
    'Admin',    -- создавать только админы
    'ALL',      -- просматривать могут все
    'Admin',    -- редактировать только админы
    'Admin'     -- удалять только админы
  ),
  (
    'e1a00076-cb6d-4884-8da6-048b0a281a70',
    'Blocks',
    '/api/blocks',
    'blocks',
    'secondary',
    'd82f1022-a904-424f-bf20-cc032974c37c',
    'Admin',    -- создавать только админы
    'ALL',      -- просматривать могут все
    'Admin',    -- редактировать только админы
    'Admin'     -- удалять только админы
  )
ON CONFLICT (id) DO NOTHING;

-- Вставляем fields для Tags (сначала без relation_field_id из-за циклической зависимости)
INSERT INTO field (
  id, entity_definition_id, name, db_type, type,
  label, placeholder, description,
  for_edit_page, for_create_page, required, required_text,
  for_edit_page_disabled, display_index, display_in_table,
  is_option_title_field, searchable,
  related_entity_definition_id, relation_field_id, is_relation_source,
  default_string_value, default_number_value, default_boolean_value, default_date_value,
  auto_populate, include_in_single_pma, include_in_list_pma,
  include_in_single_sa, include_in_list_sa
)
VALUES
  (
    'f6c759de-fd08-41c0-b054-60beaa6d1776',
    '0de37a7e-d42a-4b51-9f38-a8f616f80d51',
    'name',
    'varchar',
    'text',
    'Name',
    '',
    NULL,
    true, true, true, 'Name is required',
    false, 0, true,
    true, false,
    NULL, NULL, false,
    '', NULL, NULL, NULL,
    false, true, true, true, true
  ),
  (
    'b96f9fbe-872e-48d5-86ab-ce6c86ede5bb',
    '0de37a7e-d42a-4b51-9f38-a8f616f80d51',
    'color',
    'varchar',
    'text',
    'Color',
    '',
    NULL,
    true, true, false, '',
    false, 0, true,
    false, false,
    NULL, NULL, false,
    '', NULL, NULL, NULL,
    false, true, true, true, true
  ),
  (
    'd2256c14-8531-4513-b5ea-20b5ae1f7fd3',
    '0de37a7e-d42a-4b51-9f38-a8f616f80d51',
    'blocks',
    'manyToMany',
    'multipleSelect',
    'Blocks',
    NULL,
    NULL,
    true, true, false, '',
    false, 0, false,
    false, false,
    'e1a00076-cb6d-4884-8da6-048b0a281a70',
    NULL, -- временно NULL, обновим после создания всех полей
    false,
    NULL, NULL, NULL, NULL,
    false, true, true, true, true
  )
ON CONFLICT (id) DO NOTHING;

-- Вставляем fields для Blocks (сначала без relation_field_id из-за циклической зависимости)
INSERT INTO field (
  id, entity_definition_id, name, db_type, type,
  label, placeholder, description,
  for_edit_page, for_create_page, required, required_text,
  for_edit_page_disabled, display_index, display_in_table,
  is_option_title_field, searchable,
  related_entity_definition_id, relation_field_id, is_relation_source,
  default_string_value, default_number_value, default_boolean_value, default_date_value,
  auto_populate, include_in_single_pma, include_in_list_pma,
  include_in_single_sa, include_in_list_sa
)
VALUES
  (
    '30280e36-e210-4221-9a41-57c384a5a747',
    'e1a00076-cb6d-4884-8da6-048b0a281a70',
    'name',
    'varchar',
    'text',
    'Name',
    '',
    NULL,
    true, true, true, 'Name is required',
    false, 0, true,
    true, true,
    NULL, NULL, false,
    '', NULL, NULL, NULL,
    false, true, true, true, true
  ),
  (
    '2c735926-bb92-473d-bf1c-f0b23274b903',
    'e1a00076-cb6d-4884-8da6-048b0a281a70',
    'body',
    'varchar',
    'textarea',
    'Body',
    '',
    NULL,
    true, true, false, '',
    false, 0, true,
    false, false,
    NULL, NULL, false,
    '', NULL, NULL, NULL,
    false, true, true, true, true
  ),
  (
    '88f76ee8-d4f3-43b0-a396-0f3afa5322a5',
    'e1a00076-cb6d-4884-8da6-048b0a281a70',
    'tags',
    'manyToMany',
    'multipleSelect',
    'Tags',
    '',
    NULL,
    true, true, false, '',
    false, 0, true,
    false, false,
    '0de37a7e-d42a-4b51-9f38-a8f616f80d51',
    NULL, -- временно NULL, обновим после создания всех полей
    true,
    NULL, NULL, NULL, NULL,
    true, true, true, true, true
  )
ON CONFLICT (id) DO NOTHING;

-- Обновляем relation_field_id для полей со связями (после того как все поля созданы)
UPDATE field 
SET relation_field_id = '88f76ee8-d4f3-43b0-a396-0f3afa5322a5' -- поле tags в Blocks
WHERE id = 'd2256c14-8531-4513-b5ea-20b5ae1f7fd3'; -- поле blocks в Tags

UPDATE field 
SET relation_field_id = 'd2256c14-8531-4513-b5ea-20b5ae1f7fd3' -- поле blocks в Tags
WHERE id = '88f76ee8-d4f3-43b0-a396-0f3afa5322a5'; -- поле tags в Blocks

-- =====================================================
-- 10. Проверка создания таблиц
-- =====================================================

SELECT 'Migration completed successfully!' AS status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'entity_definition', 
    'field', 
    'entity_instance', 
    'entity_relation'
  )
ORDER BY table_name;

-- Проверка данных
SELECT 
  (SELECT COUNT(*) FROM entity_definition) as entity_definitions_count,
  (SELECT COUNT(*) FROM field) as fields_count;

-- =====================================================
-- Конец миграции
-- =====================================================

