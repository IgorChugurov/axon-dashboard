# Form Generation Library

Автоматическая генерация форм с поддержкой секций для entity system.

## 📦 Структура

```
lib/form-generation/
├── components/
│   ├── FormWithSections.tsx       # Главный компонент формы
│   ├── GetInputForField.tsx       # Роутер инпутов
│   └── inputs/
│       ├── InputText.tsx          # Text/Textarea
│       ├── InputNumber.tsx        # Number
│       ├── InputSwitch.tsx        # Boolean (Switch)
│       ├── InputDate.tsx          # Date
│       ├── InputSelect.tsx        # Select/MultipleSelect
│       └── InputRelation.tsx      # Relation fields
├── utils/
│   ├── createSchema.ts            # Yup validation schema
│   ├── getItemForEdit.ts          # Data normalization
│   ├── createFormStructure.ts    # Section grouping
│   └── fieldHelpers.ts            # Helper functions
├── types.ts                       # Type definitions
├── index.ts                       # Public API
└── README.md                      # This file
```

## 🚀 Quick Start

```typescript
import { FormWithSections } from "@/lib/form-generation";

<FormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
  onSubmit={async (data) => {
    await saveData(data);
  }}
/>
```

## ✨ Features

- ✅ **Automatic Sections**: Fields grouped by `sectionIndex` (0-3)
- ✅ **Conditional Fields**: Show/hide based on `foreignKey`
- ✅ **Validation**: Yup schema with custom messages
- ✅ **All Field Types**: Text, Number, Boolean, Date, Select, Relations
- ✅ **Default Values**: From field config or type-based
- ✅ **Styling**: Tailwind CSS + shadcn/ui
- ✅ **Type Safe**: Full TypeScript support

## 📚 Documentation

- [Usage Guide](../../docs/implementation/FORM_GENERATION_USAGE.md) - Detailed usage examples
- [Migration Guide](../../docs/implementation/SECTIONS_MIGRATION_GUIDE.md) - Database migration
- [API Reference](./types.ts) - Type definitions

## 🎯 Core Concepts

### Sections

Fields are grouped into sections (0-3) based on `sectionIndex`:

```typescript
const fields = [
  { name: "title", sectionIndex: 0, ... },    // Section 0
  { name: "content", sectionIndex: 0, ... },  // Section 0
  { name: "published", sectionIndex: 1, ... }, // Section 1
];
```

Section titles from `entityDefinition`:
```typescript
{
  titleSection0: "Basic Information",
  titleSection1: "Publishing Options",
  // ...
}
```

### Conditional Fields

Fields with dependencies:

```typescript
{
  name: "relatedField",
  foreignKey: "parentField",
  foreignKeyValue: "value1|value2", // Show when parentField = value1 OR value2
}
```

### Validation

Automatic validation from field config:
- `required: true` → Required validation
- `requiredText: "..."` → Custom error message
- `foreignKey` → Conditional required

## 🔧 Utilities

### createSchema(fields)

Generate Yup validation schema:

```typescript
import { createSchema } from "@/lib/form-generation";

const schema = createSchema(fields);
```

### getItemForEdit(fields, serverData)

Normalize server data for editing:

```typescript
import { getItemForEdit } from "@/lib/form-generation";

const formData = getItemForEdit(fields, serverData);
```

### createFormStructure(fields, mode, uiConfig?)

Group fields into sections:

```typescript
import { createFormStructure } from "@/lib/form-generation";

const structure = createFormStructure(fields, "create", uiConfig);
// Returns: { sections, allFields }
```

## 🎨 Components

### FormWithSections

Main form component with automatic sections.

**Props:**
- `entityDefinition` - Entity configuration
- `fields` - Field definitions
- `mode` - "create" | "edit"
- `initialData?` - For edit mode
- `onSubmit` - Submit handler
- `onCancel?` - Cancel handler
- `submitButtonText?` - Custom button text
- `cancelButtonText?` - Custom cancel text

### GetInputForField

Routes to appropriate input component.

**Props:**
- `field` - Field definition
- `control` - react-hook-form control
- `disabled?` - Disable input
- `options?` - For select inputs

### Input Components

Individual input components:
- `InputText` - Text/Textarea
- `InputNumber` - Number
- `InputSwitch` - Boolean
- `InputDate` - Date/DateTime
- `InputSelect` - Single/Multiple Select
- `InputRelation` - Relation fields

## 🔗 Integration

### With Existing Code

```typescript
// Old
<EntityFormClient
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
/>

// New (drop-in replacement)
<EntityFormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
/>
```

### Standalone Usage

```typescript
import { FormWithSections } from "@/lib/form-generation";

function MyForm() {
  return (
    <FormWithSections
      entityDefinition={myEntity}
      fields={myFields}
      mode="create"
      onSubmit={handleSubmit}
    />
  );
}
```

## 🎨 Styling

Uses Tailwind CSS + shadcn/ui:
- Consistent with project theme
- Dark mode support
- Responsive design
- Accessible components

## 🧪 Testing

To test the form generation:

1. Create an entity with fields in different sections
2. Set custom section titles in entity definition
3. Create/edit instances using the form
4. Verify conditional fields work correctly
5. Test validation with required/optional fields

## 📝 License

Internal library for axon-dashboard project.

## 🤝 Contributing

This library is part of the axon-dashboard project. See main project README for contribution guidelines.

