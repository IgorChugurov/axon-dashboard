-- Rollback Migration: Remove sections support
-- Date: 2025-11-17
-- Description: Removes section_index from field and title_section_0-3 from entity_definition

-- 1. Remove section titles from entity_definition
ALTER TABLE entity_definition
DROP COLUMN IF EXISTS title_section_0,
DROP COLUMN IF EXISTS title_section_1,
DROP COLUMN IF EXISTS title_section_2,
DROP COLUMN IF EXISTS title_section_3;

-- 2. Remove index
DROP INDEX IF EXISTS idx_field_section_index;

-- 3. Remove section_index from field
ALTER TABLE field
DROP COLUMN IF EXISTS section_index;

