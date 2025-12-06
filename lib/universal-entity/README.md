# Universal Entity System

Универсальная система для работы с сущностями без создания отдельных таблиц для каждого типа.

## Типы

**Важно:** Все базовые типы (`EntityDefinition`, `Field`, `FieldValue`, `EntityInstance`, и т.д.) импортируются из пакета `@igorchugurov/public-api-sdk`:

```typescript
import type {
  EntityDefinition,
  Field,
  EntityInstance,
} from "@igorchugurov/public-api-sdk";
```

Локальные типы в этой папке:

- `ui-config-types.ts` - типы для UI конфигурации (ListPageConfig, FormPageConfig, MessagesConfig)
- `form-service-types.ts` - типы для сервисов форм (FormServicePayload, FormServiceResult)
- `config-file-types.ts` - типы для JSON конфигов (EntityConfigFile, FieldFromConfig)

## Структура

```
lib/universal-entity/
├── config-service.ts              # Загрузка конфигурации (entities, fields) с кэшированием
├── config-loader.ts               # Загрузка конфигов из JSON файлов
├── config-utils.ts                # Преобразование между JSON конфигами и БД данными
├── entity-definition-service.ts   # CRUD операции для EntityDefinition (server-side)
├── entity-definition-client-service.ts  # Клиентский сервис для EntityDefinition
├── field-client-service.ts        # Клиентский сервис для Field
├── relation-service.ts            # Работа со связями (many-to-many, many-to-one, etc.)
├── table-utils.ts                 # Утилиты для конфигурации таблиц
├── list-service-factory.ts        # Фабрика сервисов для списков
├── ui-config-types.ts             # Типы для UI конфигурации
├── form-service-types.ts          # Типы для сервисов форм
├── config-file-types.ts           # Типы для JSON конфигов
└── index.ts                       # Экспорты
```

## Использование

### Загрузка конфигурации

```typescript
import { getEntityDefinitions, getFields } from "@/lib/universal-entity";
import type { EntityDefinition, Field } from "@igorchugurov/public-api-sdk";

// Получить все сущности проекта
const entities: EntityDefinition[] = await getEntityDefinitions(projectId);

// Получить поля сущности
const fields: Field[] = await getFields(entityDefinitionId);

// Получить сущность с полями и UI конфигом
const result = await getEntityDefinitionWithUIConfig(entityDefinitionId);
```

### Работа со связями

```typescript
import { relationService } from "@/lib/universal-entity";
import type { RelationsData } from "@igorchugurov/public-api-sdk";

// Создать связи
const relations: RelationsData = {
  tags: ["tag-id-1", "tag-id-2"],
};
await relationService.createRelations(
  instanceId,
  entityDefinitionId,
  relations
);

// Получить связанные экземпляры
const tags = await relationService.getRelatedInstances(instanceId, tagsFieldId);
```

## Документация

См. `docs/implementation/UNIVERSAL_ENTITY_FINAL_ARCHITECTURE.md`
