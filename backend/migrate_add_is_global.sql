-- Migration: Add is_global column to casting_equipment table
-- This allows equipment to be shared across all projects

-- Make project_id nullable (for global equipment)
ALTER TABLE casting_equipment ALTER COLUMN project_id DROP NOT NULL;

-- Add is_global column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'casting_equipment' AND column_name = 'is_global'
    ) THEN
        ALTER TABLE casting_equipment ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_casting_equipment_is_global ON casting_equipment(is_global);
CREATE INDEX IF NOT EXISTS idx_casting_equipment_project_id ON casting_equipment(project_id);

-- ============================================
-- Also add is_global to equipment templates
-- ============================================

-- Make project_id nullable for templates (for global templates)
ALTER TABLE casting_equipment_templates ALTER COLUMN project_id DROP NOT NULL;

-- Add is_global column to templates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'casting_equipment_templates' AND column_name = 'is_global'
    ) THEN
        ALTER TABLE casting_equipment_templates ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_casting_equipment_templates_is_global ON casting_equipment_templates(is_global);
CREATE INDEX IF NOT EXISTS idx_casting_equipment_templates_project_id ON casting_equipment_templates(project_id);
