"""
Equipment Management Database Migration
Creates tables for equipment/assets with crew, calendar, and location integration
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os

def run_migration():
    """Run the equipment management database migration"""
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL not set, skipping migration")
        return False
    
    conn = None
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Equipment/Assets table (Utstyr)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment (
                id VARCHAR(255) PRIMARY KEY,
                project_id VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                brand VARCHAR(255),
                model VARCHAR(255),
                serial_number VARCHAR(255),
                quantity INTEGER DEFAULT 1,
                condition VARCHAR(50) DEFAULT 'good',
                primary_location_id VARCHAR(255),
                purchase_date DATE,
                purchase_price DECIMAL(12, 2),
                notes TEXT,
                image_url TEXT,
                status VARCHAR(50) DEFAULT 'available',
                is_global BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment assignments (Utstyrsansvarlige)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_assignments (
                id VARCHAR(255) PRIMARY KEY,
                equipment_id VARCHAR(255) NOT NULL,
                crew_id VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'responsible',
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                UNIQUE(equipment_id, crew_id)
            )
        """)
        
        # Equipment bookings (Utstyrsbookinger)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_bookings (
                id VARCHAR(255) PRIMARY KEY,
                equipment_id VARCHAR(255) NOT NULL,
                event_id VARCHAR(255),
                project_id VARCHAR(255) NOT NULL,
                booked_by VARCHAR(255),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                start_time TIME,
                end_time TIME,
                quantity INTEGER DEFAULT 1,
                purpose TEXT,
                status VARCHAR(50) DEFAULT 'confirmed',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment availability (Utstyrstilgjengelighet)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_availability (
                id VARCHAR(255) PRIMARY KEY,
                equipment_id VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'unavailable',
                reason VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment-Location junction (for multiple storage locations)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_locations (
                id VARCHAR(255) PRIMARY KEY,
                equipment_id VARCHAR(255) NOT NULL,
                location_id VARCHAR(255) NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                notes TEXT,
                UNIQUE(equipment_id, location_id)
            )
        """)
        
        # Add equipment_ids to calendar events if not exists
        cur.execute("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'casting_calendar_events' AND column_name = 'equipment_ids'
                ) THEN 
                    ALTER TABLE casting_calendar_events ADD COLUMN equipment_ids TEXT[];
                END IF;
            END $$
        """)
        
        # Create indexes for performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_project ON casting_equipment(project_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_category ON casting_equipment(category)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_status ON casting_equipment(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_location ON casting_equipment(primary_location_id)")
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment ON casting_equipment_assignments(equipment_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_assignments_crew ON casting_equipment_assignments(crew_id)")
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_bookings_equipment ON casting_equipment_bookings(equipment_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_bookings_dates ON casting_equipment_bookings(start_date, end_date)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_bookings_event ON casting_equipment_bookings(event_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_bookings_project ON casting_equipment_bookings(project_id)")
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_availability_equipment ON casting_equipment_availability(equipment_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_availability_dates ON casting_equipment_availability(start_date, end_date)")
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_locations_equipment ON casting_equipment_locations(equipment_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_locations_location ON casting_equipment_locations(location_id)")
        
        # Equipment Templates (Utstyrs-maler)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_templates (
                id VARCHAR(255) PRIMARY KEY,
                project_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                use_case VARCHAR(255),
                is_default BOOLEAN DEFAULT FALSE,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment Template Items (Mal-elementer)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_template_items (
                id VARCHAR(255) PRIMARY KEY,
                template_id VARCHAR(255) NOT NULL REFERENCES casting_equipment_templates(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                brand VARCHAR(255),
                model VARCHAR(255),
                quantity INTEGER DEFAULT 1,
                is_required BOOLEAN DEFAULT TRUE,
                external_url TEXT,
                estimated_price DECIMAL(12, 2),
                notes TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Foto.no Product Links (Produktlenker)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS casting_equipment_vendor_links (
                id VARCHAR(255) PRIMARY KEY,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                vendor_name VARCHAR(255) DEFAULT 'foto.no',
                product_name VARCHAR(255) NOT NULL,
                product_url TEXT NOT NULL,
                affiliate_url TEXT,
                price DECIMAL(12, 2),
                image_url TEXT,
                description TEXT,
                is_recommended BOOLEAN DEFAULT FALSE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_templates_project ON casting_equipment_templates(project_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_template_items_template ON casting_equipment_template_items(template_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_vendor_links_category ON casting_equipment_vendor_links(category)")
        
        conn.commit()
        print("Equipment management tables created successfully")
        return True
        
    except psycopg2.Error as e:
        print(f"Database error during equipment migration: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
