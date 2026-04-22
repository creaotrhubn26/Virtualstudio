"""User KV API routes — extracted from backend/main.py."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/user/kv", tags=["user_kv"])


def _service_or_503():
    try:
        import user_kv_service
    except ImportError as exc:
        return None, JSONResponse(
            status_code=503,
            content={"error": f"User KV service not available: {exc}"},
        )
    return user_kv_service, None


@router.post("")
async def store_user_kv(data: dict):
    """Store user key-value settings."""
    svc, err = _service_or_503()
    if err:
        return err
    try:
        key = data.get("key")
        value = data.get("value")
        user_id = data.get("user_id", "default")
        if not key:
            return JSONResponse(
                status_code=400, content={"error": "Missing 'key' in request body"}
            )
        svc.set_user_kv(user_id, key, value)
        return {"success": True, "key": key, "user_id": user_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{key}")
async def get_user_kv(key: str, user_id: str = "default"):
    """Get user key-value setting."""
    svc, err = _service_or_503()
    if err:
        return err
    try:
        value = svc.get_user_kv(user_id, key)
        return {"key": key, "value": value, "user_id": user_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
