# Формат данных бэкенда

## 📋 Общий формат ответа

Ваш бэкенд возвращает данные в следующем формате:

### Стандартный формат (с пагинацией)

```json
{
  "items": [...],  // Массив сущностей
  "meta": {        // Метаданные пагинации
    "currentPage": 1,
    "perPage": 16,
    "totalItems": 7,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

### Формат для `/api/entity/all` (без пагинации)

```json
[...]  // Просто массив сущностей
```

## 🎯 Пример для проектов

### GET `/api/projects`

**Request:**

```
GET /api/projects?currentPage=1&perPage=16&search=test
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "items": [
    {
      "id": "e34fad3c-7027-44ba-bdac-e07f383f5a17",
      "name": "Blocks",
      "createdAt": "2025-09-23T15:10:35.496Z"
    },
    {
      "id": "45a913ac-928f-477d-95c2-574412915f35",
      "name": "Blog",
      "createdAt": "2025-08-12T17:32:56.531Z"
    },
    {
      "id": "b3800fb3-6e0d-45a2-9632-f2a052d7b4d3",
      "name": "Test 2",
      "createdAt": "2025-08-06T17:39:04.702Z"
    },
    {
      "id": "75f52521-dca3-4ae2-9611-aacf80f0af46",
      "name": "New miocrofrontend",
      "createdAt": "2025-07-11T10:54:02.811Z"
    },
    {
      "id": "22145bb7-db9e-4b84-b61b-127bde2eb9a2",
      "name": "Test",
      "createdAt": "2025-05-28T14:08:11.788Z"
    },
    {
      "id": "4357bc91-cd19-4e02-b34c-e3724096fca5",
      "name": "SmartScribe",
      "createdAt": "2025-04-04T14:55:07.999Z"
    },
    {
      "id": "06c8352d-0dd0-48b2-a2e3-72f8ddbb1d64",
      "name": "Templates",
      "createdAt": "2024-09-04T17:31:27.823Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "perPage": 16,
    "totalItems": 7,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

## 🔄 Трансформация в Next.js API Route

### Входные данные (от бэкенда):

```typescript
{
  items: Project[],
  meta: {
    currentPage: number,
    perPage: number,
    totalItems: number,
    totalPages: number,
    hasPreviousPage: boolean,
    hasNextPage: boolean
  }
}
```

### Выходные данные (для клиента):

```typescript
{
  data: Project[],  // items → data
  pagination: {
    page: number,           // currentPage → page
    limit: number,          // perPage → limit
    total: number,          // totalItems → total
    totalPages: number,     // totalPages → totalPages
    hasPreviousPage: boolean,
    hasNextPage: boolean
  },
  config: ProjectsConfig  // Добавляем конфигурацию из projects.json
}
```

### Код трансформации:

```typescript
// app/api/projects/route.ts
const data = await response.json(); // Ответ от бэкенда

const responseData = {
  data: data.items || data, // Поддержка массива и объекта с items
  pagination: data.meta
    ? {
        page: data.meta.currentPage,
        limit: data.meta.perPage,
        total: data.meta.totalItems,
        totalPages: data.meta.totalPages,
        hasPreviousPage: data.meta.hasPreviousPage,
        hasNextPage: data.meta.hasNextPage,
      }
    : undefined,
  config: projectsConfig,
};

return NextResponse.json(responseData);
```

## 📊 Query параметры

### Для запросов с пагинацией:

| Параметр      | Тип    | Описание                         | Пример   |
| ------------- | ------ | -------------------------------- | -------- |
| `currentPage` | number | Номер текущей страницы           | `1`      |
| `perPage`     | number | Количество элементов на странице | `16`     |
| `search`      | string | Поисковый запрос (опционально)   | `"test"` |

### Пример URL:

```
/api/projects?currentPage=1&perPage=16&search=blog
```

## 🔍 Использование в клиентском коде

### Интерфейсы TypeScript:

```typescript
interface Project {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
}

interface ProjectsResponse {
  data: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  config?: any;
}
```

### Пример использования:

```typescript
const fetchProjects = async (search?: string, page: number = 1) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("currentPage", page.toString());
  params.append("perPage", "16");

  const response = await fetch(`/api/projects?${params.toString()}`);
  const data: ProjectsResponse = await response.json();

  setProjects(data.data); // Массив проектов
  setPagination(data.pagination); // Метаданные пагинации
};
```

## 🎨 UI компоненты пагинации

### Информация о пагинации:

```tsx
{
  pagination && (
    <div>
      Страница {pagination.page} из {pagination.totalPages}
      (всего: {pagination.total})
    </div>
  );
}
```

### Кнопки навигации:

```tsx
<Button
  onClick={() => handlePageChange(currentPage - 1)}
  disabled={!pagination?.hasPreviousPage || loading}
>
  Назад
</Button>

<Button
  onClick={() => handlePageChange(currentPage + 1)}
  disabled={!pagination?.hasNextPage || loading}
>
  Вперёд
</Button>
```

## 📝 Шаблон для других сущностей

### Для любой сущности (entities, users, etc.):

```typescript
// app/api/entities/route.ts
export async function GET(request: NextRequest) {
  // ... проверка токенов ...

  const { searchParams } = new URL(request.url);
  const backendUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/entities`);

  // Копируем параметры пагинации
  searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const response = await fetch(backendUrl.toString(), {
    headers: {
      Authorization: `Bearer ${validTokens.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  // Трансформация формата
  const responseData = {
    data: data.items || data,
    pagination: data.meta
      ? {
          page: data.meta.currentPage,
          limit: data.meta.perPage,
          total: data.meta.totalItems,
          totalPages: data.meta.totalPages,
          hasPreviousPage: data.meta.hasPreviousPage,
          hasNextPage: data.meta.hasNextPage,
        }
      : undefined,
  };

  return NextResponse.json(responseData);
}
```

## 🚀 Особые случаи

### 1. Endpoint `/api/entity/all` (без пагинации)

**Ответ бэкенда:**

```json
[
  { "id": "1", "name": "Entity 1" },
  { "id": "2", "name": "Entity 2" }
]
```

**Обработка:**

```typescript
const data = await response.json();

// Проверяем, это массив или объект с items
const responseData = {
  data: Array.isArray(data) ? data : data.items || data,
  pagination: data.meta
    ? {
        /* ... */
      }
    : undefined,
};
```

### 2. Пустой результат

**Ответ бэкенда:**

```json
{
  "items": [],
  "meta": {
    "currentPage": 1,
    "perPage": 16,
    "totalItems": 0,
    "totalPages": 0,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

**UI:**

```tsx
{
  !loading && !error && projects.length === 0 && <p>Проекты не найдены</p>;
}
```

### 3. Фильтрация и поиск

**Query параметры:**

```
?currentPage=1&perPage=16&search=блог&status=active&sortBy=createdAt&order=desc
```

**Все параметры автоматически передаются в бэкенд:**

```typescript
// Next.js API Route автоматически пробрасывает все параметры
searchParams.forEach((value, key) => {
  backendUrl.searchParams.append(key, value);
});
```

## 📦 Типы данных

### Общий тип для ответа с пагинацией:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  config?: any;
}

// Использование
type ProjectsResponse = PaginatedResponse<Project>;
type EntitiesResponse = PaginatedResponse<Entity>;
type UsersResponse = PaginatedResponse<User>;
```

### Тип ответа бэкенда:

```typescript
interface BackendPaginatedResponse<T> {
  items: T[];
  meta: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
```

## ✅ Чеклист интеграции новой сущности

1. [ ] Создать API Route `app/api/[entity]/route.ts`
2. [ ] Скопировать логику из `app/api/projects/route.ts`
3. [ ] Изменить URL бэкенда на `/api/[entity]`
4. [ ] Создать TypeScript интерфейсы для сущности
5. [ ] Использовать `PaginatedResponse<EntityType>`
6. [ ] Добавить обработку query параметров
7. [ ] Протестировать пагинацию
8. [ ] Добавить UI для списка и пагинации
9. [ ] Протестировать поиск (если есть)

## 🔧 Отладка

### Логирование в API Route:

```typescript
console.log("[Entity API] Backend response:", {
  hasItems: !!data.items,
  itemsCount: data.items?.length,
  hasMeta: !!data.meta,
  currentPage: data.meta?.currentPage,
  totalPages: data.meta?.totalPages,
});
```

### Логирование на клиенте:

```typescript
console.log("[Client] Received data:", {
  dataCount: data.data?.length,
  hasPagination: !!data.pagination,
  currentPage: data.pagination?.page,
  totalPages: data.pagination?.totalPages,
});
```

## 📚 Резюме

### Формат бэкенда:

```
{ items: [], meta: {...} }  // Стандартный с пагинацией
или
[...]                       // Массив для /all endpoints
```

### Формат Next.js API:

```
{ data: [], pagination: {...}, config: {...} }
```

### Ключевые поля:

- `items` → `data`
- `meta.currentPage` → `pagination.page`
- `meta.perPage` → `pagination.limit`
- `meta.totalItems` → `pagination.total`

Теперь все ваши сущности будут работать единообразно! 🎉
