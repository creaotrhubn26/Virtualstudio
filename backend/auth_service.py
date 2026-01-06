"""
Simple Admin Authentication Service
Handles admin user management with email/password authentication
"""

import os
import secrets
import hashlib
import string
from datetime import datetime
from typing import Optional, List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection string from environment
DATABASE_URL_RAW = os.getenv(
    'DATABASE_URL',
    'postgresql://neondb_owner:npg_vgy4STuQ8Mja@ep-soft-pond-ag9vm5a4-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
)
# Clean up DATABASE_URL - remove 'psql ' prefix and strip quotes if present
DATABASE_URL = DATABASE_URL_RAW.strip()
if DATABASE_URL.startswith('psql '):
    DATABASE_URL = DATABASE_URL[5:].strip()
if DATABASE_URL.startswith("'") and DATABASE_URL.endswith("'"):
    DATABASE_URL = DATABASE_URL[1:-1]
elif DATABASE_URL.startswith('"') and DATABASE_URL.endswith('"'):
    DATABASE_URL = DATABASE_URL[1:-1]

def get_db_connection():
    """Get database connection."""
    if not DATABASE_URL:
        raise Exception("DATABASE_URL not set")
    return psycopg2.connect(DATABASE_URL)

def init_admin_table():
    """Initialize the admin_users table."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS admin_users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'admin',
                    display_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)
            conn.commit()
            print("Admin users table initialized")
    finally:
        conn.close()

def generate_password(length: int = 12) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, hashed = password_hash.split(':')
        return hashlib.sha256((salt + password).encode()).hexdigest() == hashed
    except:
        return False

def create_admin_user(email: str, password: str, role: str = 'admin', display_name: Optional[str] = None) -> Dict[str, Any]:
    """Create a new admin user."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            password_hash = hash_password(password)
            cur.execute("""
                INSERT INTO admin_users (email, password_hash, role, display_name)
                VALUES (%s, %s, %s, %s)
                RETURNING id, email, role, display_name, created_at, is_active
            """, (email.lower(), password_hash, role, display_name or email.split('@')[0]))
            conn.commit()
            user = dict(cur.fetchone())
            user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
            return user
    except psycopg2.errors.UniqueViolation:
        raise Exception(f"User with email {email} already exists")
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate a user by email and password."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, email, password_hash, role, display_name, is_active
                FROM admin_users
                WHERE email = %s
            """, (email.lower(),))
            user = cur.fetchone()
            
            if not user:
                return None
            
            if not user['is_active']:
                return None
            
            if not verify_password(password, user['password_hash']):
                return None
            
            cur.execute("""
                UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = %s
            """, (user['id'],))
            conn.commit()
            
            return {
                'id': user['id'],
                'email': user['email'],
                'role': user['role'],
                'display_name': user['display_name']
            }
    finally:
        conn.close()

def get_all_admins() -> List[Dict[str, Any]]:
    """Get all admin users."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, email, role, display_name, created_at, last_login, is_active
                FROM admin_users
                ORDER BY created_at DESC
            """)
            users = []
            for row in cur.fetchall():
                user = dict(row)
                user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
                user['last_login'] = user['last_login'].isoformat() if user['last_login'] else None
                users.append(user)
            return users
    finally:
        conn.close()

def update_admin_user(user_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an admin user."""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            set_clauses = []
            values = []
            
            if 'role' in updates:
                set_clauses.append("role = %s")
                values.append(updates['role'])
            if 'display_name' in updates:
                set_clauses.append("display_name = %s")
                values.append(updates['display_name'])
            if 'is_active' in updates:
                set_clauses.append("is_active = %s")
                values.append(updates['is_active'])
            if 'password' in updates:
                set_clauses.append("password_hash = %s")
                values.append(hash_password(updates['password']))
            
            if not set_clauses:
                return None
            
            values.append(user_id)
            cur.execute(f"""
                UPDATE admin_users 
                SET {', '.join(set_clauses)}
                WHERE id = %s
                RETURNING id, email, role, display_name, is_active
            """, values)
            conn.commit()
            
            result = cur.fetchone()
            return dict(result) if result else None
    finally:
        conn.close()

def delete_admin_user(user_id: int) -> bool:
    """Delete an admin user."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM admin_users WHERE id = %s", (user_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def get_admin_count() -> int:
    """Get total number of admin users."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM admin_users WHERE is_active = TRUE")
            return cur.fetchone()[0]
    finally:
        conn.close()
