"""Branding settings API routes — extracted from backend/main.py."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/branding", tags=["branding"])


def _service_or_503():
    try:
        import branding_service
    except ImportError as exc:
        return None, JSONResponse(
            status_code=503,
            content={"error": f"Branding service not available: {exc}"},
        )
    return branding_service, None


@router.get("/settings")
async def get_branding_settings():
    """Get branding settings."""
    svc, err = _service_or_503()
    if err:
        return err
    try:
        return {"settings": svc.get_branding_settings()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.put("/settings")
async def update_branding_settings(data: dict):
    """Update branding settings."""
    svc, err = _service_or_503()
    if err:
        return err
    settings = data.get("settings")
    if settings is None:
        return JSONResponse(
            status_code=400, content={"error": "Missing 'settings' in request body"}
        )
    try:
        return {"settings": svc.set_branding_settings(settings)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
