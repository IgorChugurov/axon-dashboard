# Фаза 1: Таблицы и миграция конфигурации

**Статус:** ✅ Завершено  
**Начало:** 2025-01-XX  
**Завершено:** 2025-01-XX

## Задачи

- [x] 1. Создать таблицы `entity_definition`, `field`
- [x] 2. Мигрировать данные из `entity-lib/data/` в БД
- [x] 3. Создать таблицы `entity_instance`, `entity_relation`
- [x] 4. Настроить индексы и RLS

## Прогресс

### ✅ 1. Создать таблицы `entity_definition`, `field`

**Статус:** ✅ Выполнено  
**Файл:** `docs/implementation/UNIVERSAL_ENTITY_FINAL_MIGRATION.sql`

Таблицы созданы в БД:

- `entity_definition` - конфигурация сущностей
  - ✅ Добавлены поля разрешений: `create_permission`, `read_permission`, `update_permission`, `delete_permission`
  - ✅ Значения: `'ALL'`, `'User'`, `'Admin'`, `'Admin|User'`
- `field` - конфигурация полей

**Документация:** `PERMISSIONS_EXPLANATION.md` - подробное описание системы разрешений

**Результат:** ✅ Таблицы созданы, данные мигрированы (2 entities, 5 fields)

---

### ✅ 2. Мигрировать данные из `entity-lib/data/` в БД

**Статус:** ✅ Выполнено

Данные успешно мигрированы:

- ✅ Entities из `entity-lib/data/entities.ts`:
  - Tags (id: `0de37a7e-d42a-4b51-9f38-a8f616f80d51`)
  - Blocks (id: `e1a00076-cb6d-4884-8da6-048b0a281a70`)
- ✅ Fields из `entity-lib/data/fields.ts`:
  - 3 поля для Tags (name, color, blocks)
  - 3 поля для Blocks (name, body, tags)

**Результат:** ✅ Все данные в БД, связи между полями установлены

---

### ✅ 3. Создать таблицы `entity_instance`, `entity_relation`

**Статус:** ✅ Выполнено

Таблицы созданы в БД:

- ✅ `entity_instance` - все экземпляры сущностей (JSONB подход)
- ✅ `entity_relation` - связи между экземплярами

**Результат:** ✅ Таблицы созданы, готовы к использованию

---

### ✅ 4. Настроить индексы и RLS

**Статус:** ✅ Выполнено

Все настроено в БД:

- ✅ Все необходимые индексы созданы
- ✅ RLS политики для всех таблиц настроены
- ✅ **Функция `check_permission`** - проверка разрешений на уровне БД
- ✅ **RLS политики для `entity_instance`** - учитывают разрешения из `entity_definition`
- ✅ Триггеры для валидации созданы

**Особенности:**

- RLS политики для `entity_instance` динамически проверяют разрешения
- Функция `check_permission` проверяет роль пользователя (Admin/User/ALL)
- Поддержка всех типов разрешений: `'ALL'`, `'User'`, `'Admin'`, `'Admin|User'`

**Результат:** ✅ Система разрешений работает на уровне БД

---

## Инструкции по выполнению

### Как загрузить SQL файл в Supabase

1. **Через Supabase Dashboard:**

   - Откройте [Supabase Dashboard](https://app.supabase.com)
   - Выберите ваш проект
   - Перейдите в **SQL Editor** (в боковом меню)
   - Нажмите **New Query**
   - Скопируйте содержимое файла `UNIVERSAL_ENTITY_FINAL_MIGRATION.sql`
   - Вставьте в редактор
   - Нажмите **Run** (или `Cmd/Ctrl + Enter`)

2. **Через Supabase CLI:**

   ```bash
   # Если у вас установлен Supabase CLI
   supabase db push
   ```

3. **Проверка после выполнения:**

   ```sql
   -- Проверить созданные таблицы
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'entity_definition',
       'field',
       'entity_instance',
       'entity_relation'
     )
   ORDER BY table_name;

   -- Проверить данные
   SELECT
     (SELECT COUNT(*) FROM entity_definition) as entity_definitions_count,
     (SELECT COUNT(*) FROM field) as fields_count;
   ```

## Заметки

- SQL миграция включает все необходимые таблицы, индексы, RLS и данные
- После выполнения миграции можно переходить к Фазе 2
