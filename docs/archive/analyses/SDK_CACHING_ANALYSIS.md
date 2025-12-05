# Анализ кэширования в текущей реализации

**Дата создания:** 2025-01-29  
**Цель:** Понять, как сейчас загружаются entityDefinition и fields

---

## 📊 Текущая ситуация

### Server-side (`instance-service.ts`)

**Как загружаются данные:**

1. **`getInstanceById()`** - загружает fields **дважды**:

   ```typescript
   // Строка 290: для загрузки relations
   const fields = await getFields(transformedInstance.entityDefinitionId);

   // Строка 356: для уплощения экземпляра
   const fields = await getFields(transformedInstance.entityDefinitionId);
   ```

2. **`getInstances()`** - загружает fields:

   ```typescript
   // Строка 478: для уплощения экземпляров
   const fields = await getFields(entityDefinitionId);
   ```

3. **`updateInstance()`** - загружает fields:
   ```typescript
   // Строка 604: для уплощения
   const fields = await getFields(entityDefinitionId);
   ```

**Использует:** `getFields()` из `config-service.ts`

**Кэширование:** ✅ **Да, использует кэш** из `config-service.ts` (5 минут TTL)

---

### Client-side (`instance-client-service.ts`)

**Как загружаются данные:**

1. **`getEntityInstanceByIdFromClient()`** - загружает fields:

   ```typescript
   // Строка 620: для уплощения
   const fields = await getFieldsFromClient(entityDefinitionId);
   ```

2. **`getEntityInstancesFromClient()`** - загружает fields:

   ```typescript
   // Строка 437: для фильтрации и уплощения
   const fields = await getFieldsFromClient(entityDefinitionId);
   ```

3. **`updateEntityInstanceFromClient()`** - загружает fields:
   ```typescript
   // Строка 844: для уплощения
   const fields = await getFieldsFromClient(typedInstance.entity_definition_id);
   ```

**Использует:** `getFieldsFromClient()` - локальная функция, загружает напрямую из БД

**Кэширование:** ❌ **Нет, загружает каждый раз** из БД

---

### `config-service.ts` (Server-side)

**Кэширование:**

```typescript
// Кэш конфигурации
let cachedConfig: {
  entities: EntityDefinition[];
  fields: Field[];
  loadedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 минут
```

**Функции:**

1. **`getFields(entityDefinitionId?, forceRefresh?)`**:

   - Проверяет кэш
   - Если кэш свежий → возвращает из кэша
   - Если кэш устарел → загружает из БД и обновляет кэш

2. **`getEntityDefinitionWithFields(entityDefinitionId)`**:
   - Проверяет кэш
   - Если есть в кэше → возвращает из кэша
   - Если нет → загружает через JOIN (entityDefinition + fields) и обновляет кэш

---

## 🔍 Выводы

### Проблемы текущей реализации:

1. **Server-side:**

   - ✅ Использует кэш (хорошо)
   - ❌ Загружает fields **дважды** в `getInstanceById()` (неоптимально)

2. **Client-side:**

   - ❌ **Не использует кэш** - загружает fields каждый раз из БД
   - ❌ Медленнее, больше запросов к БД

3. **Не загружает entityDefinition:**
   - Только fields, entityDefinition не нужен для уплощения
   - Но нужен для проверки разрешений (readPermission, createPermission и т.д.)

---

## 💡 Рекомендации для SDK

### 1. Кэширование fields

**Для SDK нужно:**

```typescript
class BasePublicAPIClient {
  private fieldsCache: Map<
    string,
    {
      fields: FieldConfig[];
      expiresAt: number;
    }
  > = new Map();

  async getFields(
    entityDefinitionId: string,
    forceRefresh = false
  ): Promise<FieldConfig[]> {
    // Если кэш отключен - всегда загружаем
    if (!this.enableCache || forceRefresh) {
      return this.loadFieldsFromDB(entityDefinitionId);
    }

    // Проверяем кэш
    const cached = this.fieldsCache.get(entityDefinitionId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.fields;
    }

    // Загружаем и кэшируем
    const fields = await this.loadFieldsFromDB(entityDefinitionId);
    this.fieldsCache.set(entityDefinitionId, {
      fields,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return fields;
  }
}
```

### 2. Кэширование entityDefinition (если нужен)

**Если нужен entityDefinition для проверки разрешений:**

```typescript
async getEntityDefinitionConfig(
  entityDefinitionId: string,
  forceRefresh = false
): Promise<EntityDefinitionConfig> {
  // Загружаем entityDefinition + fields одним JOIN запросом
  // Кэшируем вместе
}
```

### 3. Оптимизация: загружать один раз

**В `getInstanceById()` загружать fields один раз:**

```typescript
async getInstanceById(instanceId: string, includeRelations?: string[]) {
  // 1. Загружаем instance
  const instance = await this.loadInstance(instanceId);

  // 2. Загружаем fields ОДИН РАЗ (кэшируется)
  const fields = await this.getFields(instance.entityDefinitionId);

  // 3. Используем fields для:
  //    - Загрузки relations (если нужно)
  //    - Уплощения экземпляра
  //    - Загрузки файлов (если есть file fields)
}
```

---

## 📝 Итоговая стратегия для SDK

### Кэширование:

1. **Fields** - кэшировать с флагом `enableCache`

   - Для публичного API: `enableCache: true` (кэш 5 минут)
   - Для админки: `enableCache: false` (всегда из БД)

2. **EntityDefinition** - кэшировать только если нужен для проверки разрешений

   - Если не нужен → не загружать
   - Если нужен → кэшировать вместе с fields

3. **Оптимизация:**
   - Загружать fields **один раз** в каждой функции
   - Использовать кэш для повторных запросов

### Пример реализации:

```typescript
async getInstance(
  entityDefinitionId: string,
  id: string,
  params?: { includeRelations?: string[] }
): Promise<EntityInstance> {
  // 1. Загружаем instance
  const instance = await this.loadInstanceFromDB(id);

  // 2. Загружаем fields ОДИН РАЗ (с кэшированием)
  const fields = await this.getFields(entityDefinitionId);

  // 3. Загружаем relations (если нужно)
  if (params?.includeRelations) {
    // Используем fields для загрузки relations
  }

  // 4. Уплощаем экземпляр (используем fields)
  return this.flattenInstance(instance, fields);
}
```

---

**Вывод:** Текущая реализация загружает fields каждый раз, но:

- Server-side использует кэш (хорошо)
- Client-side не использует кэш (плохо)
- SDK должен использовать кэш с флагом `enableCache`
