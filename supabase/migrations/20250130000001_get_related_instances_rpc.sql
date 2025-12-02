-- Миграция: Создание RPC функции для загрузки связанных инстансов через relations
-- Дата: 2025-01-30
-- Описание: Объединяет загрузку relations и связанных instances в один запрос с JOIN

-- Функция для получения связанных instances через entity_relation
-- Принимает список source_instance_ids и relation_field_ids
-- Возвращает связанные instances с их данными
CREATE OR REPLACE FUNCTION get_related_instances(
  p_source_instance_ids UUID[],
  p_relation_field_ids UUID[]
)
RETURNS TABLE (
  -- Информация о связи
  source_instance_id UUID,
  relation_field_id UUID,
  
  -- Данные связанного instance
  target_instance_id UUID,
  target_entity_definition_id UUID,
  target_project_id UUID,
  target_data JSONB,
  target_created_at TIMESTAMPTZ,
  target_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.source_instance_id,
    er.relation_field_id,
    er.target_instance_id,
    target_ei.entity_definition_id as target_entity_definition_id,
    target_ei.project_id as target_project_id,
    target_ei.data as target_data,
    target_ei.created_at as target_created_at,
    target_ei.updated_at as target_updated_at
  FROM entity_relation er
  INNER JOIN entity_instance target_ei ON er.target_instance_id = target_ei.id
  WHERE er.source_instance_id = ANY(p_source_instance_ids)
    AND er.relation_field_id = ANY(p_relation_field_ids)
  ORDER BY er.source_instance_id, er.relation_field_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION get_related_instances(UUID[], UUID[]) IS 
  'Получить связанные instances через entity_relation. Объединяет загрузку relations и связанных instances в один запрос с JOIN.';

-- Предоставляем права на выполнение функции (указываем полную сигнатуру с типами аргументов)
GRANT EXECUTE ON FUNCTION get_related_instances(UUID[], UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_instances(UUID[], UUID[]) TO anon;

