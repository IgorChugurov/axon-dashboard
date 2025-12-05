# Руководство по разработке и отладке Auth SDK

## 📋 Содержание

1. [Текущая структура зависимостей](#текущая-структура-зависимостей)
2. [Отладка в монорепо](#отладка-в-монорепо)
3. [Отладка в отдельном репозитории](#отладка-в-отдельном-репозитории)
4. [Подготовка к выносу в отдельный репозиторий](#подготовка-к-выносу-в-отдельный-репозиторий)
5. [Публикация в npm](#публикация-в-npm)

## Текущая структура зависимостей

### Peer Dependencies (не включаются в бандл)

SDK использует peer dependencies для всех внешних библиотек:

- `react` и `react-dom` - для React компонентов
- `next` - для Next.js специфичных функций (middleware, useRouter, useSearchParams)
- `@supabase/ssr` - для серверных Supabase клиентов
- `@supabase/supabase-js` - для клиентских Supabase клиентов

**Важно:** Все эти зависимости должны быть установлены в проекте, который использует SDK.

### Зависимости от Next.js

SDK использует Next.js в следующих местах:

1. **`src/server/middleware.ts`** - `NextRequest`, `NextResponse` из `next/server`
2. **`src/client/auth-provider.tsx`** - `useRouter` из `next/navigation`
3. **`src/components/ResetPasswordClient.tsx`** - `useRouter`, `useSearchParams` из `next/navigation`

Это нормально, так как SDK предназначен для использования только в Next.js проектах.

## Отладка в монорепо

### Текущая настройка (workspace links)

В монорепо SDK уже подключен через workspace links:

```json
// package.json основного проекта
{
  "dependencies": {
    "@axon-dashboard/auth-sdk": "workspace:*"
  }
}
```

### Процесс отладки

1. **Внесите изменения в SDK:**
   ```bash
   cd packages/auth-sdk
   # Редактируйте файлы в src/
   ```

2. **Пересоберите SDK (если нужно):**
   ```bash
   cd packages/auth-sdk
   pnpm build
   ```

3. **Или используйте watch mode для автоматической пересборки:**
   ```bash
   cd packages/auth-sdk
   pnpm dev
   ```

4. **В основном проекте изменения подхватываются автоматически** благодаря workspace links и watch mode.

### Hot Reload

Если используете Next.js dev server с Turbopack:

```bash
# В корне проекта
pnpm dev
```

Изменения в SDK будут подхватываться автоматически благодаря:
- Workspace links (pnpm/npm/yarn)
- Next.js Turbopack watch mode
- tsup watch mode (если запущен `pnpm dev` в packages/auth-sdk)

## Отладка в отдельном репозитории

После выноса SDK в отдельный репозиторий есть несколько способов отладки:

### Вариант 1: npm link / pnpm link (рекомендуется)

**В репозитории SDK:**

```bash
cd /path/to/auth-sdk
pnpm build
pnpm link --global
```

**В основном проекте:**

```bash
cd /path/to/axon-dashboard
pnpm link --global @axon-dashboard/auth-sdk
```

**Важно:** После изменений в SDK нужно пересобирать:
```bash
cd /path/to/auth-sdk
pnpm build
```

**Отключение link:**
```bash
cd /path/to/axon-dashboard
pnpm unlink --global @axon-dashboard/auth-sdk
pnpm install  # Вернуть обычную зависимость
```

### Вариант 2: Local path в package.json

**В основном проекте:**

```json
{
  "dependencies": {
    "@axon-dashboard/auth-sdk": "file:../auth-sdk"
  }
}
```

Затем:
```bash
pnpm install
```

**Плюсы:**
- Простота настройки
- Автоматическая пересборка при изменениях (если используется watch mode)

**Минусы:**
- Нужно пересобирать SDK вручную или использовать watch mode
- Может быть медленнее, чем npm link

### Вариант 3: Verdaccio (локальный npm registry)

Для более продвинутой отладки можно использовать локальный npm registry:

1. Установите Verdaccio:
   ```bash
   npm install -g verdaccio
   ```

2. Запустите Verdaccio:
   ```bash
   verdaccio
   ```

3. В SDK репозитории:
   ```bash
   npm publish --registry http://localhost:4873
   ```

4. В основном проекте:
   ```json
   {
     "dependencies": {
       "@axon-dashboard/auth-sdk": "^0.1.0"
     }
   }
   ```
   ```bash
   npm config set registry http://localhost:4873
   pnpm install
   ```

### Вариант 4: Git URL (для тестирования перед публикацией)

```json
{
  "dependencies": {
    "@axon-dashboard/auth-sdk": "git+https://github.com/your-org/auth-sdk.git#branch-name"
  }
}
```

**Минусы:**
- Нужно коммитить каждое изменение
- Медленнее, чем локальные методы

## Подготовка к выносу в отдельный репозиторий

### Структура файлов для выноса

```
auth-sdk/
├── .gitignore
├── .npmignore          # Что исключить из npm пакета
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
├── DEVELOPMENT.md      # Этот файл
├── LICENSE
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── client/
│   ├── server/
│   ├── components/
│   └── utils/
└── dist/               # Сгенерированные файлы (в .gitignore)
```

### .npmignore

Создайте `.npmignore` в корне SDK:

```
src/
tsconfig.json
tsup.config.ts
*.log
.DS_Store
node_modules/
.env
.env.local
```

Или используйте поле `files` в `package.json` (уже настроено):

```json
{
  "files": ["dist"]
}
```

### package.json для публикации

Убедитесь, что в `package.json` есть:

```json
{
  "name": "@axon-dashboard/auth-sdk",
  "version": "0.1.0",
  "description": "Authentication SDK for Axon Dashboard",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./server": {
      "types": "./dist/server/index.d.ts",
      "default": "./dist/server/index.js"
    },
    "./client": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "default": "./dist/components/index.js"
    }
  },
  "files": ["dist"],
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/auth-sdk.git"
  },
  "keywords": [
    "auth",
    "authentication",
    "supabase",
    "nextjs",
    "sdk"
  ],
  "license": "MIT"
}
```

### TypeScript конфигурация

Убедитесь, что `tsconfig.json` настроен правильно:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Публикация в npm

### Подготовка

1. **Убедитесь, что версия обновлена:**
   ```bash
   # В package.json
   "version": "0.1.1"  # или другая версия
   ```

2. **Соберите проект:**
   ```bash
   pnpm build
   ```

3. **Проверьте, что dist/ содержит все нужные файлы:**
   ```bash
   ls -la dist/
   ```

4. **Проверьте размер пакета:**
   ```bash
   npm pack --dry-run
   ```

### Публикация

1. **Войдите в npm:**
   ```bash
   npm login
   ```

2. **Опубликуйте:**
   ```bash
   npm publish --access public
   ```

   Для scoped packages (`@axon-dashboard/...`) нужен флаг `--access public`.

3. **Проверьте публикацию:**
   ```bash
   npm view @axon-dashboard/auth-sdk
   ```

### Использование в проекте

После публикации в основном проекте:

```bash
pnpm add @axon-dashboard/auth-sdk
```

Или обновите версию:

```bash
pnpm update @axon-dashboard/auth-sdk
```

## Рекомендации по CI/CD

### GitHub Actions пример

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Troubleshooting

### Проблема: Изменения не подхватываются

**Решение:**
1. Убедитесь, что SDK пересобран: `pnpm build`
2. Перезапустите dev server в основном проекте
3. Очистите кеш Next.js: удалите `.next/` и перезапустите

### Проблема: Ошибки типов после обновления

**Решение:**
1. Пересоберите SDK: `pnpm build`
2. Переустановите зависимости в основном проекте: `pnpm install`
3. Перезапустите TypeScript server в IDE

### Проблема: npm link не работает

**Решение:**
1. Убедитесь, что используете одинаковый менеджер пакетов (pnpm/npm/yarn)
2. Попробуйте использовать local path вместо link
3. Проверьте, что версии Node.js совместимы

## Checklist перед выносом

- [ ] Все зависимости перемещены в peerDependencies
- [ ] tsup.config.ts настроен правильно (external зависимости)
- [ ] package.json содержит все необходимые поля
- [ ] README.md обновлен с инструкциями по установке
- [ ] .npmignore или files в package.json настроены
- [ ] Версия обновлена (semantic versioning)
- [ ] Тесты написаны (если есть)
- [ ] LICENSE файл добавлен
- [ ] CI/CD настроен (если нужно)

