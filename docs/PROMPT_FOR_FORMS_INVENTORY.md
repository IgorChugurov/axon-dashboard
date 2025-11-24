# Промпт для инвентаризации форм

**Цель:** Провести полную инвентаризацию всех мест использования форм в проекте и привести их к единообразному виду.

---

## Контекст проекта

Проект использует систему автогенерации форм на основе метаданных. Есть два типа форм:

1. **Формы с автогенерацией** - генерируются автоматически на основе `EntityDefinition` + `Field[]` + `EntityUIConfig`
2. **Ручные формы** - написаны вручную с hardcoded полями

## Документация

**Основной документ:** [docs/FORMS_STRUCTURE.md](docs/FORMS_STRUCTURE.md)

**Конфигурационные файлы:** [docs/CONFIG_FILE_STRUCTURE.md](docs/CONFIG_FILE_STRUCTURE.md)

## Ключевые файлы для изучения

### Компоненты автогенерации

1. **`components/UniversalEntityForm.tsx`**
   - Универсальный компонент для создания/редактирования любых сущностей
   - Использует данные из БД (динамическая конфигурация)
   - Использует `FormWithSectionsShadcn`

2. **`app/projects/[projectId]/settings/environment/EnvironmentForm.tsx`**
   - Специализированная форма для environment variables
   - Использует конфигурацию из JSON файла (`config/environments.json`)
   - Использует `FormWithSectionsShadcn`

3. **`lib/form-generation/components/FormWithSectionsShadcn.tsx`**
   - Основной компонент автогенерации форм
   - Используется в `UniversalEntityForm` и `EnvironmentForm`

### Ручные формы

4. **`components/entity-definition/EntityDefinitionForm.tsx`**
   - Ручная форма для создания/редактирования EntityDefinition
   - Hardcoded поля

5. **`components/entity-definition/FieldForm.tsx`**
   - Ручная форма для создания/редактирования Field
   - Hardcoded поля

### Типы и конфигурация

6. **`lib/universal-entity/types.ts`**
   - Типы `EntityDefinition`, `Field`, `FieldType`, `DbType`

7. **`lib/universal-entity/ui-config-types.ts`**
   - Типы `EntityUIConfig`, `ListPageConfig`, `FormPageConfig`, `MessagesConfig`

8. **`lib/universal-entity/config-file-types.ts`**
   - Типы для JSON конфигурационных файлов: `EntityConfigFile`, `FieldFromConfig`

9. **`config/environments.json`**
   - Пример конфигурационного файла для статических форм

### Страницы

10. **`app/projects/[projectId]/entity-instances/[entityDefinitionId]/new/page.tsx`**
    - Страница создания Entity Instance (использует `UniversalEntityForm`)

11. **`app/projects/[projectId]/entity-instances/[entityDefinitionId]/[instanceId]/edit/page.tsx`**
    - Страница редактирования Entity Instance (использует `UniversalEntityForm`)

12. **`app/projects/[projectId]/settings/environment/new/page.tsx`**
    - Страница создания Environment (использует `EnvironmentForm`)

13. **`app/projects/[projectId]/settings/environment/[environmentId]/page.tsx`**
    - Страница редактирования Environment (использует `EnvironmentForm`)

14. **`app/projects/[projectId]/entity-definition/new/page.tsx`**
    - Страница создания Entity Definition (использует `EntityDefinitionForm`)

15. **`app/projects/[projectId]/entity-definition/[entityDefinitionId]/edit/page.tsx`**
    - Страница редактирования Entity Definition (использует `EntityDefinitionForm`)

16. **`app/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/new/page.tsx`**
    - Страница создания Field (использует `FieldForm`)

17. **`app/projects/[projectId]/entity-definition/[entityDefinitionId]/fields/[fieldId]/edit/page.tsx`**
    - Страница редактирования Field (использует `FieldForm`)

### Утилиты

18. **`lib/universal-entity/config-service.ts`**
    - Функции для загрузки `EntityDefinition` и `Field[]` из БД
    - `getEntityDefinitionWithUIConfig()` - основная функция для динамических форм

19. **`lib/form-generation/utils/createFormStructure.ts`**
    - Группировка полей в секции

20. **`lib/form-generation/components/GetInputForFieldShadcn.tsx`**
    - Роутер для выбора правильного input компонента

## Текущее состояние

### Формы с автогенерацией (2 компонента, 4 страницы)

1. **UniversalEntityForm** - для Entity Instance (new/edit)
2. **EnvironmentForm** - для Environment (new/edit)

### Ручные формы (2 компонента, 4 страницы)

1. **EntityDefinitionForm** - для Entity Definition (new/edit)
2. **FieldForm** - для Field (new/edit)

## Задача

Провести инвентаризацию всех мест использования форм и привести их к единообразному виду.

### Шаги работы

1. **Анализ текущего состояния**
   - Найти все места, где используются формы
   - Определить, какие формы можно мигрировать на автогенерацию
   - Выявить несоответствия в структуре и использовании

2. **Планирование миграции**
   - Составить план миграции ручных форм на автогенерацию (если возможно)
   - Определить, какие формы должны остаться ручными
   - Спланировать унификацию структуры

3. **Реализация**
   - Привести все формы к единообразному виду
   - Унифицировать обработку ошибок
   - Унифицировать навигацию
   - Унифицировать использование GlobalLoader

4. **Документация**
   - Обновить `FORMS_STRUCTURE.md` с актуальной информацией
   - Задокументировать все изменения

## Важные принципы

1. **Все данные в конфиге**
   - Для статических форм все данные должны быть в JSON конфиге
   - Никакого хардкода в коде компонентов

2. **Единообразие**
   - Все формы должны использовать одинаковые паттерны
   - Единая обработка ошибок
   - Единая навигация

3. **Документация**
   - Все изменения должны быть задокументированы
   - Обновлять `FORMS_STRUCTURE.md` при изменениях

## Правила работы

⚠️ **ВАЖНО:** Согласно правилам репозитория:

1. **НИКОГДА не начинать программировать без детального плана**
   - С обоснованием
   - С анализом требований
   - С рассмотрением альтернативных подходов
   - С анализом слабых мест
   - С анализом изменения зависимостей на всем проекте от предполагаемых мутаций

2. **Только после утверждения плана** можно начинать имплементацию

3. **После выполнения плана** составить детальный отчет:
   - Все этапы выполнения плана
   - Все изменения, которые были внесены в код
   - Ожидаемые результаты

## Начало работы

Начни с анализа текущего состояния всех форм в проекте. Используй документацию и ключевые файлы, указанные выше, для понимания структуры.

