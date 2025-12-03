# Концепция доступа SuperAdmin к проектам

## 🎯 Основная идея

**SuperAdmin НЕ должен быть в таблице `project_admins`**

### Причины:

1. ✅ **Автоматический доступ** - SuperAdmin имеет доступ ко всем проектам через роль `superAdmin`
2. ✅ **Чистота данных** - Не нужно дублировать superAdmin в каждом проекте
3. ✅ **Удобство UI** - В списках админов проекта не будет лишних записей
4. ✅ **Простота логики** - Проверяем сначала `isSuperAdmin()`, потом `project_admins`

---

## 🔄 Логика проверки доступа

### Проверка доступа к проекту

```typescript
async function canAccessProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  // ШАГ 1: Проверяем superAdmin (приоритет)
  if (await isSuperAdmin(userId)) {
    return true; // SuperAdmin имеет доступ ко всем проектам
  }

  // ШАГ 2: Проверяем project_admins (только если не superAdmin)
  const { data } = await supabase
    .from("project_admins")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return !!data;
}
```

### Получение списка доступных проектов

```typescript
async function getAccessibleProjects(userId: string): Promise<Project[]> {
  // ШАГ 1: Если superAdmin - возвращаем все проекты
  if (await isSuperAdmin(userId)) {
    const { data } = await supabase.from("projects").select("*").order("name");
    return data || [];
  }

  // ШАГ 2: Если не superAdmin - только проекты из project_admins
  const { data } = await supabase
    .from("project_admins")
    .select("project_id, projects(*)")
    .eq("user_id", userId);

  return data?.map((item) => item.projects) || [];
}
```

### Получение роли пользователя в проекте

```typescript
async function getUserProjectRole(
  projectId: string,
  userId: string
): Promise<"superAdmin" | "projectSuperAdmin" | "projectAdmin" | null> {
  // ШАГ 1: Проверяем superAdmin (приоритет)
  if (await isSuperAdmin(userId)) {
    return "superAdmin";
  }

  // ШАГ 2: Проверяем project_admins
  const { data } = await supabase
    .from("project_admins")
    .select("project_admin_roles(name)")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  const roleName = data.project_admin_roles?.name;
  if (roleName === "projectSuperAdmin") return "projectSuperAdmin";
  if (roleName === "projectAdmin") return "projectAdmin";

  return null;
}
```

---

## 📋 Получение списка админов проекта

### Важно: SuperAdmin НЕ показывается в списке

```typescript
async function getProjectAdmins(projectId: string): Promise<ProjectAdmin[]> {
  // Получаем только админов из project_admins
  // SuperAdmin НЕ включается в список!
  const { data } = await supabase
    .from("project_admins")
    .select(
      `
      id,
      user_id,
      project_id,
      created_at,
      project_admin_roles(name, description),
      profiles:user_id(email, first_name, last_name, avatar_url)
    `
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return data || [];
}
```

**Результат:**

- ✅ Показываются только `projectSuperAdmin` и `projectAdmin`
- ❌ SuperAdmin НЕ показывается (имеет доступ автоматически)

---

## 🔐 RLS политики для project_admins

### SELECT Policy

```sql
CREATE POLICY "View project admins"
  ON project_admins
  FOR SELECT
  USING (
    -- SuperAdmin видит всех админов всех проектов
    public.is_super_admin(auth.uid())
    OR
    -- ProjectSuperAdmin видит админов только своего проекта
    EXISTS (
      SELECT 1 FROM project_admins pa
      JOIN project_admin_roles par ON pa.role_id = par.id
      WHERE pa.project_id = project_admins.project_id
        AND pa.user_id = auth.uid()
        AND par.name = 'projectSuperAdmin'
    )
  );
```

**Важно:** SuperAdmin может видеть всех, но сам НЕ в таблице!

---

## 🔄 Флоу работы

### Флоу 1: SuperAdmin открывает проект

```
1. SuperAdmin открывает проект
   ↓
2. Проверка доступа:
   ├─ isSuperAdmin() → ✅ доступ (автоматически)
   └─ НЕ проверяем project_admins
   ↓
3. SuperAdmin видит все данные проекта
```

### Флоу 2: SuperAdmin открывает страницу админов проекта

```
1. SuperAdmin открывает /projects/[projectId]/admins
   ↓
2. Запрос списка админов:
   ├─ SELECT * FROM project_admins WHERE project_id = ?
   └─ SuperAdmin НЕ в списке (не в таблице)
   ↓
3. Показываются только projectSuperAdmin и projectAdmin
```

### Флоу 3: SuperAdmin создает projectSuperAdmin

```
1. SuperAdmin добавляет админа проекта
   ↓
2. Проверка: isSuperAdmin() → ✅ может управлять
   ↓
3. Создание записи в project_admins:
   - project_id
   - user_id
   - role_id (projectSuperAdmin)
   ↓
4. Пользователь появляется в списке админов проекта
```

---

## ✅ Преимущества подхода

1. ✅ **Чистота данных** - Нет дублирования superAdmin в каждом проекте
2. ✅ **Простота логики** - Сначала проверяем superAdmin, потом project_admins
3. ✅ **Удобство UI** - В списках только реальные админы проекта
4. ✅ **Гибкость** - SuperAdmin может управлять проектами без явного добавления

---

## 📊 Сравнение подходов

| Подход                        | SuperAdmin в project_admins? | Преимущества                    | Недостатки                       |
| ----------------------------- | ---------------------------- | ------------------------------- | -------------------------------- |
| **Подход 1: НЕ добавлять** ✅ | Нет                          | Чистота данных, простота логики | Нужна проверка isSuperAdmin()    |
| Подход 2: Добавлять           | Да                           | Единая логика проверки          | Дублирование, лишние записи в UI |

**Рекомендация:** Подход 1 (НЕ добавлять) ✅

---

## 🔧 Реализация

### Функция проверки доступа к проекту

```typescript
// packages/auth-sdk/src/server/project-access-service.ts
export async function canAccessProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  // Приоритет 1: SuperAdmin имеет доступ ко всем проектам
  if (await isSuperAdmin(supabase, userId)) {
    return true;
  }

  // Приоритет 2: Проверяем project_admins
  const { data } = await supabase
    .from("project_admins")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return !!data;
}
```

### Функция получения доступных проектов

```typescript
export async function getAccessibleProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  // Если superAdmin - все проекты
  if (await isSuperAdmin(supabase, userId)) {
    const { data } = await supabase.from("projects").select("id");
    return data?.map((p) => p.id) || [];
  }

  // Если не superAdmin - только из project_admins
  const { data } = await supabase
    .from("project_admins")
    .select("project_id")
    .eq("user_id", userId);

  return data?.map((pa) => pa.project_id) || [];
}
```

---

**Дата создания:** 2025-01-30  
**Статус:** Утверждено
