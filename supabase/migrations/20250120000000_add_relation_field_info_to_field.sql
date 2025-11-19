-- Добавление полей для хранения информации о связанном поле
-- Эти поля используются для отображения информации о связанном поле при редактировании

ALTER TABLE field
ADD COLUMN IF NOT EXISTS relation_field_name TEXT,
ADD COLUMN IF NOT EXISTS relation_field_label TEXT;

-- Комментарии для документации
COMMENT ON COLUMN field.relation_field_name IS 'Имя связанного поля (для отображения при редактировании)';
COMMENT ON COLUMN field.relation_field_label IS 'Лейбл связанного поля (для отображения при редактировании)';

