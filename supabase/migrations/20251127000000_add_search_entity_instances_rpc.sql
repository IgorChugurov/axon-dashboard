-- Миграция: Создание RPC функции для поиска entity instances по JSONB полям
-- Дата: 2025-11-27

-- Функция для поиска entity instances с поддержкой ILIKE по JSONB полям
CREATE OR REPLACE FUNCTION search_entity_instances(
  p_entity_definition_id UUID,
  p_project_id UUID,
  p_search_term TEXT,
  p_search_fields TEXT[] DEFAULT ARRAY['name'],
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  entity_definition_id UUID,
  project_id UUID,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  search_pattern TEXT;
BEGIN
  -- Формируем паттерн для ILIKE
  search_pattern := '%' || p_search_term || '%';
  
  RETURN QUERY
  WITH filtered AS (
    SELECT 
      ei.id,
      ei.entity_definition_id,
      ei.project_id,
      ei.data,
      ei.created_at,
      ei.updated_at
    FROM entity_instance ei
    WHERE ei.entity_definition_id = p_entity_definition_id
      AND ei.project_id = p_project_id
      AND (
        -- Проверяем каждое поле из массива search_fields
        EXISTS (
          SELECT 1 
          FROM unnest(p_search_fields) AS field_name
          WHERE ei.data->>field_name ILIKE search_pattern
        )
      )
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered
  )
  SELECT 
    f.id,
    f.entity_definition_id,
    f.project_id,
    f.data,
    f.created_at,
    f.updated_at,
    c.cnt AS total_count
  FROM filtered f, counted c
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION search_entity_instances IS 'Поиск entity instances по текстовым полям в JSONB data с поддержкой ILIKE';

