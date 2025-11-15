# Индекс документации проекта

**Обновлено:** 15 ноября 2025  
**Версия проекта:** 3.0

---

## 🚀 Быстрый старт

### Для новых разработчиков

1. **[QUICK_START.md](guides/QUICK_START.md)** - Начало работы с проектом
2. **[QUICK_START_ENTITY.md](implementation/QUICK_START_ENTITY.md)** - Создание новой сущности за 15 минут

### Для понимания архитектуры

1. **[CURRENT_AUTH_FLOW.md](architecture/CURRENT_AUTH_FLOW.md)** - Авторизация (Supabase SSR)
2. **[HYBRID_ARCHITECTURE_GUIDE.md](implementation/HYBRID_ARCHITECTURE_GUIDE.md)** - Гибридный подход (SSR + Client)
3. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** - Общее руководство разработчика

---

## 📚 Основная документация

### Entity Service System (текущая)

| Документ | Описание | Статус |
|----------|----------|--------|
| **[ENTITY_SERVICE_FINAL.md](implementation/ENTITY_SERVICE_FINAL.md)** | Полное описание Entity Service 3.0 | ✅ Актуально |
| **[PROJECT_STATUS_2025_11_15.md](implementation/PROJECT_STATUS_2025_11_15.md)** | Текущее состояние проекта | ✅ Актуально |
| **[QUICK_START_ENTITY.md](implementation/QUICK_START_ENTITY.md)** | Быстрый старт (создание сущности) | ✅ Актуально |

**Основные концепции:**
- Функциональный подход (`createEntityService`)
- Сложная фильтрация (simple, relation, many-to-many)
- URL State Management
- Hooks для кастомизации
- Manual Server Actions (временное решение)

---

### Архитектура

| Документ | Описание | Статус |
|----------|----------|--------|
| **[CURRENT_AUTH_FLOW.md](architecture/CURRENT_AUTH_FLOW.md)** | Supabase SSR авторизация | ✅ Актуально |
| **[HYBRID_ARCHITECTURE_GUIDE.md](implementation/HYBRID_ARCHITECTURE_GUIDE.md)** | SSR + Browser Client подход | ✅ Актуально |
| **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** | Руководство разработчика | ✅ Актуально |
| [FINAL_IMPLEMENTATION_SUMMARY.md](implementation/FINAL_IMPLEMENTATION_SUMMARY.md) | Итоговая архитектура | ⚠️ Частично устарело |

**Ключевые принципы:**
- SSR First (первая загрузка на сервере)
- Direct Supabase Access (Browser Client для динамики)
- Server Actions (мутации)
- RLS (безопасность на уровне БД)
- Race Conditions Protection

---

### SQL Миграции

| Файл | Описание | Статус |
|------|----------|--------|
| **[POSTS_MIGRATION_SIMPLE.sql](implementation/POSTS_MIGRATION_SIMPLE.sql)** | Блог (authors, tags, posts) | ✅ Применено |
| **[POSTS_RLS_FIX.sql](implementation/POSTS_RLS_FIX.sql)** | Исправление RLS политик | ✅ Применено |
| [SUPABASE_MIGRATION.sql](implementation/SUPABASE_MIGRATION.sql) | Первая миграция (profiles, admins) | ✅ Применено |
| [SUPABASE_PROJECTS_MIGRATION.sql](implementation/SUPABASE_PROJECTS_MIGRATION.sql) | Проекты | ✅ Применено |

---

## 🛠️ Реализация и гайды

### Entity Service (новая система)

- **[ENTITY_SERVICE_FINAL.md](implementation/ENTITY_SERVICE_FINAL.md)** - главный документ
- **[QUICK_START_ENTITY.md](implementation/QUICK_START_ENTITY.md)** - пошаговая инструкция
- ⚠️ [UNIVERSAL_ENTITY_SYSTEM.md](implementation/UNIVERSAL_ENTITY_SYSTEM.md) - устарело (class approach)

### Суммари и отчеты

- **[PROJECT_STATUS_2025_11_15.md](implementation/PROJECT_STATUS_2025_11_15.md)** - текущий статус
- [SUPABASE_MIGRATION_COMPLETE.md](implementation/SUPABASE_MIGRATION_COMPLETE.md) - Supabase миграция
- [ROLES_SUMMARY.md](implementation/ROLES_SUMMARY.md) - Система ролей
- [IMPLEMENTATION_STATUS.md](implementation/IMPLEMENTATION_STATUS.md) - история реализации

### Специфичные темы

- [RACE_CONDITIONS_PROTECTION.md](implementation/RACE_CONDITIONS_PROTECTION.md) - Защита от race conditions
- [MIDDLEWARE_EXPLANATION.md](implementation/MIDDLEWARE_EXPLANATION.md) - Как работает middleware
- [TOKEN_REFRESH_FIX.md](implementation/TOKEN_REFRESH_FIX.md) - Исправление refresh токенов

---

## 📖 Руководства (Guides)

| Документ | Описание |
|----------|----------|
| [QUICK_START.md](guides/QUICK_START.md) | Быстрый старт с проектом |
| [TESTING_GUIDE.md](guides/TESTING_GUIDE.md) | Руководство по тестированию |
| [DEBUG_TIPS.md](guides/DEBUG_TIPS.md) | Советы по отладке |
| [BACKEND_DATA_FORMAT.md](guides/BACKEND_DATA_FORMAT.md) | Формат данных backend |
| [RECOMMENDATIONS.md](guides/RECOMMENDATIONS.md) | Рекомендации |
| [CHANGELOG.md](guides/CHANGELOG.md) | История изменений |

---

## 🔄 Flow диаграммы

| Документ | Описание |
|----------|----------|
| [FLOW_DIAGRAM.md](flows/FLOW_DIAGRAM.md) | Диаграммы потоков |
| [REQUEST_FLOW_EXPLANATION.md](flows/REQUEST_FLOW_EXPLANATION.md) | Объяснение потока запросов |
| [TOKEN_FLOW_SUMMARY.md](flows/TOKEN_FLOW_SUMMARY.md) | Поток токенов |

---

## 📊 Отчеты и анализ

| Документ | Описание |
|----------|----------|
| [AUTH_CLEANUP_REPORT.md](reports/AUTH_CLEANUP_REPORT.md) | Отчет о чистке авторизации |
| [CLEANUP_RECOMMENDATIONS.md](reports/CLEANUP_RECOMMENDATIONS.md) | Рекомендации по чистке |
| [ORGANIZATION_REPORT.md](reports/ORGANIZATION_REPORT.md) | Отчет об организации |
| [PUBLIC_FILES_ANALYSIS.md](reports/PUBLIC_FILES_ANALYSIS.md) | Анализ публичных файлов |
| [USAGE_ANALYSIS.md](reports/USAGE_ANALYSIS.md) | Анализ использования |

---

## ⚠️ Устаревшие документы

Эти документы сохранены для истории, но информация в них устарела:

- ⚠️ [UNIVERSAL_ENTITY_SYSTEM.md](implementation/UNIVERSAL_ENTITY_SYSTEM.md) - описывает class approach (вместо этого читайте ENTITY_SERVICE_FINAL.md)
- ⚠️ [FINAL_IMPLEMENTATION_SUMMARY.md](implementation/FINAL_IMPLEMENTATION_SUMMARY.md) - частично устарело
- ⚠️ Документы в `architecture/` (кроме CURRENT_AUTH_FLOW.md, DEVELOPMENT_GUIDE.md) - могут содержать устаревшую информацию

---

## 🎯 Рекомендуемый порядок чтения

### Если вы новый разработчик:

1. **[QUICK_START.md](guides/QUICK_START.md)** - установка и запуск
2. **[CURRENT_AUTH_FLOW.md](architecture/CURRENT_AUTH_FLOW.md)** - как работает авторизация
3. **[HYBRID_ARCHITECTURE_GUIDE.md](implementation/HYBRID_ARCHITECTURE_GUIDE.md)** - архитектура приложения
4. **[ENTITY_SERVICE_FINAL.md](implementation/ENTITY_SERVICE_FINAL.md)** - Entity Service система
5. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** - руководство разработчика

### Если нужно создать новую сущность:

1. **[QUICK_START_ENTITY.md](implementation/QUICK_START_ENTITY.md)** - пошаговая инструкция
2. Посмотрите примеры в `lib/entities/posts/` (самый сложный пример)
3. Посмотрите примеры в `lib/entities/tags/` (hooks)

### Если нужно понять текущее состояние проекта:

1. **[PROJECT_STATUS_2025_11_15.md](implementation/PROJECT_STATUS_2025_11_15.md)** - полный отчет

### Если нужно сделать миграцию БД:

1. **[POSTS_MIGRATION_SIMPLE.sql](implementation/POSTS_MIGRATION_SIMPLE.sql)** - пример миграции
2. **[POSTS_RLS_FIX.sql](implementation/POSTS_RLS_FIX.sql)** - RLS политики

---

## 📁 Структура документации

```
docs/
├── INDEX.md                          # ← Вы здесь
├── README.md                         # Общее описание
│
├── guides/                           # Руководства
│   ├── QUICK_START.md               # Быстрый старт
│   ├── TESTING_GUIDE.md
│   └── ...
│
├── architecture/                     # Архитектура
│   ├── CURRENT_AUTH_FLOW.md         # ⭐ Авторизация
│   ├── DEVELOPMENT_GUIDE.md         # ⭐ Руководство
│   └── ...
│
├── implementation/                   # Реализация
│   ├── ENTITY_SERVICE_FINAL.md      # ⭐ Entity Service
│   ├── PROJECT_STATUS_2025_11_15.md # ⭐ Текущий статус
│   ├── QUICK_START_ENTITY.md        # ⭐ Быстрый старт
│   ├── HYBRID_ARCHITECTURE_GUIDE.md # ⭐ Гибридный подход
│   ├── POSTS_MIGRATION_SIMPLE.sql   # SQL миграция
│   └── ...
│
├── flows/                            # Диаграммы потоков
│   └── ...
│
└── reports/                          # Отчеты и анализ
    └── ...
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
  - `components/EntityList.tsx` - универсальный список
  - `components/forms/EntityForm.tsx` - универсальная форма
  - `app/posts/` - полный пример CRUD

---

## 💡 Частые вопросы

### Как создать новую сущность?
→ **[QUICK_START_ENTITY.md](implementation/QUICK_START_ENTITY.md)**

### Как работает авторизация?
→ **[CURRENT_AUTH_FLOW.md](architecture/CURRENT_AUTH_FLOW.md)**

### Почему Server Actions пишутся вручную?
→ **[ENTITY_SERVICE_FINAL.md](implementation/ENTITY_SERVICE_FINAL.md)** (раздел "Server Actions")

### Как добавить сложные фильтры?
→ **[ENTITY_SERVICE_FINAL.md](implementation/ENTITY_SERVICE_FINAL.md)** (раздел "Фильтрация")

### Где примеры кода?
→ `lib/entities/posts/service.ts` (самый сложный)

---

## 📞 Контакты

Если документация не помогла:
1. Проверьте **[PROJECT_STATUS_2025_11_15.md](implementation/PROJECT_STATUS_2025_11_15.md)** - возможно, там есть ответ
2. Посмотрите примеры в `lib/entities/`
3. Проверьте существующие issue в проекте

---

**Документация обновляется регулярно. Последнее обновление: 15 ноября 2025**

