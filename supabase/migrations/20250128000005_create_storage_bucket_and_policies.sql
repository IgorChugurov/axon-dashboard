-- Создание bucket для файлов и базовых RLS политик
-- Bucket должен быть создан вручную в Supabase Dashboard, но эта миграция создаст его если не существует
-- Политики: загрузка/удаление только админы, чтение - все

-- Создаем bucket для файлов (если не существует)
-- Примечание: если bucket уже создан вручную, эта команда ничего не сделает
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Удаляем старые политики если они существуют (для пересоздания)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;

-- RLS политики для bucket
-- Чтение: все могут читать
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- Загрузка: только админы (базовая политика)
CREATE POLICY "Admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'files'
    AND auth.uid() IN (
      SELECT a.user_id 
      FROM admins a
      JOIN admin_roles ar ON a.role_id = ar.id
      WHERE ar.name IN ('admin', 'superAdmin')
    )
  );

-- Обновление: только админы
CREATE POLICY "Admins can update files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'files'
    AND auth.uid() IN (
      SELECT a.user_id 
      FROM admins a
      JOIN admin_roles ar ON a.role_id = ar.id
      WHERE ar.name IN ('admin', 'superAdmin')
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'files'
    AND auth.uid() IN (
      SELECT a.user_id 
      FROM admins a
      JOIN admin_roles ar ON a.role_id = ar.id
      WHERE ar.name IN ('admin', 'superAdmin')
    )
  );

