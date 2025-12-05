# Аудит использования SDK

**Дата:** 2025-01-30  
**Цель:** Проверить соответствие требованиям использования SDK

## Требования

1. **На клиенте** SDK должен использоваться для работы с экземплярами сущностей
2. **Все операции** (получение данных, мутации, связанные данные) должны проходить через SDK
3. **SDK должен поставляться через провайдер** (`useSDK()`)
4. **Для SSR** должен использоваться серверный вариант SDK (`createServerSDK`)

---

## ✅ Правильное использование SDK

### Клиентские компоненты (используют `useSDK()`)

1. **`EntityInstancesListClient.tsx`**

   - ✅ Использует `useSDK()` из провайдера
   - ✅ Операции: `sdk.getInstances()`, `sdk.deleteInstance()`

2. **`EntityInstanceFormNew.tsx`** (ИСПРАВЛЕНО)

   - ✅ Использует `useSDK()` из провайдера
   - ✅ Операции: `sdk.createInstance()`, `sdk.updateInstance()`, `sdk.deleteInstance()`

3. **`hooks/use-entity-options.ts`**
   - ✅ Использует `useSDK()` из провайдера
   - ✅ Операции: `sdk.getEntityDefinitionConfig()`, `sdk.getInstances()`

### Серверные компоненты (используют `createServerSDK`)

1. **`app/projects/[projectId]/[entityDefId]/page.tsx`**

   - ✅ Использует `createServerSDK()` для SSR
   - ✅ Операции: `sdk.getEntityDefinitionWithUIConfig()`

2. **`app/projects/[projectId]/[entityDefId]/[instanceId]/page.tsx`**
   - ✅ Использует `createServerSDK()` для SSR
   - ✅ Операции: `sdk.getEntityDefinitionWithUIConfig()`, `sdk.getInstance()`

### Провайдер SDK

1. **`components/providers/SDKProvider.tsx`**

   - ✅ Создает SDK через `createClientSDK()` (это нормально - сам провайдер)
   - ✅ Предоставляет SDK через React Context

2. **`app/projects/[projectId]/layout.tsx`**
   - ✅ Оборачивает все страницы в `SDKProviderWrapper`
   - ✅ Все клиентские компоненты имеют доступ к SDK

---

## ✅ Проверка операций с экземплярами сущностей

### Все операции проходят через SDK:

1. **Получение списка:** `sdk.getInstances()` ✅
2. **Получение одного:** `sdk.getInstance()` ✅
3. **Создание:** `sdk.createInstance()` ✅
4. **Обновление:** `sdk.updateInstance()` ✅
5. **Удаление:** `sdk.deleteInstance()` ✅

### Нет прямых запросов к `entity_instance`:

- ✅ В компонентах нет `.from("entity_instance")`
- ✅ В app нет прямых запросов к `entity_instance`
- ✅ Все операции идут через SDK

---

## ✅ Архитектура

### Клиент (Client Components)

```
SDKProvider (layout)
  └─ EntityInstancesListClient → useSDK() → sdk.getInstances()
  └─ EntityInstanceFormNew → useSDK() → sdk.createInstance/updateInstance/deleteInstance
  └─ useEntityOptions → useSDK() → sdk.getInstances()
```

### Сервер (Server Components)

```
Server Page
  └─ createServerSDK() → sdk.getEntityDefinitionWithUIConfig()
  └─ createServerSDK() → sdk.getInstance()
```

---

## ✅ Итог

**Все требования выполнены:**

1. ✅ На клиенте SDK используется для работы с экземплярами сущностей
2. ✅ Все операции проходят через SDK
3. ✅ SDK поставляется через провайдер (`useSDK()`)
4. ✅ Для SSR используется серверный SDK (`createServerSDK`)

**Исправления:**

- ✅ `EntityInstanceFormNew.tsx` - исправлен, теперь использует `useSDK()` вместо `createClientSDK()`
