"""Shot planner 2D scenes API routes — extracted from backend/main.py.

Persists top-down 2D scene layouts (cameras, actors, props, shots) to the
``shot_planner_scenes`` table.
"""

import psycopg2
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import Json as PgJson, RealDictCursor

router = APIRouter(prefix="/api/shot-planner/scenes", tags=["shot_planner"])


def _db_or_503_response():
    """Return (conn, None) on success, (None, JSONResponse) if DB unavailable."""
    try:
        from tutorials_service import get_db_connection
    except ImportError:
        return None, JSONResponse(
            {"success": False, "error": "Database not available"}, status_code=503
        )
    return get_db_connection(), None


def _serialize_scene_row(row):
    scene_dict = dict(row)
    for k, v in scene_dict.items():
        if hasattr(v, "isoformat"):
            scene_dict[k] = v.isoformat()
    return scene_dict


@router.get("")
async def get_shot_planner_scenes():
    """Get all shot planner 2D scenes."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM shot_planner_scenes ORDER BY updated_at DESC"
            )
            scenes = [_serialize_scene_row(s) for s in cur.fetchall()]
        return JSONResponse({"success": True, "scenes": scenes})
    except psycopg2.Error as e:
        print(f"Error getting shot planner scenes: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.get("/{scene_id}")
async def get_shot_planner_scene(scene_id: str):
    """Get a specific shot planner 2D scene."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM shot_planner_scenes WHERE id = %s", (scene_id,)
            )
            scene = cur.fetchone()
            if not scene:
                return JSONResponse(
                    {"success": False, "error": "Scene not found"}, status_code=404
                )
        return JSONResponse({"success": True, "scene": _serialize_scene_row(scene)})
    except psycopg2.Error as e:
        print(f"Error getting shot planner scene: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("")
async def save_shot_planner_scene(request: Request):
    """Save or update a shot planner 2D scene."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        scene_data = await request.json()
        scene_id = scene_data.get("id")
        if not scene_id:
            return JSONResponse(
                {"success": False, "error": "Scene ID required"}, status_code=400
            )

        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM shot_planner_scenes WHERE id = %s", (scene_id,)
            )
            exists = cur.fetchone() is not None

            if exists:
                cur.execute(
                    """
                    UPDATE shot_planner_scenes
                    SET name = %s, location = %s, width = %s, height = %s,
                        pixels_per_meter = %s, show_grid = %s, grid_size = %s,
                        cameras = %s, actors = %s, props = %s, shots = %s,
                        active_shot_id = %s, scene_data = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (
                        scene_data.get("name"),
                        scene_data.get("location"),
                        scene_data.get("width"),
                        scene_data.get("height"),
                        scene_data.get("pixelsPerMeter"),
                        scene_data.get("showGrid", True),
                        scene_data.get("gridSize", 50),
                        PgJson(scene_data.get("cameras", [])),
                        PgJson(scene_data.get("actors", [])),
                        PgJson(scene_data.get("props", [])),
                        PgJson(scene_data.get("shots", [])),
                        scene_data.get("activeShotId"),
                        PgJson(scene_data),
                        scene_id,
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO shot_planner_scenes
                    (id, name, location, width, height, pixels_per_meter, show_grid, grid_size,
                     cameras, actors, props, shots, active_shot_id, scene_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        scene_id,
                        scene_data.get("name"),
                        scene_data.get("location"),
                        scene_data.get("width"),
                        scene_data.get("height"),
                        scene_data.get("pixelsPerMeter"),
                        scene_data.get("showGrid", True),
                        scene_data.get("gridSize", 50),
                        PgJson(scene_data.get("cameras", [])),
                        PgJson(scene_data.get("actors", [])),
                        PgJson(scene_data.get("props", [])),
                        PgJson(scene_data.get("shots", [])),
                        scene_data.get("activeShotId"),
                        PgJson(scene_data),
                    ),
                )

            conn.commit()
        return JSONResponse({"success": True, "scene": scene_data})
    except psycopg2.Error as e:
        print(f"Error saving shot planner scene: {e}")
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.delete("/{scene_id}")
async def delete_shot_planner_scene(scene_id: str):
    """Delete a shot planner 2D scene."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM shot_planner_scenes WHERE id = %s", (scene_id,)
            )
            conn.commit()
        return JSONResponse({"success": True})
    except psycopg2.Error as e:
        print(f"Error deleting shot planner scene: {e}")
        if conn:
            conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()
