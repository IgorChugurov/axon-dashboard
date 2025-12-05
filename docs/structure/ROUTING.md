# Структура роутинга

**Дата обновления:** 2025-01-30  
**Статус:** ✅ Актуально

---

## 📁 Текущая структура роутов

### Проекты
- `/projects` - список проектов
- `/projects/[projectId]` - страница проекта (список entityDefinitions)
- `/projects/[projectId]/settings` - настройки проекта

### Entity Definitions
- `/projects/[projectId]/entity-definition/new` - создание новой entityDefinition
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/edit` - редактирование entityDefinition
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields` - список fields для entityDefinition
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/new` - создание нового field
- `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/[fieldId]/edit` - редактирование field

### Экземпляры сущностей
- `/projects/[projectId]/entities/[entityDefinitionId]` - список экземпляров сущности
- `/projects/[projectId]/entities/[entityDefinitionId]/new` - создание нового экземпляра
- `/projects/[projectId]/entities/[entityDefinitionId]/[instanceId]` - просмотр экземпляра
- `/projects/[projectId]/entities/[entityDefinitionId]/[instanceId]/edit` - редактирование экземпляра

---

## 🔄 Миграция со старой структуры

### Старая структура (до 2025-01-20):
- `/[projectId]` - страница проекта
- `/[projectId]/entities/...` - сущности проекта
- `/[projectId]/entity-definition/...` - определения сущностей

### Новая структура (с 2025-01-20):
- `/projects` - список проектов
- `/projects/[projectId]` - страница проекта
- `/projects/[projectId]/entities/...` - сущности проекта
- `/projects/[projectId]/entity-definition/...` - определения сущностей

### Редиректы
Добавлены автоматические редиректы со старых путей на новые:
- `/[projectId]` → `/projects/[projectId]`
- `/[projectId]/[...rest]` → `/projects/[projectId]/[...rest]`

---

## 🎯 Навигация в списке Entity Definitions

### Рекомендуемый подход:

1. **Клик на имя entityDefinition** → переход на список экземпляров (`/projects/[projectId]/entities/[entityDefinitionId]`)

2. **Меню действий** (три точки) с опциями:
   - Edit Definition → `/projects/[projectId]/entity-definition/[entityDefinitionId]/edit`
   - Manage Fields → `/projects/[projectId]/entity-definition/[entityDefinitionId]/fields`
   - Delete (для админов)

3. **На странице списка экземпляров** добавить breadcrumbs и кнопки:
   - Back to Project
   - Edit Entity Definition
   - Manage Fields

---

## 📝 Измененные файлы

### Перемещенные файлы
- `app/[projectId]/*` → `app/projects/[projectId]/*`

### Обновленные компоненты
- `components/AppSidebar.tsx` - обновлены ссылки на проекты
- `components/UniversalEntityList.tsx` - обновлена навигация
- `components/UniversalEntityForm.tsx` - обновлены редиректы

### Обновленные Server Actions
- Все actions в `app/projects/[projectId]/` - обновлены `revalidatePath`

---

## ✅ Обратная совместимость

Редиректы обеспечивают обратную совместимость со старыми путями. Старые ссылки будут автоматически перенаправляться на новые пути.

