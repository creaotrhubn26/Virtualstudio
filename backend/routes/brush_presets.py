"""Brush presets API (for storyboard drawing tools) — extracted from backend/main.py.

The inline version relied on a module-level `get_db_connection` that was
never actually imported at top level — it would raise NameError on first
call. This extraction imports the helper explicitly so the routes work.
"""

import json
import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/user/brush-presets", tags=["brush_presets"])


def _db_or_503():
    try:
        from tutorials_service import get_db_connection
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Database helper not available: {exc}"
        )
    return get_db_connection()


def _serialize_row(row):
    if row is None:
        return None
    result = dict(row) if hasattr(row, "keys") else row
    for key, value in list(result.items()):
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = float(value)
    return result


@router.get("")
async def api_get_brush_presets():
    """Get all user brush presets."""
    try:
        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_brush_presets (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    config JSONB NOT NULL DEFAULT '{}',
                    category VARCHAR(100),
                    is_favorite BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
            cur.execute(
                "SELECT * FROM user_brush_presets ORDER BY is_favorite DESC, name"
            )
            presets = cur.fetchall()
        conn.close()
        return JSONResponse(
            {"success": True, "presets": [_serialize_row(p) for p in presets]}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def api_get_recent_brushes():
    """Get recently used brush IDs."""
    try:
        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_brush_recent (
                    id SERIAL PRIMARY KEY,
                    preset_id VARCHAR(255) NOT NULL,
                    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
            cur.execute(
                """
                SELECT DISTINCT ON (preset_id) preset_id
                FROM user_brush_recent
                ORDER BY preset_id, used_at DESC
                LIMIT 10
                """
            )
            recent = [r["preset_id"] for r in cur.fetchall()]
        conn.close()
        return JSONResponse({"success": True, "recentlyUsed": recent})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def api_create_brush_preset(request: Request):
    """Create a new brush preset."""
    try:
        data = await request.json()
        preset_id = data.get("id") or f"brush_{uuid.uuid4().hex[:12]}"

        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO user_brush_presets (id, name, description, config, category, is_favorite)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    preset_id,
                    data.get("name"),
                    data.get("description"),
                    json.dumps(data.get("config", {})),
                    data.get("category"),
                    data.get("isFavorite", False),
                ),
            )
            preset = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "preset": _serialize_row(preset)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("")
async def api_update_brush_preset(request: Request):
    """Update an existing brush preset."""
    try:
        data = await request.json()
        preset_id = data.get("id")
        if not preset_id:
            raise HTTPException(status_code=400, detail="Preset ID required")

        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE user_brush_presets
                SET name = COALESCE(%s, name),
                    description = COALESCE(%s, description),
                    config = COALESCE(%s, config),
                    category = COALESCE(%s, category),
                    is_favorite = COALESCE(%s, is_favorite),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (
                    data.get("name"),
                    data.get("description"),
                    json.dumps(data.get("config")) if data.get("config") else None,
                    data.get("category"),
                    data.get("isFavorite"),
                    preset_id,
                ),
            )
            preset = cur.fetchone()
            conn.commit()
        conn.close()
        if preset:
            return JSONResponse({"success": True, "preset": _serialize_row(preset)})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{preset_id}")
async def api_delete_brush_preset(preset_id: str):
    """Delete a brush preset."""
    try:
        conn = _db_or_503()
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_brush_presets WHERE id = %s RETURNING id",
                (preset_id,),
            )
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/recent")
async def api_mark_brush_recent(request: Request):
    """Mark a brush as recently used."""
    try:
        data = await request.json()
        preset_id = data.get("presetId")
        if not preset_id:
            raise HTTPException(status_code=400, detail="Preset ID required")

        conn = _db_or_503()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_brush_recent (preset_id) VALUES (%s)",
                (preset_id,),
            )
            cur.execute(
                """
                DELETE FROM user_brush_recent
                WHERE id NOT IN (
                    SELECT id FROM user_brush_recent ORDER BY used_at DESC LIMIT 50
                )
                """
            )
            conn.commit()
        conn.close()
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{preset_id}/favorite")
async def api_toggle_brush_favorite(preset_id: str, request: Request):
    """Toggle favorite status of a brush preset."""
    try:
        data = await request.json()
        is_favorite = data.get("isFavorite", False)

        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE user_brush_presets
                SET is_favorite = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (is_favorite, preset_id),
            )
            preset = cur.fetchone()
            conn.commit()
        conn.close()
        if preset:
            return JSONResponse({"success": True, "preset": _serialize_row(preset)})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def api_batch_import_brush_presets(request: Request):
    """Batch import brush presets."""
    try:
        data = await request.json()
        presets = data.get("presets", [])

        conn = _db_or_503()
        imported = []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for preset in presets:
                preset_id = preset.get("id") or f"brush_{uuid.uuid4().hex[:12]}"
                cur.execute(
                    """
                    INSERT INTO user_brush_presets (id, name, description, config, category, is_favorite)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        config = EXCLUDED.config,
                        category = EXCLUDED.category,
                        is_favorite = EXCLUDED.is_favorite,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    (
                        preset_id,
                        preset.get("name"),
                        preset.get("description"),
                        json.dumps(preset.get("config", {})),
                        preset.get("category"),
                        preset.get("isFavorite", False),
                    ),
                )
                imported.append(_serialize_row(cur.fetchone()))
            conn.commit()
        conn.close()
        return JSONResponse(
            {"success": True, "imported": len(imported), "presets": imported}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
