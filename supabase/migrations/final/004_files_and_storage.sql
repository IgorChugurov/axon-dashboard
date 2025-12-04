-- ============================================================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ: Файлы и Storage
-- ============================================================================
-- 
-- Эта миграция создает:
-- 1. Таблицу entity_file для хранения файлов, привязанных к экземплярам сущностей
-- 2. Storage bucket для файлов
-- 3. RLS политики для entity_file и storage
--
-- Используйте эту миграцию при создании нового проекта с нуля.
--
-- ИДЕМПОТЕНТНА: можно выполнять несколько раз безопасно
-- ============================================================================

-- ============================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ ENTITY_FILE
-- ============================================================================

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

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_entity_file_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_entity_file_updated_at ON entity_file;
CREATE TRIGGER update_entity_file_updated_at
  BEFORE UPDATE ON entity_file
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_file_updated_at();

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

-- ============================================================================
-- 2. СОЗДАНИЕ STORAGE BUCKET
-- ============================================================================

-- Создаем bucket для файлов (если не существует)
-- Примечание: если bucket уже создан вручную, эта команда ничего не сделает
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ВКЛЮЧЕНИЕ RLS ДЛЯ ENTITY_FILE
-- ============================================================================

ALTER TABLE entity_file ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS ПОЛИТИКИ ДЛЯ ENTITY_FILE
-- ============================================================================
-- 
-- Политики для entity_file создаются в миграции 001_complete_roles_and_permissions.sql
-- Здесь только включаем RLS, политики будут добавлены позже
--
-- ============================================================================
-- 5. RLS ПОЛИТИКИ ДЛЯ STORAGE
-- ============================================================================

-- Удаляем старые политики если они существуют (для пересоздания)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;

-- RLS политики для bucket
-- Чтение: все могут читать
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- Загрузка: только админы (используем is_any_admin из миграции ролей)
-- Примечание: эта политика будет работать только после выполнения миграции ролей
CREATE POLICY "Admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'files'
    AND public.is_any_admin(auth.uid())
  );

-- Обновление: только админы
CREATE POLICY "Admins can update files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'files'
    AND public.is_any_admin(auth.uid())
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'files'
    AND public.is_any_admin(auth.uid())
  );

-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================

