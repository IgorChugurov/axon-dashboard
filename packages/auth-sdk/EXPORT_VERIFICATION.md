# Проверка экспортов SDK

## Используемые импорты в проекте

### 1. Server модуль (`@axon-dashboard/auth-sdk/server`)

#### Используется в проекте:

- `createAuthMiddleware` из `@/packages/auth-sdk/src/server/middleware`
- `getUserRole`, `isAdmin`, `isSuperAdmin`, `canManageAdmins` из `@/packages/auth-sdk/src/server/role-service`

#### Экспортируется через `src/server/index.ts`:

- ✅ `export * from "./middleware"` → `createAuthMiddleware` доступен
- ✅ `export * from "./role-service"` → все функции ролей доступны
- ✅ `export * from "../types"` → типы доступны

### 2. Client модуль (`@axon-dashboard/auth-sdk/client`)

#### Используется в проекте:

- `AuthProvider`, `useAuth`, `createClientAuthClient`, `createBrowserSupabaseClient` из `@/packages/auth-sdk/src/client`

#### Экспортируется через `src/client/index.ts`:

- ✅ `export * from "./auth-provider"` → `AuthProvider`, `useAuth` доступны
- ✅ `export * from "./auth-client"` → `createClientAuthClient` доступен
- ✅ `export * from "./supabase-client"` → `createBrowserSupabaseClient` доступен
- ✅ `export * from "../types"` → типы доступны

### 3. Components модуль (`@axon-dashboard/auth-sdk/components`)

#### Используется в проекте:

- `LoginForm` из `@/packages/auth-sdk/src/components/LoginForm`
- `SignUpForm` из `@/packages/auth-sdk/src/components/SignUpForm`
- `ResetPasswordClient` из `@/packages/auth-sdk/src/components`

#### Экспортируется через `src/components/index.tsx`:

- ✅ `export { LoginForm }` → доступен
- ✅ `export { SignUpForm }` → доступен
- ✅ `export { ResetPasswordClient }` → доступен

### 4. Типы (корневой экспорт `@axon-dashboard/auth-sdk`)

#### Используется в проекте:

- `User` тип из `@/packages/auth-sdk/src/types`
- `UserRole` тип из `@/packages/auth-sdk/src/types`

#### Экспортируется через `src/index.ts`:

- ✅ `export * from "./types"` → все типы доступны

#### Также экспортируются через:

- ✅ `@axon-dashboard/auth-sdk/server` → `export * from "../types"`
- ✅ `@axon-dashboard/auth-sdk/client` → `export * from "../types"`

## Структура экспортов в package.json

```json
{
  "exports": {
    ".": "./dist/index.js", // Типы и ошибки
    "./server": "./dist/server/index.js", // Server модуль
    "./client": "./dist/client/index.js", // Client модуль
    "./components": "./dist/components/index.js" // UI компоненты
  }
}
```

## Вывод

✅ **Все необходимые импорты доступны через правильные пути экспорта SDK**

### Маппинг импортов:

| Старый путь (локальный)                       | Новый путь (npm модуль)                              |
| --------------------------------------------- | ---------------------------------------------------- |
| `@/packages/auth-sdk/src/server/middleware`   | `@axon-dashboard/auth-sdk/server`                    |
| `@/packages/auth-sdk/src/server/role-service` | `@axon-dashboard/auth-sdk/server`                    |
| `@/packages/auth-sdk/src/client`              | `@axon-dashboard/auth-sdk/client`                    |
| `@/packages/auth-sdk/src/components`          | `@axon-dashboard/auth-sdk/components`                |
| `@/packages/auth-sdk/src/types`               | `@axon-dashboard/auth-sdk` (или через server/client) |

## Рекомендации

1. ✅ Все экспорты настроены правильно
2. ✅ Структура package.json корректна
3. ✅ Все используемые функции и типы доступны через правильные пути

**SDK готов к использованию через npm модуль!**
