# OUR-pack/chadcn

**Универсальная система управления контентом** на базе Next.js 15 + Supabase SSR + TypeScript

[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-SSR-green)](https://supabase.com/)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen)](https://github.com/)

---

## 🎯 Что это?

Готовая к production система для создания CRUD приложений с:

- ✅ **Универсальный Entity Service** - создание новой сущности за ~15 минут
- ✅ **Supabase SSR** - авторизация, Row Level Security, real-time
- ✅ **Гибридная архитектура** - SSR для первой загрузки, Browser Client для динамики
- ✅ **Сложная фильтрация** - simple, relation, many-to-many (OR/AND)
- ✅ **TypeScript** - полная типизация
- ✅ **Modern UI** - shadcn/ui компоненты

---

## 🚀 Быстрый старт

### 1. Установка

```bash
# Клонируйте репозиторий
git clone <repo-url>
cd chadcn

# Установите зависимости
pnpm install
```

### 2. Настройка окружения

```bash
# Скопируйте .env.example в .env.local
cp .env.example .env.local

# Заполните переменные:
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Запуск

```bash
# Dev сервер
pnpm dev

# Откройте http://localhost:3000
```

### 4. SQL Миграции (Supabase)

Выполните миграции в Supabase Dashboard → SQL Editor:

1. `docs/implementation/POSTS_MIGRATION_SIMPLE.sql` - создание таблиц (authors, tags, posts)
2. `docs/implementation/POSTS_RLS_FIX.sql` - RLS политики

---

## 📚 Документация

### Начните отсюда

| Документ                                                                                                 | Описание                         |
| -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **[docs/INDEX.md](docs/INDEX.md)**                                                                       | 📋 Полный индекс документации    |
| **[docs/implementation/ENTITY_SERVICE_FINAL.md](docs/implementation/ENTITY_SERVICE_FINAL.md)**           | 📖 Entity Service система        |
| **[docs/implementation/QUICK_START_ENTITY.md](docs/implementation/QUICK_START_ENTITY.md)**               | ⚡ Создание сущности за 15 минут |
| **[docs/implementation/PROJECT_STATUS_2025_11_15.md](docs/implementation/PROJECT_STATUS_2025_11_15.md)** | 📊 Текущий статус проекта        |
| **[docs/deployment/VERCEL_DEPLOYMENT.md](docs/deployment/VERCEL_DEPLOYMENT.md)**                         | 🚀 Деплой на Vercel              |
| **[docs/deployment/VERCEL_VS_OWN_SERVER.md](docs/deployment/VERCEL_VS_OWN_SERVER.md)**                   | ⚖️ Vercel vs Собственный сервер  |

### Ключевые документы

- **Архитектура:**

  - [CURRENT_AUTH_FLOW.md](docs/architecture/CURRENT_AUTH_FLOW.md) - Supabase SSR авторизация
  - [HYBRID_ARCHITECTURE_GUIDE.md](docs/implementation/HYBRID_ARCHITECTURE_GUIDE.md) - SSR + Browser Client
  - [DEVELOPMENT_GUIDE.md](docs/architecture/DEVELOPMENT_GUIDE.md) - Руководство разработчика

- **Миграции:**
  - [POSTS_MIGRATION_SIMPLE.sql](docs/implementation/POSTS_MIGRATION_SIMPLE.sql) - SQL для блога
  - [POSTS_RLS_FIX.sql](docs/implementation/POSTS_RLS_FIX.sql) - RLS политики

---

## 🏗️ Архитектура

### Гибридный подход

```
Browser (Client)
  ├─ Client Components → Supabase Browser Client (поиск, фильтры)
  └─ Server Actions → Next.js Server → Supabase (мутации)

Next.js Server (SSR)
  ├─ Server Components → Supabase Server Client (первая загрузка)
  └─ Middleware → Token Refresh (авторизация)

Supabase Cloud
  ├─ PostgreSQL + RLS (безопасность)
  └─ Auth (JWT токены)
```

### Ключевые принципы

1. **SSR First** - первая загрузка на сервере (SEO, скорость)
2. **Browser Client** - динамика без перезагрузки (UX)
3. **Server Actions** - мутации (безопасность)
4. **RLS** - защита данных на уровне БД
5. **URL State** - фильтры в адресной строке

---

## 📦 Что реализовано

### Сущности (CRUD)

- ✅ **Projects** - управление проектами
- ✅ **Authors** - авторы контента
- ✅ **Tags** - теги (с автогенерацией slug)
- ✅ **Posts** - посты/статьи (many-to-many с тегами)

### Фильтрация

- ✅ **Simple** - прямые поля (`?status=published`)
- ✅ **Relation** - many-to-one (`?author_id=123`)
- ✅ **Many-to-Many OR** - любой тег (`?tags=1,2&tags_mode=or`)
- ✅ **Many-to-Many AND** - все теги (`?tags=1,2&tags_mode=and`)

### UI

- ✅ Универсальные списки с пагинацией
- ✅ Формы создания/редактирования
- ✅ Поиск в реальном времени
- ✅ Адаптивный дизайн (shadcn/ui)

---

## 🛠️ Стек технологий

### Core

- **Next.js 15.5.6** - React framework
- **React 19** - UI library
- **TypeScript 5.x** - Type safety
- **Supabase** - Backend-as-a-Service

### UI

- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **Radix UI** - Headless components
- **Lucide React** - Icons

### Dev Tools

- **ESLint** - Linting
- **pnpm** - Package manager

---

## 🎓 Как создать новую сущность

### Пример: Products

**Время:** ~15 минут

```typescript
// 1. SQL (Supabase)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// 2. Types
export interface Product {
  id: string;
  name: string;
  price: number;
  created_at: string;
}

// 3. Service (8 строк!)
export const productsService = createEntityService<Product>({
  tableName: "products",
  searchFields: ["name"],
});

// 4. Server Actions (48 строк, шаблон)
export async function createProductAction(data: Partial<Product>) { ... }
export async function updateProductAction(id: string, data: Partial<Product>) { ... }
export async function deleteProductAction(id: string) { ... }

// 5. Pages (SSR)
export default async function ProductsPage() {
  const { data, pagination } = await productsService.getAll();
  return <ProductsList initialData={data} initialPagination={pagination} />;
}

// 6. UI (List + Form компоненты)
```

**Готово!** Полноценный CRUD за ~120 строк кода.

📖 **Подробнее:** [QUICK_START_ENTITY.md](docs/implementation/QUICK_START_ENTITY.md)

---

## 📊 Статистика

### Сравнение с legacy подходом

| Метрика            | Legacy    | New System     | Улучшение |
| ------------------ | --------- | -------------- | --------- |
| Строк на сущность  | ~620      | ~120           | **-80%**  |
| Дублирование кода  | Высокое   | Минимальное    | ✅        |
| Поддержка фильтров | Ручная    | Автоматическая | ✅        |
| Типизация          | Частичная | Полная         | ✅        |

### Текущий проект

- **3000+ строк** кода
- **4 сущности** реализованы
- **22 страницы** сгенерированы
- **0 ошибок** сборки
- **100%** TypeScript

---

## 🧪 Тестирование

```bash
# Запуск dev сервера
pnpm dev

# Сборка для production
pnpm build

# Проверка типов
pnpm type-check

# Линтинг
pnpm lint
```

### Проверенные страницы

- ✅ `/` - Home
- ✅ `/projects` - Проекты
- ✅ `/authors` - Авторы (создание, редактирование, удаление)
- ✅ `/tags` - Теги (автогенерация slug)
- ✅ `/posts` - Посты (фильтры по автору и тегам)

---

## 📁 Структура проекта

```
chadcn/
├── app/                          # Next.js App Router
│   ├── [entity]/
│   │   ├── page.tsx             # Список (SSR)
│   │   ├── new/page.tsx         # Создание
│   │   ├── [id]/edit/page.tsx   # Редактирование
│   │   └── actions.ts           # Server Actions
│   └── ...
│
├── lib/
│   ├── entity-service/          # Ядро системы
│   │   ├── types.ts
│   │   ├── base.ts              # createEntityService
│   │   ├── url-filters.ts       # Парсинг фильтров
│   │   └── index.ts
│   │
│   ├── entities/                # Конкретные сущности
│   │   ├── projects/
│   │   ├── authors/
│   │   ├── tags/
│   │   └── posts/
│   │
│   └── supabase/                # Supabase клиенты
│       ├── server.ts
│       ├── client.ts
│       └── middleware.ts
│
├── components/                   # React компоненты
│   ├── EntityList.tsx           # Универсальный список
│   ├── forms/
│   │   ├── EntityForm.tsx       # Универсальная форма
│   │   ├── AuthorForm.tsx
│   │   └── ...
│   └── ui/                      # shadcn/ui компоненты
│
└── docs/                        # Документация
    ├── INDEX.md
    ├── implementation/
    │   ├── ENTITY_SERVICE_FINAL.md
    │   ├── PROJECT_STATUS_2025_11_15.md
    │   └── QUICK_START_ENTITY.md
    └── architecture/
```

---

## 🔮 Планы развития

### Ближайшие задачи

- ⬜ Почистить ESLint warnings
- ⬜ Добавить валидацию форм (Zod)
- ⬜ Toast notifications
- ⬜ View страницы для постов

### Средний срок

- ⬜ WYSIWYG редактор для постов
- ⬜ Upload изображений
- ⬜ SEO метаданные
- ⬜ Публичный фронтенд блога

### Долгий срок

- ⬜ Code generation для Server Actions
- ⬜ Supabase generated types
- ⬜ Кэширование
- ⬜ Soft Delete
- ⬜ Audit log

---

## 🤝 Контрибьюция

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📝 Лицензия

MIT License - см. [LICENSE](LICENSE)

---

## 📞 Связь

- **Документация:** [docs/INDEX.md](docs/INDEX.md)
- **Issues:** GitHub Issues
- **Вопросы:** См. [docs/implementation/ENTITY_SERVICE_FINAL.md](docs/implementation/ENTITY_SERVICE_FINAL.md)

---

## ⭐ Благодарности

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Hosting

---

**Made with ❤️ using Next.js 15 + Supabase**

_Последнее обновление: 15 ноября 2025_
