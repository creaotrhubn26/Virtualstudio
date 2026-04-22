"""Fiken accounting integration routes — extracted from backend/main.py.

Both routes are stubs in the inline version — they return static responses
without actually talking to Fiken's API. Keeping the behavior identical
here; real integration would go in this file when added.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["fiken"])


@router.get("/api/accounting/fiken/status")
async def get_fiken_status():
    """Check Fiken integration status (stub: always returns disconnected)."""
    return JSONResponse({"hasFiken": False})


@router.post("/api/split-sheets/invoices/{invoice_id}/send-fiken")
async def send_invoice_to_fiken(invoice_id: str, request: Request):
    """Send an invoice to Fiken (stub: simulates success)."""
    return JSONResponse(
        {
            "success": True,
            "message": "Invoice synced to Fiken",
            "fikenInvoiceId": f"fiken-{invoice_id}",
        }
    )
