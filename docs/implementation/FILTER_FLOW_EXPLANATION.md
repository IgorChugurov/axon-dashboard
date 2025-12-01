# Объяснение флоу фильтрации по relation-полям

## Проблема

Фильтры отображаются в `DataTableToolbar`, но как они попадают в SDK и как SDK понимает, что это relation-поле?

## Полный флоу фильтрации

### Шаг 1: Пользователь выбирает фильтр в UI

**Файл:** `components/universal-entity-list/DataTableToolbar.tsx`

```typescript
// Пользователь выбирает "Автор: Иван" в фильтре
<FilterField
  field={authorField} // field.name = "author", field.id = "field-123"
  value={filters["author"] || []} // ["user-id-1"]
  onChange={(value) => handleFilterChange("author", value)}
/>
```

**Результат:** `filters = { "author": ["user-id-1"] }`

---

### Шаг 2: Фильтры сохраняются в состояние

**Файл:** `components/universal-entity-list/UniversalEntityListDataTable.tsx`

```typescript
<DataTableToolbar
  filters={params.filters} // { "author": ["user-id-1"] }
  onFiltersChange={(newFilters) => {
    setParams({ filters: newFilters, page: 1 });
  }}
/>
```

**Результат:** `params.filters = { "author": ["user-id-1"] }`

---

### Шаг 3: Фильтры передаются в onLoadData

**Файл:** `components/universal-entity-list/hooks/use-list-query.ts`

```typescript
const { data } = useQuery({
  queryFn: async () => {
    return await onLoadData(params, signal);
    // params.filters = { "author": ["user-id-1"] }
  },
});
```

---

### Шаг 4: onLoadData передает фильтры в SDK

**Файл:** `components/universal-entity-list/EntityInstancesListClient.tsx`

```typescript
const onLoadData = async (params: LoadParams) => {
  // params.filters = { "author": ["user-id-1"] }
  // relationFiltersInfo = [{ fieldName: "author", fieldId: "field-123" }]

  const result = await sdk.getInstances(entityDefinition.id, {
    filters: params.filters, // { "author": ["user-id-1"] }
    relationFilters: relationFiltersInfo, // МЕТАДАННЫЕ!
    // ...
  });
};
```

**Ключевой момент:**

- `params.filters` - это **значения** фильтров (что выбрал пользователь)
- `relationFiltersInfo` - это **метаданные** (какие поля являются relation-полями)

---

### Шаг 5: SDK использует relationFiltersInfo для разделения фильтров

**Файл:** `lib/sdk/public-api/client.ts` (строки 333-366)

```typescript
async getInstances(entityDefinitionId, params) {
  // 1. Создаем Set из имен relation-полей
  const relationFilterFieldNames = new Set(
    (params?.relationFilters || []).map((rf) => rf.fieldName)
  );
  // relationFilterFieldNames = Set(["author"])

  // 2. Разделяем фильтры на JSONB и relation
  const jsonbFilters = {};
  const relationFiltersToApply = [];

  if (params?.filters) {
    Object.entries(params.filters).forEach(([fieldName, values]) => {
      if (relationFilterFieldNames.has(fieldName)) {
        // Это relation-фильтр!
        const relationInfo = params.relationFilters?.find(
          (rf) => rf.fieldName === fieldName
        );
        // relationInfo = { fieldName: "author", fieldId: "field-123" }

        relationFiltersToApply.push({
          fieldName: "author",
          fieldId: "field-123", // ← Используется для запроса к entity_relation
          values: ["user-id-1"]
        });
      } else {
        // Это обычный JSONB-фильтр
        jsonbFilters[fieldName] = values;
      }
    });
  }
}
```

**Зачем нужен `relationFiltersInfo`?**

- SDK не знает, какие поля являются relation-полями
- `relationFiltersInfo` говорит SDK: "поле 'author' - это relation-поле с fieldId='field-123'"
- SDK использует `fieldId` для запроса к таблице `entity_relation`

---

### Шаг 6: SDK фильтрует через entity_relation

**Файл:** `lib/sdk/public-api/client.ts` (строки 368-502)

```typescript
// SDK делает запрос к entity_relation
const { data: relations } = await this.supabase
  .from("entity_relation")
  .select("source_instance_id")
  .eq("relation_field_id", "field-123") // ← fieldId из relationFiltersInfo!
  .in("target_instance_id", ["user-id-1"]); // ← значения из params.filters

// relations = [
//   { source_instance_id: "post-1" },
//   { source_instance_id: "post-2" }
// ]

// SDK фильтрует основной запрос по найденным ID
const allowedInstanceIds = relations.map((r) => r.source_instance_id);
// allowedInstanceIds = ["post-1", "post-2"]

query = query.in("id", allowedInstanceIds);
```

---

## Визуализация флоу

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: DataTableToolbar                                      │
│    Пользователь выбирает "Автор: Иван"                       │
│    → filters = { "author": ["user-id-1"] }                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. State: UniversalEntityListDataTable                       │
│    setParams({ filters: { "author": ["user-id-1"] } })      │
│    → params.filters = { "author": ["user-id-1"] }           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Query: useListQuery                                       │
│    onLoadData(params)                                        │
│    → params.filters = { "author": ["user-id-1"] }           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Handler: EntityInstancesListClient.onLoadData            │
│    sdk.getInstances(..., {                                   │
│      filters: { "author": ["user-id-1"] },                  │
│      relationFilters: [                                      │
│        { fieldName: "author", fieldId: "field-123" }        │
│      ]                                                       │
│    })                                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SDK: getInstances()                                       │
│    Проверяет: "author" в relationFilters?                    │
│    → Да! Это relation-поле с fieldId="field-123"             │
│                                                              │
│    Запрос к entity_relation:                                 │
│    WHERE relation_field_id = "field-123"                     │
│      AND target_instance_id IN ("user-id-1")                │
│    → Находит: ["post-1", "post-2"]                          │
│                                                              │
│    Фильтрует основной запрос:                                │
│    WHERE id IN ("post-1", "post-2")                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Зачем нужен relationFiltersInfo?

**Без relationFiltersInfo:**

- SDK не знает, что "author" - это relation-поле
- SDK попытается фильтровать через JSONB: `data->>'author'.eq.'user-id-1'`
- ❌ Не работает, потому что в JSONB хранится не ID, а связь в отдельной таблице

**С relationFiltersInfo:**

- SDK знает: "author" - это relation-поле с `fieldId="field-123"`
- SDK фильтрует через `entity_relation`: `relation_field_id = "field-123"`
- ✅ Работает правильно!

---

## Итог

`relationFiltersInfo` - это **метаданные**, которые говорят SDK:

- Какие поля являются relation-полями
- Какой `fieldId` использовать для запроса к `entity_relation`

Без этих метаданных SDK не сможет правильно фильтровать по relation-полям.
