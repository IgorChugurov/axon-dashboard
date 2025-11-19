# Реструктуризация роутов

## Дата: 2025-01-20

## Изменения

### Новая структура роутов

Все роуты, связанные с проектами, теперь начинаются с `/projects/:projectId`:

- **Старая структура:**
  - `/[projectId]` - страница проекта
  - `/[projectId]/entities/...` - сущности проекта
  - `/[projectId]/entity-definition/...` - определения сущностей

- **Новая структура:**
  - `/projects` - список проектов
  - `/projects/[projectId]` - страница проекта
  - `/projects/[projectId]/entities/...` - сущности проекта
  - `/projects/[projectId]/entity-definition/...` - определения сущностей

### Удаленные легаси страницы

Удалены следующие легаси страницы:
- `/authors` - удалена
- `/posts` - удалена
- `/tags` - удалена

### Редиректы

Добавлены автоматические редиректы со старых путей на новые:
- `/[projectId]` → `/projects/[projectId]`
- `/[projectId]/[...rest]` → `/projects/[projectId]/[...rest]`

## Измененные файлы

### Перемещенные файлы
- `app/[projectId]/*` → `app/projects/[projectId]/*`

### Обновленные компоненты
- `components/AppSidebar.tsx` - обновлены ссылки на проекты
- `components/EntitiesSidebarSection.tsx` - обновлены ссылки на сущности
- `components/UniversalEntityList.tsx` - обновлена навигация
- `components/UniversalEntityForm.tsx` - обновлены редиректы и импорты
- `components/entity-definition/EntityDefinitionForm.tsx` - обновлены редиректы
- `components/entity-definition/FieldForm.tsx` - обновлены редиректы

### Обновленные Server Actions
- `app/projects/[projectId]/entities/[entityDefinitionId]/actions.ts` - обновлены `revalidatePath`
- `app/projects/[projectId]/entity-definition/actions.ts` - обновлены `revalidatePath`
- `app/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/actions.ts` - обновлены `revalidatePath`

### Обновленные страницы
- Все страницы в `app/projects/[projectId]/` - обновлены ссылки и редиректы

## Миграция

При переходе на новую версию:
1. Все старые ссылки автоматически редиректятся на новые пути
2. Обновите закладки и внешние ссылки на новые пути
3. API роуты не изменились и продолжают работать

## Обратная совместимость

Редиректы обеспечивают обратную совместимость со старыми путями. Старые ссылки будут автоматически перенаправляться на новые пути.

