"""
App settings database service for user/project scoped settings.
"""

from typing import Any, Dict, List, Optional
from psycopg2.extras import RealDictCursor, Json
from casting_favorites_service import get_db_connection

DEFAULT_PROJECT_ID = ""


def init_settings_table() -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS app_settings (
                    user_id VARCHAR(255) NOT NULL,
                    project_id VARCHAR(255) NOT NULL DEFAULT '',
                    namespace VARCHAR(255) NOT NULL,
                    data JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, project_id, namespace)
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_app_settings_namespace
                ON app_settings (namespace)
                """
            )
            conn.commit()
    finally:
        conn.close()


def _normalize_project_id(project_id: Optional[str]) -> str:
    return project_id or DEFAULT_PROJECT_ID


def get_settings(user_id: str, namespace: str, project_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT data
                FROM app_settings
                WHERE user_id = %s AND project_id = %s AND namespace = %s
                """,
                (user_id, _normalize_project_id(project_id), namespace),
            )
            row = cur.fetchone()
            return row["data"] if row else None
    finally:
        conn.close()


def list_settings(user_id: str, namespace_prefix: str, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            values = [user_id, f"{namespace_prefix}%"]
            clause = "user_id = %s AND namespace LIKE %s"
            if project_id is not None:
                clause += " AND project_id = %s"
                values.append(_normalize_project_id(project_id))
            cur.execute(
                f"SELECT project_id, namespace, data FROM app_settings WHERE {clause}",
                values,
            )
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def set_settings(user_id: str, namespace: str, data: Dict[str, Any], project_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_settings (user_id, project_id, namespace, data, updated_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, project_id, namespace)
                DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, _normalize_project_id(project_id), namespace, Json(data)),
            )
            conn.commit()
            return data
    finally:
        conn.close()


def delete_settings(user_id: str, namespace: str, project_id: Optional[str] = None) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM app_settings
                WHERE user_id = %s AND project_id = %s AND namespace = %s
                """,
                (user_id, _normalize_project_id(project_id), namespace),
            )
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()
