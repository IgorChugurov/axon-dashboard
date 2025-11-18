# 🚀 Руководство по применению UI Config System

## Быстрый старт

### 1. Применить миграцию БД

```bash
# Если используете Supabase CLI
npx supabase db reset

# Или примените конкретную миграцию
npx supabase migration up
```

### 2. Проверить типы

```bash
# Убедитесь что нет ошибок TypeScript
npm run type-check
# или
npx tsc --noEmit
```

### 3. Пример использования

#### **Вариант A: Использование на новой странице**

```tsx
// app/[projectId]/entities/[entityDefinitionId]/page.tsx
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";
import { getInstances } from "@/lib/universal-entity/instance-service";
import { UniversalEntityList } from "@/components/UniversalEntityList";

export default async function EntityListPage({ params, searchParams }) {
  const { projectId, entityDefinitionId } = await params;
  const { page = "1", search = "" } = await searchParams;

  // 1. Получаем entity + fields + UI конфиг одним запросом
  const config = await getEntityDefinitionWithUIConfig(entityDefinitionId);
  
  if (!config) notFound();

  // 2. Получаем данные с учетом пагинации
  const instances = await getInstances(
    entityDefinitionId,
    projectId,
    {
      page: config.uiConfig.list.enablePagination ? parseInt(page) : undefined,
      limit: config.uiConfig.list.pageSize || 20,
      search,
    }
  );

  // 3. Рендерим универсальный компонент
  return (
    <UniversalEntityList
      entityDefinition={config.entityDefinition}
      fields={config.fields}
      uiConfig={config.uiConfig}
      initialInstances={instances.data}
      initialPage={parseInt(page)}
      initialSearch={search}
      projectId={projectId}
    />
  );
}
```

#### **Вариант B: Кастомизация UI через БД**

```sql
-- Обновить UI конфиг для конкретной сущности
UPDATE entity_definition
SET 
  ui_config = jsonb_build_object(
    'list', jsonb_build_object(
      'pageTitle', 'My Custom Blocks',
      'createButtonText', 'Add New Block',
      'emptyStateTitle', 'No blocks yet',
      'emptyStateMessages', jsonb_build_array(
        'Create your first block to get started',
        'Blocks help organize your content'
      )
    ),
    'messages', jsonb_build_object(
      'afterCreate', 'Block created! 🎉',
      'afterUpdate', 'Changes saved successfully',
      'afterDelete', 'Block removed'
    )
  ),
  enable_pagination = false,  -- загружать все данные сразу
  page_size = 50
WHERE id = 'your-entity-id';
```

#### **Вариант C: Использование для hardcoded сущностей**

```tsx
// Для Projects, Entities, Fields (не в БД)
import projectsConfig from '@/config/projects.json';
import { UniversalEntityList } from "@/components/UniversalEntityList";

export default async function ProjectsPage() {
  const projects = await getProjects();
  
  return (
    <UniversalEntityList
      entityDefinition={mockEntityDefinition} // создать из projectsConfig
      fields={mockFields}
      uiConfig={projectsConfig as EntityUIConfig}
      initialInstances={projects}
      projectId="root"
    />
  );
}
```

---

## 🎨 Настройка UI

### **Отключить пагинацию** (для малых таблиц)

```sql
UPDATE entity_definition
SET enable_pagination = false
WHERE table_name = 'tags'; -- теги, категории и т.д.
```

### **Изменить размер страницы**

```sql
UPDATE entity_definition
SET page_size = 50
WHERE table_name = 'blocks';
```

### **Включить фильтры** (структура готова, реализация позже)

```sql
UPDATE entity_definition
SET 
  enable_filters = true,
  filter_entity_definition_ids = ARRAY[
    'tag-entity-id',
    'category-entity-id'
  ]
WHERE table_name = 'posts';
```

### **Кастомные сообщения**

```sql
UPDATE entity_definition
SET ui_config = jsonb_build_object(
  'messages', jsonb_build_object(
    'afterCreate', 'Успешно создано! 🚀',
    'afterUpdate', 'Изменения сохранены ✅',
    'afterDelete', 'Удалено безвозвратно ❌',
    'deleteModalTitle', 'Подтвердите удаление',
    'deleteModalText', 'Это действие нельзя отменить. Продолжить?'
  )
)
WHERE id = 'your-entity-id';
```

---

## 🔧 Отладка

### Проверить сгенерированный UI конфиг

```tsx
// В любом server component
const config = await getEntityDefinitionWithUIConfig(entityDefinitionId);
console.log('Generated UI Config:', JSON.stringify(config.uiConfig, null, 2));
```

### Валидация UI конфига

```tsx
import { validateUIConfig } from '@/lib/universal-entity/ui-config-schema';

const result = await validateUIConfig(config);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

---

## 📊 Что дальше?

### Фаза 2: Формы редактирования

- [ ] Использовать `uiConfig.form` для форм
- [ ] Использовать `uiConfig.messages` для уведомлений
- [ ] Создать UniversalEntityForm компонент

### Фаза 3: Фильтры

- [ ] Реализовать компонент фильтров
- [ ] Использовать `filterEntityDefinitionIds`
- [ ] API поддержка фильтрации

---

## ⚠️ Важные замечания

1. **Миграция обратно совместима** - существующие entity_definitions будут работать с defaults
2. **Кеширование** - изменения UI конфига видны через 5 минут (TTL кеша)
3. **Валидация** - используйте Yup схемы перед сохранением в БД
4. **Производительность** - `/all` endpoint только для малых таблиц (< 1000 записей)

---

## 📚 Дополнительная документация

- [Полный отчет о реализации](./UI_CONFIG_SYSTEM_REPORT.md)
- [Диаграммы системы](./FORM_GENERATION_DIAGRAMS.md)
- [Типы TypeScript](../../lib/universal-entity/ui-config-types.ts)

---

**Автор:** AI Assistant  
**Дата:** 18 ноября 2025

