-- Обновление RLS политик для entity_instance с поддержкой владельца
-- Политики теперь учитывают created_by для проверки владельца

-- Удаляем старые политики
DROP POLICY IF EXISTS "View entity instances based on read_permission" ON entity_instance;
DROP POLICY IF EXISTS "Create entity instances based on create_permission" ON entity_instance;
DROP POLICY IF EXISTS "Update entity instances based on update_permission" ON entity_instance;
DROP POLICY IF EXISTS "Delete entity instances based on delete_permission" ON entity_instance;

-- Новые политики с поддержкой владельца
CREATE POLICY "View entity instances based on read_permission"
  ON entity_instance FOR SELECT
  USING (
    check_permission(
      (SELECT read_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      entity_instance.created_by
    )
  );

CREATE POLICY "Create entity instances based on create_permission"
  ON entity_instance FOR INSERT
  WITH CHECK (
    check_permission(
      (SELECT create_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      NULL -- при создании владелец еще не определен
    )
    -- Автоматически устанавливаем created_by = текущий пользователь
    AND (
      entity_instance.created_by = auth.uid() 
      OR entity_instance.created_by IS NULL
    )
  );

CREATE POLICY "Update entity instances based on update_permission"
  ON entity_instance FOR UPDATE
  USING (
    check_permission(
      (SELECT update_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      entity_instance.created_by
    )
  );

CREATE POLICY "Delete entity instances based on delete_permission"
  ON entity_instance FOR DELETE
  USING (
    check_permission(
      (SELECT delete_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid(),
      entity_instance.created_by
    )
  );

