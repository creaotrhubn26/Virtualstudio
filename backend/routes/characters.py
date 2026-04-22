"""Character generation API — description → full-body reference → 3D GLB.

Endpoints:
  POST /api/characters/generate-from-description — kick off (or reuse cached)
                                                  casting pipeline
  GET  /api/characters/{key}.glb                — serve generated GLB
  GET  /api/characters/{key}.png                — serve reference image
  GET  /api/characters/status/{key}             — check cache/status
  GET  /api/characters/                         — list cached characters
"""

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/characters", tags=["characters"])

CHARACTERS_DIR = Path(__file__).resolve().parent.parent / "outputs" / "characters"


class CastPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(
        default=None,
        description="Free-text description: age, build, clothing, hair, vibe.",
        max_length=2000,
    )
    useCache: bool = True


def _service_or_503():
    try:
        from character_casting_service import get_character_casting_service
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Character casting service not available: {exc}",
        )
    return get_character_casting_service()


@router.post("/generate-from-description")
async def generate_from_description(payload: CastPayload):
    """Run Claude → image-gen → TripoSR pipeline for one character.

    Returns the final CastingJob with the GLB URL once ready. Cached
    results return immediately without triggering any external calls.
    """
    svc = _service_or_503()
    try:
        job = await svc.cast(
            payload.name,
            payload.description,
            use_cache=payload.useCache,
        )
        return JSONResponse(
            {"success": job.status in {"ready", "cached"}, "job": job.to_dict()}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Casting error: {exc}")


@router.get("/status/{key}")
async def get_status(key: str):
    """Check whether a character GLB is cached on disk."""
    glb = CHARACTERS_DIR / f"{key}.glb"
    if not glb.exists():
        return JSONResponse({"cached": False, "key": key})
    return JSONResponse(
        {
            "cached": True,
            "key": key,
            "glbUrl": f"/api/characters/{key}.glb",
            "sizeBytes": glb.stat().st_size,
        }
    )


@router.get("/")
async def list_characters():
    """List every cached character GLB."""
    entries: List[dict] = []
    if not CHARACTERS_DIR.exists():
        return JSONResponse({"characters": []})
    for glb in CHARACTERS_DIR.glob("*.glb"):
        key = glb.stem
        meta_path = CHARACTERS_DIR / f"{key}.json"
        meta = {}
        if meta_path.exists():
            try:
                import json
                meta = json.loads(meta_path.read_text("utf-8"))
            except Exception:
                pass
        entries.append(
            {
                "key": key,
                "name": meta.get("name", key),
                "description": meta.get("description"),
                "glbUrl": f"/api/characters/{key}.glb",
                "imageUrl": f"/api/characters/{key}.png"
                if (CHARACTERS_DIR / f"{key}.png").exists()
                else None,
                "sizeBytes": glb.stat().st_size,
            }
        )
    return JSONResponse({"characters": entries})


@router.get("/{filename:path}")
async def serve_character_asset(filename: str):
    """Serve cached character files — GLB or PNG by filename."""
    # Prevent path traversal
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = CHARACTERS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Character asset not found: {filename}")
    ext = file_path.suffix.lower()
    media_types = {
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".json": "application/json",
    }
    return FileResponse(
        path=str(file_path),
        media_type=media_types.get(ext, "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=3600"},
        filename=filename,
    )
