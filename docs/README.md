# Документация проекта

**Проект:** Admin Panel  
**Стек:** Next.js 15.5.6 + Supabase SSR + TypeScript  
**Дата:** 15 ноября 2025

## 📚 Навигация

### 🏗️ Архитектура (АКТУАЛЬНОЕ)

**Начните отсюда:**

1. **[DEVELOPMENT_GUIDE.md](architecture/DEVELOPMENT_GUIDE.md)** 🌟
   - Полное руководство по разработке
   - Как создавать новые страницы и компоненты
   - Best practices и примеры кода
   - **Главный документ для разработчиков**

2. **[CURRENT_AUTH_FLOW.md](architecture/CURRENT_AUTH_FLOW.md)** 🔐
   - Текущий флоу авторизации с Supabase
   - Как работают токены
   - Race conditions protection
   - Middleware объяснение

3. **[HYBRID_ARCHITECTURE_GUIDE.md](implementation/HYBRID_ARCHITECTURE_GUIDE.md)** 🔄
   - Гибридный подход (SSR + Browser Client + Server Actions)
   - Когда использовать что
   - Примеры для каждого подхода

### 🔧 Реализация

4. **[RACE_CONDITIONS_PROTECTION.md](implementation/RACE_CONDITIONS_PROTECTION.md)** 🛡️
   - Защита от race conditions
   - Server-side и Client-side решения
   - Детальное объяснение механизма

5. **[TOKEN_REFRESH_FLOW.md](implementation/TOKEN_REFRESH_FLOW.md)** 🔄
   - Визуализация обновления токенов
   - Примеры параллельных запросов
   - Метрики производительности

6. **[ARCHITECTURE_IMPLEMENTATION_SUMMARY.md](implementation/ARCHITECTURE_IMPLEMENTATION_SUMMARY.md)** 📋
   - Краткая сводка реализации
   - Что было сделано
   - Тестирование

### 📖 Guides

7. **[QUICK_START.md](guides/QUICK_START.md)** 🚀
   - Быстрый старт для новых разработчиков
   - Setup инструкции
   - Первые шаги

### 🗂️ Справочная информация

- **[SUPABASE_SETUP_GUIDE.md](implementation/SUPABASE_SETUP_GUIDE.md)** - Настройка Supabase
- **[ROLES_SUMMARY.md](implementation/ROLES_SUMMARY.md)** - Система ролей
- **[MIDDLEWARE_EXPLANATION.md](implementation/MIDDLEWARE_EXPLANATION.md)** - Middleware детали

---

## 📁 Структура проекта

```
/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Главная (welcome)
│   ├── layout.tsx                # Root layout с AuthProvider
│   ├── projects/
│   │   ├── page.tsx             # Projects page (SSR)
│   │   └── actions.ts           # Server Actions
│   ├── api/                     # API Routes (internal)
│   └── auth/                    # Auth pages (login, callback)
│
├── components/                   # React компоненты
│   ├── ProjectsList.tsx         # Client Component (Browser Client)
│   ├── AppSidebar.tsx           # Sidebar навигация
│   ├── providers/
│   │   └── AuthProvider.tsx    # Auth context
│   └── ui/                      # shadcn/ui компоненты
│
├── lib/                         # Библиотеки и утилиты
│   ├── supabase/
│   │   ├── server.ts           # Server Client
│   │   ├── client.ts           # Browser Client
│   │   ├── middleware.ts       # Middleware + race conditions protection
│   │   └── admin.ts            # Admin Client (обход RLS)
│   ├── projects/
│   │   ├── supabase.ts         # Project functions (server)
│   │   └── types.ts            # Types
│   └── auth/
│       ├── roles.ts            # Roles utilities
│       └── types.ts            # Auth types
│
├── middleware.ts                # Next.js middleware (auth check)
│
└── docs/                        # Документация
    ├── README.md               # Этот файл
    ├── architecture/           # Архитектурные документы
    ├── implementation/         # Детали реализации
    └── guides/                 # Руководства
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

---

## 🚀 Быстрый старт

### Для нового разработчика:

1. **Прочитайте:** `architecture/DEVELOPMENT_GUIDE.md`
2. **Посмотрите:** Существующие страницы (`app/projects/`)
3. **Создайте:** Свою страницу по шаблону
4. **Следуйте:** Checklist в конце DEVELOPMENT_GUIDE.md

### Для понимания авторизации:

1. **Прочитайте:** `architecture/CURRENT_AUTH_FLOW.md`
2. **Посмотрите:** `lib/supabase/middleware.ts`
3. **Изучите:** `implementation/RACE_CONDITIONS_PROTECTION.md`

---

## 📝 Changelog

### v2.0 (15 ноября 2025)
- ✅ Миграция на Supabase SSR
- ✅ Race conditions protection реализована
- ✅ Гибридная архитектура (SSR + Browser Client + Server Actions)
- ✅ Middleware оптимизирован
- ✅ Документация обновлена

### v1.0 (14 ноября 2025)
- Начальная версия с Backend API
- Базовая авторизация
- Projects CRUD

---

## ❓ FAQ

### Q: Как создать новую страницу?
**A:** Следуйте шаблону в `DEVELOPMENT_GUIDE.md` → "Создание новых страниц"

### Q: Когда использовать Server vs Client Component?
**A:** Server для SSR и защищенных данных, Client для интерактивности

### Q: Как работает обновление токенов?
**A:** Читайте `CURRENT_AUTH_FLOW.md` → "Автоматическое обновление токенов"

### Q: Что такое race conditions и как мы их решаем?
**A:** Читайте `RACE_CONDITIONS_PROTECTION.md`

### Q: Как добавить новую роль?
**A:** Читайте `ROLES_SUMMARY.md`

---

## 🔗 Полезные ссылки

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side)

---

## 📧 Контакты

Для вопросов и предложений:
- Смотрите актуальную документацию в `/docs`
- Проверяйте примеры кода в `/app/projects`

---

**Happy Coding! 🚀**
