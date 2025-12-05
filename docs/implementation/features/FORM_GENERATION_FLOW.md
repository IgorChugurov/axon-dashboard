# Система автоматического формирования форм

## 📋 Содержание

1. [Концепция](#концепция)
2. [Архитектура](#архитектура)
3. [Поток данных](#поток-данных)
4. [Реализация](#реализация)
5. [Примеры использования](#примеры-использования)

---

## Концепция

### Основная идея

Система автоматического формирования форм позволяет создавать и редактировать экземпляры любых сущностей без написания специфичного кода для каждой формы. Вся конфигурация хранится в базе данных в виде метаданных (`EntityDefinition` и `Field`).

### Ключевые принципы

1. **Метаданные как источник истины**: Структура формы определяется конфигурацией в БД
2. **Единый механизм**: Одна система для всех сущностей
3. **Секционирование**: Поля группируются в логические разделы
4. **Условная видимость**: Поля могут показываться/скрываться в зависимости от значений других полей
5. **Автоматическая валидация**: Схема валидации генерируется из метаданных
6. **Типобезопасность**: Полная поддержка TypeScript

### Основные возможности

- ✅ Автоматическое создание форм для любой сущности
- ✅ Разделение формы на секции (до 4 секций)
- ✅ Кастомные названия секций
- ✅ Условная видимость полей (зависимость от других полей)
- ✅ Автоматическая валидация (Yup + react-hook-form)
- ✅ Поддержка всех типов полей (text, number, boolean, date, select, relation)
- ✅ Динамическая загрузка опций для relation-полей
- ✅ Режимы создания и редактирования
- ✅ Фильтрация пустых секций

---

## Архитектура

### Структура проекта

```
lib/form-generation/
├── components/
│   ├── FormWithSections.tsx       # Главный компонент формы
│   ├── GetInputForField.tsx       # Роутер для выбора типа input
│   └── inputs/
│       ├── InputText.tsx          # Текстовые поля
│       ├── InputNumber.tsx        # Числовые поля
│       ├── InputSwitch.tsx        # Boolean поля
│       ├── InputDate.tsx          # Поля дат
│       ├── InputSelect.tsx        # Select (single/multiple)
│       └── InputRelation.tsx      # Relation поля
├── utils/
│   ├── createSchema.ts            # Генерация Yup схемы валидации
│   ├── getItemForEdit.ts          # Подготовка данных для редактирования
│   ├── createFormStructure.ts     # Формирование структуры секций
│   └── fieldHelpers.ts            # Вспомогательные функции
├── types.ts                       # TypeScript типы
└── README.md                      # Документация по API
```

### Модель данных

```typescript
// База данных
table entity_definition {
  id: string
  name: string
  table_name: string
  title_section_0: string?  // Название для секции 0
  title_section_1: string?  // Название для секции 1
  title_section_2: string?  // Название для секции 2
  title_section_3: string?  // Название для секции 3
  // ... другие поля
}

table field {
  id: string
  entity_definition_id: string
  name: string
  type: string              // text, number, boolean, date, select, etc.
  db_type: string
  label: string
  section_index: number     // 0-3, номер секции
  for_create_page: boolean
  for_edit_page: boolean
  required: boolean
  foreign_key: string?      // Имя поля, от которого зависит видимость
  foreign_key_value: string? // Значение(я) для показа: "value1|value2" или "any"
  // ... другие поля
}
```

---

## Поток данных

### 1. Загрузка конфигурации

```
Page Component
    ↓
[Fetch EntityDefinition + Fields from DB]
    ↓
Transform to TypeScript types
    ↓
Pass to EntityFormWithSections
```

### 2. Инициализация формы

```
EntityFormWithSections
    ↓
Filter relevant fields (forCreatePage / forEditPage)
    ↓
createFormStructure()
    ├─ Group fields by section_index
    ├─ Sort by display_index
    └─ Create FormSection[] with titles
    ↓
createSchema()
    ├─ Build Yup validation schema
    ├─ Apply required rules
    └─ Apply conditional validation
    ↓
getItemForEdit()
    ├─ Normalize server data
    ├─ Apply default values
    └─ Return initial form data
    ↓
useForm() initialization
```

### 3. Рендеринг формы

```
FormWithSections
    ↓
watch() - отслеживание изменений всех полей
    ↓
filterVisibleSections()
    ├─ Для каждой секции
    │   └─ Для каждого поля
    │       └─ isFieldVisible()
    │           ├─ Проверка foreignKey
    │           ├─ Проверка foreignKeyValue
    │           └─ Return true/false
    └─ Filter empty sections
    ↓
Render sections
    └─ Для каждого видимого поля
        └─ GetInputForField()
            └─ Switch по field.type
                ├─ text/textarea → InputText
                ├─ number → InputNumber
                ├─ boolean → InputSwitch
                ├─ date → InputDate
                ├─ select/multipleSelect → InputSelect
                └─ relation → InputRelation
```

### 4. Валидация

```
User Input Change
    ↓
react-hook-form Controller
    ↓
Yup Schema Validation
    ├─ Type validation
    ├─ Required validation
    └─ Conditional validation (when)
    ↓
Error state update
    ↓
Display error message
```

### 5. Сохранение

```
User clicks Submit
    ↓
handleSubmit()
    ↓
Validate all fields
    ↓
onSubmit(formData)
    ↓
EntityFormWithSections.handleSubmit
    ↓
createOrUpdateEntityInstance()
    ├─ Prepare payload
    ├─ Call API/Service
    └─ Handle response
    ↓
Redirect or show error
```

---

## Реализация

### Компоненты

#### 1. FormWithSections (главный компонент)

**Файл**: `lib/form-generation/components/FormWithSections.tsx`

**Назначение**: Оркестрирует весь процесс формирования и управления формой.

**Ключевая логика**:

```typescript
export function FormWithSections({
  entityDefinition,
  fields,
  mode,
  initialData,
  onSubmit,
  onCancel,
}) {
  // 1. Фильтрация релевантных полей
  const relevantFields = useMemo(() => {
    return fields.filter((f) =>
      mode === "create" ? f.forCreatePage : f.forEditPage
    );
  }, [fields, mode]);

  // 2. Создание структуры секций
  const formStructure = useMemo(() => {
    return createFormStructure(entityDefinition, relevantFields, mode);
  }, [entityDefinition, relevantFields, mode]);

  // 3. Подготовка начальных данных
  const preparedInitialData = useMemo(() => {
    return getItemForEdit(relevantFields, initialData);
  }, [relevantFields, initialData]);

  // 4. Создание схемы валидации
  const validationSchema = useMemo(() => {
    return createSchema(relevantFields);
  }, [relevantFields]);

  // 5. Инициализация react-hook-form
  const methods = useForm<FormData>({
    mode: "onTouched",
    resolver: yupResolver(validationSchema),
    defaultValues: preparedInitialData,
  });

  // 6. Отслеживание изменений для условной видимости
  const formValues = watch();

  // 7. Фильтрация видимых секций
  const visibleSections = useMemo(() => {
    return filterVisibleSections(formStructure, formValues);
  }, [formStructure, formValues]);

  // 8. Рендеринг
  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmitHandler)}>
        {visibleSections.map((section) => (
          <Card key={section.sectionIndex}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.fields.map((field) => (
                <GetInputForField
                  key={field.id}
                  field={field}
                  control={control}
                  disabled={isPending}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </form>
    </FormProvider>
  );
}
```

**Особенности**:

- Использует `useMemo` для оптимизации
- `FormProvider` для контекста react-hook-form
- Динамическое обновление видимости при изменении полей

#### 2. createFormStructure (формирование секций)

**Файл**: `lib/form-generation/utils/createFormStructure.ts`

**Назначение**: Группирует поля по секциям и применяет названия.

**Алгоритм**:

```typescript
export function createFormStructure(
  entityDefinition: EntityDefinition,
  fields: Field[],
  mode: "create" | "edit"
): FormStructure {
  // 1. Фильтрация полей по режиму
  const relevantFields = fields.filter((field) =>
    mode === "create" ? field.forCreatePage : field.forEditPage
  );

  // 2. Сортировка по displayIndex
  const sortedFields = [...relevantFields].sort(
    (a, b) => (a.displayIndex ?? 0) - (b.displayIndex ?? 0)
  );

  // 3. Группировка по sectionIndex
  const fieldsBySectionIndex: Record<number, Field[]> = {};
  sortedFields.forEach((field) => {
    const sectionIdx = field.sectionIndex ?? 0;
    if (!fieldsBySectionIndex[sectionIdx]) {
      fieldsBySectionIndex[sectionIdx] = [];
    }
    fieldsBySectionIndex[sectionIdx].push(field);
  });

  // 4. Создание секций с названиями
  const sections: FormSection[] = Object.entries(fieldsBySectionIndex)
    .map(([sectionIndexStr, sectionFields]) => {
      const sectionIndex = Number(sectionIndexStr);

      // Получение названия секции
      let title = "General Information"; // default для секции 0
      if (sectionIndex === 0 && entityDefinition.titleSection0) {
        title = entityDefinition.titleSection0;
      } else if (sectionIndex === 1) {
        title = entityDefinition.titleSection1 || "Section 1";
      } else if (sectionIndex === 2) {
        title = entityDefinition.titleSection2 || "Section 2";
      } else if (sectionIndex === 3) {
        title = entityDefinition.titleSection3 || "Section 3";
      }

      return {
        sectionIndex,
        title,
        fields: sectionFields,
      };
    })
    .sort((a, b) => a.sectionIndex - b.sectionIndex);

  return {
    entityDefinition,
    sections,
    allFields: sortedFields,
  };
}
```

**Результат**:

```typescript
{
  entityDefinition: EntityDefinition,
  sections: [
    {
      sectionIndex: 0,
      title: "Основная информация",
      fields: [Field, Field, ...]
    },
    {
      sectionIndex: 1,
      title: "Дополнительные данные",
      fields: [Field, Field, ...]
    }
  ],
  allFields: [Field, Field, ...]
}
```

#### 3. filterVisibleSections (условная видимость)

**Файл**: `lib/form-generation/utils/createFormStructure.ts`

**Назначение**: Фильтрует секции и поля на основе условий видимости.

**Алгоритм**:

```typescript
export function filterVisibleSections(
  formStructure: FormStructure,
  formData: Record<string, unknown>
): FormSection[] {
  return (
    formStructure.sections
      .map((section) => {
        // Фильтруем поля в секции
        const visibleFields = section.fields.filter((field) =>
          isFieldVisible(field, formData)
        );

        return {
          ...section,
          fields: visibleFields,
        };
      })
      // Убираем пустые секции
      .filter((section) => section.fields.length > 0)
  );
}

function isFieldVisible(
  field: Field,
  formData: Record<string, unknown>
): boolean {
  // Если нет зависимостей - всегда видимо
  if (!field.foreignKey || !field.foreignKeyValue) {
    return true;
  }

  // Получаем значение родительского поля
  const parentValue = formData[field.foreignKey];

  // Если родительское поле пустое - скрываем
  if (parentValue == null) {
    return false;
  }

  const parentValueStr = String(parentValue);

  // Специальное значение "any" - показываем если есть любое значение
  if (field.foreignKeyValue === "any") {
    return Boolean(parentValueStr) && parentValueStr !== "none";
  }

  // Проверка конкретных значений (pipe-separated)
  const allowedValues = field.foreignKeyValue.split("|");
  return allowedValues.includes(parentValueStr);
}
```

**Примеры условий**:

```typescript
// Пример 1: Показывать если parentField === "yes"
{
  foreignKey: "parentField",
  foreignKeyValue: "yes"
}

// Пример 2: Показывать если parentField === "option1" ИЛИ "option2"
{
  foreignKey: "parentField",
  foreignKeyValue: "option1|option2"
}

// Пример 3: Показывать если parentField имеет любое значение (кроме null/none)
{
  foreignKey: "parentField",
  foreignKeyValue: "any"
}
```

#### 4. createSchema (генерация валидации)

**Файл**: `lib/form-generation/utils/createSchema.ts`

**Назначение**: Создает Yup схему валидации на основе метаданных полей.

**Алгоритм**:

```typescript
export function createSchema(fields: Field[]): Yup.ObjectSchema<any> {
  const shape = fields.reduce<Record<string, Yup.AnySchema>>(
    (schema, field) => {
      // 1. Получаем базовый валидатор для типа
      let validator = getValidatorForType(field);

      // 2. Применяем required валидацию
      if (field.required) {
        const message = field.requiredText || "This field is required";

        // Если поле зависит от другого - условная валидация
        if (field.foreignKey && field.foreignKeyValue) {
          validator = applyConditionalValidation(validator, field, message);
        } else {
          // Безусловная валидация
          validator = applyRequiredValidation(validator, field, message);
        }
      }

      schema[field.name] = validator;
      return schema;
    },
    {}
  );

  return Yup.object().shape(shape);
}
```

**Типы валидаторов**:

```typescript
function getValidatorForType(field: Field): Yup.AnySchema {
  switch (field.type) {
    case "text":
    case "textarea":
      return Yup.string().nullable();

    case "number":
      return Yup.number()
        .nullable()
        .transform((v, o) => (o === "" ? null : v));

    case "boolean":
      return Yup.boolean().nullable();

    case "date":
      return Yup.date().nullable();

    case "select":
      return Yup.string().nullable();

    case "multipleSelect":
      return Yup.array().of(Yup.string()).nullable();

    case "relation":
      return Yup.array().of(Yup.string()).nullable();

    default:
      return Yup.mixed().nullable();
  }
}
```

**Условная валидация**:

```typescript
function applyConditionalValidation(
  validator: Yup.AnySchema,
  field: Field,
  message: string
): Yup.AnySchema {
  return validator.when(field.foreignKey!, {
    is: (value: any) => {
      if (!value) return false;
      const valueStr = String(value);

      if (field.foreignKeyValue === "any") {
        return Boolean(valueStr) && valueStr !== "none";
      }

      const allowedValues = field.foreignKeyValue!.split("|");
      return allowedValues.includes(valueStr);
    },
    then: (schema) => applyRequiredValidation(schema, field, message),
    otherwise: (schema) => schema.nullable(),
  });
}
```

#### 5. getItemForEdit (подготовка данных)

**Файл**: `lib/form-generation/utils/getItemForEdit.ts`

**Назначение**: Подготавливает данные для инициализации формы.

**Алгоритм**:

```typescript
export function getItemForEdit(
  fields: Field[],
  serverData?: Record<string, any>
): Record<string, any> {
  const formData: Record<string, any> = {};

  fields.forEach((field) => {
    const serverValue = serverData?.[field.name];

    // Если есть значение с сервера - нормализуем его
    if (serverValue !== null && serverValue !== undefined) {
      formData[field.name] = normalizeValueForField(serverValue, field);
    } else {
      // Иначе используем default значение
      formData[field.name] = getDefaultValueForField(field);
    }
  });

  return formData;
}
```

**Нормализация значений**:

```typescript
function normalizeValueForField(value: any, field: Field): any {
  switch (field.type) {
    case "number":
      return typeof value === "number" ? value : parseFloat(value) || null;

    case "boolean":
      return Boolean(value);

    case "date":
      if (value instanceof Date) return value;
      if (typeof value === "string") return new Date(value);
      return null;

    case "multipleSelect":
    case "relation":
      return Array.isArray(value) ? value : [];

    default:
      return value;
  }
}
```

**Значения по умолчанию**:

```typescript
function getDefaultValueForField(field: Field): any {
  // Сначала проверяем explicit defaults из конфигурации
  if (
    field.defaultStringValue !== undefined &&
    field.defaultStringValue !== null
  ) {
    return field.defaultStringValue;
  }
  if (
    field.defaultNumberValue !== undefined &&
    field.defaultNumberValue !== null
  ) {
    return field.defaultNumberValue;
  }
  if (
    field.defaultBooleanValue !== undefined &&
    field.defaultBooleanValue !== null
  ) {
    return field.defaultBooleanValue;
  }
  if (field.defaultDateValue !== undefined && field.defaultDateValue !== null) {
    return new Date(field.defaultDateValue);
  }

  // Затем type-based defaults
  switch (field.type) {
    case "boolean":
      return false;
    case "multipleSelect":
    case "relation":
      return [];
    default:
      return null;
  }
}
```

#### 6. Input компоненты

**Общая структура**:

```typescript
interface InputProps {
  field: Field; // Метаданные поля
  control: Control<FormData>; // react-hook-form контрол
  disabled?: boolean; // Состояние disabled
  options?: SelectOption[]; // Опции для select (опционально)
}

export function InputText({ field, control, disabled }: InputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => {
        // Нормализация значения
        const stringValue =
          typeof formField.value === "string" ? formField.value : "";

        return (
          <div>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>

            <Input
              id={field.name}
              value={stringValue}
              onChange={formField.onChange}
              onBlur={formField.onBlur}
              disabled={disabled}
              placeholder={field.placeholder || ""}
            />

            {error && <p className="text-sm text-red-500">{error.message}</p>}

            {field.description && (
              <p className="text-sm text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
```

**Особенности InputRelation**:

```typescript
export function InputRelation({ field, control, disabled }: InputProps) {
  const relatedEntityId = field.relatedEntityDefinitionId;

  if (!relatedEntityId) {
    return <p className="text-red-500">Error: Missing related entity</p>;
  }

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: formField, fieldState: { error } }) => {
        // Нормализация к массиву строк
        const rawValue = formField.value;
        const valueAsArray: string[] = Array.isArray(rawValue)
          ? rawValue.filter((v): v is string => typeof v === "string")
          : typeof rawValue === "string"
          ? [rawValue]
          : [];

        return (
          <div>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>

            {/* RelationSelect загружает опции автоматически */}
            <RelationSelect
              relatedEntityDefinitionId={relatedEntityId}
              value={valueAsArray}
              onChange={formField.onChange}
              onBlur={formField.onBlur}
              disabled={disabled}
              label={field.label}
              required={field.required}
            />

            {error && <p className="text-sm text-red-500">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}
```

### Интеграция с страницами

#### Страница создания

**Файл**: `app/[projectId]/entities/[entityDefinitionId]/new/page.tsx`

```typescript
export default async function NewEntityPage({ params }) {
  const { projectId, entityDefinitionId } = params;

  // 1. Загрузка конфигурации
  const entityDefinition = await getEntityDefinition(entityDefinitionId);
  const fields = await getFields(entityDefinitionId);

  // 2. Рендеринг формы
  return (
    <EntityFormWithSections
      entityDefinition={entityDefinition}
      fields={fields}
      mode="create"
    />
  );
}
```

#### Страница редактирования

**Файл**: `app/[projectId]/entities/[entityDefinitionId]/[instanceId]/edit/page.tsx`

```typescript
export default async function EditEntityPage({ params }) {
  const { projectId, entityDefinitionId, instanceId } = params;

  // 1. Загрузка конфигурации
  const entityDefinition = await getEntityDefinition(entityDefinitionId);
  const fields = await getFields(entityDefinitionId);

  // 2. Загрузка данных экземпляра
  const instance = await getEntityInstance(
    entityDefinition.tableName,
    instanceId
  );

  // 3. Подготовка данных для формы
  const formData = prepareFormData(instance, fields);

  // 4. Рендеринг формы
  return (
    <EntityFormWithSections
      entityDefinition={entityDefinition}
      fields={fields}
      mode="edit"
      initialData={formData}
      instanceId={instanceId}
    />
  );
}
```

#### Wrapper компонент EntityFormWithSections

**Файл**: `app/[projectId]/entities/[entityDefinitionId]/EntityFormWithSections.tsx`

```typescript
"use client";

export function EntityFormWithSections({
  entityDefinition,
  fields,
  mode,
  initialData,
  instanceId,
}: Props) {
  const router = useRouter();
  const projectId = useParams().projectId as string;

  const handleSubmit = async (formData: FormData) => {
    try {
      if (mode === "create") {
        await createEntityInstance(entityDefinition.tableName, formData);
      } else {
        await updateEntityInstance(
          entityDefinition.tableName,
          instanceId!,
          formData
        );
      }

      router.push(`/${projectId}/entities/${entityDefinition.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving entity:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <FormWithSections
      entityDefinition={entityDefinition}
      fields={fields}
      mode={mode}
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText={mode === "create" ? "Create" : "Save"}
      cancelButtonText="Cancel"
    />
  );
}
```

---

## Примеры использования

### Пример 1: Простая форма без секций

**Конфигурация**:

```typescript
// EntityDefinition
{
  name: "User",
  tableName: "users",
  // titleSection0, titleSection1, etc. не заданы
}

// Fields
[
  { name: "name", type: "text", label: "Name", sectionIndex: 0, required: true },
  { name: "email", type: "text", label: "Email", sectionIndex: 0, required: true },
  { name: "age", type: "number", label: "Age", sectionIndex: 0 },
]
```

**Результат**:

- Одна секция с названием "General Information"
- Три поля: Name, Email, Age

### Пример 2: Форма с несколькими секциями

**Конфигурация**:

```typescript
// EntityDefinition
{
  name: "Product",
  tableName: "products",
  titleSection0: "Basic Information",
  titleSection1: "Pricing",
  titleSection2: "Inventory",
}

// Fields
[
  { name: "name", type: "text", label: "Product Name", sectionIndex: 0, required: true },
  { name: "description", type: "textarea", label: "Description", sectionIndex: 0 },
  { name: "price", type: "number", label: "Price", sectionIndex: 1, required: true },
  { name: "discount", type: "number", label: "Discount %", sectionIndex: 1 },
  { name: "stock", type: "number", label: "Stock", sectionIndex: 2, required: true },
  { name: "warehouse", type: "text", label: "Warehouse", sectionIndex: 2 },
]
```

**Результат**:

- Секция "Basic Information": name, description
- Секция "Pricing": price, discount
- Секция "Inventory": stock, warehouse

### Пример 3: Условная видимость полей

**Конфигурация**:

```typescript
// Fields
[
  {
    name: "type",
    type: "select",
    label: "Type",
    sectionIndex: 0,
    required: true,
    options: ["individual", "company"],
  },
  {
    name: "firstName",
    type: "text",
    label: "First Name",
    sectionIndex: 0,
    required: true,
    foreignKey: "type",
    foreignKeyValue: "individual", // Показывается только если type === "individual"
  },
  {
    name: "lastName",
    type: "text",
    label: "Last Name",
    sectionIndex: 0,
    required: true,
    foreignKey: "type",
    foreignKeyValue: "individual",
  },
  {
    name: "companyName",
    type: "text",
    label: "Company Name",
    sectionIndex: 0,
    required: true,
    foreignKey: "type",
    foreignKeyValue: "company", // Показывается только если type === "company"
  },
];
```

**Поведение**:

- При выборе type = "individual": показываются firstName и lastName
- При выборе type = "company": показывается companyName
- Валидация применяется только к видимым полям

### Пример 4: Relation поля

**Конфигурация**:

```typescript
// Fields
[
  {
    name: "title",
    type: "text",
    label: "Article Title",
    sectionIndex: 0,
    required: true,
  },
  {
    name: "author_id",
    type: "relation",
    label: "Author",
    sectionIndex: 0,
    required: true,
    relatedEntityDefinitionId: "uuid-of-user-entity", // Связь с User
  },
  {
    name: "category_ids",
    type: "relation",
    label: "Categories",
    sectionIndex: 0,
    required: false,
    relatedEntityDefinitionId: "uuid-of-category-entity", // Связь с Category
  },
];
```

**Поведение**:

- `author_id`: RelationSelect загружает список пользователей и отображает их в dropdown
- `category_ids`: Множественный выбор категорий
- Автоматическая загрузка опций из связанных таблиц

### Пример 5: Комбинированная сложная форма

**Конфигурация**:

```typescript
// EntityDefinition
{
  name: "Order",
  tableName: "orders",
  titleSection0: "Customer Information",
  titleSection1: "Order Details",
  titleSection2: "Delivery",
}

// Fields
[
  // Секция 0: Customer Information
  {
    name: "customer_type",
    type: "select",
    label: "Customer Type",
    sectionIndex: 0,
    required: true,
    options: ["existing", "new"]
  },
  {
    name: "customer_id",
    type: "relation",
    label: "Select Customer",
    sectionIndex: 0,
    required: true,
    foreignKey: "customer_type",
    foreignKeyValue: "existing",
    relatedEntityDefinitionId: "uuid-of-customer-entity"
  },
  {
    name: "customer_name",
    type: "text",
    label: "Customer Name",
    sectionIndex: 0,
    required: true,
    foreignKey: "customer_type",
    foreignKeyValue: "new"
  },

  // Секция 1: Order Details
  {
    name: "product_ids",
    type: "relation",
    label: "Products",
    sectionIndex: 1,
    required: true,
    relatedEntityDefinitionId: "uuid-of-product-entity"
  },
  {
    name: "total_amount",
    type: "number",
    label: "Total Amount",
    sectionIndex: 1,
    required: true
  },

  // Секция 2: Delivery
  {
    name: "requires_delivery",
    type: "boolean",
    label: "Requires Delivery",
    sectionIndex: 2
  },
  {
    name: "delivery_address",
    type: "textarea",
    label: "Delivery Address",
    sectionIndex: 2,
    required: true,
    foreignKey: "requires_delivery",
    foreignKeyValue: "any"  // Показывается если требуется доставка
  },
  {
    name: "delivery_date",
    type: "date",
    label: "Delivery Date",
    sectionIndex: 2,
    foreignKey: "requires_delivery",
    foreignKeyValue: "any"
  },
]
```

**Поведение**:

1. **Секция "Customer Information"**:

   - Выбор типа клиента (existing/new)
   - Если "existing" - показывается relation select для выбора из списка
   - Если "new" - показывается текстовое поле для ввода имени

2. **Секция "Order Details"**:

   - Множественный выбор продуктов
   - Ввод суммы заказа
   - Всегда видимы

3. **Секция "Delivery"**:
   - Checkbox "Requires Delivery"
   - Если отмечен - показываются адрес и дата доставки
   - Валидация адреса применяется только когда секция видима

---

## Преимущества текущей реализации

### 1. Гибкость

- Любая сущность может иметь форму без написания кода
- Легко добавлять новые поля через UI

### 2. Масштабируемость

- Один механизм для всех сущностей
- Легко расширять новыми типами полей

### 3. Поддерживаемость

- Вся логика централизована в `lib/form-generation/`
- Четкое разделение ответственности между компонентами

### 4. Типобезопасность

- Полная поддержка TypeScript
- Автоматический вывод типов

### 5. UX

- Секционирование улучшает читаемость
- Условная видимость упрощает формы
- Автоматическая валидация предотвращает ошибки

### 6. Производительность

- `useMemo` для оптимизации пересчетов
- Ленивая загрузка опций для relation полей
- Эффективная фильтрация видимости

---

## Ограничения и будущие улучшения

### Текущие ограничения

1. **Максимум 4 секции** (0-3)

   - Можно расширить при необходимости

2. **Одноуровневая зависимость** (A → B)

   - Пока не поддерживается A → B → C
   - Можно реализовать рекурсивную проверку

3. **Нет обратных relation полей**

   - При создании relation не создается обратное поле
   - Отложено для будущей реализации

4. **Статические опции для select**
   - Options пока хранятся в JSON, а не в отдельной таблице
   - Можно добавить динамическую загрузку

### Планы на будущее

1. **Многоуровневые зависимости**

   - Поддержка A → B → C → D

2. **Вложенные формы**

   - Редактирование связанных сущностей inline

3. **Кастомные валидаторы**

   - Regex, min/max для строк, custom функции

4. **Drag-and-drop сортировка**

   - Изменение порядка полей через UI

5. **Условные секции**

   - Показ/скрытие целых секций

6. **Layout конфигурация**

   - Horizontal/vertical layout
   - Grid columns (1, 2, 3 колонки)

7. **Автосохранение**

   - Draft mode с автосохранением

8. **История изменений**
   - Audit log для всех изменений

---

## Заключение

Система автоматического формирования форм обеспечивает:

✅ **Единый механизм** для всех сущностей  
✅ **Гибкую конфигурацию** через метаданные  
✅ **Условную логику** для сложных форм  
✅ **Автоматическую валидацию** на основе правил  
✅ **Типобезопасность** на всех уровнях  
✅ **Хорошую производительность** через оптимизацию  
✅ **Простоту расширения** через модульную архитектуру

Эта система является фундаментом для построения сложных административных интерфейсов без необходимости писать формы вручную для каждой сущности.
