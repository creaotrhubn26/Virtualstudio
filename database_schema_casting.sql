-- Casting Planner Database Schema
-- PostgreSQL schema for persistent storage of casting projects

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Casting Projects table
CREATE TABLE IF NOT EXISTS casting_projects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    production_plan_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB NOT NULL DEFAULT '{}'::jsonb -- Stores the full project structure
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_casting_projects_updated_at ON casting_projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_casting_projects_name ON casting_projects(name);

-- Optional: Separate tables for better normalization (alternative approach)
-- This would allow for better querying but requires more complex joins

-- Roles table (normalized approach - optional)
CREATE TABLE IF NOT EXISTS casting_roles (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    requirements JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'draft',
    scene_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_roles_project_id ON casting_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_roles_status ON casting_roles(status);

-- Candidates table
CREATE TABLE IF NOT EXISTS casting_candidates (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    contact_info JSONB DEFAULT '{}'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    videos JSONB DEFAULT '[]'::jsonb,
    model_url VARCHAR(1000),
    personality VARCHAR(50),
    audition_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_roles JSONB DEFAULT '[]'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_candidates_project_id ON casting_candidates(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_candidates_status ON casting_candidates(status);
CREATE INDEX IF NOT EXISTS idx_casting_candidates_name ON casting_candidates(name);

-- Schedules table
CREATE TABLE IF NOT EXISTS casting_schedules (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    candidate_id VARCHAR(255) NOT NULL,
    role_id VARCHAR(255) NOT NULL,
    scene_id VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(500) NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_schedules_project_id ON casting_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_schedules_candidate_id ON casting_schedules(candidate_id);
CREATE INDEX IF NOT EXISTS idx_casting_schedules_date ON casting_schedules(date);
CREATE INDEX IF NOT EXISTS idx_casting_schedules_status ON casting_schedules(status);

-- Crew members table
CREATE TABLE IF NOT EXISTS casting_crew (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    role VARCHAR(100) NOT NULL,
    contact_info JSONB DEFAULT '{}'::jsonb,
    availability JSONB DEFAULT '{}'::jsonb,
    assigned_scenes JSONB DEFAULT '[]'::jsonb,
    rate DECIMAL(10, 2),
    notes TEXT,
    travel_costs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_crew_project_id ON casting_crew(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_crew_role ON casting_crew(role);

-- Locations table
CREATE TABLE IF NOT EXISTS casting_locations (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    address VARCHAR(1000),
    type VARCHAR(100),
    capacity INTEGER,
    facilities JSONB DEFAULT '[]'::jsonb,
    availability JSONB DEFAULT '{}'::jsonb,
    assigned_scenes JSONB DEFAULT '[]'::jsonb,
    contact_info JSONB DEFAULT '{}'::jsonb,
    coordinates JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_locations_project_id ON casting_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_locations_type ON casting_locations(type);

-- Props table
CREATE TABLE IF NOT EXISTS casting_props (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    availability JSONB DEFAULT '{}'::jsonb,
    assigned_scenes JSONB DEFAULT '[]'::jsonb,
    quantity INTEGER DEFAULT 1,
    location VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_props_project_id ON casting_props(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_props_category ON casting_props(category);

-- Production days table
CREATE TABLE IF NOT EXISTS casting_production_days (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    call_time TIME NOT NULL,
    wrap_time TIME NOT NULL,
    location_id VARCHAR(255),
    scenes JSONB DEFAULT '[]'::jsonb,
    crew JSONB DEFAULT '[]'::jsonb,
    props JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    weather_forecast JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_production_days_project_id ON casting_production_days(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_production_days_date ON casting_production_days(date);
CREATE INDEX IF NOT EXISTS idx_casting_production_days_status ON casting_production_days(status);

-- Shot lists table
CREATE TABLE IF NOT EXISTS casting_shot_lists (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    scene_id VARCHAR(255) NOT NULL,
    shots JSONB DEFAULT '[]'::jsonb,
    camera_settings JSONB DEFAULT '{}'::jsonb,
    equipment JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_shot_lists_project_id ON casting_shot_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_shot_lists_scene_id ON casting_shot_lists(scene_id);

-- User roles table (for sharing/permissions)
CREATE TABLE IF NOT EXISTS casting_user_roles (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL, -- 'owner', 'editor', 'viewer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_casting_user_roles_project_id ON casting_user_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_user_roles_user_id ON casting_user_roles(user_id);

-- Consent table (for candidate consents)
CREATE TABLE IF NOT EXISTS casting_consents (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES casting_projects(id) ON DELETE CASCADE,
    candidate_id VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'photo', 'video', 'personal_data', etc.
    granted BOOLEAN DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_casting_consents_project_id ON casting_consents(project_id);
CREATE INDEX IF NOT EXISTS idx_casting_consents_candidate_id ON casting_consents(candidate_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_casting_projects_updated_at BEFORE UPDATE ON casting_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_roles_updated_at BEFORE UPDATE ON casting_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_candidates_updated_at BEFORE UPDATE ON casting_candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_schedules_updated_at BEFORE UPDATE ON casting_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_crew_updated_at BEFORE UPDATE ON casting_crew
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_locations_updated_at BEFORE UPDATE ON casting_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_props_updated_at BEFORE UPDATE ON casting_props
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_production_days_updated_at BEFORE UPDATE ON casting_production_days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_shot_lists_updated_at BEFORE UPDATE ON casting_shot_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_user_roles_updated_at BEFORE UPDATE ON casting_user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casting_consents_updated_at BEFORE UPDATE ON casting_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();












