# Анализ использования универсальных компонентов

**Дата создания:** 2025-01-30  
**Версия:** 1.0

---

## Таблица роутов с используемыми компонентами

### Списки (Universal Lists)

| Роут | Файл | Компонент списка | Статус |
|------|------|------------------|--------|
| `/projects` | `app/projects/page.tsx` | `ProjectsListClient` | ✅ Новый |
| `/projects/[projectId]` | `app/projects/[projectId]/page.tsx` | `EntityDefinitionsListClient` | ✅ Новый |
| `/projects/[projectId]/[entityDefId]` | `app/projects/[projectId]/[entityDefId]/page.tsx` | `EntityInstancesListClient` | ✅ Новый |
| `/projects/[projectId]/[entityDefId]/fields` | `app/projects/[projectId]/[entityDefId]/fields/page.tsx` | `FieldsListClient` | ✅ Новый |
| `/projects/[projectId]/settings/environments` | `app/projects/[projectId]/settings/environments/page.tsx` | `EnvironmentsListClient` | ✅ Новый |
| `/projects/[projectId]/admins` | `app/projects/[projectId]/admins/page.tsx` | `AdminsListClient` | ✅ Новый |

### Формы (Universal Forms)

| Роут | Файл | Компонент формы | Обёртка | Статус |
|------|------|-----------------|---------|--------|
| `/projects/new` | `app/projects/new/page.tsx` | `UniversalEntityFormNew` | `ProjectFormNew` | ✅ Новый |
| `/projects/[projectId]/settings` | `app/projects/[projectId]/settings/page.tsx` | `UniversalEntityFormNew` | `ProjectFormNew` | ✅ Новый |
| `/projects/[projectId]/new` | `app/projects/[projectId]/new/page.tsx` | `UniversalEntityFormNew` | `EntityDefinitionFormNew` | ✅ Новый |
| `/projects/[projectId]/[entityDefId]/edit` | `app/projects/[projectId]/[entityDefId]/edit/page.tsx` | `UniversalEntityFormNew` | `EntityDefinitionFormNew` | ✅ Новый |
| `/projects/[projectId]/[entityDefId]/new` | `app/projects/[projectId]/[entityDefId]/new/page.tsx` | `UniversalEntityFormNew` | `EntityInstanceFormNew` | ✅ Новый |
| `/projects/[projectId]/[entityDefId]/[instanceId]` | `app/projects/[projectId]/[entityDefId]/[instanceId]/page.tsx` | `UniversalEntityFormNew` | `EntityInstanceFormNew` | ✅ Новый |
| `/projects/[projectId]/[entityDefId]/fields/new` | `app/projects/[projectId]/[entityDefId]/fields/new/page.tsx` | - | `FieldFormNew` → `FieldForm` | ⚠️ Кастомная |
| `/projects/[projectId]/[entityDefId]/fields/[fieldId]` | `app/projects/[projectId]/[entityDefId]/fields/[fieldId]/page.tsx` | - | `FieldFormNew` → `FieldForm` | ⚠️ Кастомная |
| `/projects/[projectId]/settings/environments/new` | `app/projects/[projectId]/settings/environments/new/page.tsx` | `UniversalEntityFormNew` | `EnvironmentFormNew` | ✅ Новый |
| `/projects/[projectId]/settings/environments/[environmentId]` | `app/projects/[projectId]/settings/environments/[environmentId]/page.tsx` | `UniversalEntityFormNew` | `EnvironmentFormNew` | ✅ Новый |
| `/projects/[projectId]/admins/new` | `app/projects/[projectId]/admins/new/page.tsx` | - | `AdminFormNew` | ⚠️ Кастомная |

---

## Статистика

### Списки
- **Всего страниц со списками:** 6
- **Используют новые компоненты:** 6 (100%)
- **Используют старые компоненты:** 0 (0%)

### Формы
- **Всего страниц с формами:** 11
- **Используют `UniversalEntityFormNew`:** 8 (73%)
- **Используют кастомные формы:** 3 (27%)
  - `FieldForm` - специальная форма для полей (сложная логика)
  - `AdminFormNew` - специальная форма для админов (поиск пользователя)

---

## Устаревшие компоненты

### Списки

| Компонент | Файл | Статус использования | Рекомендация |
|-----------|------|---------------------|--------------|
| `UniversalEntityList` | `components/UniversalEntityList.tsx` | ❌ Не используется | ✅ Удалить |
| `EntityList` | `components/EntityList.tsx` | ❌ Не используется | ✅ Удалить |
| `ProjectsList` | `components/ProjectsList.tsx` | ❌ Не используется | ✅ Удалить |

### Формы

| Компонент | Файл | Статус использования | Рекомендация |
|-----------|------|---------------------|--------------|
| `UniversalEntityForm` | Не найден | ❌ Не существует | - |

**Примечание:** Все старые компоненты списков упоминаются только в документации, но не используются в реальном коде.

---

## Выводы

1. ✅ **Все списки мигрированы** на новые универсальные компоненты
2. ✅ **Большинство форм мигрированы** на `UniversalEntityFormNew`
3. ⚠️ **3 кастомные формы** остаются (имеют специальную логику):
   - `FieldForm` - сложная форма с множеством опций для полей
   - `AdminFormNew` - форма с поиском пользователя по email
4. ✅ **Устаревшие компоненты можно безопасно удалить**

