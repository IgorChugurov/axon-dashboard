# План реализации системы админов проектов

## 📋 Этапы реализации

### Этап 1: База данных ✅

**Файл:** `supabase/migrations/20250130000002_create_project_admins.sql`

**Что создается:**

1. ✅ Таблица `project_admin_roles` (projectAdmin, projectSuperAdmin)
2. ✅ Таблица `project_admins` (связь project_id + user_id + role_id)
3. ✅ Функции проверки ролей:
   - `is_project_super_admin(project_id, user_id)`
   - `is_project_admin(project_id, user_id)`
   - `get_user_project_role(project_id, user_id)`
4. ✅ RLS политики для `project_admins`
5. ✅ Триггер для `updated_at`

**Выполнение:**

```bash
# Выполнить SQL миграцию в Supabase Dashboard → SQL Editor
# Или через CLI:
supabase db push
```

---

### Этап 2: Backend - Типы и сервисы

#### 2.1. Создать типы

**Файл:** `lib/project-admins/types.ts`

```typescript
export type ProjectAdminRoleName = "projectAdmin" | "projectSuperAdmin";

export interface ProjectAdminRole {
  id: string;
  name: ProjectAdminRoleName;
  description: string | null;
  createdAt: string;
}

export interface ProjectAdmin {
  id: string;
  projectId: string;
  userId: string;
  roleId: string;
  roleName: ProjectAdminRoleName;
  roleDescription: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // Данные пользователя
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface CreateProjectAdminData {
  projectId: string;
  userId: string;
  roleName: ProjectAdminRoleName;
}
```

#### 2.2. Обновить role-service.ts

**Файл:** `packages/auth-sdk/src/server/role-service.ts`

**Добавить функции:**

```typescript
// Проверка, является ли projectSuperAdmin для проекта
export async function isProjectSuperAdmin(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean>;

// Проверка, является ли админом проекта (любого типа)
export async function isProjectAdmin(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean>;

// Получение роли пользователя в проекте
export async function getUserProjectRole(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<UserRole | null>;

// Проверка доступа к проекту
export async function canAccessProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean>;

// Получение списка доступных проектов
export async function getAccessibleProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]>;
```

#### 2.3. Создать project-admin-service.ts

**Файл:** `packages/auth-sdk/src/server/project-admin-service.ts`

**Функции:**

```typescript
// Получение списка админов проекта
export async function getProjectAdmins(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectAdmin[]>;

// Создание админа проекта
export async function createProjectAdmin(
  supabase: SupabaseClient,
  data: CreateProjectAdminData,
  createdBy: string
): Promise<ProjectAdmin>;

// Удаление админа проекта
export async function deleteProjectAdmin(
  supabase: SupabaseClient,
  projectId: string,
  adminId: string,
  userId: string
): Promise<void>;

// Изменение роли админа проекта
export async function updateProjectAdminRole(
  supabase: SupabaseClient,
  projectId: string,
  adminId: string,
  newRoleName: ProjectAdminRoleName,
  userId: string
): Promise<ProjectAdmin>;
```

#### 2.4. Обновить middleware.ts

**Файл:** `packages/auth-sdk/src/server/middleware.ts`

**Добавить:**

- Проверку проектных ролей
- Определение доступных проектов
- Установку headers с информацией о проектных ролях

---

### Этап 3: API Endpoints

#### 3.1. Создать route.ts

**Файл:** `app/api/projects/[projectId]/admins/route.ts`

**Endpoints:**

- `GET` - список админов проекта
- `POST` - добавить админа проекта
- `DELETE` - удалить админа проекта
- `PATCH` - изменить роль админа

**Проверка прав в каждом endpoint:**

```typescript
// Только superAdmin или projectSuperAdmin могут управлять
if (
  !(
    (await isSuperAdmin(userId)) ||
    (await isProjectSuperAdmin(projectId, userId))
  )
) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

### Этап 4: Frontend - UI

#### 4.1. Создать страницу админов проекта

**Файл:** `app/projects/[projectId]/admins/page.tsx`

**Компоненты:**

- Список админов проекта
- Форма добавления админа
- Кнопки удаления/изменения роли

#### 4.2. Создать компоненты

**Файлы:**

- `components/project-admins/ProjectAdminsList.tsx`
- `components/project-admins/ProjectAdminForm.tsx`
- `components/project-admins/ProjectAdminRow.tsx`

#### 4.3. Обновить навигацию

**Файл:** `components/navigation/ProjectsNavigation.tsx`

**Изменения:**

- Показывать только доступные проекты
- Для superAdmin - все проекты
- Для projectSuperAdmin/projectAdmin - только из `project_admins`

---

## 🔄 Порядок выполнения

1. ✅ **Этап 1: База данных** - выполнить миграцию
2. ⏳ **Этап 2: Backend** - создать типы и сервисы
3. ⏳ **Этап 3: API** - создать endpoints
4. ⏳ **Этап 4: Frontend** - создать UI

---

## ✅ Чеклист

### База данных

- [x] Создать `project_admin_roles`
- [x] Создать `project_admins`
- [x] Создать функции проверки ролей
- [x] Создать RLS политики
- [x] Создать триггеры

### Backend

- [ ] Создать типы (`lib/project-admins/types.ts`)
- [ ] Обновить `role-service.ts`
- [ ] Создать `project-admin-service.ts`
- [ ] Обновить `middleware.ts`

### API

- [ ] Создать `/api/projects/[projectId]/admins/route.ts`
- [ ] Добавить проверку прав в каждый endpoint

### Frontend

- [ ] Создать страницу `/projects/[projectId]/admins/page.tsx`
- [ ] Создать компоненты для управления админами
- [ ] Обновить навигацию (показывать только доступные проекты)

---

**Дата создания:** 2025-01-30  
**Статус:** Готов к реализации
