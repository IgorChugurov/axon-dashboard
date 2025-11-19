# Анализ структуры роутов и предложения

## Дата: 2025-01-20

## Текущая структура роутов

### Проекты
- `/projects` - список проектов
- `/projects/[projectId]` - список entityDefinitions для проекта
- `/projects/[projectId]/settings` - настройки проекта

### Entity Definitions
- `/projects/[projectId]/entity-definition/new` - создание новой entityDefinition
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/edit` - редактирование entityDefinition
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields` - список fields для entityDefinition
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/new` - создание нового field
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/[fieldId]/edit` - редактирование field

### Экземпляры сущностей
- `/projects/[projectId]/entities/[entityDefinitionId]` - список экземпляров сущности
- `/projects/[projectId]/entities/[entityDefinitionId]/new` - создание нового экземпляра
- `/projects/[projectId]/entities/[entityDefinitionId]/[instanceId]` - просмотр экземпляра
- `/projects/[projectId]/entities/[entityDefinitionId]/[instanceId]/edit` - редактирование экземпляра

## Проблемы текущей структуры

### 1. Путаница в навигации из списка entityDefinitions

**Текущая ситуация:**
- На странице `/projects/[projectId]` отображается список entityDefinitions через `UniversalEntityList`
- При клике на entityDefinition происходит переход через `handleLink` или `handleNavigateToDetails`
- Логика навигации разбросана по разным обработчикам

**Проблемы:**
1. Неясно, куда ведет клик на entityDefinition:
   - На список экземпляров? (`/projects/[projectId]/entities/[entityDefinitionId]`)
   - На редактирование? (`/projects/[projectId]/entity-definition/[entityDefinitionId]/edit`)
   - На список fields? (`/projects/[projectId]/entity-definition/[entityDefinitionId]/fields`)

2. В `UniversalEntityList` есть несколько обработчиков:
   - `handleNavigateToDetails` - для entityDefinitions ведет на список экземпляров
   - `handleLink` - для entityDefinitions ведет на страницу entityDefinition
   - `handleEdit` - ведет на редактирование

3. Нет четкого разделения между:
   - Просмотром списка entityDefinitions (главная страница проекта)
   - Управлением entityDefinition (редактирование, fields)
   - Работой с экземплярами сущности

## Предложения по улучшению

### Вариант 1: Явные действия в карточке entityDefinition (Рекомендуется)

**Идея:** В списке entityDefinitions показывать карточки с явными кнопками действий.

**Структура карточки:**
```
[EntityDefinition Name]
[Description]
[Actions:]
  - View Instances → /projects/[projectId]/entities/[entityDefinitionId]
  - Edit Definition → /projects/[projectId]/entity-definition/[entityDefinitionId]/edit
  - Manage Fields → /projects/[projectId]/entity-definition/[entityDefinitionId]/fields
```

**Преимущества:**
- Понятная навигация
- Все действия видны сразу
- Нет путаницы, куда ведет клик

**Недостатки:**
- Больше элементов в UI
- Занимает больше места

### Вариант 2: Клик на имя → список экземпляров, меню для остального

**Идея:** Клик на имя entityDefinition ведет на список экземпляров, остальные действия через меню.

**Структура:**
```
[EntityDefinition Name] (клик → список экземпляров)
[Description]
[⋮ Menu]
  - Edit Definition
  - Manage Fields
  - Delete
```

**Преимущества:**
- Компактный UI
- Основное действие (просмотр экземпляров) доступно одним кликом

**Недостатки:**
- Меню скрывает некоторые действия
- Может быть менее интуитивно

### Вариант 3: Разделение на вкладки/секции

**Идея:** На странице проекта сделать вкладки или секции:
- Entity Definitions (текущий список)
- Settings

А в списке entityDefinitions:
- Клик на имя → список экземпляров
- Иконка редактирования → редактирование
- Иконка fields → список fields

**Преимущества:**
- Четкое разделение функционала
- Масштабируемо (можно добавить больше вкладок)

**Недостатки:**
- Требует изменения структуры страницы проекта

## Рекомендация

**Рекомендую Вариант 2 с улучшениями:**

1. **Клик на имя entityDefinition** → переход на список экземпляров (`/projects/[projectId]/entities/[entityDefinitionId]`)

2. **Добавить меню действий** (три точки) с опциями:
   - Edit Definition → `/projects/[projectId]/entity-definition/[entityDefinitionId]/edit`
   - Manage Fields → `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields`
   - Delete (для админов)

3. **На странице списка экземпляров** добавить breadcrumbs и кнопки:
   - Back to Project
   - Edit Entity Definition
   - Manage Fields

4. **Упростить логику в UniversalEntityList:**
   - Для entityDefinitions: клик на имя всегда ведет на список экземпляров
   - Редактирование и другие действия через отдельные кнопки/меню

## План реализации

1. Обновить `UniversalEntityList` для entityDefinitions:
   - Изменить `handleNavigateToDetails` - всегда ведет на список экземпляров
   - Добавить меню действий с опциями редактирования и управления fields

2. Обновить UI карточки entityDefinition:
   - Имя как ссылка на список экземпляров
   - Меню действий (три точки) справа

3. Добавить breadcrumbs на страницах:
   - `/projects/[projectId]/entities/[entityDefinitionId]` - показывать путь к проекту и entityDefinition
   - `/projects/[projectId]/entity-definition/[entityDefinitionId]/edit` - показывать путь к проекту и entityDefinition
   - `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields` - показывать путь к проекту и entityDefinition

4. Обновить навигацию в сайдбаре:
   - Показывать текущий проект и текущую entityDefinition (если есть)

## Вопросы для уточнения

1. Должен ли клик на имя entityDefinition вести на список экземпляров или на страницу редактирования?
2. Нужны ли breadcrumbs на всех страницах?
3. Должны ли actions (edit, delete) быть всегда видны или в меню?

