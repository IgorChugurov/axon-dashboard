# Руководство по отладке системы ролей

**Дата обновления:** 2025-01-30  
**Версия:** 2.0

> **Примечание:** Основная документация находится в [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md)

## Проблема: projectAdmin не видит проекты

### Диагностика

1. **Проверка записи в project_admins:**

```sql
SELECT
  pa.*,
  ar.name as role_name,
  p.name as project_name
FROM project_admins pa
JOIN admin_roles ar ON pa.role_id = ar.id
LEFT JOIN projects p ON pa.project_id = p.id
WHERE pa.user_id = 'YOUR_USER_ID';
```

2. **Проверка функции is_any_admin:**

```sql
SELECT public.is_any_admin('YOUR_USER_ID');
-- Должно вернуть true для projectAdmin
```

3. **Проверка RLS политики:**

```sql
-- Проверяем, что политика существует
SELECT * FROM pg_policies
WHERE tablename = 'projects'
AND policyname = 'Admins can view accessible projects';

-- Проверяем определение политики
SELECT definition FROM pg_policies
WHERE tablename = 'projects'
AND policyname = 'Admins can view accessible projects';
```

4. **Проверка доступа к проектам напрямую:**

```sql
-- Выполняем запрос от имени пользователя
SET ROLE authenticated;
SET request.jwt.claim.sub = 'YOUR_USER_ID';

SELECT * FROM projects;
-- Должны вернуться только доступные проекты
```

### Возможные проблемы

1. **RLS политика использует удаленную функцию**

   - Проверить, что политика использует `is_super_admin()` и `EXISTS` с `project_admins`
   - НЕ должна использовать `get_accessible_project_ids()`

2. **Сессия не передается правильно**

   - Проверить, что `auth.uid()` возвращает правильный ID
   - Проверить cookies сессии

3. **Запись в project_admins неправильная**
   - `project_id` должен быть NOT NULL для projectAdmin
   - `role_id` должен указывать на правильную роль

### Решение

Если RLS политика правильная, но проекты не видны:

1. Проверить логи в консоли браузера
2. Проверить логи сервера (добавлены в getAllProjectsFromSupabase)
3. Проверить, что сессия передается правильно
