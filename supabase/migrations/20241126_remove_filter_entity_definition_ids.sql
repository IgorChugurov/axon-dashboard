-- Migration: Make url nullable and remove filter_entity_definition_ids
-- Date: 2024-11-26
-- Description: 
--   1. Make 'url' column nullable in entity_definition table
--   2. Drop 'filter_entity_definition_ids' column from entity_definition table

-- Step 1: Make url column nullable
ALTER TABLE entity_definition ALTER COLUMN url DROP NOT NULL;

-- Step 2: Drop filter_entity_definition_ids column
ALTER TABLE entity_definition DROP COLUMN IF EXISTS filter_entity_definition_ids;

