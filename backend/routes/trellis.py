"""TRELLIS 3D environment generation API routes — extracted from backend/main.py.

Image → scene GLB via Replicate.
"""

import os

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix="/api/trellis", tags=["trellis"])


def _trellis_or_503(require_token: bool = True):
    try:
        from trellis_service import trellis_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"TRELLIS service ikke tilgjengelig: {exc}",
        )
    if trellis_service is None:
        raise HTTPException(status_code=503, detail="TRELLIS service ikke tilgjengelig")
    if require_token and not trellis_service.api_token:
        raise HTTPException(
            status_code=503,
            detail="REPLICATE_API_TOKEN er ikke satt. Legg det til under Secrets i Replit.",
        )
    return trellis_service


@router.post("/generate")
async def trellis_generate(
    request: Request,
    image: UploadFile = File(...),
    texture_size: int = 1024,
    mesh_simplify: float = 0.95,
    ss_steps: int = 12,
    slat_steps: int = 12,
):
    """Upload a scene image and convert it to a 3D GLB via TRELLIS on Replicate."""
    svc = _trellis_or_503()

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if (image.content_type or "") not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ikke støttet bildeformat: {image.content_type}. "
                "Bruk JPEG, PNG eller WebP."
            ),
        )

    image_data = await image.read()
    if len(image_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Bildet er for stort. Maks 25 MB.")

    public_base = os.environ.get("REPLIT_DEV_DOMAIN", "")
    if public_base and not public_base.startswith("http"):
        public_base = f"https://{public_base}"
    if not public_base:
        public_base = str(request.base_url).rstrip("/")

    result = await svc.generate_from_image(
        image_data=image_data,
        original_filename=image.filename or "upload.png",
        public_base_url=public_base,
        texture_size=texture_size,
        mesh_simplify=mesh_simplify,
        ss_steps=ss_steps,
        slat_steps=slat_steps,
    )
    return JSONResponse(result)


@router.get("/upload/{filename:path}")
async def serve_trellis_upload(filename: str):
    """Serve a temporarily stored upload image so Replicate can fetch it."""
    svc = _trellis_or_503(require_token=False)
    file_path = svc.uploads_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Opplastet bilde ikke funnet: {filename}")
    ext = file_path.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return FileResponse(path=str(file_path), media_type=mime_map.get(ext, "image/png"))


@router.get("/status/{job_id}")
async def trellis_status(job_id: str):
    """Poll the status of a TRELLIS generation job."""
    svc = _trellis_or_503(require_token=False)
    return JSONResponse(await svc.check_status(job_id))


@router.post("/download/{job_id}")
async def trellis_download(job_id: str):
    """Download the finished GLB and save it locally. Returns a serveable path."""
    svc = _trellis_or_503(require_token=False)
    return JSONResponse(await svc.download_model(job_id))


@router.get("/model/{filename:path}")
async def serve_trellis_model(filename: str):
    """Serve a generated TRELLIS GLB file."""
    svc = _trellis_or_503(require_token=False)
    file_path = svc.models_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Modell ikke funnet: {filename}")
    return FileResponse(
        path=str(file_path),
        media_type="model/gltf-binary",
        filename=filename,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/models")
async def list_trellis_models():
    """List all generated TRELLIS GLB models."""
    try:
        svc = _trellis_or_503(require_token=False)
    except HTTPException:
        return JSONResponse({"models": []})
    return JSONResponse({"models": svc.list_models()})
