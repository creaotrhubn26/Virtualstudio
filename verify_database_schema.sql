-- Database Schema Verification Script
-- This script verifies that all required tables and columns exist in PostgreSQL

-- Check if casting_projects table exists and has all columns
SELECT 
    'casting_projects' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'casting_projects'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'casting_projects'
GROUP BY table_name;

-- Check split_sheets table
SELECT 
    'split_sheets' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'split_sheets'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'split_sheets'
GROUP BY table_name;

-- Check split_sheet_contributors table
SELECT 
    'split_sheet_contributors' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'split_sheet_contributors'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'split_sheet_contributors'
GROUP BY table_name;

-- Check split_sheet_songflow_links table
SELECT 
    'split_sheet_songflow_links' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'split_sheet_songflow_links'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'split_sheet_songflow_links'
GROUP BY table_name;

-- List all casting-related tables
SELECT 
    table_name,
    (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
     FROM information_schema.columns c 
     WHERE c.table_schema = 'public' AND c.table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND (table_name LIKE 'casting_%' OR table_name LIKE 'split_%')
ORDER BY table_name;

-- Verify critical columns exist in split_sheet_contributors
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'split_sheet_contributors'
  AND column_name IN ('id', 'split_sheet_id', 'name', 'email', 'role', 'percentage', 'custom_fields', 'notes', 'order_index')
ORDER BY column_name;

-- Verify critical columns exist in casting_projects
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'casting_projects'
  AND column_name IN ('id', 'name', 'description', 'production_plan_id', 'data', 'created_at', 'updated_at')
ORDER BY column_name;





