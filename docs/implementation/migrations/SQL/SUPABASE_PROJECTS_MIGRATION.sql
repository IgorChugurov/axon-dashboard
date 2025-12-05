-- Миграция для создания таблицы projects (для тестирования защищенных API)
-- Выполните этот SQL в Supabase Dashboard → SQL Editor
-- ВАЖНО: Выполните после SUPABASE_MIGRATION.sql и SUPABASE_ROLES_MIGRATION.sql

-- ============================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ PROJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);

-- ============================================
-- 2. ВКЛЮЧЕНИЕ RLS
-- ============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS ПОЛИТИКИ ДЛЯ PROJECTS
-- ============================================

-- Политика: Админы (admin и superAdmin) могут видеть все проекты
-- Используем функцию is_admin() с SECURITY DEFINER для обхода RLS
CREATE POLICY "Admins can view all projects"
  ON public.projects
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Политика: Обычные пользователи могут видеть только свои проекты
CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  USING (created_by = auth.uid());

-- Политика: Админы могут создавать проекты
-- Используем функцию is_admin() с SECURITY DEFINER для обхода RLS
CREATE POLICY "Admins can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Политика: Пользователи могут создавать свои проекты
CREATE POLICY "Users can create own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Политика: Админы могут обновлять все проекты
-- Используем функцию is_admin() с SECURITY DEFINER для обхода RLS
CREATE POLICY "Admins can update all projects"
  ON public.projects
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Политика: Пользователи могут обновлять только свои проекты
CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  USING (created_by = auth.uid());

-- Политика: Админы могут удалять все проекты
-- Используем функцию is_admin() с SECURITY DEFINER для обхода RLS
CREATE POLICY "Admins can delete all projects"
  ON public.projects
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Политика: Пользователи могут удалять только свои проекты
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- 4. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- ============================================

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. ПРИМЕЧАНИЯ
-- ============================================

-- Эта таблица создана для тестирования защищенных API
-- Политики RLS настроены так, что:
-- - Админы (admin и superAdmin) видят и могут управлять всеми проектами
-- - Обычные пользователи видят и могут управлять только своими проектами
-- 
-- Для тестирования:
-- 1. Войдите как superAdmin (igorchugurov@gmail.com)
-- 2. Создайте проект через API: POST /api/projects
-- 3. Получите список проектов: GET /api/projects
-- 4. Проверьте, что видите все проекты (как админ)

