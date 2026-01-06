"""
Tutorials Database Service
Handles CRUD operations for tutorials stored in PostgreSQL
"""

import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL_RAW = os.getenv(
    'DATABASE_URL',
    'postgresql://neondb_owner:npg_vgy4STuQ8Mja@ep-soft-pond-ag9vm5a4-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
)
DATABASE_URL = DATABASE_URL_RAW.strip()
if DATABASE_URL.startswith('psql '):
    DATABASE_URL = DATABASE_URL[5:].strip()
if DATABASE_URL.startswith("'") and DATABASE_URL.endswith("'"):
    DATABASE_URL = DATABASE_URL[1:-1]
elif DATABASE_URL.startswith('"') and DATABASE_URL.endswith('"'):
    DATABASE_URL = DATABASE_URL[1:-1]

def get_db_connection():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL not set")
    return psycopg2.connect(DATABASE_URL)

def init_tutorials_table():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutorials (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(50) NOT NULL DEFAULT 'casting-planner',
                    steps JSONB NOT NULL DEFAULT '[]',
                    is_active BOOLEAN DEFAULT FALSE,
                    created_by VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutorials_is_active ON tutorials(is_active)
            """)
            conn.commit()
            print("Tutorials table initialized")
    finally:
        conn.close()

def create_tutorial(tutorial: Dict[str, Any], created_by: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            tutorial_id = tutorial.get('id', f"tutorial_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO tutorials (id, name, description, category, steps, is_active, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, description, category, steps, is_active, created_by, created_at, updated_at
            """, (
                tutorial_id,
                tutorial.get('name', 'Ny veiledning'),
                tutorial.get('description', ''),
                tutorial.get('category', 'casting-planner'),
                json.dumps(tutorial.get('steps', [])),
                tutorial.get('isActive', False),
                created_by
            ))
            conn.commit()
            result = dict(cur.fetchone())
            result['isActive'] = result.pop('is_active')
            result['createdBy'] = result.pop('created_by')
            result['createdAt'] = result['created_at'].isoformat() if result['created_at'] else None
            result['updatedAt'] = result['updated_at'].isoformat() if result['updated_at'] else None
            del result['created_at']
            del result['updated_at']
            return result
    finally:
        conn.close()

def get_all_tutorials(category: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if category:
                cur.execute("""
                    SELECT id, name, description, category, steps, is_active, created_by, created_at, updated_at
                    FROM tutorials
                    WHERE category = %s
                    ORDER BY created_at DESC
                """, (category,))
            else:
                cur.execute("""
                    SELECT id, name, description, category, steps, is_active, created_by, created_at, updated_at
                    FROM tutorials
                    ORDER BY created_at DESC
                """)
            tutorials = []
            for row in cur.fetchall():
                tutorial = dict(row)
                tutorial['isActive'] = tutorial.pop('is_active')
                tutorial['createdBy'] = tutorial.pop('created_by')
                tutorial['createdAt'] = tutorial['created_at'].isoformat() if tutorial['created_at'] else None
                tutorial['updatedAt'] = tutorial['updated_at'].isoformat() if tutorial['updated_at'] else None
                del tutorial['created_at']
                del tutorial['updated_at']
                tutorials.append(tutorial)
            return tutorials
    finally:
        conn.close()

def get_tutorial(tutorial_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, description, category, steps, is_active, created_by, created_at, updated_at
                FROM tutorials
                WHERE id = %s
            """, (tutorial_id,))
            row = cur.fetchone()
            if not row:
                return None
            tutorial = dict(row)
            tutorial['isActive'] = tutorial.pop('is_active')
            tutorial['createdBy'] = tutorial.pop('created_by')
            tutorial['createdAt'] = tutorial['created_at'].isoformat() if tutorial['created_at'] else None
            tutorial['updatedAt'] = tutorial['updated_at'].isoformat() if tutorial['updated_at'] else None
            del tutorial['created_at']
            del tutorial['updated_at']
            return tutorial
    finally:
        conn.close()

def update_tutorial(tutorial_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            set_clauses = ["updated_at = CURRENT_TIMESTAMP"]
            values = []
            
            if 'name' in updates:
                set_clauses.append("name = %s")
                values.append(updates['name'])
            if 'description' in updates:
                set_clauses.append("description = %s")
                values.append(updates['description'])
            if 'category' in updates:
                set_clauses.append("category = %s")
                values.append(updates['category'])
            if 'steps' in updates:
                set_clauses.append("steps = %s")
                values.append(json.dumps(updates['steps']))
            if 'isActive' in updates:
                set_clauses.append("is_active = %s")
                values.append(updates['isActive'])
            
            values.append(tutorial_id)
            
            cur.execute(f"""
                UPDATE tutorials
                SET {', '.join(set_clauses)}
                WHERE id = %s
                RETURNING id, name, description, category, steps, is_active, created_by, created_at, updated_at
            """, values)
            conn.commit()
            row = cur.fetchone()
            if not row:
                return None
            tutorial = dict(row)
            tutorial['isActive'] = tutorial.pop('is_active')
            tutorial['createdBy'] = tutorial.pop('created_by')
            tutorial['createdAt'] = tutorial['created_at'].isoformat() if tutorial['created_at'] else None
            tutorial['updatedAt'] = tutorial['updated_at'].isoformat() if tutorial['updated_at'] else None
            del tutorial['created_at']
            del tutorial['updated_at']
            return tutorial
    finally:
        conn.close()

def delete_tutorial(tutorial_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tutorials WHERE id = %s", (tutorial_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def set_active_tutorial(tutorial_id: str, category: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE tutorials SET is_active = FALSE WHERE category = %s", (category,))
            cur.execute("UPDATE tutorials SET is_active = TRUE WHERE id = %s", (tutorial_id,))
            conn.commit()
            return True
    finally:
        conn.close()

def get_active_tutorial(category: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, description, category, steps, is_active, created_by, created_at, updated_at
                FROM tutorials
                WHERE category = %s AND is_active = TRUE
                LIMIT 1
            """, (category,))
            row = cur.fetchone()
            if not row:
                return None
            tutorial = dict(row)
            tutorial['isActive'] = tutorial.pop('is_active')
            tutorial['createdBy'] = tutorial.pop('created_by')
            tutorial['createdAt'] = tutorial['created_at'].isoformat() if tutorial['created_at'] else None
            tutorial['updatedAt'] = tutorial['updated_at'].isoformat() if tutorial['updated_at'] else None
            del tutorial['created_at']
            del tutorial['updated_at']
            return tutorial
    finally:
        conn.close()
