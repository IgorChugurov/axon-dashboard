# Стандартные подходы для синхронизации состояния списка с URL

**Дата:** 2025-01-28  
**Цель:** Использовать стандартные отработанные подходы вместо изобретения велосипеда

---

## 🎯 Стандартные подходы в индустрии

### 1. URL как единственный источник истины (Next.js App Router стандарт)

**Принцип:** URL всегда источник истины для состояния списка (пагинация, поиск, фильтры).

**Почему это стандарт:**

- ✅ Работает с браузерной навигацией (Назад/Вперед)
- ✅ Можно делиться ссылками
- ✅ SEO-friendly
- ✅ Предсказуемое поведение
- ✅ Рекомендуется Next.js документацией

**Паттерн:**

```typescript
// 1. Читаем из URL (единственный источник истины)
const searchParams = useSearchParams();
const page = parseInt(searchParams.get("page") || "1", 10);
const search = searchParams.get("search") || "";

// 2. Используем для загрузки данных
const { data } = useQuery({
  queryKey: ["list", page, search],
  queryFn: () => fetchData({ page, search }),
});

// 3. Обновляем URL при изменении состояния
const router = useRouter();
const handlePageChange = (newPage: number) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", newPage.toString());
  router.replace(`?${params.toString()}`);
};
```

**Преимущества:**

- Простота
- Нет конфликтов источников истины
- Работает из коробки с Next.js

**Недостатки:**

- Нужно восстанавливать состояние при возврате на страницу (через sessionStorage)

---

### 2. Библиотека `nuqs` (популярное решение для Next.js)

**Что это:** Специализированная библиотека для работы с URL параметрами в Next.js App Router.

**Установка:**

```bash
npm install nuqs
```

**Пример использования:**

```typescript
import { useQueryState } from "nuqs";

function ListComponent() {
  // Автоматическая синхронизация с URL
  const [page, setPage] = useQueryState("page", {
    defaultValue: 1,
    parse: (value) => parseInt(value, 10),
    serialize: (value) => value.toString(),
  });

  const [search, setSearch] = useQueryState("search", {
    defaultValue: "",
    debounce: 300, // Автоматический debounce
  });

  // Используем для загрузки данных
  const { data } = useQuery({
    queryKey: ["list", page, search],
    queryFn: () => fetchData({ page, search }),
  });

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <button onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}
```

**Преимущества:**

- ✅ Автоматическая синхронизация с URL
- ✅ Встроенный debounce
- ✅ Type-safe
- ✅ Поддержка истории браузера
- ✅ Очень популярна в Next.js сообществе

**Недостатки:**

- Дополнительная зависимость
- Нужно изучить API библиотеки

**GitHub:** https://github.com/47ng/nuqs  
**Stars:** 1.5k+ ⭐

---

### 3. React Query + URL (стандартный паттерн для серверных данных)

**Принцип:** React Query управляет серверным состоянием, URL управляет параметрами запроса.

**Паттерн:**

```typescript
function ListComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL как источник истины для параметров
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";

  // React Query использует параметры из URL
  const { data, isLoading } = useQuery({
    queryKey: ["list", page, search],
    queryFn: () => fetchData({ page, search }),
    staleTime: 30 * 1000,
  });

  // Обновление параметров через URL
  const updateParams = (updates: { page?: number; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.page !== undefined) {
      params.set("page", updates.page.toString());
    }
    if (updates.search !== undefined) {
      params.set("search", updates.search);
    }
    router.replace(`?${params.toString()}`);
  };

  return (
    <div>
      <input
        value={search}
        onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
      />
      <button onClick={() => updateParams({ page: page + 1 })}>Next</button>
    </div>
  );
}
```

**Преимущества:**

- ✅ Стандартный паттерн для React Query
- ✅ Кеширование работает правильно
- ✅ Нет конфликтов источников истины

**Недостатки:**

- Нужно вручную синхронизировать URL и состояние

---

### 4. Комбинированный подход: URL + sessionStorage для восстановления

**Принцип:**

- URL - источник истины во время работы
- sessionStorage - для восстановления при возврате на страницу (когда URL пустой)

**Паттерн:**

```typescript
function useListParams() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Читаем URL (приоритет 1)
  const urlPage = searchParams.get("page");
  const urlSearch = searchParams.get("search");

  // 2. Читаем sessionStorage (приоритет 2, только если URL пустой)
  const storedState = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem("list-state");
    return stored ? JSON.parse(stored) : null;
  }, []);

  // 3. Определяем начальное состояние
  const initialPage = urlPage ? parseInt(urlPage, 10) : storedState?.page || 1;
  const initialSearch = urlSearch || storedState?.search || "";

  // 4. Если восстановили из sessionStorage, обновляем URL
  useEffect(() => {
    if (!urlPage && storedState?.page) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", storedState.page.toString());
      router.replace(`?${params.toString()}`);
    }
  }, []); // Только при монтировании

  // 5. Сохраняем в sessionStorage при изменении
  useEffect(() => {
    if (urlPage || urlSearch) {
      sessionStorage.setItem(
        "list-state",
        JSON.stringify({
          page: parseInt(urlPage || "1", 10),
          search: urlSearch || "",
        })
      );
    }
  }, [urlPage, urlSearch]);

  return {
    page: initialPage,
    search: initialSearch,
    setPage: (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      router.replace(`?${params.toString()}`);
    },
  };
}
```

**Преимущества:**

- ✅ URL как источник истины
- ✅ Восстановление состояния при возврате
- ✅ Работает с браузерной навигацией

**Недостатки:**

- Более сложная логика
- Нужно правильно обрабатывать порядок инициализации

---

## 📊 Сравнение подходов

| Подход                      | Сложность | Популярность | Рекомендация                         |
| --------------------------- | --------- | ------------ | ------------------------------------ |
| **URL как источник истины** | Низкая    | ⭐⭐⭐⭐⭐   | ✅ Рекомендуется для простых случаев |
| **nuqs библиотека**         | Средняя   | ⭐⭐⭐⭐     | ✅ Рекомендуется для сложных случаев |
| **React Query + URL**       | Средняя   | ⭐⭐⭐⭐⭐   | ✅ Стандарт для серверных данных     |
| **URL + sessionStorage**    | Высокая   | ⭐⭐⭐       | ⚠️ Только если нужна сложная логика  |

---

## 🎯 Рекомендация для нашего проекта

### Вариант 1: Использовать библиотеку `nuqs` (РЕКОМЕНДУЕТСЯ)

**Почему:**

- ✅ Стандартное решение для Next.js App Router
- ✅ Автоматическая синхронизация с URL
- ✅ Встроенный debounce
- ✅ Type-safe
- ✅ Решает все наши проблемы из коробки
- ✅ Очень популярна в сообществе

**Что нужно сделать:**

1. Установить `nuqs`
2. Переписать `use-list-params` используя `useQueryState`
3. Убрать всю сложную логику синхронизации

**Пример:**

```typescript
import { useQueryState } from "nuqs";

export function useListParams() {
  const [page, setPage] = useQueryState("page", {
    defaultValue: 1,
    parse: (value) => parseInt(value, 10),
    serialize: (value) => value.toString(),
  });

  const [search, setSearch] = useQueryState("search", {
    defaultValue: "",
    debounce: 300,
  });

  // sessionStorage для восстановления при возврате
  useEffect(() => {
    const stored = sessionStorage.getItem("list-state");
    if (stored && !page) {
      const { page: storedPage } = JSON.parse(stored);
      setPage(storedPage);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("list-state", JSON.stringify({ page, search }));
  }, [page, search]);

  return {
    params: { page, limit: 20, search: search || undefined },
    setParams: (updates) => {
      if (updates.page !== undefined) setPage(updates.page);
      if (updates.search !== undefined) setSearch(updates.search);
    },
    searchInput: search,
    setSearchInput: setSearch,
  };
}
```

---

### Вариант 2: Упростить текущий подход (без библиотек)

**Что нужно исправить:**

1. **URL как единственный источник истины**

   - Убрать `useState` для params
   - Использовать только `searchParams` для чтения параметров
   - Обновлять только URL

2. **Добавить синхронизацию URL → React Query**

   - React Query должен реагировать на изменения URL
   - Убрать промежуточное состояние `params`

3. **Упростить восстановление из sessionStorage**
   - Только при первом монтировании
   - Сразу обновлять URL, не хранить в state

**Пример упрощенного подхода:**

```typescript
export function useListParams() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Читаем из URL (единственный источник истины)
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";

  // Восстановление из sessionStorage только при первом монтировании
  useEffect(() => {
    if (!searchParams.get("page")) {
      const stored = sessionStorage.getItem("list-state");
      if (stored) {
        const { page: storedPage } = JSON.parse(stored);
        const params = new URLSearchParams();
        params.set("page", storedPage.toString());
        router.replace(`?${params.toString()}`);
      }
    }
  }, []); // Только при монтировании

  // Сохранение в sessionStorage
  useEffect(() => {
    sessionStorage.setItem("list-state", JSON.stringify({ page, search }));
  }, [page, search]);

  const updateParams = (updates: { page?: number; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.page !== undefined) {
      params.set("page", updates.page.toString());
    }
    if (updates.search !== undefined) {
      params.set("search", updates.search);
    }
    router.replace(`?${params.toString()}`);
  };

  return {
    params: { page, limit: 20, search: search || undefined },
    setParams: updateParams,
    searchInput: search,
    setSearchInput: (value: string) => updateParams({ search: value, page: 1 }),
  };
}
```

---

## 📚 Дополнительные ресурсы

### Официальная документация:

- **Next.js App Router:** https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating
- **React Query:** https://tanstack.com/query/latest

### Популярные библиотеки:

- **nuqs:** https://github.com/47ng/nuqs (1.5k+ ⭐)
- **use-query-params:** https://github.com/pbeshai/use-query-params (1.2k+ ⭐)

### Статьи и примеры:

- Next.js официальные примеры с пагинацией
- React Query документация по пагинации

---

## ✅ Итоговая рекомендация

**Использовать библиотеку `nuqs`** - это стандартное решение для Next.js App Router, которое:

- ✅ Решает все наши проблемы из коробки
- ✅ Очень популярна в сообществе
- ✅ Type-safe и хорошо документирована
- ✅ Автоматически обрабатывает все edge cases

**Альтернатива:** Упростить текущий подход, сделав URL единственным источником истины (без промежуточного state).

---

## 🔄 План миграции на nuqs

1. Установить `nuqs`
2. Переписать `use-list-params.ts` используя `useQueryState`
3. Упростить `UniversalEntityListDataTable.tsx`
4. Убрать всю сложную логику синхронизации
5. Протестировать все сценарии

**Ожидаемый результат:**

- Код станет проще и понятнее
- Проблемы с миганием исчезнут
- Работа с браузерной навигацией будет корректной
