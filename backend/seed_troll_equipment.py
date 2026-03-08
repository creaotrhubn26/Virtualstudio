#!/usr/bin/env python3
"""
Seed Troll project equipment into the database.
This migrates the mock props data from the frontend into the casting_equipment table.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import uuid

# Import database connection from shared backend DB helper
from tutorials_service import get_db_connection

def seed_troll_equipment():
    """Seed Troll project equipment from mock data"""
    
    # Troll project equipment (from castingService.ts mock data)
    equipment_items = [
        {
            'id': 'equipment_tunnelbore',
            'project_id': 'troll-project-2026',
            'name': 'Tunnelboremaskin',
            'description': 'Full-size tunnelboremaskin for åpningsscenen',
            'category': 'heavy_machinery',
            'quantity': 1,
            'status': 'available',
            'notes': 'Leies fra entreprenør. Krever spesiell transport.',
        },
        {
            'id': 'equipment_hjelmer',
            'project_id': 'troll-project-2026',
            'name': 'Arbeidshjelmer med lys',
            'description': 'Sikkerhetshjelmer med hodelykter for tunnelarbeidere',
            'category': 'safety',
            'quantity': 10,
            'status': 'available',
            'notes': 'HMS-godkjente hjelmer med LED-lys.',
        },
        {
            'id': 'equipment_dynamitt',
            'project_id': 'troll-project-2026',
            'name': 'Dynamitt (prop)',
            'description': 'Falsk dynamitt for tunnelscener',
            'category': 'props',
            'quantity': 20,
            'status': 'available',
            'notes': 'Pyro-avdeling ansvarlig. Realistiske attrapper.',
        },
        {
            'id': 'equipment_fossiler',
            'project_id': 'troll-project-2026',
            'name': 'Fossiler og geologiutstyr',
            'description': 'Diverse fossiler, steiner og paleontologi-utstyr for Noras leilighet og kontor',
            'category': 'props',
            'quantity': 50,
            'status': 'available',
            'notes': 'Kan også leies fra Naturhistorisk Museum.',
        },
        {
            'id': 'equipment_militær',
            'project_id': 'troll-project-2026',
            'name': 'Militærutstyr og våpen',
            'description': 'Militære kjøretøy, våpen (deaktiverte), uniformer',
            'category': 'military',
            'quantity': 100,
            'status': 'reserved',
            'notes': 'Utlån fra Forsvaret. Krever koordinering med PR-avdeling.',
        },
        {
            'id': 'equipment_uvlys',
            'project_id': 'troll-project-2026',
            'name': 'UV-lys / kunstig sollys',
            'description': 'Store UV-lamper som simulerer sollys for klimaksscenen',
            'category': 'lighting',
            'quantity': 20,
            'status': 'available',
            'notes': 'ARRI SkyPanels eller lignende. Kritisk for klimaks.',
        },
        {
            'id': 'equipment_stuntbiler',
            'project_id': 'troll-project-2026',
            'name': 'Stunt-biler for E6',
            'description': 'Biler preparert for krasj og stunt på E6',
            'category': 'vehicles',
            'quantity': 15,
            'status': 'reserved',
            'notes': 'Stunt-koordinator ansvarlig. Krever forsikring.',
        },
        {
            'id': 'equipment_kirkeklokker',
            'project_id': 'troll-project-2026',
            'name': 'Kirkeklokker (lydopptak)',
            'description': 'Opptak av kirkeklokker for klimaksscenen',
            'category': 'audio',
            'quantity': 1,
            'status': 'available',
            'notes': 'Lydavdeling spiller inn fra Nidarosdomen.',
        },
        {
            'id': 'equipment_trolldrakt',
            'project_id': 'troll-project-2026',
            'name': 'Trolldrakt / motion capture',
            'description': 'Motion capture drakter for trollanimasjon',
            'category': 'vfx',
            'quantity': 3,
            'status': 'in_use',
            'notes': 'Xsens MVN-drakter. VFX-avdeling.',
        },
        {
            'id': 'equipment_drone',
            'project_id': 'troll-project-2026',
            'name': 'Drone-utstyr',
            'description': 'DJI Inspire 2 og Matrice for aerial shots',
            'category': 'camera',
            'quantity': 2,
            'status': 'available',
            'notes': 'Krever flytillatelse fra Avinor/Luftfartstilsynet.',
        },
        {
            'id': 'equipment_steadicam',
            'project_id': 'troll-project-2026',
            'name': 'Steadicam / Gimbal',
            'description': 'ARRI Trinity og DJI Ronin for stabile bevegelige shots',
            'category': 'camera',
            'quantity': 2,
            'status': 'available',
            'notes': 'Operatør inkludert i utstyrsleje.',
        },
        {
            'id': 'equipment_generator',
            'project_id': 'troll-project-2026',
            'name': 'Generatorer',
            'description': 'Dieselgeneratorer for strømforsyning på location',
            'category': 'power',
            'quantity': 4,
            'status': 'available',
            'notes': 'Stille generatorer for lydopptak.',
        },
    ]
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # First check if equipment table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'casting_equipment'
                )
            """)
            if not cur.fetchone()['exists']:
                print("Error: casting_equipment table does not exist. Run migrate_equipment.py first.")
                return False
            
            # Check if equipment already seeded
            cur.execute("SELECT COUNT(*) as count FROM casting_equipment WHERE project_id = 'troll-project-2026'")
            existing = cur.fetchone()['count']
            if existing > 0:
                print(f"Troll equipment already seeded ({existing} items). Skipping.")
                return True
            
            # Insert equipment
            for item in equipment_items:
                cur.execute("""
                    INSERT INTO casting_equipment 
                    (id, project_id, name, description, category, quantity, status, notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    item['id'],
                    item['project_id'],
                    item['name'],
                    item['description'],
                    item['category'],
                    item['quantity'],
                    item['status'],
                    item['notes'],
                    datetime.now(),
                    datetime.now(),
                ))
            
            conn.commit()
            print(f"Successfully seeded {len(equipment_items)} equipment items for Troll project")
            return True
            
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    seed_troll_equipment()
