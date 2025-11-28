-- Расширение CHECK constraints для поддержки Owner опций в разрешениях
-- Эта миграция обновляет ограничения для полей create_permission, read_permission,
-- update_permission, delete_permission в таблице entity_definition

-- Удаляем старые constraints
ALTER TABLE entity_definition 
DROP CONSTRAINT IF EXISTS entity_definition_create_permission_check,
DROP CONSTRAINT IF EXISTS entity_definition_read_permission_check,
DROP CONSTRAINT IF EXISTS entity_definition_update_permission_check,
DROP CONSTRAINT IF EXISTS entity_definition_delete_permission_check;

-- Добавляем новые constraints с поддержкой Owner опций
ALTER TABLE entity_definition
ADD CONSTRAINT entity_definition_create_permission_check 
  CHECK (create_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
ADD CONSTRAINT entity_definition_read_permission_check 
  CHECK (read_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
ADD CONSTRAINT entity_definition_update_permission_check 
  CHECK (update_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User')),
ADD CONSTRAINT entity_definition_delete_permission_check 
  CHECK (delete_permission IN ('ALL', 'User', 'Admin', 'Admin|User', 'Owner', 'Owner|Admin', 'Owner|User'));

-- Комментарии для документации
COMMENT ON COLUMN entity_definition.create_permission IS 
  'Разрешение на создание: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';
COMMENT ON COLUMN entity_definition.read_permission IS 
  'Разрешение на чтение: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';
COMMENT ON COLUMN entity_definition.update_permission IS 
  'Разрешение на обновление: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';
COMMENT ON COLUMN entity_definition.delete_permission IS 
  'Разрешение на удаление: ALL, User, Admin, Admin|User, Owner, Owner|Admin, Owner|User';

