# Объяснение: Что происходит при запросе к главной странице `/`

## Полный путь запроса от браузера до получения данных

### Шаг 1: Браузер отправляет запрос

```
GET http://localhost:3000/
```

### Шаг 2: Middleware (middleware.ts)

```
┌─────────────────────────────────────────────────────────┐
│  middleware.ts                                           │
│  └─> Проверяет путь: "/"                                │
│  └─> Проверяет наличие refreshToken cookie              │
│      • Если нет → редирект на /login (сейчас отключено) │
│      • Если есть → пропускает дальше                    │
└─────────────────────────────────────────────────────────┘
```

**Что происходит:**

- Middleware проверяет cookies запроса
- Если нет `refreshToken` → редирект на `/login` (сейчас временно отключено для отладки)
- Если есть → добавляет заголовок `x-pathname` и пропускает дальше

### Шаг 3: Next.js роутинг

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Router                                         │
│  └─> Определяет: путь "/" → app/page.tsx               │
│  └─> Это Server Component (SSR)                         │
└─────────────────────────────────────────────────────────┘
```

### Шаг 4: Рендеринг страницы (app/page.tsx)

```
┌─────────────────────────────────────────────────────────┐
│  app/page.tsx - HomePage                               │
│  └─> Оборачивает в <Suspense>                          │
│      └─> ProjectsPageContent (async Server Component)  │
└─────────────────────────────────────────────────────────┘
```

**Код:**

```typescript
export default function HomePage({ searchParams }) {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <ProjectsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
```

### Шаг 5: ProjectsPageContent получает данные

```
┌─────────────────────────────────────────────────────────┐
│  ProjectsPageContent (app/page.tsx)                     │
│                                                          │
│  1. Парсит searchParams из URL                          │
│     const params = parseSearchParams(await searchParams)│
│                                                          │
│  2. Вызывает провайдер для получения данных            │
│     const initialData = await                           │
│       projectsServerProvider.getProjects(params)         │
│                                                          │
│  3. Рендерит компонент с данными                        │
│     return <ProjectsList initialData={initialData} />   │
└─────────────────────────────────────────────────────────┘
```

### Шаг 6: ProjectsServerProvider (lib/projects/server.ts)

```
┌─────────────────────────────────────────────────────────┐
│  projectsServerProvider.getProjects(params)             │
│  └─> Вызывает родительский метод                        │
│      this.getData(params)                               │
└─────────────────────────────────────────────────────────┘
```

**Код:**

```typescript
async getProjects(params) {
  return this.getData(params); // Вызывает ServerDataProvider
}
```

### Шаг 7: ServerDataProvider.getData() (lib/server-data/base.ts)

```
┌─────────────────────────────────────────────────────────┐
│  ServerDataProvider.getData(params)                     │
│                                                          │
│  1. Извлекает имя сущности из endpoint                 │
│     entity = "/api/projects" → "projects"               │
│                                                          │
│  2. Вызывает серверную функцию (ПРЯМОЙ ВЫЗОВ!) ✅      │
│     const data = await getEntityData('projects', params)│
│                                                          │
│  3. Форматирует ответ                                   │
│     return this.formatResponse(data)                    │
└─────────────────────────────────────────────────────────┘
```

**Важно:** Здесь НЕТ HTTP запроса к `localhost:3000/api/projects`!
Это прямой вызов функции.

### Шаг 8: getEntityData() (lib/api/server.ts)

```
┌─────────────────────────────────────────────────────────┐
│  getEntityData('projects', params)                      │
│                                                          │
│  1. Вызывает общую логику                               │
│     const backendData = await                           │
│       getEntityDataFromBackend('projects', params)      │
│                                                          │
│  2. Форматирует ответ                                   │
│     return formatEntityResponse(backendData, 'projects')│
└─────────────────────────────────────────────────────────┘
```

### Шаг 9: getEntityDataFromBackend() (lib/api/handlers.ts)

```
┌─────────────────────────────────────────────────────────┐
│  getEntityDataFromBackend('projects', params)           │
│                                                          │
│  1. Получает токены из cookies (ПРЯМОЙ ДОСТУП!) ✅     │
│     const tokens = await getAuthTokens()               │
│     // cookies() из 'next/headers' работает напрямую   │
│                                                          │
│  2. Строит URL к удаленному бэкенду                    │
│     backendUrl = `${NEXT_PUBLIC_API_URL}/api/projects`   │
│     // Например: https://api.example.com/api/projects  │
│                                                          │
│  3. Делает HTTP запрос к УДАЛЕННОМУ бэкенду ✅         │
│     const response = await fetch(backendUrl, {         │
│       headers: {                                        │
│         Authorization: `Bearer ${tokens.accessToken}`   │
│       }                                                 │
│     })                                                  │
│                                                          │
│  4. Если 401 → обновляет токен и повторяет             │
│     if (response.status === 401) {                      │
│       newToken = await refreshTokenAndGetNew()         │
│       // Повторяет запрос с новым токеном              │
│     }                                                   │
│                                                          │
│  5. Возвращает данные                                   │
│     return await response.json()                        │
└─────────────────────────────────────────────────────────┘
```

**Важно:** Здесь происходит реальный HTTP запрос к **удаленному бэкенду**,
а не к своему Next.js API!

### Шаг 10: Данные возвращаются обратно

```
┌─────────────────────────────────────────────────────────┐
│  Обратный путь данных:                                  │
│                                                          │
│  Удаленный бэкенд                                       │
│    ↓ (JSON данные)                                      │
│  getEntityDataFromBackend()                             │
│    ↓ (форматированные данные)                           │
│  getEntityData()                                        │
│    ↓ (форматированные данные)                           │
│  ServerDataProvider.getData()                           │
│    ↓ (ServerDataResponse)                               │
│  projectsServerProvider.getProjects()                   │
│    ↓ (ServerDataResponse)                               │
│  ProjectsPageContent                                    │
│    ↓ (React компонент)                                  │
│  ProjectsList с initialData                             │
└─────────────────────────────────────────────────────────┘
```

### Шаг 11: Рендеринг HTML

```
┌─────────────────────────────────────────────────────────┐
│  Next.js рендерит Server Component в HTML              │
│  └─> Отправляет HTML в браузер                         │
│  └─> Браузер отображает страницу                       │
└─────────────────────────────────────────────────────────┘
```

## Ключевые моменты

### ✅ Что работает правильно:

1. **Прямой доступ к cookies в Server Component**

   - `getAuthTokens()` использует `cookies()` из `next/headers`
   - Работает напрямую, без HTTP запроса

2. **Прямой вызов функции вместо HTTP**

   - `getEntityData()` вызывается напрямую
   - Нет запроса к `localhost:3000/api/projects`

3. **Запрос к удаленному бэкенду остается**
   - Данные получаются с `NEXT_PUBLIC_API_URL`
   - Авторизация через токены работает

### ❌ Что было неправильно (до исправления):

1. **HTTP fetch к своему API**

   ```typescript
   // ❌ Не работало в Server Component
   fetch("http://localhost:3000/api/projects");
   ```

   - Next.js не может маршрутизировать такой запрос
   - Приводило к 404 ошибке

2. **Обходной маневр для cookies**
   - Делали HTTP запрос только чтобы передать cookies
   - Неэффективно и не работает

## Визуальная схема

```
Браузер
  ↓ GET /
Middleware (проверка cookies)
  ↓
Next.js Router
  ↓
app/page.tsx (Server Component)
  ↓
ProjectsPageContent
  ↓
projectsServerProvider.getProjects()
  ↓
ServerDataProvider.getData()
  ↓
getEntityData('projects') ← ПРЯМОЙ ВЫЗОВ (без HTTP!)
  ↓
getEntityDataFromBackend()
  ↓
getAuthTokens() ← ПРЯМОЙ ДОСТУП к cookies
  ↓
fetch(УДАЛЕННЫЙ_БЭКЕНД/api/projects) ← HTTP к удаленному серверу
  ↓
Удаленный бэкенд возвращает данные
  ↓
Данные возвращаются обратно по цепочке
  ↓
Рендеринг HTML
  ↓
Браузер получает готовую страницу
```

## Итог

**При запросе к `/`:**

1. ✅ Middleware проверяет авторизацию
2. ✅ Server Component рендерится на сервере
3. ✅ Данные получаются через прямой вызов функции
4. ✅ Cookies доступны напрямую (без HTTP)
5. ✅ Запрос к удаленному бэкенду выполняется
6. ✅ HTML отправляется в браузер

**Никаких HTTP запросов к `localhost:3000/api/projects` больше нет!**
