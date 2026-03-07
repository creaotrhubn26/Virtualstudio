"""
User KV settings database service.
"""

from typing import Any, Optional
from psycopg2.extras import RealDictCursor, Json
from casting_favorites_service import get_db_connection


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
