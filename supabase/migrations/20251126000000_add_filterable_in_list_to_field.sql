-- Migration: Add filterable_in_list column to field table
-- Description: Adds a boolean column to control whether a field appears as a filter option in list views

ALTER TABLE field
ADD COLUMN IF NOT EXISTS filterable_in_list BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN field.filterable_in_list IS 'When true, this field will be shown as a filter option in list views';

