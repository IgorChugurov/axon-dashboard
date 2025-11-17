# Как выполнить SQL миграцию в Supabase

## Способ 1: Через Supabase Dashboard (Рекомендуется)

### Шаги:

1. **Откройте Supabase Dashboard**

   - Перейдите на https://app.supabase.com
   - Войдите в свой аккаунт
   - Выберите нужный проект

2. **Откройте SQL Editor**

   - В левом боковом меню найдите **SQL Editor**
   - Или перейдите по прямой ссылке: `https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql`

3. **Создайте новый запрос**

   - Нажмите кнопку **New Query** (или `+` вверху)
   - Откроется редактор SQL

4. **Скопируйте SQL миграцию**

   - Откройте файл: `docs/implementation/UNIVERSAL_ENTITY_FINAL_MIGRATION.sql`
   - Скопируйте **весь** содержимое файла (Cmd/Ctrl + A, затем Cmd/Ctrl + C)

5. **Вставьте в редактор**

   - Вставьте скопированный SQL в редактор (Cmd/Ctrl + V)

6. **Выполните миграцию**

   - Нажмите кнопку **Run** (внизу справа)
   - Или используйте горячую клавишу: `Cmd + Enter` (Mac) / `Ctrl + Enter` (Windows/Linux)

7. **Проверьте результат**
   - Внизу появится результат выполнения
   - Должно быть сообщение: `Migration completed successfully!`
   - Проверьте количество созданных записей

### Проверка после выполнения:

Выполните этот запрос в SQL Editor для проверки:

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

-- Проверить конкретные записи
SELECT * FROM entity_definition;
SELECT * FROM field ORDER BY entity_definition_id, display_index;
```

**Ожидаемый результат:**

- `entity_definitions_count` = 2 (Tags и Blocks)
- `fields_count` = 5 (3 для Tags + 2 для Blocks, или больше если есть связи)

---

## Способ 2: Через Supabase CLI

Если у вас установлен Supabase CLI:

```bash
# Перейдите в корень проекта
cd /Users/igorchugurov/Documents/GitHub/OUR-pack/axon-dashboard

# Подключитесь к проекту (если еще не подключены)
supabase link --project-ref YOUR_PROJECT_REF

# Выполните миграцию
supabase db push

# Или выполните SQL файл напрямую
supabase db execute -f docs/implementation/UNIVERSAL_ENTITY_FINAL_MIGRATION.sql
```

---

## Возможные проблемы и решения

### Проблема 1: Ошибка "relation 'projects' does not exist"

**Причина:** Таблица `projects` еще не создана в БД.

**Решение:**

- Убедитесь, что таблица `projects` существует
- Или временно закомментируйте `REFERENCES projects(id)` и создайте таблицу позже

### Проблема 2: Ошибка "duplicate key value violates unique constraint"

**Причина:** Таблицы или данные уже существуют.

**Решение:**

- SQL использует `IF NOT EXISTS` и `ON CONFLICT DO NOTHING`, так что это не должно быть проблемой
- Если все же возникает, удалите существующие таблицы:
  ```sql
  DROP TABLE IF EXISTS entity_relation CASCADE;
  DROP TABLE IF EXISTS entity_instance CASCADE;
  DROP TABLE IF EXISTS field CASCADE;
  DROP TABLE IF EXISTS entity_definition CASCADE;
  ```
- Затем выполните миграцию снова

### Проблема 3: Ошибка прав доступа

**Причина:** Недостаточно прав для создания таблиц.

**Решение:**

- Убедитесь, что вы используете правильный проект
- Проверьте, что у вашего пользователя есть права на создание таблиц
- Попробуйте выполнить через Service Role ключ (не рекомендуется для продакшена)

---

## Что делать после успешной миграции

1. ✅ Проверить созданные таблицы (см. запросы выше)
2. ✅ Проверить данные (должны быть 2 entities и 5 fields)
3. ✅ Отметить задачу в `PHASE_1.md` как выполненную
4. ✅ Перейти к следующему пункту Фазы 1

---

## Следующие шаги

После успешного выполнения миграции:

- Обновим `PHASE_1.md` с отметкой о выполнении
- Перейдем к проверке данных
- Начнем Фазу 2: Сервисный слой
