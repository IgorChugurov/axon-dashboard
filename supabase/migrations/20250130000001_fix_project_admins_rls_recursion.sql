-- Исправление бесконечной рекурсии в RLS политиках project_admins
-- Проблема: политики использовали прямые запросы к project_admins внутри проверки доступа
-- Решение: использовать функции is_super_admin() и is_project_super_admin() с SECURITY DEFINER

-- ============================================
-- 1. УДАЛЕНИЕ СТАРЫХ ПОЛИТИК
-- ============================================

DROP POLICY IF EXISTS "Admins can view project admins" ON public.project_admins;
DROP POLICY IF EXISTS "Admins can insert project admins" ON public.project_admins;
DROP POLICY IF EXISTS "Admins can update project admins" ON public.project_admins;
DROP POLICY IF EXISTS "Admins can delete project admins" ON public.project_admins;

-- ============================================
-- 2. СОЗДАНИЕ ИСПРАВЛЕННЫХ ПОЛИТИК
-- ============================================

-- Политика: SuperAdmin и ProjectSuperAdmin могут видеть админов
-- Используем функции вместо прямых запросов к project_admins, чтобы избежать рекурсии
CREATE POLICY "Admins can view project admins"
  ON public.project_admins
  FOR SELECT
  USING (
    -- SuperAdmin (project_id IS NULL) видит всех
    public.is_super_admin(auth.uid())
    OR
    -- ProjectSuperAdmin видит админов своего проекта
    (
      project_admins.project_id IS NOT NULL
      AND public.is_project_super_admin(project_admins.project_id, auth.uid())
    )
    OR
    -- Пользователь может видеть свою запись
    user_id = auth.uid()
  );

-- Политика: SuperAdmin и ProjectSuperAdmin могут добавлять админов
-- Используем функции вместо прямых запросов к project_admins, чтобы избежать рекурсии
CREATE POLICY "Admins can insert project admins"
  ON public.project_admins
  FOR INSERT
  WITH CHECK (
    -- SuperAdmin может добавлять в любой проект или создавать superAdmin
    public.is_super_admin(auth.uid())
    OR
    -- ProjectSuperAdmin может добавлять только в свой проект
    (
      project_admins.project_id IS NOT NULL
      AND public.is_project_super_admin(project_admins.project_id, auth.uid())
    )
  );

-- Политика: SuperAdmin и ProjectSuperAdmin могут обновлять админов
-- Используем функции вместо прямых запросов к project_admins, чтобы избежать рекурсии
CREATE POLICY "Admins can update project admins"
  ON public.project_admins
  FOR UPDATE
  USING (
    -- SuperAdmin может обновлять любого
    public.is_super_admin(auth.uid())
    OR
    -- ProjectSuperAdmin может обновлять только в своем проекте
    -- И НЕ может обновить себя
    (
      project_admins.project_id IS NOT NULL
      AND public.is_project_super_admin(project_admins.project_id, auth.uid())
      AND project_admins.user_id != auth.uid()  -- Не может обновить себя
    )
  );

-- Политика: SuperAdmin и ProjectSuperAdmin могут удалять админов
-- Используем функции вместо прямых запросов к project_admins, чтобы избежать рекурсии
CREATE POLICY "Admins can delete project admins"
  ON public.project_admins
  FOR DELETE
  USING (
    -- SuperAdmin может удалить любого
    public.is_super_admin(auth.uid())
    OR
    -- ProjectSuperAdmin может удалить только в своем проекте
    -- И НЕ может удалить себя
    (
      project_admins.project_id IS NOT NULL
      AND public.is_project_super_admin(project_admins.project_id, auth.uid())
      AND project_admins.user_id != auth.uid()  -- Не может удалить себя
    )
  );

