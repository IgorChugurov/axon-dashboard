-- Migration: Add UI configuration fields to entity_definition table
-- Date: 2025-11-18
-- Description: Adds fields for UI configuration, pagination settings, and filter configuration

-- Add UI configuration column (JSONB for flexible structure)
ALTER TABLE entity_definition
  ADD COLUMN IF NOT EXISTS ui_config JSONB DEFAULT NULL;

-- Add pagination settings
ALTER TABLE entity_definition
  ADD COLUMN IF NOT EXISTS enable_pagination BOOLEAN DEFAULT true;

ALTER TABLE entity_definition
  ADD COLUMN IF NOT EXISTS page_size INTEGER DEFAULT 20;

-- Add filter settings
ALTER TABLE entity_definition
  ADD COLUMN IF NOT EXISTS enable_filters BOOLEAN DEFAULT false;

ALTER TABLE entity_definition
  ADD COLUMN IF NOT EXISTS filter_entity_definition_ids TEXT[] DEFAULT NULL;

-- Add check constraint for page_size (must be between 1 and 100)
ALTER TABLE entity_definition
  ADD CONSTRAINT entity_definition_page_size_check 
  CHECK (page_size IS NULL OR (page_size >= 1 AND page_size <= 100));

-- Create GIN index for JSONB ui_config field for better query performance
CREATE INDEX IF NOT EXISTS idx_entity_definition_ui_config 
  ON entity_definition USING GIN (ui_config);

-- Create index for filter_entity_definition_ids array
CREATE INDEX IF NOT EXISTS idx_entity_definition_filter_ids 
  ON entity_definition USING GIN (filter_entity_definition_ids);

-- Add comments for documentation
COMMENT ON COLUMN entity_definition.ui_config IS 
  'Partial UI configuration (JSONB) that overrides default values generated from entity name and fields. Structure: { list: {...}, form: {...}, messages: {...} }';

COMMENT ON COLUMN entity_definition.enable_pagination IS 
  'Enable pagination on list page. If false, all data is loaded at once (use for small datasets like tags)';

COMMENT ON COLUMN entity_definition.page_size IS 
  'Number of items per page when pagination is enabled. Default: 20, Range: 1-100';

COMMENT ON COLUMN entity_definition.enable_filters IS 
  'Enable filters on list page. When true, filter_entity_definition_ids defines which entities can be used as filters';

COMMENT ON COLUMN entity_definition.filter_entity_definition_ids IS 
  'Array of entity definition IDs to use as filter options on the list page. Example: ["tag-id", "category-id"]';

