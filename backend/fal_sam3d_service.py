"""
fal.ai SAM 3D Body Service — image URL → rigged, animation-ready GLB.

Hosted alternative to self-hosting Meta's SAM 3D Body (sam3d_service.py,
sam3d_repo/). Running the model locally needs a GPU, several GB of downloaded
checkpoints (model.ckpt, mhr_model.pt), and Meta's `mhr`/`pymomentum` packages —
the latter has no prebuilt wheel for most platforms and must be compiled from
source (see mhr_rig_export.py's docstring for what that build needs). fal.ai
runs the same SAM 3D Body model as a hosted endpoint for $0.02/generation —
no GPU, no checkpoints, no native build.

Used by character_casting_service.py as the preferred image→3D backend
(replacing TripoSR, which outputs a static, unrigged mesh) whenever FAL_KEY is
configured; character_casting_service falls back to TripoSR otherwise.

API: POST https://queue.fal.run/fal-ai/sam-3/3d-body, then poll the returned
status_url until COMPLETED, then GET response_url. Response includes
`model_glb.url` (an already-rigged, animation-ready GLB — Meta's own MHR
skeleton, not a Virtual Studio mhr_rig_export.py rig) and `metadata.people[]`
with `keypoints_3d` (70 MHR body keypoints, camera-space) + `focal_length` per
detected person, which `mhr_rig_export.py` can also ingest directly since it's
the same 70-keypoint convention as metadata/mhr70.py.

Reference: https://fal.ai/models/fal-ai/sam-3/3d-body/api
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

FAL_QUEUE_BASE = "https://queue.fal.run"
FAL_APP = "fal-ai/sam-3/3d-body"
POLL_INTERVAL_SEC = 3.0
DEFAULT_TIMEOUT_SEC = 180.0


class FalSam3DService:
    def __init__(self) -> None:
        self.api_key = os.environ.get("FAL_KEY", "").strip()
        self.output_dir = Path(__file__).parent / "outputs" / "fal_sam3d"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Key {self.api_key}", "Content-Type": "application/json"}

    async def generate_from_image_url(
        self,
        image_url: str,
        *,
        mask_url: Optional[str] = None,
        timeout_sec: float = DEFAULT_TIMEOUT_SEC,
    ) -> Dict[str, Any]:
        """Submit a publicly-reachable image URL to fal.ai's hosted SAM 3D Body
        and poll until the rigged GLB is ready.

        Returns {success, glbUrl, keypoints3d, focalLength, error}. `image_url`
        must be fetchable by fal.ai's servers — a data: URI is not accepted by
        this endpoint, so callers upload the image (e.g. to R2) first.
        """
        if not self.enabled:
            return {"success": False, "error": "FAL_KEY not configured"}

        payload: Dict[str, Any] = {
            "image_url": image_url,
            "export_meshes": True,
            "include_3d_keypoints": True,
        }
        if mask_url:
            payload["mask_url"] = mask_url

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                submit_resp = await client.post(
                    f"{FAL_QUEUE_BASE}/{FAL_APP}", headers=self._headers(), json=payload
                )
                submit_resp.raise_for_status()
                submit_data = submit_resp.json()
                status_url = submit_data.get("status_url")
                response_url = submit_data.get("response_url")
                if not status_url or not response_url:
                    return {"success": False, "error": f"unexpected submit response: {submit_data}"}

                elapsed = 0.0
                status_data: Dict[str, Any] = {}
                while elapsed < timeout_sec:
                    status_resp = await client.get(status_url, headers=self._headers())
                    status_resp.raise_for_status()
                    status_data = status_resp.json()
                    status = status_data.get("status")
                    if status == "COMPLETED":
                        break
                    if status in ("FAILED", "ERROR"):
                        return {"success": False, "error": f"fal.ai job failed: {status_data}"}
                    await asyncio.sleep(POLL_INTERVAL_SEC)
                    elapsed += POLL_INTERVAL_SEC
                else:
                    return {"success": False, "error": f"fal.ai job timed out after {timeout_sec:.0f}s"}

                result_resp = await client.get(response_url, headers=self._headers())
                result_resp.raise_for_status()
                result = result_resp.json()
        except httpx.HTTPStatusError as exc:
            return {"success": False, "error": f"fal.ai HTTP {exc.response.status_code}: {exc.response.text[:300]}"}
        except Exception as exc:  # noqa: BLE001 - surface any transport error to the caller
            return {"success": False, "error": f"fal.ai request failed: {exc}"}

        glb_url = (result.get("model_glb") or {}).get("url")
        if not glb_url:
            return {"success": False, "error": f"no model_glb in fal.ai response: {result}"}

        people: List[Dict[str, Any]] = (result.get("metadata") or {}).get("people") or []
        first = people[0] if people else {}
        return {
            "success": True,
            "glbUrl": glb_url,
            "keypoints3d": first.get("keypoints_3d"),
            "focalLength": first.get("focal_length"),
            "personCount": len(people),
        }

    async def download_glb(self, glb_url: str) -> bytes:
        """Fetch the generated GLB's bytes so the caller can cache it locally
        (mirrors the pattern used for TripoSR/Meshy downloads elsewhere)."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(glb_url)
            resp.raise_for_status()
            return resp.content


_INSTANCE: Optional[FalSam3DService] = None


def get_fal_sam3d_service() -> FalSam3DService:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = FalSam3DService()
    return _INSTANCE
