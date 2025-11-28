# Анализ бага и понимание загрузки EntityDefinition

**Дата создания:** 2025-01-29  
**Цель:** Проверить баг с двойной загрузкой fields и понять, откуда берутся данные EntityDefinition

---

## 🐛 1. БАГ: Двойная загрузка fields в `getInstanceById()`

### Проблема

В `lib/universal-entity/instance-service.ts`, функция `getInstanceById()`:

```typescript
// Строка 290: Загружаем fields для relations
if (includeRelations && includeRelations.length > 0) {
  const fields = await getFields(transformedInstance.entityDefinitionId);
  // ... используем fields для загрузки relations
}

// Строка 356: Загружаем fields СНОВА для уплощения
const fields = await getFields(transformedInstance.entityDefinitionId);
```

**Это баг!** Fields загружаются дважды, даже если кэш работает.

### Исправление

```typescript
export async function getInstanceById(
  instanceId: string,
  includeRelations?: string[],
  options?: { relationsAsIds?: boolean }
): Promise<EntityInstanceWithFields> {
  // ... загрузка instance ...

  // Загружаем fields ОДИН РАЗ
  const fields = await getFields(transformedInstance.entityDefinitionId);

  // 2. Загружаем связи если нужно (используем уже загруженные fields)
  const relations: Record<string, EntityInstanceWithFields[]> = {};
  if (includeRelations && includeRelations.length > 0) {
    for (const relationFieldName of includeRelations) {
      const relationField = fields.find(/* ... */);
      // ... загрузка relations ...
    }
  }

  // 3. Загружаем файлы (используем уже загруженные fields)
  const fileFields = fields.filter(/* ... */);

  // 4. Уплощаем экземпляр (используем уже загруженные fields)
  const result = flattenInstance(
    instanceWithRelations,
    fields,
    options?.relationsAsIds ?? false
  );

  return result;
}
```

**Рекомендация:** Исправить этот баг перед созданием SDK, чтобы SDK использовал оптимизированный код.

---

## 📊 2. Откуда берутся данные по EntityDefinition?

### Текущая архитектура

**EntityDefinition загружается на уровне страниц, НЕ в instance-service:**

#### Пример 1: Страница редактирования (`page.tsx`)

```typescript
// app/projects/[projectId]/[entityDefId]/[instanceId]/page.tsx

export default async function EntityEditPage({ params }) {
  const { projectId, entityDefId, instanceId } = await params;

  // 1. Загружаем EntityDefinition + Fields + UI Config (на уровне страницы)
  const config = await getEntityDefinitionWithUIConfig(entityDefId);

  // 2. Определяем relation fields из уже загруженного config
  const relationFields = config.fields.filter(/* ... */);
  const relationFieldNames = relationFields.map((f) => f.name);

  // 3. Загружаем instance (БЕЗ entityDefinition, только fields внутри)
  const instance = await getInstanceById(
    instanceId,
    relationFieldNames.length > 0 ? relationFieldNames : undefined,
    { relationsAsIds: true }
  );

  // 4. Используем config.entityDefinition для формы
  return (
    <EntityInstanceFormNew
      entityDefinition={config.entityDefinition}
      fields={config.fields}
      // ...
    />
  );
}
```

#### Пример 2: Страница списка (`page.tsx`)

```typescript
// app/projects/[projectId]/[entityDefId]/page.tsx

export default async function EntityListPage({ params }) {
  const { projectId, entityDefId } = await params;

  // 1. Загружаем EntityDefinition (на уровне страницы)
  const entityDefinition = await getEntityDefinitionById(entityDefId);

  // 2. Загружаем Fields (на уровне страницы)
  const fields = await getFields(entityDefId);

  // 3. Передаем в компонент
  return (
    <EntityInstancesListClient
      entityDefinition={entityDefinition}
      fields={fields}
      // ...
    />
  );
}
```

### Выводы

1. **EntityDefinition НЕ загружается в `instance-service`:**

   - `getInstanceById()` загружает только fields
   - EntityDefinition загружается на уровне страниц через `getEntityDefinitionWithUIConfig()` или `getEntityDefinitionById()`

2. **Зачем нужен EntityDefinition:**

   - **UI конфигурация:** название, описание, настройки формы
   - **Проверка разрешений:** readPermission, createPermission и т.д.
   - **Но:** Проверка разрешений делается через RLS на уровне БД, не в коде

3. **Почему не загружается в instance-service:**
   - Для уплощения экземпляра нужны только fields (чтобы знать типы полей)
   - EntityDefinition нужен только для UI и проверок, которые делаются на уровне страниц

---

## 🔄 3. План миграции на SDK

### Правильное понимание:

**Да, нужно:**

1. ✅ Создать SDK
2. ✅ Заменить работу с entityInstance методами SDK
3. ✅ Заменить авторизацию методами SDK

**Но важно понимать:**

1. **EntityDefinition загружается на уровне страниц:**

   - SDK может предоставить метод `getEntityDefinitionConfig()` для загрузки
   - Но страницы могут продолжать загружать его напрямую через `config-service`
   - Или использовать SDK метод

2. **Постепенная миграция:**

   - Сначала SDK для публичного API (новые клиентские приложения)
   - Потом постепенно мигрировать существующий код
   - Старые сервисы (`instance-service`, `config-service`) остаются и используются внутри SDK

3. **Структура SDK:**

```typescript
class PublicAPIClient {
  // Для работы с entityInstance
  async getInstances(entityDefinitionId, params);
  async getInstance(entityDefinitionId, id, params);
  async createInstance(entityDefinitionId, data);
  async updateInstance(entityDefinitionId, id, data);
  async deleteInstance(entityDefinitionId, id);

  // Для загрузки конфигурации (опционально)
  async getEntityDefinitionConfig(entityDefinitionId); // если нужен для проверок
  async getFields(entityDefinitionId); // для уплощения

  // Авторизация
  async signIn(email, password);
  async signUp(data);
  async signOut();
  async getCurrentUser();
}
```

### Миграция существующего кода:

#### Вариант 1: Полная миграция

```typescript
// Было:
const instance = await getInstanceById(instanceId, includeRelations);

// Стало:
const sdk = ServerPublicAPIClient.create(projectId);
const instance = await sdk.getInstance(entityDefinitionId, instanceId, {
  includeRelations,
});
```

#### Вариант 2: Гибридный подход (рекомендуется)

```typescript
// Страницы продолжают загружать EntityDefinition напрямую
const config = await getEntityDefinitionWithUIConfig(entityDefId);

// Но используют SDK для работы с instances
const sdk = ServerPublicAPIClient.create(projectId);
const instance = await sdk.getInstance(entityDefinitionId, instanceId);
```

---

## ✅ Итоговые рекомендации

### 1. Исправить баг с двойной загрузкой fields

**Файл:** `lib/universal-entity/instance-service.ts`  
**Функция:** `getInstanceById()`  
**Исправление:** Загружать fields один раз и переиспользовать

### 2. SDK структура

- **Методы для entityInstance:** CRUD операции
- **Методы для конфигурации:** `getEntityDefinitionConfig()`, `getFields()` (опционально)
- **Методы для авторизации:** signIn, signUp, signOut, getCurrentUser

### 3. Миграция

- **Постепенная:** Сначала SDK, потом миграция существующего кода
- **Гибридная:** Страницы могут загружать EntityDefinition напрямую, SDK используется для instances
- **Совместимость:** Старые сервисы остаются и используются внутри SDK

---

**Вывод:** Да, это баг. И да, нужно сделать SDK и заменить работу с entityInstance и авторизацию его методами. EntityDefinition загружается на уровне страниц, SDK может предоставить метод для его загрузки, но это опционально.
