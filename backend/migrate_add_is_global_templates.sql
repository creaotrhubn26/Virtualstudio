-- Migration: Add is_global column to casting_equipment_templates table
-- This allows templates to be shared across all projects

-- Make project_id nullable (allows global templates)
ALTER TABLE casting_equipment_templates ALTER COLUMN project_id DROP NOT NULL;

-- Add is_global column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'casting_equipment_templates' AND column_name = 'is_global') THEN
        ALTER TABLE casting_equipment_templates ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create index for faster global template queries
CREATE INDEX IF NOT EXISTS idx_casting_equipment_templates_is_global ON casting_equipment_templates(is_global);

SELECT 'Migration completed: is_global added to casting_equipment_templates' as result;
