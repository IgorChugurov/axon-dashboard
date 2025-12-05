-- Migration: Add sections support to fields and entity definitions
-- Date: 2025-11-17
-- Description: Adds section_index to field and title_section_0-3 to entity_definition

-- 1. Add section_index to field table
ALTER TABLE field
ADD COLUMN IF NOT EXISTS section_index INTEGER DEFAULT 0 NOT NULL;

-- 2. Add section titles to entity_definition table
ALTER TABLE entity_definition
ADD COLUMN IF NOT EXISTS title_section_0 TEXT,
ADD COLUMN IF NOT EXISTS title_section_1 TEXT,
ADD COLUMN IF NOT EXISTS title_section_2 TEXT,
ADD COLUMN IF NOT EXISTS title_section_3 TEXT;

-- 3. Add comments for documentation
COMMENT ON COLUMN field.section_index IS 'Index of the section this field belongs to (0-3). Used for grouping fields in forms.';
COMMENT ON COLUMN entity_definition.title_section_0 IS 'Title for section 0. If null, uses default "General Information".';
COMMENT ON COLUMN entity_definition.title_section_1 IS 'Title for section 1. Optional.';
COMMENT ON COLUMN entity_definition.title_section_2 IS 'Title for section 2. Optional.';
COMMENT ON COLUMN entity_definition.title_section_3 IS 'Title for section 3. Optional.';

-- 4. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_field_section_index ON field(section_index);

-- Verification queries (uncomment to run):
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'field' AND column_name = 'section_index';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'entity_definition' AND column_name LIKE 'title_section_%';

