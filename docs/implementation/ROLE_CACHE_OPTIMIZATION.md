# Оптимизация кэширования роли пользователя

**Дата:** 2025-01-XX  
**Цель:** Снизить количество RPC-запросов к БД для получения роли пользователя

## Проблема

На каждом запросе middleware вызывал `getUserRole(userId)`, который делал RPC-запрос к БД через функцию `get_user_role`. При высокой нагрузке это создавало избыточную нагрузку на базу данных.

## Решение

Реализовано кэширование роли пользователя в httpOnly cookie на 5 минут.

### Архитектура

```
Запрос → Middleware
         ↓
    Проверка cookie (x-user-role-cache)
         ↓
    Кэш валиден?
         ├─ ДА → Использовать роль из кэша (без RPC-запроса) ✅
         └─ НЕТ → RPC-запрос к БД → Сохранить в кэш → Вернуть роль
```

### Компоненты

1. **`lib/auth/role-cache.ts`** - утилиты для работы с кэшем

   - `getCachedRole()` - чтение из cookie
   - `setCachedRole()` - запись в cookie
   - `clearCachedRole()` - очистка кэша

2. **`lib/auth/roles.ts`** - обновленная функция

   - `getUserRoleWithCache()` - получение роли с кэшированием (для middleware)
   - `getUserRole()` - получение роли без кэша (для других случаев)

3. **`middleware.ts`** - использует `getUserRoleWithCache()` вместо `getUserRole()`

### Параметры кэша

- **TTL:** 5 минут (300 секунд)
- **Cookie name:** `x-user-role-cache`
- **Формат:** JSON `{role: UserRole, userId: string, expiresAt: number}`
- **Безопасность:**
  - `httpOnly: true` - недоступна из JavaScript
  - `secure: true` - только HTTPS в production
  - `sameSite: 'lax'` - защита от CSRF
  - Валидация `userId` - защита от подмены

### Логирование

Все операции кэширования логируются:

- `[RoleCache] Cache HIT` - кэш найден и валиден
- `[RoleCache] Cache MISS` - кэш отсутствует/истек, делаем RPC-запрос
- `[RoleCache] Cache SET` - роль сохранена в кэш
- `[RoleCache] Cache CLEARED` - кэш очищен

## Ожидаемые результаты

- **Снижение RPC-запросов:** 80-90% (кэш на 5 минут)
- **Улучшение производительности:** 10-50 мс на запрос (зависит от задержки БД)
- **Снижение нагрузки на БД:** значительное при высокой нагрузке
- **Multi-instance совместимость:** работает на нескольких серверах Next.js

## Очистка кэша

Кэш автоматически очищается:

- При logout (`/api/auth/logout`)
- При истечении TTL (5 минут)
- При несовпадении `userId` (защита от подмены)

## Принудительная инвалидация кэша (будущее улучшение)

Для случаев, когда роль изменяется в БД и нужно немедленно обновить кэш, можно реализовать один из вариантов:

### Вариант 1: Версионный токен

1. Добавить поле `role_version` в таблицу `admins` (или использовать `updated_at`)
2. При изменении роли инкрементировать версию
3. В кэше хранить версию роли
4. При проверке кэша сравнивать версию с БД

**Реализация:**

```sql
-- Добавить поле в таблицу admins
ALTER TABLE public.admins
ADD COLUMN IF NOT EXISTS role_version INTEGER DEFAULT 1;

-- Триггер для автоматического инкремента версии
CREATE OR REPLACE FUNCTION increment_role_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role_id != NEW.role_id THEN
    NEW.role_version = OLD.role_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admins_role_version_trigger
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION increment_role_version();
```

```typescript
// В lib/auth/role-cache.ts
interface RoleCacheData {
  role: UserRole;
  userId: string;
  roleVersion: number; // Добавить версию
  expiresAt: number;
}

// В getUserRoleWithCache() проверять версию
const cachedRole = getCachedRole(request, userId);
if (cachedRole) {
  // Проверить версию в БД
  const currentVersion = await getRoleVersion(userId);
  if (cachedRole.roleVersion === currentVersion) {
    return cachedRole.role; // Версия совпадает - используем кэш
  }
  // Версия не совпадает - кэш устарел, делаем RPC-запрос
}
```

### Вариант 2: API endpoint для инвалидации

Создать API endpoint, который при изменении роли устанавливает флаг инвалидации:

```typescript
// app/api/auth/invalidate-role-cache/route.ts
export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  // Установить cookie с истекшим TTL
  const response = NextResponse.json({ success: true });
  response.cookies.set(ROLE_CACHE_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
```

Вызывать этот endpoint при изменении роли в админ-панели.

### Вариант 3: Timestamp последнего изменения

Использовать `updated_at` из таблицы `admins`:

```typescript
// В кэше хранить timestamp последнего изменения
interface RoleCacheData {
  role: UserRole;
  userId: string;
  roleUpdatedAt: number; // Timestamp из БД
  expiresAt: number;
}

// При проверке кэша сравнивать с updated_at из БД
```

## Рекомендации

1. **Мониторинг:** Отслеживать количество Cache HIT/MISS в логах
2. **TTL:** При необходимости можно изменить TTL (сейчас 5 минут)
3. **Инвалидация:** При добавлении функционала изменения ролей через UI - реализовать принудительную инвалидацию

## Файлы изменений

- ✅ `lib/auth/role-cache.ts` - новый файл
- ✅ `lib/auth/roles.ts` - добавлена функция `getUserRoleWithCache()`
- ✅ `middleware.ts` - использует кэширование
- ✅ `app/api/auth/logout/route.ts` - очистка кэша при logout
