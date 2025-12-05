# Сводка миграций системы ролей

**Дата:** 2025-01-30

## Порядок выполнения миграций

Миграции должны выполняться в следующем порядке:

1. **`20250130000000_create_unified_admins_structure.sql`**
   - Создает таблицы `admin_roles` и `project_admins`
   - Создает функции: `is_super_admin()`, `is_any_admin()`, `get_user_project_role()`, `is_project_super_admin()`, `is_project_admin()`, `get_user_role()`, `get_accessible_project_ids()`
   - Создает RLS политики для `project_admins`

2. **`20250130000001_fix_project_admins_rls_recursion.sql`**
   - Исправляет рекурсию в RLS политиках `project_admins`
   - Использует функции `is_super_admin()` и `is_project_super_admin()`

3. **`20250130000005_simplify_roles_functions.sql`**
   - Обновляет RLS политики для использования `get_user_project_role()` вместо `is_project_super_admin()`
   - Удаляет избыточные функции: `get_user_role()`, `is_project_super_admin()`, `is_project_admin()`, `get_accessible_project_ids()`
   - Оставляет только 3 функции: `is_super_admin()`, `is_any_admin()`, `get_user_project_role()`

4. **`20250130000006_final_roles_migration.sql`** ⭐ **ФИНАЛЬНАЯ**
   - Обновляет все политики, которые еще используют удаленные функции
   - Заменяет `is_project_super_admin()` на `get_user_project_role()` везде
   - Проверяет наличие всех необходимых функций
   - Идемпотентна (можно выполнять несколько раз)

## Важные замечания

### Функции, которые были удалены

- ❌ `get_user_role(UUID)` - заменена на `is_super_admin()` + `is_any_admin()`
- ❌ `is_project_super_admin(UUID, UUID)` - заменена на проверку результата `get_user_project_role()`
- ❌ `is_project_admin(UUID, UUID)` - заменена на проверку результата `get_user_project_role()`
- ❌ `get_accessible_project_ids(UUID)` - заменена на прямой запрос к `project_admins`

### Функции, которые остались

- ✅ `is_super_admin(UUID)` - проверка глобального superAdmin
- ✅ `is_any_admin(UUID)` - проверка наличия любой роли админа (для middleware)
- ✅ `get_user_project_role(UUID, UUID)` - универсальная функция для получения роли в проекте

### Политики, которые были обновлены

- `project_admins` - все политики (SELECT, INSERT, UPDATE, DELETE)
- `projects` - политика UPDATE
- `entity_definition` - политика для управления
- `field` - политика для управления

## Проверка после миграции

После выполнения всех миграций проверьте:

1. ✅ Все функции существуют:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE pronamespace = 'public'::regnamespace 
   AND proname IN ('is_super_admin', 'is_any_admin', 'get_user_project_role');
   ```

2. ✅ Удаленные функции не существуют:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE pronamespace = 'public'::regnamespace 
   AND proname IN ('is_project_super_admin', 'is_project_admin', 'get_user_role', 'get_accessible_project_ids');
   -- Должно вернуть пустой результат
   ```

3. ✅ Политики используют правильные функции:
   ```sql
   SELECT tablename, policyname, definition 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND definition LIKE '%is_project_super_admin%';
   -- Должно вернуть пустой результат
   ```

## Откат (если необходимо)

Если нужно откатить изменения:

1. Восстановите удаленные функции из миграции `20250130000000_create_unified_admins_structure.sql`
2. Восстановите старые политики из миграций `20250130000001` и `20250130000003`
3. Удалите политики, созданные в `20250130000005` и `20250130000006`

---

**Статус:** ✅ Готово к применению

