-- Создание таблицы entity_file для хранения файлов, привязанных к экземплярам сущностей
-- Каждый загруженный файл имеет отдельную запись в этой таблице

CREATE TABLE IF NOT EXISTS entity_file (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_instance_id UUID NOT NULL REFERENCES entity_instance(id) ON DELETE CASCADE,
  field_id UUID REFERENCES field(id) ON DELETE SET NULL, -- опционально: к какому полю относится
  
  -- Информация о файле
  file_url TEXT NOT NULL, -- URL файла в Supabase Storage
  file_path TEXT NOT NULL, -- Путь в Storage (для удаления)
  file_name TEXT NOT NULL, -- Оригинальное имя файла
  file_size BIGINT NOT NULL, -- Размер в байтах
  file_type TEXT NOT NULL, -- MIME type (image/png, application/pdf, etc.)
  storage_bucket TEXT NOT NULL DEFAULT 'files', -- Имя bucket
  
  -- Метаданные
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Кто загрузил
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один файл = одна запись (по URL)
  CONSTRAINT entity_file_url_unique UNIQUE (file_url)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_entity_file_entity_instance_id 
  ON entity_file(entity_instance_id);
CREATE INDEX IF NOT EXISTS idx_entity_file_field_id 
  ON entity_file(field_id) WHERE field_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_file_uploaded_by 
  ON entity_file(uploaded_by) WHERE uploaded_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_file_created_at 
  ON entity_file(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_file_storage_bucket 
  ON entity_file(storage_bucket);

-- Комментарии
COMMENT ON TABLE entity_file IS 'Файлы, привязанные к экземплярам сущностей';
COMMENT ON COLUMN entity_file.entity_instance_id IS 'ID экземпляра сущности, к которому привязан файл';
COMMENT ON COLUMN entity_file.field_id IS 'ID поля, к которому относится файл (опционально)';
COMMENT ON COLUMN entity_file.file_url IS 'Публичный URL файла в Supabase Storage';
COMMENT ON COLUMN entity_file.file_path IS 'Путь к файлу в Storage (для удаления)';
COMMENT ON COLUMN entity_file.file_name IS 'Оригинальное имя файла при загрузке';
COMMENT ON COLUMN entity_file.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN entity_file.file_type IS 'MIME type файла (image/png, application/pdf, etc.)';
COMMENT ON COLUMN entity_file.storage_bucket IS 'Имя bucket в Supabase Storage';
COMMENT ON COLUMN entity_file.uploaded_by IS 'ID пользователя, загрузившего файл';

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_entity_file_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entity_file_updated_at
  BEFORE UPDATE ON entity_file
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_file_updated_at();

