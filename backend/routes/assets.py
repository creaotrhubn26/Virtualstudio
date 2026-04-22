"""Asset browser API routes — extracted from backend/main.py.

Proxy routes for Poly Haven / ambientCG / Sketchfab / Poly Pizza.
All dispatch to asset_browser_service functions imported lazily.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response

router = APIRouter(prefix="/api/assets", tags=["assets"])


def _asset_svc_or_503():
    try:
        import asset_browser_service as svc
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Asset browser service unavailable: {exc}"
        )
    return svc


@router.get("/search")
async def asset_browser_search(
    source: str,
    q: str = "",
    type: str = "models",
    limit: int = 24,
):
    """Unified search proxy for Poly Haven, ambientCG, Sketchfab, Poly Pizza."""
    svc = _asset_svc_or_503()
    result = await svc.search_assets(
        source=source, query=q, asset_type=type, limit=min(limit, 48)
    )
    return JSONResponse(result)


@router.get("/polyhaven/gltf/{slug}")
async def asset_polyhaven_gltf(slug: str, resolution: str = "1k"):
    """Fetch + rewrite Poly Haven GLTF so Babylon.js can load it via CORS."""
    svc = _asset_svc_or_503()
    try:
        gltf_bytes = await svc.polyhaven_gltf_proxy(slug, resolution)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(
        content=gltf_bytes,
        media_type="model/gltf+json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


@router.get("/sketchfab/download/{uid}")
async def asset_sketchfab_download(uid: str):
    """Get a temporary GLB download URL for a Sketchfab model."""
    svc = _asset_svc_or_503()
    url = await svc.sketchfab_get_download_url(uid)
    if not url:
        raise HTTPException(
            status_code=404,
            detail="Download URL not available — check SKETCHFAB_API_TOKEN",
        )
    return JSONResponse({"url": url})
