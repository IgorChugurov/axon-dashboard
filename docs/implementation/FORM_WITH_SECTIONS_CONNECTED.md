# FormWithSections - Подключение завершено

**Дата:** 17 ноября 2025  
**Статус:** ✅ Завершено

---

## 🎯 Что было сделано

### 1. ✅ Подключена новая форма к странице создания
**Файл:** `app/[projectId]/entities/[entityDefinitionId]/new/page.tsx`

**Было:**
```typescript
<EntityFormClient
  entityDefinition={entityDefinition}
  fields={createFields}
  mode="create"
/>
```

**Стало:**
```typescript
<EntityFormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
/>
```

**Изменения:**
- ✅ Убрана ручная фильтрация полей (`createFields`)
- ✅ FormWithSections сам фильтрует по `forCreatePage`
- ✅ Автоматическая группировка по секциям

---

### 2. ✅ Подключена новая форма к странице редактирования
**Файл:** `app/[projectId]/entities/[entityDefinitionId]/[instanceId]/edit/page.tsx`

**Было:**
```typescript
<EntityFormClient
  entityDefinition={entityDefinition}
  fields={editFields}
  mode="edit"
  initialData={formData}
  instanceId={instanceId}
/>
```

**Стало:**
```typescript
<EntityFormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="edit"
  initialData={formData}
  instanceId={instanceId}
/>
```

**Изменения:**
- ✅ Убрана ручная фильтрация полей (`editFields`)
- ✅ FormWithSections сам фильтрует по `forEditPage`
- ✅ Сохранена загрузка relation полей как ID

---

### 3. ✅ Добавлена зависимость @hookform/resolvers
**Файл:** `package.json`

**Добавлено:**
```json
"@hookform/resolvers": "^3.10.0"
```

**Для чего:**
- Интеграция yup с react-hook-form
- Автоматическая валидация форм

---

## 📊 ФЛОУ РАБОТЫ

### Создание экземпляра:

```
1. Пользователь → /[projectId]/entities/[entityDefinitionId]/new
             ↓
2. EntityDefinitionServerWrapper загружает:
   - entityDefinition (из БД или кеша)
   - fields (из БД или кеша)
             ↓
3. EntityFormWithSections получает данные
             ↓
4. Внутри FormWithSections:
   a. createFormStructure(entityDefinition, fields, "create")
      • Фильтрует поля по forCreatePage
      • Группирует по sectionIndex
      • Формирует sections с titles
   
   b. createSchema(fields)
      • Создает Yup схему валидации
      • Обрабатывает required, foreignKey
   
   c. createInitialFormData(fields)
      • Формирует пустой объект с defaults
      • text: "", number: 0, array: []
             ↓
5. Рендер формы по секциям:
   - Section 0: "General Information"
   - Section 1: "Relations"
   - ...
             ↓
6. Пользователь заполняет → Submit
             ↓
7. createEntityInstance(projectId, entityDefId, data, relations)
             ↓
8. Редирект → /[projectId]/entities/[entityDefinitionId]
```

---

### Редактирование экземпляра:

```
1. Пользователь → /[projectId]/entities/[entityDefinitionId]/[id]/edit
             ↓
2. EntityDefinitionServerWrapper + getInstanceById:
   - entityDefinition
   - fields
   - instance data (с relations как ID)
             ↓
3. Подготовка formData:
   - Копируются все поля кроме системных
   - Relations уже как массивы ID
             ↓
4. EntityFormWithSections получает:
   - entityDefinition
   - fields
   - initialData = formData
   - mode = "edit"
             ↓
5. Внутри FormWithSections:
   a. createFormStructure(entityDefinition, fields, "edit")
      • Фильтрует по forEditPage
      • Группирует по sectionIndex
   
   b. getItemForEdit(fields, initialData)
      • Нормализует данные с сервера
      • null → defaults
   
   c. createSchema(fields)
      • Валидация
             ↓
6. Рендер формы с заполненными данными
             ↓
7. Пользователь редактирует → Submit
             ↓
8. updateEntityInstance(projectId, entityDefId, id, data, relations)
             ↓
9. Редирект → /[projectId]/entities/[entityDefinitionId]
```

---

## 🔧 Технические детали

### Relation fields
- **Загрузка опций:** через `RelationSelect` → API `/api/entities/${relatedEntityDefinitionId}/options`
- **Формат данных:** всегда массив ID `string[]`
- **Конвертация:**
  - `manyToOne/oneToOne` → single select → берет `ids[0]`
  - `manyToMany/oneToMany` → multiple select → весь массив

### Валидация
- **Движок:** Yup через @hookform/resolvers
- **Типы:**
  - Required validation
  - Conditional validation (foreignKey)
  - Type-specific validation (email, number, etc.)

### Секции
- **Группировка:** автоматическая по `sectionIndex` (0-3)
- **Titles:** из `entityDefinition.titleSection0-3` или default
- **Пустые секции:** не показываются

---

## ✅ Проверочный список

- [x] FormWithSections подключен к странице создания
- [x] FormWithSections подключен к странице редактирования
- [x] Загрузка relation опций через RelationSelect
- [x] Зависимость @hookform/resolvers добавлена
- [x] Фильтрация полей работает автоматически
- [x] Валидация через Yup настроена
- [x] Секции формируются автоматически

---

## 📝 Что дальше

### Для пользователя:
1. Запустить `pnpm install` для установки @hookform/resolvers
2. Применить миграцию БД (если еще не применена)
3. Протестировать создание/редактирование экземпляров
4. Проверить работу секций

### Следующие шаги (future):
- [ ] Добавить статические options для select полей
- [ ] Реализовать создание обратных полей для relations
- [ ] Добавить больше типов инпутов (radio, file upload)
- [ ] Collapsible sections
- [ ] Unit тесты

---

## 🐛 Известные ограничения

1. **Секции:** Максимум 4 (0-3)
2. **ForeignKey:** Глубина 1 (A → B, не A → B → C)
3. **Опции:** Только из relations, нет статических
4. **Обратные поля:** Не создаются автоматически

---

## 🎉 Результат

Теперь **все формы создания/редактирования экземпляров** используют **FormWithSections** с автоматической группировкой по секциям!

**Старый EntityFormClient больше не используется** для entity instances.

