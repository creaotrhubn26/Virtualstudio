"""Tutorials API routes.

Extracted from backend/main.py as the proof-of-pattern for the main.py split
(see backend/MAIN_SPLIT_PLAN.md). All other route groups follow the same
structure: import the service lazily, gate on its availability flag, return
503 when unavailable.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/tutorials", tags=["tutorials"])


def _require_service():
    """Import the tutorials service on first use. Raises 503 if unavailable."""
    try:
        import tutorials_service  # noqa: F401
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Tutorials service not available: {exc}",
        )
    return tutorials_service


@router.get("")
async def get_tutorials(category: Optional[str] = None):
    """Get all tutorials, optionally filtered by category."""
    svc = _require_service()
    try:
        tutorials = svc.get_all_tutorials(category)
        return JSONResponse({"success": True, "tutorials": tutorials})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active/{category}")
async def get_active_tutorial(category: str):
    """Get the active tutorial for a category."""
    svc = _require_service()
    try:
        tutorial = svc.get_active_tutorial(category)
        return JSONResponse({"success": True, "tutorial": tutorial})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{tutorial_id}")
async def get_tutorial(tutorial_id: str):
    """Get a single tutorial by ID."""
    svc = _require_service()
    try:
        tutorial = svc.get_tutorial(tutorial_id)
        if tutorial:
            return JSONResponse({"success": True, "tutorial": tutorial})
        raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_tutorial(request: Request):
    """Create a new tutorial (admin only)."""
    svc = _require_service()
    try:
        data = await request.json()
        created_by = data.pop("createdBy", None)
        tutorial = svc.create_tutorial(data, created_by)
        return JSONResponse({"success": True, "tutorial": tutorial})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{tutorial_id}")
async def update_tutorial(tutorial_id: str, request: Request):
    """Update a tutorial (admin only)."""
    svc = _require_service()
    try:
        data = await request.json()
        tutorial = svc.update_tutorial(tutorial_id, data)
        if tutorial:
            return JSONResponse({"success": True, "tutorial": tutorial})
        raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{tutorial_id}")
async def delete_tutorial(tutorial_id: str):
    """Delete a tutorial (admin only)."""
    svc = _require_service()
    try:
        success = svc.delete_tutorial(tutorial_id)
        if success:
            return JSONResponse({"success": True, "message": "Tutorial deleted"})
        raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{tutorial_id}/activate")
async def activate_tutorial(tutorial_id: str, request: Request):
    """Set a tutorial as active for its category (admin only)."""
    svc = _require_service()
    try:
        data = await request.json()
        category = data.get("category", "virtual-studio")
        success = svc.set_active_tutorial(tutorial_id, category)
        if success:
            return JSONResponse({"success": True, "message": "Tutorial activated"})
        raise HTTPException(status_code=404, detail="Tutorial not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
