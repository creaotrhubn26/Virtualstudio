"""Casting consent portal API routes — extracted from backend/main.py.

Signing flow for casting consent invitations. Three routes:
  GET  /api/consent/portal/access   — validate access code + optional PIN/password
  POST /api/consent/portal/sign     — sign a consent
  POST /api/consent/generate-access-code — issue a 6-char code for a consent
"""

import json
import random
import string

import psycopg2
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/consent", tags=["consent"])


def _db_or_503_response():
    try:
        from tutorials_service import get_db_connection
    except ImportError:
        return None, JSONResponse(
            {"success": False, "error": "Database service not available"},
            status_code=503,
        )
    return get_db_connection(), None


@router.get("/portal/access")
async def validate_consent_access(
    access_code: str = Query(...),
    pin: str = Query(None),
    password: str = Query(None),
):
    """Validate a consent portal access code (+ optional PIN/password)."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    c.id, c.candidate_id, c.project_id, c.type, c.title, c.description,
                    c.signed, c.date, c.document, c.notes, c.access_code, c.pin, c.password,
                    c.invitation_status, c.invitation_sent_at, c.signature_data, c.expires_at,
                    c.created_at, c.updated_at,
                    ca.name AS candidate_name,
                    cp.name AS project_name
                FROM casting_consents c
                LEFT JOIN casting_candidates ca ON c.candidate_id = ca.id
                LEFT JOIN casting_projects cp ON c.project_id = cp.id
                WHERE UPPER(c.access_code) = %s
                AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
                """,
                (access_code.upper(),),
            )
            consent_row = cur.fetchone()
            if not consent_row:
                return JSONResponse(
                    {"success": False, "error": "Ugyldig eller utløpt tilgangskode"},
                    status_code=404,
                )

            if consent_row.get("pin") and not pin:
                return JSONResponse(
                    {
                        "success": False,
                        "error": "PIN required",
                        "requiresPin": True,
                    },
                    status_code=401,
                )
            if consent_row.get("pin") and pin != consent_row["pin"]:
                return JSONResponse(
                    {"success": False, "error": "Ugyldig PIN"}, status_code=401
                )

            if consent_row.get("password") and not password:
                return JSONResponse(
                    {
                        "success": False,
                        "error": "Password required",
                        "requiresPassword": True,
                    },
                    status_code=401,
                )
            if consent_row.get("password") and password != consent_row["password"]:
                return JSONResponse(
                    {"success": False, "error": "Ugyldig passord"}, status_code=401
                )

            # Mark as viewed if not already signed
            if not consent_row["signed"] and consent_row.get("invitation_status") != "viewed":
                cur.execute(
                    """
                    UPDATE casting_consents
                    SET invitation_status = 'viewed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (consent_row["id"],),
                )
                conn.commit()

            consent_data = {
                "id": consent_row["id"],
                "candidateId": consent_row["candidate_id"],
                "projectId": consent_row["project_id"],
                "type": consent_row["type"],
                "title": consent_row["title"],
                "description": consent_row["description"],
                "signed": consent_row["signed"],
                "date": consent_row["date"].isoformat() if consent_row["date"] else None,
                "document": consent_row["document"],
                "notes": consent_row["notes"],
                "signatureData": consent_row["signature_data"],
                "expiresAt": consent_row["expires_at"].isoformat()
                if consent_row["expires_at"]
                else None,
                "createdAt": consent_row["created_at"].isoformat()
                if consent_row["created_at"]
                else None,
            }
            return JSONResponse(
                {
                    "success": True,
                    "consent": consent_data,
                    "candidateName": consent_row["candidate_name"] or "Ukjent",
                    "projectName": consent_row["project_name"] or "Ukjent prosjekt",
                }
            )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/portal/sign")
async def sign_consent_portal(request: Request):
    """Sign a consent via the portal."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        access_code = body.get("accessCode", "").upper()
        pin = body.get("pin")
        password = body.get("password")
        signature_data = body.get("signatureData")

        if not access_code or not signature_data:
            return JSONResponse(
                {"success": False, "error": "Tilgangskode og signatur er påkrevd"},
                status_code=400,
            )

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, pin, password, signed
                FROM casting_consents
                WHERE UPPER(access_code) = %s
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                """,
                (access_code,),
            )
            consent_row = cur.fetchone()
            if not consent_row:
                return JSONResponse(
                    {"success": False, "error": "Ugyldig eller utløpt tilgangskode"},
                    status_code=404,
                )

            if consent_row.get("pin") and pin != consent_row["pin"]:
                return JSONResponse(
                    {"success": False, "error": "Ugyldig PIN"}, status_code=401
                )
            if consent_row.get("password") and password != consent_row["password"]:
                return JSONResponse(
                    {"success": False, "error": "Ugyldig passord"}, status_code=401
                )
            if consent_row["signed"]:
                return JSONResponse(
                    {"success": False, "error": "Samtykke er allerede signert"},
                    status_code=400,
                )

            cur.execute(
                """
                UPDATE casting_consents
                SET signed = TRUE,
                    date = CURRENT_TIMESTAMP,
                    signature_data = %s,
                    invitation_status = 'signed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (json.dumps(signature_data), consent_row["id"]),
            )
            conn.commit()
        return JSONResponse({"success": True, "message": "Samtykke signert"})
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()


@router.post("/generate-access-code")
async def generate_consent_access_code(request: Request):
    """Generate a 6-character access code for a consent invitation."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        consent_id = body.get("consentId")
        pin = body.get("pin")
        password = body.get("password")
        expires_days = body.get("expiresDays", 30)

        if not consent_id:
            return JSONResponse(
                {"success": False, "error": "Consent ID er påkrevd"},
                status_code=400,
            )

        access_code = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=6)
        )

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE casting_consents
                SET access_code = %s,
                    pin = %s,
                    password = %s,
                    expires_at = CURRENT_TIMESTAMP + INTERVAL '%s days',
                    invitation_status = 'sent',
                    invitation_sent_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (access_code, pin, password, expires_days, consent_id),
            )
            result = cur.fetchone()
            if not result:
                return JSONResponse(
                    {"success": False, "error": "Samtykke ikke funnet"},
                    status_code=404,
                )
            conn.commit()
        return JSONResponse(
            {
                "success": True,
                "accessCode": access_code,
                "expiresAt": expires_days,
            }
        )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()
