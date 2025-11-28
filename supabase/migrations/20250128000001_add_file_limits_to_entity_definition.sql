-- Добавление полей для лимитов файлов в entity_definition
-- Лимиты применяются ко всем файлам, загружаемым для экземпляров этой сущности

ALTER TABLE entity_definition
  ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_files_count INTEGER DEFAULT 10;

-- Комментарии
COMMENT ON COLUMN entity_definition.max_file_size_mb IS 'Максимальный размер одного файла в мегабайтах (по умолчанию 5MB)';
COMMENT ON COLUMN entity_definition.max_files_count IS 'Максимальное количество файлов на один экземпляр (по умолчанию 10)';

