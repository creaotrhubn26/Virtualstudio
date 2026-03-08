"""
User KV settings database service.
"""

import os
from typing import Any, Optional
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


def init_user_kv_tables() -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_kv (
                    user_id VARCHAR(255) NOT NULL,
                    kv_key VARCHAR(255) NOT NULL,
                    kv_value JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, kv_key)
                )
                """
            )
            conn.commit()
    finally:
        conn.close()


def set_user_kv(user_id: str, key: str, value: Any) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_kv (user_id, kv_key, kv_value, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, kv_key)
                DO UPDATE SET kv_value = EXCLUDED.kv_value, updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, key, Json(value)),
            )
            conn.commit()
    finally:
        conn.close()


def get_user_kv(user_id: str, key: str) -> Optional[Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT kv_value
                FROM user_kv
                WHERE user_id = %s AND kv_key = %s
                """,
                (user_id, key),
            )
            row = cur.fetchone()
            return row["kv_value"] if row else None
    finally:
        conn.close()
