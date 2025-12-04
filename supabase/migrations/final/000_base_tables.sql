-- ============================================================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ: Базовые таблицы
-- ============================================================================
-- 
-- Эта миграция создает базовую таблицу projects.
-- Используйте эту миграцию при создании нового проекта с нуля.
--
-- ИДЕМПОТЕНТНА: можно выполнять несколько раз безопасно
-- ============================================================================

-- ============================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Настройки авторизации (добавлено в 20250129000001)
  enable_sign_in BOOLEAN DEFAULT true,
  enable_sign_up BOOLEAN DEFAULT true
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_enable_sign_in ON public.projects(enable_sign_in);
CREATE INDEX IF NOT EXISTS idx_projects_enable_sign_up ON public.projects(enable_sign_up);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Комментарии для документации
COMMENT ON TABLE public.projects IS 'Проекты системы';
COMMENT ON COLUMN public.projects.enable_sign_in IS 'Разрешить вход в систему для этого проекта (через публичный API)';
COMMENT ON COLUMN public.projects.enable_sign_up IS 'Разрешить регистрацию для этого проекта (через публичный API)';

-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================

