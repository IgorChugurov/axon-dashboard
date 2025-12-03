-- Миграция для создания унифицированной структуры админов (одна таблица для всех)
-- Все админы (superAdmin, projectSuperAdmin, projectAdmin) хранятся в project_admins
-- superAdmin имеет project_id = NULL (глобальный доступ)
-- projectSuperAdmin и projectAdmin имеют project_id = конкретный проект

-- ============================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ РОЛЕЙ АДМИНОВ
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставка всех ролей
INSERT INTO public.admin_roles (name, description)
VALUES 
  ('superAdmin', 'Super administrator with full access to all projects and admin management rights'),
  ('projectSuperAdmin', 'Project super administrator with full access and admin management rights for specific project'),
  ('projectAdmin', 'Project administrator with limited access to universal entities for specific project')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ PROJECT_ADMINS (все админы)
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL для superAdmin
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Один пользователь = одна роль в проекте (или superAdmin с project_id = NULL)
  CONSTRAINT project_admins_user_project_unique UNIQUE (user_id, project_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS project_admins_project_id_idx ON public.project_admins(project_id);
CREATE INDEX IF NOT EXISTS project_admins_user_id_idx ON public.project_admins(user_id);
CREATE INDEX IF NOT EXISTS project_admins_role_id_idx ON public.project_admins(role_id);
CREATE INDEX IF NOT EXISTS project_admins_project_user_idx ON public.project_admins(project_id, user_id);
-- Индекс для быстрой проверки superAdmin (project_id IS NULL)
CREATE INDEX IF NOT EXISTS project_admins_user_superadmin_idx 
  ON public.project_admins (user_id) 
  WHERE project_id IS NULL;

-- ============================================
-- 3. ТРИГГЕР ДЛЯ ВАЛИДАЦИИ SUPERADMIN
-- ============================================

-- Триггер для валидации: superAdmin должен иметь project_id = NULL
CREATE OR REPLACE FUNCTION public.validate_superadmin_project_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем, если роль superAdmin, то project_id должен быть NULL
  IF EXISTS (
    SELECT 1 FROM admin_roles ar 
    WHERE ar.id = NEW.role_id AND ar.name = 'superAdmin'
  ) AND NEW.project_id IS NOT NULL THEN
    RAISE EXCEPTION 'superAdmin must have project_id = NULL';
  END IF;
  
  -- Проверяем, если project_id = NULL, то роль должна быть superAdmin
  IF NEW.project_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM admin_roles ar 
    WHERE ar.id = NEW.role_id AND ar.name = 'superAdmin'
  ) THEN
    RAISE EXCEPTION 'Only superAdmin can have project_id = NULL';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_superadmin_project_id_trigger
  BEFORE INSERT OR UPDATE ON public.project_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_superadmin_project_id();

-- ============================================
-- 4. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_project_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_admins_updated_at
  BEFORE UPDATE ON public.project_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_admins_updated_at();

-- ============================================
-- 5. ВКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦЫ PROJECT_ADMINS
-- ============================================

ALTER TABLE public.project_admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. ФУНКЦИИ ДЛЯ ПРОВЕРКИ РОЛЕЙ
-- ============================================

-- Функция проверки superAdmin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM project_admins pa
    JOIN admin_roles ar ON pa.role_id = ar.id
    WHERE pa.user_id = user_uuid
      AND ar.name = 'superAdmin'
      AND pa.project_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция проверки любого админа
CREATE OR REPLACE FUNCTION public.is_any_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_admins 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция получения глобальной роли (для middleware)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Проверяем superAdmin (project_id IS NULL)
  SELECT ar.name INTO user_role
  FROM project_admins pa
  JOIN admin_roles ar ON pa.role_id = ar.id
  WHERE pa.user_id = user_uuid
    AND pa.project_id IS NULL
    AND ar.name = 'superAdmin'
  LIMIT 1;
  
  IF user_role IS NOT NULL THEN
    RETURN user_role;
  END IF;
  
  -- Если не superAdmin, проверяем наличие любой роли
  IF EXISTS (SELECT 1 FROM project_admins WHERE user_id = user_uuid) THEN
    RETURN 'admin'; -- Обозначение для любого админа (не superAdmin)
  END IF;
  
  RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция проверки, является ли пользователь суперадмином проекта
CREATE OR REPLACE FUNCTION public.is_project_super_admin(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Сначала проверяем, является ли глобальным superAdmin
  IF EXISTS (
    SELECT 1
    FROM project_admins pa
    JOIN admin_roles ar ON pa.role_id = ar.id
    WHERE pa.user_id = p_user_id
      AND ar.name = 'superAdmin'
      AND pa.project_id IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Потом проверяем, является ли projectSuperAdmin для этого проекта
  RETURN EXISTS (
    SELECT 1
    FROM project_admins pa
    JOIN admin_roles ar ON pa.role_id = ar.id
    WHERE pa.project_id = p_project_id
      AND pa.user_id = p_user_id
      AND ar.name = 'projectSuperAdmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для проверки, является ли пользователь админом проекта (любого типа)
CREATE OR REPLACE FUNCTION public.is_project_admin(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Сначала проверяем, является ли глобальным superAdmin
  IF EXISTS (
    SELECT 1
    FROM project_admins pa
    JOIN admin_roles ar ON pa.role_id = ar.id
    WHERE pa.user_id = p_user_id
      AND ar.name = 'superAdmin'
      AND pa.project_id IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Потом проверяем, является ли админом проекта
  RETURN EXISTS (
    SELECT 1
    FROM project_admins
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения роли пользователя в проекте
CREATE OR REPLACE FUNCTION public.get_user_project_role(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Сначала проверяем, является ли глобальным superAdmin
  IF EXISTS (
    SELECT 1
    FROM project_admins pa
    JOIN admin_roles ar ON pa.role_id = ar.id
    WHERE pa.user_id = p_user_id
      AND ar.name = 'superAdmin'
      AND pa.project_id IS NULL
  ) THEN
    RETURN 'superAdmin';
  END IF;
  
  -- Потом проверяем роль в project_admins
  SELECT ar.name INTO user_role
  FROM project_admins pa
  JOIN admin_roles ar ON pa.role_id = ar.id
  WHERE pa.project_id = p_project_id
    AND pa.user_id = p_user_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция получения доступных проектов
CREATE OR REPLACE FUNCTION public.get_accessible_project_ids(user_uuid UUID) 
RETURNS UUID[] AS $$
DECLARE
  is_super BOOLEAN;
BEGIN
  -- Проверяем, является ли superAdmin
  SELECT EXISTS (
    SELECT 1 FROM project_admins pa
    JOIN admin_roles ar ON pa.role_id = ar.id
    WHERE pa.user_id = user_uuid
      AND ar.name = 'superAdmin'
      AND pa.project_id IS NULL
  ) INTO is_super;
  
  IF is_super THEN
    -- Возвращаем все проекты
    RETURN ARRAY(SELECT id FROM projects);
  ELSE
    -- Возвращаем проекты из project_admins
    RETURN ARRAY(
      SELECT DISTINCT project_id 
      FROM project_admins 
      WHERE user_id = user_uuid
        AND project_id IS NOT NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ PROJECT_ADMINS
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

-- ============================================
-- 8. КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON TABLE public.admin_roles IS 'Роли админов: superAdmin, projectSuperAdmin, projectAdmin';
COMMENT ON TABLE public.project_admins IS 'Все админы системы. superAdmin имеет project_id = NULL (глобальный доступ), проектные роли имеют project_id = конкретный проект.';
COMMENT ON FUNCTION public.is_super_admin IS 'Проверяет, является ли пользователь superAdmin (project_id IS NULL)';
COMMENT ON FUNCTION public.is_any_admin IS 'Проверяет, является ли пользователь любым админом (любая роль в project_admins)';
COMMENT ON FUNCTION public.get_user_role IS 'Возвращает глобальную роль: superAdmin, admin (любой админ) или user';
COMMENT ON FUNCTION public.get_user_project_role IS 'Возвращает роль пользователя в проекте: superAdmin, projectSuperAdmin, projectAdmin или NULL';
COMMENT ON FUNCTION public.get_accessible_project_ids IS 'Возвращает массив ID доступных проектов. Для superAdmin - все проекты, для остальных - из project_admins';

