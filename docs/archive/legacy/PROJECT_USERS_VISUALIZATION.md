# Визуализация архитектуры пользователей проектов

## 📊 Сравнение архитектур

### Старая архитектура (проблемы)

```mermaid
graph TB
    subgraph "Проблемы"
        A1[auth.users<br/>Один email = один пользователь]
        A2[Один пароль для всех проектов]
        A3[Один профиль для всех проектов]
        A4[created_by → auth.users.id]
    end

    A1 --> A2
    A1 --> A3
    A1 --> A4
```

### Новая архитектура (решение)

```mermaid
graph TB
    subgraph "Админ-панель"
        AuthUsers[(auth.users<br/>Supabase Auth)]
        Admins[(admins)]
        ProjectAdmins[(project_admins)]
        AuthUsers --> Admins
        AuthUsers --> ProjectAdmins
    end

    subgraph "Приложения проектов"
        ProjectUsers[(project_users<br/>Кастомная авторизация)]
        Project1[Проект 1<br/>user@example.com<br/>password1]
        Project2[Проект 2<br/>user@example.com<br/>password2]
        ProjectUsers --> Project1
        ProjectUsers --> Project2
    end

    subgraph "Сущности"
        EntityInst[(entity_instance<br/>created_by → project_users.id)]
        ProjectUsers --> EntityInst
    end
```

## 🔄 Поток авторизации

### В админ-панели (без изменений)

```mermaid
sequenceDiagram
    participant Admin
    participant AdminPanel
    participant SupabaseAuth
    participant DB

    Admin->>AdminPanel: Логин (email, password)
    AdminPanel->>SupabaseAuth: supabase.auth.signInWithPassword()
    SupabaseAuth-->>AdminPanel: ✅ Сессия (auth.users)
    AdminPanel->>DB: Проверка admins/project_admins
    DB-->>AdminPanel: ✅ Роль определена
    AdminPanel-->>Admin: ✅ Доступ к админ-панели
```

### В приложении проекта (новая система)

```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant DB as project_users
    participant JWT

    User->>App: Регистрация (email, password, profile)
    App->>API: POST /api/public/{projectId}/auth/sign-up
    API->>DB: Проверка существования (project_id, email)

    alt Пользователь не существует
        API->>API: Хеширование пароля (bcrypt)
        API->>DB: INSERT INTO project_users<br/>(project_id, email, password_hash, profile)
        DB-->>API: ✅ Пользователь создан
        API->>JWT: Генерация токена
        JWT-->>API: JWT токен
        API-->>App: ✅ Токен + данные пользователя
        App-->>User: ✅ Зарегистрирован
    else Пользователь уже существует
        DB-->>API: ❌ Ошибка "User already exists"
        API-->>App: ❌ Ошибка
        App-->>User: ❌ Пользователь уже существует
    end
```

### Вход в приложение проекта

```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant DB as project_users
    participant JWT

    User->>App: Вход (email, password)
    App->>API: POST /api/public/{projectId}/auth/sign-in
    API->>DB: SELECT * FROM project_users<br/>WHERE project_id=? AND email=?
    DB-->>API: Пользователь (password_hash)

    API->>API: Проверка пароля (bcrypt.compare)

    alt Пароль верный
        API->>DB: UPDATE last_login_at
        API->>JWT: Генерация токена
        JWT-->>API: JWT токен
        API-->>App: ✅ Токен + данные пользователя
        App-->>User: ✅ Авторизован
    else Пароль неверный
        API-->>App: ❌ "Invalid email or password"
        App-->>User: ❌ Ошибка входа
    end
```

## 🏗️ Структура данных

### project_users таблица

```mermaid
erDiagram
    projects ||--o{ project_users : "has"
    project_users ||--o{ entity_instance : "creates"
    project_users ||--o{ entity_file : "uploads"

    projects {
        uuid id PK
        string name
    }

    project_users {
        uuid id PK
        uuid project_id FK
        string email
        string password_hash
        jsonb oauth_providers
        jsonb profile
        string status
        timestamp created_at
        UNIQUE project_id_email
    }

    entity_instance {
        uuid id PK
        uuid project_id FK
        uuid created_by FK "→ project_users.id"
        jsonb data
    }
```

### Пример данных

#### Проект 1: Магазин

```json
{
  "id": "user-123",
  "project_id": "project-shop",
  "email": "john@example.com",
  "password_hash": "$2b$10$...",
  "oauth_providers": {
    "google": {
      "id": "google-123",
      "email": "john@example.com"
    }
  },
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://...",
    "phone": "+1234567890",
    "address": "123 Main St"
  },
  "status": "active"
}
```

#### Проект 2: Блог (тот же email, другой профиль)

```json
{
  "id": "user-456",
  "project_id": "project-blog",
  "email": "john@example.com",
  "password_hash": "$2b$10$...", // ДРУГОЙ пароль!
  "oauth_providers": {
    "github": {
      "id": "github-456",
      "email": "john@example.com"
    }
  },
  "profile": {
    "firstName": "Johnny",
    "lastName": "Smith",
    "avatar": "https://...",
    "bio": "Blogger and writer",
    "website": "https://johnny.blog"
  },
  "status": "active"
}
```

## 🔐 JWT токен структура

```mermaid
graph LR
    subgraph "JWT Payload"
        P1[projectUserId<br/>user-123]
        P2[projectId<br/>project-shop]
        P3[email<br/>john@example.com]
        P4[iat<br/>timestamp]
        P5[exp<br/>timestamp]
    end

    subgraph "Подпись"
        S1[JWT_SECRET]
        S2[HMAC SHA256]
    end

    P1 --> S1
    P2 --> S1
    P3 --> S1
    S1 --> S2
    S2 --> Token[JWT Token]
```

## 🔄 Создание сущности с project_users.id

```mermaid
sequenceDiagram
    participant User
    participant App
    participant SDK
    participant API
    participant DB

    User->>App: Создание заказа
    App->>SDK: createInstance('orders', data)
    SDK->>SDK: Извлечение JWT токена
    SDK->>SDK: Декодирование токена
    SDK->>SDK: Получение projectUserId

    SDK->>API: POST /api/public/{projectId}/orders
    API->>DB: INSERT INTO entity_instance<br/>(created_by = projectUserId)
    DB-->>API: ✅ Экземпляр создан
    API-->>SDK: ✅ Данные
    SDK-->>App: ✅ Заказ создан
    App-->>User: ✅ Успех
```

## 📊 Сравнение подходов

### Старый подход (auth.users)

```mermaid
graph TB
    A[auth.users<br/>email: user@example.com<br/>password: pass123]
    A --> P1[Проект 1]
    A --> P2[Проект 2]
    A --> P3[Проект 3]

    Problem[❌ Один пароль для всех]
    A --> Problem
```

### Новый подход (project_users)

```mermaid
graph TB
    subgraph "Проект 1"
        PU1[project_users<br/>email: user@example.com<br/>password: pass1<br/>profile: {...}]
    end

    subgraph "Проект 2"
        PU2[project_users<br/>email: user@example.com<br/>password: pass2<br/>profile: {...}]
    end

    subgraph "Проект 3"
        PU3[project_users<br/>email: user@example.com<br/>password: pass3<br/>profile: {...}]
    end

    Benefit[✅ Разные пароли и профили]
    PU1 --> Benefit
    PU2 --> Benefit
    PU3 --> Benefit
```

## 🔄 OAuth авторизация

### Google OAuth в Проекте 1

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Google
    participant API
    participant DB

    User->>App: "Sign in with Google"
    App->>Google: OAuth запрос
    Google->>User: Авторизация
    User->>Google: ✅ Разрешение
    Google-->>App: OAuth токен + данные
    App->>API: POST /api/public/{projectId}/auth/oauth/google
    API->>DB: Проверка существования (email)

    alt Пользователь не существует
        API->>DB: INSERT project_users<br/>(oauth_providers: {google: {...}})
    else Пользователь существует
        API->>DB: UPDATE oauth_providers<br/>(добавить Google)
    end

    DB-->>API: ✅ Пользователь
    API->>API: Генерация JWT
    API-->>App: ✅ Токен
    App-->>User: ✅ Авторизован
```

### GitHub OAuth в Проекте 2 (тот же email)

```mermaid
sequenceDiagram
    participant User
    participant App
    participant GitHub
    participant API
    participant DB

    Note over User,DB: Тот же email, но другой проект!

    User->>App: "Sign in with GitHub"
    App->>GitHub: OAuth запрос
    GitHub->>User: Авторизация
    User->>GitHub: ✅ Разрешение
    GitHub-->>App: OAuth токен + данные
    App->>API: POST /api/public/{projectId2}/auth/oauth/github
    API->>DB: Проверка существования (project_id2, email)

    alt Пользователь не существует
        API->>DB: INSERT project_users<br/>(oauth_providers: {github: {...}})
    else Пользователь существует
        API->>DB: UPDATE oauth_providers<br/>(добавить GitHub)
    end

    DB-->>API: ✅ Пользователь (НОВАЯ запись для проекта 2)
    API->>API: Генерация JWT
    API-->>App: ✅ Токен
    App-->>User: ✅ Авторизован
```

## 🔐 Безопасность

### Хеширование паролей

```mermaid
graph LR
    Password[Пароль пользователя] --> BCrypt[bcrypt.hash<br/>salt rounds: 10]
    BCrypt --> Hash[password_hash<br/>$2b$10$...]
    Hash --> DB[(project_users)]

    Login[Вход] --> Compare[bcrypt.compare<br/>password, hash]
    Compare --> DB
    DB --> Result{Пароль верный?}
    Result -->|Да| Success[✅ Авторизация]
    Result -->|Нет| Error[❌ Ошибка]
```

### JWT токены

```mermaid
graph TB
    subgraph "Генерация"
        Payload[JWT Payload<br/>projectUserId, projectId, email]
        Secret[JWT_SECRET<br/>отдельный для приложений]
        Payload --> Sign[Подпись HMAC SHA256]
        Secret --> Sign
        Sign --> Token[JWT Token]
    end

    subgraph "Верификация"
        Request[HTTP Request<br/>Authorization: Bearer token]
        Request --> Verify[Проверка подписи]
        Verify --> Decode[Декодирование]
        Decode --> Check[Проверка projectId<br/>и статуса пользователя]
        Check --> Auth[✅ Авторизован]
    end
```

## 📋 Миграция данных

### Сценарий миграции

```mermaid
graph TB
    subgraph "До миграции"
        AU[auth.users<br/>user@example.com]
        EI1[entity_instance<br/>created_by → auth.users.id]
        EI2[entity_instance<br/>created_by → auth.users.id]
        AU --> EI1
        AU --> EI2
    end

    subgraph "Миграция"
        M1[Создание project_users<br/>для каждого проекта]
        M2[Обновление created_by<br/>→ project_users.id]
        M3[Обновление RLS политик]
    end

    subgraph "После миграции"
        PU1[project_users<br/>Проект 1]
        PU2[project_users<br/>Проект 2]
        EI3[entity_instance<br/>created_by → project_users.id]
        PU1 --> EI3
        PU2 --> EI3
    end

    AU --> M1
    EI1 --> M2
    EI2 --> M2
    M1 --> PU1
    M1 --> PU2
    M2 --> EI3
    M2 --> M3
```

---

**Дата создания:** 2025-01-30  
**Версия:** 1.0
