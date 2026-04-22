"""Character Casting — description → FLUX/gpt-image-1 → TripoSR → GLB.

Turns a name + free-text description into a 3D character GLB the Scene
Director can reference. Pipeline:

  1. Claude (if available) writes an optimized image prompt from the
     character description. The prompt targets a full-body standing pose
     with neutral background — optimal for TripoSR.
  2. Image generation: tries storyboard_image_service (gpt-image-1 via
     Replit AI Integrations) first, then falls back to flux_service if
     the local GPU is present.
  3. 3D conversion: triposr_service (Replicate) turns the image into
     a GLB. We poll its job status.
  4. Cache: keyed by (stable) ``character_slug`` derived from the name.
     Repeat requests with the same name skip straight to the cached GLB.

Outputs a job-state dict the route hands back to the frontend. The
Scene Director's CharacterCast placeholders get filled in once the GLB
is ready.

Requires (soft deps, the service degrades gracefully when a piece is
missing):
  - ANTHROPIC_API_KEY       → Claude for prompt-writing
  - AI_INTEGRATIONS_OPENAI_API_KEY → gpt-image-1 via Replit AI
  - REPLICATE_API_TOKEN     → TripoSR
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

log = logging.getLogger(__name__)

_CHARACTERS_DIR = Path(__file__).resolve().parent / "outputs" / "characters"
_CHARACTERS_DIR.mkdir(parents=True, exist_ok=True)


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9-]+", "-", name.strip().lower()).strip("-")
    return slug or "actor"


def _stable_key(name: str, description: Optional[str]) -> str:
    payload = f"{_slugify(name)}|{(description or '').strip()}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:10]
    return f"{_slugify(name)}-{digest}"


@dataclass
class CastingJob:
    key: str
    name: str
    description: Optional[str]
    status: str = "pending"            # pending | prompting | imaging | meshing | ready | failed | cached
    prompt: Optional[str] = None
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    triposr_job_id: Optional[str] = None
    glb_path: Optional[str] = None
    glb_url: Optional[str] = None
    error: Optional[str] = None
    director_notes: list[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "prompt": self.prompt,
            "imageUrl": self.image_url,
            "triposrJobId": self.triposr_job_id,
            "glbUrl": self.glb_url,
            "error": self.error,
            "directorNotes": list(self.director_notes),
        }


class CharacterCastingService:
    """Lazy-instantiated. Call via get_character_casting_service()."""

    def __init__(self) -> None:
        try:
            from claude_client import get_claude_client
            self._claude = get_claude_client()
        except Exception as exc:
            log.warning("Claude unavailable for casting: %s", exc)
            self._claude = None

        try:
            from storyboard_image_service import storyboard_image_service
            self._storyboard = storyboard_image_service
        except Exception as exc:
            log.warning("storyboard_image_service unavailable: %s", exc)
            self._storyboard = None

        try:
            from triposr_service import triposr_service
            self._triposr = triposr_service
        except Exception as exc:
            log.warning("triposr_service unavailable: %s", exc)
            self._triposr = None

    # -- public API --------------------------------------------------------

    def get_cached(self, name: str, description: Optional[str]) -> Optional[CastingJob]:
        """Return an already-generated character if we have one on disk."""
        key = _stable_key(name, description)
        glb = _CHARACTERS_DIR / f"{key}.glb"
        meta = _CHARACTERS_DIR / f"{key}.json"
        if glb.exists() and meta.exists():
            try:
                saved = json.loads(meta.read_text("utf-8"))
                return CastingJob(
                    key=key,
                    name=saved.get("name", name),
                    description=saved.get("description", description),
                    status="cached",
                    prompt=saved.get("prompt"),
                    image_url=saved.get("imageUrl"),
                    triposr_job_id=saved.get("triposrJobId"),
                    glb_path=str(glb),
                    glb_url=f"/api/characters/{key}.glb",
                    director_notes=["cache hit"],
                )
            except Exception as exc:
                log.warning("Failed to read casting cache %s: %s", key, exc)
        return None

    async def cast(
        self,
        name: str,
        description: Optional[str] = None,
        *,
        use_cache: bool = True,
    ) -> CastingJob:
        """Run the full pipeline (cache → prompt → image → mesh)."""
        job = CastingJob(
            key=_stable_key(name, description),
            name=name,
            description=description,
        )

        if use_cache:
            cached = self.get_cached(name, description)
            if cached is not None:
                log.info("Character cache hit for %s", cached.key)
                return cached

        # 1. PROMPT ---------------------------------------------------------
        job.status = "prompting"
        job.prompt = self._write_prompt(name, description, job)

        # 2. IMAGE ----------------------------------------------------------
        job.status = "imaging"
        image_bytes, image_error = await self._generate_image(job.prompt, job)
        if not image_bytes:
            job.status = "failed"
            job.error = image_error or "Image generation failed"
            return job

        image_path = _CHARACTERS_DIR / f"{job.key}.png"
        image_path.write_bytes(image_bytes)
        job.image_path = str(image_path)
        job.image_url = f"/api/characters/{job.key}.png"
        job.director_notes.append(f"image {len(image_bytes)/1024:.0f} kB")

        # 3. MESH (TripoSR) -------------------------------------------------
        job.status = "meshing"
        mesh_error = await self._run_triposr(image_bytes, job)
        if mesh_error:
            job.status = "failed"
            job.error = mesh_error
            return job

        # 4. Persist metadata for the cache ---------------------------------
        meta = {
            "name": job.name,
            "description": job.description,
            "prompt": job.prompt,
            "imageUrl": job.image_url,
            "triposrJobId": job.triposr_job_id,
        }
        (_CHARACTERS_DIR / f"{job.key}.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), "utf-8"
        )

        job.status = "ready"
        return job

    # -- step 1: prompt-writing -------------------------------------------

    def _write_prompt(
        self, name: str, description: Optional[str], job: CastingJob
    ) -> str:
        """Generate an image prompt optimized for TripoSR full-body 3D
        conversion. Uses Claude if available, else a simple template."""
        base_spec = (
            "Full-body character portrait, standing in T-pose or neutral A-pose, "
            "centered, head-to-toe visible, facing camera, uniform neutral-gray "
            "studio background, even flat lighting with no harsh shadows, "
            "sharp focus, realistic proportions, no crop, no accessories "
            "floating off-body."
        )
        description_clean = (description or "").strip() or "a cinematic character"

        if self._claude and self._claude.enabled:
            try:
                schema = {
                    "type": "object",
                    "properties": {"prompt": {"type": "string"}},
                    "required": ["prompt"],
                }
                user = (
                    f"Character name: {name}\n"
                    f"Description: {description_clean}\n\n"
                    "Write ONE image prompt (1–2 sentences) for generating a "
                    "full-body reference image of this character. Include age, "
                    "build, clothing, hair, ethnicity if stated, and any "
                    "distinguishing features. MUST end with the technical spec "
                    "verbatim:\n\n"
                    f'"{base_spec}"'
                )
                system = (
                    "You write image prompts for character casting. The "
                    "generated image will be fed into a 2D → 3D converter "
                    "(TripoSR), so the image must be a clean full-body "
                    "reference with a neutral background."
                )
                result = self._claude.complete_json(
                    system=system,
                    user=user,
                    schema=schema,
                    tool_name="write_character_prompt",
                    tool_description="Return the image-generation prompt.",
                    max_tokens=400,
                )
                prompt = result.get("prompt", "").strip()
                if prompt:
                    job.director_notes.append("prompt via Claude")
                    return prompt
            except Exception as exc:
                log.warning("Claude prompt-write failed: %s", exc)
                job.director_notes.append(f"Claude prompt-write failed: {exc}")

        # Fallback
        job.director_notes.append("prompt via rule-based template")
        return (
            f"{name}: {description_clean}. {base_spec}"
            if description_clean != "a cinematic character"
            else f"A cinematic character named {name}. {base_spec}"
        )

    # -- step 2: image generation ------------------------------------------

    async def _generate_image(
        self, prompt: str, job: CastingJob
    ) -> tuple[Optional[bytes], Optional[str]]:
        """Try storyboard_image_service first (gpt-image-1 via Replit AI),
        then flux_service if local GPU is ready."""
        # storyboard_image_service returns base64; decode.
        if self._storyboard and getattr(self._storyboard, "enabled", False):
            try:
                result = await self._storyboard.generate_image(
                    description=prompt,
                    template_id="cinematic",
                    camera_angle=None,
                    camera_movement=None,
                    additional_notes=None,
                    size="1024x1536",  # Tall — full-body friendly
                )
                if result.get("success"):
                    import base64
                    image_bytes = base64.b64decode(result["image_base64"])
                    job.director_notes.append("image via gpt-image-1")
                    return image_bytes, None
                else:
                    log.warning(
                        "storyboard_image_service returned error: %s",
                        result.get("error"),
                    )
                    job.director_notes.append(
                        f"gpt-image-1 failed: {result.get('error')}"
                    )
            except Exception as exc:
                log.warning("storyboard_image_service call failed: %s", exc)
                job.director_notes.append(f"gpt-image-1 exception: {exc}")

        # Try FLUX local
        try:
            from flux_service import flux_service
            if flux_service and flux_service.is_enabled():
                result = await flux_service.generate_frame(
                    prompt=prompt,
                    width=896,
                    height=1280,
                    num_inference_steps=4,
                )
                if result.get("success"):
                    job.director_notes.append("image via FLUX local")
                    return result["image_bytes"], None
                else:
                    job.director_notes.append(f"FLUX failed: {result.get('error')}")
        except Exception as exc:
            log.warning("FLUX fallback failed: %s", exc)
            job.director_notes.append(f"FLUX exception: {exc}")

        return None, "No image generator available (set AI_INTEGRATIONS_OPENAI_API_KEY or enable FLUX)"

    # -- step 3: TripoSR --------------------------------------------------

    async def _run_triposr(self, image_bytes: bytes, job: CastingJob) -> Optional[str]:
        """Submit the image to TripoSR and poll until done. Returns an
        error message on failure, or None on success."""
        if not self._triposr:
            return "TripoSR service unavailable"
        if not getattr(self._triposr, "api_token", None):
            return "REPLICATE_API_TOKEN not set — TripoSR cannot run"

        try:
            submit = await self._triposr.generate_from_image(
                image_data=image_bytes,
                original_filename=f"{job.key}.png",
                do_remove_background=True,
                foreground_ratio=0.88,
            )
        except Exception as exc:
            return f"TripoSR submission failed: {exc}"

        job_id = submit.get("job_id")
        if not job_id:
            return f"TripoSR returned no job_id: {submit.get('error', 'unknown')}"
        job.triposr_job_id = job_id
        job.director_notes.append(f"triposr job {job_id}")

        # Poll — TripoSR usually takes 30-90 s.
        start = time.time()
        timeout_s = 240
        while time.time() - start < timeout_s:
            await asyncio.sleep(4)
            try:
                status = await self._triposr.check_status(job_id)
            except Exception as exc:
                log.warning("TripoSR status check failed: %s", exc)
                continue
            s = status.get("status")
            if s in {"succeeded", "success", "completed"}:
                break
            if s in {"failed", "canceled", "error"}:
                return f"TripoSR {s}: {status.get('error') or status.get('logs')}"

        # Download the result into our characters cache
        try:
            download = await self._triposr.download_model(job_id)
        except Exception as exc:
            return f"TripoSR download failed: {exc}"

        if not download.get("success"):
            return f"TripoSR download failed: {download.get('error')}"

        # download_model typically saves to triposr_uploads/ and returns
        # a path. Copy it into characters/{key}.glb so our cache layout
        # is predictable and the GLB serve route works.
        src_path = download.get("path") or download.get("file_path")
        if not src_path or not Path(src_path).exists():
            return f"TripoSR download produced no file: {download}"

        dest = _CHARACTERS_DIR / f"{job.key}.glb"
        dest.write_bytes(Path(src_path).read_bytes())
        job.glb_path = str(dest)
        job.glb_url = f"/api/characters/{job.key}.glb"
        job.director_notes.append(f"glb {dest.stat().st_size/1024:.0f} kB")
        return None


_INSTANCE: Optional[CharacterCastingService] = None


def get_character_casting_service() -> CharacterCastingService:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = CharacterCastingService()
    return _INSTANCE
