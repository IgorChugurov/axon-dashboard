# Архитектура системы администраторов админпанели

## 📊 Визуализация архитектуры

```mermaid
graph TB
    subgraph "Клиент (Browser)"
        User[👤 Пользователь]
        LoginPage[🔐 Страница Login]
        WelcomePage[👋 Страница Welcome]
        Dashboard[📊 Dashboard]
    end

    subgraph "Next.js Application"
        Middleware[🛡️ Middleware<br/>middleware.ts]
        AuthSDK[🔑 Auth SDK<br/>packages/auth-sdk]
        RoleService[👥 Role Service<br/>role-service.ts]
        RoleCache[💾 Role Cache<br/>role-cache.ts]
        AdminService[⚙️ Admin Service<br/>lib/admins/client-service.ts]
    end

    subgraph "Supabase Database"
        AuthUsers[(auth.users<br/>👤 Пользователи)]
        Profiles[(profiles<br/>📋 Профили)]
        AdminRoles[(admin_roles<br/>🎭 Роли)]
        Admins[(admins<br/>👑 Администраторы)]
    end

    subgraph "RLS Policies"
        RLSAdmins[🔒 RLS для admins<br/>Только superAdmin]
    end

    subgraph "Database Functions"
        GetUserRole[📞 get_user_role<br/>user_uuid → role]
        IsSuperAdmin[📞 is_super_admin<br/>user_uuid → boolean]
        IsAdmin[📞 is_admin<br/>user_uuid → boolean]
    end

    %% User Flow
    User -->|1. Запрос страницы| Middleware
    Middleware -->|2. Проверка авторизации| AuthSDK
    AuthSDK -->|3. Получение сессии| AuthUsers

    Middleware -->|4. Проверка роли| RoleService
    RoleService -->|5. Проверка кэша| RoleCache
    RoleCache -->|6. Кэш MISS| GetUserRole
    GetUserRole -->|7. JOIN запрос| Admins
    Admins -->|8. JOIN| AdminRoles
    GetUserRole -->|9. Возврат роли| RoleService
    RoleService -->|10. Сохранение в кэш| RoleCache

    %% Role-based routing
    RoleService -->|11. Роль: user| WelcomePage
    RoleService -->|12. Роль: admin/superAdmin| Dashboard

    %% Admin Management
    Dashboard -->|13. Управление админами| AdminService
    AdminService -->|14. Проверка прав| IsSuperAdmin
    IsSuperAdmin -->|15. Проверка RLS| RLSAdmins
    RLSAdmins -->|16. Разрешение| Admins
    AdminService -->|17. CRUD операции| Admins

    %% Data Relationships
    AuthUsers -->|user_id| Profiles
    AuthUsers -->|user_id| Admins
    Admins -->|role_id| AdminRoles

    %% Styling
    classDef userClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef adminClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef superAdminClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef dbClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef securityClass fill:#ffebee,stroke:#b71c1c,stroke-width:2px

    class User,LoginPage,WelcomePage userClass
    class Dashboard,AdminService adminClass
    class RLSAdmins,IsSuperAdmin superAdminClass
    class AuthUsers,Profiles,AdminRoles,Admins,GetUserRole,IsAdmin dbClass
    class Middleware,AuthSDK,RoleService securityClass
```

## 🏗️ Структура базы данных

```mermaid
erDiagram
    auth_users ||--o{ profiles : "has"
    auth_users ||--o| admins : "can_be"
    admin_roles ||--o{ admins : "defines"

    auth_users {
        uuid id PK
        string email
        timestamp created_at
    }

    profiles {
        uuid id PK
        uuid user_id FK
        string email
        string first_name
        string last_name
        string avatar_url
    }

    admin_roles {
        uuid id PK
        string name UK "admin | superAdmin"
        string description
        timestamp created_at
    }

    admins {
        uuid id PK
        uuid user_id FK "UNIQUE"
        uuid role_id FK
        timestamp created_at
        timestamp updated_at
    }
```

## 🔄 Поток проверки роли

```mermaid
sequenceDiagram
    participant User
    participant Middleware
    participant RoleCache
    participant RoleService
    participant DB as Database
    participant Dashboard

    User->>Middleware: Запрос страницы
    Middleware->>Middleware: Проверка авторизации
    Middleware->>RoleCache: Проверка кэша роли

    alt Кэш валиден
        RoleCache-->>Middleware: Роль из кэша
    else Кэш отсутствует/истек
        Middleware->>RoleService: getUserRoleWithCache()
        RoleService->>DB: RPC: get_user_role(user_id)
        DB->>DB: JOIN admins + admin_roles
        DB-->>RoleService: Роль (user/admin/superAdmin)
        RoleService->>RoleCache: Сохранение в кэш (5 мин)
        RoleCache-->>Middleware: Роль
    end

    alt Роль = "user"
        Middleware->>User: Редирект на /welcome
    else Роль = "admin" или "superAdmin"
        Middleware->>Dashboard: Доступ разрешен
    end
```

## 🛡️ Уровни защиты

```mermaid
graph LR
    subgraph "Уровень 1: База данных (RLS)"
        RLS[RLS Policies<br/>PostgreSQL]
        RLS -->|Защита| AdminsTable[(admins)]
    end

    subgraph "Уровень 2: Middleware"
        MW[Middleware<br/>Проверка роли]
        MW -->|Редирект| UserPages[user → /welcome]
        MW -->|Доступ| AdminPages[admin/superAdmin → Dashboard]
    end

    subgraph "Уровень 3: API/Service"
        API[Admin Service<br/>Проверка прав]
        API -->|Только superAdmin| AdminCRUD[CRUD админов]
    end

    subgraph "Уровень 4: UI"
        UI[Условный рендеринг]
        UI -->|Скрытие| AdminUI[Админские функции]
    end

    RLS --> MW
    MW --> API
    API --> UI
```

## 👥 Роли и права доступа

```mermaid
graph TD
    subgraph "Роли"
        User[👤 user<br/>Обычный пользователь]
        Admin[👨‍💼 admin<br/>Администратор]
        SuperAdmin[👑 superAdmin<br/>Суперадминистратор]
    end

    subgraph "Права доступа"
        User -->|Только| PublicPages[Публичные страницы<br/>/welcome]
        Admin -->|Полный доступ| Dashboard[Дашборд<br/>Все данные]
        SuperAdmin -->|Полный доступ| Dashboard
        SuperAdmin -->|Управление| AdminManagement[Управление админами<br/>CRUD операции]
    end

    subgraph "Ограничения"
        Admin -.->|Не может| ManageAdmins[Управлять админами]
        Admin -.->|Не может| DeleteSuperAdmin[Удалить superAdmin]
        SuperAdmin -.->|Не может| DeleteSelf[Удалить себя]
    end
```

## 📋 Детальная схема работы RLS

```mermaid
graph TB
    subgraph "RLS Policies для таблицы admins"
        SelectPolicy[SELECT Policy<br/>Только superAdmin видит всех]
        InsertPolicy[INSERT Policy<br/>Только superAdmin добавляет]
        UpdatePolicy[UPDATE Policy<br/>Только superAdmin обновляет<br/>Нельзя изменить superAdmin]
        DeletePolicy[DELETE Policy<br/>Только superAdmin удаляет<br/>Нельзя удалить superAdmin]
        OwnPolicy[SELECT Policy<br/>Пользователь видит свою запись]
    end

    subgraph "Проверка через функции"
        IsSuperAdmin[is_super_admin<br/>user_uuid]
        IsAdmin[is_admin<br/>user_uuid]
        GetUserRole[get_user_role<br/>user_uuid]
    end

    subgraph "Результат"
        SelectPolicy -->|superAdmin| AllowSelect[✅ Разрешить SELECT]
        SelectPolicy -->|user| DenySelect[❌ Запретить SELECT]
        OwnPolicy -->|own record| AllowOwn[✅ Видеть свою запись]

        InsertPolicy -->|superAdmin| AllowInsert[✅ Разрешить INSERT]
        InsertPolicy -->|admin/user| DenyInsert[❌ Запретить INSERT]

        UpdatePolicy -->|superAdmin + не superAdmin| AllowUpdate[✅ Разрешить UPDATE]
        UpdatePolicy -->|superAdmin на superAdmin| DenyUpdate[❌ Запретить UPDATE]

        DeletePolicy -->|superAdmin + не superAdmin| AllowDelete[✅ Разрешить DELETE]
        DeletePolicy -->|superAdmin на superAdmin| DenyDelete[❌ Запретить DELETE]
    end

    IsSuperAdmin --> SelectPolicy
    IsSuperAdmin --> InsertPolicy
    IsSuperAdmin --> UpdatePolicy
    IsSuperAdmin --> DeletePolicy
```

## 🔐 Безопасность и кэширование

```mermaid
graph LR
    subgraph "Кэширование роли"
        Request[HTTP Request]
        Request --> CheckCache{Кэш валиден?}
        CheckCache -->|Да| ReturnCache[Возврат из кэша<br/>Без RPC запроса]
        CheckCache -->|Нет| RPC[RPC запрос<br/>get_user_role]
        RPC --> SaveCache[Сохранение в кэш<br/>5 минут TTL]
        SaveCache --> ReturnCache
    end

    subgraph "Безопасность кэша"
        Cookie[httpOnly: true]
        Secure[secure: true<br/>production only]
        SameSite[sameSite: 'lax']
        UserValidation[Валидация userId]
        TTL[TTL: 5 минут]
    end

    ReturnCache --> Cookie
    Cookie --> Secure
    Secure --> SameSite
    SameSite --> UserValidation
    UserValidation --> TTL
```

## 📝 Ключевые компоненты

### 1. **База данных**

- `auth.users` - пользователи Supabase Auth
- `profiles` - профили пользователей
- `admin_roles` - роли (admin, superAdmin)
- `admins` - связь пользователей с ролями

### 2. **Database Functions**

- `get_user_role(user_uuid)` - получение роли пользователя
- `is_super_admin(user_uuid)` - проверка суперадмина
- `is_admin(user_uuid)` - проверка админа

### 3. **RLS Policies**

- Только `superAdmin` может управлять админами
- Защита от удаления/изменения `superAdmin`
- Пользователь может видеть свою запись в `admins`

### 4. **Middleware**

- Проверка авторизации
- Проверка роли с кэшированием
- Редирект `user` → `/welcome`
- Доступ `admin`/`superAdmin` → Dashboard

### 5. **Role Service**

- `getUserRole()` - получение роли из БД
- `getUserRoleWithCache()` - получение с кэшированием
- `isAdmin()` - проверка админа
- `isSuperAdmin()` - проверка суперадмина
- `canManageAdmins()` - проверка прав управления

### 6. **Role Cache**

- Кэширование роли в httpOnly cookie
- TTL: 5 минут
- Валидация по userId
- Автоматическая очистка при logout

### 7. **Admin Service**

- `getAdminsFromClient()` - получение списка админов
- `createAdminFromClient()` - создание админа
- `deleteAdminFromClient()` - удаление админа
- Проверка прав через RLS

## 🚀 Поток создания админа

```mermaid
sequenceDiagram
    participant SuperAdmin
    participant UI
    participant AdminService
    participant RLS
    participant DB as Database
    participant Auth as Supabase Auth

    SuperAdmin->>UI: Заполнение формы<br/>Email + Role
    UI->>AdminService: Поиск пользователя по email
    AdminService->>Auth: Проверка существования
    Auth-->>AdminService: User ID или null

    alt Пользователь не существует
        AdminService->>Auth: Создание пользователя
        Auth-->>AdminService: User ID
    end

    AdminService->>RLS: Проверка прав (superAdmin)
    RLS->>DB: Проверка через is_super_admin()
    DB-->>RLS: ✅ Разрешение
    RLS-->>AdminService: ✅ Доступ разрешен

    AdminService->>DB: INSERT INTO admins<br/>(user_id, role_id)
    DB->>RLS: Проверка INSERT policy
    RLS->>DB: ✅ Разрешение (superAdmin)
    DB-->>AdminService: ✅ Админ создан
    AdminService-->>UI: Успех
    UI-->>SuperAdmin: Админ добавлен
```

## 📊 Статистика и мониторинг

- **Кэш попаданий**: Логирование HIT/MISS
- **RPC запросы**: Минимизация через кэш
- **RLS проверки**: Автоматические на уровне БД
- **Время ответа**: Оптимизация через кэширование

---

**Дата создания**: 2025-01-30  
**Версия**: 1.0
