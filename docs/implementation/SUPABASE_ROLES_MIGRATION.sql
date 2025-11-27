-- Миграция для создания системы ролей и прав доступа
-- Выполните этот SQL в Supabase Dashboard → SQL Editor
-- ВАЖНО: Сначала выполните базовую миграцию SUPABASE_MIGRATION.sql

-- ============================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ РОЛЕЙ АДМИНОВ
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставка ролей
INSERT INTO public.admin_roles (name, description)
VALUES 
  ('admin', 'Regular administrator with full access to dashboard'),
  ('superAdmin', 'Super administrator with full access and admin management rights')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ АДМИНОВ
-- ============================================

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role_id UUID REFERENCES public.admin_roles(id) ON DELETE RESTRICT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS admins_user_id_idx ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS admins_role_id_idx ON public.admins(role_id);

-- ============================================
-- 3. ВКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦЫ АДМИНОВ
-- ============================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Функция для проверки, является ли пользователь суперадмином
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins a
    JOIN public.admin_roles ar ON a.role_id = ar.id
    WHERE a.user_id = user_uuid
      AND ar.name = 'superAdmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для проверки, является ли пользователь админом (любого типа)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ АДМИНОВ
-- ============================================

-- Политика: только суперадмины могут читать список админов
CREATE POLICY "Only super admins can view admins"
  ON public.admins
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Политика: только суперадмины могут добавлять админов
CREATE POLICY "Only super admins can insert admins"
  ON public.admins
  FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Политика: только суперадмины могут обновлять админов
-- И нельзя изменить роль суперадмина на другую
CREATE POLICY "Only super admins can update admins"
  ON public.admins
  FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    AND NOT EXISTS (
      SELECT 1
      FROM public.admin_roles ar
      WHERE ar.id = admins.role_id
        AND ar.name = 'superAdmin'
    )
  );

-- Политика: только суперадмины могут удалять админов
-- И нельзя удалить суперадмина
CREATE POLICY "Only super admins can delete admins"
  ON public.admins
  FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    AND NOT EXISTS (
      SELECT 1
      FROM public.admin_roles ar
      WHERE ar.id = admins.role_id
        AND ar.name = 'superAdmin'
    )
  );

-- Политика: пользователь может видеть свою собственную запись в admins
-- (необходимо для работы функции get_user_role, чтобы пользователь мог проверить свою роль)
CREATE POLICY "Users can view own admin record"
  ON public.admins
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 5. ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admins_updated_at();

-- ============================================
-- 6. ФУНКЦИЯ ДЛЯ СОЗДАНИЯ СУПЕРАДМИНА
-- ============================================

CREATE OR REPLACE FUNCTION public.create_super_admin()
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  super_admin_role_id UUID;
BEGIN
  -- Получаем ID роли superAdmin
  SELECT id INTO super_admin_role_id
  FROM public.admin_roles
  WHERE name = 'superAdmin'
  LIMIT 1;

  IF super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Super admin role not found';
  END IF;

  -- Проверяем, существует ли уже пользователь с таким email
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'igorchugurov@gmail.com'
  LIMIT 1;

  -- Если пользователь не существует, создаем его
  IF new_user_id IS NULL THEN
    -- Создаем пользователя через auth.users (требует Service Role Key)
    -- Это нужно делать через Admin API, поэтому здесь только проверка
    RAISE NOTICE 'User with email igorchugurov@gmail.com does not exist. Please create it first through Supabase Auth API.';
    RETURN NULL;
  END IF;

  -- Проверяем, не является ли уже админом
  IF EXISTS (SELECT 1 FROM public.admins WHERE user_id = new_user_id) THEN
    RAISE NOTICE 'User is already an admin';
    RETURN new_user_id;
  END IF;

  -- Добавляем в таблицу админов
  INSERT INTO public.admins (user_id, role_id)
  VALUES (new_user_id, super_admin_role_id)
  ON CONFLICT (user_id) DO UPDATE
  SET role_id = super_admin_role_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ РОЛИ ПОЛЬЗОВАТЕЛЯ
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Проверяем, является ли админом
  SELECT ar.name INTO user_role
  FROM public.admins a
  JOIN public.admin_roles ar ON a.role_id = ar.id
  WHERE a.user_id = user_uuid
  LIMIT 1;

  -- Если не админ, возвращаем 'user'
  IF user_role IS NULL THEN
    RETURN 'user';
  END IF;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. ОБНОВЛЕНИЕ ТАБЛИЦЫ PROFILES (добавляем helper поле)
-- ============================================

-- Добавляем функцию для получения роли из profiles (опционально)
-- Это можно использовать для быстрой проверки без JOIN

-- ============================================
-- 9. ПРИМЕЧАНИЯ
-- ============================================

-- ВАЖНО: 
-- 1. Функция create_super_admin() требует, чтобы пользователь уже существовал в auth.users
-- 2. Для создания пользователя используйте Supabase Admin API или создайте вручную через Dashboard
-- 3. После создания пользователя выполните:
--    SELECT public.create_super_admin();
-- 4. Или используйте скрипт на Node.js для автоматического создания (см. create-super-admin.ts)

