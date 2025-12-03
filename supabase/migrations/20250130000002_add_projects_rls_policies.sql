-- Добавление RLS политик для таблицы projects
-- Проекты должны быть доступны только админам, которые имеют к ним доступ
-- superAdmin видит все проекты, projectSuperAdmin и projectAdmin - только свои

-- ============================================
-- 1. ВКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦЫ PROJECTS
-- ============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ PROJECTS
-- ============================================

-- Политика: Админы могут видеть доступные им проекты
-- Используем функцию get_accessible_project_ids для определения доступных проектов
CREATE POLICY "Admins can view accessible projects"
  ON public.projects
  FOR SELECT
  USING (
    -- Проверяем, есть ли проект в списке доступных для пользователя
    id = ANY(
      public.get_accessible_project_ids(auth.uid())
    )
  );

-- Политика: Только superAdmin может создавать проекты
CREATE POLICY "Only superAdmin can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
  );

-- Политика: Только superAdmin может обновлять проекты
CREATE POLICY "Only superAdmin can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
  );

-- Политика: Только superAdmin может удалять проекты
CREATE POLICY "Only superAdmin can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
  );

-- ============================================
-- 3. КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON POLICY "Admins can view accessible projects" ON public.projects IS 'Админы могут видеть только доступные им проекты (superAdmin - все, остальные - из project_admins)';
COMMENT ON POLICY "Only superAdmin can create projects" ON public.projects IS 'Только superAdmin может создавать новые проекты';
COMMENT ON POLICY "Only superAdmin can update projects" ON public.projects IS 'Только superAdmin может обновлять проекты';
COMMENT ON POLICY "Only superAdmin can delete projects" ON public.projects IS 'Только superAdmin может удалять проекты';

