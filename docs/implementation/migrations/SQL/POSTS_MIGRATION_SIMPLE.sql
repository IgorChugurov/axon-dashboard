-- =====================================================
-- Упрощенная миграция для системы постов/авторов/тегов
-- БЕЗ RLS политик (добавим их позже)
-- =====================================================

-- 1. Таблица авторов
-- =====================================================
CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_authors_email ON authors(email);

-- 2. Таблица тегов
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по slug
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- 3. Таблица постов
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для постов
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);

-- 4. Связующая таблица (many-to-many): посты ↔ теги
-- =====================================================
CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- 5. Функция для автоматического обновления updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для авторов
DROP TRIGGER IF EXISTS update_authors_updated_at ON authors;
CREATE TRIGGER update_authors_updated_at
  BEFORE UPDATE ON authors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для тегов
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для постов
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Функции для работы с many-to-many фильтрами
-- =====================================================

-- Функция для получения постов с ЛЮБЫМ из тегов (OR режим)
CREATE OR REPLACE FUNCTION get_posts_with_any_tags(tag_ids UUID[])
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT post_id AS id
  FROM post_tags
  WHERE tag_id = ANY(tag_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения постов со ВСЕМИ тегами (AND режим)
CREATE OR REPLACE FUNCTION get_posts_with_all_tags(tag_ids UUID[])
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT post_id AS id
  FROM post_tags
  WHERE tag_id = ANY(tag_ids)
  GROUP BY post_id
  HAVING COUNT(DISTINCT tag_id) = array_length(tag_ids, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Временно отключаем RLS (включим позже с правильными политиками)
-- =====================================================
ALTER TABLE authors DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags DISABLE ROW LEVEL SECURITY;

-- 8. Тестовые данные (опционально)
-- =====================================================

-- Создаем тестовых авторов
INSERT INTO authors (name, email, bio) VALUES
  ('John Doe', 'john@example.com', 'Senior developer and tech writer'),
  ('Jane Smith', 'jane@example.com', 'Frontend specialist')
ON CONFLICT (email) DO NOTHING;

-- Создаем тестовые теги
INSERT INTO tags (name, slug, color) VALUES
  ('JavaScript', 'javascript', '#f7df1e'),
  ('TypeScript', 'typescript', '#3178c6'),
  ('React', 'react', '#61dafb'),
  ('Next.js', 'nextjs', '#000000'),
  ('Supabase', 'supabase', '#3ecf8e')
ON CONFLICT (slug) DO NOTHING;

-- Создаем тестовые посты
DO $$
DECLARE
  author1_id UUID;
  author2_id UUID;
  post1_id UUID;
  post2_id UUID;
  tag_js_id UUID;
  tag_ts_id UUID;
  tag_react_id UUID;
  tag_next_id UUID;
BEGIN
  -- Получаем ID авторов
  SELECT id INTO author1_id FROM authors WHERE email = 'john@example.com';
  SELECT id INTO author2_id FROM authors WHERE email = 'jane@example.com';

  -- Получаем ID тегов
  SELECT id INTO tag_js_id FROM tags WHERE slug = 'javascript';
  SELECT id INTO tag_ts_id FROM tags WHERE slug = 'typescript';
  SELECT id INTO tag_react_id FROM tags WHERE slug = 'react';
  SELECT id INTO tag_next_id FROM tags WHERE slug = 'nextjs';

  -- Создаем пост 1
  INSERT INTO posts (title, slug, content, excerpt, status, author_id, published_at)
  VALUES (
    'Getting Started with Next.js 15',
    'getting-started-nextjs-15',
    'Learn how to build modern web applications with Next.js 15...',
    'A comprehensive guide to Next.js 15',
    'published',
    author1_id,
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO post1_id;

  -- Связываем пост 1 с тегами
  IF post1_id IS NOT NULL THEN
    INSERT INTO post_tags (post_id, tag_id) VALUES
      (post1_id, tag_ts_id),
      (post1_id, tag_react_id),
      (post1_id, tag_next_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Создаем пост 2
  INSERT INTO posts (title, slug, content, excerpt, status, author_id, published_at)
  VALUES (
    'TypeScript Best Practices 2025',
    'typescript-best-practices-2025',
    'Discover the latest TypeScript patterns and practices...',
    'Modern TypeScript development guide',
    'published',
    author2_id,
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO post2_id;

  -- Связываем пост 2 с тегами
  IF post2_id IS NOT NULL THEN
    INSERT INTO post_tags (post_id, tag_id) VALUES
      (post2_id, tag_ts_id),
      (post2_id, tag_js_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- Проверка создания таблиц и данных
-- =====================================================

SELECT 'Migration completed successfully!' AS status;

-- Проверяем созданные таблицы
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('authors', 'tags', 'posts', 'post_tags')
ORDER BY table_name;

-- Проверяем данные
SELECT 
  (SELECT COUNT(*) FROM authors) as authors_count,
  (SELECT COUNT(*) FROM tags) as tags_count,
  (SELECT COUNT(*) FROM posts) as posts_count,
  (SELECT COUNT(*) FROM post_tags) as post_tags_count;

-- Показываем созданные посты с авторами и тегами
SELECT 
  p.title,
  p.status,
  a.name as author_name,
  STRING_AGG(t.name, ', ') as tags
FROM posts p
LEFT JOIN authors a ON p.author_id = a.id
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id, p.title, p.status, a.name
ORDER BY p.created_at DESC;

