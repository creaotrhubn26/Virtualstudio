"""Split-sheet revenue / payments / invoices API routes — extracted from backend/main.py.

Three sub-groups sharing the lazy-create-table pattern:
  - revenue: per-split-sheet revenue entries (GET list, POST add + auto-create pending payments)
  - payments: auto-created from revenue postings, updatable by admin (GET, PUT)
  - invoices: user-scoped invoice listing + send-email (GET, POST)
"""

import uuid

import psycopg2
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(tags=["split_sheets_revenue"])


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


_CREATE_REVENUE_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_revenue (
    id VARCHAR(255) PRIMARY KEY,
    split_sheet_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NOK',
    revenue_source VARCHAR(50) NOT NULL,
    platform VARCHAR(100),
    period_start DATE,
    period_end DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""

_CREATE_PAYMENTS_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_payments (
    id VARCHAR(255) PRIMARY KEY,
    split_sheet_id VARCHAR(255) NOT NULL,
    revenue_id VARCHAR(255),
    contributor_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NOK',
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""

_CREATE_INVOICES_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_invoices (
    id VARCHAR(255) PRIMARY KEY,
    split_sheet_id VARCHAR(255),
    user_id VARCHAR(255),
    split_sheet_title VARCHAR(500),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NOK',
    status VARCHAR(50) DEFAULT 'draft',
    recipient_email VARCHAR(255),
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    fiken_invoice_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""


# ---- revenue --------------------------------------------------------------


@router.get("/api/split-sheets/{split_sheet_id}/revenue")
async def get_split_sheet_revenue(split_sheet_id: str):
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_REVENUE_SQL)
            conn.commit()
            cur.execute(
                "SELECT * FROM split_sheet_revenue WHERE split_sheet_id = %s "
                "ORDER BY period_start DESC, created_at DESC",
                (split_sheet_id,),
            )
            return JSONResponse(
                {"success": True, "data": [_serialize(r) for r in cur.fetchall()]}
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/api/split-sheets/{split_sheet_id}/revenue")
async def create_split_sheet_revenue(split_sheet_id: str, request: Request):
    """Add a revenue entry; auto-create pending payment rows per contributor."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        revenue_id = str(uuid.uuid4())
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO split_sheet_revenue
                (id, split_sheet_id, amount, currency, revenue_source, platform,
                 period_start, period_end, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    revenue_id,
                    split_sheet_id,
                    body.get("amount", 0),
                    body.get("currency", "NOK"),
                    body.get("revenue_source", "streaming"),
                    body.get("platform"),
                    body.get("period_start"),
                    body.get("period_end"),
                    body.get("description"),
                ),
            )
            row = cur.fetchone()
            conn.commit()

            # Auto-create pending payment rows weighted by contributor percentages
            cur.execute(
                "SELECT id, percentage FROM split_sheet_contributors WHERE split_sheet_id = %s",
                (split_sheet_id,),
            )
            contributors = cur.fetchall()

            amount = float(body.get("amount", 0))
            for contributor in contributors:
                percentage = float(contributor["percentage"] or 0)
                payment_amount = amount * (percentage / 100)
                cur.execute(
                    """
                    INSERT INTO split_sheet_payments
                    (id, split_sheet_id, revenue_id, contributor_id, amount, currency, payment_status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        str(uuid.uuid4()),
                        split_sheet_id,
                        revenue_id,
                        contributor["id"],
                        payment_amount,
                        body.get("currency", "NOK"),
                    ),
                )
            conn.commit()

            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


# ---- payments -------------------------------------------------------------


@router.get("/api/split-sheets/{split_sheet_id}/payments")
async def get_split_sheet_payments(split_sheet_id: str):
    """Get payment history joined with contributor info for a split sheet."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_PAYMENTS_SQL)
            conn.commit()
            cur.execute(
                """
                SELECT p.*,
                       c.name  AS contributor_name,
                       c.email AS contributor_email,
                       c.role  AS contributor_role
                FROM split_sheet_payments p
                LEFT JOIN split_sheet_contributors c ON p.contributor_id = c.id
                WHERE p.split_sheet_id = %s
                ORDER BY p.created_at DESC
                """,
                (split_sheet_id,),
            )
            rows = cur.fetchall()
            data = []
            for row in rows:
                item = dict(row)
                item["contributor"] = {
                    "name": item.pop("contributor_name", None),
                    "email": item.pop("contributor_email", None),
                    "role": item.pop("contributor_role", None),
                }
                for k, v in item.items():
                    if hasattr(v, "isoformat"):
                        item[k] = v.isoformat()
                data.append(item)
            return JSONResponse({"success": True, "data": data})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.put("/api/split-sheets/payments/{payment_id}")
async def update_split_sheet_payment(payment_id: str, request: Request):
    """Update a payment row (status / date / method / reference / notes)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE split_sheet_payments
                SET payment_status   = COALESCE(%s, payment_status),
                    payment_date     = COALESCE(%s, payment_date),
                    payment_method   = COALESCE(%s, payment_method),
                    payment_reference = COALESCE(%s, payment_reference),
                    notes            = COALESCE(%s, notes),
                    updated_at       = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (
                    body.get("payment_status"),
                    body.get("payment_date"),
                    body.get("payment_method"),
                    body.get("payment_reference"),
                    body.get("notes"),
                    payment_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Payment not found"},
                    status_code=404,
                )
            return JSONResponse({"success": True, "data": _serialize(row)})
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


# ---- invoices -------------------------------------------------------------


@router.get("/api/split-sheets/invoices")
async def get_split_sheet_invoices(userId: str = Query(None)):
    """Get invoices for a user (camelCase shape matching the frontend)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_INVOICES_SQL)
            conn.commit()

            query = "SELECT * FROM split_sheet_invoices"
            params: list = []
            if userId:
                query += " WHERE user_id = %s"
                params.append(userId)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)

            invoices = []
            for row in cur.fetchall():
                item = dict(row)
                invoices.append(
                    {
                        "id": item["id"],
                        "splitSheetId": item.get("split_sheet_id"),
                        "splitSheetTitle": item.get("split_sheet_title"),
                        "amount": float(item.get("amount", 0)),
                        "currency": item.get("currency", "NOK"),
                        "status": item.get("status", "draft"),
                        "recipientEmail": item.get("recipient_email"),
                        "dueDate": item["due_date"].isoformat()
                        if item.get("due_date")
                        else None,
                        "paidAt": item["paid_at"].isoformat()
                        if item.get("paid_at")
                        else None,
                        "fikenInvoiceId": item.get("fiken_invoice_id"),
                        "createdAt": item["created_at"].isoformat()
                        if item.get("created_at")
                        else None,
                    }
                )
            return JSONResponse({"invoices": invoices})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/api/split-sheets/invoices/{invoice_id}/send-email")
async def send_invoice_email(invoice_id: str, request: Request):
    """Flag an invoice as sent (stub — real version would generate PDF + email)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE split_sheet_invoices
                SET status = 'sent',
                    recipient_email = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                (body.get("recipientEmail"), invoice_id),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return JSONResponse(
                    {"success": False, "error": "Invoice not found"},
                    status_code=404,
                )
            return JSONResponse(
                {
                    "success": True,
                    "message": f"Invoice sent to {body.get('recipientEmail')}",
                }
            )
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()
