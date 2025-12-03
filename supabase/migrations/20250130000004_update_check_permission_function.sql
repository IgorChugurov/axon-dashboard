-- Обновление функции check_permission для работы с новой структурой админов
-- Проблема: функция использует старую таблицу admins вместо project_admins
-- Решение: обновить функцию для работы с project_admins
-- 
-- ВАЖНО: Не удаляем функцию, так как от неё зависят RLS политики.
-- Используем CREATE OR REPLACE, который заменит функцию с той же сигнатурой.

-- ============================================
-- ОБНОВЛЕНИЕ ФУНКЦИИ check_permission
-- ============================================

-- Заменяем функцию с 3 параметрами (используется в RLS политиках)
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
  -- Используем новую функцию is_any_admin вместо запроса к старой таблице admins
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

-- ============================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON FUNCTION check_permission(TEXT, UUID, UUID) IS 'Проверяет разрешения пользователя. Использует is_any_admin() для проверки админов (работает с project_admins)';

