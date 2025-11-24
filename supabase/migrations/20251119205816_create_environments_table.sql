-- Создание таблицы environments для хранения переменных окружения проектов
-- Каждый environment связан с проектом и имеет ключ, тип значения, само значение и опции (для select типа)

CREATE TABLE IF NOT EXISTS environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'select')),
  value JSONB, -- Храним значение в JSONB для гибкости типов (string, number, boolean, или выбранная опция для select)
  options JSONB DEFAULT '[]'::jsonb, -- Массив строк для опций select типа
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один ключ на один проект
  CONSTRAINT environments_project_key_unique UNIQUE (project_id, key)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_environments_project_id ON environments(project_id);
CREATE INDEX IF NOT EXISTS idx_environments_key ON environments(project_id, key);
CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(type);

-- GIN индекс для поиска по JSONB полям
CREATE INDEX IF NOT EXISTS idx_environments_value_gin ON environments USING GIN (value);
CREATE INDEX IF NOT EXISTS idx_environments_options_gin ON environments USING GIN (options);

-- Комментарии для документации
COMMENT ON TABLE environments IS 'Переменные окружения для проектов. Каждая переменная имеет ключ, тип значения и само значение. Для select типа доступны опции.';
COMMENT ON COLUMN environments.key IS 'Уникальный ключ переменной окружения в рамках проекта';
COMMENT ON COLUMN environments.type IS 'Тип значения: string, number, boolean, select';
COMMENT ON COLUMN environments.value IS 'Значение переменной в формате JSONB (может быть string, number, boolean или выбранная опция для select)';
COMMENT ON COLUMN environments.options IS 'Массив строк с опциями для select типа (хранится как JSONB массив)';

-- RLS (Row Level Security) - включаем для безопасности
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть environments только своих проектов
-- (или проектов, к которым у них есть доступ)
-- TODO: Настроить политики в зависимости от требований доступа
CREATE POLICY "Users can view environments of their projects"
  ON environments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = environments.project_id
      -- TODO: Добавить проверку прав доступа к проекту
    )
  );

-- Политика: только админы могут создавать/обновлять/удалять environments
-- TODO: Настроить политики в зависимости от требований доступа
CREATE POLICY "Admins can manage environments"
  ON environments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_environments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION update_environments_updated_at();

