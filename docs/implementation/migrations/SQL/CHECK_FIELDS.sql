-- Проверка полей для Blocks
-- Выполните этот запрос в Supabase SQL Editor

-- Проверка entity_definition для Blocks
SELECT * FROM entity_definition 
WHERE id = 'e1a00076-cb6d-4884-8da6-048b0a281a70';

-- Проверка полей для Blocks
SELECT 
  id,
  name,
  label,
  for_create_page,
  for_edit_page,
  entity_definition_id
FROM field 
WHERE entity_definition_id = 'e1a00076-cb6d-4884-8da6-048b0a281a70'
ORDER BY display_index;

-- Если полей нет, выполните вставку вручную:
-- INSERT INTO field (...) VALUES (...);

