-- RLS политики для entity_relation
-- Политики основаны на разрешениях из EntityDefinition для source_instance
-- Связи можно создавать/удалять/обновлять, если пользователь может обновлять source_instance

-- Включаем RLS (если еще не включен)
ALTER TABLE entity_relation ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть) для пересоздания
DROP POLICY IF EXISTS "Anyone can view entity relations" ON entity_relation;
DROP POLICY IF EXISTS "View entity relations based on read_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can create entity relations" ON entity_relation;
DROP POLICY IF EXISTS "Create entity relations based on update_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can update entity relations" ON entity_relation;
DROP POLICY IF EXISTS "Update entity relations based on update_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can delete entity relations" ON entity_relation;
DROP POLICY IF EXISTS "Delete entity relations based on update_permission" ON entity_relation;
DROP POLICY IF EXISTS "Admins can manage entity relations" ON entity_relation;

-- SELECT: на основе read_permission из EntityDefinition для source_instance
-- Если read_permission = 'ALL', то доступно всем
CREATE POLICY "View entity relations based on read_permission"
  ON entity_relation FOR SELECT
  USING (
    check_permission(
      (
        SELECT read_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- INSERT: на основе update_permission из EntityDefinition для source_instance
-- Связи создаются при обновлении сущности, поэтому проверяем update_permission
CREATE POLICY "Create entity relations based on update_permission"
  ON entity_relation FOR INSERT
  WITH CHECK (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- UPDATE: на основе update_permission из EntityDefinition для source_instance
-- Эта политика критична для исправления ошибки 42501 при обновлении сущностей
CREATE POLICY "Update entity relations based on update_permission"
  ON entity_relation FOR UPDATE
  USING (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

-- DELETE: на основе update_permission из EntityDefinition для source_instance
-- Связи удаляются при обновлении сущности, поэтому проверяем update_permission
CREATE POLICY "Delete entity relations based on update_permission"
  ON entity_relation FOR DELETE
  USING (
    check_permission(
      (
        SELECT update_permission 
        FROM entity_definition ed
        JOIN entity_instance ei ON ed.id = ei.entity_definition_id
        WHERE ei.id = entity_relation.source_instance_id
      ),
      auth.uid(),
      (
        SELECT created_by 
        FROM entity_instance 
        WHERE id = entity_relation.source_instance_id
      )
    )
  );

