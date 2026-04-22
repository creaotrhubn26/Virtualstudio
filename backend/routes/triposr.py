"""TripoSR 3D generation API routes — extracted from backend/main.py.

Upload an image, generate a GLB via TripoSR on Replicate.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix="/api/triposr", tags=["triposr"])


def _triposr_or_503():
    try:
        from triposr_service import triposr_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"TripoSR service not available: {exc}",
        )
    if triposr_service is None:
        raise HTTPException(status_code=503, detail="TripoSR service not initialized")
    if not triposr_service.api_token:
        raise HTTPException(
            status_code=503,
            detail="REPLICATE_API_TOKEN is not set. Add it in your Replit project Secrets.",
        )
    return triposr_service


@router.post("/generate")
async def triposr_generate(
    image: UploadFile = File(...),
    do_remove_background: bool = True,
    foreground_ratio: float = 0.85,
):
    """Upload an image and generate a high-quality GLB via TripoSR on Replicate."""
    svc = _triposr_or_503()

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if (image.content_type or "") not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {image.content_type}. Use JPEG, PNG or WebP.",
        )

    image_data = await image.read()
    if len(image_data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 20 MB.")

    result = await svc.generate_from_image(
        image_data=image_data,
        original_filename=image.filename or "upload.png",
        do_remove_background=do_remove_background,
        foreground_ratio=foreground_ratio,
    )
    return JSONResponse(result)


@router.get("/status/{job_id}")
async def triposr_status(job_id: str):
    """Poll the status of a TripoSR generation job."""
    svc = _triposr_or_503()
    return JSONResponse(await svc.check_status(job_id))


@router.post("/download/{job_id}")
async def triposr_download(job_id: str):
    """Download the finished GLB and save it locally. Returns a serveable URL."""
    svc = _triposr_or_503()
    return JSONResponse(await svc.download_model(job_id))


@router.get("/model/{filename:path}")
async def serve_triposr_model(filename: str):
    """Serve a generated TripoSR GLB file."""
    svc = _triposr_or_503()
    file_path = svc.output_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {filename}")
    return FileResponse(
        path=str(file_path),
        media_type="model/gltf-binary",
        filename=filename,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/models")
async def list_triposr_models():
    """List all generated TripoSR GLB models."""
    try:
        svc = _triposr_or_503()
    except HTTPException:
        # For "models" we return empty list rather than 503 — preserves legacy behavior.
        return JSONResponse({"models": []})
    return JSONResponse({"models": svc.list_models()})
