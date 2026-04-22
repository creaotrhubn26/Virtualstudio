"""App settings API routes — extracted from backend/main.py.

Note: this is app-level settings (per-user, per-namespace, per-project key/value
storage), distinct from branding settings.
"""

from typing import Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["settings"])


def _service_or_503():
    try:
        import settings_service
    except ImportError as exc:
        return None, JSONResponse(
            status_code=503,
            content={"error": f"Settings service not available: {exc}"},
        )
    return settings_service, None


@router.get("/settings")
async def get_app_settings(user_id: str, namespace: str, project_id: Optional[str] = None):
    """Get app settings by namespace and optional project scope."""
    svc, err = _service_or_503()
    if err:
        return err
    try:
        return {"data": svc.get_settings(user_id, namespace, project_id)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/settings/list")
async def list_app_settings(
    user_id: str, namespace_prefix: str, project_id: Optional[str] = None
):
    """List app settings by namespace prefix and optional project scope."""
    svc, err = _service_or_503()
    if err:
        return err
    try:
        return {"entries": svc.list_settings(user_id, namespace_prefix, project_id)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.put("/settings")
async def update_app_settings(data: dict):
    """Upsert app settings."""
    svc, err = _service_or_503()
    if err:
        return err
    user_id = data.get("userId")
    namespace = data.get("namespace")
    payload = data.get("data")
    project_id = data.get("projectId")
    if not user_id or not namespace:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing 'userId' or 'namespace' in request body"},
        )
    if payload is None:
        return JSONResponse(
            status_code=400, content={"error": "Missing 'data' in request body"}
        )
    try:
        return {"data": svc.set_settings(user_id, namespace, payload, project_id)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.delete("/settings")
async def delete_app_settings(user_id: str, namespace: str, project_id: Optional[str] = None):
    """Delete app settings for a namespace."""
    svc, err = _service_or_503()
    if err:
        return err
    try:
        return {"success": svc.delete_settings(user_id, namespace, project_id)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/analytics")
async def track_analytics(data: dict):
    """Analytics tracking endpoint (logging stub for development)."""
    return {"success": True, "event": data.get("event", "unknown"), "tracked": True}
