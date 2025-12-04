# Финальные миграции для нового проекта

Эта папка содержит финальные миграции, которые можно использовать при создании нового проекта с нуля на Supabase.

## 📋 Содержание

- `000_base_tables.sql` - Базовая таблица projects
- `001_complete_roles_and_permissions.sql` - Полная система ролей и разрешений
- `002_universal_entities.sql` - Универсальная система сущностей (entity_definition, field, entity_instance, entity_relation)
- `003_environments.sql` - Переменные окружения
- `004_files_and_storage.sql` - Файлы и Storage

## 🚀 Использование

### Для нового проекта

Выполните миграции в следующем порядке:

1. **`000_base_tables.sql`** - Создает таблицу `projects`
2. **`001_complete_roles_and_permissions.sql`** - Создает систему ролей и RLS политики
3. **`002_universal_entities.sql`** - Создает таблицы для универсальной системы сущностей
4. **`003_environments.sql`** - Создает таблицу `environments` (опционально)
5. **`004_files_and_storage.sql`** - Создает таблицу `entity_file` и storage bucket (опционально)

### Порядок выполнения (важно!)

```
000_base_tables.sql
    ↓
001_complete_roles_and_permissions.sql (требует projects)
    ↓
002_universal_entities.sql (требует projects)
    ↓
003_environments.sql (требует projects)
    ↓
004_files_and_storage.sql (требует entity_instance, field, функции из 001)
```

**Важно:** Миграция `001_complete_roles_and_permissions.sql` должна выполняться **до** `002_universal_entities.sql`, так как RLS политики для entity_definition и field используют функции из миграции ролей.

### Что включает каждая миграция

#### `000_base_tables.sql`

- Таблица `projects` с полями для авторизации

#### `001_complete_roles_and_permissions.sql`

- Таблицы: `admin_roles`, `project_admins`
- Функции: `is_super_admin()`, `is_any_admin()`, `get_user_project_role()`, `check_permission()`
- RLS политики для: `project_admins`, `projects`, `entity_definition`, `field`, `environments`, `entity_instance`, `entity_relation`, `entity_file`
- Constraints для разрешений в `entity_definition` (с поддержкой Owner)

#### `002_universal_entities.sql`

- Таблицы: `entity_definition`, `field`, `entity_instance`, `entity_relation`
- Все поля и индексы
- Триггеры для `updated_at` и валидации

#### `003_environments.sql`

- Таблица `environments` с индексами и триггерами
- RLS включен (политики в миграции 001)

#### `004_files_and_storage.sql`

- Таблица `entity_file` с индексами и триггерами
- Storage bucket `files`
- RLS политики для storage (политики для entity_file в миграции 001)

## ✅ Проверка после миграции

После выполнения всех миграций проверьте:

```sql
-- Проверка функций
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('is_super_admin', 'is_any_admin', 'get_user_project_role', 'check_permission');

-- Проверка таблиц
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'projects', 'admin_roles', 'project_admins',
  'entity_definition', 'field', 'entity_instance', 'entity_relation',
  'environments', 'entity_file'
)
ORDER BY tablename;

-- Проверка RLS
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'project_admins', 'projects', 'entity_definition', 'field',
  'environments', 'entity_instance', 'entity_relation', 'entity_file'
)
ORDER BY tablename, policyname;
```

## 📝 Примечания

- Миграция использует `CREATE OR REPLACE` и `DROP IF EXISTS` для идемпотентности
- Все функции используют `SECURITY DEFINER` для обхода RLS
- Политики используют финальные версии функций (без устаревших)
- Поддерживаются разрешения с Owner опциями

## 🔗 Связанная документация

- [ROLES_AND_PERMISSIONS.md](../../../docs/ROLES_AND_PERMISSIONS.md) - Основная документация по системе ролей
- [MIGRATION_SUMMARY.md](../../../docs/MIGRATION_SUMMARY.md) - Сводка миграций
