-- Добавление полей для настройки авторизации в проектах
-- Эти поля позволяют включать/выключать регистрацию и вход для каждого проекта

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS enable_sign_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_sign_up BOOLEAN DEFAULT true;

-- Комментарии для документации
COMMENT ON COLUMN projects.enable_sign_in IS 'Разрешить вход в систему для этого проекта (через публичный API)';
COMMENT ON COLUMN projects.enable_sign_up IS 'Разрешить регистрацию для этого проекта (через публичный API)';

-- Индексы для оптимизации (если нужно фильтровать по этим полям)
CREATE INDEX IF NOT EXISTS idx_projects_enable_sign_in ON projects(enable_sign_in);
CREATE INDEX IF NOT EXISTS idx_projects_enable_sign_up ON projects(enable_sign_up);

