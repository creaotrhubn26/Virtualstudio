"""
BlenderKit Search + Download Service
------------------------------------

Resolves prop descriptions against BlenderKit's curated model library. When a
suitable GLB/glTF variant exists this is cheaper and faster than a Meshy
text-to-3D generation (no credits, no wait), so the orchestrator tries
BlenderKit first in the resolver chain.

Honest limitations
------------------
BlenderKit's primary format is `.blend` (Blender's native). Only a fraction
of assets expose GLB/glTF variants. This service filters for GLB-compatible
results and returns a hard miss when none of the top search hits qualify —
the caller is expected to fall back to Meshy.

BlenderKit's "Full Plan" gate applies to most commercial assets: search works
without auth, but `download` endpoints return 402/403 for gated assets
unless the account has an active subscription. This service surfaces those
errors so the orchestrator can log + move on rather than silently skipping.

API reference: https://www.blenderkit.com/api/v1/
"""

from __future__ import annotations

import asyncio
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

BLENDERKIT_BASE = "https://www.blenderkit.com/api/v1"
BLENDERKIT_CDN_HOST = "www.blenderkit.com"

# Search ordering — score prioritises BlenderKit's curated ranking (downloads
# + ratings + completeness). "-score" is descending by score.
DEFAULT_ORDER = "-score"
# Pull the top N candidates; the first one with a usable GLB wins.
DEFAULT_TOP_N = 6
# File formats we can load straight into Babylon. Ordered by preference.
# gltf is acceptable (Babylon's SceneLoader handles both); we prefer single-
# file glb because it avoids needing to fetch adjacent .bin / texture files.
PREFERRED_FORMATS = ("glb", "gltf")


def _slugify(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return slug[:max_len] or "prop"


_PROCESS_SCENE_UUID: Optional[str] = None


def _process_scene_uuid() -> str:
    """Stable per-process scene_uuid for BlenderKit's download-tracking.
    Using one id per server run rather than per download keeps BlenderKit's
    analytics readable (it's effectively "one scene per backend process")."""
    global _PROCESS_SCENE_UUID
    if _PROCESS_SCENE_UUID is None:
        _PROCESS_SCENE_UUID = str(uuid.uuid4())
    return _PROCESS_SCENE_UUID


class BlenderKitService:
    def __init__(self) -> None:
        # Backend reads the server-side env var; the VITE_-prefixed twin
        # only exists for the frontend HDRI panel and is not consulted here.
        self.api_key = os.environ.get("BLENDERKIT_API_KEY", "").strip()
        self.output_dir = Path(__file__).parent / "blenderkit_models"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: Dict[str, Dict[str, Any]] = {}

    # ---- availability ----------------------------------------------------

    @property
    def enabled(self) -> bool:
        # Search works unauthenticated, but downloads require auth — so the
        # service is only useful with a real key. The orchestrator skips
        # this provider entirely when enabled=False.
        return bool(self.api_key)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "User-Agent": "virtualstudio-prop-resolver/1.0",
        }

    # ---- search ----------------------------------------------------------

    async def search_models(
        self,
        query: str,
        *,
        top_n: int = DEFAULT_TOP_N,
        order: str = DEFAULT_ORDER,
        free_only: bool = True,
    ) -> Dict[str, Any]:
        """Search the BlenderKit catalogue for models matching `query`.

        `free_only=True` (default) adds the `is_free=1` filter so paywalled
        assets never enter the candidate pool — this avoids repeatedly
        picking Full-Plan-gated results that will 402 at download time.
        Set it False when running on a Full-Plan token.

        Returns raw `results[]` sliced to `top_n`, each pared down to the
        fields the resolver actually uses.
        """
        if not self.enabled:
            return {"success": False, "error": "BLENDERKIT_API_KEY not configured"}

        params = {
            "query": query,
            "asset_type": "model",
            "order": order,
            "page_size": str(top_n),
        }
        if free_only:
            params["is_free"] = "1"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    f"{BLENDERKIT_BASE}/search/",
                    headers=self._headers(),
                    params=params,
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
            return {"success": False, "error": f"BlenderKit timeout ({type(exc).__name__})"}
        except (httpx.NetworkError, httpx.RequestError) as exc:
            return {"success": False, "error": f"BlenderKit network: {type(exc).__name__}"}

        if resp.status_code != 200:
            return {
                "success": False,
                "error": f"BlenderKit search {resp.status_code}: {resp.text[:300]}",
            }

        try:
            body = resp.json()
        except Exception as exc:
            return {"success": False, "error": f"Invalid JSON from BlenderKit: {exc}"}

        results = body.get("results") or []
        # Trim each result to the fields we actually need so callers and
        # logs stay readable. `files[]` is the interesting bit: each entry
        # is `{fileType, downloadUrl}` and tells us which formats exist.
        trimmed: List[Dict[str, Any]] = []
        for asset in results[:top_n]:
            trimmed.append(
                {
                    "id": asset.get("id"),
                    "assetBaseId": asset.get("assetBaseId"),
                    "name": asset.get("name"),
                    "description": asset.get("description", "")[:200],
                    "verificationStatus": asset.get("verificationStatus"),
                    "isFree": asset.get("isFree", False),
                    "canDownload": asset.get("canDownload", True),
                    "files": [
                        {
                            "fileType": f.get("fileType"),
                            "downloadUrl": f.get("downloadUrl"),
                        }
                        for f in (asset.get("files") or [])
                    ],
                }
            )
        return {"success": True, "count": body.get("count", 0), "results": trimmed}

    @staticmethod
    def _pick_glb_candidate(
        results: List[Dict[str, Any]],
    ) -> Optional[Tuple[Dict[str, Any], str, str]]:
        """Iterate the search results and return the first asset that has
        a `glb` or `gltf` file entry the caller is allowed to download.
        Returns `(asset, fileType, downloadUrl)` or None if no candidate.
        """
        for asset in results:
            if not asset.get("canDownload", True):
                continue
            for fmt in PREFERRED_FORMATS:
                for f in asset.get("files") or []:
                    if (f.get("fileType") or "").lower() == fmt and f.get("downloadUrl"):
                        return asset, fmt, f["downloadUrl"]
        return None

    # ---- download --------------------------------------------------------

    async def download_model(
        self,
        asset_name: str,
        download_url: str,
        *,
        scene_uuid: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Download a BlenderKit file to the local cache.

        BlenderKit's per-download tracking requires a `scene_uuid` query
        param on the signed URL — it's how they attribute downloads to a
        Blender scene/session. We generate a stable per-process UUID so
        repeated downloads from the same server run share one tracking id.

        The signed URL BlenderKit returns then redirects to S3/CDN. We
        follow redirects and write the result under `blenderkit_models/`
        with a slugged filename for easy inspection.
        """
        if not self.enabled:
            return {"success": False, "error": "BLENDERKIT_API_KEY not configured"}

        job_id = str(uuid.uuid4())
        filename = f"bkit_{_slugify(asset_name)}_{job_id[:8]}.glb"
        local_path = self.output_dir / filename

        # Attach scene_uuid as a query param. Use the process-scoped uuid
        # unless the caller overrides (e.g. to correlate with a scene id).
        if scene_uuid is None:
            scene_uuid = _process_scene_uuid()
        tracked_url = download_url
        if "scene_uuid=" not in tracked_url:
            sep = "&" if "?" in tracked_url else "?"
            tracked_url = f"{tracked_url}{sep}scene_uuid={scene_uuid}"

        # BlenderKit's download endpoint is a two-step dance:
        # 1. GET the tracked URL → JSON `{fileType, uuid, filePath}` where
        #    `filePath` is a signed CDN URL to the actual bytes.
        # 2. GET filePath → the .glb/.gltf bytes.
        try:
            async with httpx.AsyncClient(
                timeout=120.0,
                follow_redirects=True,
            ) as client:
                headers = self._headers()
                meta_resp = await client.get(tracked_url, headers=headers)
                if meta_resp.status_code == 402:
                    return {
                        "success": False,
                        "error": "BlenderKit: asset gated behind Full Plan (402)",
                    }
                if meta_resp.status_code in (401, 403):
                    return {
                        "success": False,
                        "error": f"BlenderKit auth failure ({meta_resp.status_code}): "
                        f"{meta_resp.text[:200]}",
                    }
                meta_resp.raise_for_status()

                # Step-1 response may be JSON metadata OR the bytes directly
                # depending on which downloadUrl we hit — handle both.
                content_type = (meta_resp.headers.get("content-type") or "").lower()
                bytes_payload: bytes
                if "application/json" in content_type or meta_resp.content[:1] == b"{":
                    try:
                        meta = meta_resp.json()
                    except Exception as exc:
                        return {
                            "success": False,
                            "error": f"BlenderKit download step-1 JSON parse: {exc}",
                        }
                    file_path = meta.get("filePath") or meta.get("file_path")
                    if not file_path:
                        return {
                            "success": False,
                            "error": f"BlenderKit download metadata missing filePath: {meta}",
                        }
                    # CDN URLs are pre-signed — don't resend the bearer token
                    # or S3 will reject with SignatureDoesNotMatch.
                    bytes_resp = await client.get(file_path)
                    bytes_resp.raise_for_status()
                    bytes_payload = bytes_resp.content
                else:
                    bytes_payload = meta_resp.content

                if not bytes_payload:
                    return {"success": False, "error": "BlenderKit returned zero bytes"}
                local_path.write_bytes(bytes_payload)
        except httpx.HTTPStatusError as exc:
            return {"success": False, "error": f"BlenderKit download HTTP {exc.response.status_code}"}
        except Exception as exc:
            return {"success": False, "error": f"BlenderKit download failed: {exc!r}"}

        size_kb = local_path.stat().st_size // 1024
        self._jobs[job_id] = {
            "asset_name": asset_name,
            "local_path": str(local_path),
            "size_kb": size_kb,
        }
        print(f"[BlenderKit] {job_id[:8]} → {local_path.name} ({size_kb} KB)")
        return {
            "success": True,
            "job_id": job_id,
            "local_path": str(local_path),
            "size_kb": size_kb,
            "asset_name": asset_name,
        }

    # ---- one-shot convenience -------------------------------------------

    async def find_and_download(self, query: str) -> Dict[str, Any]:
        """Search + pick best GLB candidate + download. Single entry point
        for the resolver chain.

        Returns on success:
            {"success": True, "local_path": ..., "asset_name": ..., "format": "glb"|"gltf"}
        On no-match (search OK but no GLB-capable result):
            {"success": False, "error": "no_glb_candidate", "searched": N}
        On all other errors:
            {"success": False, "error": "<detail>"}
        """
        search = await self.search_models(query)
        if not search.get("success"):
            return search

        picked = self._pick_glb_candidate(search["results"])
        if not picked:
            return {
                "success": False,
                "error": "no_glb_candidate",
                "searched": len(search["results"]),
                "message": (
                    f"BlenderKit had {len(search['results'])} matches for "
                    f"{query!r} but none exposed a .glb/.gltf variant"
                ),
            }

        asset, fmt, url = picked
        download = await self.download_model(asset.get("name", query), url)
        if not download.get("success"):
            return download

        return {
            **download,
            "format": fmt,
            "provider": "blenderkit",
            "asset_id": asset.get("id"),
        }


# ---- module-level singleton -------------------------------------------

_service: Optional[BlenderKitService] = None


def get_blenderkit_service() -> BlenderKitService:
    global _service
    if _service is None:
        _service = BlenderKitService()
    return _service
