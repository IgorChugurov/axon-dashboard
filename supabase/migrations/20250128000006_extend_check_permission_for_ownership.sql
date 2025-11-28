-- Расширение функции check_permission для поддержки владельца записи
-- Добавляет новые типы разрешений: Owner, Owner|Admin, Owner|User

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
  
  -- Проверяем, является ли админом
  SELECT EXISTS (
    SELECT 1 
    FROM admins a
    JOIN admin_roles ar ON a.role_id = ar.id
    WHERE a.user_id = p_user_id 
      AND ar.name IN ('admin', 'superAdmin')
  ) INTO is_admin;
  
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
    -- Новое: только владелец
    RETURN is_owner;
  ELSIF p_permission = 'Owner|Admin' THEN
    -- Новое: владелец или админ
    RETURN is_owner OR is_admin;
  ELSIF p_permission = 'Owner|User' THEN
    -- Новое: владелец или любой пользователь
    RETURN is_owner OR is_user;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

