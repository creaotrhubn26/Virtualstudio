"""
Blockade Labs Skybox Service
----------------------------

Resolves a free-text location description ("middle of Times Square at golden
hour", "Norwegian fjord at dawn", "neon-soaked Tokyo alley at night") to a
real equirectangular skybox image — Babylon loads it as the scene's HDRI /
backdrop. This is the cheapest, fastest path to "any real-world location" in
the AI-directed virtual studio.

Why this service exists
-----------------------
Meshy + BlenderKit generate single objects (props, characters). They don't
generate entire environments. set.a.light 3D's answer is hand-built studio
backdrops; ours is AI-generated 360° panoramas via Blockade. One API call
becomes one scene's environment — same fingerprint cache as the prop /
character resolvers, so a re-request for the same location is free.

API reference: https://blockadelabs.com/skybox-api
Pricing: free tier ~10 generations/day, paid tiers ~$0.05–0.10 per skybox
(LDR PNG) or ~$0.30 per HDR variant.

Output formats
--------------
- file_url       — equirectangular PNG, 4096×2048 (LDR, suitable as scene
                   backdrop / unlit env)
- thumb_url      — preview thumbnail
- depth_map_url  — 16-bit grayscale depth (paid tier; useful for parallax
                   layers but optional)
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

BLOCKADE_BASE_URL = "https://backend.blockadelabs.com/api/v1"
# Realistic style — what a director normally wants for set previz. Other
# styles (anime, fantasy, oil painting) live behind the same endpoint via
# a different skybox_style_id. We expose it as a parameter rather than
# hard-coding "realistic" so the Scene Director can pick stylized when the
# beat asks for it.
DEFAULT_SKYBOX_STYLE_ID = 2  # "Realistic"
# Cap free-text descriptions so a runaway Claude prompt doesn't 400.
MAX_PROMPT_CHARS = 550


def _slugify(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return slug[:max_len] or "skybox"


class BlockadeService:
    def __init__(self) -> None:
        self.api_key = os.environ.get("BLOCKADE_API_KEY", "").strip()
        self.output_dir = Path(__file__).parent / "blockade_skyboxes"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: Dict[str, Dict[str, Any]] = {}

    # ---- availability ---------------------------------------------------

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> Dict[str, str]:
        if not self.enabled:
            raise RuntimeError(
                "BLOCKADE_API_KEY is not set. Add it to .env; this service "
                "cannot run without an authenticated key."
            )
        # Blockade uses x-api-key header, NOT bearer auth. Easy to get
        # wrong; documenting here so a future reviewer doesn't switch it.
        return {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    # ---- submit + poll --------------------------------------------------

    async def submit_skybox(
        self,
        prompt: str,
        *,
        skybox_style_id: int = DEFAULT_SKYBOX_STYLE_ID,
        negative_text: str = "",
        enhance_prompt: bool = True,
    ) -> Dict[str, Any]:
        """Create a skybox-generation request.

        Returns `{success, job_id, request_id}`. `job_id` is our UUID;
        `request_id` is Blockade's — keep both for log correlation.

        `enhance_prompt=True` lets Blockade's text-enhancer tweak the
        prompt for better skybox composition (we usually want this).
        Set False when the Scene Director gives us a careful prompt
        that should pass through verbatim.
        """
        if not self.enabled:
            return {"success": False, "error": "BLOCKADE_API_KEY not configured"}

        prompt_clean = (prompt or "").strip()[:MAX_PROMPT_CHARS]
        if not prompt_clean:
            return {"success": False, "error": "Empty prompt"}

        job_id = str(uuid.uuid4())
        payload: Dict[str, Any] = {
            "prompt": prompt_clean,
            "skybox_style_id": skybox_style_id,
            "enhance_prompt": enhance_prompt,
        }
        if negative_text:
            payload["negative_text"] = negative_text

        self._jobs[job_id] = {
            "status": "starting",
            "request_id": None,
            "prompt": prompt_clean,
            "skybox_style_id": skybox_style_id,
            "file_url": None,
            "thumb_url": None,
            "depth_map_url": None,
            "local_path": None,
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{BLOCKADE_BASE_URL}/skybox",
                    headers=self._headers(),
                    json=payload,
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
            err = f"Blockade API timeout ({type(exc).__name__})"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}
        except (httpx.NetworkError, httpx.RequestError) as exc:
            err = f"Blockade API network error: {type(exc).__name__}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        if response.status_code not in (200, 201, 202):
            try:
                body = response.json()
                detail = body.get("error") or body.get("message") or response.text
            except Exception:
                detail = response.text
            err = f"Blockade API {response.status_code}: {detail}"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Blockade] {err}")
            return {"success": False, "error": err}

        data = response.json()
        # Blockade returns the request id under "id". They also occasionally
        # return "obfuscated_id"; prefer "id" but accept either.
        request_id = data.get("id") or data.get("obfuscated_id")
        if not request_id:
            err = f"Blockade response missing id: {data}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        self._jobs[job_id].update(request_id=request_id, status="processing")
        print(f"[Blockade] Job {job_id} → request {request_id} ({prompt_clean[:60]!r})")
        return {"success": True, "job_id": job_id, "request_id": request_id}

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        """Poll a Blockade request. Updates the in-memory job record on
        any state change. On `complete`, sets file_url / thumb_url /
        depth_map_url so the caller can download.
        """
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Unknown job {job_id}"}
        if job.get("status") in {"failed", "succeeded"}:
            return {"success": True, **job}

        request_id = job.get("request_id")
        if not request_id:
            return {"success": False, "error": "Job has no request_id"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{BLOCKADE_BASE_URL}/imagine/requests/{request_id}",
                    headers=self._headers(),
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            return {
                "success": False,
                "error": f"Blockade status network: {type(exc).__name__}",
                "transient": True,
            }

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Blockade status {response.status_code}: {response.text[:200]}",
                "transient": response.status_code >= 500,
            }

        data = (response.json() or {}).get("request") or response.json()
        # Blockade returns the request inside a `request` envelope;
        # tolerate both shapes for forward-compat.
        status = (data.get("status") or "").lower()

        if status == "complete":
            job.update(
                status="succeeded",
                file_url=data.get("file_url"),
                thumb_url=data.get("thumb_url"),
                depth_map_url=data.get("depth_map_url"),
            )
            if not job["file_url"]:
                err = f"Blockade complete but no file_url: {data}"
                job.update(status="failed", error=err)
                return {"success": False, "error": err}
            print(f"[Blockade] Job {job_id} SUCCEEDED — {job['file_url'][:80]}")
        elif status in {"abort", "error"}:
            err = data.get("error_message") or status
            job.update(status="failed", error=f"Blockade {status}: {err}")
        else:
            # "pending" / "dispatched" / "processing"
            job["status"] = "processing"

        return {"success": True, **job, "blockade_status": status}

    async def wait_for_completion(
        self,
        job_id: str,
        *,
        timeout_sec: int = 240,
        poll_interval_sec: float = 4.0,
    ) -> Dict[str, Any]:
        deadline = asyncio.get_event_loop().time() + timeout_sec
        while asyncio.get_event_loop().time() < deadline:
            status = await self.check_status(job_id)
            job = self._jobs.get(job_id, {})
            if job.get("status") in {"succeeded", "failed"}:
                return status
            await asyncio.sleep(poll_interval_sec)
        return {
            "success": False,
            "error": f"Blockade timeout after {timeout_sec}s",
            "job_id": job_id,
            **self._jobs.get(job_id, {}),
        }

    # ---- download -------------------------------------------------------

    async def download_skybox(self, job_id: str) -> Dict[str, Any]:
        """Fetch the equirectangular PNG to local cache. Idempotent."""
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Unknown job {job_id}"}
        if job.get("status") != "succeeded" or not job.get("file_url"):
            return {"success": False, "error": "Job has no file_url yet"}
        if job.get("local_path") and Path(job["local_path"]).exists():
            return {"success": True, "local_path": job["local_path"], "cache_hit": True}

        filename = f"blockade_{_slugify(job['prompt'])}_{job_id[:8]}.png"
        local_path = self.output_dir / filename
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.get(job["file_url"])
                resp.raise_for_status()
                local_path.write_bytes(resp.content)
        except Exception as exc:
            err = f"Skybox download failed: {type(exc).__name__}: {exc}"
            job["error"] = err
            return {"success": False, "error": err}

        job["local_path"] = str(local_path)
        size_kb = local_path.stat().st_size // 1024
        print(f"[Blockade] Job {job_id} → {local_path.name} ({size_kb} KB)")
        return {"success": True, "local_path": str(local_path), "cache_hit": False}

    # ---- one-shot convenience ------------------------------------------

    async def generate_skybox(
        self,
        prompt: str,
        *,
        skybox_style_id: int = DEFAULT_SKYBOX_STYLE_ID,
        timeout_sec: int = 240,
    ) -> Dict[str, Any]:
        """Submit, wait, download — one call.

        Returns `{success, job_id, prompt, local_path, file_url}` on
        success.
        """
        submit = await self.submit_skybox(prompt, skybox_style_id=skybox_style_id)
        if not submit.get("success"):
            return submit
        job_id = submit["job_id"]

        result = await self.wait_for_completion(job_id, timeout_sec=timeout_sec)
        if not result.get("success") or self._jobs.get(job_id, {}).get("status") != "succeeded":
            return {"success": False, "job_id": job_id, "error": result.get("error")}

        download = await self.download_skybox(job_id)
        if not download.get("success"):
            return {"success": False, "job_id": job_id, "error": download.get("error")}

        return {
            "success": True,
            "job_id": job_id,
            "prompt": prompt,
            "local_path": download["local_path"],
            "file_url": self._jobs[job_id].get("file_url"),
        }

    @staticmethod
    def location_fingerprint(prompt: str, skybox_style_id: int = DEFAULT_SKYBOX_STYLE_ID) -> str:
        """Stable cache key for the env resolver."""
        h = hashlib.sha256()
        h.update(b"skybox|")
        h.update((prompt or "").strip().lower().encode("utf-8"))
        h.update(f"|s={skybox_style_id}".encode("utf-8"))
        return h.hexdigest()


_service: Optional[BlockadeService] = None


def get_blockade_service() -> BlockadeService:
    global _service
    if _service is None:
        _service = BlockadeService()
    return _service
