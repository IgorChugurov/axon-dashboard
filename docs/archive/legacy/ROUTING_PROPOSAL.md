# Предложение по структуре роутинга для универсальных сущностей

## Варианты структуры URL

### Вариант 1: Использование `entityDefinitionId` (рекомендуется)

```
/entities/[entityDefinitionId]                    # Список экземпляров
/entities/[entityDefinitionId]/new                # Создание нового
/entities/[entityDefinitionId]/[instanceId]       # Просмотр (детальная страница)
/entities/[entityDefinitionId]/[instanceId]/edit  # Редактирование
```

**Плюсы:**

- ✅ Стабильный ID (не меняется при переименовании)
- ✅ Универсальный подход
- ✅ Легко найти entity по ID
- ✅ Не конфликтует с существующими роутами (`/tags`, `/posts`)

**Минусы:**

- ❌ URL не очень читаемый (`/entities/0de37a7e-d42a-4b51-9f38-a8f616f80d51`)
- ❌ Нужно загружать entity для получения названия

**Пример:**

```
/entities/0de37a7e-d42a-4b51-9f38-a8f616f80d51          # Список Tags
/entities/0de37a7e-d42a-4b51-9f38-a8f616f80d51/new     # Создать Tag
/entities/0de37a7e-d42a-4b51-9f38-a8f616f80d51/abc123  # Просмотр Tag
```

---

### Вариант 2: Использование `tableName` (альтернатива)

```
/entities/[tableName]                    # Список экземпляров
/entities/[tableName]/new                # Создание нового
/entities/[tableName]/[instanceId]       # Просмотр
/entities/[tableName]/[instanceId]/edit  # Редактирование
```

**Плюсы:**

- ✅ Читаемый URL (`/entities/tags`, `/entities/blocks`)
- ✅ Понятно из URL, что это за сущность

**Минусы:**

- ❌ `tableName` может измениться (нужна миграция URL)
- ❌ Может конфликтовать с существующими роутами (`/tags`, `/posts`)
- ❌ Нужна валидация `tableName` (может быть небезопасно)

**Пример:**

```
/entities/tags          # Список Tags
/entities/tags/new      # Создать Tag
/entities/tags/abc123   # Просмотр Tag
```

---

### Вариант 3: Гибридный подход (лучший UX)

Использовать `tableName` для URL, но проверять через `entityDefinitionId`:

```
/entities/[tableName]                    # Список (tableName → entityDefinitionId)
/entities/[tableName]/new                # Создание
/entities/[tableName]/[instanceId]       # Просмотр
/entities/[tableName]/[instanceId]/edit  # Редактирование
```

**Логика:**

1. В `page.tsx` получаем `tableName` из params
2. Ищем `entityDefinitionId` по `tableName` в БД
3. Если не найдено → 404
4. Используем `entityDefinitionId` для всех операций

**Плюсы:**

- ✅ Читаемый URL
- ✅ Стабильность через `entityDefinitionId`
- ✅ Лучший UX

**Минусы:**

- ❌ Дополнительный запрос для получения `entityDefinitionId`
- ❌ Нужна валидация `tableName`

---

## Рекомендация: **Вариант 1** (entityDefinitionId)

**Почему:**

1. **Надежность** - ID не меняется
2. **Простота** - не нужна валидация `tableName`
3. **Безопасность** - нет конфликтов с существующими роутами
4. **Производительность** - прямой доступ по ID

**Для улучшения UX:**

- В меню показывать название сущности (из `entity.name`)
- В breadcrumbs показывать название
- В заголовке страницы показывать название

---

## Структура файлов

```
app/
  entities/
    [entityDefinitionId]/
      page.tsx                    # Список экземпляров
      new/
        page.tsx                  # Создание
      [instanceId]/
        page.tsx                  # Просмотр
        edit/
          page.tsx                # Редактирование
```

---

## Компоненты

### 1. Универсальный список (`app/entities/[entityDefinitionId]/page.tsx`)

```typescript
// Загружает:
// - entityDefinition (конфигурация)
// - fields (поля для таблицы)
// - instances (экземпляры)
// - relations (если нужно)

// Рендерит:
// - EntityListClient (клиентский компонент)
```

### 2. Универсальная форма (`app/entities/[entityDefinitionId]/new/page.tsx`)

```typescript
// Загружает:
// - entityDefinition
// - fields (для формы создания)

// Рендерит:
// - EntityFormClient (клиентский компонент)
```

### 3. Детальная страница (`app/entities/[entityDefinitionId]/[instanceId]/page.tsx`)

```typescript
// Загружает:
// - entityDefinition
// - instance (с relations если нужно)
// - fields (для отображения)

// Рендерит:
// - EntityDetailClient (клиентский компонент)
```

### 4. Форма редактирования (`app/entities/[entityDefinitionId]/[instanceId]/edit/page.tsx`)

```typescript
// Загружает:
// - entityDefinition
// - instance (текущие данные)
// - fields (для формы редактирования)
// - related entities (для select полей)

// Рендерит:
// - EntityFormClient (клиентский компонент, mode="edit")
```

---

## Обновление AppSidebar

Изменить ссылки в меню:

```typescript
<Link href={`/entities/${entity.id}`}>
  <span>{entity.name}</span>
</Link>
```

---

## Следующие шаги

1. ✅ Создать структуру папок `app/entities/[entityDefinitionId]/`
2. ✅ Создать универсальный компонент списка
3. ✅ Создать универсальный компонент формы
4. ✅ Обновить AppSidebar для использования новых URL
5. ✅ Добавить breadcrumbs с названием сущности
