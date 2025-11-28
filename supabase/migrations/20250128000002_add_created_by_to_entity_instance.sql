-- Добавление поля created_by в entity_instance для отслеживания создателя
-- Используется для политик "только свои записи"

ALTER TABLE entity_instance
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS idx_entity_instance_created_by 
  ON entity_instance(created_by) WHERE created_by IS NOT NULL;

-- Комментарий
COMMENT ON COLUMN entity_instance.created_by IS 'ID пользователя, создавшего экземпляр (для политик "только свои записи")';

