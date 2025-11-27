# Руководство по использованию универсальных форм

**Дата создания:** 2025-01-30  
**Версия:** 1.0

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Быстрый старт](#быстрый-старт)
4. [Типы форм](#типы-форм)
5. [Конфигурация](#конфигурация)
6. [Примеры использования](#примеры-использования)
7. [Обработка relations](#обработка-relations)
8. [Лучшие практики](#лучшие-практики)

---

## Обзор

Универсальная система форм позволяет создавать формы создания/редактирования на основе JSON конфигурации или данных из БД.

### Основные компоненты

- **`UniversalEntityFormNew`** - базовый компонент формы
- **`FormWithSectionsShadcn`** - компонент рендеринга полей
- **Специализированные обёртки** - готовые обёртки для конкретных типов сущностей

### Возможности

✅ Автогенерация полей из конфига  
✅ Группировка полей в секции  
✅ Валидация  
✅ React Query мутации  
✅ Оптимистичные обновления  
✅ Toast уведомления  
✅ Поддержка relations  
✅ JSONB данные  

---

## Архитектура

```
┌─────────────────────────────────────────┐
│         Страница (Server Component)      │
│  app/projects/[projectId]/new/page.tsx    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Специализированная обёртка            │
│  ProjectFormNew                          │
│  - Загружает конфиг из JSON               │
│  - Создаёт функции onCreate/onUpdate      │
│  - Настраивает redirectUrl и queryKey    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    UniversalEntityFormNew                │
│  - Управляет React Query мутациями       │
│  - Обрабатывает submit                    │
│  - Управляет навигацией                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    FormWithSectionsShadcn                │
│  - Группирует поля в секции              │
│  - Рендерит поля по типу                 │
│  - Обрабатывает валидацию                │
└─────────────────────────────────────────┘
```

---

## Быстрый старт

### 1. Создание формы из JSON конфига

**Шаг 1:** Создайте JSON конфиг (`config/my-entity.json`):

```json
{
  "form": {
    "createTitle": "Create New Entity",
    "editTitle": "Edit Entity",
    "sections": [
      {
        "title": "Basic Information",
        "index": 0
      }
    ]
  },
  "messages": {
    "afterCreate": "Entity created successfully",
    "afterUpdate": "Entity updated successfully",
    "afterDelete": "Entity deleted successfully",
    "errorCreate": "Failed to create entity",
    "errorUpdate": "Failed to update entity"
  },
  "fields": [
    {
      "name": "name",
      "label": "Name",
      "type": "text",
      "dbType": "varchar",
      "required": true,
      "sectionIndex": 0,
      "displayIndex": 0
    },
    {
      "name": "description",
      "label": "Description",
      "type": "textarea",
      "dbType": "varchar",
      "sectionIndex": 0,
      "displayIndex": 1
    }
  ]
}
```

**Шаг 2:** Создайте обёртку:

```typescript
// components/my-entities/MyEntityFormNew.tsx
"use client";

import { useMemo } from "react";
import { UniversalEntityFormNew } from "@/components/UniversalEntityFormNew";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import {
  createMyEntityFromClient,
  updateMyEntityFromClient,
  deleteMyEntityFromClient,
} from "@/lib/my-entities/client-service";
import myEntityConfig from "@/config/my-entity.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";

interface MyEntityFormNewProps {
  projectId: string;
  mode: "create" | "edit";
  entityId?: string;
  initialData?: {
    name: string;
    description?: string;
  };
}

export function MyEntityFormNew({
  projectId,
  mode,
  entityId,
  initialData,
}: MyEntityFormNewProps) {
  // Создаём entityDefinition и fields из конфига
  const { entityDefinition, fields } = useMemo(
    () => createEntityDefinitionAndFieldsFromConfig(projectId, myEntityConfig as unknown as EntityConfigFile),
    [projectId]
  );

  // Извлекаем uiConfig
  const uiConfig = useMemo(() => {
    const { fields: _fields, ...uiConfig } = myEntityConfig;
    return uiConfig;
  }, []);

  // Функции мутации
  const handleCreate = async (data: Record<string, any>) => {
    return createMyEntityFromClient(projectId, data);
  };

  const handleUpdate = async (id: string, data: Record<string, any>) => {
    return updateMyEntityFromClient(id, data);
  };

  const handleDelete = async (id: string) => {
    return deleteMyEntityFromClient(projectId, id);
  };

  return (
    <UniversalEntityFormNew
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode={mode}
      initialData={initialData}
      instanceId={entityId}
      projectId={projectId}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      redirectUrl={`/projects/${projectId}/my-entities`}
      queryKey={["list", projectId, "my-entity"]}
    />
  );
}
```

**Шаг 3:** Создайте страницы:

```typescript
// app/projects/[projectId]/my-entities/new/page.tsx
import { MyEntityFormNew } from "@/components/my-entities/MyEntityFormNew";

export default function NewMyEntityPage({ params }) {
  const { projectId } = await params;
  
  return (
    <MyEntityFormNew projectId={projectId} mode="create" />
  );
}
```

```typescript
// app/projects/[projectId]/my-entities/[entityId]/page.tsx
import { MyEntityFormNew } from "@/components/my-entities/MyEntityFormNew";
import { getMyEntityById } from "@/lib/my-entities/service";

export default async function EditMyEntityPage({ params }) {
  const { projectId, entityId } = await params;
  
  const entity = await getMyEntityById(entityId);
  
  return (
    <MyEntityFormNew
      projectId={projectId}
      mode="edit"
      entityId={entityId}
      initialData={entity}
    />
  );
}
```

### 2. Создание формы из данных БД

Для динамических сущностей (Entity Instances):

```typescript
// app/projects/[projectId]/[entityDefId]/new/page.tsx
import { EntityInstanceFormNew } from "@/components/entity-instances/EntityInstanceFormNew";
import { getEntityDefinitionWithUIConfig } from "@/lib/universal-entity/config-service";

export default async function EntityNewPage({ params }) {
  const { projectId, entityDefId } = await params;
  
  const config = await getEntityDefinitionWithUIConfig(entityDefId);
  
  return (
    <EntityInstanceFormNew
      projectId={projectId}
      entityDefinition={config.entityDefinition}
      fields={config.fields}
      uiConfig={config.uiConfig}
      mode="create"
    />
  );
}
```

---

## Типы форм

### 1. ProjectFormNew

Для проектов (корневые сущности):

```typescript
<ProjectFormNew
  mode="create"
  // или
  mode="edit"
  projectId={projectId}
  initialData={project}
/>
```

**Особенности:**
- Использует `projectId: "global"`
- Очищает куку при удалении

### 2. EntityDefinitionFormNew

Для определений сущностей:

```typescript
<EntityDefinitionFormNew
  projectId={projectId}
  mode="create"
  // или
  mode="edit"
  entityDefinitionId={entityDefId}
  initialData={entityDefinition}
/>
```

### 3. EntityInstanceFormNew

Для динамических экземпляров:

```typescript
<EntityInstanceFormNew
  projectId={projectId}
  entityDefinition={entityDefinition}
  fields={fields}
  uiConfig={uiConfig}
  mode="create"
  // или
  mode="edit"
  instanceId={instanceId}
  initialData={formData}
/>
```

**Особенности:**
- Автоматически разделяет data и relations
- Загружает relations как ID для редактирования
- Загружает relations как объекты для создания

### 4. EnvironmentFormNew

Для переменных окружения:

```typescript
<EnvironmentFormNew
  projectId={projectId}
  mode="create"
  // или
  mode="edit"
  environmentId={environmentId}
  initialData={environment}
/>
```

### 5. FieldFormNew

Для полей (кастомная форма):

```typescript
<FieldFormNew
  projectId={projectId}
  entityDefinitionId={entityDefId}
  mode="create"
  // или
  mode="edit"
  fieldId={fieldId}
  initialData={field}
  availableEntities={entities}
  availableFields={fields}
/>
```

**Примечание:** Это кастомная форма из-за сложной логики конфигурации полей.

---

## Конфигурация

### Структура JSON конфига

```typescript
interface EntityConfigFile {
  form: {
    createTitle: string;
    editTitle: string;
    sections: SectionConfig[];
  };
  messages: {
    afterCreate?: string;
    afterUpdate?: string;
    afterDelete?: string;
    errorCreate?: string;
    errorUpdate?: string;
  };
  fields: FieldFromConfig[];
}
```

### Типы полей

```typescript
type FieldType = 
  | "text"              // Текстовое поле
  | "textarea"          // Многострочный текст
  | "number"            // Число
  | "boolean"            // Чекбокс
  | "date"              // Дата
  | "select"            // Выпадающий список (one-to-one, many-to-one)
  | "multipleSelect";   // Множественный выбор (one-to-many, many-to-many)
```

### Конфигурация полей

```json
{
  "name": "name",
  "label": "Name",
  "type": "text",
  "dbType": "varchar",
  "required": true,
  "placeholder": "Enter name",
  "description": "The name of the entity",
  "sectionIndex": 0,
  "displayIndex": 0,
  "forCreatePage": true,
  "forEditPage": true,
  "forEditPageDisabled": false
}
```

### Relations

Для полей-связей:

```json
{
  "name": "category",
  "label": "Category",
  "type": "select",
  "dbType": "manyToOne",
  "relatedEntityDefinitionId": "category-entity-id",
  "isOptionTitleField": true
}
```

---

## Примеры использования

### Пример 1: Простая форма

```json
{
  "form": {
    "createTitle": "Create Product",
    "editTitle": "Edit Product",
    "sections": [
      { "title": "Product Information", "index": 0 }
    ]
  },
  "fields": [
    {
      "name": "name",
      "label": "Product Name",
      "type": "text",
      "dbType": "varchar",
      "required": true,
      "sectionIndex": 0,
      "displayIndex": 0
    },
    {
      "name": "price",
      "label": "Price",
      "type": "number",
      "dbType": "float",
      "required": true,
      "sectionIndex": 0,
      "displayIndex": 1
    }
  ]
}
```

### Пример 2: С relations

```json
{
  "fields": [
    {
      "name": "category",
      "label": "Category",
      "type": "select",
      "dbType": "manyToOne",
      "relatedEntityDefinitionId": "category-id",
      "isOptionTitleField": true,
      "sectionIndex": 0,
      "displayIndex": 0
    },
    {
      "name": "tags",
      "label": "Tags",
      "type": "multipleSelect",
      "dbType": "manyToMany",
      "relatedEntityDefinitionId": "tag-id",
      "isOptionTitleField": true,
      "sectionIndex": 0,
      "displayIndex": 1
    }
  ]
}
```

---

## Обработка relations

### Entity Instances

Для Entity Instances relations обрабатываются автоматически:

```typescript
// EntityInstanceFormNew автоматически разделяет:
const { data, relations } = separateDataAndRelations(formData);

// data - обычные поля (идут в JSONB)
// relations - связи (идут в отдельные таблицы)
```

### Кастомные формы

Для кастомных форм нужно обработать relations вручную:

```typescript
const handleCreate = async (formData: Record<string, any>) => {
  const relations: Record<string, string[]> = {};
  const data: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (relationFieldNames.includes(key)) {
      relations[key] = Array.isArray(value) ? value : value ? [value] : [];
    } else {
      data[key] = value;
    }
  }

  return createMyEntityFromClient(projectId, data, relations);
};
```

---

## Лучшие практики

### 1. Используйте специализированные обёртки

✅ **Хорошо:**
```typescript
<ProjectFormNew mode="create" />
```

❌ **Плохо:**
```typescript
<UniversalEntityFormNew
  entityDefinition={...}
  fields={...}
  uiConfig={...}
  mode="create"
  onCreate={...}
  onUpdate={...}
  onDelete={...}
  redirectUrl={...}
  queryKey={...}
/>
```

### 2. Используйте правильные query keys

```typescript
// Для проектов (глобальные)
queryKey: ["list", "global", "project"]

// Для сущностей проекта
queryKey: ["list", projectId, "entity-instance"]

// Для конкретного типа
queryKey: ["list", projectId, "environment"]
```

### 3. Настраивайте redirectUrl правильно

```typescript
// После создания - на список
redirectUrl: `/projects/${projectId}/entities`

// После обновления - router.back() (автоматически)
// После удаления - на список
redirectUrl: `/projects/${projectId}/entities`
```

### 4. Обрабатывайте initialData правильно

Для редактирования загружайте данные на сервере:

```typescript
export default async function EditPage({ params }) {
  const entity = await getEntityById(id);
  
  // Преобразуйте в формат формы
  const initialData = {
    name: entity.name,
    description: entity.description,
    // relations как ID для редактирования
    category: entity.categoryId,
    tags: entity.tags.map(t => t.id),
  };
  
  return <MyEntityFormNew mode="edit" initialData={initialData} />;
}
```

### 5. Используйте transformData для кастомной обработки

```typescript
<UniversalEntityFormNew
  // ...
  transformData={(formData) => {
    // Кастомная обработка перед отправкой
    return {
      ...formData,
      processedAt: new Date().toISOString(),
    };
  }}
/>
```

### 6. Группируйте поля в секции

```json
{
  "form": {
    "sections": [
      { "title": "Basic Information", "index": 0 },
      { "title": "Additional Details", "index": 1 }
    ]
  },
  "fields": [
    {
      "name": "name",
      "sectionIndex": 0,
      "displayIndex": 0
    },
    {
      "name": "description",
      "sectionIndex": 1,
      "displayIndex": 0
    }
  ]
}
```

---

## Дополнительные ресурсы

- [Конфигурация форм](../implementation/UI_CONFIG_SYSTEM_REPORT.md)
- [Таблица роутов](../reports/ROUTES_ANALYSIS.md)
- [Примеры конфигов](../../config/)
- [Генерация форм](../implementation/FORM_WITH_SECTIONS_CONNECTED.md)

