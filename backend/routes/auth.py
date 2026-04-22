"""Admin authentication API routes — extracted from backend/main.py."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _auth_or_503():
    try:
        import auth_service as svc
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Auth service not available: {exc}"
        )
    return svc


@router.post("/login")
async def login(request: Request):
    """Login with email and password."""
    svc = _auth_or_503()
    try:
        data = await request.json()
        email = data.get("email", "").strip()
        password = data.get("password", "")
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        user = svc.authenticate_user(email, password)
        if user:
            return JSONResponse({"success": True, "user": user})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admins")
async def list_admins():
    """List all admin users."""
    svc = _auth_or_503()
    try:
        return JSONResponse({"success": True, "admins": svc.get_all_admins()})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admins")
async def create_admin(request: Request):
    """Create a new admin user."""
    svc = _auth_or_503()
    try:
        data = await request.json()
        email = data.get("email", "").strip()
        role = data.get("role", "admin")
        display_name = data.get("display_name")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        password = data.get("password") or svc.generate_password()
        user = svc.create_admin_user(email, password, role, display_name)
        return JSONResponse(
            {"success": True, "user": user, "generated_password": password}
        )
    except HTTPException:
        raise
    except Exception as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/admins/{user_id}")
async def update_admin(user_id: int, request: Request):
    """Update an admin user."""
    svc = _auth_or_503()
    try:
        data = await request.json()
        updated = svc.update_admin_user(user_id, data)
        if updated:
            return JSONResponse({"success": True, "user": updated})
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admins/{user_id}")
async def remove_admin(user_id: int):
    """Delete an admin user."""
    svc = _auth_or_503()
    try:
        if svc.delete_admin_user(user_id):
            return JSONResponse({"success": True, "message": "User deleted"})
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admins/{user_id}/reset-password")
async def reset_admin_password(user_id: int):
    """Generate a new password for an admin user."""
    svc = _auth_or_503()
    try:
        new_password = svc.generate_password()
        updated = svc.update_admin_user(user_id, {"password": new_password})
        if updated:
            return JSONResponse(
                {"success": True, "user": updated, "new_password": new_password}
            )
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
