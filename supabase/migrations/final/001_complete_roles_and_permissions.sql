-- ============================================================================
-- ФИНАЛЬНАЯ МИГРАЦИЯ: Система ролей и разрешений
-- ============================================================================
-- 
-- Эта миграция объединяет все необходимые изменения для системы ролей и разрешений.
-- Используйте эту миграцию при создании нового проекта с нуля.
--
-- Включает:
-- 1. Создание таблиц admin_roles и project_admins
-- 2. Создание функций для проверки ролей
-- 3. RLS политики для всех таблиц
-- 4. Обновление функции check_permission
-- 5. Обновление constraints для разрешений
--
-- ИДЕМПОТЕНТНА: можно выполнять несколько раз безопасно
-- ============================================================================

-- ============================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ РОЛЕЙ АДМИНОВ
-- ============================================================================

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

-- ============================================================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ PROJECT_ADMINS (все админы)
-- ============================================================================

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

-- ============================================================================
-- 3. ТРИГГЕРЫ ДЛЯ ВАЛИДАЦИИ И ОБНОВЛЕНИЯ
-- ============================================================================

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

DROP TRIGGER IF EXISTS validate_superadmin_project_id_trigger ON public.project_admins;
CREATE TRIGGER validate_superadmin_project_id_trigger
  BEFORE INSERT OR UPDATE ON public.project_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_superadmin_project_id();

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.handle_project_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_admins_updated_at ON public.project_admins;
CREATE TRIGGER set_project_admins_updated_at
  BEFORE UPDATE ON public.project_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_admins_updated_at();

-- ============================================================================
-- 4. ВКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦЫ PROJECT_ADMINS
-- ============================================================================

ALTER TABLE public.project_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. ФУНКЦИИ ДЛЯ ПРОВЕРКИ РОЛЕЙ (финальные версии)
-- ============================================================================

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

-- ============================================================================
-- 6. ОБНОВЛЕНИЕ ФУНКЦИИ check_permission
-- ============================================================================

CREATE OR REPLACE FUNCTION check_permission(
  p_permission TEXT,
  p_user_id UUID,
  p_owner_id UUID DEFAULT NULL -- ID владельца записи
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  is_user BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- Если разрешение 'ALL' - доступно всем
  IF p_permission = 'ALL' THEN
    RETURN true;
  END IF;
  
  -- Если пользователь не авторизован
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Проверяем, является ли админом (любым - superAdmin, projectSuperAdmin, projectAdmin)
  SELECT public.is_any_admin(p_user_id) INTO is_admin;
  
  -- Проверяем, является ли зарегистрированным пользователем
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id
  ) INTO is_user;
  
  -- Проверяем, является ли владельцем (если указан owner_id)
  IF p_owner_id IS NOT NULL THEN
    is_owner := (p_user_id = p_owner_id);
  ELSE
    is_owner := false;
  END IF;
  
  -- Проверяем разрешение
  IF p_permission = 'Admin' THEN
    RETURN is_admin;
  ELSIF p_permission = 'User' THEN
    RETURN is_user;
  ELSIF p_permission = 'Admin|User' THEN
    RETURN is_admin OR is_user;
  ELSIF p_permission = 'Owner' THEN
    -- Только владелец
    RETURN is_owner;
  ELSIF p_permission = 'Owner|Admin' THEN
    -- Владелец или админ
    RETURN is_owner OR is_admin;
  ELSIF p_permission = 'Owner|User' THEN
    -- Владелец или любой пользователь
    RETURN is_owner OR is_user;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ОБНОВЛЕНИЕ CONSTRAINTS ДЛЯ РАЗРЕШЕНИЙ В entity_definition
-- ============================================================================

-- Удаляем старые constraints
ALTER TABLE entity_definition 
DROP CONSTRAINT IF EXISTS entity_definition_create_permission_check,
DROP CONSTRAINT IF EXISTS entity_definition_read_permission_check,
DROP CONSTRAINT IF EXISTS entity_definition_update_permission_check,
DROP CONSTRAINT IF EXISTS entity_definition_delete_permission_check;

-- Добавляем новые constraints с поддержкой Owner опций
ALTER TABLE entity_definition
ADD CONSTRAINT entity_definition_create_permission_check 
  CHECK (create_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
ADD CONSTRAINT entity_definition_read_permission_check 
  CHECK (read_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
ADD CONSTRAINT entity_definition_update_permission_check 
  CHECK (update_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
ADD CONSTRAINT entity_definition_delete_permission_check 
  CHECK (delete_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User'));

-- ============================================================================
-- 8. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ PROJECT_ADMINS
-- ============================================================================

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Admins can view project admins" ON public.project_admins;
DROP POLICY IF EXISTS "Admins can insert project admins" ON public.project_admins;
DROP POLICY IF EXISTS "Admins can update project admins" ON public.project_admins;
DROP POLICY IF EXISTS "Admins can delete project admins" ON public.project_admins;

-- Создаем обновленные политики, используя get_user_project_role()
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
      AND public.get_user_project_role(project_admins.project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
    )
    OR
    -- Пользователь может видеть свою запись
    user_id = auth.uid()
  );

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
      AND public.get_user_project_role(project_admins.project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
    )
  );

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
      AND public.get_user_project_role(project_admins.project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
      AND project_admins.user_id != auth.uid()  -- Не может обновить себя
    )
  );

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
      AND public.get_user_project_role(project_admins.project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
      AND project_admins.user_id != auth.uid()  -- Не может удалить себя
    )
  );

-- ============================================================================
-- 9. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ PROJECTS
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Admins can view accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Only superAdmin can create projects" ON public.projects;
DROP POLICY IF EXISTS "SuperAdmin and ProjectSuperAdmin can update projects" ON public.projects;
DROP POLICY IF EXISTS "Only superAdmin can update projects" ON public.projects;
DROP POLICY IF EXISTS "Only superAdmin can delete projects" ON public.projects;

-- Политика: Админы могут видеть доступные им проекты
CREATE POLICY "Admins can view accessible projects"
  ON public.projects
  FOR SELECT
  USING (
    -- superAdmin видит все проекты
    public.is_super_admin(auth.uid())
    OR
    -- Остальные админы видят проекты, где у них есть роль
    -- Используем get_user_project_role() вместо прямого подзапроса
    -- Функция использует SECURITY DEFINER и обходит RLS
    public.get_user_project_role(id, auth.uid()) IS NOT NULL
  );

-- Политика: Только superAdmin может создавать проекты
CREATE POLICY "Only superAdmin can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
  );

-- Политика: superAdmin и projectSuperAdmin могут обновлять проекты
CREATE POLICY "SuperAdmin and ProjectSuperAdmin can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    -- superAdmin может обновлять любые проекты
    public.is_super_admin(auth.uid())
    OR
    -- projectSuperAdmin может обновлять только свой проект
    public.get_user_project_role(id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
  );

-- Политика: Только superAdmin может удалять проекты
CREATE POLICY "Only superAdmin can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
  );

-- ============================================================================
-- 10. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ ENTITY_DEFINITION
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE public.entity_definition ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Anyone can view entity definitions" ON public.entity_definition;
DROP POLICY IF EXISTS "Admins can manage entity definitions" ON public.entity_definition;
DROP POLICY IF EXISTS "Admins can manage entity definitions in accessible projects" ON public.entity_definition;

-- Политика: Все могут видеть entity definitions (для чтения структуры)
CREATE POLICY "Anyone can view entity definitions"
  ON public.entity_definition
  FOR SELECT
  USING (true);

-- Политика: superAdmin и projectSuperAdmin могут управлять entity definitions
CREATE POLICY "Admins can manage entity definitions in accessible projects"
  ON public.entity_definition
  FOR ALL
  USING (
    -- Проверяем доступ к проекту и роль
    (
      public.is_super_admin(auth.uid())
      OR
      public.get_user_project_role(project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
    )
  )
  WITH CHECK (
    -- При создании/обновлении также проверяем доступ к проекту и роль
    (
      public.is_super_admin(auth.uid())
      OR
      public.get_user_project_role(project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
    )
  );

-- ============================================================================
-- 11. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ FIELD
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE public.field ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Anyone can view fields" ON public.field;
DROP POLICY IF EXISTS "Admins can manage fields" ON public.field;
DROP POLICY IF EXISTS "Admins can manage fields in accessible projects" ON public.field;

-- Политика: Все могут видеть fields (для чтения структуры)
CREATE POLICY "Anyone can view fields"
  ON public.field
  FOR SELECT
  USING (true);

-- Политика: Админы могут управлять fields в доступных им проектах
CREATE POLICY "Admins can manage fields in accessible projects"
  ON public.field
  FOR ALL
  USING (
    -- Проверяем доступ к проекту через entity_definition
    EXISTS (
      SELECT 1
      FROM entity_definition ed
      WHERE ed.id = field.entity_definition_id
        AND (
          public.is_super_admin(auth.uid())
          OR
          public.get_user_project_role(ed.project_id, auth.uid()) IS NOT NULL
        )
    )
  )
  WITH CHECK (
    -- При создании/обновлении также проверяем доступ к проекту
    EXISTS (
      SELECT 1
      FROM entity_definition ed
      WHERE ed.id = field.entity_definition_id
        AND (
          public.is_super_admin(auth.uid())
          OR
          public.get_user_project_role(ed.project_id, auth.uid()) IS NOT NULL
        )
    )
  );

-- ============================================================================
-- 12. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ ENVIRONMENTS
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can view environments of their projects" ON environments;
DROP POLICY IF EXISTS "Admins can manage environments" ON environments;

-- Политика: Админы могут видеть environments своих проектов
CREATE POLICY "Users can view environments of their projects"
  ON environments
  FOR SELECT
  USING (
    -- superAdmin видит все
    public.is_super_admin(auth.uid())
    OR
    -- Остальные админы видят environments своих проектов
    public.get_user_project_role(environments.project_id, auth.uid()) IS NOT NULL
  );

-- Политика: superAdmin и projectSuperAdmin могут управлять environments
CREATE POLICY "Admins can manage environments"
  ON environments
  FOR ALL
  USING (
    -- superAdmin может управлять всеми
    public.is_super_admin(auth.uid())
    OR
    -- projectSuperAdmin может управлять environments своего проекта
    public.get_user_project_role(environments.project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
  )
  WITH CHECK (
    -- При создании/обновлении также проверяем
    (
      public.is_super_admin(auth.uid())
      OR
      public.get_user_project_role(environments.project_id, auth.uid()) IN ('superAdmin', 'projectSuperAdmin')
    )
  );

-- ============================================================================
-- 13. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ ENTITY_INSTANCE (с поддержкой владельца)
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE entity_instance ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "View entity instances based on read_permission" ON entity_instance;
DROP POLICY IF EXISTS "Create entity instances based on create_permission" ON entity_instance;
DROP POLICY IF EXISTS "Update entity instances based on update_permission" ON entity_instance;
DROP POLICY IF EXISTS "Delete entity instances based on delete_permission" ON entity_instance;
DROP POLICY IF EXISTS "Anyone can view entity instances" ON entity_instance;
DROP POLICY IF EXISTS "Admins can create entity instances" ON entity_instance;
DROP POLICY IF EXISTS "Admins can update entity instances" ON entity_instance;
DROP POLICY IF EXISTS "Admins can delete entity instances" ON entity_instance;

-- Политики с поддержкой владельца и разрешений из entity_definition
CREATE POLICY "View entity instances based on read_permission"
  ON entity_instance FOR SELECT
  USING (
    check_permission(
      (SELECT read_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      entity_instance.created_by
    )
  );

CREATE POLICY "Create entity instances based on create_permission"
  ON entity_instance FOR INSERT
  WITH CHECK (
    check_permission(
      (SELECT create_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      NULL -- при создании владелец еще не определен
    )
    -- Автоматически устанавливаем created_by = текущий пользователь
    AND (
      entity_instance.created_by = auth.uid() 
      OR entity_instance.created_by IS NULL
    )
  );

CREATE POLICY "Update entity instances based on update_permission"
  ON entity_instance FOR UPDATE
  USING (
    check_permission(
      (SELECT update_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      entity_instance.created_by
    )
  );

CREATE POLICY "Delete entity instances based on delete_permission"
  ON entity_instance FOR DELETE
  USING (
    check_permission(
      (SELECT delete_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      entity_instance.created_by
    )
  );

-- ============================================================================
-- 14. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ ENTITY_FILE
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE entity_file ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "View files based on entity read_permission" ON entity_file;
DROP POLICY IF EXISTS "Create files based on entity create_permission" ON entity_file;
DROP POLICY IF EXISTS "Update files based on entity update_permission" ON entity_file;
DROP POLICY IF EXISTS "Delete files based on entity delete_permission" ON entity_file;

-- Чтение: на основе read_permission из EntityDefinition
CREATE POLICY "View files based on entity read_permission"
  ON entity_file FOR SELECT
  USING (
    check_permission(
      (
        SELECT read_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_file.entity_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_file.entity_instance_id
      )
    )
  );

-- Создание: на основе create_permission из EntityDefinition
CREATE POLICY "Create files based on entity create_permission"
  ON entity_file FOR INSERT
  WITH CHECK (
    check_permission(
      (
        SELECT create_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_file.entity_instance_id
      ),
      auth.uid(),
      NULL
    )
    -- Автоматически устанавливаем uploaded_by = текущий пользователь
    AND (
      entity_file.uploaded_by = auth.uid() 
      OR entity_file.uploaded_by IS NULL
    )
  );

-- Обновление: на основе update_permission из EntityDefinition
CREATE POLICY "Update files based on entity update_permission"
  ON entity_file FOR UPDATE
  USING (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_file.entity_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_file.entity_instance_id
      )
    )
  );

-- Удаление: на основе delete_permission из EntityDefinition
CREATE POLICY "Delete files based on entity delete_permission"
  ON entity_file FOR DELETE
  USING (
    check_permission(
      (
        SELECT delete_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_file.entity_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_file.entity_instance_id
      )
    )
  );

-- ============================================================================
-- 15. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ ENTITY_RELATION
-- ============================================================================

-- Включаем RLS (если еще не включен)
ALTER TABLE entity_relation ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Anyone can view entity relations" ON entity_relation;
DROP POLICY IF EXISTS "View entity relations based on read_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can create entity relations" ON entity_relation;
DROP POLICY IF EXISTS "Create entity relations based on update_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can update entity relations" ON entity_relation;
DROP POLICY IF EXISTS "Update entity relations based on update_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can delete entity relations" ON entity_relation;
DROP POLICY IF EXISTS "Delete entity relations based on update_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can manage entity relations" ON entity_relation;

-- SELECT: на основе read_permission из EntityDefinition для source_instance
CREATE POLICY "View entity relations based on read_permission"
  ON entity_relation FOR SELECT
  USING (
    check_permission(
      (
        SELECT read_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- INSERT: на основе update_permission из EntityDefinition для source_instance
CREATE POLICY "Create entity relations based on update_permission"
  ON entity_relation FOR INSERT
  WITH CHECK (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- UPDATE: на основе update_permission из EntityDefinition для source_instance
CREATE POLICY "Update entity relations based on update_permission"
  ON entity_relation FOR UPDATE
  USING (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- DELETE: на основе update_permission из EntityDefinition для source_instance
CREATE POLICY "Delete entity relations based on update_permission"
  ON entity_relation FOR DELETE
  USING (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- ============================================================================
-- 16. КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================================================

COMMENT ON TABLE public.admin_roles IS 'Роли админов: superAdmin, projectSuperAdmin, projectAdmin';
COMMENT ON TABLE public.project_admins IS 'Все админы системы. superAdmin имеет project_id = NULL (глобальный доступ), проектные роли имеют project_id = конкретный проект.';

COMMENT ON FUNCTION public.is_super_admin IS 'Проверяет, является ли пользователь superAdmin (project_id IS NULL)';
COMMENT ON FUNCTION public.is_any_admin IS 'Проверяет, является ли пользователь любым админом (любая роль в project_admins). Используется для middleware.';
COMMENT ON FUNCTION public.get_user_project_role IS 'Возвращает роль пользователя в проекте: superAdmin, projectSuperAdmin, projectAdmin или NULL. Универсальная функция для получения роли. Использует SECURITY DEFINER для обхода RLS.';
COMMENT ON FUNCTION check_permission IS 'Проверяет разрешения пользователя. Использует is_any_admin() для проверки админов (работает с project_admins). Поддерживает Owner опции.';

COMMENT ON POLICY "Admins can view accessible projects" ON public.projects IS 
  'Админы могут видеть только доступные им проекты (superAdmin - все, остальные - из project_admins). Использует get_user_project_role() для обхода RLS.';
COMMENT ON POLICY "SuperAdmin and ProjectSuperAdmin can update projects" ON public.projects IS 
  'superAdmin может обновлять любые проекты, projectSuperAdmin - только свой проект';
COMMENT ON POLICY "Admins can manage entity definitions in accessible projects" ON public.entity_definition IS 
  'superAdmin и projectSuperAdmin могут управлять entity definitions в доступных им проектах (projectAdmin - только чтение)';
COMMENT ON POLICY "Admins can manage fields in accessible projects" ON public.field IS 
  'Админы могут управлять fields в доступных им проектах (superAdmin - все проекты, остальные - из project_admins)';

-- ============================================================================
-- 17. ПРОВЕРКА: Убеждаемся, что все необходимые функции существуют
-- ============================================================================

DO $$
BEGIN
  -- is_super_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_super_admin'
  ) THEN
    RAISE EXCEPTION 'Функция is_super_admin() не найдена!';
  END IF;

  -- is_any_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_any_admin'
  ) THEN
    RAISE EXCEPTION 'Функция is_any_admin() не найдена!';
  END IF;

  -- get_user_project_role
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_project_role'
  ) THEN
    RAISE EXCEPTION 'Функция get_user_project_role() не найдена!';
  END IF;
END $$;

-- ============================================================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================================================

