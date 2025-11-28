-- RLS политики для entity_file
-- Политики основаны на разрешениях из EntityDefinition с поддержкой владельца

-- Включаем RLS
ALTER TABLE entity_file ENABLE ROW LEVEL SECURITY;

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

