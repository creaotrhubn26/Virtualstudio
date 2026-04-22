"""Norwegian laws / legal suggestions API routes — extracted from backend/main.py.

Stores AI-generated legal suggestions against split-sheets plus a searchable
law index (lovverket). Tables are lazy-created on first call.
"""

import uuid

import psycopg2
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/norwegian-laws", tags=["norwegian_laws"])


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


_CREATE_SUGGESTIONS_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_legal_suggestions (
    id VARCHAR(255) PRIMARY KEY,
    split_sheet_id VARCHAR(255) NOT NULL,
    law_id VARCHAR(255),
    law_name VARCHAR(255),
    law_code VARCHAR(100),
    chapter VARCHAR(100),
    paragraph VARCHAR(100),
    content TEXT,
    suggestion_type VARCHAR(50),
    title VARCHAR(500),
    description TEXT,
    explanation TEXT,
    confidence_score DECIMAL(3,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""

_CREATE_REFERENCES_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_legal_references (
    id VARCHAR(255) PRIMARY KEY,
    split_sheet_id VARCHAR(255) NOT NULL,
    law_id VARCHAR(255) NOT NULL,
    law_name VARCHAR(255),
    law_code VARCHAR(100),
    chapter VARCHAR(100),
    paragraph VARCHAR(100),
    content TEXT,
    category VARCHAR(100),
    section_type VARCHAR(100),
    relevance_score DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""

_CREATE_LAWS_SQL = """
CREATE TABLE IF NOT EXISTS norwegian_laws (
    id VARCHAR(255) PRIMARY KEY,
    law_code VARCHAR(100),
    law_name VARCHAR(255) NOT NULL,
    chapter VARCHAR(100),
    paragraph VARCHAR(100),
    content TEXT,
    category VARCHAR(100),
    section_type VARCHAR(100),
    effective_date DATE,
    source_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


@router.get("/split-sheets/{split_sheet_id}/legal-suggestions")
async def get_legal_suggestions(split_sheet_id: str):
    """Get AI-generated legal suggestions for a split sheet."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_SUGGESTIONS_SQL)
            conn.commit()
            cur.execute(
                """
                SELECT * FROM split_sheet_legal_suggestions
                WHERE split_sheet_id = %s
                ORDER BY confidence_score DESC, created_at DESC
                """,
                (split_sheet_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.put("/split-sheets/{split_sheet_id}/legal-suggestions/{suggestion_id}")
async def update_legal_suggestion(
    split_sheet_id: str, suggestion_id: str, request: Request
):
    """Update suggestion status (accept / reject)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE split_sheet_legal_suggestions
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND split_sheet_id = %s
                RETURNING *
                """,
                (body.get("status", "pending"), suggestion_id, split_sheet_id),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Suggestion not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.get("/split-sheets/{split_sheet_id}/legal-references")
async def get_legal_references(split_sheet_id: str):
    """Get legal references for a split sheet."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_REFERENCES_SQL)
            conn.commit()
            cur.execute(
                """
                SELECT * FROM split_sheet_legal_references
                WHERE split_sheet_id = %s
                ORDER BY relevance_score DESC, created_at DESC
                """,
                (split_sheet_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/split-sheets/{split_sheet_id}/legal-references")
async def add_legal_reference(split_sheet_id: str, request: Request):
    """Add a legal reference to a split sheet."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        reference_id = str(uuid.uuid4())
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO split_sheet_legal_references
                (id, split_sheet_id, law_id, law_name, law_code, chapter, paragraph,
                 content, category, section_type, relevance_score, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    reference_id,
                    split_sheet_id,
                    body.get("law_id"),
                    body.get("law_name"),
                    body.get("law_code"),
                    body.get("chapter"),
                    body.get("paragraph"),
                    body.get("content"),
                    body.get("category"),
                    body.get("section_type"),
                    body.get("relevance_score"),
                    body.get("notes"),
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


@router.get("/search")
async def search_norwegian_laws(
    query: str = Query(...),
    category: str = Query(None),
):
    """Search the Norwegian laws index."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_LAWS_SQL)
            conn.commit()
            sql = (
                "SELECT * FROM norwegian_laws "
                "WHERE (law_name ILIKE %s OR content ILIKE %s OR law_code ILIKE %s)"
            )
            params: list = [f"%{query}%"] * 3
            if category:
                sql += " AND category = %s"
                params.append(category)
            sql += " ORDER BY law_name, chapter, paragraph LIMIT 50"
            cur.execute(sql, params)
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()
