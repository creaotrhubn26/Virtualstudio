"""
Branding settings database service.
"""

import os
from typing import Any, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor, Json

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

DEFAULT_BRANDING_ID = "default"


def init_branding_settings_table() -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS branding_settings (
                    id VARCHAR(100) PRIMARY KEY,
                    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
    finally:
        conn.close()


def get_branding_settings(setting_id: str = DEFAULT_BRANDING_ID) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT settings
                FROM branding_settings
                WHERE id = %s
                """,
                (setting_id,),
            )
            row = cur.fetchone()
            return row["settings"] if row else None
    finally:
        conn.close()


def set_branding_settings(settings: Dict[str, Any], setting_id: str = DEFAULT_BRANDING_ID) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO branding_settings (id, settings, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (id)
                DO UPDATE SET settings = EXCLUDED.settings, updated_at = CURRENT_TIMESTAMP
                """,
                (setting_id, Json(settings)),
            )
            conn.commit()
            return settings
    finally:
        conn.close()
