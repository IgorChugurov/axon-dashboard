# Индекс документации проекта

**Обновлено:** 30 января 2025  
**Версия проекта:** 3.0  
**Статус:** ✅ Документация реорганизована

---

## 🚀 Быстрый старт

### Для новых разработчиков

1. **[QUICK_START.md](getting-started/QUICK_START.md)** - Установка и запуск проекта
2. **[QUICK_START_ENTITY.md](getting-started/QUICK_START_ENTITY.md)** - Создание новой сущности за 15 минут
3. **[SUPABASE_SETUP.md](getting-started/SUPABASE_SETUP.md)** - Настройка Supabase

### Для понимания архитектуры

1. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** 🌟 - Главное руководство разработчика
2. **[CURRENT_AUTH_FLOW.md](architecture/auth/CURRENT_AUTH_FLOW.md)** - Авторизация (Supabase SSR)
3. **[HYBRID_ARCHITECTURE.md](architecture/HYBRID_ARCHITECTURE.md)** - Гибридный подход (SSR + Client)
4. **[ROLES_AND_PERMISSIONS.md](architecture/auth/ROLES_AND_PERMISSIONS.md)** - Система ролей и прав

---

## 📚 Основная документация

### 🏗️ Архитектура

| Документ | Описание | Статус |
|----------|----------|--------|
| **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** | Полное руководство по разработке | ✅ Актуально |
| **[CURRENT_AUTH_FLOW.md](architecture/auth/CURRENT_AUTH_FLOW.md)** | Supabase SSR авторизация | ✅ Актуально |
| **[HYBRID_ARCHITECTURE.md](architecture/HYBRID_ARCHITECTURE.md)** | SSR + Browser Client подход | ✅ Актуально |
| **[ROLES_AND_PERMISSIONS.md](architecture/auth/ROLES_AND_PERMISSIONS.md)** | Система ролей и прав | ✅ Актуально |
| **[MIDDLEWARE.md](architecture/MIDDLEWARE.md)** | Как работает middleware | ✅ Актуально |

**Ключевые принципы:**
- SSR First (первая загрузка на сервере)
- Direct Supabase Access (Browser Client для динамики)
- Server Actions (мутации)
- RLS (безопасность на уровне БД)
- Race Conditions Protection

---

### 📐 Структуры проекта

| Документ | Описание |
|----------|----------|
| **[CONFIG_FILES.md](structure/CONFIG_FILES.md)** | Структура конфигурационных файлов |
| **[FORMS_STRUCTURE.md](structure/FORMS_STRUCTURE.md)** | Структура форм |
| **[LISTS_STRUCTURE.md](structure/LISTS_STRUCTURE.md)** | Структура списков |
| **[NAVIGATION.md](structure/NAVIGATION.md)** | Навигация в приложении |
| **[ROUTING.md](structure/ROUTING.md)** | Структура роутинга |

---

### 🔄 Потоки данных (Flows)

| Документ | Описание |
|----------|----------|
| **[TOKEN_FLOW.md](flows/TOKEN_FLOW.md)** | Поток работы с токенами |
| **[REQUEST_FLOW.md](flows/REQUEST_FLOW.md)** | Поток запросов |
| **[DATA_FLOW.md](flows/DATA_FLOW.md)** | Поток данных |
| **[PASSWORD_RESET_FLOW.md](flows/PASSWORD_RESET_FLOW.md)** | Восстановление пароля |
| **[OAUTH_FLOW.md](flows/OAUTH_FLOW.md)** | OAuth поток |

---

### 📖 Практические руководства (Guides)

#### Формы и списки
- **[UNIVERSAL_FORMS.md](guides/forms/UNIVERSAL_FORMS.md)** - Руководство по универсальным формам
- **[UNIVERSAL_LISTS.md](guides/lists/UNIVERSAL_LISTS.md)** - Руководство по универсальным спискам

#### Деплой
- **[VERCEL_DEPLOYMENT.md](guides/deployment/VERCEL_DEPLOYMENT.md)** - Деплой на Vercel
- **[VERCEL_VS_OWN_SERVER.md](guides/deployment/VERCEL_VS_OWN_SERVER.md)** - Сравнение вариантов

#### Отладка
- **[ROLES_DEBUG.md](guides/debugging/ROLES_DEBUG.md)** - Отладка системы ролей
- **[DEBUG_TIPS.md](guides/debugging/DEBUG_TIPS.md)** - Советы по отладке

#### Тестирование
- **[TESTING_GUIDE.md](guides/testing/TESTING_GUIDE.md)** - Руководство по тестированию

#### Другие гайды
- **[BACKEND_DATA_FORMAT.md](guides/BACKEND_DATA_FORMAT.md)** - Формат данных backend
- **[RECOMMENDATIONS.md](guides/RECOMMENDATIONS.md)** - Рекомендации
- **[CHANGELOG.md](guides/CHANGELOG.md)** - История изменений

---

### 🔧 Реализация

#### Features (Реализованные фичи)

| Документ | Описание |
|----------|----------|
| **[ENTITY_SERVICE.md](implementation/features/ENTITY_SERVICE.md)** | Универсальная система Entity Service |
| **[UNIVERSAL_ENTITY.md](implementation/features/UNIVERSAL_ENTITY.md)** | Universal Entity система |
| **[FORM_GENERATION.md](implementation/features/FORM_GENERATION.md)** | Генерация форм |

#### Миграции

| Документ | Описание |
|----------|----------|
| **[MIGRATIONS_INSTRUCTIONS.md](implementation/migrations/MIGRATIONS_INSTRUCTIONS.md)** | Инструкции по выполнению миграций |
| **[HOW_TO_RUN.md](implementation/migrations/HOW_TO_RUN.md)** | Как запустить миграции |
| **[SQL/*.sql](implementation/migrations/SQL/)** | SQL файлы миграций |

#### Статус проекта

| Документ | Описание |
|----------|----------|
| **[PROJECT_STATUS.md](implementation/PROJECT_STATUS.md)** | Текущее состояние проекта |

---

### 🧩 UI Компоненты

| Документ | Описание |
|----------|----------|
| **[CONFIRMATION_DIALOG.md](components/CONFIRMATION_DIALOG.md)** | Универсальное окно подтверждения действий |

> **Важно:** Используйте `ConfirmationDialog` для всех деструктивных действий вместо браузерного `confirm()`.

---

### 🎨 Дизайн-система

| Документ | Описание |
|----------|----------|
| **[SPACING_GUIDE.md](design-system/SPACING_GUIDE.md)** | Гайд по отступам |

---

### 🗺️ Roadmap

| Документ | Описание |
|----------|----------|
| **[ROADMAP.md](roadmap/ROADMAP.md)** | Дорожная карта развития проекта |
| **[PHASE_2_CONTENT_TYPES_BUILDER.md](roadmap/PHASE_2_CONTENT_TYPES_BUILDER.md)** | Фаза 2: Content Types Builder |

---

## 🎯 Рекомендуемый порядок чтения

### Если вы новый разработчик:

1. **[QUICK_START.md](getting-started/QUICK_START.md)** - установка и запуск
2. **[CURRENT_AUTH_FLOW.md](architecture/auth/CURRENT_AUTH_FLOW.md)** - как работает авторизация
3. **[HYBRID_ARCHITECTURE.md](architecture/HYBRID_ARCHITECTURE.md)** - архитектура приложения
4. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** - руководство разработчика
5. **[ENTITY_SERVICE.md](implementation/features/ENTITY_SERVICE.md)** - Entity Service система

### Если нужно создать новую сущность:

1. **[QUICK_START_ENTITY.md](getting-started/QUICK_START_ENTITY.md)** - пошаговая инструкция
2. Посмотрите примеры в `lib/entities/posts/` (самый сложный пример)
3. Посмотрите примеры в `lib/entities/tags/` (hooks)

### Если нужно понять текущее состояние проекта:

1. **[PROJECT_STATUS.md](implementation/PROJECT_STATUS.md)** - полный отчет

### Если нужно сделать миграцию БД:

1. **[MIGRATIONS_INSTRUCTIONS.md](implementation/migrations/MIGRATIONS_INSTRUCTIONS.md)** - инструкции
2. **[HOW_TO_RUN.md](implementation/migrations/HOW_TO_RUN.md)** - как запустить
3. SQL файлы в `implementation/migrations/SQL/`

---

## 📁 Структура документации

```
docs/
├── README.md                          # Главная точка входа
├── INDEX.md                           # ← Вы здесь (полный индекс)
│
├── getting-started/                    # 🚀 Быстрый старт
│   ├── QUICK_START.md
│   ├── QUICK_START_ENTITY.md
│   └── SUPABASE_SETUP.md
│
├── architecture/                       # 🏗️ Архитектура
│   ├── DEVELOPMENT_GUIDE.md          # ⭐ Главный гайд
│   ├── HYBRID_ARCHITECTURE.md        # ⭐ Гибридный подход
│   ├── MIDDLEWARE.md                 # Middleware
│   └── auth/
│       ├── CURRENT_AUTH_FLOW.md      # ⭐ Авторизация
│       └── ROLES_AND_PERMISSIONS.md  # ⭐ Роли
│
├── structure/                          # 📐 Структуры проекта
│   ├── CONFIG_FILES.md
│   ├── FORMS_STRUCTURE.md
│   ├── LISTS_STRUCTURE.md
│   ├── NAVIGATION.md
│   └── ROUTING.md
│
├── flows/                              # 🔄 Потоки данных
│   ├── TOKEN_FLOW.md
│   ├── REQUEST_FLOW.md
│   ├── DATA_FLOW.md
│   ├── PASSWORD_RESET_FLOW.md
│   └── OAUTH_FLOW.md
│
├── guides/                             # 📖 Руководства
│   ├── forms/
│   │   └── UNIVERSAL_FORMS.md
│   ├── lists/
│   │   └── UNIVERSAL_LISTS.md
│   ├── deployment/
│   │   ├── VERCEL_DEPLOYMENT.md
│   │   └── VERCEL_VS_OWN_SERVER.md
│   ├── debugging/
│   │   ├── ROLES_DEBUG.md
│   │   └── DEBUG_TIPS.md
│   ├── testing/
│   │   └── TESTING_GUIDE.md
│   └── [другие гайды]
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
│       └── SQL/
│           └── *.sql
│
├── components/                          # 🧩 UI Компоненты
│   └── CONFIRMATION_DIALOG.md
│
├── design-system/                      # 🎨 Дизайн-система
│   └── SPACING_GUIDE.md
│
├── roadmap/                            # 🗺️ Планы развития
│   ├── ROADMAP.md
│   └── PHASE_2_CONTENT_TYPES_BUILDER.md
│
├── work-in-progress/                   # 🔨 Текущая работа
│   └── README.md                      # Правила работы с WIP
│
└── archive/                            # 📦 Архив устаревших документов
    ├── legacy/                        # Устаревшие документы
    ├── plans/                         # Старые планы
    ├── reports/                       # Старые отчеты
    └── [другие категории]
```

---

## 🔗 Полезные ссылки

### Внешняя документация

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
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

## 💡 Частые вопросы

### Как создать новую сущность?
→ **[QUICK_START_ENTITY.md](getting-started/QUICK_START_ENTITY.md)**

### Как работает авторизация?
→ **[CURRENT_AUTH_FLOW.md](architecture/auth/CURRENT_AUTH_FLOW.md)**

### Почему Server Actions пишутся вручную?
→ **[ENTITY_SERVICE.md](implementation/features/ENTITY_SERVICE.md)** (раздел "Server Actions")

### Как добавить сложные фильтры?
→ **[ENTITY_SERVICE.md](implementation/features/ENTITY_SERVICE.md)** (раздел "Фильтрация")

### Где примеры кода?
→ `lib/entities/posts/service.ts` (самый сложный)

### Как показать подтверждение действия пользователю?
→ **[CONFIRMATION_DIALOG.md](components/CONFIRMATION_DIALOG.md)** - используйте `ConfirmationDialog` компонент

### Как создать универсальный список?
→ **[UNIVERSAL_LISTS.md](guides/lists/UNIVERSAL_LISTS.md)** - полное руководство по спискам

### Как создать универсальную форму?
→ **[UNIVERSAL_FORMS.md](guides/forms/UNIVERSAL_FORMS.md)** - полное руководство по формам

---

## 📞 Контакты

Если документация не помогла:
1. Проверьте **[PROJECT_STATUS.md](implementation/PROJECT_STATUS.md)** - возможно, там есть ответ
2. Посмотрите примеры в `lib/entities/`
3. Проверьте существующие issue в проекте

---

**Документация обновляется регулярно. Последнее обновление: 30 января 2025**
