-- =====================================================
-- Исправление RLS политик для системы постов
-- =====================================================
-- Проблема: колонка "role" не существует в таблице admins
-- Решение: проверяем просто наличие user_id в admins
-- =====================================================

-- Сначала удаляем старые политики, если они были созданы
DROP POLICY IF EXISTS "Admins can create authors" ON authors;
DROP POLICY IF EXISTS "Admins can update authors" ON authors;
DROP POLICY IF EXISTS "Admins can delete authors" ON authors;

DROP POLICY IF EXISTS "Admins can create tags" ON tags;
DROP POLICY IF EXISTS "Admins can update tags" ON tags;
DROP POLICY IF EXISTS "Admins can delete tags" ON tags;

DROP POLICY IF EXISTS "Anyone can view published posts" ON posts;
DROP POLICY IF EXISTS "Admins can create posts" ON posts;
DROP POLICY IF EXISTS "Admins can update posts" ON posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON posts;

DROP POLICY IF EXISTS "Admins can create post_tags" ON post_tags;
DROP POLICY IF EXISTS "Admins can delete post_tags" ON post_tags;

-- =====================================================
-- Новые упрощенные политики для авторов
-- =====================================================

-- Создание: только админы (проверяем наличие в таблице admins)
CREATE POLICY "Admins can create authors"
  ON authors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Обновление: только админы
CREATE POLICY "Admins can update authors"
  ON authors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete authors"
  ON authors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Политики для тегов
-- =====================================================

-- Создание: только админы
CREATE POLICY "Admins can create tags"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Обновление: только админы
CREATE POLICY "Admins can update tags"
  ON tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete tags"
  ON tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Политики для постов
-- =====================================================

-- Чтение: 
-- - Опубликованные посты доступны всем (даже без авторизации)
-- - Черновики и архивные - только админам
CREATE POLICY "Anyone can view published posts"
  ON posts FOR SELECT
  USING (
    status = 'published'
    OR (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM admins WHERE user_id = auth.uid()
      )
    )
  );

-- Создание: только админы
CREATE POLICY "Admins can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Обновление: только админы
CREATE POLICY "Admins can update posts"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Удаление: только админы
CREATE POLICY "Admins can delete posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Политики для post_tags (связующая таблица)
-- =====================================================

-- Создание: только админы (при создании поста)
CREATE POLICY "Admins can create post_tags"
  ON post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Удаление: только админы (при обновлении/удалении поста)
CREATE POLICY "Admins can delete post_tags"
  ON post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Проверка
-- =====================================================
SELECT 'RLS policies fixed successfully!' AS status;

-- Проверяем созданные политики
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('authors', 'tags', 'posts', 'post_tags')
ORDER BY tablename, policyname;

