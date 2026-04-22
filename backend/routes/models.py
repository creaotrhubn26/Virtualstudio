"""3D model serving — extracted from backend/main.py.

Serves GLB/GLTF files from the backend/rodin_models directory.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/models", tags=["models"])

MODELS_DIR = Path(__file__).resolve().parent.parent / "rodin_models"

_CONTENT_TYPES = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".bin": "application/octet-stream",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


@router.get("/{filename:path}")
async def serve_model_file(filename: str):
    """Serve 3D model files (GLB, GLTF, etc.) from rodin_models."""
    file_path = MODELS_DIR / filename
    if not file_path.exists():
        print(f"[Models] File not found: {file_path}")
        raise HTTPException(
            status_code=404, detail=f"Model file not found: {filename}"
        )
    content_type = _CONTENT_TYPES.get(
        file_path.suffix.lower(), "application/octet-stream"
    )
    print(f"[Models] Serving: {filename} ({content_type})")
    return FileResponse(
        path=str(file_path), media_type=content_type, filename=filename
    )
