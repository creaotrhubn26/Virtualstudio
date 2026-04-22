"""Avatar generation + face analysis API routes — extracted from backend/main.py.

Covers:
  POST /api/generate-avatar               — SAM3D-only GLB generation
  GET  /api/avatar/{request_id}.glb       — download
  HEAD /api/avatar/{request_id}.glb       — existence + Content-Length
  DELETE /api/avatar/{request_id}         — delete
  POST /api/analyze-face                  — gender/age/category (face_analysis)
  POST /api/facexformer/analyze           — landmarks + head pose (facexformer)
  POST /api/generate-avatar-with-analysis — combined SAM3D + face_analysis + facexformer

All three ML services are imported lazily on first use; endpoints return 503
when a service is unavailable (mirrors the behavior of the inline version).
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response

router = APIRouter(tags=["avatar"])

BACKEND_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"
OUTPUT_DIR = BACKEND_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _sam3d_or_503():
    try:
        from sam3d_service import SAM3DService
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"SAM 3D service not available: {exc}"
        )
    # SAM3DService is a class; the live inline code constructs a singleton on
    # startup. Constructing per-request would be wasteful but correct; the
    # router keeps a module-level cache.
    global _sam3d_singleton
    try:
        return _sam3d_singleton
    except NameError:
        pass
    _sam3d_singleton = SAM3DService()  # type: ignore[name-defined]
    return _sam3d_singleton


def _face_analysis_or_503():
    try:
        from face_analysis_service import face_analysis_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Face analysis service not available: {exc}"
        )
    return face_analysis_service


def _facexformer_or_503():
    try:
        from facexformer_service import facexformer_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"FaceXFormer service not available: {exc}"
        )
    return facexformer_service


# --- avatar generation ------------------------------------------------------


@router.post("/api/generate-avatar")
async def generate_avatar(file: UploadFile = File(...)):
    """Generate a 3D avatar GLB from an uploaded image (SAM3D only)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    sam3d = _sam3d_or_503()
    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"

    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)

        result = await sam3d.generate_avatar(str(input_path), str(output_path))
        if not result["success"]:
            raise HTTPException(
                status_code=500, detail=result.get("error", "Generation failed")
            )

        return JSONResponse(
            {
                "success": True,
                "request_id": request_id,
                "glb_url": f"/api/avatar/{request_id}.glb",
                "metadata": result.get("metadata", {}),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)


@router.get("/api/avatar/{request_id}.glb")
async def get_avatar(request_id: str):
    """Download the generated GLB avatar file."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(
        path=str(output_path),
        media_type="model/gltf-binary",
        filename=f"avatar_{request_id}.glb",
    )


@router.head("/api/avatar/{request_id}.glb")
async def head_avatar(request_id: str):
    """Check if avatar exists (for Babylon.js loader)."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    return Response(
        headers={
            "Content-Type": "model/gltf-binary",
            "Content-Length": str(output_path.stat().st_size),
        }
    )


@router.delete("/api/avatar/{request_id}")
async def delete_avatar(request_id: str):
    """Delete a generated avatar file."""
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"
    if output_path.exists():
        os.remove(output_path)
        return {"success": True, "message": "Avatar deleted"}
    raise HTTPException(status_code=404, detail="Avatar not found")


# --- face analysis ----------------------------------------------------------


@router.post("/api/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    """Detect gender + age category from a face image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    svc = _face_analysis_or_503()
    try:
        contents = await file.read()
        result = svc.analyze_image_bytes(contents)
        if result is None:
            raise HTTPException(status_code=500, detail="Face analysis failed")
        return JSONResponse(
            {
                "success": result.get("detected", False),
                "gender": result.get("gender"),
                "gender_confidence": result.get("gender_confidence"),
                "age_range": result.get("age_range"),
                "age_confidence": result.get("age_confidence"),
                "category": result.get("category"),
                "message": result.get("message") or result.get("error"),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/facexformer/analyze")
async def facexformer_analyze(file: UploadFile = File(...)):
    """Analyze face with the FaceXFormer model (landmarks, head pose, attrs)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    svc = _facexformer_or_503()
    if not svc.is_enabled():
        return JSONResponse(
            {
                "success": False,
                "enabled": False,
                "message": "FaceXFormer is disabled. Set ENABLE_FACEXFORMER=true to enable.",
            }
        )

    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)
        result = await svc.analyze_face(str(input_path))
        return JSONResponse(
            {"success": result.get("face_detected", False), "enabled": True, **result}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)


# --- combined avatar + face analysis ----------------------------------------


@router.post("/api/generate-avatar-with-analysis")
async def generate_avatar_with_analysis(file: UploadFile = File(...)):
    """Generate 3D avatar AND analyze face in one request."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    sam3d = _sam3d_or_503()
    # Face analysis + facexformer are optional here — the inline code
    # swallowed ImportError; preserve that behavior.
    try:
        face_svc = _face_analysis_or_503()
    except HTTPException:
        face_svc = None
    try:
        facexformer_svc = _facexformer_or_503()
        if not facexformer_svc.is_enabled():
            facexformer_svc = None
    except HTTPException:
        facexformer_svc = None

    request_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{request_id}_{file.filename}"
    output_path = OUTPUT_DIR / f"{request_id}_avatar.glb"

    try:
        contents = await file.read()
        with open(input_path, "wb") as f:
            f.write(contents)

        face_result = face_svc.analyze_image(str(input_path)) if face_svc else None
        facexformer_result = (
            await facexformer_svc.analyze_face(str(input_path)) if facexformer_svc else None
        )

        result = await sam3d.generate_avatar(str(input_path), str(output_path))
        if not result["success"]:
            raise HTTPException(
                status_code=500, detail=result.get("error", "Generation failed")
            )

        response_data = {
            "success": True,
            "request_id": request_id,
            "glb_url": f"/api/avatar/{request_id}.glb",
            "metadata": result.get("metadata", {}),
        }

        if face_result and face_result.get("detected"):
            response_data["face_analysis"] = {
                "gender": face_result.get("gender"),
                "gender_confidence": face_result.get("gender_confidence"),
                "age_range": face_result.get("age_range"),
                "age_confidence": face_result.get("age_confidence"),
                "category": face_result.get("category"),
            }

        if facexformer_result and facexformer_result.get("face_detected"):
            response_data["facexformer"] = {
                "head_pose": facexformer_result.get("head_pose"),
                "face_box": facexformer_result.get("face_box"),
            }

        return JSONResponse(response_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            os.remove(input_path)
