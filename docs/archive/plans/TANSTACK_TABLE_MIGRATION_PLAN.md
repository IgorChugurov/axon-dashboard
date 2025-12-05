# План миграции на TanStack Table

**Дата создания:** 2025-01-20  
**Версия:** 1.0

---

## Понимание подхода

### TanStack Table (ранее React Table)

TanStack Table - это мощная библиотека для создания таблиц и датагридов. Основные преимущества:

1. **Headless** - предоставляет только логику, UI полностью контролируем
2. **Серверная пагинация** - поддерживает `manualPagination` для загрузки данных с сервера
3. **Типобезопасность** - полная поддержка TypeScript
4. **Гибкость** - легко расширять функциональность

### Архитектура решения

```
Server Component (EnvironmentsTab)
  ↓
  Передает конфигурацию и routing
  ↓
Client Component (UniversalEntityListClient)
  ↓
  Генерирует columns через generateColumnsFromConfig()
  ↓
  Создает функцию onLoadData через Server Action
  ↓
UniversalEntityListDataTable (TanStack Table)
  ↓
  Использует manualPagination для серверной пагинации
  ↓
  Вызывает onLoadData при изменении page/search
```

---

## Реализованные компоненты

### 1. `lib/universal-entity/table-column-generator.tsx`

**Назначение:** Генерация колонок для TanStack Table на основе конфигурации из `EntityUIConfig`.

**Функция:**
```typescript
generateColumnsFromConfig<TData>(
  columnsConfig: ColumnConfig[],
  routing: RoutingConfig,
  projectId: string,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
  onLink?: (id: string, additionalUrl?: string) => void
): ColumnDef<TData>[]
```

**Поддерживаемые типы колонок:**
- `text` - обычный текст
- `date` - форматирование даты
- `number` - форматирование чисел
- `boolean` - Yes/No
- `naigateToDetails` - кликабельная ссылка на детали
- `openEditPage` - кликабельная ссылка на редактирование
- `actions` - колонка с действиями (edit, delete, link)

### 2. `components/UniversalEntityListDataTable.tsx`

**Назначение:** Универсальный компонент списка на основе TanStack Table с серверной пагинацией.

**Особенности:**
- ✅ Серверная пагинация через `manualPagination`
- ✅ Debounce для поиска (300ms)
- ✅ Загрузка данных при изменении page/search
- ✅ Обработка ошибок
- ✅ Индикаторы загрузки
- ✅ Пустое состояние
- ✅ Интеграция с существующей конфигурацией

**Интерфейс:**
```typescript
interface UniversalEntityListDataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData>[];
  data: TData[];
  entityDefinition: EntityDefinition;
  uiConfig: EntityUIConfig;
  projectId: string;
  onLoadData: (params: {
    page: number;
    limit: number;
    search?: string;
  }) => Promise<{
    data: TData[];
    pagination: PaginationInfo;
  }>;
  routing: RoutingConfig;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onLink?: (id: string, additionalUrl?: string) => void;
}
```

### 3. Обновленный `components/UniversalEntityListClient.tsx`

**Изменения:**
- Использует `UniversalEntityListDataTable` вместо `UniversalEntityList`
- Генерирует columns через `generateColumnsFromConfig()`
- Передает обработчики для действий

---

## Серверная пагинация

### Как это работает

1. **TanStack Table** использует `manualPagination: true`
2. При изменении `pagination.pageIndex` вызывается `onPaginationChange`
3. Компонент вызывает `onLoadData` с новыми параметрами
4. Данные загружаются с сервера через Server Action
5. Таблица обновляется с новыми данными

### Синхронизация состояния

```typescript
// TanStack Table использует pageIndex (0-based)
const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 20,
});

// Сервер использует page (1-based)
const loadData = async (page: number, search?: string) => {
  const result = await onLoadData({
    page, // 1-based
    limit: pageSize,
    search,
  });
  
  // Синхронизируем с TanStack Table
  setPagination({
    pageIndex: result.pagination.page - 1, // Конвертируем в 0-based
    pageSize,
  });
};
```

---

## План дальнейшей миграции

### Этап 1: Базовый компонент ✅

- [x] Создать `generateColumnsFromConfig()`
- [x] Создать `UniversalEntityListDataTable`
- [x] Обновить `UniversalEntityListClient` для Environments
- [x] Исправить ошибки типов

### Этап 2: Расширение функциональности

- [ ] Добавить сортировку (server-side)
- [ ] Добавить фильтры (server-side)
- [ ] Добавить выбор строк (row selection)
- [ ] Добавить скрытие/показ колонок (column visibility)
- [ ] Улучшить пагинацию (первая/последняя страница, размер страницы)

### Этап 3: Миграция других страниц

- [ ] Entity Definitions
- [ ] Entity Instances
- [ ] Fields

### Этап 4: Оптимизация

- [ ] Кэширование данных
- [ ] Оптимистичные обновления
- [ ] Виртуализация для больших списков

---

## Преимущества нового подхода

1. **Типобезопасность** - полная поддержка TypeScript
2. **Гибкость** - легко добавлять новую функциональность
3. **Производительность** - серверная пагинация и фильтрация
4. **Единообразие** - один подход для всех списков
5. **Расширяемость** - легко добавлять новые типы колонок и действий

---

## Использование

### Пример для Environments

```typescript
// В EnvironmentsTab (Server Component)
<UniversalEntityListClient
  entityDefinition={entityDefinition}
  uiConfig={uiConfig}
  projectId={projectId}
  routing={routing}
  serviceType="environment"
/>
```

### Добавление нового типа сущности

1. Создать Server Action для загрузки данных
2. Добавить case в `UniversalEntityListClient` для `serviceType`
3. Убедиться, что тип данных соответствует `{ id: string }`
4. Конфигурация колонок берется из `uiConfig.list.columns`

---

## Ссылки

- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [TanStack Table Pagination](https://tanstack.com/table/v8/docs/api/features/pagination)

