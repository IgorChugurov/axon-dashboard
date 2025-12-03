-- Обновление RLS политик для таблиц field и entity_definition
-- Проблема: политики используют старую таблицу admins вместо project_admins
-- Решение: обновить политики для работы с новой структурой админов

-- ============================================
-- 1. УДАЛЕНИЕ СТАРЫХ ПОЛИТИК
-- ============================================

-- Политики для field
DROP POLICY IF EXISTS "Anyone can view fields" ON public.field;
DROP POLICY IF EXISTS "Admins can manage fields" ON public.field;

-- Политики для entity_definition
DROP POLICY IF EXISTS "Anyone can view entity definitions" ON public.entity_definition;
DROP POLICY IF EXISTS "Admins can manage entity definitions" ON public.entity_definition;

-- ============================================
-- 2. СОЗДАНИЕ НОВЫХ ПОЛИТИК ДЛЯ FIELD
-- ============================================

-- Политика: Все могут видеть fields (для чтения структуры)
CREATE POLICY "Anyone can view fields"
  ON public.field
  FOR SELECT
  USING (true);

-- Политика: Админы могут управлять fields в своих проектах
-- superAdmin может управлять fields во всех проектах
-- projectSuperAdmin и projectAdmin могут управлять fields только в своих проектах
CREATE POLICY "Admins can manage fields in accessible projects"
  ON public.field
  FOR ALL
  USING (
    -- Проверяем доступ к проекту через entity_definition
    EXISTS (
      SELECT 1
      FROM entity_definition ed
      WHERE ed.id = field.entity_definition_id
        AND ed.project_id = ANY(
          public.get_accessible_project_ids(auth.uid())
        )
    )
  )
  WITH CHECK (
    -- При создании/обновлении также проверяем доступ к проекту
    EXISTS (
      SELECT 1
      FROM entity_definition ed
      WHERE ed.id = field.entity_definition_id
        AND ed.project_id = ANY(
          public.get_accessible_project_ids(auth.uid())
        )
    )
  );

-- ============================================
-- 3. СОЗДАНИЕ НОВЫХ ПОЛИТИК ДЛЯ ENTITY_DEFINITION
-- ============================================

-- Политика: Все могут видеть entity definitions (для чтения структуры)
CREATE POLICY "Anyone can view entity definitions"
  ON public.entity_definition
  FOR SELECT
  USING (true);

-- Политика: Админы могут управлять entity definitions в своих проектах
-- superAdmin может управлять entity definitions во всех проектах
-- projectSuperAdmin может управлять entity definitions только в своих проектах
-- projectAdmin НЕ может управлять entity definitions (только чтение)
CREATE POLICY "Admins can manage entity definitions in accessible projects"
  ON public.entity_definition
  FOR ALL
  USING (
    -- Проверяем доступ к проекту
    project_id = ANY(
      public.get_accessible_project_ids(auth.uid())
    )
    AND
    -- projectAdmin не может управлять (только superAdmin и projectSuperAdmin)
    (
      public.is_super_admin(auth.uid())
      OR
      public.is_project_super_admin(project_id, auth.uid())
    )
  )
  WITH CHECK (
    -- При создании/обновлении также проверяем доступ к проекту
    project_id = ANY(
      public.get_accessible_project_ids(auth.uid())
    )
    AND
    -- projectAdmin не может управлять (только superAdmin и projectSuperAdmin)
    (
      public.is_super_admin(auth.uid())
      OR
      public.is_project_super_admin(project_id, auth.uid())
    )
  );

-- ============================================
-- 4. КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON POLICY "Anyone can view fields" ON public.field IS 'Все могут видеть fields (для чтения структуры)';
COMMENT ON POLICY "Admins can manage fields in accessible projects" ON public.field IS 'Админы могут управлять fields в доступных им проектах (superAdmin - все проекты, остальные - из project_admins)';
COMMENT ON POLICY "Anyone can view entity definitions" ON public.entity_definition IS 'Все могут видеть entity definitions (для чтения структуры)';
COMMENT ON POLICY "Admins can manage entity definitions in accessible projects" ON public.entity_definition IS 'superAdmin и projectSuperAdmin могут управлять entity definitions в доступных им проектах (projectAdmin - только чтение)';

