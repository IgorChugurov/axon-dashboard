-- Добавление полей для условной видимости полей
-- Эти поля используются для управления видимостью поля в зависимости от значения другого поля

ALTER TABLE field
ADD COLUMN IF NOT EXISTS foreign_key TEXT,
ADD COLUMN IF NOT EXISTS foreign_key_value TEXT;

-- Комментарии для документации
COMMENT ON COLUMN field.foreign_key IS 'Имя поля, от которого зависит видимость данного поля (для условной видимости)';
COMMENT ON COLUMN field.foreign_key_value IS 'Значения foreign_key, при которых поле видимо (pipe-separated: "value1|value2" или "any")';

