
# Form Generation System - Usage Guide

## Overview

The form generation system automatically creates forms with sections based on entity definitions and field configurations. It includes validation, conditional field visibility, and support for all field types including relations.

## Quick Start

### Basic Usage

```typescript
import { FormWithSections } from "@/lib/form-generation";

function MyForm() {
  const handleSubmit = async (data: Record<string, any>) => {
    // Handle form submission
    console.log("Form data:", data);
  };

  return (
    <FormWithSections
      entityDefinition={entityDefinition}
      fields={fields}
      mode="create"
      onSubmit={handleSubmit}
    />
  );
}
```

### With Sections

The form automatically groups fields into sections based on `sectionIndex` (0-3):

```typescript
// Fields configuration
const fields = [
  { name: "title", sectionIndex: 0, ... },      // Section 0
  { name: "content", sectionIndex: 0, ... },    // Section 0
  { name: "published", sectionIndex: 1, ... },  // Section 1
  { name: "tags", sectionIndex: 1, ... },       // Section 1
];

// Entity definition with section titles
const entityDefinition = {
  name: "Posts",
  titleSection0: "Basic Information",
  titleSection1: "Publishing Options",
  // ...
};
```

Result:
- **Basic Information** section with title and content fields
- **Publishing Options** section with published and tags fields

## Components

### FormWithSections

Main component for automatic form generation.

**Props:**
```typescript
interface FormWithSectionsProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  mode: "create" | "edit";
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  cancelButtonText?: string;
}
```

**Example:**
```typescript
<FormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="edit"
  initialData={existingData}
  onSubmit={handleUpdate}
  onCancel={() => router.back()}
  submitButtonText="Update Post"
  cancelButtonText="Cancel"
/>
```

### GetInputForField

Routes to the appropriate input component based on field type.

**Usage:**
```typescript
import { GetInputForField } from "@/lib/form-generation";

<GetInputForField
  field={field}
  control={control} // from react-hook-form
  disabled={false}
/>
```

### Individual Input Components

Direct usage of specific input types:

```typescript
import { 
  InputText,
  InputNumber, 
  InputSwitch,
  InputDate,
  InputSelect,
  InputRelation 
} from "@/lib/form-generation";

// Text/Textarea
<InputText field={field} control={control} />

// Number
<InputNumber field={field} control={control} />

// Boolean (Switch)
<InputSwitch field={field} control={control} />

// Date
<InputDate field={field} control={control} />

// Select (single/multiple)
<InputSelect 
  field={field} 
  control={control} 
  options={[
    { id: "1", name: "Option 1" },
    { id: "2", name: "Option 2" },
  ]}
/>

// Relation
<InputRelation field={field} control={control} />
```

## Utilities

### createSchema

Generate Yup validation schema from fields:

```typescript
import { createSchema } from "@/lib/form-generation";

const schema = createSchema(fields);
// Use with yupResolver
const methods = useForm({
  resolver: yupResolver(schema),
});
```

### getItemForEdit

Prepare server data for editing:

```typescript
import { getItemForEdit } from "@/lib/form-generation";

const formData = getItemForEdit(fields, serverData);
```

### createFormStructure

Group fields into sections:

```typescript
import { createFormStructure } from "@/lib/form-generation";

const structure = createFormStructure(entityDefinition, fields, "create");
// Returns: { entityDefinition, sections, allFields }
```

## Features

### 1. Automatic Sections

Fields are automatically grouped by `sectionIndex`:

- **sectionIndex: 0** → "General Information" (or custom title)
- **sectionIndex: 1-3** → Custom titles or "Section N"
- Empty sections are automatically hidden

### 2. Conditional Fields

Fields with `foreignKey` and `foreignKeyValue` are shown/hidden dynamically:

```typescript
{
  name: "relatedField",
  foreignKey: "mainField",
  foreignKeyValue: "value1|value2", // Show when mainField = value1 OR value2
  // OR
  foreignKeyValue: "any",          // Show when mainField has any non-empty value
}
```

### 3. Validation

Automatic validation based on field configuration:
- **Required fields**: `required: true`
- **Custom messages**: `requiredText: "..."`
- **Conditional required**: Based on `foreignKey`

### 4. Field Types

Supported field types:
- `text` - Single-line text
- `textarea` - Multi-line text
- `number` - Numeric input
- `boolean` - Switch/Checkbox
- `date` - Date/time picker
- `select` - Single select
- `multipleSelect` - Multiple select
- Relations - Automatic relation handling

### 5. Default Values

Default values are applied automatically:
- From field config: `defaultStringValue`, `defaultNumberValue`, etc.
- From type: empty string, 0, false, null, []

## Integration with Entities

### Using EntityFormWithSections

Alternative to EntityFormClient with automatic sections:

```typescript
import { EntityFormWithSections } from "@/app/[projectId]/entities/[entityDefinitionId]/EntityFormWithSections";

<EntityFormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
/>
```

### Migration from EntityFormClient

To migrate existing code:

**Before:**
```typescript
<EntityFormClient
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
/>
```

**After:**
```typescript
<EntityFormWithSections
  entityDefinition={entityDefinition}
  fields={fields}
  mode="create"
/>
```

No other changes needed! The new component is a drop-in replacement.

## Examples

### Example 1: Simple Create Form

```typescript
function CreatePostPage() {
  const handleSubmit = async (data: Record<string, any>) => {
    await api.posts.create(data);
  };

  return (
    <FormWithSections
      entityDefinition={postsEntity}
      fields={postsFields}
      mode="create"
      onSubmit={handleSubmit}
    />
  );
}
```

### Example 2: Edit Form with Sections

```typescript
function EditPostPage({ post }: { post: Post }) {
  const handleSubmit = async (data: Record<string, any>) => {
    await api.posts.update(post.id, data);
  };

  return (
    <FormWithSections
      entityDefinition={postsEntity}
      fields={postsFields}
      mode="edit"
      initialData={post}
      onSubmit={handleSubmit}
      submitButtonText="Save Changes"
    />
  );
}
```

### Example 3: Custom Section Titles

```typescript
const entityDefinition = {
  name: "Users",
  titleSection0: "Account Information",
  titleSection1: "Personal Details",
  titleSection2: "Security Settings",
  titleSection3: null, // Not used
};

const fields = [
  { name: "email", sectionIndex: 0, ... },
  { name: "password", sectionIndex: 0, ... },
  { name: "firstName", sectionIndex: 1, ... },
  { name: "lastName", sectionIndex: 1, ... },
  { name: "twoFactorEnabled", sectionIndex: 2, ... },
];
```

Result:
- Section 0: "Account Information" (email, password)
- Section 1: "Personal Details" (firstName, lastName)
- Section 2: "Security Settings" (twoFactorEnabled)

## Best Practices

1. **Group Related Fields**: Use sectionIndex to group related fields logically
2. **Custom Titles**: Provide meaningful section titles in entityDefinition
3. **Conditional Fields**: Use foreignKey for dependent fields (limit to 1 level)
4. **Validation Messages**: Provide clear requiredText for better UX
5. **Default Values**: Set sensible defaults for better user experience

## Troubleshooting

### Fields not showing up

- Check `forCreatePage` / `forEditPage` flags
- Verify `sectionIndex` is between 0-3
- Check console for errors

### Validation not working

- Ensure fields have `required: true`
- Check `requiredText` is set
- Verify schema is created correctly

### Sections not rendering

- Ensure fields have `sectionIndex` set
- Check if section has any visible fields
- Verify entity definition has appropriate permissions

## API Reference

See the [API documentation](./API_REFERENCE.md) for detailed information about all types, interfaces, and functions.

