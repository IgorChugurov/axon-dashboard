# План рефакторинга Universal Entity List

**Дата создания:** 2025-01-28  
**Статус:** Готов к выполнению

---

## Цель рефакторинга

1. Создать модульную структуру папок для компонента
2. Вынести логику в отдельные хуки и утилиты
3. Улучшить читаемость и поддерживаемость кода
4. Подготовить к добавлению расширенной функциональности

---

## Текущая структура

```
components/
  ├── UniversalEntityListDataTable.tsx  (628 строк)
  ├── UniversalEntityListClient.tsx     (254 строки)
  └── DataTablePagination.tsx
```

**Проблемы:**

- Компоненты в корне `components/`
- Вся логика в одном файле
- Сложно найти связанные файлы
- Нет модульной структуры

---

## Новая структура

```
components/
  universal-entity-list/
    ├── index.ts                         # Экспорты
    ├── UniversalEntityListDataTable.tsx # Основной компонент
    ├── UniversalEntityListClient.tsx    # Client wrapper
    ├── hooks/
    │   ├── use-list-query.ts           # React Query логика
    │   ├── use-list-params.ts          # Параметры и URL синхронизация
    │   └── use-list-mutations.ts       # Мутации (delete, create, update)
    ├── utils/
    │   ├── list-query-key.ts          # Генерация query key
    │   └── list-state-helpers.ts      # Вспомогательные функции
    └── types/
        └── list-types.ts               # Типы для списка
```

---

## Этап 1: Создание структуры папок

### Задачи:

1. ✅ Создать папку `components/universal-entity-list/`
2. ✅ Создать подпапки: `hooks/`, `utils/`, `types/`
3. ✅ Переместить файлы:
   - `UniversalEntityListDataTable.tsx` → `universal-entity-list/UniversalEntityListDataTable.tsx`
   - `UniversalEntityListClient.tsx` → `universal-entity-list/UniversalEntityListClient.tsx`
4. ✅ Создать `index.ts` с экспортами

### Файл `index.ts`:

```typescript
export { UniversalEntityListDataTable } from "./UniversalEntityListDataTable";
export { UniversalEntityListClient } from "./UniversalEntityListClient";
export type { UniversalEntityListDataTableProps } from "./UniversalEntityListDataTable";
```

### Обновить импорты:

- `app/projects/[projectId]/settings/page.tsx`
- Все места, где используется компонент

---

## Этап 2: Вынос хуков

### 2.1. `hooks/use-list-query.ts`

**Что вынести:**

- React Query логика (`useQuery`)
- Query key генерация
- Настройки query (staleTime, gcTime)

**Интерфейс:**

```typescript
export function useListQuery<TData>(
  projectId: string,
  serviceType: string,
  loadParams: LoadParams,
  onLoadData: LoadDataFn<TData>
) {
  // Возвращает: { data, isLoading, error, isFetching, queryResult }
}
```

### 2.2. `hooks/use-list-params.ts`

**Что вынести:**

- Инициализация параметров из URL и sessionStorage
- Синхронизация с URL
- Сохранение в sessionStorage
- Debounce для поиска

**Интерфейс:**

```typescript
export function useListParams(
  projectId: string,
  serviceType: string,
  pageSize: number
) {
  // Возвращает: { loadParams, setLoadParams, searchInput, setSearchInput }
}
```

### 2.3. `hooks/use-list-mutations.ts`

**Что вынести:**

- `useMutation` для delete
- `useMutation` для create (будущее)
- `useMutation` для update (будущее)
- Оптимистичные обновления

**Интерфейс:**

```typescript
export function useListMutations<TData>(
  projectId: string,
  serviceType: string
) {
  // Возвращает: { deleteMutation, createMutation, updateMutation }
}
```

---

## Этап 3: Вынос утилит

### 3.1. `utils/list-query-key.ts`

**Что вынести:**

- Генерация query key для React Query

**Интерфейс:**

```typescript
export function getListQueryKey(
  projectId: string,
  serviceType: string,
  params: LoadParams
): readonly string[] {
  // Возвращает query key
}
```

### 3.2. `utils/list-state-helpers.ts`

**Что вынести:**

- Вспомогательные функции для работы с состоянием
- Вычисление состояний (isEmpty, isSearchEmpty, hasData)

**Интерфейс:**

```typescript
export function getListDisplayState<TData>(
  queryResult: QueryResult<TData> | undefined,
  isLoading: boolean,
  hasError: boolean,
  searchInput: string
): {
  isEmpty: boolean;
  isSearchEmpty: boolean;
  hasData: boolean;
};
```

---

## Этап 4: Вынос типов

### 4.1. `types/list-types.ts`

**Что вынести:**

- `LoadParams`
- `UniversalEntityListDataTableProps`
- Другие типы, связанные со списком

---

## Этап 5: Улучшение компонента

### 5.1. Заголовок таблицы

**Создать:** `components/universal-entity-list/DataTableHeader.tsx`

**Функции:**

- Отображение заголовков колонок
- Поддержка сортировки (будущее)
- Поддержка фильтров (будущее)

### 5.2. Toolbar

**Создать:** `components/universal-entity-list/DataTableToolbar.tsx`

**Функции:**

- Поиск
- Фильтры (будущее)
- Действия (create, bulk actions)

### 5.3. Упрощение основного компонента

После выноса логики в хуки, основной компонент должен:

- Использовать хуки для логики
- Фокусироваться на рендеринге UI
- Быть проще для понимания

---

## Порядок выполнения

1. **Этап 1:** Создание структуры папок и перемещение файлов
2. **Этап 2:** Вынос хуков (по одному)
3. **Этап 3:** Вынос утилит
4. **Этап 4:** Вынос типов
5. **Этап 5:** Улучшение компонента

---

## Ожидаемые результаты

### После рефакторинга:

- ✅ Модульная структура папок
- ✅ Логика разделена на хуки и утилиты
- ✅ Компонент стал проще и понятнее
- ✅ Легче добавлять новую функциональность
- ✅ Легче тестировать отдельные части

### Метрики:

- Основной компонент: ~300-400 строк (вместо 628)
- Хуки: ~50-100 строк каждый
- Утилиты: ~20-50 строк каждая
- Общая структура: более понятная и поддерживаемая

---

## Риски и митигация

### Риск 1: Breaking changes

**Митигация:**

- Обновить все импорты сразу
- Проверить все места использования

### Риск 2: Потеря контекста

**Митигация:**

- Четкая структура папок
- Хорошие комментарии
- Документация

### Риск 3: Сложность миграции

**Митигация:**

- Делать постепенно
- Тестировать на каждом этапе

---

## Следующие шаги после рефакторинга

1. Добавить сортировку
2. Добавить фильтры
3. Добавить выбор строк
4. Добавить скрытие колонок
5. Мигрировать остальные страницы
