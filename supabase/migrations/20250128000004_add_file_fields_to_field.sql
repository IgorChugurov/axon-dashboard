-- Добавление поддержки типов files и images в field
-- files - отображение как список файлов
-- images - отображение как изображения (img теги)

-- Добавляем новые типы в CHECK constraint для field.type
ALTER TABLE field
  DROP CONSTRAINT IF EXISTS field_type_check;

ALTER TABLE field
  ADD CONSTRAINT field_type_check
  CHECK (type IN (
    'select', 'text', 'textarea', 'number', 'date',
    'boolean', 'radio', 'multipleSelect', 'array',
    'dynamicValue', 'files', 'images'
  ));

-- Добавляем новый тип в CHECK constraint для field.db_type
ALTER TABLE field
  DROP CONSTRAINT IF EXISTS field_db_type_check;

ALTER TABLE field
  ADD CONSTRAINT field_db_type_check
  CHECK (db_type IN (
    'varchar', 'float', 'boolean', 'timestamptz',
    'manyToOne', 'oneToMany', 'manyToMany', 'oneToOne',
    'files'
  ));

-- Добавляем поля для конфигурации файлов
ALTER TABLE field
  ADD COLUMN IF NOT EXISTS accept_file_types TEXT,
  ADD COLUMN IF NOT EXISTS max_file_size BIGINT, -- в байтах (переопределяет лимит из EntityDefinition)
  ADD COLUMN IF NOT EXISTS max_files INTEGER, -- для типа "files"/"images" (переопределяет лимит из EntityDefinition)
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'files';

-- Комментарии
COMMENT ON COLUMN field.accept_file_types IS 'MIME types, например: image/*, application/pdf. Если не указано, принимаются все типы';
COMMENT ON COLUMN field.max_file_size IS 'Максимальный размер файла в байтах (переопределяет лимит из EntityDefinition)';
COMMENT ON COLUMN field.max_files IS 'Максимум файлов для типа files/images (переопределяет лимит из EntityDefinition)';
COMMENT ON COLUMN field.storage_bucket IS 'Имя bucket в Supabase Storage (по умолчанию "files")';

