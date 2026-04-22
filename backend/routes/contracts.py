"""Split-sheet contracts API routes — extracted from backend/main.py.

Persists contract drafts to the ``split_sheet_contracts`` table. Lazy-creates
the table on first call.
"""

import json
import uuid

import psycopg2
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/contracts", tags=["contracts"])


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


_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_contracts (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255),
    split_sheet_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    parties JSONB DEFAULT '[]',
    obligations JSONB DEFAULT '[]',
    payment_terms JSONB DEFAULT '[]',
    legal_references JSONB DEFAULT '[]',
    applied_suggestions JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft',
    signature_status VARCHAR(50) DEFAULT 'unsigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


@router.get("/{contract_id}")
async def get_contract(contract_id: str):
    """Get a contract by ID."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_TABLE_SQL)
            conn.commit()
            cur.execute(
                "SELECT * FROM split_sheet_contracts WHERE id = %s", (contract_id,)
            )
            row = cur.fetchone()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Contract not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        return JSONResponse(
            {"success": False, "error": f"Database error: {e}"}, status_code=500
        )
    finally:
        conn.close()


@router.get("")
async def list_contracts(
    split_sheet_id: str = Query(None),
    project_id: str = Query(None),
):
    """List contracts, optionally filtered by split_sheet_id or project_id."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM split_sheet_contracts WHERE 1=1"
            params: list = []
            if split_sheet_id:
                query += " AND split_sheet_id = %s"
                params.append(split_sheet_id)
            if project_id:
                query += " AND project_id = %s"
                params.append(project_id)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        return JSONResponse(
            {"success": False, "error": f"Database error: {e}"}, status_code=500
        )
    finally:
        conn.close()


@router.post("")
async def create_contract(request: Request):
    """Create a new contract."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        contract_id = str(uuid.uuid4())
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO split_sheet_contracts
                (id, project_id, split_sheet_id, title, content, parties,
                 obligations, payment_terms, legal_references, applied_suggestions, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    contract_id,
                    body.get("project_id"),
                    body.get("split_sheet_id"),
                    body.get("title", "Untitled Contract"),
                    body.get("content", ""),
                    json.dumps(body.get("parties", [])),
                    json.dumps(body.get("obligations", [])),
                    json.dumps(body.get("payment_terms", [])),
                    json.dumps(body.get("legal_references", [])),
                    json.dumps(body.get("applied_suggestions", [])),
                    body.get("status", "draft"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse(
            {"success": False, "error": f"Database error: {e}"}, status_code=500
        )
    finally:
        conn.close()


@router.put("/{contract_id}")
async def update_contract(contract_id: str, request: Request):
    """Update a contract."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE split_sheet_contracts
                SET title = COALESCE(%s, title),
                    content = COALESCE(%s, content),
                    parties = COALESCE(%s, parties),
                    obligations = COALESCE(%s, obligations),
                    payment_terms = COALESCE(%s, payment_terms),
                    legal_references = COALESCE(%s, legal_references),
                    applied_suggestions = COALESCE(%s, applied_suggestions),
                    status = COALESCE(%s, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (
                    body.get("title"),
                    body.get("content"),
                    json.dumps(body.get("parties")) if body.get("parties") else None,
                    json.dumps(body.get("obligations")) if body.get("obligations") else None,
                    json.dumps(body.get("payment_terms")) if body.get("payment_terms") else None,
                    json.dumps(body.get("legal_references")) if body.get("legal_references") else None,
                    json.dumps(body.get("applied_suggestions")) if body.get("applied_suggestions") else None,
                    body.get("status"),
                    contract_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Contract not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse(
            {"success": False, "error": f"Database error: {e}"}, status_code=500
        )
    finally:
        conn.close()
