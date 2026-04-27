"""
Meshy Text-to-3D Service
------------------------

Submits prop descriptions to Meshy's OpenAPI v2 text-to-3d endpoint, polls
for completion, and downloads the resulting GLB file to a local cache.

Why this service exists
-----------------------
The Scene Director (`backend/scene_director_service.py`) hands Claude's
`plan.props[]` list down to the browser, but the runtime `addEnvironmentProps`
path expects a GLB URL — which Claude cannot invent. This service is the
first tier of a resolver chain that turns a prop description into a real
GLB file. Later tiers will be BlenderKit (search+download) and Tripo via
Replicate. The orchestrator is in `prop_resolver_service.py`; this module
only talks to Meshy.

The flow mirrors `triposr_service.py` so the rest of the stack (job ids,
status polling, route shape) stays consistent across generators.

API reference: https://docs.meshy.ai/api/text-to-3d
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

MESHY_BASE_URL = "https://api.meshy.ai/openapi/v2"
# Rigging lives on v1, not v2 — different endpoint base. Keep them split
# so the migration to future Meshy versions stays legible.
MESHY_RIG_URL = "https://api.meshy.ai/openapi/v1/rigging"
# Remesh is v1 too (docs contradict their URL naming convention). We use
# it as a fallback when text-to-3d preview produces a mesh over the rig's
# 300k-face ceiling — preview's target_polycount hint is unreliable, but
# remesh's target_polycount is enforced.
MESHY_REMESH_URL = "https://api.meshy.ai/openapi/v1/remesh"
# Preview is quick (~60-90s) and good enough for previz props. Refine can
# be layered on top later when the director flags a hero prop.
DEFAULT_MODE = "preview"
# "realistic" matches the look of PBR fixtures / set dressing.
DEFAULT_ART_STYLE = "realistic"
# Most prop descriptions are 2–8 words; give Meshy a stable length cap.
MAX_PROMPT_CHARS = 600
# Default humanoid height (meters). Applied to rigging so the skeleton
# scale matches real actors — 1.78m ≈ male actor; 1.65m in the ShotPlan
# subject-eye height elsewhere in the codebase. Adjustable per-request.
DEFAULT_HEIGHT_M = 1.78


def _slugify(text: str, max_len: int = 40) -> str:
    """ASCII-safe slug for filenames. Keeps the prompt inspectable on disk."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return slug[:max_len] or "prop"


# Phrases that describe a pose or action — when present, Meshy generates
# the character in that pose and then rigging's pose-estimator rejects
# the result (HTTP 422 "Pose estimation failed"). We strip these before
# appending a neutral T-pose directive. Intentionally conservative — we
# only drop verbatim matches, not interpretations.
_POSE_PHRASES_TO_STRIP = (
    r"\b(?:in|doing|performing|showing|making|striking)\s+(?:an?\s+)?"
    r"(?:elegant|dynamic|dramatic|heroic|relaxed|casual|action|power|running|walking|sitting|standing|leaning|crouching|kneeling|dancing|fighting|posing)\s+pose\b",
    r"\b(?:arms?\s+(?:crossed|up|down|raised|outstretched|folded|on\s+hips|akimbo))\b",
    r"\bholding\s+[a-z]+",
    r"\bsitting\s+on\b",
    r"\blying\s+(?:on|down)\b",
    r"\bleaning\s+(?:on|against)\b",
    r"\bkneeling\b",
    r"\bcrouching\b",
    r"\bdancing\b",
    r"\brunning\b",
    r"\belegant\s+pose\b",
    r"\bdynamic\s+pose\b",
    r"\bt[-\s]?pose\b",   # the user already asked for T-pose — drop so we can re-normalise
    r"\ba[-\s]?pose\b",
)
_POSE_RE = re.compile("|".join(_POSE_PHRASES_TO_STRIP), re.IGNORECASE)


def _is_face_limit_error(err: Optional[str]) -> bool:
    """Detect Meshy rigging's "300k face limit" 400 response so the
    orchestrator can chain through remesh instead of bubbling the error
    up to the caller."""
    if not err:
        return False
    s = err.lower()
    return (
        "face limit" in s
        or "exceeds the 300,000 face" in s
        or "exceeds the 300000 face" in s
        or ("faces" in s and "300" in s and "remesh" in s)
    )


def _force_tpose_prompt(prompt: str) -> str:
    """Build a character-safe Meshy prompt.

    Combines the pose-stripping logic with Meshy's research-backed
    "riggable character" template. The exact phrase "A-pose for rigging
    and animation" comes from the only successfully-rigged trench-coat
    model in Meshy's own showcase (see research report, src: meshy.ai/
    tags/trenchcoat). "full body" + "clean silhouette" + the arms+feet
    anchoring come from Meshy's official prompt-writing guide (Rule #6
    on detail placement, Rule #9 on prop/smoke exclusion). Held-prop
    phrases are also stripped because they introduce mesh fragments
    that break the rigger's body-outline detection.

    The API-level `pose_mode: "a-pose"` parameter is the primary pose
    signal; this prompt text is the secondary reinforcement Meshy's
    docs recommend sending together.
    """
    stripped = _POSE_RE.sub("", prompt or "")
    stripped = re.sub(r"[ \t]+", " ", stripped).strip(" ,.")
    if not stripped:
        stripped = "humanoid character"
    return (
        f"{stripped}, full body, A-pose for rigging and animation, "
        f"arms slightly away from body, clean silhouette, "
        f"highly detailed, realistic"
    )


class MeshyService:
    """Async client for Meshy text-to-3d. Not a singleton — instantiate once
    per process via `get_meshy_service()` below."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("MESHY_API_KEY", "").strip()
        # Local cache for downloaded GLBs. Matches the triposr layout so
        # it's easy to serve both from the same static mount later.
        self.output_dir = Path(__file__).parent / "meshy_models"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        # In-memory job registry — job_id -> metadata. Survives for the
        # lifetime of the process. Persistence lives in the orchestrator.
        self._jobs: Dict[str, Dict[str, Any]] = {}

    # ---- availability ----------------------------------------------------

    @property
    def enabled(self) -> bool:
        """True iff MESHY_API_KEY is present. Callers should short-circuit
        to the next provider in the chain when this is False, rather than
        attempting a call that will 401."""
        return bool(self.api_key)

    def _headers(self) -> Dict[str, str]:
        if not self.enabled:
            raise RuntimeError(
                "MESHY_API_KEY is not set. Add it to .env; this service "
                "cannot run without an authenticated key."
            )
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ---- submit + poll ---------------------------------------------------

    async def submit_text_to_3d(
        self,
        prompt: str,
        *,
        art_style: str = DEFAULT_ART_STYLE,
        negative_prompt: str = "",
        target_polycount: Optional[int] = None,
        pose_mode: Optional[str] = None,
        ai_model: Optional[str] = None,
        symmetry_mode: Optional[str] = None,
        should_remesh: Optional[bool] = None,
        auto_size: Optional[bool] = None,
        origin_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a Meshy preview task.

        Returns `{"success": True, "job_id": ..., "task_id": ...}` on
        success. `job_id` is our own UUID; `task_id` is Meshy's — we keep
        both so log lines correlate.

        Character-specific parameters (per Meshy's public prompting guide
        + the successful-trenchcoat showcase analysis):

            pose_mode        "t-pose" | "a-pose" — pre-biases generation
                             toward riggable topology. Single biggest
                             lever against /v1/rigging 422 errors.
            ai_model         "meshy-6" — cleaner topology + HD texture
                             for rigging success.
            symmetry_mode    "on" — symmetric silhouettes help the pose
                             estimator.
            should_remesh    True — inline polycount control, replaces
                             chained /v1/remesh for character workflows.
            target_polycount int — caps mesh complexity (≤300k for rig).
            auto_size        True — combined with origin_at="bottom",
                             standardises scale.
            origin_at        "bottom" | "center".

        For static props, leave all character params None and the call
        defaults to Meshy's free-form behavior.
        """
        if not self.enabled:
            return {"success": False, "error": "MESHY_API_KEY not configured"}

        prompt_clean = (prompt or "").strip()[:MAX_PROMPT_CHARS]
        if not prompt_clean:
            return {"success": False, "error": "Empty prompt"}

        job_id = str(uuid.uuid4())
        payload: Dict[str, Any] = {
            "mode": DEFAULT_MODE,
            "prompt": prompt_clean,
            "art_style": art_style,
        }
        # `negative_prompt` is deprecated in Meshy-6 per
        #   https://docs.meshy.ai/api/text-to-3d
        # Only send it when the caller explicitly passed a non-empty one.
        if negative_prompt:
            payload["negative_prompt"] = negative_prompt
        if target_polycount is not None:
            payload["target_polycount"] = int(target_polycount)
        if pose_mode:
            payload["pose_mode"] = pose_mode
        if ai_model:
            payload["ai_model"] = ai_model
        if symmetry_mode:
            payload["symmetry_mode"] = symmetry_mode
        if should_remesh is not None:
            payload["should_remesh"] = bool(should_remesh)
        if auto_size is not None:
            payload["auto_size"] = bool(auto_size)
        if origin_at:
            payload["origin_at"] = origin_at

        self._jobs[job_id] = {
            "status": "starting",
            "task_id": None,
            "prompt": prompt_clean,
            "art_style": art_style,
            "model_url": None,
            "local_path": None,
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{MESHY_BASE_URL}/text-to-3d",
                    headers=self._headers(),
                    json=payload,
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
            err = f"Meshy API timeout ({type(exc).__name__})"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Meshy] {err}")
            return {"success": False, "error": err}
        except (httpx.NetworkError, httpx.RequestError) as exc:
            err = f"Meshy API network error: {type(exc).__name__}"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Meshy] {err}")
            return {"success": False, "error": err}

        if response.status_code not in (200, 201, 202):
            # Surface Meshy's real error message — don't paper over 402
            # "insufficient credits" or 429 "rate limited" with a generic.
            try:
                body = response.json()
                detail = body.get("message") or body.get("detail") or response.text
            except Exception:
                detail = response.text
            err = f"Meshy API {response.status_code}: {detail}"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Meshy] {err}")
            return {"success": False, "error": err}

        data = response.json()
        # Meshy returns either {result: task_id} or {id: task_id} depending
        # on version — accept both so a minor API revision doesn't break us.
        task_id = data.get("result") or data.get("id") or data.get("task_id")
        if not task_id:
            err = f"Meshy response missing task id: {data}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        self._jobs[job_id].update(task_id=task_id, status="processing")
        print(f"[Meshy] Job {job_id} → task {task_id} ({prompt_clean[:60]!r})")
        return {"success": True, "job_id": job_id, "task_id": task_id}

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        """Fetch Meshy task status. Updates the in-memory job on any state
        transition. Returns the Meshy-side status ('PENDING', 'IN_PROGRESS',
        'SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED') plus progress %.

        On SUCCEEDED, `model_url` is set to the GLB url from Meshy; call
        `download_glb(job_id)` to pull it locally.
        """
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Unknown job {job_id}"}
        if job.get("status") in {"failed", "succeeded"}:
            return {"success": True, **job}

        task_id = job.get("task_id")
        if not task_id:
            return {"success": False, "error": "Job has no task_id"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{MESHY_BASE_URL}/text-to-3d/{task_id}",
                    headers=self._headers(),
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            # Transient network errors shouldn't mark the job failed — the
            # task is still running on Meshy's side. Caller retries.
            return {
                "success": False,
                "error": f"Meshy status poll network error: {type(exc).__name__}",
                "transient": True,
            }

        if response.status_code == 404:
            err = "Meshy task not found (expired after 24h or invalid id)"
            job.update(status="failed", error=err)
            return {"success": False, "error": err}
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Meshy status poll {response.status_code}: {response.text}",
                "transient": response.status_code >= 500,
            }

        data = response.json()
        meshy_status = (data.get("status") or "").upper()
        progress = data.get("progress", 0)

        if meshy_status == "SUCCEEDED":
            # Meshy returns model_urls as a map: {glb, fbx, obj, usdz, mtl}.
            # We prefer GLB since Babylon loads it natively via SceneLoader.
            urls = data.get("model_urls") or {}
            glb_url = urls.get("glb")
            if not glb_url:
                err = f"Meshy succeeded but no GLB url in response: {data}"
                job.update(status="failed", error=err)
                return {"success": False, "error": err}
            job.update(status="succeeded", model_url=glb_url, progress=100)
            print(f"[Meshy] Job {job_id} SUCCEEDED — {glb_url[:80]}")
        elif meshy_status in {"FAILED", "EXPIRED", "CANCELED"}:
            err = data.get("task_error", {}).get("message") or meshy_status
            job.update(status="failed", error=f"{meshy_status}: {err}")
        else:
            # PENDING / IN_PROGRESS — still working.
            job.update(status="processing", progress=progress)

        return {"success": True, **job, "meshy_status": meshy_status, "progress": progress}

    async def wait_for_completion(
        self,
        job_id: str,
        *,
        timeout_sec: int = 300,
        poll_interval_sec: float = 5.0,
    ) -> Dict[str, Any]:
        """Poll until the job finishes or the timeout elapses.

        Timeout default 300s covers Meshy's typical 60–120s preview latency
        with headroom. Shorter timeouts will surface a 'timeout' error even
        if the task eventually succeeds — caller can still poll by id.
        """
        deadline = asyncio.get_event_loop().time() + timeout_sec
        while asyncio.get_event_loop().time() < deadline:
            status = await self.check_status(job_id)
            job = self._jobs.get(job_id, {})
            if job.get("status") in {"succeeded", "failed"}:
                return status
            await asyncio.sleep(poll_interval_sec)
        return {
            "success": False,
            "error": f"Timeout after {timeout_sec}s",
            "job_id": job_id,
            **self._jobs.get(job_id, {}),
        }

    # ---- download --------------------------------------------------------

    async def download_glb(self, job_id: str) -> Dict[str, Any]:
        """Fetch the GLB from Meshy's CDN and persist it under
        `backend/meshy_models/`. Idempotent — second call returns the
        already-cached path.
        """
        job = self._jobs.get(job_id)
        if not job:
            return {"success": False, "error": f"Unknown job {job_id}"}
        if job.get("status") != "succeeded" or not job.get("model_url"):
            return {"success": False, "error": "Job has no GLB url yet"}
        if job.get("local_path") and Path(job["local_path"]).exists():
            return {"success": True, "local_path": job["local_path"], "cache_hit": True}

        filename = (
            f"meshy_{_slugify(job['prompt'])}_{job_id[:8]}.glb"
        )
        local_path = self.output_dir / filename
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(job["model_url"])
                resp.raise_for_status()
                local_path.write_bytes(resp.content)
        except Exception as exc:
            err = f"GLB download failed: {type(exc).__name__}: {exc}"
            job["error"] = err
            return {"success": False, "error": err}

        job["local_path"] = str(local_path)
        print(f"[Meshy] Job {job_id} → {local_path.name} ({len(resp.content)//1024} KB)")
        return {"success": True, "local_path": str(local_path), "cache_hit": False}

    # ---- one-shot convenience -------------------------------------------

    async def generate_prop(
        self,
        prompt: str,
        *,
        art_style: str = DEFAULT_ART_STYLE,
        timeout_sec: int = 300,
    ) -> Dict[str, Any]:
        """Submit, wait, download — the whole round-trip in one call.

        Returns `{"success": True, "job_id": ..., "local_path": ..., "prompt": ...}`
        on success; `{"success": False, "error": ...}` on failure. Local
        path is the on-disk GLB under `backend/meshy_models/`.

        The caller is responsible for serving the file to the browser
        (via FastAPI StaticFiles) and for uploading to R2 if persistent
        caching across processes is needed.
        """
        submit = await self.submit_text_to_3d(prompt, art_style=art_style)
        if not submit.get("success"):
            return submit
        job_id = submit["job_id"]

        result = await self.wait_for_completion(job_id, timeout_sec=timeout_sec)
        if not result.get("success") or result.get("status") != "succeeded":
            return {"success": False, "job_id": job_id, "error": result.get("error")}

        download = await self.download_glb(job_id)
        if not download.get("success"):
            return {"success": False, "job_id": job_id, "error": download.get("error")}

        return {
            "success": True,
            "job_id": job_id,
            "prompt": prompt,
            "local_path": download["local_path"],
            "model_url": self._jobs[job_id].get("model_url"),
        }

    # ---- introspection ---------------------------------------------------

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._jobs.get(job_id)

    @staticmethod
    def prompt_fingerprint(prompt: str, art_style: str = DEFAULT_ART_STYLE) -> str:
        """Stable SHA-256 of (prompt, art_style). Used by the orchestrator
        as a cache key so the same description always hits the same R2 obj."""
        h = hashlib.sha256()
        h.update((prompt or "").strip().lower().encode("utf-8"))
        h.update(b"|")
        h.update(art_style.encode("utf-8"))
        return h.hexdigest()

    # =======================================================================
    # Character pipeline — text-to-3d preview → auto-rigging
    # =======================================================================
    #
    # Static props use `generate_prop()` above. For humanoids the director
    # needs a SKELETON + animations, which Meshy delivers via the separate
    # v1/rigging endpoint. This pipeline is a 3-step chain:
    #
    #   1. text-to-3d preview        (humanoid T-pose mesh, ~60-90s, ~5 cr)
    #   2. /v1/rigging                (auto-rig + walk + run, ~30-60s, 5 cr)
    #   3. download rigged GLB       (always) + walk/run GLBs (optional)
    #
    # Credits: ~10-30 per character depending on model tier. Cache the
    # whole bundle under one fingerprint so a second request is free.
    # ---------------------------------------------------------------------

    # ---- remesh fallback -----------------------------------------------
    # Meshy's text-to-3d preview ignores `target_polycount`, routinely
    # returning 400k-500k-face meshes. The rigging endpoint rejects
    # anything over 300,000 faces. The honest fix: detect the face-limit
    # error from rigging, route the preview_task_id through /v1/remesh
    # with a strict cap, then re-submit rigging with the remesh task_id.

    async def submit_remesh(
        self,
        preview_task_id: str,
        *,
        target_polycount: int = 200_000,
        topology: str = "triangle",
    ) -> Dict[str, Any]:
        """Reduce a preview mesh's face count so it's riggable.

        Default cap 200k leaves safety margin under Meshy's 300k rig limit.
        Costs ~5 credits. Returns {success, job_id, remesh_task_id} —
        job tracked in `_jobs` under a new 'remesh' kind.
        """
        if not self.enabled:
            return {"success": False, "error": "MESHY_API_KEY not configured"}

        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {
            "kind": "remesh",
            "status": "starting",
            "preview_task_id": preview_task_id,
            "remesh_task_id": None,
            "target_polycount": target_polycount,
            "model_glb_url": None,
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    MESHY_REMESH_URL,
                    headers=self._headers(),
                    json={
                        "input_task_id": preview_task_id,
                        "target_formats": ["glb"],
                        "topology": topology,
                        "target_polycount": int(target_polycount),
                    },
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            err = f"Meshy remesh network: {type(exc).__name__}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        if response.status_code not in (200, 201, 202):
            try:
                body = response.json()
                detail = body.get("message") or body.get("detail") or response.text
            except Exception:
                detail = response.text
            err = f"Meshy remesh API {response.status_code}: {detail}"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Meshy remesh] {err}")
            return {"success": False, "error": err}

        data = response.json()
        remesh_task_id = data.get("result") or data.get("id")
        if not remesh_task_id:
            err = f"Meshy remesh missing task id: {data}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        self._jobs[job_id].update(remesh_task_id=remesh_task_id, status="processing")
        print(
            f"[Meshy remesh] Job {job_id} → remesh-task {remesh_task_id} "
            f"(preview {preview_task_id[:8]}, target {target_polycount})"
        )
        return {"success": True, "job_id": job_id, "remesh_task_id": remesh_task_id}

    async def check_remesh_status(self, job_id: str) -> Dict[str, Any]:
        job = self._jobs.get(job_id)
        if not job or job.get("kind") != "remesh":
            return {"success": False, "error": f"Unknown remesh job {job_id}"}
        if job.get("status") in {"failed", "succeeded"}:
            return {"success": True, **job}
        remesh_task_id = job.get("remesh_task_id")
        if not remesh_task_id:
            return {"success": False, "error": "Job has no remesh_task_id"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{MESHY_REMESH_URL}/{remesh_task_id}",
                    headers=self._headers(),
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            return {
                "success": False,
                "error": f"Remesh status network: {type(exc).__name__}",
                "transient": True,
            }

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Remesh status {response.status_code}: {response.text[:200]}",
                "transient": response.status_code >= 500,
            }

        data = response.json()
        meshy_status = (data.get("status") or "").upper()
        progress = data.get("progress", 0)

        if meshy_status == "SUCCEEDED":
            urls = data.get("model_urls") or {}
            job.update(
                status="succeeded",
                model_glb_url=urls.get("glb"),
                progress=100,
            )
            print(f"[Meshy remesh] Job {job_id} SUCCEEDED")
        elif meshy_status in {"FAILED", "EXPIRED", "CANCELED"}:
            err = (data.get("task_error") or {}).get("message") or meshy_status
            job.update(status="failed", error=f"remesh {meshy_status}: {err}")
        else:
            job.update(status="processing", progress=progress)
        return {"success": True, **job, "meshy_status": meshy_status, "progress": progress}

    async def wait_for_remesh(
        self,
        job_id: str,
        *,
        timeout_sec: int = 300,
        poll_interval_sec: float = 5.0,
    ) -> Dict[str, Any]:
        deadline = asyncio.get_event_loop().time() + timeout_sec
        while asyncio.get_event_loop().time() < deadline:
            s = await self.check_remesh_status(job_id)
            job = self._jobs.get(job_id, {})
            if job.get("status") in {"succeeded", "failed"}:
                return s
            await asyncio.sleep(poll_interval_sec)
        return {
            "success": False,
            "error": f"Remesh timeout after {timeout_sec}s",
            "job_id": job_id,
            **self._jobs.get(job_id, {}),
        }

    async def submit_refine(
        self,
        preview_task_id: str,
        *,
        art_style: str = DEFAULT_ART_STYLE,
        enable_pbr: bool = True,
    ) -> Dict[str, Any]:
        """Submit a Meshy text-to-3d *refine* job — generates the textured
        PBR variant of a previously-completed preview mesh.

        Why this exists: `submit_text_to_3d(mode="preview")` produces a
        naked humanoid (geometry + skinning prep, NO materials/textures),
        and `submit_rigging` doesn't add textures either. So the rigged
        GLB Meshy gives back has `materials: 0, textures: 0, images: 0`
        — Babylon's GLTFLoader assigns its `__GLTFLoader._default`
        white-chrome material and the cast renders flat grey/white.
        Refine takes the preview's task id and returns a separate task
        whose `model_urls.glb` is the same geometry with PBR textures
        baked in. We then have two GLBs per character:
          • rigged.glb     — skinned skeleton + animations, no textures
          • textured.glb   — full PBR appearance, no skeleton
        The frontend uses the textured one for static shots and the
        rigged one when animation matters more than appearance.

        Costs ~5 credits per call (Meshy's standard refine pricing).
        Latency similar to preview (~60–120s).
        """
        if not self.enabled:
            return {"success": False, "error": "MESHY_API_KEY not configured"}

        job_id = str(uuid.uuid4())
        payload: Dict[str, Any] = {
            "mode": "refine",
            "preview_task_id": preview_task_id,
            "enable_pbr": enable_pbr,
        }
        # art_style passed for parity with preview; Meshy ignores when not
        # needed but accepts it harmlessly.
        if art_style:
            payload["art_style"] = art_style

        self._jobs[job_id] = {
            "status": "starting",
            "task_id": None,
            "kind": "refine",
            "preview_task_id": preview_task_id,
            "model_url": None,
            "local_path": None,
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{MESHY_BASE_URL}/text-to-3d",
                    headers=self._headers(),
                    json=payload,
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError, httpx.RequestError) as exc:
            err = f"Meshy refine network: {type(exc).__name__}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        if response.status_code not in (200, 201, 202):
            try:
                body = response.json()
                detail = body.get("message") or body.get("detail") or response.text
            except Exception:
                detail = response.text
            err = f"Meshy refine {response.status_code}: {detail}"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Meshy refine] {err}")
            return {"success": False, "error": err}

        data = response.json()
        task_id = data.get("result") or data.get("id") or data.get("task_id")
        if not task_id:
            err = f"Meshy refine response missing task id: {data}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        self._jobs[job_id].update(task_id=task_id, status="processing")
        print(f"[Meshy refine] Job {job_id} → task {task_id} (preview {preview_task_id[:8]})")
        return {"success": True, "job_id": job_id, "task_id": task_id}

    async def submit_rigging(
        self,
        preview_task_id: str,
        *,
        height_meters: float = DEFAULT_HEIGHT_M,
    ) -> Dict[str, Any]:
        """Kick off auto-rigging on an already-generated humanoid mesh.

        `preview_task_id` is the id returned by `submit_text_to_3d()`. The
        rigging endpoint requires the mesh to already exist on Meshy's
        side AND to look humanoid — quadrupeds and non-bipedal creatures
        fail silently or produce garbage. The returned task id is tracked
        in `_jobs` under a new rigging job record.
        """
        if not self.enabled:
            return {"success": False, "error": "MESHY_API_KEY not configured"}

        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {
            "kind": "rigging",
            "status": "starting",
            "preview_task_id": preview_task_id,
            "rig_task_id": None,
            "rigged_glb_url": None,
            "walking_glb_url": None,
            "running_glb_url": None,
            "local_paths": {},
            "error": None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    MESHY_RIG_URL,
                    headers=self._headers(),
                    json={
                        "input_task_id": preview_task_id,
                        "height_meters": height_meters,
                    },
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            err = f"Meshy rig network: {type(exc).__name__}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        if response.status_code not in (200, 201, 202):
            try:
                body = response.json()
                detail = body.get("message") or body.get("detail") or response.text
            except Exception:
                detail = response.text
            err = f"Meshy rigging API {response.status_code}: {detail}"
            self._jobs[job_id].update(status="failed", error=err)
            print(f"[Meshy rig] {err}")
            return {"success": False, "error": err}

        data = response.json()
        rig_task_id = data.get("result") or data.get("id")
        if not rig_task_id:
            err = f"Meshy rigging response missing task id: {data}"
            self._jobs[job_id].update(status="failed", error=err)
            return {"success": False, "error": err}

        self._jobs[job_id].update(rig_task_id=rig_task_id, status="processing")
        print(f"[Meshy rig] Job {job_id} → rig-task {rig_task_id} (preview {preview_task_id[:8]})")
        return {"success": True, "job_id": job_id, "rig_task_id": rig_task_id}

    async def check_rigging_status(self, job_id: str) -> Dict[str, Any]:
        """Fetch rigging task status. On SUCCEEDED, unpacks `result.*_url`
        fields into the job record so `download_character()` can pull the
        GLBs without a second HTTP call to Meshy."""
        job = self._jobs.get(job_id)
        if not job or job.get("kind") != "rigging":
            return {"success": False, "error": f"Unknown rigging job {job_id}"}
        if job.get("status") in {"failed", "succeeded"}:
            return {"success": True, **job}

        rig_task_id = job.get("rig_task_id")
        if not rig_task_id:
            return {"success": False, "error": "Job has no rig_task_id"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{MESHY_RIG_URL}/{rig_task_id}",
                    headers=self._headers(),
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            return {
                "success": False,
                "error": f"Meshy rig status network: {type(exc).__name__}",
                "transient": True,
            }

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Meshy rig status {response.status_code}: {response.text[:200]}",
                "transient": response.status_code >= 500,
            }

        data = response.json()
        meshy_status = (data.get("status") or "").upper()
        progress = data.get("progress", 0)

        if meshy_status == "SUCCEEDED":
            result = data.get("result") or {}
            anims = result.get("basic_animations") or {}
            job.update(
                status="succeeded",
                rigged_glb_url=result.get("rigged_character_glb_url"),
                walking_glb_url=anims.get("walking_glb_url"),
                running_glb_url=anims.get("running_glb_url"),
                progress=100,
            )
            if not job["rigged_glb_url"]:
                err = f"Meshy rigging SUCCEEDED but no glb url: {result}"
                job.update(status="failed", error=err)
                return {"success": False, "error": err}
            print(f"[Meshy rig] Job {job_id} SUCCEEDED — {job['rigged_glb_url'][:80]}")
        elif meshy_status in {"FAILED", "EXPIRED", "CANCELED"}:
            err = data.get("task_error", {}).get("message") or meshy_status
            job.update(status="failed", error=f"rig {meshy_status}: {err}")
        else:
            job.update(status="processing", progress=progress)

        return {"success": True, **job, "meshy_status": meshy_status, "progress": progress}

    async def wait_for_rigging(
        self,
        job_id: str,
        *,
        timeout_sec: int = 600,
        poll_interval_sec: float = 5.0,
    ) -> Dict[str, Any]:
        deadline = asyncio.get_event_loop().time() + timeout_sec
        while asyncio.get_event_loop().time() < deadline:
            status = await self.check_rigging_status(job_id)
            job = self._jobs.get(job_id, {})
            if job.get("status") in {"succeeded", "failed"}:
                return status
            await asyncio.sleep(poll_interval_sec)
        return {
            "success": False,
            "error": f"Rigging timeout after {timeout_sec}s",
            "job_id": job_id,
            **self._jobs.get(job_id, {}),
        }

    async def download_character(
        self,
        job_id: str,
        *,
        include_animations: bool = True,
    ) -> Dict[str, Any]:
        """Download the rigged-character GLB (always) and optionally the
        walk + run animation GLBs. Returns paths keyed by asset name.
        Idempotent — already-downloaded files are reused.
        """
        job = self._jobs.get(job_id)
        if not job or job.get("kind") != "rigging":
            return {"success": False, "error": f"Unknown rigging job {job_id}"}
        if job.get("status") != "succeeded":
            return {"success": False, "error": "Rigging job has no URLs yet"}

        targets = {"rigged": job["rigged_glb_url"]}
        # The textured (refined) GLB lives on the same rigging job
        # record after generate_character stuffs it there. It's the PBR
        # appearance of the same character — used by the frontend for
        # static shots where animation isn't needed.
        if job.get("textured_glb_url"):
            targets["textured"] = job["textured_glb_url"]
        if include_animations:
            if job.get("walking_glb_url"):
                targets["walking"] = job["walking_glb_url"]
            if job.get("running_glb_url"):
                targets["running"] = job["running_glb_url"]

        local_paths: Dict[str, str] = dict(job.get("local_paths") or {})
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                for kind, url in targets.items():
                    if kind in local_paths and Path(local_paths[kind]).exists():
                        continue
                    resp = await client.get(url)
                    resp.raise_for_status()
                    fname = (
                        f"meshy_char_{job_id[:8]}_{kind}.glb"
                    )
                    path = self.output_dir / fname
                    path.write_bytes(resp.content)
                    local_paths[kind] = str(path)
                    print(f"[Meshy char] {job_id[:8]} → {kind}  {path.name}  ({len(resp.content)//1024} KB)")
        except Exception as exc:
            err = f"Character download failed: {type(exc).__name__}: {exc}"
            job["error"] = err
            return {"success": False, "error": err}

        job["local_paths"] = local_paths
        return {"success": True, "local_paths": local_paths}

    async def generate_character(
        self,
        prompt: str,
        *,
        height_meters: float = DEFAULT_HEIGHT_M,
        include_animations: bool = True,
        art_style: str = DEFAULT_ART_STYLE,
        preview_timeout_sec: int = 300,
        rig_timeout_sec: int = 600,
    ) -> Dict[str, Any]:
        """End-to-end character generation: text→mesh→rig→download.

        Cost: ~10–30 Meshy credits depending on model tier. Use the
        orchestrator (`prop_resolver_service.resolve_character`) in
        normal flow; this one-shot entry is for scripts and smokes.

        Returns on success:
            {
              "success": True,
              "preview_task_id": "...",
              "rig_job_id": "...",
              "local_paths": {"rigged": ..., "walking": ..., "running": ...},
              "rigged_glb_url": "...",   # signed Meshy URL (~3 days)
            }
        """
        # Step 1 — text-to-3d preview with the full character-prompt
        # stack (per the Meshy prompting research). Key signals:
        #   • `_force_tpose_prompt` rewrites the prompt to include the
        #     rigging-friendly phrasing Meshy's showcase verified.
        #   • `pose_mode="a-pose"` is the API-level pose pre-bias — the
        #     single biggest lever against /v1/rigging 422 errors.
        #   • `ai_model="meshy-6"` picks the topology-cleaner model.
        #   • `should_remesh=True` + `target_polycount=100000` does the
        #     polycount cap inline, making our external remesh fallback
        #     obsolete for typical character generations (it's still in
        #     place below for the rare case Meshy ignores the hint).
        #   • `symmetry_mode="on"` helps the pose estimator.
        #   • `auto_size=True` + `origin_at="bottom"` gives consistent
        #     scale for the rigger's heuristics.
        normalised_prompt = _force_tpose_prompt(prompt)
        submit = await self.submit_text_to_3d(
            normalised_prompt,
            art_style=art_style,
            target_polycount=100_000,
            pose_mode="a-pose",
            ai_model="meshy-6",
            symmetry_mode="on",
            should_remesh=True,
            auto_size=True,
            origin_at="bottom",
        )
        if not submit.get("success"):
            return submit
        preview_job_id = submit["job_id"]
        preview_task_id = submit["task_id"]

        preview_done = await self.wait_for_completion(
            preview_job_id, timeout_sec=preview_timeout_sec,
        )
        preview_job = self._jobs.get(preview_job_id, {})
        if preview_job.get("status") != "succeeded":
            return {
                "success": False,
                "error": preview_done.get("error") or "preview failed",
                "preview_task_id": preview_task_id,
            }

        # Step 2 — refine. Generates the textured PBR variant of the
        # preview mesh in a separate task. Without this we'd ship rigged
        # GLBs with `materials: 0, textures: 0` (Meshy preview output is
        # naked geometry; rigging preserves nothing). Failure is non-
        # fatal — we still ship the rigged-without-textures path; just
        # log and continue. Refine costs ~5 credits + ~60–120s.
        textured_task_id: Optional[str] = None
        textured_model_url: Optional[str] = None
        refine_submit = await self.submit_refine(
            preview_task_id, art_style=art_style,
        )
        if refine_submit.get("success"):
            refine_job_id = refine_submit["job_id"]
            refine_done = await self.wait_for_completion(
                refine_job_id, timeout_sec=preview_timeout_sec,
            )
            refine_job = self._jobs.get(refine_job_id, {})
            if refine_job.get("status") == "succeeded" and refine_job.get("model_url"):
                textured_task_id = refine_job.get("task_id")
                textured_model_url = refine_job["model_url"]
                print(
                    f"[Meshy char] refine OK → {textured_task_id[:8] if textured_task_id else '?'}  "
                    f"({textured_model_url[:60]}…)"
                )
            else:
                print(
                    f"[Meshy char] refine failed for preview {preview_task_id[:8]}: "
                    f"{refine_done.get('error') or 'no model_url'} — proceeding with untextured rig"
                )
        else:
            print(
                f"[Meshy char] refine submit failed: {refine_submit.get('error')} "
                f"— proceeding with untextured rig"
            )

        # Step 3 — rigging. If Meshy returns the 300k-face-limit error
        # (preview ignores target_polycount and we have no way to predict
        # which prompts over-tessellate), fall through to remesh + retry.
        rigging_input_task_id = preview_task_id
        rig_submit = await self.submit_rigging(
            rigging_input_task_id, height_meters=height_meters,
        )
        if not rig_submit.get("success") and _is_face_limit_error(rig_submit.get("error")):
            print(
                f"[Meshy char] face-limit on rigging; running remesh→retry "
                f"for preview {preview_task_id[:8]}"
            )
            remesh_submit = await self.submit_remesh(
                preview_task_id, target_polycount=200_000,
            )
            if not remesh_submit.get("success"):
                return {
                    "success": False,
                    "error": f"remesh submit failed: {remesh_submit.get('error')}",
                    "preview_task_id": preview_task_id,
                }
            remesh_job_id = remesh_submit["job_id"]
            remesh_done = await self.wait_for_remesh(remesh_job_id, timeout_sec=300)
            remesh_job = self._jobs.get(remesh_job_id, {})
            if remesh_job.get("status") != "succeeded":
                return {
                    "success": False,
                    "error": f"remesh failed: {remesh_done.get('error')}",
                    "preview_task_id": preview_task_id,
                    "remesh_job_id": remesh_job_id,
                }
            # Retry rigging — use the remesh's task_id (empirically
            # confirmed to work as rigging input per Meshy's behavior).
            rigging_input_task_id = remesh_job["remesh_task_id"]
            rig_submit = await self.submit_rigging(
                rigging_input_task_id, height_meters=height_meters,
            )

        if not rig_submit.get("success"):
            return {
                "success": False,
                "error": rig_submit.get("error"),
                "preview_task_id": preview_task_id,
            }
        rig_job_id = rig_submit["job_id"]

        rig_done = await self.wait_for_rigging(rig_job_id, timeout_sec=rig_timeout_sec)
        rig_job = self._jobs.get(rig_job_id, {})
        if rig_job.get("status") != "succeeded":
            return {
                "success": False,
                "error": rig_done.get("error") or "rigging failed",
                "preview_task_id": preview_task_id,
                "rig_job_id": rig_job_id,
            }

        # Stuff the textured (refined) URL onto the rig-job record so
        # download_character pulls it alongside the rigged + animated
        # variants in a single pass.
        if textured_model_url:
            rig_job["textured_glb_url"] = textured_model_url
            rig_job["textured_task_id"] = textured_task_id

        # Step 4 — download
        dl = await self.download_character(rig_job_id, include_animations=include_animations)
        if not dl.get("success"):
            return {
                "success": False,
                "error": dl.get("error"),
                "preview_task_id": preview_task_id,
                "rig_job_id": rig_job_id,
            }

        return {
            "success": True,
            "preview_task_id": preview_task_id,
            "rig_job_id": rig_job_id,
            "local_paths": dl["local_paths"],
            "rigged_glb_url": rig_job["rigged_glb_url"],
            "textured_glb_url": textured_model_url,
            "prompt": prompt,
        }


# ---- module-level singleton -------------------------------------------

_service: Optional[MeshyService] = None


def get_meshy_service() -> MeshyService:
    """Return the process-wide MeshyService. Lazy so importing this module
    never blocks on env-var reads at cold start."""
    global _service
    if _service is None:
        _service = MeshyService()
    return _service
