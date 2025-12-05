# План реализации Breadcrumbs

## 1. Что означает "явная навигация" в UniversalEntityList

**Текущая проблема:**
В `UniversalEntityList` для entityDefinitions есть несколько обработчиков:
- `handleNavigateToDetails` - ведет на список экземпляров
- `handleLink` - ведет на страницу entityDefinition (непонятно куда)
- `handleEdit` - ведет на редактирование

**Что значит "явная навигация":**
- Клик на имя entityDefinition → всегда ведет на список экземпляров (явно и понятно)
- Редактирование → через отдельную кнопку/меню (явно)
- Управление fields → через отдельную кнопку/меню (явно)

Сейчас логика разбросана и непонятно, куда ведет клик.

## 2. Структура роутов для breadcrumbs

### Основные пути:
```
/ → Home
/projects → Projects List
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

## 3. Компонент Breadcrumbs

### Интерфейс:
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
  dropdown?: {
    label: string;
    items: Array<{
      label: string;
      href: string;
    }>;
  };
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  // или автоматически из pathname
  pathname?: string;
  projectId?: string;
  entityDefinitionId?: string;
  entityDefinitionName?: string;
  instanceId?: string;
  instanceName?: string;
}
```

### Автоматическое определение:
Компонент должен анализировать pathname и автоматически строить breadcrumbs:
- Парсит путь
- Загружает данные (project name, entityDefinition name, instance name)
- Формирует breadcrumbs с выпадающими меню где нужно

### Выпадающие меню:

**Для entityDefinition:**
```
Entity Definition: [Name] ▼
  - View Instances → /projects/[projectId]/entity-instances/[entityDefinitionId]
  - Edit Definition → /projects/[projectId]/entity-definition/[entityDefinitionId]/edit
  - Manage Fields → /projects/[projectId]/entity-definition/[entityDefinitionId]/fields
```

**Для Project:**
```
Project: [Name] ▼
  - Entity Definitions → /projects/[projectId]
  - Settings → /projects/[projectId]/settings
```

## 4. Реализация

### Шаг 1: Создать компонент Breadcrumbs
- Принимает pathname или items
- Автоматически парсит путь
- Загружает данные для имен (project, entityDefinition, instance)
- Рендерит breadcrumbs с выпадающими меню

### Шаг 2: Обновить все страницы
- Убрать заголовки `<h1>`
- Добавить `<Breadcrumbs />` в начало страницы
- Передавать необходимые данные (projectId, entityDefinitionId и т.д.)

### Шаг 3: Переименовать /entities/ в /entity-instances/
- Переименовать папку
- Обновить все ссылки
- Обновить импорты

## 5. Пример использования

```tsx
// На странице списка entityDefinitions
<Breadcrumbs 
  pathname={`/projects/${projectId}`}
  projectId={projectId}
  projectName={project.name}
/>

// На странице списка экземпляров
<Breadcrumbs 
  pathname={`/projects/${projectId}/entity-instances/${entityDefinitionId}`}
  projectId={projectId}
  projectName={project.name}
  entityDefinitionId={entityDefinitionId}
  entityDefinitionName={entityDefinition.name}
/>

// На странице редактирования entityDefinition
<Breadcrumbs 
  pathname={`/projects/${projectId}/entity-definition/${entityDefinitionId}/edit`}
  projectId={projectId}
  projectName={project.name}
  entityDefinitionId={entityDefinitionId}
  entityDefinitionName={entityDefinition.name}
/>
```

