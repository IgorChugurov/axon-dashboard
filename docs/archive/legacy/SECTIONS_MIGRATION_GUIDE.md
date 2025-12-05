# Form Sections Migration Guide

## Overview

This migration adds support for organizing form fields into sections (0-3) with customizable titles.

## Database Changes

### New Fields in `fields` table:

- `sectionIndex` (INTEGER, DEFAULT 0, NOT NULL) - Section number (0-3) for grouping fields

### New Fields in `entity_definitions` table:

- `titleSection0` (TEXT, nullable) - Title for section 0 (default: "General Information")
- `titleSection1` (TEXT, nullable) - Title for section 1
- `titleSection2` (TEXT, nullable) - Title for section 2
- `titleSection3` (TEXT, nullable) - Title for section 3

## Migration Steps

### 1. Apply the migration SQL

Run the migration script in your Supabase SQL editor:

```bash
# Location of migration files:
docs/implementation/migrations/add_sections_support.sql
```

Or directly in Supabase dashboard:

1. Go to SQL Editor
2. Copy contents of `add_sections_support.sql`
3. Click "Run"

### 2. Verify migration

Check that columns were added:

```sql
-- Verify field table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'field' AND column_name = 'section_index';

-- Verify entity_definition table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'entity_definition'
AND column_name LIKE 'title_section_%';
```

Expected output:

- `field.section_index`: INTEGER, default 0
- `entity_definition.title_section_0-3`: TEXT, nullable

### 3. TypeScript types already updated

The following files have been updated with new fields:

- ✅ `entity-lib/types/field.ts` - added `sectionIndex`
- ✅ `entity-lib/types/entityDefinition.ts` - added `titleSection0-3`
- ✅ `lib/universal-entity/types.ts` - synchronized types

### 4. UI forms already updated

The following components now support new fields:

- ✅ `FieldForm.tsx` - includes sectionIndex input
- ✅ `EntityDefinitionForm.tsx` - includes section title inputs

## Usage

### Setting Section Index for Fields

When creating/editing a field, you can now specify the section index (0-3):

```typescript
{
  name: "email",
  label: "Email Address",
  sectionIndex: 0, // Will appear in section 0
  // ... other field properties
}
```

### Setting Section Titles

When creating/editing an entity definition:

```typescript
{
  name: "Users",
  titleSection0: "Basic Information",    // Custom title for section 0
  titleSection1: "Contact Details",      // Custom title for section 1
  titleSection2: "Preferences",          // Custom title for section 2
  titleSection3: null,                   // No section 3 needed
  // ... other properties
}
```

## Default Behavior

- **New fields**: automatically get `sectionIndex = 0` (from DB default)
- **Existing fields**: retain their data; will be treated as `sectionIndex = 0`
- **Section titles**: if not specified, section 0 uses "General Information", others use "Section N"
- **Empty sections**: sections without visible fields are not rendered

## Rollback

If needed, you can rollback the migration:

```bash
# Run rollback script
docs/implementation/migrations/rollback_add_sections_support.sql
```

⚠️ **Warning**: This will remove the `section_index` column and all section title data.

## Next Steps

After applying this migration:

1. ✅ Fields can be grouped into sections
2. ⏳ Implement FormWithSections component (Phase 2-4)
3. ⏳ Update EntityFormClient to use sections
4. ⏳ Test form generation with sections

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution**: The migration is idempotent. If columns already exist, the migration will skip them.

### Issue: TypeScript errors about missing properties

**Solution**: Ensure you've restarted your TypeScript server and cleared build cache.

### Issue: Forms don't show section titles

**Solution**: The FormWithSections component hasn't been implemented yet (Phase 4).

## Related Files

- Migration: `docs/implementation/migrations/add_sections_support.sql`
- Rollback: `docs/implementation/migrations/rollback_add_sections_support.sql`
- Types: `entity-lib/types/*.ts`, `lib/universal-entity/types.ts`
- Forms: `components/entity-definition/FieldForm.tsx`, `EntityDefinitionForm.tsx`
