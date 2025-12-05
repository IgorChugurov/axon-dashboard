# Документация проекта

**Проект:** Axon Dashboard  
**Стек:** Next.js 15.5.6 + Supabase SSR + TypeScript  
**Дата обновления:** 30 января 2025

---

## 📚 Навигация

### 🚀 Начните отсюда

1. **[INDEX.md](INDEX.md)** - Полный индекс всей документации
2. **[QUICK_START.md](getting-started/QUICK_START.md)** - Быстрый старт для новых разработчиков
3. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** 🌟 - Главное руководство разработчика

---

## 🏗️ Архитектура (АКТУАЛЬНОЕ)

**Начните отсюда:**

1. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** 🌟
   - Полное руководство по разработке
   - Как создавать новые страницы и компоненты
   - Best practices и примеры кода
   - **Главный документ для разработчиков**

2. **[CURRENT_AUTH_FLOW.md](architecture/auth/CURRENT_AUTH_FLOW.md)** 🔐
   - Текущий флоу авторизации с Supabase
   - Как работают токены
   - Race conditions protection
   - Middleware объяснение

3. **[HYBRID_ARCHITECTURE.md](architecture/HYBRID_ARCHITECTURE.md)** 🔄
   - Гибридный подход (SSR + Browser Client + Server Actions)
   - Когда использовать что
   - Примеры для каждого подхода

4. **[ROLES_AND_PERMISSIONS.md](architecture/auth/ROLES_AND_PERMISSIONS.md)** 🔑
   - Система ролей и прав доступа
   - Как использовать в коде

---

## 🔧 Реализация

### Entity Service System

- **[ENTITY_SERVICE.md](implementation/features/ENTITY_SERVICE.md)** - Универсальная система Entity Service
- **[QUICK_START_ENTITY.md](getting-started/QUICK_START_ENTITY.md)** - Создание сущности за 15 минут

### Universal Entity System

- **[UNIVERSAL_ENTITY.md](implementation/features/UNIVERSAL_ENTITY.md)** - Universal Entity система
- **[FORM_GENERATION.md](implementation/features/FORM_GENERATION.md)** - Генерация форм

### Миграции

- **[MIGRATIONS_INSTRUCTIONS.md](implementation/migrations/MIGRATIONS_INSTRUCTIONS.md)** - Инструкции по миграциям
- **[HOW_TO_RUN.md](implementation/migrations/HOW_TO_RUN.md)** - Как запустить миграции

---

## 📖 Руководства (Guides)

### Формы и списки
- **[UNIVERSAL_FORMS.md](guides/forms/UNIVERSAL_FORMS.md)** - Руководство по универсальным формам
- **[UNIVERSAL_LISTS.md](guides/lists/UNIVERSAL_LISTS.md)** - Руководство по универсальным спискам

### Деплой
- **[VERCEL_DEPLOYMENT.md](guides/deployment/VERCEL_DEPLOYMENT.md)** - Деплой на Vercel
- **[VERCEL_VS_OWN_SERVER.md](guides/deployment/VERCEL_VS_OWN_SERVER.md)** - Сравнение вариантов

### Отладка
- **[ROLES_DEBUG.md](guides/debugging/ROLES_DEBUG.md)** - Отладка системы ролей
- **[DEBUG_TIPS.md](guides/debugging/DEBUG_TIPS.md)** - Советы по отладке

### Тестирование
- **[TESTING_GUIDE.md](guides/testing/TESTING_GUIDE.md)** - Руководство по тестированию

---

## 🔄 Потоки данных (Flows)

- **[TOKEN_FLOW.md](flows/TOKEN_FLOW.md)** - Поток работы с токенами
- **[REQUEST_FLOW.md](flows/REQUEST_FLOW.md)** - Поток запросов
- **[DATA_FLOW.md](flows/DATA_FLOW.md)** - Поток данных
- **[PASSWORD_RESET_FLOW.md](flows/PASSWORD_RESET_FLOW.md)** - Восстановление пароля
- **[OAUTH_FLOW.md](flows/OAUTH_FLOW.md)** - OAuth поток

---

## 📐 Структуры проекта

- **[CONFIG_FILES.md](structure/CONFIG_FILES.md)** - Структура конфигурационных файлов
- **[FORMS_STRUCTURE.md](structure/FORMS_STRUCTURE.md)** - Структура форм
- **[LISTS_STRUCTURE.md](structure/LISTS_STRUCTURE.md)** - Структура списков
- **[NAVIGATION.md](structure/NAVIGATION.md)** - Навигация в приложении
- **[ROUTING.md](structure/ROUTING.md)** - Структура роутинга

---

## 📁 Структура документации

```
docs/
├── README.md                          # ← Вы здесь
├── INDEX.md                           # Полный индекс
│
├── getting-started/                    # 🚀 Быстрый старт
│   ├── QUICK_START.md
│   ├── QUICK_START_ENTITY.md
│   └── SUPABASE_SETUP.md
│
├── architecture/                       # 🏗️ Архитектура
│   ├── DEVELOPMENT_GUIDE.md          # ⭐ Главный гайд
│   ├── HYBRID_ARCHITECTURE.md        # ⭐ Гибридный подход
│   ├── MIDDLEWARE.md
│   └── auth/
│       ├── CURRENT_AUTH_FLOW.md      # ⭐ Авторизация
│       └── ROLES_AND_PERMISSIONS.md  # ⭐ Роли
│
├── structure/                          # 📐 Структуры
│   ├── CONFIG_FILES.md
│   ├── FORMS_STRUCTURE.md
│   ├── LISTS_STRUCTURE.md
│   ├── NAVIGATION.md
│   └── ROUTING.md
│
├── flows/                              # 🔄 Потоки
│   ├── TOKEN_FLOW.md
│   ├── REQUEST_FLOW.md
│   ├── DATA_FLOW.md
│   ├── PASSWORD_RESET_FLOW.md
│   └── OAUTH_FLOW.md
│
├── guides/                             # 📖 Руководства
│   ├── forms/UNIVERSAL_FORMS.md
│   ├── lists/UNIVERSAL_LISTS.md
│   ├── deployment/
│   ├── debugging/
│   └── testing/
│
├── implementation/                     # 🔧 Реализация
│   ├── PROJECT_STATUS.md             # ⭐ Текущий статус
│   ├── features/
│   │   ├── ENTITY_SERVICE.md        # ⭐ Entity Service
│   │   ├── UNIVERSAL_ENTITY.md
│   │   └── FORM_GENERATION.md
│   └── migrations/
│       ├── MIGRATIONS_INSTRUCTIONS.md
│       ├── HOW_TO_RUN.md
│       └── SQL/*.sql
│
├── components/                          # 🧩 UI Компоненты
│   └── CONFIRMATION_DIALOG.md
│
├── design-system/                       # 🎨 Дизайн-система
│   └── SPACING_GUIDE.md
│
├── roadmap/                             # 🗺️ Планы развития
│   └── ROADMAP.md
│
├── work-in-progress/                    # 🔨 Текущая работа
│   └── README.md
│
└── archive/                             # 📦 Архив устаревших документов
    ├── legacy/
    ├── plans/
    ├── reports/
    └── [другие категории]
```

---

## 🎯 Архитектурный обзор

### Слои приложения

```
Browser (Client)
  ├─ Client Components ('use client')
  │  └─ createClient() → Browser Supabase Client
  │     └─ Прямые запросы к Supabase API
  │
  └─ Server Actions вызовы
     └─ POST к Next.js серверу

Next.js Server
  ├─ Middleware (auth check, token refresh)
  ├─ Server Components (SSR)
  │  └─ createClient() → Server Supabase Client
  └─ Server Actions (мутации)
     └─ createClient() → Server Supabase Client

Supabase Cloud
  ├─ Authentication (токены, refresh)
  └─ PostgreSQL + RLS (защита данных)
```

### Гибридный подход

| Операция | Где | Клиент | Почему |
|----------|-----|--------|--------|
| Первая загрузка | Server Component | Server | SSR, SEO |
| Пагинация | Client Component | Browser | Без перезагрузки |
| Поиск/фильтры | Client Component | Browser | UX |
| Create/Update/Delete | Server Action | Server | Безопасность |

---

## 🔐 Авторизация

### Флоу

```
1. Login → Supabase Auth → Токены в httpOnly cookies
2. Каждый запрос → Middleware → updateSession() → Обновляет токены
3. Server Component → createClient() → Использует токены
4. Browser Client → createClient() → Автоматическое обновление при 401
```

### Race Conditions Protection

- **Server-side:** Map с Promise для дедупликации (Middleware)
- **Client-side:** Встроенная защита в Supabase SDK

Подробнее: **[TOKEN_FLOW.md](flows/TOKEN_FLOW.md)**

---

## 🚀 Быстрый старт

### Для нового разработчика:

1. **Прочитайте:** `getting-started/QUICK_START.md`
2. **Изучите:** `architecture/DEVELOPMENT_GUIDE.md`
3. **Посмотрите:** Существующие страницы (`app/projects/`)
4. **Создайте:** Свою страницу по шаблону

### Для понимания авторизации:

1. **Прочитайте:** `architecture/auth/CURRENT_AUTH_FLOW.md`
2. **Посмотрите:** `lib/supabase/middleware.ts`
3. **Изучите:** `flows/TOKEN_FLOW.md`

---

## ❓ FAQ

### Q: Как создать новую страницу?
**A:** Следуйте шаблону в `architecture/DEVELOPMENT_GUIDE.md` → "Создание новых страниц"

### Q: Когда использовать Server vs Client Component?
**A:** Server для SSR и защищенных данных, Client для интерактивности

### Q: Как работает обновление токенов?
**A:** Читайте `flows/TOKEN_FLOW.md` → "Автоматическое обновление токенов"

### Q: Как добавить новую роль?
**A:** Читайте `architecture/auth/ROLES_AND_PERMISSIONS.md`

### Q: Как создать новую сущность?
**A:** Читайте `getting-started/QUICK_START_ENTITY.md`

---

## 🔗 Полезные ссылки

### Внешняя документация

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React 19 Docs](https://react.dev/)

### Внутренние ресурсы

- **Примеры кода:**
  - `lib/entities/posts/` - сложная сущность с many-to-many
  - `lib/entities/tags/` - hooks (slug generation)
  - `lib/entities/authors/` - простая сущность
  - `lib/entities/projects/` - миграция со старой системы

- **Компоненты:**
  - `components/universal-entity-list/` - универсальный список
  - `components/UniversalEntityFormNew.tsx` - универсальная форма
  - `app/projects/` - полный пример CRUD

---

## 📝 Работа с документацией

### Текущая работа

Все текущие задачи документируются в **[work-in-progress/](work-in-progress/)**. После завершения работы документы переносятся в соответствующие разделы финальной документации.

Подробнее: **[work-in-progress/README.md](work-in-progress/README.md)**

### Архив

Устаревшие документы, планы, отчеты и анализы находятся в **[archive/](archive/)**. Они сохранены для истории, но не используются в текущей работе.

---

## 📧 Контакты

Для вопросов и предложений:
- Смотрите актуальную документацию в `/docs`
- Проверяйте примеры кода в `/app/projects`
- Используйте `work-in-progress/` для текущих задач

---

**Happy Coding! 🚀**

**Последнее обновление: 30 января 2025**
