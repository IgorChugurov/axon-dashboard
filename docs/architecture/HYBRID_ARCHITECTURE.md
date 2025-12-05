# Гибридная архитектура Admin Panel

## Обзор

Реализована гибридная архитектура, сочетающая лучшие практики SSR и клиентских обновлений:

- **SSR** для первой загрузки (быстрый рендер, SEO-friendly)
- **Browser Client** для динамических обновлений (пагинация, поиск без перезагрузки)
- **Server Actions** для мутаций (безопасность, валидация на сервере)

## Структура проекта

```
app/
├── page.tsx                      # Welcome страница (SSR)
├── projects/
│   ├── page.tsx                  # Список проектов (SSR)
│   └── actions.ts                # Server Actions (create, update, delete)

components/
└── ProjectsList.tsx              # Client Component (Browser Client)

lib/
├── supabase/
│   ├── server.ts                 # Server Client (SSR)
│   ├── client.ts                 # Browser Client (динамика)
│   └── middleware.ts             # Middleware (auth + race conditions защита)
└── projects/
    └── supabase.ts               # Server functions (SSR + Actions)
```

## Флоу работы

### 1. Первая загрузка страницы (SSR)

```typescript
// app/projects/page.tsx - выполняется на сервере

export default async function ProjectsPage({ searchParams }) {
  // SSR: получаем данные на сервере
  const { data: projects, pagination } = await getProjectsFromSupabase({
    page: parseInt(searchParams.page || "1"),
    search: searchParams.search || "",
  });
  
  // HTML с данными отправляется в браузер
  return <ProjectsList initialData={projects} initialPagination={pagination} />;
}
```

**Что происходит:**
```
User → /projects?page=2&search=test
  ↓
Next.js Middleware:
  ├─ updateSession() → обновляет токены (с защитой от race conditions)
  └─ Проверяет авторизацию
  ↓
Server Component:
  ├─ getProjectsFromSupabase() → Server Client
  ├─ Supabase query с пагинацией и поиском
  └─ Рендерит HTML с данными
  ↓
Browser получает готовый HTML с проектами ✅
```

### 2. Пагинация (Client-side через Browser Client)

```typescript
// components/ProjectsList.tsx - выполняется в браузере

const loadProjects = async (page: number, search: string) => {
  const supabase = createClient(); // Browser Client
  
  // ПРЯМОЙ запрос к Supabase из браузера
  const { data, error } = await supabase
    .from("projects")
    .select("*", { count: "exact" })
    .range((page - 1) * 10, page * 10 - 1)
    .order("created_at", { ascending: false });
  
  setProjects(data);
  
  // Обновляем URL (без перезагрузки)
  router.push(`/projects?page=${page}`, { scroll: false });
};
```

**Что происходит:**
```
User кликает "Page 2"
  ↓
Browser:
  ├─ fetch('https://xxx.supabase.co/rest/v1/projects')
  ├─ Authorization: Bearer <token_from_cookies>
  ├─ Браузер автоматически добавляет cookies
  ↓
Supabase API:
  ├─ Проверяет токен
  ├─ Если истек → автоматическое обновление (встроенная защита)
  ├─ Применяет RLS
  └─ Возвращает данные
  ↓
React обновляет UI (без перезагрузки страницы) ✅
```

### 3. Создание/Обновление/Удаление (Server Actions)

```typescript
// app/projects/actions.ts - выполняется на сервере

'use server'

export async function createProjectAction(data: CreateProjectData) {
  const project = await createProjectInSupabase(data);
  revalidatePath('/projects'); // Обновить кеш
  return { success: true, data: project };
}

// components/ProjectsList.tsx - выполняется в браузере

const handleCreate = async () => {
  const result = await createProjectAction({ name: "New Project" });
  
  if (result.success) {
    // Оптимистичное обновление UI
    setProjects(prev => [result.data, ...prev]);
  }
};
```

**Что происходит:**
```
User кликает "Create Project"
  ↓
Browser:
  ├─ POST /projects/actions (к Next.js серверу)
  ├─ Body: { name: "New Project" }
  ↓
Next.js Middleware:
  ├─ updateSession() → обновляет токены
  └─ Проверяет авторизацию
  ↓
Server Action:
  ├─ createProjectInSupabase() → Server Client
  ├─ Supabase insert
  ├─ revalidatePath('/projects')
  └─ Возвращает результат
  ↓
Browser:
  ├─ Получает новый проект
  └─ Оптимистично обновляет UI ✅
```

## Race Conditions Protection

### Проблема

При параллельных запросах с истекшим токеном каждый запрос мог попытаться обновить токен:

```
Запрос 1: getUser() → токен истек → refresh
Запрос 2: getUser() → токен истек → refresh
Запрос 3: getUser() → токен истек → refresh

Результат: 3 параллельных refresh запроса ❌
```

### Решение

**1. Middleware (Server-side):**

```typescript
// lib/supabase/middleware.ts

const refreshPromises = new Map<string, Promise<void>>();

// Дедупликация обновления токенов
if (!refreshPromises.get(sessionKey)) {
  // Первый запрос обновляет токен
  refreshPromise = (async () => {
    const supabase = createServerClient({
      cookies: {
        setAll(cookiesToSet) {
          // Обновляем токены в request (в памяти)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    });
    await supabase.auth.getUser(); // Обновление
  })();
  refreshPromises.set(sessionKey, refreshPromise);
}

// Все запросы ждут завершения первого обновления
await refreshPromise;

// Каждый запрос создает свой клиент и получает обновленные токены
const supabase = createServerClient({
  cookies: {
    setAll(cookiesToSet) {
      // Устанавливает в СВОЙ response
      supabaseResponse.cookies.set(name, value, options);
    },
  },
});

// Результат: все responses содержат Set-Cookie ✅
```

**2. Browser Client (встроенная защита):**

Supabase JS SDK автоматически защищает от race conditions на клиенте:

```typescript
// Внутри @supabase/supabase-js:

private refreshPromise: Promise<Session> | null = null

async refreshSession() {
  if (this.refreshPromise) {
    return await this.refreshPromise; // Переиспользуем
  }
  
  this.refreshPromise = this._refreshSession();
  
  try {
    return await this.refreshPromise;
  } finally {
    this.refreshPromise = null;
  }
}
```

## URL State Management

Все параметры фильтрации и пагинации в URL:

```
/projects?page=2&search=test

- Можно поделиться ссылкой
- Работает кнопка "Назад"
- SSR работает с URL параметрами
- Client обновляет URL при изменениях
```

## Преимущества архитектуры

### ✅ Производительность

- SSR - быстрая первая загрузка
- Прямые запросы к Supabase - минимальная задержка
- Кеширование Next.js
- Оптимистичные обновления UI

### ✅ Безопасность

- Токены в httpOnly cookies
- Server Actions для мутаций
- RLS на уровне БД
- Валидация на сервере

### ✅ UX

- Мгновенная первая загрузка (SSR)
- SPA-like навигация (без перезагрузки)
- URL state (можно шарить ссылки)
- Работает кнопка "Назад"

### ✅ Масштабируемость

- Легко добавить новые сущности
- Переиспользуемые паттерны
- Понятная структура кода
- Хорошо документировано

## Тестирование

### Тест race conditions (Server-side)

```bash
# Запустить 10 параллельных запросов
for i in {1..10}; do
  curl http://localhost:3000/projects &
done
wait

# Проверить логи - должен быть только 1 refresh
```

### Тест race conditions (Client-side)

```typescript
// components/TestRaceCondition.tsx
const testParallelRequests = async () => {
  const promises = [
    supabase.from('projects').select(),
    supabase.from('users').select(),
    supabase.from('tasks').select(),
  ];
  
  await Promise.all(promises);
  // В Network tab - только 1 запрос к /auth/v1/token
};
```

## Migration от старой архитектуры

### Было (через Next.js API)

```typescript
// Browser → Next.js API Route → Supabase
const response = await fetch('/api/projects');
```

### Стало (прямо к Supabase)

```typescript
// Browser → Supabase напрямую
const { data } = await supabase.from('projects').select();
```

**Выигрыш:** Меньше задержка, проще код, меньше нагрузка на Next.js.

## Дата реализации

**Реализовано:** 15 ноября 2025  
**Версия Next.js:** 15.5.6  
**Версия Supabase SSR:** @supabase/ssr latest

---

## Checklist для новых сущностей

При добавлении новой сущности (например, Users):

- [ ] Создать `app/users/page.tsx` (SSR)
- [ ] Создать `app/users/actions.ts` (Server Actions)
- [ ] Создать `components/UsersList.tsx` (Browser Client)
- [ ] Создать функции в `lib/users/supabase.ts` (Server functions)
- [ ] Обновить `components/AppSidebar.tsx` (добавить ссылку)
- [ ] Настроить RLS в Supabase (Row Level Security)

Всё готово! 🚀


