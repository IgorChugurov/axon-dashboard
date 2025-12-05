# Отчет о реализации Breadcrumbs и переименовании routes

## Выполненные задачи

### 1. Объяснение "явной навигации" в UniversalEntityList

**Проблема:** В `UniversalEntityList` для entityDefinitions было несколько обработчиков навигации, и было непонятно, куда ведет клик на имя entityDefinition.

**Решение:** Сделана явная навигация:
- Клик на имя entityDefinition → всегда ведет на список экземпляров (`/projects/[projectId]/entity-instances/[entityDefinitionId]`)
- Кнопка Edit → редактирование entityDefinition
- Кнопка Manage Fields → список fields
- Меню действий → дополнительные опции

Теперь пользователь всегда знает, куда ведет каждый клик.

### 2. Переименование /entities/ в /entity-instances/

**Изменения:**
- Папка `app/projects/[projectId]/entities/` → `app/projects/[projectId]/entity-instances/`
- Обновлены все ссылки в компонентах:
  - `UniversalEntityList.tsx`
  - `UniversalEntityForm.tsx`
  - `EntitiesSidebarSection.tsx`
  - `EntityListClient.tsx`
- Обновлены все `revalidatePath` в actions:
  - `app/projects/[projectId]/entity-instances/[entityDefinitionId]/actions.ts`
  - `app/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/actions.ts`
- Обновлены все импорты:
  - `lib/form-generation/components/inputs/InputRelation.tsx`
- Обновлен редирект в `app/[projectId]/[...rest]/page.tsx` для поддержки старых путей

**Примечание:** API роут `/api/entities/` оставлен без изменений, так как это endpoint, а не файловая структура.

### 3. Создание компонента Breadcrumbs

**Создан:** `components/Breadcrumbs.tsx`

**Функционал:**
- Автоматическое определение пути из `pathname` (через `usePathname()`)
- Поддержка ручной передачи items
- Выпадающие меню для быстрой навигации:
  - **Project** → Entity Definitions, Settings
  - **Entity Definition** → View Instances, Edit Definition, Manage Fields
- Загрузка данных для имен (project, entityDefinition, instance, field)

**Использование:**
```tsx
// Автоматическое определение
<Breadcrumbs 
  projectId={projectId}
  projectName={project.name}
  entityDefinitionId={entityDefinitionId}
  entityDefinitionName={entityDefinition.name}
/>

// Или ручная передача
<Breadcrumbs 
  items={[
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { 
      label: "Project Name",
      dropdown: {
        items: [
          { label: "Entity Definitions", href: "/projects/123" },
          { label: "Settings", href: "/projects/123/settings" }
        ]
      }
    }
  ]}
/>
```

### 4. Обновление всех страниц

**Обновлены страницы:**
- `/projects` - добавлен Breadcrumbs
- `/projects/[projectId]` - заменен заголовок на Breadcrumbs
- `/projects/[projectId]/settings` - заменен заголовок на Breadcrumbs
- `/projects/[projectId]/entity-definition/new` - добавлен Breadcrumbs
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/edit` - добавлен Breadcrumbs
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields` - заменен заголовок на Breadcrumbs
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/new` - добавлен Breadcrumbs
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/[fieldId]/edit` - добавлен Breadcrumbs
- `/projects/[projectId]/entity-instances/[entityDefinitionId]` - заменен заголовок на Breadcrumbs
- `/projects/[projectId]/entity-instances/[entityDefinitionId]/new` - добавлен Breadcrumbs
- `/projects/[projectId]/entity-instances/[entityDefinitionId]/[instanceId]` - заменен заголовок на Breadcrumbs
- `/projects/[projectId]/entity-instances/[entityDefinitionId]/[instanceId]/edit` - добавлен Breadcrumbs

**Изменения в UniversalEntityForm:**
- Убран заголовок `<h1>` (теперь breadcrumbs на странице)
- Оставлено только описание (если есть)

## Структура breadcrumbs

### Основные пути:
```
/ → Home
/projects → Projects
/projects/[projectId] → Project: [Name] (список entityDefinitions)
/projects/[projectId]/settings → Project Settings: [Name]
/projects/[projectId]/entity-definition/new → New Entity Definition
/projects/[projectId]/entity-definition/[entityDefinitionId]/edit → Edit Entity Definition: [Name]
/projects/[projectId]/entity-definition/[entityDefinitionId]/fields → Fields: [EntityDefinition Name]
/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/new → New Field
/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/[fieldId]/edit → Edit Field: [Name]
/projects/[projectId]/entity-instances/[entityDefinitionId] → [EntityDefinition Name] Instances
/projects/[projectId]/entity-instances/[entityDefinitionId]/new → New [EntityDefinition Name]
/projects/[projectId]/entity-instances/[entityDefinitionId]/[instanceId] → [Instance Name]
/projects/[projectId]/entity-instances/[entityDefinitionId]/[instanceId]/edit → Edit [Instance Name]
```

## Технические детали

### Исправления типизации
Все запросы к Supabase для breadcrumbs используют явную типизацию:
```typescript
.single<{ name: string }>()
```

### Редиректы
Обновлен редирект в `app/[projectId]/[...rest]/page.tsx` для поддержки старых путей:
- `/entities/` → `/entity-instances/`

## Ожидаемые результаты

1. **Улучшенная навигация:** Пользователи всегда видят, где они находятся и могут быстро перейти к связанным страницам через выпадающие меню
2. **Единообразный UI:** Все страницы используют breadcrumbs вместо заголовков
3. **Более понятные пути:** `/entity-instances/` более точно отражает назначение (экземпляры сущностей)
4. **Явная навигация:** Понятно, куда ведет каждый клик в списках

## Известные проблемы

1. **Ошибка типизации в entity-definition-service.ts:** Существует ошибка типизации в `lib/universal-entity/entity-definition-service.ts:529`, которая была до этих изменений. Требуется отдельное исправление.

## Следующие шаги

1. Исправить ошибку типизации в `entity-definition-service.ts`
2. Протестировать все маршруты после исправления ошибки
3. Обновить документацию с новыми путями (если необходимо)

