"""Split-sheet workflow routes — extracted from backend/main.py.

Covers four sub-groups that share the same table-creation + CRUD pattern:
  - comments (4 routes on split_sheet_comments)
  - templates (4 routes on split_sheet_templates)
  - reports + statistics (3 routes on split_sheet_reports + aggregates)
  - pro-connections (2 routes on split_sheet_pro_connections)

All use lazy get_db_connection imports and the _serialize helper.
"""

import json
import uuid

import psycopg2
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(tags=["split_sheets_workflow"])


def _db_or_503_response():
    try:
        from tutorials_service import get_db_connection
    except ImportError:
        return None, JSONResponse(
            {"success": False, "error": "Database service not available"},
            status_code=503,
        )
    return get_db_connection(), None


def _serialize(row):
    if row is None:
        return None
    result = dict(row) if hasattr(row, "keys") else dict(row)
    for k, v in list(result.items()):
        if hasattr(v, "isoformat"):
            result[k] = v.isoformat()
    return result


# ---- comments --------------------------------------------------------------


_CREATE_COMMENTS_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_comments (
    id VARCHAR(255) PRIMARY KEY,
    split_sheet_id VARCHAR(255) NOT NULL,
    parent_comment_id VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]',
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


@router.get("/api/split-sheets/{split_sheet_id}/comments")
async def get_split_sheet_comments(split_sheet_id: str):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_COMMENTS_SQL)
            conn.commit()
            cur.execute(
                "SELECT * FROM split_sheet_comments WHERE split_sheet_id = %s "
                "ORDER BY created_at ASC",
                (split_sheet_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/api/split-sheets/{split_sheet_id}/comments")
async def create_split_sheet_comment(split_sheet_id: str, request: Request):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO split_sheet_comments
                (id, split_sheet_id, parent_comment_id, user_id, user_name,
                 user_email, content, mentions)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    str(uuid.uuid4()),
                    split_sheet_id,
                    body.get("parent_comment_id"),
                    body.get("user_id"),
                    body.get("user_name", "Anonymous"),
                    body.get("user_email"),
                    body.get("content", ""),
                    json.dumps(body.get("mentions", [])),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.put("/api/split-sheets/comments/{comment_id}")
async def update_split_sheet_comment(comment_id: str, request: Request):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE split_sheet_comments
                SET content = COALESCE(%s, content),
                    is_resolved = COALESCE(%s, is_resolved),
                    mentions = COALESCE(%s, mentions),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (
                    body.get("content"),
                    body.get("is_resolved"),
                    json.dumps(body.get("mentions")) if body.get("mentions") else None,
                    comment_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Comment not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.delete("/api/split-sheets/comments/{comment_id}")
async def delete_split_sheet_comment(comment_id: str):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM split_sheet_comments WHERE id = %s", (comment_id,)
            )
            conn.commit()
        return JSONResponse({"success": True})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


# ---- templates -------------------------------------------------------------


_CREATE_TEMPLATES_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_templates (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    profession VARCHAR(50),
    contributors JSONB DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


@router.get("/api/split-sheets/templates")
async def get_split_sheet_templates(
    userId: str = Query(None), include_public: bool = Query(True)
):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_TEMPLATES_SQL)
            conn.commit()
            if userId:
                if include_public:
                    cur.execute(
                        """
                        SELECT * FROM split_sheet_templates
                        WHERE user_id = %s OR is_public = TRUE OR is_system_template = TRUE
                        ORDER BY usage_count DESC, created_at DESC
                        """,
                        (userId,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT * FROM split_sheet_templates
                        WHERE user_id = %s
                        ORDER BY usage_count DESC, created_at DESC
                        """,
                        (userId,),
                    )
            else:
                cur.execute(
                    """
                    SELECT * FROM split_sheet_templates
                    WHERE is_public = TRUE OR is_system_template = TRUE
                    ORDER BY usage_count DESC, created_at DESC
                    """
                )
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/api/split-sheets/templates")
async def create_split_sheet_template(request: Request):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO split_sheet_templates
                (id, user_id, name, description, is_public, profession, contributors)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    str(uuid.uuid4()),
                    body.get("user_id"),
                    body.get("name", "Untitled Template"),
                    body.get("description"),
                    body.get("is_public", False),
                    body.get("profession"),
                    json.dumps(body.get("contributors", [])),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.delete("/api/split-sheets/templates/{template_id}")
async def delete_split_sheet_template(template_id: str):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM split_sheet_templates WHERE id = %s", (template_id,)
            )
            conn.commit()
        return JSONResponse({"success": True})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/api/split-sheets/templates/{template_id}/use")
async def use_split_sheet_template(template_id: str):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE split_sheet_templates
                SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (template_id,),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Template not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


# ---- reports + statistics --------------------------------------------------


_CREATE_REPORTS_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_reports (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    period VARCHAR(50),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    download_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'generating',
    report_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


@router.get("/api/split-sheets/reports")
async def get_split_sheet_reports(userId: str = Query(...)):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_REPORTS_SQL)
            conn.commit()
            cur.execute(
                "SELECT * FROM split_sheet_reports WHERE user_id = %s "
                "ORDER BY generated_at DESC",
                (userId,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/api/split-sheets/reports/generate")
async def generate_split_sheet_report(request: Request):
    """Generate a new report (stub: inserts row with status='ready')."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO split_sheet_reports
                (id, user_id, name, type, period, status, report_data)
                VALUES (%s, %s, %s, %s, %s, 'ready', %s)
                RETURNING *
                """,
                (
                    str(uuid.uuid4()),
                    body.get("user_id"),
                    body.get("name", "Report"),
                    body.get("type", "monthly"),
                    body.get("period"),
                    json.dumps(body.get("report_data", {})),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.get("/api/split-sheets/statistics")
async def get_split_sheet_statistics(userId: str = Query(...)):
    """Aggregate split-sheet + revenue + payment totals for a user."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) as total_split_sheets,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'pending_signatures' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts
                FROM split_sheets
                WHERE user_id = %s
                """,
                (userId,),
            )
            split_sheet_stats = cur.fetchone() or {}

            cur.execute(
                """
                SELECT COALESCE(SUM(r.amount), 0) as total_revenue, r.currency
                FROM split_sheet_revenue r
                INNER JOIN split_sheets ss ON r.split_sheet_id = ss.id
                WHERE ss.user_id = %s
                GROUP BY r.currency
                """,
                (userId,),
            )
            revenue_by_currency = {
                row["currency"]: float(row["total_revenue"]) for row in cur.fetchall()
            }

            cur.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as total_paid,
                    COALESCE(SUM(CASE WHEN p.payment_status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
                    p.currency
                FROM split_sheet_payments p
                INNER JOIN split_sheets ss ON p.split_sheet_id = ss.id
                WHERE ss.user_id = %s
                GROUP BY p.currency
                """,
                (userId,),
            )
            payments_by_currency = {
                row["currency"]: {
                    "paid": float(row["total_paid"]),
                    "pending": float(row["total_pending"]),
                }
                for row in cur.fetchall()
            }

            return JSONResponse(
                {
                    "success": True,
                    "data": {
                        "split_sheets": dict(split_sheet_stats)
                        if split_sheet_stats
                        else {},
                        "revenue": revenue_by_currency,
                        "payments": payments_by_currency,
                    },
                }
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


# ---- pro connections (TONO/STIM) ------------------------------------------


_CREATE_PRO_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_pro_connections (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pro_name VARCHAR(50) NOT NULL,
    pro_account_id VARCHAR(255),
    isrc_prefix VARCHAR(50),
    connection_status VARCHAR(50) DEFAULT 'pending',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


@router.get("/api/split-sheets/pro-connections")
async def get_pro_connections(userId: str = Query(None)):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_PRO_SQL)
            conn.commit()

            query = "SELECT * FROM split_sheet_pro_connections"
            params: list = []
            if userId:
                query += " WHERE user_id = %s"
                params.append(userId)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.delete("/api/split-sheets/pro-connections/{connection_id}")
async def delete_pro_connection(connection_id: str):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM split_sheet_pro_connections WHERE id = %s",
                (connection_id,),
            )
            conn.commit()
        return JSONResponse({"success": True})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()
