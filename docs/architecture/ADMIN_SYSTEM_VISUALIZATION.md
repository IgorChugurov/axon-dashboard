# Визуализация новой архитектуры системы администраторов

## 📊 Текущая архитектура vs Новая архитектура

### Текущая архитектура (проблемы)

```mermaid
graph TB
    subgraph "Текущая система"
        AuthUsers[(auth.users)]
        Admins[(admins<br/>Глобальные)]
        AdminRoles[(admin_roles<br/>admin, superAdmin)]

        AuthUsers -->|user_id| Admins
        Admins -->|role_id| AdminRoles

        Problem1[❌ admin не видит список админов]
        Problem2[❌ Админы не привязаны к проектам]
        Problem3[❌ Нет разделения пользователей админки и приложений]
    end
```

### Новая архитектура (решение)

```mermaid
graph TB
    subgraph "Новая система"
        AuthUsers[(auth.users<br/>Все пользователи)]

        subgraph "Админ-панель"
            GlobalAdmins[(admins<br/>superAdmin)]
            ProjectAdmins[(project_admins<br/>projectSuperAdmin, projectAdmin)]
            ProjectAdminRoles[(project_admin_roles)]
        end

        subgraph "Приложения проектов"
            ProjectUsers[(project_users<br/>Пользователи приложений)]
        end

        Projects[(projects)]

        AuthUsers -->|superAdmin| GlobalAdmins
        AuthUsers -->|projectSuperAdmin<br/>projectAdmin| ProjectAdmins
        AuthUsers -->|app_user| ProjectUsers

        Projects -->|project_id| ProjectAdmins
        Projects -->|project_id| ProjectUsers
        ProjectAdmins -->|role_id| ProjectAdminRoles
    end
```

## 🔄 Поток авторизации

### В админ-панели

```mermaid
sequenceDiagram
    participant User
    participant Middleware
    participant AuthSDK
    participant RoleService
    participant DB as Database

    User->>Middleware: Запрос админ-панели
    Middleware->>AuthSDK: Проверка авторизации
    AuthSDK->>DB: Получение сессии
    DB-->>AuthSDK: Сессия

    Middleware->>RoleService: Проверка роли
    RoleService->>DB: Проверка admins или project_admins

    alt superAdmin
        DB-->>RoleService: superAdmin
        RoleService-->>Middleware: Доступ ко всем проектам
    else projectSuperAdmin
        DB-->>RoleService: projectSuperAdmin + project_id
        RoleService-->>Middleware: Доступ к своему проекту
    else projectAdmin
        DB-->>RoleService: projectAdmin + project_id
        RoleService-->>Middleware: Ограниченный доступ
    else user
        DB-->>RoleService: user
        RoleService-->>Middleware: Редирект на /welcome
    end
```

### В приложении проекта

```mermaid
sequenceDiagram
    participant AppUser
    participant AppAuth
    participant PublicAPI
    participant DB as Database

    AppUser->>AppAuth: Регистрация/Логин
    AppAuth->>PublicAPI: Создание пользователя
    PublicAPI->>DB: INSERT INTO auth.users
    DB-->>PublicAPI: user_id

    PublicAPI->>DB: INSERT INTO project_users<br/>(project_id, user_id)
    DB-->>PublicAPI: ✅ Пользователь создан

    PublicAPI-->>AppAuth: Токен доступа
    AppAuth-->>AppUser: Авторизован
```

## 🏗️ Структура базы данных

```mermaid
erDiagram
    auth_users ||--o{ admins : "can_be"
    auth_users ||--o{ project_admins : "can_be"
    auth_users ||--o{ project_users : "can_be"

    projects ||--o{ project_admins : "has"
    projects ||--o{ project_users : "has"
    projects ||--o{ entity_definition : "has"

    admin_roles ||--o{ admins : "defines"
    project_admin_roles ||--o{ project_admins : "defines"

    auth_users {
        uuid id PK
        string email
        timestamp created_at
    }

    projects {
        uuid id PK
        string name
        boolean enable_sign_in
        boolean enable_sign_up
    }

    admins {
        uuid id PK
        uuid user_id FK
        uuid role_id FK "superAdmin"
        timestamp created_at
    }

    project_admins {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        uuid role_id FK "projectSuperAdmin | projectAdmin"
        timestamp created_at
        UNIQUE project_id_user_id
    }

    project_users {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string status "active | inactive | banned"
        jsonb metadata
        timestamp created_at
        UNIQUE project_id_user_id
    }

    admin_roles {
        uuid id PK
        string name "superAdmin"
    }

    project_admin_roles {
        uuid id PK
        string name "projectSuperAdmin | projectAdmin"
    }
```

## 🛡️ Права доступа по ролям

```mermaid
graph TB
    subgraph "superAdmin"
        SA1[✅ Все проекты]
        SA2[✅ Управление всеми админами]
        SA3[✅ Удаление любого, включая себя]
        SA4[✅ Полный доступ к данным]
    end

    subgraph "projectSuperAdmin"
        PSA1[✅ Только свой проект]
        PSA2[✅ Управление админами проекта]
        PSA3[❌ Не может удалить себя]
        PSA4[✅ Полный доступ к данным проекта]
        PSA5[✅ Управление структурой данных]
    end

    subgraph "projectAdmin"
        PA1[✅ Только свой проект]
        PA2[❌ Не может управлять админами]
        PA3[✅ Управление универсальными сущностями]
        PA4[❌ Не может управлять структурой]
    end

    subgraph "project_user"
        PU1[✅ Доступ к приложению проекта]
        PU2[✅ CRUD операции по разрешениям]
        PU3[❌ Нет доступа к админ-панели]
    end
```

## 🔐 RLS политики (новые)

### project_admins

```mermaid
graph LR
    subgraph "SELECT Policy"
        S1[superAdmin → видит всех]
        S2[projectSuperAdmin → видит только свой проект]
        S3[projectAdmin → видит только свой проект]
    end

    subgraph "INSERT Policy"
        I1[superAdmin → может создать в любом проекте]
        I2[projectSuperAdmin → может создать только в своем]
        I3[projectAdmin → ❌ не может]
    end

    subgraph "UPDATE Policy"
        U1[superAdmin → может изменить любого]
        U2[projectSuperAdmin → может изменить только в своем]
        U3[projectAdmin → ❌ не может]
    end

    subgraph "DELETE Policy"
        D1[superAdmin → может удалить любого, включая себя]
        D2[projectSuperAdmin → может удалить только в своем, но не себя]
        D3[projectAdmin → ❌ не может]
    end
```

### project_users

```mermaid
graph LR
    subgraph "SELECT Policy"
        S1[Пользователь → видит только свою запись]
        S2[Админы проекта → видят всех пользователей проекта]
        S3[superAdmin → видит всех]
    end

    subgraph "INSERT Policy"
        I1[Public API → может создать при регистрации]
        I2[Админы проекта → могут создавать]
    end

    subgraph "UPDATE Policy"
        U1[Пользователь → может изменить только свою запись]
        U2[Админы проекта → могут изменять пользователей проекта]
    end
```

## 📱 Примеры использования

### Пример 1: SuperAdmin создает projectSuperAdmin

```mermaid
sequenceDiagram
    participant SA as superAdmin
    participant UI
    participant API
    participant DB

    SA->>UI: Создание админа проекта
    UI->>API: POST /api/projects/{id}/admins
    API->>DB: Проверка: is_super_admin()
    DB-->>API: ✅ Разрешение

    API->>DB: INSERT INTO project_admins<br/>(project_id, user_id, role_id='projectSuperAdmin')
    DB-->>API: ✅ Админ создан
    API-->>UI: Успех
    UI-->>SA: Админ добавлен
```

### Пример 2: ProjectSuperAdmin создает projectAdmin

```mermaid
sequenceDiagram
    participant PSA as projectSuperAdmin
    participant UI
    participant API
    participant DB

    PSA->>UI: Создание админа проекта
    UI->>API: POST /api/projects/{id}/admins
    API->>DB: Проверка: is_project_super_admin(project_id)
    DB-->>API: ✅ Разрешение (только для своего проекта)

    API->>DB: INSERT INTO project_admins<br/>(project_id, user_id, role_id='projectAdmin')
    DB-->>API: ✅ Админ создан
    API-->>UI: Успех
    UI-->>PSA: Админ добавлен
```

### Пример 3: Пользователь регистрируется в приложении проекта

#### Сценарий 3.1: Новый пользователь

```mermaid
sequenceDiagram
    participant User
    participant App
    participant PublicAPI
    participant Auth as Supabase Auth
    participant DB

    User->>App: Регистрация (email, password)
    App->>PublicAPI: POST /api/public/{project_id}/auth/signup
    PublicAPI->>Auth: supabase.auth.signUp()
    Auth-->>PublicAPI: ✅ user_id (новый пользователь)

    PublicAPI->>DB: INSERT INTO project_users<br/>(project_id, user_id, status='active')
    DB-->>PublicAPI: ✅ Пользователь создан

    PublicAPI-->>App: Токен доступа + "Welcome!"
    App-->>User: ✅ Авторизован
```

#### Сценарий 3.2: Пользователь уже существует (тот же email в другом проекте)

```mermaid
sequenceDiagram
    participant User
    participant App as Приложение 2
    participant PublicAPI
    participant Auth as Supabase Auth
    participant DB

    Note over User,DB: Пользователь уже зарегистрирован в Приложении 1

    User->>App: Регистрация (email, password)
    App->>PublicAPI: POST /api/public/{project_id_2}/auth/signup
    PublicAPI->>Auth: supabase.auth.signUp()
    Auth-->>PublicAPI: ❌ Ошибка: user_already_exists

    PublicAPI->>Auth: supabase.auth.signInWithPassword()

    alt Пароль верный
        Auth-->>PublicAPI: ✅ Сессия создана
        PublicAPI->>DB: Проверка project_users<br/>WHERE project_id=2 AND user_id=...

        alt Нет в project_users проекта 2
            PublicAPI->>DB: INSERT INTO project_users<br/>(project_id=2, user_id=...)
            DB-->>PublicAPI: ✅ Добавлен в проект 2
            PublicAPI-->>App: Токен + "Added to project"
            App-->>User: ✅ Авторизован в проекте 2
        else Уже в project_users проекта 2
            DB-->>PublicAPI: ✅ Уже существует
            PublicAPI-->>App: Токен
            App-->>User: ✅ Авторизован
        end
    else Пароль неверный
        Auth-->>PublicAPI: ❌ Invalid password
        PublicAPI-->>App: Ошибка "Please sign in instead"
        App-->>User: ❌ Предложение войти
    end
```

#### Сценарий 3.3: Визуализация состояния БД

```mermaid
graph TB
    subgraph "После регистрации в Приложении 1"
        A1[auth.users<br/>id: user-123<br/>email: user@example.com]
        P1[project_users<br/>project_id: project-1<br/>user_id: user-123]
        A1 -->|user_id| P1
    end

    subgraph "После регистрации в Приложении 2"
        A2[auth.users<br/>id: user-123<br/>email: user@example.com<br/>ТОТ ЖЕ ПОЛЬЗОВАТЕЛЬ]
        P2[project_users<br/>project_id: project-2<br/>user_id: user-123<br/>НОВАЯ ЗАПИСЬ]
        A2 -->|user_id| P2
    end

    A1 -.->|Тот же user_id| A2

    Result[Результат:<br/>Один пользователь в двух проектах]
    P1 --> Result
    P2 --> Result
```

## 🔄 Миграция существующих данных

```mermaid
graph TB
    subgraph "Этап 1: Анализ"
        A1[Определить текущих admin]
        A2[Определить, кто должен стать projectSuperAdmin]
        A3[Определить, кто должен стать projectAdmin]
    end

    subgraph "Этап 2: Миграция"
        M1[Создать project_admin_roles]
        M2[Создать project_admins]
        M3[Перенести данные из admins в project_admins]
        M4[Оставить только superAdmin в admins]
    end

    subgraph "Этап 3: Обновление кода"
        C1[Обновить role-service.ts]
        C2[Обновить middleware]
        C3[Обновить UI]
        C4[Создать API для project_users]
    end

    A1 --> M1
    A2 --> M2
    A3 --> M3
    M1 --> C1
    M2 --> C2
    M3 --> C3
    M4 --> C4
```

---

**Дата создания:** 2025-01-30  
**Версия:** 1.0
