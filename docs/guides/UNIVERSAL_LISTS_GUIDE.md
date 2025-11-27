# Руководство по использованию универсальных списков

**Дата создания:** 2025-01-30  
**Версия:** 1.0

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Быстрый старт](#быстрый-старт)
4. [Типы списков](#типы-списков)
5. [Конфигурация](#конфигурация)
6. [Примеры использования](#примеры-использования)
7. [Лучшие практики](#лучшие-практики)

---

## Обзор

Универсальная система списков позволяет создавать таблицы данных с пагинацией, поиском, фильтрацией и сортировкой на основе JSON конфигурации или данных из БД.

### Основные компоненты

- **`UniversalEntityListDataTable`** - базовый компонент таблицы (TanStack Table)
- **`UniversalEntityListClient`** - универсальная обёртка для любых сущностей
- **Специализированные клиенты** - готовые обёртки для конкретных типов сущностей

### Возможности

✅ Пагинация  
✅ Поиск (по нескольким полям)  
✅ Фильтрация (faceted filters)  
✅ Сортировка  
✅ Действия (edit, delete, link)  
✅ Оптимистичные обновления  
✅ React Query кэширование  

---

## Архитектура

```
┌─────────────────────────────────────────┐
│         Страница (Server Component)      │
│  app/projects/[projectId]/page.tsx       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Специализированный Client Component   │
│  EntityDefinitionsListClient             │
│  - Загружает конфиг из JSON               │
│  - Создаёт сервис через фабрику           │
│  - Настраивает routing                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    UniversalEntityListClient            │
│  - Управляет React Query                │
│  - Обрабатывает пагинацию/поиск         │
│  - Управляет состоянием                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    UniversalEntityListDataTable          │
│  - TanStack Table                       │
│  - Генерация колонок из конфига         │
│  - Рендеринг UI                         │
└─────────────────────────────────────────┘
```

---

## Быстрый старт

### 1. Создание списка из JSON конфига

**Шаг 1:** Создайте JSON конфиг (`config/my-entity.json`):

```json
{
  "list": {
    "pageTitle": "My Entities",
    "createButtonText": "Create New",
    "showCreateButton": true,
    "showSearch": true,
    "enablePagination": true,
    "pageSize": 20,
    "columns": [
      {
        "field": "name",
        "headerName": "Name",
        "type": "text"
      },
      {
        "field": "createdAt",
        "headerName": "Created",
        "type": "date"
      }
    ]
  },
  "fields": [
    {
      "name": "name",
      "label": "Name",
      "type": "text",
      "dbType": "varchar"
    }
  ]
}
```

**Шаг 2:** Создайте страницу:

```typescript
// app/projects/[projectId]/my-entities/page.tsx
import { MyEntitiesListClient } from "@/components/my-entities/MyEntitiesListClient";
import myEntitiesConfig from "@/config/my-entities.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";

export default function MyEntitiesPage() {
  return (
    <MyEntitiesListClient
      projectId={projectId}
      config={myEntitiesConfig as unknown as EntityConfigFile}
      routing={{
        createUrlTemplate: "/projects/{projectId}/my-entities/new",
        editUrlTemplate: "/projects/{projectId}/my-entities/{instanceId}",
        detailsUrlTemplate: "/projects/{projectId}/my-entities/{instanceId}",
      }}
    />
  );
}
```

**Шаг 3:** Создайте Client Component:

```typescript
// components/my-entities/MyEntitiesListClient.tsx
"use client";

import { useMemo } from "react";
import { UniversalEntityListClient } from "@/components/universal-entity-list";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import { createMyEntityListService } from "@/lib/my-entities/list-service";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { RoutingConfig } from "@/components/universal-entity-list/types/list-types";

interface MyEntitiesListClientProps {
  projectId: string;
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function MyEntitiesListClient({
  projectId,
  config,
  routing,
}: MyEntitiesListClientProps) {
  // Создаём entityDefinition и fields из конфига
  const { entityDefinition, fields } = useMemo(
    () => createEntityDefinitionAndFieldsFromConfig(projectId, config),
    [projectId, config]
  );

  // Извлекаем uiConfig
  const uiConfig = useMemo(() => {
    const { fields: _fields, ...uiConfig } = config;
    return uiConfig;
  }, [config]);

  // Создаём сервис для загрузки данных
  const listService = useMemo(
    () => createMyEntityListService(projectId),
    [projectId]
  );

  return (
    <UniversalEntityListClient
      projectId={projectId}
      serviceType="my-entity"
      config={config}
      routing={routing}
      onLoadData={listService.onLoadData}
      onDelete={listService.onDelete}
    />
  );
}
```

### 2. Создание списка из данных БД

Для динамических сущностей (Entity Instances):

```typescript
// app/projects/[projectId]/[entityDefId]/page.tsx
import { EntityInstancesListClient } from "@/components/universal-entity-list";
import { getEntityDefinitionById, getFields } from "@/lib/universal-entity/config-service";

export default async function EntityListPage({ params }) {
  const { projectId, entityDefId } = await params;
  
  const entityDefinition = await getEntityDefinitionById(entityDefId);
  const fields = await getFields(entityDefId);

  return (
    <EntityInstancesListClient
      projectId={projectId}
      entityDefinition={entityDefinition}
      fields={fields}
      routing={{
        createUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/new",
        editUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
        detailsUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
      }}
    />
  );
}
```

---

## Типы списков

### 1. ProjectsListClient

Для корневых сущностей (не привязаны к projectId):

```typescript
<ProjectsListClient
  config={projectsConfig}
  routing={{
    createUrlTemplate: "/projects/new",
    editUrlTemplate: "/projects/{instanceId}/settings",
    detailsUrlTemplate: "/projects/{instanceId}",
  }}
/>
```

**Особенности:**
- Использует `projectId: "global"`
- Требует подтверждение удаления с вводом имени

### 2. EntityDefinitionsListClient

Для списка определений сущностей:

```typescript
<EntityDefinitionsListClient
  projectId={projectId}
  config={entityDefinitionConfig}
  routing={{
    createUrlTemplate: "/projects/{projectId}/new",
    editUrlTemplate: "/projects/{projectId}/{instanceId}/edit",
    detailsUrlTemplate: "/projects/{projectId}/{instanceId}",
  }}
/>
```

### 3. EntityInstancesListClient

Для динамических экземпляров сущностей:

```typescript
<EntityInstancesListClient
  projectId={projectId}
  entityDefinition={entityDefinition}
  fields={fields}
  routing={{
    createUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/new",
    editUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
    detailsUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
  }}
/>
```

**Особенности:**
- Автоматически загружает options для relation-полей
- Поддерживает фильтрацию по relations
- Поддерживает поиск по нескольким полям

### 4. FieldsListClient

Для списка полей:

```typescript
<FieldsListClient
  projectId={projectId}
  entityDefinitionId={entityDefId}
  config={fieldsConfig}
  routing={{
    createUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/fields/new",
    editUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/fields/{instanceId}",
    detailsUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/fields/{instanceId}",
  }}
/>
```

### 5. EnvironmentsListClient

Для списка переменных окружения:

```typescript
<EnvironmentsListClient
  projectId={projectId}
  config={environmentsConfig}
  routing={{
    createUrlTemplate: "/projects/{projectId}/settings/environments/new",
    editUrlTemplate: "/projects/{projectId}/settings/environments/{instanceId}",
    detailsUrlTemplate: "/projects/{projectId}/settings/environments/{instanceId}",
  }}
/>
```

---

## Конфигурация

### Структура JSON конфига

```typescript
interface EntityConfigFile {
  list: {
    pageTitle: string;
    createButtonText?: string;
    showCreateButton?: boolean;
    showSearch?: boolean;
    enablePagination?: boolean;
    pageSize?: number;
    enableFilters?: boolean;
    searchPlaceholder?: string;
    emptyStateTitle?: string;
    emptyStateMessages?: string[];
    columns: ColumnConfig[];
  };
  form?: FormConfig;
  messages?: MessagesConfig;
  fields: FieldFromConfig[];
}
```

### Типы колонок

```typescript
type ColumnType = 
  | "text"           // Обычный текст
  | "date"           // Дата
  | "boolean"         // Да/Нет
  | "number"          // Число
  | "actions"         // Действия (edit, delete)
  | "navigateToDetails" // Ссылка на детали
  | "openEditPage";    // Ссылка на редактирование
```

### Конфигурация колонок

```json
{
  "field": "name",
  "headerName": "Name",
  "type": "text",
  "width": "200px"
}
```

С действиями:

```json
{
  "field": "actions",
  "headerName": "Actions",
  "type": "actions",
  "actions": [
    {
      "action": "edit",
      "icon": "edit"
    },
    {
      "action": "delete",
      "icon": "trash"
    }
  ]
}
```

---

## Примеры использования

### Пример 1: Простой список из JSON

```typescript
// config/products.json
{
  "list": {
    "pageTitle": "Products",
    "createButtonText": "Add Product",
    "showCreateButton": true,
    "showSearch": true,
    "enablePagination": true,
    "pageSize": 20,
    "columns": [
      { "field": "name", "headerName": "Product Name", "type": "text" },
      { "field": "price", "headerName": "Price", "type": "number" },
      { "field": "createdAt", "headerName": "Created", "type": "date" },
      { "field": "actions", "headerName": "", "type": "actions", "actions": [
        { "action": "edit", "icon": "edit" },
        { "action": "delete", "icon": "trash" }
      ]}
    ]
  },
  "fields": [
    { "name": "name", "label": "Name", "type": "text", "dbType": "varchar" },
    { "name": "price", "label": "Price", "type": "number", "dbType": "float" }
  ]
}
```

### Пример 2: С фильтрацией

Для включения фильтров добавьте в конфиг поля:

```json
{
  "fields": [
    {
      "name": "category",
      "label": "Category",
      "type": "select",
      "dbType": "manyToOne",
      "filterableInList": true,
      "relatedEntityDefinitionId": "category-id"
    }
  ]
}
```

И в колонки:

```json
{
  "field": "category",
  "headerName": "Category",
  "type": "text"
}
```

---

## Лучшие практики

### 1. Используйте специализированные клиенты

✅ **Хорошо:**
```typescript
<ProjectsListClient config={config} routing={routing} />
```

❌ **Плохо:**
```typescript
<UniversalEntityListClient 
  projectId="global"
  serviceType="project"
  config={config}
  routing={routing}
  onLoadData={...}
  onDelete={...}
/>
```

### 2. Создавайте сервисы через фабрику

✅ **Хорошо:**
```typescript
const listService = useMemo(
  () => createMyEntityListService(projectId),
  [projectId]
);
```

### 3. Используйте правильные query keys

```typescript
// Для проектов (глобальные)
queryKey: ["list", "global", "project"]

// Для сущностей проекта
queryKey: ["list", projectId, "entity-instance"]

// Для конкретного типа
queryKey: ["list", projectId, "environment"]
```

### 4. Настраивайте routing правильно

Используйте шаблоны с плейсхолдерами:

```typescript
{
  createUrlTemplate: "/projects/{projectId}/entities/new",
  editUrlTemplate: "/projects/{projectId}/entities/{instanceId}",
  detailsUrlTemplate: "/projects/{projectId}/entities/{instanceId}",
}
```

Для Entity Instances используйте `{entityDefinitionId}`:

```typescript
{
  createUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/new",
  editUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
}
```

### 5. Обрабатывайте relations правильно

Для Entity Instances автоматически загружаются relations. Для кастомных списков:

```typescript
const listService = useMemo(
  () => createEntityInstanceListService(entityDefId, projectId, {
    includeRelations: ["category", "tags"],
    relationsAsIds: false, // true для редактирования
  }),
  [entityDefId, projectId]
);
```

---

## Дополнительные ресурсы

- [Конфигурация списков](../implementation/UI_CONFIG_SYSTEM_REPORT.md)
- [Таблица роутов](../reports/ROUTES_ANALYSIS.md)
- [Примеры конфигов](../../config/)

