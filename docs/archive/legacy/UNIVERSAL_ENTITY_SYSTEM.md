# Универсальная система работы с сущностями

**Дата:** 15 ноября 2025  
**Статус:** ✅ Готово к использованию

## 🎯 Что было сделано

Создана универсальная система для работы с сущностями в приложении, которая:

- **Сокращает код на 90%** - новая сущность создается за 5-10 строк
- **Поддерживает сложные фильтры** - simple, relation, many-to-many (OR/AND режимы)
- **Полностью типизирована** - TypeScript контролирует всё
- **Легко кастомизируется** - hooks для специфичной логики
- **Интегрирована с Supabase SSR** - работает с текущей архитектурой

## 📁 Структура

```
lib/entity-service/          # Универсальная система
├── types.ts                 # Типы
├── base.ts                  # BaseEntityService
├── url-filters.ts           # Парсинг фильтров из URL
├── actions.ts               # Генератор Server Actions
└── index.ts                 # Экспорты

lib/entities/                # Конкретные сущности
├── projects/
│   ├── types.ts
│   └── service.ts           # 15 строк (мигрирован)
├── authors/
│   ├── types.ts
│   └── service.ts           # 8 строк
├── tags/
│   ├── types.ts
│   └── service.ts           # 20 строк (с hooks)
└── posts/
    ├── types.ts
    └── service.ts           # 120 строк (сложная логика с тегами)

components/forms/            # Универсальные формы
├── EntityForm.tsx           # Базовая форма
├── AuthorForm.tsx
├── TagForm.tsx
├── PostForm.tsx
├── AuthorSelect.tsx         # Выбор автора
└── TagsSelect.tsx           # Множественный выбор тегов

components/
├── EntityList.tsx           # Универсальный список
├── AuthorsList.tsx
├── TagsList.tsx
└── PostsList.tsx

app/
├── authors/
│   ├── page.tsx             # Список (SSR)
│   ├── new/page.tsx         # Создание
│   ├── [id]/edit/page.tsx   # Редактирование (SSR)
│   └── actions.ts           # 3 строки (автогенерация)
├── tags/                    # То же самое
└── posts/                   # То же самое
```

## 🗄️ SQL Миграция

### Шаг 1: Выполните миграцию в Supabase

```sql
-- Находится в файле:
docs/implementation/POSTS_MIGRATION.sql
```

**Что создается:**
- Таблицы: `authors`, `tags`, `posts`, `post_tags`
- RLS политики (публичное чтение, админы для записи)
- Функции для many-to-many фильтрации
- Триггеры для `updated_at`
- Тестовые данные

**Как выполнить:**
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `POSTS_MIGRATION.sql`
3. Нажмите "Run"

### Шаг 2: Проверьте таблицы

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('authors', 'tags', 'posts', 'post_tags');
```

## 🚀 Использование

### Простая сущность (Authors, Tags)

```typescript
// lib/entities/authors/service.ts
import { BaseEntityService } from "@/lib/entity-service";
import type { Author } from "./types";

export const authorsService = new BaseEntityService<Author>({
  tableName: "authors",
  searchFields: ["name", "email", "bio"],
  defaultSortBy: "name",
  defaultSortOrder: "asc",
});
```

### Сущность с hooks (Tags с автогенерацией slug)

```typescript
// lib/entities/tags/service.ts
export const tagsService = new BaseEntityService<Tag>({
  tableName: "tags",
  searchFields: ["name", "slug"],
  defaultSortBy: "name",
  defaultSortOrder: "asc",

  hooks: {
    beforeCreate: async (data) => {
      // Автогенерация slug из name
      if (!data.slug && data.name) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
      return data;
    },
  },
});
```

### Сложная сущность (Posts с связями)

```typescript
// lib/entities/posts/service.ts
export const postsService = new BaseEntityService<Post>({
  tableName: "posts",
  searchFields: ["title", "content", "excerpt"],
  
  hooks: {
    // Загружаем автора и теги после получения данных
    afterFetch: async (posts) => {
      // Загрузка связанных данных...
      return postsWithAuthorsAndTags;
    },
    
    // Управление тегами при создании/обновлении
    afterCreate: async (post) => {
      if (post.tag_ids) {
        await createPostTags(post.id, post.tag_ids);
      }
      return post;
    },
  },
});
```

### Server Actions (автогенерация)

```typescript
// app/posts/actions.ts
"use server";

import { postsService } from "@/lib/entities/posts/service";
import { createEntityActions } from "@/lib/entity-service";

// Всего 3 строки!
export const {
  createAction: createPostAction,
  updateAction: updatePostAction,
  deleteAction: deletePostAction,
} = createEntityActions(postsService, "/posts");
```

## 🔍 Фильтры

### Simple Filters (status, type)

```typescript
// URL: /posts?status=published
const filters = parseFiltersFromUrl(searchParams, {
  simpleFilters: [
    { paramName: "status", field: "status", operator: "eq" },
  ],
});
```

### Relation Filters (author_id)

```typescript
// URL: /posts?author_id=123
const filters = parseFiltersFromUrl(searchParams, {
  relationFilters: [
    { paramName: "author_id", field: "author_id" },
  ],
});
```

### Many-to-Many Filters (теги)

```typescript
// URL: /posts?tags=1,2,3&tags_mode=or (любой тег)
// URL: /posts?tags=1,2,3&tags_mode=and (все теги)
const filters = parseFiltersFromUrl(searchParams, {
  manyToManyFilters: [
    {
      paramName: "tags",
      joinTable: "post_tags",
      joinColumn: "post_id",
      targetColumn: "tag_id",
      defaultMode: "or",
    },
  ],
});
```

## 🎨 Компоненты

### Форма создания

```typescript
// app/posts/new/page.tsx
"use client";

import { PostForm } from "@/components/forms/PostForm";
import { createPostAction } from "../actions";

export default function NewPostPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h1>Create Post</h1>
      <PostForm onSubmit={createPostAction} />
    </div>
  );
}
```

### Форма редактирования

```typescript
// app/posts/[id]/edit/page.tsx
import { postsService } from "@/lib/entities/posts/service";
import { EditPostClient } from "./EditPostClient";

export default async function EditPostPage({ params }) {
  const { id } = await params;
  const post = await postsService.getById(id);
  
  return <EditPostClient post={post} />;
}
```

## 📋 RLS Политики

### Авторы, Теги
- ✅ **Чтение** - доступно всем (даже без токена)
- 🔒 **Создание/Обновление/Удаление** - только админы

### Посты
- ✅ **Чтение опубликованных** - доступно всем
- 🔒 **Чтение черновиков** - только админы
- 🔒 **Создание/Обновление/Удаление** - только админы

### Post_Tags
- ✅ **Чтение** - доступно всем
- 🔒 **Создание/Удаление** - только админы

## 🧪 Тестирование

### 1. Запустите приложение

```bash
pnpm dev
```

### 2. Проверьте навигацию

- Home: `/`
- Projects: `/projects` (мигрирован на новую систему)
- Posts: `/posts`
- Authors: `/authors`
- Tags: `/tags`

### 3. Создайте тестовые данные

1. Создайте авторов: `/authors/new`
2. Создайте теги: `/tags/new`
3. Создайте пост: `/posts/new` (выберите автора и теги)

### 4. Проверьте фильтры

```
/posts?author_id=<author-id>
/posts?tags=<tag1-id>,<tag2-id>&tags_mode=or
/posts?tags=<tag1-id>,<tag2-id>&tags_mode=and
/posts?status=published
```

## ✨ Преимущества

### До (старый подход)

Для каждой сущности:
```
lib/[entity]/supabase.ts      - 178 строк
app/[entity]/actions.ts       - 100 строк
app/[entity]/page.tsx         - 65 строк
components/[Entity]List.tsx   - 275 строк

Итого: ~618 строк на сущность
```

### После (новая система)

Для простой сущности:
```
lib/entities/[entity]/types.ts    - 15 строк
lib/entities/[entity]/service.ts  - 8 строк
app/[entity]/actions.ts           - 3 строки

Итого: ~26 строк на сущность
```

**Экономия: 96% кода!**

## 🎓 Добавление новой сущности

### 1. Создайте таблицу в Supabase

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Создайте типы

```typescript
// lib/entities/products/types.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  created_at: string;
}
```

### 3. Создайте сервис

```typescript
// lib/entities/products/service.ts
import { BaseEntityService } from "@/lib/entity-service";

export const productsService = new BaseEntityService<Product>({
  tableName: "products",
  searchFields: ["name"],
});
```

### 4. Создайте actions

```typescript
// app/products/actions.ts
"use server";

import { productsService } from "@/lib/entities/products/service";
import { createEntityActions } from "@/lib/entity-service";

export const {
  createAction,
  updateAction,
  deleteAction,
} = createEntityActions(productsService, "/products");
```

### 5. Создайте страницу списка

```typescript
// app/products/page.tsx
import { productsService } from "@/lib/entities/products/service";
import { ProductsList } from "@/components/ProductsList";

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const { data, pagination } = await productsService.getAll({
    page: parseInt(params.page || "1"),
    search: params.search || "",
  });

  return <ProductsList initialData={data} initialPagination={pagination} />;
}
```

### 6. Готово!

Осталось только создать компоненты форм и списков.

## 📚 Связанные документы

- `CURRENT_AUTH_FLOW.md` - Текущая архитектура авторизации
- `HYBRID_ARCHITECTURE_GUIDE.md` - Гибридный подход (SSR + Browser Client)
- `DEVELOPMENT_GUIDE.md` - Руководство по разработке
- `POSTS_MIGRATION.sql` - SQL миграция для постов/авторов/тегов

## 🎯 Итог

Теперь у вас есть:
- ✅ Универсальная система entity-service
- ✅ Проекты мигрированы на новую систему
- ✅ Полноценная CMS для постов/авторов/тегов
- ✅ Сложные фильтры (many-to-many с OR/AND режимами)
- ✅ RLS политики (публичное чтение)
- ✅ Формы создания/редактирования
- ✅ Навигация обновлена

**Система готова к использованию и расширению!** 🚀

