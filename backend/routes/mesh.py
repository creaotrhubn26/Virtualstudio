"""
Mesh utility routes — GLB analysis and cleanup/decimation.

POST /api/mesh/analyze  — upload a GLB (or point at a URL), get structural
                          stats back (faces, vertices, skin, textures).
POST /api/mesh/clean    — same input, returns the optimized GLB bytes with
                          the stats in X-Mesh-Stats (JSON) response header.

Both accept EITHER multipart file upload (field name "file") OR a JSON body
{"glbUrl": "..."} pointing at a URL the backend can reach — including the
app's own /api/scene-director/r2/... proxy paths.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, File, Response, UploadFile
from pydantic import BaseModel

from mesh_cleanup_service import analyze_glb, clean_glb

router = APIRouter(prefix="/api/mesh", tags=["mesh"])

MAX_GLB_BYTES = 200 * 1024 * 1024  # 200 MB hard cap — beyond this, refuse.


class UrlPayload(BaseModel):
    glbUrl: str
    force: bool = False


async def _fetch_url(url: str) -> bytes:
    # Relative URLs refer to this same backend (e.g. the R2 proxy route);
    # resolve them against localhost so the route works in every deployment.
    if url.startswith("/"):
        port = os.environ.get("PORT", "8000")
        url = f"http://127.0.0.1:{port}{url}"
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        if len(resp.content) > MAX_GLB_BYTES:
            raise ValueError(f"GLB exceeds {MAX_GLB_BYTES // (1024 * 1024)} MB cap")
        return resp.content


@router.post("/analyze")
async def analyze(
    file: Optional[UploadFile] = File(None),
    payload: Optional[UrlPayload] = None,
) -> Dict[str, Any]:
    try:
        if file is not None:
            glb = await file.read()
        elif payload is not None and payload.glbUrl:
            glb = await _fetch_url(payload.glbUrl)
        else:
            return {"success": False, "error": "provide a file upload or glbUrl"}
    except Exception as exc:  # noqa: BLE001 - surface fetch errors as JSON
        return {"success": False, "error": f"could not read GLB: {exc}"}

    stats = analyze_glb(glb)
    return {"success": "error" not in stats, **stats}


@router.post("/clean")
async def clean(
    file: Optional[UploadFile] = File(None),
    payload: Optional[UrlPayload] = None,
    force: bool = False,
) -> Response:
    try:
        if file is not None:
            glb = await file.read()
        elif payload is not None and payload.glbUrl:
            glb = await _fetch_url(payload.glbUrl)
            force = force or payload.force
        else:
            return Response(
                content=json.dumps({"success": False, "error": "provide a file upload or glbUrl"}),
                media_type="application/json",
                status_code=400,
            )
    except Exception as exc:  # noqa: BLE001
        return Response(
            content=json.dumps({"success": False, "error": f"could not read GLB: {exc}"}),
            media_type="application/json",
            status_code=400,
        )

    cleaned, stats = clean_glb(glb, force=force)
    return Response(
        content=cleaned,
        media_type="model/gltf-binary",
        headers={"X-Mesh-Stats": json.dumps(stats)},
    )
