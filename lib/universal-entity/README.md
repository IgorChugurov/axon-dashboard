# Universal Entity System

Универсальная система для работы с сущностями без создания отдельных таблиц для каждого типа.

## Структура

```
lib/universal-entity/
├── types.ts              # TypeScript типы
├── config-service.ts     # Загрузка конфигурации (entities, fields)
├── instance-service.ts   # CRUD операции с экземплярами
├── relation-service.ts   # Работа со связями (many-to-many, many-to-one, etc.)
└── index.ts             # Экспорты
```

## Использование

### Загрузка конфигурации

```typescript
import { getEntityDefinitions, getFields } from "@/lib/universal-entity";

// Получить все сущности проекта
const entities = await getEntityDefinitions(projectId);

// Получить поля сущности
const fields = await getFields(entityDefinitionId);
```

### Работа с экземплярами

```typescript
import { instanceService } from "@/lib/universal-entity";

// Создать экземпляр
const instance = await instanceService.create(entityDefinitionId, projectId, {
  name: "My Block",
  body: "Content",
});

// Получить экземпляр
const instance = await instanceService.getById(instanceId);

// Обновить экземпляр
await instanceService.update(instanceId, {
  name: "Updated Block",
});
```

### Работа со связями

```typescript
import { relationService } from "@/lib/universal-entity";

// Создать связи
await relationService.createRelations(instanceId, {
  tags: ["tag-id-1", "tag-id-2"],
});

// Получить связанные экземпляры
const tags = await relationService.getRelatedInstances(instanceId, tagsFieldId);
```

## Документация

См. `docs/implementation/UNIVERSAL_ENTITY_FINAL_ARCHITECTURE.md`
