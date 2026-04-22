"""Story logic API routes — extracted from backend/main.py.

Pre-writing validation scaffolding (concept / logline / theme) persisted in
the ``project_story_logic`` table.
"""

import json
import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/projects/{project_id}/story-logic", tags=["story_logic"])


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
async def api_get_story_logic(project_id: str):
    """Get story logic data for a project (concept, logline, theme)."""
    try:
        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS project_story_logic (
                    id VARCHAR(255) PRIMARY KEY,
                    project_id VARCHAR(255) NOT NULL UNIQUE,
                    concept_data JSONB DEFAULT '{}',
                    logline_data JSONB DEFAULT '{}',
                    theme_data JSONB DEFAULT '{}',
                    current_phase INTEGER DEFAULT 1,
                    phase_status JSONB DEFAULT '{"concept":"incomplete","logline":"incomplete","theme":"incomplete"}',
                    is_locked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
            cur.execute(
                "SELECT * FROM project_story_logic WHERE project_id = %s",
                (project_id,),
            )
            record = cur.fetchone()
        conn.close()

        if record:
            story_logic = {
                "concept": record.get("concept_data", {}),
                "logline": record.get("logline_data", {}),
                "theme": record.get("theme_data", {}),
                "currentPhase": record.get("current_phase", 1),
                "phaseStatus": record.get("phase_status", {}),
                "isLocked": record.get("is_locked", False),
                "lastSaved": record.get("updated_at").isoformat()
                if record.get("updated_at")
                else None,
            }
            return JSONResponse(
                {
                    "success": True,
                    "storyLogic": story_logic,
                    "createdAt": record.get("created_at").isoformat()
                    if record.get("created_at")
                    else None,
                    "updatedAt": record.get("updated_at").isoformat()
                    if record.get("updated_at")
                    else None,
                }
            )
        return JSONResponse({"success": True, "storyLogic": None})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def api_save_story_logic(project_id: str, request: Request):
    """Save story logic data for a project."""
    try:
        data = await request.json()
        story_logic = data.get("storyLogic", {})
        logic_id = f"story_logic_{uuid.uuid4().hex[:12]}"

        conn = _db_or_503()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO project_story_logic
                (id, project_id, concept_data, logline_data, theme_data, current_phase, phase_status, is_locked)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (project_id) DO UPDATE SET
                    concept_data = EXCLUDED.concept_data,
                    logline_data = EXCLUDED.logline_data,
                    theme_data = EXCLUDED.theme_data,
                    current_phase = EXCLUDED.current_phase,
                    phase_status = EXCLUDED.phase_status,
                    is_locked = EXCLUDED.is_locked,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    logic_id,
                    project_id,
                    json.dumps(story_logic.get("concept", {})),
                    json.dumps(story_logic.get("logline", {})),
                    json.dumps(story_logic.get("theme", {})),
                    story_logic.get("currentPhase", 1),
                    json.dumps(story_logic.get("phaseStatus", {})),
                    story_logic.get("isLocked", False),
                ),
            )
            record = cur.fetchone()
            conn.commit()
        conn.close()
        return JSONResponse({"success": True, "record": _serialize_row(record)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def api_delete_story_logic(project_id: str):
    """Delete story logic data for a project."""
    try:
        conn = _db_or_503()
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM project_story_logic WHERE project_id = %s RETURNING id",
                (project_id,),
            )
            deleted = cur.fetchone()
            conn.commit()
        conn.close()
        if deleted:
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Story logic not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
