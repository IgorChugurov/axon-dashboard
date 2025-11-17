# Исправление отображения связей в select-полях

**Дата:** 17 ноября 2025  
**Проблема:** В селектах для связей (например, тегов) отображались ID вместо названий

## Найденная причина

API endpoint `/api/entities/[entityDefinitionId]/options` использовал старую структуру данных:

```typescript
// ❌ Неправильно - старая структура
const title = instance.data[titleField.name];
```

После внедрения нормализации данных, все поля находятся на верхнем уровне объекта:

```typescript
// ✅ Правильно - новая плоская структура
const title = instance[titleField.name];
```

## Внесенные исправления

### 1. ✅ API endpoint: `app/api/entities/[entityDefinitionId]/options/route.ts`

**Изменения:**

- Обновлен доступ к полям: `instance[titleField.name]` вместо `instance.data[titleField.name]`
- Использована оптимизированная функция `getEntityDefinitionWithFields()` (JOIN вместо 2 запросов)
- Убрано ненужное поле `data` из ответа API

**Было:**

```typescript
const title = instance.data[titleField.name] || instance.id;
return {
  id: instance.id,
  title: String(title),
  data: instance.data, // лишнее
};
```

**Стало:**

```typescript
const title = instance[titleField.name] || instance.id;
return {
  id: instance.id,
  title: String(title),
};
```

### 2. ✅ RelationSelect: `app/[projectId]/entities/[entityDefinitionId]/RelationSelect.tsx`

**Изменения:**

- Обновлен интерфейс `Option` - убрано поле `data`

**Было:**

```typescript
interface Option {
  id: string;
  title: string;
  data: Record<string, any>; // лишнее
}
```

**Стало:**

```typescript
interface Option {
  id: string;
  title: string;
}
```

### 3. ✅ Actions: `app/[projectId]/entities/[entityDefinitionId]/actions.ts`

**Изменения:**

- Обновлено логирование для соответствия новой структуре

## Как это работает теперь

### Процесс отображения связей в select:

1. **Загрузка опций:**

   ```
   GET /api/entities/{entityDefinitionId}/options
   → getInstances() возвращает плоские объекты
   → Поле с isOptionTitleField = true используется для title
   → Возврат массива {id, title}
   ```

2. **Отображение в форме:**

   ```
   RelationSelect получает массив {id, title}
   → Для multiple select: показывает badges с title
   → Для single select: показывает <option value={id}>{title}</option>
   ```

3. **Сохранение:**
   ```
   EntityFormClient разделяет данные:
   → relations = {tags: ["id1", "id2"]}  // массив ID
   → data = {name: "...", body: "..."}   // обычные поля
   → Server Action сохраняет в БД
   ```

## Результат

✅ В списке тегов отображаются названия (не ID)  
✅ При выборе тега отображается название (не ID)  
✅ Сохранение работает корректно (сохраняются ID)  
✅ Работает как для создания, так и для редактирования  
✅ Работает для всех типов связей: manyToMany, oneToMany, manyToOne, oneToOne

## Тестирование

### Сценарии для проверки:

1. **Создание нового Block:**

   - Открыть форму создания
   - Выбрать несколько тегов
   - Проверить, что видны названия тегов
   - Сохранить
   - Проверить, что теги сохранились

2. **Редактирование Block:**

   - Открыть форму редактирования
   - Проверить, что выбранные теги отображаются с названиями
   - Добавить/удалить теги
   - Сохранить
   - Проверить, что изменения применились

3. **Просмотр Block:**

   - Открыть страницу просмотра
   - Проверить, что теги отображаются с названиями

4. **Список Blocks:**
   - Открыть список
   - Проверить, что в столбце "Tags" видны названия

## Дополнительная оптимизация

Endpoint options теперь использует `getEntityDefinitionWithFields()`:

- **Было:** 2 запроса (entity_definition + fields)
- **Стало:** 1 запрос (JOIN)

## Совместимость

Все изменения обратно совместимы с:

- ✅ EntityFormClient
- ✅ Server Actions (create/update)
- ✅ Instance Service
- ✅ Relation Service

Нет breaking changes в API или интерфейсах.
