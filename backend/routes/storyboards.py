"""Storyboards API routes — extracted from backend/main.py.

Lists visual style templates / camera angles / camera movements, and
generates storyboard frames via gpt-image-1 (Replit AI Integrations),
uploading the result to R2.
"""

import base64
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/storyboards", tags=["storyboards"])


def _storyboard_or_503():
    try:
        from storyboard_image_service import storyboard_image_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Storyboard image service not available: {exc}",
        )
    if storyboard_image_service is None:
        raise HTTPException(
            status_code=503, detail="Storyboard service not initialized"
        )
    return storyboard_image_service


@router.get("/templates")
async def get_storyboard_templates():
    """Get all available storyboard visual style templates."""
    return _storyboard_or_503().get_templates()


@router.get("/camera-angles")
async def get_camera_angles():
    return _storyboard_or_503().get_camera_angles()


@router.get("/camera-movements")
async def get_camera_movements():
    return _storyboard_or_503().get_camera_movements()


@router.post("/generate-frame")
async def generate_storyboard_frame(request: dict):
    """Generate a storyboard frame via gpt-image-1 and upload to R2."""
    svc = _storyboard_or_503()
    if not getattr(svc, "enabled", False):
        raise HTTPException(
            status_code=503,
            detail=(
                "Storyboard image service is not configured. "
                "Check AI Integrations setup."
            ),
        )

    prompt = request.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    result = await svc.generate_image(
        description=prompt,
        template_id=request.get("template", "cinematic"),
        camera_angle=request.get("camera_angle"),
        camera_movement=request.get("camera_movement"),
        additional_notes=request.get("additional_notes"),
        size=request.get("size", "1536x1024"),
    )

    if not result["success"]:
        if result.get("error_code") == "BUDGET_EXCEEDED":
            raise HTTPException(status_code=402, detail=result.get("error"))
        raise HTTPException(
            status_code=500, detail=result.get("error", "Generation failed")
        )

    # Upload concept image to R2; fall back to base64 in response if R2 fails.
    try:
        from utils.r2_client import CASTING_ASSETS_BUCKET, upload_to_r2

        frame_id = request.get("frame_id", str(uuid.uuid4()))
        storyboard_id = request.get("storyboard_id", "temp")
        project_id = request.get("project_id", "temp")

        r2_key = (
            f"storyboards/{project_id}/{storyboard_id}/frames/{frame_id}/original.png"
        )
        image_bytes = base64.b64decode(result["image_base64"])
        public_url = upload_to_r2(
            image_bytes, r2_key, "image/png", bucket=CASTING_ASSETS_BUCKET
        )
        return JSONResponse(
            {
                "success": True,
                "imageUrl": public_url,
                "imageKey": r2_key,
                "prompt": result["prompt_used"],
                "template": result["template"],
                "model": "gpt-image-1",
            }
        )
    except ValueError:
        # R2 credentials not configured
        return JSONResponse(
            {
                "success": True,
                "imageBase64": result["image_base64"],
                "prompt": result["prompt_used"],
                "template": result["template"],
                "model": "gpt-image-1",
            }
        )
    except Exception as e:
        print(f"Error uploading generated image: {e}")
        return JSONResponse(
            {
                "success": True,
                "imageBase64": result["image_base64"],
                "prompt": result["prompt_used"],
                "template": result["template"],
                "model": "gpt-image-1",
            }
        )
