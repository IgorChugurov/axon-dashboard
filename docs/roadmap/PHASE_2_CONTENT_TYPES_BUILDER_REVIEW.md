# Phase 2 Content Types Builder — итоговый документ

Документ объединяет roadmap-файл `docs/roadmap/PHASE_2_CONTENT_TYPES_BUILDER.md` и предыдущий архитектурный обзор. Это рабочая инструкция для запуска первой версии Builder’а. Везде опираемся на текущую архитектуру проекта (Next.js App Router + Supabase), где `fields` в коде = Strapi `attributes`.

---

## 0. Источники, контекст и терминология
- **Roadmap (файл №1)** — описывает задачи 2.1–2.9, компоненты (EntityDefinitionEditor, FieldList, FieldEditor, RelationBuilder и т.д.), server actions и критерии готовности.
- **Первый обзор (файл №2)** — выявил риски (data integrity, state drift, relation drift, permissions mismatch).
- **Архитектура сегодня**:
  - Данные: Supabase таблицы `entity_definition`, `field`.
  - Фронтенд: Next.js App Router, server components, client islands.
  - Universal-entity слой (`lib/universal-entity/*`, `components/universal-entity-list/*`, `lib/universal-entity/table-column-generator.tsx`) читает `fields` и строит UI/CRUD.
  - Permissions заданы прямыми строками (`createPermission`, `readPermission`, ...). Списки используют одинаковый контракт.
- **Correspondence**: `fields` (наш термин) ⇔ Strapi attributes ⇔ Directus fields ⇔ Payload collections fields.

---

## 1. Что именно создаём (в терминах индустрии)
1. **Schema Builder workspace** — трёхпанельный low-code редактор (список сущностей → редактор сущности → список/редактор полей). Это аналог Strapi Content Types Builder и Directus Data Model Studio.
2. **Meta-modeling toolkit** — набор UI-модулей (FieldTypeSelector, FieldEditor, RelationBuilder, PermissionEditor, FormPreview), управляющих метаданными, которые затем потребляет universal-entity слой.
3. **Schema persistence API** — server actions (`saveEntityDefinitionAction`, `saveFieldAction`, `deleteFieldAction`, `reorderFieldsAction`) выступают как schema backend API, сохраняя данные в Supabase и инициируя revalidation.
4. **Preview/runtime bridge** — FormPreview рендерит `UniversalEntityForm`/`table-column-generator` в mock-режиме, чтобы подтвердить, что `fields` отображаются корректно.

---

## 2. Архитектурный контекст (что нужно учитывать до начала работ)
- **Data layer**: Supabase без миграций. Любое изменение `field` влияет на реальную таблицу. Нужны транзакции и уведомления.
- **Shared types**: типы `EntityDefinition`/`Field` уже используются во множестве модулей (Lists, Forms, Relation hooks). Разрыв контракта ломает runtime.
- **State**: сейчас данные загружаются по месту. Для Builder потребуется единый store/React Query, иначе разные панели будут рассинхронизированы.
- **Permissions**: ACL хранится в тех же сущностях, что и данные. Нужно синхронизировать значения между Builder и формами.
- **UI**: проект использует shadcn компоненты (`@/components/ui`). Новый Builder должен оставаться в тех же паттернах.

---

## 3. Критические изменения исходного плана (MVP-ready)
1. **Единый контракт Field/Entity**  
   - Добавить `FieldSchema`/`EntitySchema` (например, Zod) в `lib/universal-entity`.  
   - Использовать эту схему в server actions, Builder Store, FormPreview и runtime модулях (`table-column-generator`, `use-relation-field-options`).  
   - Гарантия: Builder не сохранит поле, которое не поддержит runtime.

2. **Builder Store + optimistic flow**  
   - Создать `EntityDefinitionBuilderStore` (Zustand или React Query cache) с состояниями: `entities`, `selectedEntityId`, `entityDraft`, `fields`, `pendingChanges`, `lastSyncedAt`.  
   - Все клиентские компоненты (FieldList, FormPreview, PermissionEditor) читают/пишут через store → нет рассинхронизации.

3. **Server actions через сервисный слой**  
   - В `lib/universal-entity` добавить сервисы: `entityDefinitionService.save`, `fieldService.save/reorder/delete`, `relationService`.  
   - Server actions становятся thin layer + revalidate.  
   - Упаковать reorder/delete в одну транзакцию (Supabase RPC или батч).

4. **Migration & risk guard**  
   - FieldEditor при смене `db_type` или relation обязателен confirmation модал.  
   - Добавить минимальный diff preview: старое значение vs новое + предупреждение о необходимости ручной миграции.

5. **Permission consistency**  
   - Вынести список допустимых прав доступа в конфиг (например, `config/authConfig.json`).  
   - PermissionEditor использует этот источник + валидацию на сервере.

6. **Relation Builder guard rails**  
   - Валидировать циклы и отношения (one-to-many и т.д.), автогенерация обратных полей только после подтверждения.  
   - Обновить `use-relation-field-options.ts`, чтобы понимал новые типы.

7. **FormPreview sandbox**  
   - Запускать preview внутри локального провайдера данных (mock), отключить реальные API вызовы, использовать Suspense + ErrorBoundary.

Эти изменения обязательны до старта детальной реализации задач 2.1–2.9.

---

## 4. Детальный план работ (первая базовая версия)

### 4.1. Foundation (1–1.5 дня)
- Реализовать `FieldSchema`/`EntitySchema` и сервисный слой (CRUD, reorder, relation helpers).  
- Добавить таблицу `schema_change_log` (id, project_id, entity_id, action, payload, author, timestamp) для аудита.  
- Настроить Builder Store с поддержкой optimistic updates и rollback.

### 4.2. Страница Builder (roadmap задача 2.1, 0.5 дня)
- Серверный компонент получает список сущностей (`getEntityDefinitions`), клиентский провайдер инициализирует store.  
- Query параметр `entityId` → store.selectEntity.  
- Пустые состояния (нет сущностей, сущность не выбрана).  
- Убедиться, что левая/центральная/правая панель используют один источник данных.

### 4.3. EntityDefinitionEditor (задача 2.3, 1 день)
- Tabs: General, Permissions, UI, Pagination/Filters.  
- Все поля двигаются через store, кнопки Save/Reset работают с server actions, отображают состояние saving/error.  
- PermissionEditor опирается на централизованный список ролей/прав.  
- Добавить вывод системных полей (slug, type) и невозможность редактировать запрещённые значения.

### 4.4. FieldList + FieldEditor + FieldTypeSelector (задачи 2.4, 2.5, 2.6, ~2 дня)
- FieldList: dnd-kit + optimistic reorder, loading/empty states, кнопки Add/Delete/Edit.  
- FieldEditor: модальное окно со stepper’ом (Основные → Валидация → Отображение → Advanced).  
- При выборе типа из FieldTypeSelector создаётся шаблон draft (label, name, db_type, validation).  
- Удаление поля: подтверждение + transaction-safe action.  
- Интеграция с RelationBuilder для relation типов.

### 4.5. RelationBuilder (задача 2.7, 1 день)
- UI: выбор целевой Entity Definition, тип связи, checkbox “создать обратное поле”, выбор имен.  
- Валидатор графа (запрет циклов many-to-many без junction, запрет orphan relations).  
- Сервис создаёт/обновляет пары полей атомарно.

### 4.6. FormPreview (задача 2.8, 0.5 дня)
- Рендер `UniversalEntityForm` / `FormPreview` внутри sandbox provder (mock data + mocked api).  
- Включить live validation (Zod схемы), секции (если появятся позже) и отображение системных полей.  
- Обернуть в Suspense + ErrorBoundary, чтобы ошибки кастомных компонентов не ломали Builder.

### 4.7. Server actions (задача 2.9, 0.5 дня)
- Обновить actions, чтобы они обращались к сервисам, проверяли `updated_at` (optimistic concurrency) и писали лог в `schema_change_log`.  
- После успеха вызывать `revalidatePath` и резолвить store promises.

### 4.8. QA и документация (0.5 дня)
- Smoke тесты: создать сущность, добавить поле, reorder, удалить поле, создать связь, проверить preview.  
- Плейбук в `docs/implementation/...` с описанием flow и чек-листом.

Суммарно: 5–6 дней на базовый функционал (как в roadmap), плюс 1–1.5 дня на foundation и audit log.

---

## 5. Критические риски и меры
| Риск | Проявление | Что делаем |
| --- | --- | --- |
| Data integrity | Смена `db_type` ломает данные | Schema diff + confirmation, audit log, рекомендация на экспорт/backup |
| Race conditions | Два пользователя сохраняют сущность | `updated_at` check + store sync + toast об ошибке |
| Relation drift | Обратные поля не синхронизированы | RelationBuilder создает оба поля за один вызов, граф-валидатор |
| Permission mismatch | Значения прав не распознаются в Lists | Централизованный ACL контракт + unit tests |
| Performance | dnd-kit + preview перегружают страницу | Lazy loading крупных модулей, memoization, limit на количество полей в DOM |
| Preview side effects | Компоненты выполняют запросы | Sandbox provider, замоканные fetch’и |

---

## 6. Обязательные рекомендации (до релиза MVP)
1. **Schema registry JSON**: хранить расширенную схему сущности (UI config, relation graph, версии) в `entity_definition.schema`.  
2. **Audit log**: фиксировать все действия Builder’а (понадобится для отката/диагностики).  
3. **Undo/redo (минимально)**: хранить локальный стек изменений (reorder, delete).  
4. **Validation & naming guard**: зарезервированные имена (id, created_at и т.д.), auto slug, предупреждения при конфликте.  
5. **Permission presets**: отдельный конфиг со списком ролей/политик, который используется и Builder’ом, и runtime.  
6. **UI consistency**: переиспользовать `@/components/ui` + существующие layout токены (spacing guide).  
7. **Testing hooks**: unit-тесты на сервисы (`fieldService`, `relationService`) и интеграционные тесты на server actions.

---

## 7. Что можно сделать позже (post-MVP backlog)
1. **Draft/Publish workflow** + версия схемы (как в Strapi).  
2. **Автоматические миграции**: генерация SQL/DDL и применение через Supabase CLI.  
3. **Custom field plugins**: registry для сторонних компонентов, validation и storage adapters.  
4. **Presets/Views**: Directus-подход с сохранением фильтров/сортировок на уровне сущности.  
5. **API playground & codegen**: автоматический REST/GraphQL пример, скачивание TypeScript типов.  
6. **Localization**: поддержка локализованных полей, переводов label/placeholder.  
7. **Relation diagram UI**: граф с drag & drop связями, автопроверкой циклов.  
8. **Automation hooks**: before/after change webhooks, нотификации в Slack.  
9. **CLI sync**: экспорт/импорт схемы для разных проектов/окружений.

---

## 8. Что стоит заимствовать у Strapi / Directus / Payload
- **Strapi**: draft/publish, предупреждения о миграциях, компонентные поля (Reusable Components), onboarding wizard для сущности.  
- **Directus**: data dictionary, живой relation diagram, granular field-level permissions, presets.  
- **Payload**: field hooks (beforeValidate/afterChange), блоковый builder, автоматическая генерация TS типов, localization.  
- **Общее**: undo stack, audit log, API playground, CLI sync.

---

## 9. Итоговый диагноз
- **Текущее состояние**: после интеграции критических правок (раздел 3) roadmap задачи 2.1–2.9 можно выполнять без риска поломать universal-entity слой.  
- **Готовность к старту**: высокая, если foundation (schema contract + store + service layer) сделаны в первую очередь.  
- **Риск**: средний — главное не откладывать guard rails (schema validation, relation checks, permission presets).  
- **Дальнейшие шаги**: реализовать план из раздела 4, вести журнал внедрения, параллельно готовить backlog из раздела 7. Это даст MVP, от которого можно отталкиваться к уровню Strapi/Directus/Payload.

--- 

Документ предназначен для команды разработки: он связывает исходный roadmap, текущую архитектуру и best practices headless CMS, чтобы стартовая версия Content Types Builder была устойчивой и расширяемой.

