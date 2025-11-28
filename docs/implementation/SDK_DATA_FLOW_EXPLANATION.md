# Полное объяснение флоу загрузки данных

**Дата создания:** 2025-01-29  
**Цель:** Понять, откуда и как загружаются данные, и как это будет работать с SDK

---

## 📊 Текущий флоу (КАК СЕЙЧАС)

### Сценарий: Получение списка экземпляров сущности

#### Шаг 1: Страница (Server Component)

**Файл:** `app/projects/[projectId]/[entityDefId]/page.tsx`

```typescript
export default async function EntityListPage({ params }) {
  const { projectId, entityDefId } = await params;

  // ✅ ЗАГРУЖАЕМ EntityDefinition (на уровне страницы)
  const entityDefinition = await getEntityDefinitionById(entityDefId);
  // Откуда: из БД (таблица entity_definition)
  // Зачем: название, описание, настройки UI, разрешения

  // ✅ ЗАГРУЖАЕМ Fields (на уровне страницы)
  const fields = await getFields(entityDefId);
  // Откуда: из БД (таблица field)
  // Зачем: конфигурация полей для таблицы, фильтров, форм

  // ✅ ПЕРЕДАЕМ в компонент
  return (
    <EntityInstancesListClient
      projectId={projectId}
      entityDefinition={entityDefinition} // ← передаем
      fields={fields} // ← передаем
    />
  );
}
```

**Что загружается:**

- ✅ EntityDefinition (1 запрос к БД)
- ✅ Fields (1 запрос к БД, с кэшем)
- ❌ Instances (НЕ загружаются на странице!)

---

#### Шаг 2: Компонент (Client Component)

**Файл:** `components/universal-entity-list/EntityInstancesListClient.tsx`

```typescript
export function EntityInstancesListClient({
  projectId,
  entityDefinition, // ← получаем от страницы
  fields, // ← получаем от страницы
}) {
  // Используем entityDefinition и fields для:
  // 1. Построения конфигурации таблицы
  // 2. Определения какие поля показывать
  // 3. Определения какие поля фильтровать
  // 4. Определения какие relations загружать

  // Определяем relation fields для загрузки
  const relationFieldNames = fields
    .filter((f) => f.displayInTable && f.dbType === "manyToMany")
    .map((f) => f.name);

  // Создаем сервис для загрузки данных
  const listService = createEntityInstanceListService(
    entityDefinition.id, // ← entityDefinitionId
    projectId,
    {
      includeRelations: relationFieldNames, // ← какие relations загружать
    }
  );

  // Используем сервис для загрузки instances
  return (
    <UniversalEntityListClient
      onLoadData={listService.loadData} // ← функция загрузки
    />
  );
}
```

**Что происходит:**

- ✅ Использует entityDefinition для конфигурации
- ✅ Использует fields для определения структуры
- ✅ Создает сервис для загрузки instances
- ❌ Instances еще НЕ загружены!

---

#### Шаг 3: Загрузка Instances (внутри компонента)

**Файл:** `lib/universal-entity/list-service-factory.ts`

```typescript
export function createEntityInstanceListService(
  entityDefinitionId: string, // ← передаем ID сущности
  projectId: string,
  options?: {
    includeRelations?: string[];
  }
) {
  return {
    loadData: async (params) => {
      // ✅ ВЫЗЫВАЕМ функцию загрузки
      return await getEntityInstancesFromClient(
        entityDefinitionId, // ← передаем ID сущности
        projectId,
        {
          page: params.page,
          limit: params.limit,
          includeRelations: options?.includeRelations,
        }
      );
    },
  };
}
```

**Что передается:**

- ✅ `entityDefinitionId` - ID сущности (из URL)
- ✅ `projectId` - ID проекта (из URL)
- ✅ Параметры пагинации, фильтров, поиска

---

#### Шаг 4: Функция загрузки Instances

**Файл:** `lib/universal-entity/instance-client-service.ts`

```typescript
export async function getEntityInstancesFromClient(
  entityDefinitionId: string,  // ← получаем ID сущности
  projectId: string,
  params: { ... }
) {
  const supabase = createClient();

  // 1. ✅ ЗАГРУЖАЕМ Instances из БД
  const { data: instances } = await supabase
    .from("entity_instance")
    .select("*")
    .eq("entity_definition_id", entityDefinitionId)  // ← фильтр по ID сущности
    .eq("project_id", projectId);

  // 2. ✅ ЗАГРУЖАЕМ Fields (для уплощения)
  const fields = await getFieldsFromClient(entityDefinitionId);
  // Откуда: из БД (таблица field)
  // Зачем: чтобы знать типы полей для уплощения (data -> плоская структура)

  // 3. ✅ ЗАГРУЖАЕМ Relations (если нужно)
  if (params.includeRelations) {
    // Загружаем связи из entity_relation
  }

  // 4. ✅ УПЛОЩАЕМ экземпляры (data -> плоская структура)
  const flattened = instances.map(inst =>
    flattenInstance(inst, fields)
  );

  return {
    data: flattened,
    pagination: { ... }
  };
}
```

**Что загружается внутри функции:**

- ✅ Instances (из `entity_instance`)
- ✅ Fields (из `field`) - для уплощения
- ✅ Relations (из `entity_relation`) - если нужно
- ❌ EntityDefinition (НЕ загружается!)

---

## 🎯 ИТОГОВАЯ СХЕМА (КАК СЕЙЧАС)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PAGE (Server Component)                                  │
│    app/projects/[projectId]/[entityDefId]/page.tsx          │
├─────────────────────────────────────────────────────────────┤
│ ✅ Загружает:                                                │
│    - EntityDefinition (getEntityDefinitionById)             │
│    - Fields (getFields)                                     │
│                                                              │
│ ❌ НЕ загружает:                                             │
│    - Instances                                               │
└─────────────────────────────────────────────────────────────┘
                        ↓ передает
┌─────────────────────────────────────────────────────────────┐
│ 2. COMPONENT (Client Component)                              │
│    EntityInstancesListClient                                │
├─────────────────────────────────────────────────────────────┤
│ ✅ Получает:                                                 │
│    - entityDefinition (от страницы)                         │
│    - fields (от страницы)                                   │
│                                                              │
│ ✅ Использует для:                                           │
│    - Конфигурации таблицы                                    │
│    - Определения relations для загрузки                      │
│    - Создания сервиса загрузки                               │
└─────────────────────────────────────────────────────────────┘
                        ↓ вызывает
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE (Client Service)                                 │
│    getEntityInstancesFromClient()                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ Получает:                                                 │
│    - entityDefinitionId (ID сущности)                       │
│    - projectId                                               │
│    - params (пагинация, фильтры, поиск)                     │
│                                                              │
│ ✅ Загружает внутри:                                         │
│    - Instances (из entity_instance)                         │
│    - Fields (из field) - для уплощения                      │
│    - Relations (из entity_relation) - если нужно            │
│                                                              │
│ ❌ НЕ загружает:                                             │
│    - EntityDefinition (уже есть от страницы)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Как будет работать с SDK

### Вариант 1: Полная замена (рекомендуется для публичного API)

```typescript
// В клиентском приложении (например, React SPA)

import { ClientPublicAPIClient } from "@/lib/sdk/public-api/client";

// 1. Создаем SDK клиент
const sdk = ClientPublicAPIClient.create(projectId, {
  enableCache: true, // кэшируем конфигурацию
});

// 2. Загружаем EntityDefinition + Fields (если нужны для UI)
const config = await sdk.getEntityDefinitionConfig(entityDefinitionId);
// Внутри SDK:
//   - Загружает EntityDefinition (из БД)
//   - Загружает Fields (из БД)
//   - Кэширует на 5 минут

// 3. Загружаем Instances
const { data: instances, pagination } = await sdk.getInstances(
  entityDefinitionId, // ← передаем ID сущности
  {
    page: 1,
    limit: 20,
    includeRelations: ["author", "tags"], // если нужны relations
  }
);
// Внутри SDK:
//   - Загружает Instances (из entity_instance)
//   - Загружает Fields (из field, с кэшем) - для уплощения
//   - Загружает Relations (из entity_relation) - если нужно
//   - Уплощает экземпляры
```

**Что передается в SDK:**

- ✅ `entityDefinitionId` - ID сущности (обязательно)
- ✅ `projectId` - ID проекта (при создании SDK)
- ✅ Параметры (пагинация, фильтры, поиск, relations)

**Что загружается внутри SDK:**

- ✅ Instances (из `entity_instance`)
- ✅ Fields (из `field`) - для уплощения, с кэшем
- ✅ Relations (из `entity_relation`) - если нужно
- ✅ EntityDefinition (только если вызываем `getEntityDefinitionConfig()`)

---

### Вариант 2: Гибридный (для миграции существующего кода)

```typescript
// В странице (Server Component)
export default async function EntityListPage({ params }) {
  const { projectId, entityDefId } = await params;

  // Загружаем EntityDefinition + Fields (как сейчас)
  const entityDefinition = await getEntityDefinitionById(entityDefId);
  const fields = await getFields(entityDefId);

  // Но используем SDK для загрузки instances
  const sdk = await ServerPublicAPIClient.create(projectId);
  const { data: instances } = await sdk.getInstances(entityDefId, {
    page: 1,
    limit: 20,
  });

  return (
    <EntityInstancesListClient
      entityDefinition={entityDefinition}
      fields={fields}
      initialInstances={instances}
    />
  );
}
```

---

## 📝 Ответы на вопросы

### Вопрос 1: Что передавать в SDK метод?

**Ответ:** Только `entityDefinitionId` (ID сущности)

```typescript
// ✅ ПРАВИЛЬНО
const instances = await sdk.getInstances(entityDefinitionId, {
  page: 1,
  limit: 20,
});

// ❌ НЕПРАВИЛЬНО (не нужно передавать entityDefinition или fields)
const instances = await sdk.getInstances(
  entityDefinitionId,
  entityDefinition,
  fields
);
```

### Вопрос 2: Что загружается внутри SDK метода?

**Ответ:**

- ✅ Instances (из `entity_instance`)
- ✅ Fields (из `field`) - для уплощения, с кэшем
- ✅ Relations (из `entity_relation`) - если указано в `includeRelations`
- ❌ EntityDefinition (НЕ загружается автоматически)

### Вопрос 3: Нужна ли EntityDefinition?

**Ответ:** Да, но загружается отдельно (если нужна)

**Когда нужна:**

- Для построения таблицы (названия колонок, настройки)
- Для проверки разрешений (readPermission, createPermission)
- Для UI конфигурации (описания, настройки формы)

**Как загрузить:**

```typescript
// Вариант 1: Отдельный метод SDK
const config = await sdk.getEntityDefinitionConfig(entityDefinitionId);
// config содержит: entityDefinition + fields

// Вариант 2: Загрузить напрямую (как сейчас)
const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
```

---

## 🎯 Сравнение: Сейчас vs SDK

|                      | **Сейчас**                                       | **С SDK**                                  |
| -------------------- | ------------------------------------------------ | ------------------------------------------ |
| **EntityDefinition** | Загружается на странице                          | Загружается отдельно (если нужна)          |
| **Fields**           | Загружается на странице + внутри функции         | Загружается внутри SDK (с кэшем)           |
| **Instances**        | Загружается внутри функции                       | Загружается через SDK метод                |
| **Relations**        | Загружается внутри функции                       | Загружается внутри SDK (если указано)      |
| **Кэширование**      | Только server-side (config-service)              | Server + Client (с флагом enableCache)     |
| **Передача данных**  | entityDefinition + fields передаются в компонент | Только entityDefinitionId передается в SDK |

---

## ✅ Итоговая схема с SDK

```
┌─────────────────────────────────────────────────────────────┐
│ КЛИЕНТСКОЕ ПРИЛОЖЕНИЕ (React SPA, Next.js и т.д.)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ // 1. Создаем SDK                                            │
│ const sdk = ClientPublicAPIClient.create(projectId);         │
│                                                              │
│ // 2. Загружаем конфигурацию (если нужна для UI)            │
│ const config = await sdk.getEntityDefinitionConfig(          │
│   entityDefinitionId  // ← передаем ID сущности            │
│ );                                                           │
│ // Внутри: загружает EntityDefinition + Fields, кэширует    │
│                                                              │
│ // 3. Загружаем instances                                    │
│ const { data, pagination } = await sdk.getInstances(         │
│   entityDefinitionId,  // ← передаем ID сущности            │
│   { page: 1, limit: 20 }                                     │
│ );                                                           │
│ // Внутри:                                                    │
│ //   - Загружает Instances (из entity_instance)             │
│ //   - Загружает Fields (из field, с кэшем) - для уплощения│
│ //   - Загружает Relations (если указано)                   │
│ //   - Уплощает экземпляры                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Выводы

1. **В SDK метод передается только `entityDefinitionId`** (ID сущности)
2. **Внутри SDK загружаются:**
   - Instances (обязательно)
   - Fields (для уплощения, с кэшем)
   - Relations (если указано)
3. **EntityDefinition загружается отдельно** (если нужна для UI)
4. **SDK скрывает сложность** - не нужно передавать entityDefinition или fields

---

**Теперь понятно?** 🚀
