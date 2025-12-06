-- ============================================================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ: Универсальная система сущностей
-- ============================================================================
-- 
-- Эта миграция создает таблицы для универсальной системы сущностей:
-- - entity_definition (конфигурация сущностей)
-- - field (конфигурация полей)
-- - entity_instance (экземпляры сущностей)
-- - entity_relation (связи между экземплярами)
--
-- Включает все дополнения и улучшения из последующих миграций.
-- Используйте эту миграцию при создании нового проекта с нуля.
--
-- ИДЕМПОТЕНТНА: можно выполнять несколько раз безопасно
-- ============================================================================

-- ============================================================================
-- 1. ТАБЛИЦА ENTITY_DEFINITION (конфигурация сущностей)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_definition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  table_name TEXT NOT NULL, -- для обратной совместимости
  type TEXT NOT NULL CHECK (type IN ('primary', 'secondary', 'tertiary')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Права доступа (разрешения) - с поддержкой Owner опций
  create_permission TEXT NOT NULL DEFAULT 'Admin' 
    CHECK (create_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
  read_permission TEXT NOT NULL DEFAULT 'ALL' 
    CHECK (read_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
  update_permission TEXT NOT NULL DEFAULT 'Admin' 
    CHECK (update_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
  delete_permission TEXT NOT NULL DEFAULT 'Admin' 
    CHECK (delete_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
  
  -- Лимиты файлов (добавлено в 20250128000001)
  max_file_size_mb INTEGER DEFAULT 5,
  max_files_count INTEGER DEFAULT 10,
  
  -- UI конфигурация (добавлено в 20251118130709)
  ui_config JSONB DEFAULT NULL,
  enable_pagination BOOLEAN DEFAULT true,
  page_size INTEGER DEFAULT 20,
  enable_filters BOOLEAN DEFAULT false,
  filter_entity_definition_ids TEXT[] DEFAULT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT entity_definition_project_name_unique 
    UNIQUE (project_id, name),
  CONSTRAINT entity_definition_page_size_check 
    CHECK (page_size IS NULL OR (page_size >= 1 AND page_size <= 100))
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_entity_definition_project_id 
  ON entity_definition(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_definition_type 
  ON entity_definition(type);
CREATE INDEX IF NOT EXISTS idx_entity_definition_ui_config 
  ON entity_definition USING GIN (ui_config);
CREATE INDEX IF NOT EXISTS idx_entity_definition_filter_ids 
  ON entity_definition USING GIN (filter_entity_definition_ids);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_definition_project_slug 
  ON entity_definition(project_id, slug);

-- ============================================================================
-- 2. ТАБЛИЦА FIELD (конфигурация полей)
-- ============================================================================

CREATE TABLE IF NOT EXISTS field (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  db_type TEXT NOT NULL CHECK (db_type IN (
    'varchar', 'float', 'boolean', 'timestamptz',
    'manyToOne', 'oneToMany', 'manyToMany', 'oneToOne', 'files'
  )),
  type TEXT NOT NULL CHECK (type IN (
    'select', 'text', 'textarea', 'number', 'date', 
    'boolean', 'radio', 'multipleSelect', 'array',
    'dynamicValue', 'files', 'images'
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
  filterable_in_list BOOLEAN DEFAULT false, -- добавлено в 20251126000000
  
  -- Связи
  related_entity_definition_id UUID REFERENCES entity_definition(id),
  relation_field_id UUID REFERENCES field(id),
  is_relation_source BOOLEAN DEFAULT false,
  selector_relation_id UUID REFERENCES field(id),
  
  -- Информация о связанном поле (добавлено в 20250120000000)
  relation_field_name TEXT,
  relation_field_label TEXT,
  
  -- Условная видимость (добавлено в 20250120000001)
  foreign_key TEXT,
  foreign_key_value TEXT,
  
  -- Конфигурация файлов (добавлено в 20250128000004)
  accept_file_types TEXT,
  max_file_size BIGINT, -- в байтах (переопределяет лимит из EntityDefinition)
  max_files INTEGER, -- для типа "files"/"images" (переопределяет лимит из EntityDefinition)
  storage_bucket TEXT DEFAULT 'files',
  
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

-- Индексы
CREATE INDEX IF NOT EXISTS idx_field_entity_definition_id 
  ON field(entity_definition_id);
CREATE INDEX IF NOT EXISTS idx_field_related_entity_definition_id 
  ON field(related_entity_definition_id) WHERE related_entity_definition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_relation_field_id 
  ON field(relation_field_id) WHERE relation_field_id IS NOT NULL;

-- ============================================================================
-- 3. ТАБЛИЦА ENTITY_INSTANCE (экземпляры сущностей)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_definition_id UUID NOT NULL REFERENCES entity_definition(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  
  -- Все поля хранятся в JSONB
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Владелец записи (добавлено в 20250128000002)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_entity_instance_created_by 
  ON entity_instance(created_by) WHERE created_by IS NOT NULL;

-- GIN индекс для JSONB поиска
CREATE INDEX IF NOT EXISTS idx_entity_instance_data_gin 
  ON entity_instance USING GIN (data);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_instance_definition_slug 
  ON entity_instance(entity_definition_id, slug);

-- ============================================================================
-- 4. ТАБЛИЦА ENTITY_RELATION (связи между экземплярами)
-- ============================================================================

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

-- ============================================================================
-- 5. ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ SLUG ИЗ NAME
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_slug_from_name(name_text TEXT)
RETURNS TEXT AS $$
DECLARE
  slug_result TEXT;
BEGIN
  -- Обрабатываем входную строку
  slug_result := trim(name_text);
  
  -- Если пустая строка, возвращаем 'item'
  IF slug_result = '' OR slug_result IS NULL THEN
    RETURN 'item';
  END IF;
  
  -- Преобразуем в lowercase
  slug_result := lower(slug_result);
  
  -- Удаляем спецсимволы (оставляем только буквы, цифры, пробелы и дефисы)
  slug_result := regexp_replace(slug_result, '[^a-z0-9\s-]', '', 'g');
  
  -- Заменяем пробелы на дефисы
  slug_result := regexp_replace(slug_result, '\s+', '-', 'g');
  
  -- Удаляем дефисы в начале и конце
  slug_result := regexp_replace(slug_result, '^-+|-+$', '', 'g');
  
  -- Если после обработки пустая строка, возвращаем 'item'
  IF slug_result = '' OR slug_result IS NULL THEN
    RETURN 'item';
  END IF;
  
  -- Ограничиваем длину до 100 символов
  slug_result := substring(slug_result, 1, 100);
  
  RETURN slug_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. ТРИГГЕРЫ ДЛЯ ОБНОВЛЕНИЯ updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_entity_definition_updated_at ON entity_definition;
CREATE TRIGGER update_entity_definition_updated_at
  BEFORE UPDATE ON entity_definition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_field_updated_at ON field;
CREATE TRIGGER update_field_updated_at
  BEFORE UPDATE ON field
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entity_instance_updated_at ON entity_instance;
CREATE TRIGGER update_entity_instance_updated_at
  BEFORE UPDATE ON entity_instance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. ТРИГГЕРЫ ВАЛИДАЦИИ
-- ============================================================================

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

DROP TRIGGER IF EXISTS validate_relation_types_trigger ON entity_relation;
CREATE TRIGGER validate_relation_types_trigger
  BEFORE INSERT OR UPDATE ON entity_relation
  FOR EACH ROW
  EXECUTE FUNCTION validate_relation_types();

-- ============================================================================
-- 8. КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================================================

COMMENT ON TABLE entity_definition IS 'Конфигурация сущностей (Entity Definitions)';
COMMENT ON COLUMN entity_definition.slug IS 'URL-friendly идентификатор для использования в клиентских приложениях. Уникален в рамках проекта. Генерируется автоматически из name при создании.';
COMMENT ON COLUMN entity_definition.max_file_size_mb IS 'Максимальный размер одного файла в мегабайтах (по умолчанию 5MB)';
COMMENT ON COLUMN entity_definition.max_files_count IS 'Максимальное количество файлов на один экземпляр (по умолчанию 10)';
COMMENT ON COLUMN entity_definition.ui_config IS 'Partial UI configuration (JSONB) that overrides default values generated from entity name and fields. Structure: { list: {...}, form: {...}, messages: {...} }';
COMMENT ON COLUMN entity_definition.enable_pagination IS 'Enable pagination on list page. If false, all data is loaded at once (use for small datasets like tags)';
COMMENT ON COLUMN entity_definition.page_size IS 'Number of items per page when pagination is enabled. Default: 20, Range: 1-100';
COMMENT ON COLUMN entity_definition.enable_filters IS 'Enable filters on list page. When true, filter_entity_definition_ids defines which entities can be used as filters';
COMMENT ON COLUMN entity_definition.filter_entity_definition_ids IS 'Array of entity definition IDs to use as filter options on the list page. Example: ["tag-id", "category-id"]';
COMMENT ON COLUMN entity_definition.create_permission IS 'Разрешение на создание: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';
COMMENT ON COLUMN entity_definition.read_permission IS 'Разрешение на чтение: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';
COMMENT ON COLUMN entity_definition.update_permission IS 'Разрешение на обновление: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';
COMMENT ON COLUMN entity_definition.delete_permission IS 'Разрешение на удаление: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';

COMMENT ON TABLE field IS 'Конфигурация полей (Fields)';
COMMENT ON COLUMN field.relation_field_name IS 'Имя связанного поля (для отображения при редактировании)';
COMMENT ON COLUMN field.relation_field_label IS 'Лейбл связанного поля (для отображения при редактировании)';
COMMENT ON COLUMN field.foreign_key IS 'Имя поля, от которого зависит видимость данного поля (для условной видимости)';
COMMENT ON COLUMN field.foreign_key_value IS 'Значения foreign_key, при которых поле видимо (pipe-separated: "value1|value2" или "any")';
COMMENT ON COLUMN field.accept_file_types IS 'MIME types, например: image/*, application/pdf. Если не указано, принимаются все типы';
COMMENT ON COLUMN field.max_file_size IS 'Максимальный размер файла в байтах (переопределяет лимит из EntityDefinition)';
COMMENT ON COLUMN field.max_files IS 'Максимум файлов для типа files/images (переопределяет лимит из EntityDefinition)';
COMMENT ON COLUMN field.storage_bucket IS 'Имя bucket в Supabase Storage (по умолчанию "files")';
COMMENT ON COLUMN field.filterable_in_list IS 'When true, this field will be shown as a filter option in list views';

COMMENT ON TABLE entity_instance IS 'Экземпляры сущностей (Entity Instances)';
COMMENT ON COLUMN entity_instance.slug IS 'URL-friendly идентификатор для использования в клиентских приложениях. Уникален в рамках entity_definition. Генерируется автоматически из поля name в data при создании.';
COMMENT ON COLUMN entity_instance.created_by IS 'ID пользователя, создавшего экземпляр (для политик "только свои записи")';

COMMENT ON TABLE entity_relation IS 'Связи между экземплярами сущностей (Entity Relations)';

-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================

