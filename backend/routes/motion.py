"""Text-to-motion API routes.

  POST /api/motion/text   — natural-language prompt → animation clip

Returns a runtime clip (per-joint quaternion tracks keyed by MHR joint name)
that the browser applies to the active SAM 3D avatar. Procedural today; a neural
text-to-motion model can be slotted behind the service without changing this
route or the frontend (see text_to_motion_service).
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["motion"])


class MotionRequest(BaseModel):
    prompt: str
    fps: int = 24
    # Optional caller-supplied rig; defaults to the MHR-70 skeleton.
    joint_names: Optional[List[str]] = None


@router.post("/api/motion/text")
def generate_motion(req: MotionRequest) -> Dict[str, Any]:
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")
    try:
        from text_to_motion_service import text_to_motion_service
    except Exception as e:  # pragma: no cover - import guard
        raise HTTPException(status_code=503, detail=f"motion service unavailable: {e}")

    clip = text_to_motion_service.generate(
        req.prompt,
        joint_names=req.joint_names,
        fps=max(1, min(60, req.fps)),
    )
    return clip
