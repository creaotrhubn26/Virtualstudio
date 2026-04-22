"""Production workflow API routes — extracted from backend/main.py.

CRUD endpoints for the production planning feature: shooting days, stripboard
strips, cast, crew, call sheets, and live set status. All back onto
``production_*`` tables in Postgres.

The seed-troll demo endpoint is intentionally not extracted here — it is a
large (~500-line) single-purpose fixture seeder that belongs with demo data
tooling and should move to its own ``routes/demo.py`` in a follow-up pass.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

import psycopg2
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import Json, RealDictCursor

router = APIRouter(prefix="/api/production", tags=["production"])


def _db_or_503_response():
    try:
        from tutorials_service import get_db_connection
    except ImportError:
        return None, JSONResponse(
            {"success": False, "error": "Database not available"}, status_code=503
        )
    return get_db_connection(), None


def _serialize_db_row(row) -> dict:
    """Stringify non-JSON values (dates, times, decimals, bytes)."""
    item = dict(row)
    for key, value in list(item.items()):
        if isinstance(value, Decimal):
            item[key] = float(value)
        elif isinstance(value, (datetime, date)):
            item[key] = value.isoformat() if value else None
        elif type(value).__name__ in ("time", "timedelta"):
            item[key] = str(value) if value else None
        elif isinstance(value, bytes):
            item[key] = value.decode("utf-8") if value else None
    return item


# --- shooting days ---------------------------------------------------------


@router.get("/{project_id}/shooting-days")
async def get_production_shooting_days(project_id: str):
    """Get all shooting days for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM production_shooting_days
                WHERE project_id = %s
                ORDER BY day_number ASC
                """,
                (project_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize_db_row(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/{project_id}/shooting-days")
async def create_production_shooting_day(project_id: str, request: Request):
    """Create or upsert a shooting day."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            day_id = body.get("id", f"sd-{uuid.uuid4()}")
            cur.execute(
                """
                INSERT INTO production_shooting_days (
                    id, project_id, day_number, date, call_time, wrap_time,
                    location, location_address, notes, scenes, status,
                    weather, crew_call_times, cast_call_times, equipment_needed, meals
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    day_number = EXCLUDED.day_number,
                    date = EXCLUDED.date,
                    call_time = EXCLUDED.call_time,
                    wrap_time = EXCLUDED.wrap_time,
                    location = EXCLUDED.location,
                    location_address = EXCLUDED.location_address,
                    notes = EXCLUDED.notes,
                    scenes = EXCLUDED.scenes,
                    status = EXCLUDED.status,
                    weather = EXCLUDED.weather,
                    crew_call_times = EXCLUDED.crew_call_times,
                    cast_call_times = EXCLUDED.cast_call_times,
                    equipment_needed = EXCLUDED.equipment_needed,
                    meals = EXCLUDED.meals,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    day_id,
                    project_id,
                    body.get("dayNumber", 1),
                    body.get("date"),
                    body.get("callTime", "07:00"),
                    body.get("wrapTime"),
                    body.get("location", "TBD"),
                    body.get("locationAddress"),
                    body.get("notes"),
                    Json(body.get("scenes", [])),
                    body.get("status", "planned"),
                    Json(body.get("weather", {})),
                    Json(body.get("crewCallTimes", {})),
                    Json(body.get("castCallTimes", {})),
                    Json(body.get("equipmentNeeded", [])),
                    Json(body.get("meals", [])),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/shooting-days/{day_id}")
async def update_production_shooting_day(day_id: str, request: Request):
    """Update a shooting day (partial — only fields in body are changed)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            field_mapping = {
                "dayNumber": "day_number",
                "date": "date",
                "callTime": "call_time",
                "wrapTime": "wrap_time",
                "location": "location",
                "locationAddress": "location_address",
                "notes": "notes",
                "status": "status",
            }
            json_field_mapping = {
                "scenes": "scenes",
                "weather": "weather",
                "crewCallTimes": "crew_call_times",
                "castCallTimes": "cast_call_times",
                "equipmentNeeded": "equipment_needed",
                "meals": "meals",
            }

            updates: list[str] = []
            params: list = []
            for key, col in field_mapping.items():
                if key in body:
                    updates.append(f"{col} = %s")
                    params.append(body[key])
            for key, col in json_field_mapping.items():
                if key in body:
                    updates.append(f"{col} = %s")
                    params.append(Json(body[key]))

            if not updates:
                return JSONResponse(
                    {"success": False, "error": "No fields to update"},
                    status_code=400,
                )

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(day_id)

            cur.execute(
                f"UPDATE production_shooting_days SET {', '.join(updates)} "
                f"WHERE id = %s RETURNING *",
                params,
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Shooting day not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.delete("/shooting-days/{day_id}")
async def delete_production_shooting_day(day_id: str):
    """Delete a shooting day."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM production_shooting_days WHERE id = %s", (day_id,)
            )
            conn.commit()
        return JSONResponse({"success": True, "message": "Shooting day deleted"})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


# --- stripboard ------------------------------------------------------------


@router.get("/{project_id}/stripboard")
async def get_production_stripboard(project_id: str):
    """Get stripboard strips for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM production_stripboard WHERE project_id = %s "
                "ORDER BY sort_order ASC",
                (project_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize_db_row(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/{project_id}/stripboard")
async def create_production_stripboard_strip(project_id: str, request: Request):
    """Create or upsert a stripboard strip."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            strip_id = body.get("id", f"strip-{uuid.uuid4()}")
            cur.execute(
                """
                INSERT INTO production_stripboard (
                    id, project_id, scene_id, scene_number, shooting_day_id,
                    day_number, sort_order, color, location, pages,
                    cast_ids, status, estimated_time, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    scene_id = EXCLUDED.scene_id,
                    scene_number = EXCLUDED.scene_number,
                    shooting_day_id = EXCLUDED.shooting_day_id,
                    day_number = EXCLUDED.day_number,
                    sort_order = EXCLUDED.sort_order,
                    color = EXCLUDED.color,
                    location = EXCLUDED.location,
                    pages = EXCLUDED.pages,
                    cast_ids = EXCLUDED.cast_ids,
                    status = EXCLUDED.status,
                    estimated_time = EXCLUDED.estimated_time,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    strip_id,
                    project_id,
                    body.get("sceneId"),
                    body.get("sceneNumber"),
                    body.get("shootingDayId"),
                    body.get("dayNumber"),
                    body.get("sortOrder", 0),
                    body.get("color", "#4A5568"),
                    body.get("location"),
                    body.get("pages", 0),
                    Json(body.get("castIds", [])),
                    body.get("status", "not-scheduled"),
                    body.get("estimatedTime", 60),
                    body.get("notes"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/stripboard/{strip_id}")
async def update_production_stripboard_strip(strip_id: str, request: Request):
    """Update a stripboard strip (partial)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            field_mapping = {
                "sceneId": "scene_id",
                "sceneNumber": "scene_number",
                "shootingDayId": "shooting_day_id",
                "dayNumber": "day_number",
                "sortOrder": "sort_order",
                "color": "color",
                "location": "location",
                "pages": "pages",
                "status": "status",
                "estimatedTime": "estimated_time",
                "notes": "notes",
            }
            updates: list[str] = []
            params: list = []
            for key, col in field_mapping.items():
                if key in body:
                    updates.append(f"{col} = %s")
                    params.append(body[key])
            if "castIds" in body:
                updates.append("cast_ids = %s")
                params.append(Json(body["castIds"]))
            if not updates:
                return JSONResponse(
                    {"success": False, "error": "No fields to update"},
                    status_code=400,
                )
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(strip_id)

            cur.execute(
                f"UPDATE production_stripboard SET {', '.join(updates)} "
                f"WHERE id = %s RETURNING *",
                params,
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Strip not found"}, status_code=404
                )
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.delete("/stripboard/{strip_id}")
async def delete_production_stripboard_strip(strip_id: str):
    """Delete a stripboard strip."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM production_stripboard WHERE id = %s", (strip_id,)
            )
            conn.commit()
        return JSONResponse({"success": True, "message": "Strip deleted"})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


# --- cast ------------------------------------------------------------------


@router.get("/{project_id}/cast")
async def get_production_cast(project_id: str):
    """Get cast members for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM production_cast WHERE project_id = %s "
                "ORDER BY character_name ASC",
                (project_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize_db_row(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/{project_id}/cast")
async def create_production_cast_member(project_id: str, request: Request):
    """Create or upsert a cast member."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cast_id = body.get("id", f"cast-{uuid.uuid4()}")
            cur.execute(
                """
                INSERT INTO production_cast (
                    id, project_id, name, character_name, scenes,
                    phone, email, availability, contract
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    character_name = EXCLUDED.character_name,
                    scenes = EXCLUDED.scenes,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    availability = EXCLUDED.availability,
                    contract = EXCLUDED.contract,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    cast_id,
                    project_id,
                    body.get("name"),
                    body.get("characterName"),
                    Json(body.get("scenes", [])),
                    body.get("phone"),
                    body.get("email"),
                    Json(body.get("availability", {})),
                    Json(body.get("contract", {})),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


# --- crew ------------------------------------------------------------------


@router.get("/{project_id}/crew")
async def get_production_crew(project_id: str):
    """Get crew members for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM production_crew WHERE project_id = %s "
                "ORDER BY department, role ASC",
                (project_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize_db_row(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/{project_id}/crew")
async def create_production_crew_member(project_id: str, request: Request):
    """Create or upsert a crew member."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            crew_id = body.get("id", f"crew-{uuid.uuid4()}")
            cur.execute(
                """
                INSERT INTO production_crew (
                    id, project_id, name, role, department,
                    phone, email, availability, rate, rate_type, union_affiliation, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    department = EXCLUDED.department,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    availability = EXCLUDED.availability,
                    rate = EXCLUDED.rate,
                    rate_type = EXCLUDED.rate_type,
                    union_affiliation = EXCLUDED.union_affiliation,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    crew_id,
                    project_id,
                    body.get("name"),
                    body.get("role"),
                    body.get("department"),
                    body.get("phone"),
                    body.get("email"),
                    Json(body.get("availability", {})),
                    body.get("rate"),
                    body.get("rateType", "daily"),
                    body.get("unionAffiliation"),
                    body.get("notes"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


# --- call sheets -----------------------------------------------------------


@router.get("/{project_id}/call-sheets")
async def get_production_call_sheets(project_id: str):
    """Get call sheets for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM production_call_sheets WHERE project_id = %s "
                "ORDER BY date ASC",
                (project_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize_db_row(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/{project_id}/call-sheets")
async def create_production_call_sheet(project_id: str, request: Request):
    """Create or upsert a call sheet."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            sheet_id = body.get("id", f"cs-{uuid.uuid4()}")
            cur.execute(
                """
                INSERT INTO production_call_sheets (
                    id, shooting_day_id, project_id, project_title, production_company,
                    director, producer, date, day_number, total_days, general_call_time,
                    crew_call_times, cast_call_times, scenes, location_address,
                    parking_info, catering_info, meals, weather_forecast,
                    special_instructions, emergency_contacts, department_notes, version, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    shooting_day_id = EXCLUDED.shooting_day_id,
                    project_title = EXCLUDED.project_title,
                    production_company = EXCLUDED.production_company,
                    director = EXCLUDED.director,
                    producer = EXCLUDED.producer,
                    date = EXCLUDED.date,
                    day_number = EXCLUDED.day_number,
                    total_days = EXCLUDED.total_days,
                    general_call_time = EXCLUDED.general_call_time,
                    crew_call_times = EXCLUDED.crew_call_times,
                    cast_call_times = EXCLUDED.cast_call_times,
                    scenes = EXCLUDED.scenes,
                    location_address = EXCLUDED.location_address,
                    parking_info = EXCLUDED.parking_info,
                    catering_info = EXCLUDED.catering_info,
                    meals = EXCLUDED.meals,
                    weather_forecast = EXCLUDED.weather_forecast,
                    special_instructions = EXCLUDED.special_instructions,
                    emergency_contacts = EXCLUDED.emergency_contacts,
                    department_notes = EXCLUDED.department_notes,
                    version = EXCLUDED.version,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    sheet_id,
                    body.get("shootingDayId"),
                    project_id,
                    body.get("projectTitle", "Untitled"),
                    body.get("productionCompany"),
                    body.get("director"),
                    body.get("producer"),
                    body.get("date"),
                    body.get("dayNumber", 1),
                    body.get("totalDays"),
                    body.get("generalCallTime", "07:00"),
                    Json(body.get("crewCallTimes", [])),
                    Json(body.get("castCallTimes", [])),
                    Json(body.get("scenes", [])),
                    body.get("locationAddress"),
                    body.get("parkingInfo"),
                    body.get("cateringInfo"),
                    Json(body.get("meals", [])),
                    Json(body.get("weatherForecast", {})),
                    body.get("specialInstructions"),
                    Json(body.get("emergencyContacts", [])),
                    Json(body.get("departmentNotes", {})),
                    body.get("version", 1),
                    body.get("status", "draft"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


# --- live set status -------------------------------------------------------


@router.get("/{project_id}/live-set-status")
async def get_production_live_set_status(project_id: str):
    """Get the most recent live set status for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM production_live_set_status WHERE project_id = %s "
                "ORDER BY created_at DESC LIMIT 1",
                (project_id,),
            )
            row = cur.fetchone()
            if not row:
                return JSONResponse({"success": True, "data": None})
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/{project_id}/live-set-status")
async def update_production_live_set_status(project_id: str, request: Request):
    """Upsert the live set status for a project."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            status_id = body.get("id", f"ls-{project_id}")
            cur.execute(
                """
                INSERT INTO production_live_set_status (
                    id, project_id, shooting_day_id, current_scene_id, current_shot_id,
                    status, current_setup, total_setups, pages_shot,
                    scenes_completed, scenes_partial, start_time, last_update_time,
                    estimated_wrap, today_takes, notes, last_updated_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    shooting_day_id = EXCLUDED.shooting_day_id,
                    current_scene_id = EXCLUDED.current_scene_id,
                    current_shot_id = EXCLUDED.current_shot_id,
                    status = EXCLUDED.status,
                    current_setup = EXCLUDED.current_setup,
                    total_setups = EXCLUDED.total_setups,
                    pages_shot = EXCLUDED.pages_shot,
                    scenes_completed = EXCLUDED.scenes_completed,
                    scenes_partial = EXCLUDED.scenes_partial,
                    start_time = EXCLUDED.start_time,
                    last_update_time = EXCLUDED.last_update_time,
                    estimated_wrap = EXCLUDED.estimated_wrap,
                    today_takes = EXCLUDED.today_takes,
                    notes = EXCLUDED.notes,
                    last_updated_by = EXCLUDED.last_updated_by,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (
                    status_id,
                    project_id,
                    body.get("shootingDayId"),
                    body.get("currentSceneId"),
                    body.get("currentShotId"),
                    body.get("status", "standby"),
                    body.get("currentSetup", 0),
                    body.get("totalSetups", 0),
                    body.get("pagesShot", 0),
                    Json(body.get("scenesCompleted", [])),
                    Json(body.get("scenesPartial", [])),
                    body.get("startTime"),
                    body.get("lastUpdateTime"),
                    body.get("estimatedWrap"),
                    Json(body.get("todayTakes", [])),
                    body.get("notes"),
                    body.get("lastUpdatedBy"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize_db_row(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        conn.close()
