-- ============================================================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ: Переменные окружения
-- ============================================================================
-- 
-- Эта миграция создает таблицу environments для хранения переменных окружения проектов.
-- Используйте эту миграцию при создании нового проекта с нуля.
--
-- ИДЕМПОТЕНТНА: можно выполнять несколько раз безопасно
-- ============================================================================

-- ============================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ ENVIRONMENTS
-- ============================================================================

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

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_environments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
CREATE TRIGGER update_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION update_environments_updated_at();

-- Комментарии для документации
COMMENT ON TABLE environments IS 'Переменные окружения для проектов. Каждая переменная имеет ключ, тип значения и само значение. Для select типа доступны опции.';
COMMENT ON COLUMN environments.key IS 'Уникальный ключ переменной окружения в рамках проекта';
COMMENT ON COLUMN environments.type IS 'Тип значения: string, number, boolean, select';
COMMENT ON COLUMN environments.value IS 'Значение переменной в формате JSONB (может быть string, number, boolean или выбранная опция для select)';
COMMENT ON COLUMN environments.options IS 'Массив строк с опциями для select типа (хранится как JSONB массив)';

-- ============================================================================
-- 2. ВКЛЮЧЕНИЕ RLS
-- ============================================================================

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS ПОЛИТИКИ (будут обновлены в миграции ролей)
-- ============================================================================
-- 
-- Политики для environments создаются в миграции 001_complete_roles_and_permissions.sql
-- Здесь только включаем RLS, политики будут добавлены позже
--
-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================

