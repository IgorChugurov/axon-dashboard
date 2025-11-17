# Система разрешений для сущностей

## Обзор

Каждая сущность (`entity_definition`) имеет 4 поля разрешений, которые определяют кто может выполнять CRUD операции.

## Поля разрешений

### 1. `create_permission`

- Кто может создавать экземпляры этой сущности
- По умолчанию: `'Admin'`

### 2. `read_permission`

- Кто может просматривать экземпляры этой сущности
- По умолчанию: `'ALL'`

### 3. `update_permission`

- Кто может редактировать экземпляры этой сущности
- По умолчанию: `'Admin'`

### 4. `delete_permission`

- Кто может удалять экземпляры этой сущности
- По умолчанию: `'Admin'`

## Возможные значения

| Значение  | Описание     | Кто имеет доступ                           |
| --------- | ------------ | ------------------------------------------ | ---------------------------------------- |
| `'ALL'`   | Все          | Все пользователи, включая неавторизованных |
| `'User'`  | Пользователи | Только зарегистрированные пользователи     |
| `'Admin'` | Админы       | Только админы (admin или superAdmin)       |
| `'Admin   | User'`       | Админы и пользователи                      | Админы и зарегистрированные пользователи |

## Примеры использования

### Пример 1: Публичная сущность (все могут видеть, только админы управляют)

```sql
INSERT INTO entity_definition (
  name, url, table_name, type, project_id,
  create_permission, read_permission, update_permission, delete_permission
) VALUES (
  'Blog Posts',
  '/api/posts',
  'posts',
  'secondary',
  'project-id',
  'Admin',    -- создавать только админы
  'ALL',      -- просматривать могут все
  'Admin',    -- редактировать только админы
  'Admin'     -- удалять только админы
);
```

### Пример 2: Пользовательский контент (пользователи создают, все видят)

```sql
INSERT INTO entity_definition (
  name, url, table_name, type, project_id,
  create_permission, read_permission, update_permission, delete_permission
) VALUES (
  'User Comments',
  '/api/comments',
  'comments',
  'secondary',
  'project-id',
  'User',         -- создавать могут пользователи
  'ALL',          -- просматривать могут все
  'User',         -- редактировать могут только создатели (нужна дополнительная проверка)
  'User'          -- удалять могут только создатели (нужна дополнительная проверка)
);
```

### Пример 3: Приватная сущность (только админы)

```sql
INSERT INTO entity_definition (
  name, url, table_name, type, project_id,
  create_permission, read_permission, update_permission, delete_permission
) VALUES (
  'Admin Notes',
  '/api/admin-notes',
  'admin_notes',
  'secondary',
  'project-id',
  'Admin',    -- создавать только админы
  'Admin',    -- просматривать только админы
  'Admin',    -- редактировать только админы
  'Admin'     -- удалять только админы
);
```

### Пример 4: Смешанный доступ

```sql
INSERT INTO entity_definition (
  name, url, table_name, type, project_id,
  create_permission, read_permission, update_permission, delete_permission
) VALUES (
  'User Posts',
  '/api/user-posts',
  'user_posts',
  'secondary',
  'project-id',
  'Admin|User',   -- создавать могут админы и пользователи
  'ALL',          -- просматривать могут все
  'Admin|User',   -- редактировать могут админы и пользователи
  'Admin'         -- удалять могут только админы
);
```

## Как это работает

### Функция проверки разрешений

```sql
CREATE OR REPLACE FUNCTION check_permission(
  p_permission TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
```

Функция проверяет:

1. Если `p_permission = 'ALL'` → возвращает `true` (доступно всем)
2. Если пользователь не авторизован → возвращает `false`
3. Проверяет роль пользователя (admin/user)
4. Сравнивает с разрешением

### RLS политики

RLS политики используют функцию `check_permission` для проверки доступа:

```sql
CREATE POLICY "View entity instances based on read_permission"
  ON entity_instance FOR SELECT
  USING (
    check_permission(
      (SELECT read_permission FROM entity_definition WHERE id = entity_instance.entity_definition_id),
      auth.uid()
    )
  );
```

## Ограничения

### Текущая реализация

- ✅ Проверка на уровне БД (RLS)
- ✅ Гибкая настройка для каждой сущности
- ✅ Поддержка всех основных сценариев

### Что не покрыто (требует дополнительной логики)

- ❌ Проверка владельца экземпляра (например, пользователь может редактировать только свои записи)
- ❌ Временные ограничения (например, редактирование только в течение 24 часов)
- ❌ Сложные правила (например, пользователь может редактировать только если статус = 'draft')

**Решение:** Эти проверки нужно делать на уровне приложения (в сервисном слое), а не в RLS.

## Рекомендации

1. **Используйте простые разрешения** для большинства случаев
2. **Для сложных правил** добавьте проверку в сервисный слой
3. **Тестируйте разрешения** после создания новой сущности
4. **Документируйте разрешения** в описании сущности

## Обновление разрешений

Разрешения можно обновить в любой момент:

```sql
UPDATE entity_definition
SET read_permission = 'User'
WHERE id = 'entity-id';
```

RLS политики автоматически применят новые разрешения.
