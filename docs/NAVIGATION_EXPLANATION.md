# Объяснение навигации и изменений

## 1. Что означает "явная навигация" в UniversalEntityList

**Проблема:** В текущей реализации `UniversalEntityList` для entityDefinitions есть несколько обработчиков навигации, и непонятно, куда ведет клик на имя entityDefinition.

**Решение:** Сделать навигацию явной:
- **Клик на имя entityDefinition** → всегда ведет на список экземпляров (`/projects/[projectId]/entity-instances/[entityDefinitionId]`)
- **Кнопка Edit** → редактирование entityDefinition
- **Кнопка Manage Fields** → список fields
- **Меню действий** → дополнительные опции

Теперь пользователь всегда знает, куда ведет каждый клик.

## 2. Переименование /entities/ в /entity-instances/

**Изменение:** Все пути `/entities/` переименованы в `/entity-instances/`

**Причина:** Более точное название - это экземпляры сущностей, а не сами сущности.

**Обновлено:**
- Папка `app/projects/[projectId]/entities/` → `app/projects/[projectId]/entity-instances/`
- Все ссылки в компонентах
- Все `revalidatePath` в actions
- Все импорты

**Примечание:** API роут `/api/entities/` оставлен без изменений, так как это endpoint, а не файловая структура.

## 3. Breadcrumbs компонент

**Создан:** `components/Breadcrumbs.tsx`

**Функционал:**
- Автоматическое определение пути из `pathname`
- Загрузка данных для имен (project, entityDefinition, instance)
- Выпадающие меню для быстрой навигации
- Поддержка ручной передачи items

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

**Выпадающие меню:**
- **Project** → Entity Definitions, Settings
- **Entity Definition** → View Instances, Edit Definition, Manage Fields

## 4. Обновление страниц

Все страницы обновлены для использования breadcrumbs вместо заголовков `<h1>`.

**Структура страницы:**
```tsx
<div className="space-y-6">
  <Breadcrumbs 
    projectId={projectId}
    projectName={project.name}
    // ... другие данные
  />
  
  {/* Контент страницы без заголовка */}
  <UniversalEntityList ... />
</div>
```

