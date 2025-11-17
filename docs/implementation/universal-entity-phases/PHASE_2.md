# Фаза 2: Сервисный слой

**Статус:** ✅ Завершено  
**Начало:** 2025-01-XX  
**Завершено:** 2025-01-XX  
**Сборка:** ✅ Успешно

## Задачи

- [x] 1. Создать типы TypeScript
- [x] 2. Создать `config-service.ts` - загрузка конфигурации
- [x] 3. Создать `instance-service.ts` - CRUD экземпляров
- [x] 4. Создать `relation-service.ts` - работа со связями
- [x] 5. Создать `index.ts` - экспорты
- [ ] 6. Написать тесты (опционально)

## Прогресс

### ✅ 1. Создать типы TypeScript

**Статус:** ✅ Выполнено  
**Файл:** `lib/universal-entity/types.ts`

Созданы типы:

- ✅ `EntityDefinition` - конфигурация сущности (с полями разрешений)
- ✅ `Field` - конфигурация поля
- ✅ `EntityInstance` - экземпляр сущности (JSONB data)
- ✅ `EntityRelation` - связь между экземплярами
- ✅ `EntityInstanceWithFields` - экземпляр с полями и связями
- ✅ `GetInstancesOptions` - опции для получения списка
- ✅ `InstanceData`, `RelationsData` - данные для создания/обновления

**Результат:** ✅ Все типы созданы и готовы к использованию

---

### ✅ 2. Создать `config-service.ts`

**Статус:** ✅ Выполнено  
**Файл:** `lib/universal-entity/config-service.ts`

Сервис создан с функциями:

- ✅ `getEntityDefinitions(projectId, forceRefresh?)` - получить все сущности проекта
- ✅ `getFields(entityDefinitionId?, forceRefresh?)` - получить поля
- ✅ `getFullConfig(projectId, forceRefresh?)` - получить полную конфигурацию
- ✅ `getEntityDefinitionById(id)` - получить сущность по ID
- ✅ `getFieldById(id)` - получить поле по ID
- ✅ `clearCache()` - очистить кэш
- ✅ Кэширование на 5 минут

**Результат:** ✅ Сервис готов к использованию

---

### ✅ 3. Создать `instance-service.ts`

**Статус:** ✅ Выполнено  
**Файл:** `lib/universal-entity/instance-service.ts`

Сервис создан с функциями:

- ✅ `create(entityDefinitionId, projectId, data, relations?)` - создать экземпляр
- ✅ `getById(instanceId, includeRelations?)` - получить экземпляр с опциональными связями
- ✅ `getAll(entityDefinitionId, projectId, options?)` - получить список с фильтрами и пагинацией
- ✅ `update(instanceId, data, relations?)` - обновить экземпляр
- ✅ `delete(instanceId)` - удалить экземпляр
- ✅ Поддержка JSONB данных
- ✅ Автоматическая загрузка связей

**Результат:** ✅ Сервис готов к использованию

---

### ✅ 4. Создать `relation-service.ts`

**Статус:** ✅ Выполнено  
**Файл:** `lib/universal-entity/relation-service.ts`

Сервис создан с функциями:

- ✅ `createRelations(sourceInstanceId, entityDefinitionId, relations)` - создать связи
- ✅ `updateRelations(sourceInstanceId, entityDefinitionId, relations)` - обновить связи (удаление старых + создание новых)
- ✅ `getRelatedInstances(sourceInstanceId, relationFieldId)` - получить связанные экземпляры
- ✅ `deleteRelations(sourceInstanceId, relationFieldId?)` - удалить связи
- ✅ Поддержка всех типов связей: manyToMany, manyToOne, oneToMany, oneToOne
- ✅ Автоматическое определение обратных полей

**Результат:** ✅ Сервис готов к использованию

---

## Структура файлов

```
lib/universal-entity/
├── types.ts              # TypeScript типы
├── config-service.ts     # Загрузка конфигурации
├── instance-service.ts   # CRUD экземпляров
├── relation-service.ts   # Работа со связями
└── index.ts             # Экспорты
```

### ✅ 5. Создать `index.ts`

**Статус:** ✅ Выполнено  
**Файл:** `lib/universal-entity/index.ts`

Создан файл экспортов:

- ✅ Экспорт всех типов
- ✅ Экспорт всех функций сервисов
- ✅ Экспорт сервисов как объектов для удобства

**Результат:** ✅ Все экспорты настроены

---

## Статус Фазы 2

**Статус:** ✅ Завершено

Все сервисы созданы и готовы к использованию:

- ✅ Типы TypeScript
- ✅ Config Service (загрузка конфигурации)
- ✅ Instance Service (CRUD экземпляров)
- ✅ Relation Service (работа со связями)
- ✅ Index (экспорты)

## Следующие шаги

Переходим к **Фазе 3: Интеграция**

1. Загрузка конфигурации в layout
2. Формирование меню из entities
3. Тестирование с данными
