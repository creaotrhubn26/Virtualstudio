"""
Migration script to add post-audition workflow fields
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv('DATABASE_URL', '')

def run_migration():
    """Add post-audition workflow columns and tables"""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Add new columns to casting_candidates for workflow status
            alter_candidates_sql = """
            ALTER TABLE casting_candidates 
            ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS audition_rating INTEGER,
            ADD COLUMN IF NOT EXISTS audition_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS offer_sent_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS offer_accepted_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS contract_status VARCHAR(50),
            ADD COLUMN IF NOT EXISTS contract_signed_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS production_notes TEXT,
            ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS calendar_events JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS shot_assignments JSONB DEFAULT '[]';
            """
            cur.execute(alter_candidates_sql)
            
            # Create casting_offers table for tracking offers
            create_offers_sql = """
            CREATE TABLE IF NOT EXISTS casting_offers (
                id VARCHAR(50) PRIMARY KEY,
                project_id VARCHAR(50) REFERENCES casting_projects(id) ON DELETE CASCADE,
                candidate_id VARCHAR(50) REFERENCES casting_candidates(id) ON DELETE CASCADE,
                role_id VARCHAR(50),
                offer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                response_deadline TIMESTAMP,
                status VARCHAR(50) DEFAULT 'pending',
                compensation TEXT,
                terms TEXT,
                notes TEXT,
                response_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            cur.execute(create_offers_sql)
            
            # Create casting_contracts table
            create_contracts_sql = """
            CREATE TABLE IF NOT EXISTS casting_contracts (
                id VARCHAR(50) PRIMARY KEY,
                project_id VARCHAR(50) REFERENCES casting_projects(id) ON DELETE CASCADE,
                candidate_id VARCHAR(50) REFERENCES casting_candidates(id) ON DELETE CASCADE,
                offer_id VARCHAR(50) REFERENCES casting_offers(id) ON DELETE SET NULL,
                role_id VARCHAR(50),
                contract_type VARCHAR(50),
                start_date DATE,
                end_date DATE,
                compensation TEXT,
                terms TEXT,
                signed_date TIMESTAMP,
                status VARCHAR(50) DEFAULT 'draft',
                document_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            cur.execute(create_contracts_sql)
            
            # Create casting_calendar_events table for production scheduling
            create_calendar_sql = """
            CREATE TABLE IF NOT EXISTS casting_calendar_events (
                id VARCHAR(50) PRIMARY KEY,
                project_id VARCHAR(50) REFERENCES casting_projects(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_type VARCHAR(50) DEFAULT 'general',
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                location_id VARCHAR(50),
                all_day BOOLEAN DEFAULT FALSE,
                candidate_ids JSONB DEFAULT '[]',
                crew_ids JSONB DEFAULT '[]',
                shot_list_ids JSONB DEFAULT '[]',
                notes TEXT,
                status VARCHAR(50) DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            cur.execute(create_calendar_sql)
            
            conn.commit()
            print("Migration completed successfully!")
            print("- Added workflow columns to casting_candidates")
            print("- Created casting_offers table")
            print("- Created casting_contracts table")
            print("- Created casting_calendar_events table")
            
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        import traceback
        print(traceback.format_exc())
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
