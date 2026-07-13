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


@router.get("/api/motion/library")
def list_library() -> Dict[str, Any]:
    """Catalog of mocap clips available to the motion tier."""
    try:
        from motion_library_service import get_motion_library_service
    except Exception as e:  # pragma: no cover - import guard
        raise HTTPException(status_code=503, detail=f"motion library unavailable: {e}")
    return {"clips": get_motion_library_service().describe()}


class LibraryUploadRequest(BaseModel):
    name: str
    bvh: str  # BVH file contents (plain text)
    keywords: Optional[List[str]] = None
    actions: Optional[List[str]] = None
    loop: bool = False


@router.post("/api/motion/library/upload")
def upload_library_clip(req: LibraryUploadRequest) -> Dict[str, Any]:
    """Add a BVH clip to the library. Validated by the BVH parser before it's
    persisted; registered in manifest.json and live on the next motion call."""
    if len(req.bvh) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="BVH exceeds 20 MB")
    try:
        from motion_library_service import get_motion_library_service
    except Exception as e:  # pragma: no cover - import guard
        raise HTTPException(status_code=503, detail=f"motion library unavailable: {e}")
    result = get_motion_library_service().add_clip(
        req.name, req.bvh,
        keywords=req.keywords, actions=req.actions, loop=req.loop,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


class DialogueRequest(BaseModel):
    text: str
    fps: int = 24
    joint_names: Optional[List[str]] = None
    # Real audio duration (seconds), once TTS is wired up client- or server-side.
    # Pins the talk clip's length so head motion matches the actual voice line
    # instead of the word-count estimate.
    duration_sec: Optional[float] = None


@router.post("/api/motion/dialogue")
def generate_dialogue(req: DialogueRequest) -> Dict[str, Any]:
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        from text_to_motion_service import text_to_motion_service
    except Exception as e:  # pragma: no cover - import guard
        raise HTTPException(status_code=503, detail=f"motion service unavailable: {e}")

    return text_to_motion_service.generate_dialogue(
        req.text,
        joint_names=req.joint_names,
        fps=max(1, min(60, req.fps)),
        duration_sec=req.duration_sec,
    )
