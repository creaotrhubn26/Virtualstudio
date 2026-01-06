"""
Virtual Studio Database Service
Handles CRUD operations for all Virtual Studio data stored in PostgreSQL
Includes: scenes, presets, user library, scene versions, light groups, notes
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

def init_virtual_studio_tables():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_scenes (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    scene_data JSONB NOT NULL DEFAULT '{}',
                    thumbnail TEXT,
                    is_template BOOLEAN DEFAULT FALSE,
                    category VARCHAR(50),
                    tags TEXT[],
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_presets (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    preset_data JSONB NOT NULL DEFAULT '{}',
                    is_default BOOLEAN DEFAULT FALSE,
                    category VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_light_groups (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    scene_id VARCHAR(100),
                    name VARCHAR(255) NOT NULL,
                    lights JSONB NOT NULL DEFAULT '[]',
                    settings JSONB NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_user_assets (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    asset_type VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    file_path TEXT,
                    asset_data JSONB NOT NULL DEFAULT '{}',
                    tags TEXT[],
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_scene_versions (
                    id VARCHAR(100) PRIMARY KEY,
                    scene_id VARCHAR(100) NOT NULL,
                    version_number INTEGER NOT NULL,
                    name VARCHAR(255),
                    scene_data JSONB NOT NULL DEFAULT '{}',
                    created_by VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_notes (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    project_id VARCHAR(100),
                    title VARCHAR(255) NOT NULL,
                    content TEXT,
                    category VARCHAR(50),
                    color VARCHAR(20),
                    is_pinned BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_camera_presets (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    camera_data JSONB NOT NULL DEFAULT '{}',
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS studio_export_templates (
                    id VARCHAR(100) PRIMARY KEY,
                    user_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    template_type VARCHAR(50) NOT NULL,
                    template_data JSONB NOT NULL DEFAULT '{}',
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_scenes_user ON studio_scenes(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_presets_user ON studio_presets(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_presets_type ON studio_presets(type)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_light_groups_scene ON studio_light_groups(scene_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_user_assets_type ON studio_user_assets(asset_type)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_scene_versions_scene ON studio_scene_versions(scene_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_studio_notes_project ON studio_notes(project_id)")
            conn.commit()
            print("Virtual Studio tables initialized")
    finally:
        conn.close()

def _format_row(row: dict) -> dict:
    result = dict(row)
    for key in ['created_at', 'updated_at']:
        if key in result and result[key]:
            result[key] = result[key].isoformat()
    return result

def save_scene(scene: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            scene_id = scene.get('id', f"scene_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_scenes (id, user_id, name, description, scene_data, thumbnail, is_template, category, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    scene_data = EXCLUDED.scene_data,
                    thumbnail = EXCLUDED.thumbnail,
                    is_template = EXCLUDED.is_template,
                    category = EXCLUDED.category,
                    tags = EXCLUDED.tags,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                scene_id,
                user_id,
                scene.get('name', 'Untitled Scene'),
                scene.get('description', ''),
                json.dumps(scene.get('sceneData', scene.get('scene_data', {}))),
                scene.get('thumbnail'),
                scene.get('isTemplate', False),
                scene.get('category'),
                scene.get('tags', [])
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_scenes(user_id: Optional[str] = None, is_template: Optional[bool] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("user_id = %s")
                values.append(user_id)
            if is_template is not None:
                conditions.append("is_template = %s")
                values.append(is_template)
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM studio_scenes {where_clause} ORDER BY updated_at DESC", values)
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def get_scene(scene_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM studio_scenes WHERE id = %s", (scene_id,))
            row = cur.fetchone()
            return _format_row(row) if row else None
    finally:
        conn.close()

def delete_scene(scene_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_scenes WHERE id = %s", (scene_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_preset(preset: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            preset_id = preset.get('id', f"preset_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_presets (id, user_id, name, type, preset_data, is_default, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    preset_data = EXCLUDED.preset_data,
                    is_default = EXCLUDED.is_default,
                    category = EXCLUDED.category,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                preset_id,
                user_id,
                preset.get('name', 'Untitled Preset'),
                preset.get('type', 'lighting'),
                json.dumps(preset.get('presetData', preset.get('preset_data', {}))),
                preset.get('isDefault', False),
                preset.get('category')
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_presets(user_id: Optional[str] = None, preset_type: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("(user_id = %s OR user_id IS NULL)")
                values.append(user_id)
            if preset_type:
                conditions.append("type = %s")
                values.append(preset_type)
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM studio_presets {where_clause} ORDER BY name", values)
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_preset(preset_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_presets WHERE id = %s", (preset_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_light_group(group: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            group_id = group.get('id', f"lightgroup_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_light_groups (id, user_id, scene_id, name, lights, settings)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    lights = EXCLUDED.lights,
                    settings = EXCLUDED.settings,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                group_id,
                user_id,
                group.get('sceneId'),
                group.get('name', 'Light Group'),
                json.dumps(group.get('lights', [])),
                json.dumps(group.get('settings', {}))
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_light_groups(user_id: Optional[str] = None, scene_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("user_id = %s")
                values.append(user_id)
            if scene_id:
                conditions.append("scene_id = %s")
                values.append(scene_id)
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM studio_light_groups {where_clause} ORDER BY name", values)
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_light_group(group_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_light_groups WHERE id = %s", (group_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_user_asset(asset: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            asset_id = asset.get('id', f"asset_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_user_assets (id, user_id, asset_type, name, file_path, asset_data, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    file_path = EXCLUDED.file_path,
                    asset_data = EXCLUDED.asset_data,
                    tags = EXCLUDED.tags,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                asset_id,
                user_id,
                asset.get('assetType', asset.get('type', 'model')),
                asset.get('name', 'Untitled Asset'),
                asset.get('filePath'),
                json.dumps(asset.get('assetData', asset.get('data', {}))),
                asset.get('tags', [])
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_user_assets(user_id: Optional[str] = None, asset_type: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("user_id = %s")
                values.append(user_id)
            if asset_type:
                conditions.append("asset_type = %s")
                values.append(asset_type)
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM studio_user_assets {where_clause} ORDER BY name", values)
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_user_asset(asset_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_user_assets WHERE id = %s", (asset_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_scene_version(version: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            version_id = version.get('id', f"version_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_scene_versions (id, scene_id, version_number, name, scene_data, created_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                version_id,
                version.get('sceneId'),
                version.get('versionNumber', 1),
                version.get('name'),
                json.dumps(version.get('sceneData', {})),
                version.get('createdBy')
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_scene_versions(scene_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM studio_scene_versions WHERE scene_id = %s ORDER BY version_number DESC", (scene_id,))
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_scene_version(version_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_scene_versions WHERE id = %s", (version_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_note(note: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            note_id = note.get('id', f"note_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_notes (id, user_id, project_id, title, content, category, color, is_pinned)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    category = EXCLUDED.category,
                    color = EXCLUDED.color,
                    is_pinned = EXCLUDED.is_pinned,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                note_id,
                user_id,
                note.get('projectId'),
                note.get('title', 'Untitled Note'),
                note.get('content', ''),
                note.get('category'),
                note.get('color'),
                note.get('isPinned', False)
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_notes(user_id: Optional[str] = None, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("user_id = %s")
                values.append(user_id)
            if project_id:
                conditions.append("project_id = %s")
                values.append(project_id)
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM studio_notes {where_clause} ORDER BY is_pinned DESC, updated_at DESC", values)
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_note(note_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_notes WHERE id = %s", (note_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_camera_preset(preset: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            preset_id = preset.get('id', f"campreset_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_camera_presets (id, user_id, name, camera_data, is_default)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    camera_data = EXCLUDED.camera_data,
                    is_default = EXCLUDED.is_default,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                preset_id,
                user_id,
                preset.get('name', 'Camera Preset'),
                json.dumps(preset.get('cameraData', preset.get('camera_data', {}))),
                preset.get('isDefault', False)
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_camera_presets(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if user_id:
                cur.execute("SELECT * FROM studio_camera_presets WHERE user_id = %s OR user_id IS NULL ORDER BY name", (user_id,))
            else:
                cur.execute("SELECT * FROM studio_camera_presets ORDER BY name")
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_camera_preset(preset_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_camera_presets WHERE id = %s", (preset_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()

def save_export_template(template: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            template_id = template.get('id', f"export_{datetime.now().strftime('%Y%m%d%H%M%S')}")
            cur.execute("""
                INSERT INTO studio_export_templates (id, user_id, name, template_type, template_data, is_default)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    template_type = EXCLUDED.template_type,
                    template_data = EXCLUDED.template_data,
                    is_default = EXCLUDED.is_default,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, (
                template_id,
                user_id,
                template.get('name', 'Export Template'),
                template.get('templateType', template.get('type', 'pdf')),
                json.dumps(template.get('templateData', template.get('data', {}))),
                template.get('isDefault', False)
            ))
            conn.commit()
            return _format_row(cur.fetchone())
    finally:
        conn.close()

def get_export_templates(user_id: Optional[str] = None, template_type: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("(user_id = %s OR user_id IS NULL)")
                values.append(user_id)
            if template_type:
                conditions.append("template_type = %s")
                values.append(template_type)
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM studio_export_templates {where_clause} ORDER BY name", values)
            return [_format_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

def delete_export_template(template_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM studio_export_templates WHERE id = %s", (template_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()
