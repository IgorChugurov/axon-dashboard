# Руководство по разработке приложения

**Версия:** 2.0  
**Дата:** 15 ноября 2025  
**Стек:** Next.js 15.5.6 + Supabase SSR + TypeScript

## Содержание

1. [Архитектурный обзор](#архитектурный-обзор)
2. [Гибридный подход](#гибридный-подход)
3. [Создание новых страниц](#создание-новых-страниц)
4. [Создание компонентов](#создание-компонентов)
5. [Работа с данными](#работа-с-данными)
6. [Server Actions](#server-actions)
7. [Авторизация и роли](#авторизация-и-роли)
8. [Лучшие практики](#лучшие-практики)
9. [Частые ошибки](#частые-ошибки)

---

## Архитектурный обзор

### Слои приложения

```
┌─────────────────────────────────────────────────────┐
│              Browser (Client-side)                   │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Client          │    │  Browser Supabase    │  │
│  │  Components      │───▶│  Client              │  │
│  └──────────────────┘    └──────────────────────┘  │
│            │                        │                │
│            │ Server Actions         │ Direct API    │
│            ▼                        ▼                │
└─────────────────────────────────────────────────────┘
             │                        │
             │                        │
┌─────────────────────────────────────────────────────┐
│              Next.js Server                          │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Middleware      │    │  Server              │  │
│  │  (Auth, Tokens)  │    │  Components          │  │
│  └──────────────────┘    └──────────────────────┘  │
│            │                        │                │
│            │                        ▼                │
│            │              ┌──────────────────────┐  │
│            └─────────────▶│  Server Supabase     │  │
│                           │  Client              │  │
│                           └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Cloud                          │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Authentication  │    │  PostgreSQL + RLS    │  │
│  └──────────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Ключевые принципы

1. **SSR First** - Первая загрузка всегда на сервере
2. **Direct Supabase Access** - Прямые запросы из браузера к Supabase
3. **Server Actions для мутаций** - Создание/обновление/удаление через Server Actions
4. **RLS для безопасности** - Защита данных на уровне БД
5. **Race Conditions Protection** - Автоматическая дедупликация refresh токенов

---

## Гибридный подход

### Что это?

Комбинация SSR (Server-Side Rendering) и клиентских обновлений:

- **SSR** - для первой загрузки (быстро, SEO-friendly)
- **Browser Client** - для динамики (пагинация, поиск без перезагрузки)
- **Server Actions** - для мутаций (безопасность)

### Когда использовать что?

| Операция                  | Подход        | Клиент  | Причина                 |
| ------------------------- | ------------- | ------- | ----------------------- |
| Первая загрузка           | SSR           | Server  | SEO, скорость           |
| Чтение данных (пагинация) | Browser       | Browser | Без перезагрузки        |
| Поиск/фильтры             | Browser       | Browser | UX                      |
| Создание/обновление       | Server Action | Server  | Безопасность, валидация |
| Удаление                  | Server Action | Server  | Безопасность            |
| Авторизация               | Server        | Server  | Безопасность            |

---

## Создание новых страниц

### Шаблон: CRUD страница

Создадим страницу для управления задачами (Tasks).

#### Шаг 1: Создать типы

```typescript
// lib/tasks/types.ts

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: "pending" | "in_progress" | "completed";
}
```

#### Шаг 2: Создать server functions

```typescript
// lib/tasks/supabase.ts

import { createClient } from "@/lib/supabase/server";
import type { Task, CreateTaskData } from "./types";

export interface TasksResponse {
  data: Task[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

/**
 * Получение задач (Server-side для SSR)
 */
export async function getTasksFromSupabase(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}
): Promise<TasksResponse> {
  const supabase = await createClient();

  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  // Базовый запрос с count
  let query = supabase
    .from("tasks")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  // Поиск
  if (params.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  // Фильтр по статусу
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[Tasks] Error:", error);
    throw error;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data as Task[]) || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}

/**
 * Создание задачи (для Server Action)
 */
export async function createTaskInSupabase(
  taskData: CreateTaskData
): Promise<Task> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskData)
    .select()
    .single();

  if (error) throw error;

  return data as Task;
}

/**
 * Обновление задачи (для Server Action)
 */
export async function updateTaskInSupabase(
  id: string,
  taskData: Partial<CreateTaskData>
): Promise<Task> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(taskData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Task;
}

/**
 * Удаление задачи (для Server Action)
 */
export async function deleteTaskFromSupabase(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;
}
```

#### Шаг 3: Создать Server Actions

```typescript
// app/tasks/actions.ts

"use server";

import {
  createTaskInSupabase,
  updateTaskInSupabase,
  deleteTaskFromSupabase,
} from "@/lib/tasks/supabase";
import { revalidatePath } from "next/cache";
import type { CreateTaskData, Task } from "@/lib/tasks/types";

/**
 * Создание задачи
 */
export async function createTaskAction(data: CreateTaskData) {
  try {
    const task = await createTaskInSupabase(data);

    // Обновляем кеш страницы
    revalidatePath("/tasks");

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error("[Server Action] Create task error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

/**
 * Обновление задачи
 */
export async function updateTaskAction(
  id: string,
  data: Partial<CreateTaskData>
) {
  try {
    const task = await updateTaskInSupabase(id, data);

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error("[Server Action] Update task error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

/**
 * Удаление задачи
 */
export async function deleteTaskAction(id: string) {
  try {
    await deleteTaskFromSupabase(id);

    revalidatePath("/tasks");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Server Action] Delete task error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}
```

#### Шаг 4: Создать Server Component (страница)

```typescript
// app/tasks/page.tsx

import { getTasksFromSupabase } from "@/lib/tasks/supabase";
import { TasksList } from "@/components/TasksList";
import { Suspense } from "react";

/**
 * Tasks Page - SSR для первой загрузки
 *
 * Поддерживает URL параметры: ?page=2&search=test&status=pending
 */

interface TasksPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  // Парсим параметры из URL (await для Next.js 15)
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "";

  // SSR: Получаем задачи на сервере
  const { data: tasks, pagination } = await getTasksFromSupabase({
    page,
    search,
    status,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          Manage your tasks and track progress
        </p>
      </div>

      <Suspense fallback={<TasksListSkeleton />}>
        <TasksList
          initialData={tasks}
          initialPagination={pagination}
          initialSearch={search}
          initialStatus={status}
          initialPage={page}
        />
      </Suspense>
    </div>
  );
}

// Skeleton loader
function TasksListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-muted animate-pulse rounded" />
      <div className="h-64 bg-muted animate-pulse rounded" />
    </div>
  );
}
```

#### Шаг 5: Создать Client Component (список)

```typescript
// components/TasksList.tsx

"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task } from "@/lib/tasks/types";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/app/tasks/actions";

interface TasksListProps {
  initialData: Task[];
  initialPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  initialSearch?: string;
  initialStatus?: string;
  initialPage?: number;
}

export function TasksList({
  initialData,
  initialPagination,
  initialSearch = "",
  initialStatus = "",
  initialPage = 1,
}: TasksListProps) {
  const router = useRouter();
  const supabase = createClient(); // Browser Client

  const [tasks, setTasks] = useState<Task[]>(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  /**
   * Загрузка задач через Browser Client
   * ПРЯМОЙ запрос к Supabase из браузера!
   */
  const loadTasks = useCallback(
    async (page: number, search: string, status: string) => {
      setLoading(true);

      try {
        const limit = 10;
        const offset = (page - 1) * limit;

        // ПРЯМОЙ запрос к Supabase
        let query = supabase
          .from("tasks")
          .select("*", { count: "exact" })
          .range(offset, offset + limit - 1)
          .order("created_at", { ascending: false });

        if (search) {
          query = query.ilike("title", `%${search}%`);
        }

        if (status) {
          query = query.eq("status", status);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        setTasks((data as Task[]) || []);

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        setPagination({
          page,
          limit,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        });

        // Обновляем URL без перезагрузки
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search) params.set("search", search);
        if (status) params.set("status", status);

        const newUrl = params.toString()
          ? `/tasks?${params.toString()}`
          : "/tasks";

        router.push(newUrl, { scroll: false });
      } catch (error) {
        console.error("[TasksList] Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    },
    [supabase, router]
  );

  // Обработка пагинации
  const handlePageChange = useCallback(
    (newPage: number) => {
      loadTasks(newPage, searchTerm, statusFilter);
    },
    [loadTasks, searchTerm, statusFilter]
  );

  // Обработка поиска
  const handleSearch = useCallback(() => {
    loadTasks(1, searchTerm, statusFilter);
  }, [loadTasks, searchTerm, statusFilter]);

  // Создание через Server Action
  const handleCreate = async () => {
    const title = prompt("Enter task title:");
    if (!title) return;

    startTransition(async () => {
      const result = await createTaskAction({ title });

      if (result.success) {
        // Оптимистичное обновление
        setTasks((prev) => [result.data, ...prev]);
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  // Обновление через Server Action
  const handleUpdateStatus = async (id: string, status: Task["status"]) => {
    startTransition(async () => {
      const result = await updateTaskAction(id, { status });

      if (result.success) {
        // Оптимистичное обновление
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? { ...task, status } : task))
        );
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  // Удаление через Server Action
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    startTransition(async () => {
      const result = await deleteTaskAction(id);

      if (result.success) {
        // Оптимистичное обновление
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Поиск и создание */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={loading}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
        </div>
        <Button onClick={handleCreate} disabled={isPending}>
          {isPending ? "Creating..." : "Create Task"}
        </Button>
      </div>

      {/* Список задач */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleUpdateStatus(
                        task.id,
                        e.target.value as Task["status"]
                      )
                    }
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(task.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Шаг 6: Добавить в sidebar

```typescript
// components/AppSidebar.tsx

const items = [
  // ...
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
  },
];
```

#### Шаг 7: Настроить RLS в Supabase

```sql
-- В Supabase SQL Editor

-- Политика: пользователи видят свои задачи
CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

-- Политика: пользователи создают свои задачи
CREATE POLICY "Users can insert own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи обновляют свои задачи
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

-- Политика: пользователи удаляют свои задачи
CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);
```

---

## Создание компонентов

### Client Components

**Когда использовать:**

- Интерактивные элементы (кнопки, формы)
- State management (useState, useReducer)
- Effects (useEffect)
- Browser APIs (localStorage, window)

**Пример:**

```typescript
"use client"; // ← Обязательно!

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </div>
  );
}
```

### Server Components

**Когда использовать:**

- Загрузка данных из БД
- Статический контент
- SEO-критичный контент
- Защищенные данные

**Пример:**

```typescript
// Нет "use client" - по умолчанию Server Component

import { createClient } from "@/lib/supabase/server";

export async function UserProfile({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Гибридные компоненты

**Когда использовать:**

- Нужна первая загрузка данных (SSR) И интерактивность

**Пример:**

```typescript
// Parent (Server Component)
import { createClient } from "@/lib/supabase/server";
import { TasksListClient } from "./TasksListClient";

export async function TasksWrapper() {
  const supabase = await createClient();
  const { data: tasks } = await supabase.from("tasks").select();

  // Передаем данные в Client Component
  return <TasksListClient initialTasks={tasks} />;
}

// Child (Client Component)
("use client");

import { useState } from "react";

export function TasksListClient({ initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);

  // Интерактивность здесь
  return <div>{/* ... */}</div>;
}
```

---

## Работа с данными

### Чтение данных

#### SSR (Server Component)

```typescript
// app/users/page.tsx

import { createClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase.from("users").select("*");

  if (error) {
    throw error; // Error boundary обработает
  }

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

#### Browser Client (динамика)

```typescript
// components/UsersList.tsx

"use client";

import { createClient } from "@/lib/supabase/client";

export function UsersList() {
  const [users, setUsers] = useState([]);
  const supabase = createClient();

  const loadUsers = async () => {
    const { data, error } = await supabase.from("users").select("*");

    if (!error) {
      setUsers(data);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Создание/Обновление/Удаление

**ВСЕГДА** через Server Actions:

```typescript
// app/users/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createUserAction(name: string, email: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .insert({ name, email })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/users");

  return { success: true, data };
}
```

---

## Server Actions

### Правила

1. **Всегда** помечайте `"use server"`
2. **Всегда** возвращайте `{ success, data?, error? }`
3. **Всегда** вызывайте `revalidatePath()` после мутаций
4. **Всегда** обрабатывайте ошибки

### Шаблон

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function yourAction(data: YourData) {
  try {
    // 1. Создать клиент
    const supabase = await createClient();

    // 2. Проверить права (опционально)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 3. Выполнить операцию
    const { data: result, error } = await supabase
      .from("your_table")
      .insert(data);

    if (error) throw error;

    // 4. Обновить кеш
    revalidatePath("/your-page");

    // 5. Вернуть результат
    return { success: true, data: result };
  } catch (error) {
    console.error("[Server Action] Error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

---

## Авторизация и роли

### Проверка авторизации

#### В Middleware

```typescript
// middleware.ts

const { response, user } = await updateSession(request);

if (!user) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

#### В Server Component

```typescript
// app/protected/page.tsx

import { getServerUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return <div>Protected content for {user.email}</div>;
}
```

#### В Server Action

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function protectedAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Продолжить...
}
```

### Проверка ролей

```typescript
import { getUserRoleCached } from "@/lib/auth/roles";

export async function adminOnlyAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const role = await getUserRoleCached(user.id);

  if (role !== "admin" && role !== "superAdmin") {
    return { success: false, error: "Forbidden" };
  }

  // Продолжить...
}
```

---

## Лучшие практики

### 1. URL State Management

**✅ DO:**

```typescript
// Храните состояние в URL
router.push(`/tasks?page=2&search=test`);

// Читайте из searchParams
const params = await searchParams;
const page = params.page || "1";
```

**❌ DON'T:**

```typescript
// Не храните только в state
const [page, setPage] = useState(1); // Потеряется при перезагрузке
```

### 2. Оптимистичные обновления

**✅ DO:**

```typescript
startTransition(async () => {
  // 1. Оптимистично обновляем UI
  setTasks((prev) => [...prev, newTask]);

  // 2. Вызываем Server Action
  const result = await createTaskAction(newTask);

  // 3. Если ошибка - откатываем
  if (!result.success) {
    setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
    alert(result.error);
  }
});
```

### 3. Loading States

**✅ DO:**

```typescript
{
  loading ? (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 bg-muted animate-pulse rounded" />
      ))}
    </div>
  ) : (
    <div>{/* Actual content */}</div>
  );
}
```

### 4. Error Handling

**✅ DO:**

```typescript
try {
  const { data, error } = await supabase.from("tasks").select();

  if (error) throw error;

  return { success: true, data };
} catch (error) {
  console.error("[Action] Error:", error);

  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}
```

### 5. Type Safety

**✅ DO:**

```typescript
// Всегда типизируйте данные
interface Task {
  id: string;
  title: string;
  // ...
}

const { data } = await supabase.from("tasks").select();
const tasks = data as Task[]; // Явное приведение типа
```

---

## Частые ошибки

### 1. ❌ Модификация cookies в Server Component

```typescript
// ❌ НЕ РАБОТАЕТ!
export default async function Page() {
  const cookieStore = await cookies();
  cookieStore.set("key", "value"); // Ошибка!
}
```

**✅ Решение:** Используйте Server Action

### 2. ❌ Использование useState в Server Component

```typescript
// ❌ НЕ РАБОТАЕТ!
export default async function Page() {
  const [state, setState] = useState(0); // Ошибка!
}
```

**✅ Решение:** Добавьте `"use client"`

### 3. ❌ Прямой доступ к searchParams без await

```typescript
// ❌ НЕ РАБОТАЕТ в Next.js 15!
export default async function Page({ searchParams }) {
  const page = searchParams.page; // Ошибка!
}
```

**✅ Решение:**

```typescript
export default async function Page({ searchParams }) {
  const params = await searchParams; // ← await!
  const page = params.page;
}
```

### 4. ❌ Забыли revalidatePath после мутации

```typescript
// ❌ Кеш не обновится!
export async function createTaskAction(data) {
  await supabase.from("tasks").insert(data);
  return { success: true }; // Забыли revalidatePath!
}
```

**✅ Решение:**

```typescript
export async function createTaskAction(data) {
  await supabase.from("tasks").insert(data);
  revalidatePath("/tasks"); // ← Обновляем кеш!
  return { success: true };
}
```

### 5. ❌ Race conditions при параллельных запросах

**Это решено автоматически:**

- **Server-side:** Middleware с Map для дедупликации
- **Client-side:** Supabase SDK имеет встроенную защиту

Просто используйте стандартные клиенты, защита включена!

---

## Checklist для новой страницы

- [ ] Создать типы (`lib/<entity>/types.ts`)
- [ ] Создать server functions (`lib/<entity>/supabase.ts`)
- [ ] Создать Server Actions (`app/<entity>/actions.ts`)
- [ ] Создать страницу SSR (`app/<entity>/page.tsx`)
- [ ] Создать Client Component (`components/<Entity>List.tsx`)
- [ ] Настроить RLS в Supabase
- [ ] Добавить ссылку в Sidebar
- [ ] Протестировать SSR (обновить страницу)
- [ ] Протестировать Client (пагинация без перезагрузки)
- [ ] Протестировать Server Actions (create/update/delete)

---

## Связанные документы

- `CURRENT_AUTH_FLOW.md` - Подробное описание авторизации
- `HYBRID_ARCHITECTURE_GUIDE.md` - Детали гибридного подхода
- `RACE_CONDITIONS_PROTECTION.md` - Защита от race conditions

---

**Готово!** Следуя этому руководству, вы сможете создавать новые страницы и компоненты в унифицированном стиле.
