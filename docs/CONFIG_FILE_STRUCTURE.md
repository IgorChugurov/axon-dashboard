# Структура конфигурационных файлов (config/\*.json)

**Дата создания:** 2025-01-20  
**Версия:** 1.0

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Структура файла](#структура-файла)
3. [EntityDefinition поля](#entitydefinition-поля)
4. [EntityUIConfig поля](#entityuiconfig-поля)
5. [Fields (поля формы)](#fields-поля-формы)
6. [Примеры](#примеры)
7. [TypeScript типы](#typescript-типы)

---

## Обзор

Конфигурационные файлы в папке `config/` используются для статических конфигураций сущностей, которые не хранятся в БД. Например, `environments.json` для переменных окружения.

**Файл:** `lib/universal-entity/config-file-types.ts`  
**Тип:** `EntityConfigFile`

---

## Структура файла

Конфигурационный файл объединяет три части:

1. **EntityDefinition поля** - метаданные сущности
2. **EntityUIConfig** - UI конфигурация (list, form, messages)
3. **Fields** - массив полей формы

```json
{
  "comment": "...",
  "entityName": "...",
  "tableName": "...",
  "url": "...",
  "description": "...",
  "type": "...",
  "createPermission": "...",
  "readPermission": "...",
  "updatePermission": "...",
  "deletePermission": "...",
  "collectionName": "...",
  "apiUrl": "...",
  "apiUrlAll": "...",
  "list": { ... },
  "form": { ... },
  "messages": { ... },
  "fields": [ ... ]
}
```

---

## EntityDefinition поля

Эти поля описывают метаданные сущности (аналог EntityDefinition из БД):

| Поле               | Тип                                           | Обязательное | Описание                                                                                  |
| ------------------ | --------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `entityName`       | `string`                                      | ✅           | Имя сущности (отображается в UI)                                                          |
| `tableName`        | `string`                                      | ✅           | Имя таблицы в БД                                                                          |
| `url`              | `string`                                      | ❌           | URL сущности для роутинга (например, "environments"). Если не указан, берется из `apiUrl` |
| `description`      | `string`                                      | ❌           | Описание сущности                                                                         |
| `type`             | `"primary" \| "secondary" \| "tertiary"`      | ❌           | Тип сущности (по умолчанию: "secondary")                                                  |
| `createPermission` | `"Admin" \| "ALL" \| "User" \| "Admin\|User"` | ❌           | Права доступа для создания (по умолчанию: "Admin")                                        |
| `readPermission`   | `"Admin" \| "ALL" \| "User" \| "Admin\|User"` | ❌           | Права доступа для чтения (по умолчанию: "ALL")                                            |
| `updatePermission` | `"Admin" \| "ALL" \| "User" \| "Admin\|User"` | ❌           | Права доступа для обновления (по умолчанию: "Admin")                                      |
| `deletePermission` | `"Admin" \| "ALL" \| "User" \| "Admin\|User"` | ❌           | Права доступа для удаления (по умолчанию: "Admin")                                        |

**Пример:**

```json
{
  "entityName": "Environment",
  "tableName": "environments",
  "url": "environments",
  "description": "Environment variable configuration",
  "type": "secondary",
  "createPermission": "Admin",
  "readPermission": "ALL",
  "updatePermission": "Admin",
  "deletePermission": "Admin"
}
```

---

## EntityUIConfig поля

Эти поля описывают UI конфигурацию (см. `lib/universal-entity/ui-config-types.ts`):

### list (ListPageConfig)

Конфигурация страницы списка:

```json
{
  "list": {
    "pageTitle": "Environments",
    "searchPlaceholder": "Search for environments...",
    "emptyStateTitle": "You have no environments",
    "emptyStateMessages": ["Message 1", "Message 2"],
    "showCreateButton": true,
    "createButtonText": "New environment",
    "showSearch": true,
    "enablePagination": true,
    "pageSize": 20,
    "enableFilters": false,
    "columns": [ ... ]
  }
}
```

### form (FormPageConfig)

Конфигурация формы:

```json
{
  "form": {
    "createPageTitle": "Create new environment",
    "editPageTitle": "Edit environment",
    "pageHeader": "Environment variable details",
    "createButtonLabel": "Create",
    "updateButtonLabel": "Save",
    "cancelButtonLabel": "Cancel",
    "sectionTitles": {
      "0": "General Information",
      "1": "Section 1",
      "2": "Section 2",
      "3": "Section 3"
    }
  }
}
```

### messages (MessagesConfig)

Сообщения для пользователя:

```json
{
  "messages": {
    "afterCreate": "Environment created successfully!",
    "afterUpdate": "Environment updated successfully!",
    "afterDelete": "Environment deleted successfully!",
    "errorCreate": "Failed to create environment",
    "errorUpdate": "Failed to update environment",
    "deleteModalTitle": "Confirm deleting environment",
    "deleteModalText": "Are you sure?",
    "deleteModalButtonText": "Delete",
    "deleteModalConfirmWord": "DELETE",
    "deleteModalConfirmText": "Type DELETE to confirm",
    "reloadEvents": {
      "create": "reloadEnvironments",
      "update": "reloadEnvironments",
      "delete": "reloadEnvironments"
    }
  }
}
```

### Метаданные API

```json
{
  "collectionName": "environments",
  "apiUrl": "/api/environments",
  "apiUrlAll": "/api/environments/all"
}
```

---

## Fields (поля формы)

Массив полей формы. Каждое поле описывает одно поле в форме.

**Важно:** Поля `createdAt` и `updatedAt` не нужны в JSON - они добавляются автоматически.

### Базовая структура поля

```json
{
  "id": "environment-key",
  "entityDefinitionId": "environment-config",
  "name": "key",
  "dbType": "varchar",
  "type": "text",
  "label": "Key",
  "placeholder": "Enter environment key",
  "description": "Unique key for this environment variable",
  "forEditPage": true,
  "forCreatePage": true,
  "required": true,
  "requiredText": "Key is required",
  "forEditPageDisabled": false,
  "displayIndex": 0,
  "displayInTable": true,
  "sectionIndex": 0,
  "isOptionTitleField": false,
  "searchable": true,
  "autoPopulate": false,
  "includeInSinglePma": true,
  "includeInListPma": true,
  "includeInSingleSa": true,
  "includeInListSa": true
}
```

### Типы полей

#### 1. Обычные поля

- `text` - Однострочный текст
- `textarea` - Многострочный текст
- `number` - Число
- `boolean` - Булево значение (switch)
- `date` - Дата/время
- `select` - Одиночный выбор
- `multipleSelect` - Множественный выбор
- `array` - Массив значений

#### 2. Кастомные типы

##### Relations (manyToOne, oneToMany, manyToMany, oneToOne)

```json
{
  "name": "tags",
  "dbType": "manyToMany",
  "type": "multipleSelect",
  "relatedEntityDefinitionId": "tag-entity-id",
  "label": "Tags"
}
```

**Особенности:**

- Автоматически определяется по `dbType`
- Опции загружаются динамически через API
- Не требует `options` в конфиге

##### Dynamic Value (dynamicValue)

```json
{
  "name": "value",
  "dbType": "varchar",
  "type": "dynamicValue",
  "label": "Value",
  "typeFieldName": "type",
  "optionsFieldName": "options"
}
```

**Особенности:**

- Меняет тип ввода в зависимости от других полей
- `typeFieldName` - имя поля, от которого зависит тип (по умолчанию: "type")
- `optionsFieldName` - имя поля с опциями для select (по умолчанию: "options")
- Поддерживаемые типы: string, number, boolean, select

### Опции для select полей

Для обычных select полей (не relations) можно указать статические опции:

```json
{
  "name": "type",
  "type": "select",
  "options": [
    { "id": "string", "name": "String" },
    { "id": "number", "name": "Number" },
    { "id": "boolean", "name": "Boolean" },
    { "id": "select", "name": "Select" }
  ]
}
```

### Условная видимость

Поля могут показываться/скрываться на основе других полей:

```json
{
  "name": "relatedField",
  "foreignKey": "mainField",
  "foreignKeyValue": "value1|value2"
}
```

- `foreignKey` - имя поля, от которого зависит видимость
- `foreignKeyValue` - значения, при которых поле видимо (pipe-separated: "value1|value2" или "any")

### Значения по умолчанию

```json
{
  "defaultStringValue": "",
  "defaultNumberValue": 0,
  "defaultBooleanValue": false,
  "defaultDateValue": null
}
```

### Связи (Relations)

```json
{
  "relatedEntityDefinitionId": "tag-entity-id",
  "relationFieldId": null,
  "isRelationSource": false,
  "selectorRelationId": null,
  "relationFieldName": null,
  "relationFieldLabel": null
}
```

---

## Примеры

### Полный пример: environments.json

```json
{
  "comment": "UI Configuration for Environments entity",
  "entityName": "Environment",
  "tableName": "environments",
  "url": "environments",
  "description": "Environment variable configuration",
  "type": "secondary",
  "createPermission": "Admin",
  "readPermission": "ALL",
  "updatePermission": "Admin",
  "deletePermission": "Admin",
  "collectionName": "environments",
  "apiUrl": "/api/environments",
  "apiUrlAll": "/api/environments/all",
  "list": {
    "pageTitle": "Environments",
    "searchPlaceholder": "Search for environments...",
    "emptyStateTitle": "You have no environments",
    "emptyStateMessages": [
      "Environment variables that you create will end up here.",
      "Add an environment variable to get started."
    ],
    "showCreateButton": true,
    "createButtonText": "New environment",
    "showSearch": true,
    "enablePagination": true,
    "pageSize": 20,
    "enableFilters": false,
    "columns": [
      {
        "field": "key",
        "headerName": "Key",
        "flex": 2,
        "type": "naigateToDetails"
      }
    ]
  },
  "form": {
    "createPageTitle": "Create new environment",
    "editPageTitle": "Edit environment",
    "pageHeader": "Environment variable details",
    "createButtonLabel": "Create",
    "updateButtonLabel": "Save",
    "cancelButtonLabel": "Cancel",
    "sectionTitles": {
      "0": "General Information"
    }
  },
  "messages": {
    "afterCreate": "Environment created successfully!",
    "afterUpdate": "Environment updated successfully!",
    "afterDelete": "Environment deleted successfully!",
    "deleteModalTitle": "Confirm deleting environment",
    "deleteModalText": "Are you sure you want to delete this environment variable?",
    "deleteModalButtonText": "Delete",
    "reloadEvents": {
      "create": "reloadEnvironments",
      "update": "reloadEnvironments",
      "delete": "reloadEnvironments"
    }
  },
  "fields": [
    {
      "name": "key",
      "dbType": "varchar",
      "type": "text",
      "label": "Key",
      "required": true
    },
    {
      "name": "type",
      "dbType": "varchar",
      "type": "select",
      "label": "Type",
      "options": [
        { "id": "string", "name": "String" },
        { "id": "number", "name": "Number" },
        { "id": "boolean", "name": "Boolean" },
        { "id": "select", "name": "Select" }
      ]
    },
    {
      "name": "value",
      "dbType": "varchar",
      "type": "dynamicValue",
      "label": "Value",
      "typeFieldName": "type",
      "optionsFieldName": "options"
    },
    {
      "name": "options",
      "dbType": "varchar",
      "type": "array",
      "label": "Options"
    }
  ]
}
```

---

## TypeScript типы

### Импорт типов

```typescript
import type {
  EntityConfigFile,
  FieldFromConfig,
} from "@/lib/universal-entity/config-file-types";
```

### Использование

```typescript
import environmentsConfig from "@/config/environments.json";

// Типизированный конфиг
const config: EntityConfigFile =
  environmentsConfig as unknown as EntityConfigFile;

// Поля из конфига
const fields: FieldFromConfig[] = config.fields;
```

### Типы

- `EntityConfigFile` - полная структура конфига
- `EntityDefinitionConfig` - поля EntityDefinition
- `FieldFromConfig` - поле из конфига (без createdAt/updatedAt)

---

## Важные замечания

### 1. Поля createdAt/updatedAt

**НЕ добавляйте** `createdAt` и `updatedAt` в JSON конфиг - они добавляются автоматически при создании `EntityDefinition`.

### 2. entityDefinitionId в fields

Поле `entityDefinitionId` в fields будет автоматически заменено на ID созданного `EntityDefinition`.

### 3. Типы полей

- Используйте `dynamicValue` для полей, которые меняют тип в зависимости от других полей
- Используйте relations (`manyToOne`, `oneToMany`, `manyToMany`, `oneToOne`) для связей между сущностями
- Для обычных select полей указывайте `options` в конфиге

### 4. Упрощенная загрузка

Конфиг импортируется напрямую из JSON файла:

```typescript
import environmentsConfig from "@/config/environments.json";
```

Без промежуточных функций трансформации.

---

## Связанные документы

- [FORMS_STRUCTURE.md](FORMS_STRUCTURE.md) - Структура использования форм
- [ui-config-types.ts](../lib/universal-entity/ui-config-types.ts) - Типы UI конфигурации
- [types.ts](../lib/universal-entity/types.ts) - Типы EntityDefinition и Field
