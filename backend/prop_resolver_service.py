"""
Prop Resolver Service — description → GLB URL.

This is the orchestrator the Scene Director calls when it wants real 3D
geometry for `plan.props[]`. The input is a free-form description from
Claude ("vintage brass typewriter on desk"); the output is a public URL
to a GLB file that the browser can load straight into Babylon.

Flow
----
1. Fingerprint the description so the same prop always resolves to the
   same R2 key — same prompt = same cached GLB, no re-billing.
2. HEAD-check R2. If the GLB is already cached, return the public URL.
3. Otherwise walk the provider chain in order:
     a. BlenderKit (free, curated; fails when no free GLB match)
     b. Meshy (paid, generative; slow, large files)
     c. Tripo-via-Replicate (paid, generative; dropped in once slug known)
   On first success, upload the bytes to R2 under `props/{fingerprint}.glb`
   and return the public URL.
4. On total failure, return an explicit error — never a placeholder /
   never a fake URL. The browser will show the gap clearly.

R2 layout
---------
Bucket: `casting-assets` (the public-read bucket — same one we use for
character renders). Key prefix: `props/`. Public URL base: `R2_PUBLIC_BASE_URL`
from `.env`. Each object's `x-amz-meta` tags record provider + timestamp
so an operator can audit what's been resolved.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional

from blenderkit_service import get_blenderkit_service
from meshy_service import get_meshy_service
from utils.r2_client import (
    R2_BUCKET_NAME,
    check_file_exists_in_r2,
    get_r2_client,
)

GLB_CONTENT_TYPE = "model/gltf-binary"
R2_PROPS_PREFIX = "props/"
# Characters live under their own prefix so listing `props/` doesn't
# enumerate rigged humans alongside inanimate gear. Same bucket (ml-models,
# private) + same presigned-URL pattern — only the key shape differs.
R2_CHARACTERS_PREFIX = "props/characters/"
# The props resolver stores GLBs in the primary models bucket (from
# CLOUDFLARE_R2_MODELS_BUCKETS). That bucket isn't publicly readable, so
# we return pre-signed GET URLs to the browser — valid for PRESIGN_TTL
# seconds and regenerated on every resolve() call (cheap — just a sha256
# signature). This avoids depending on a public-bucket Cloudflare UI step.
PROPS_BUCKET = os.environ.get("CLOUDFLARE_R2_PROPS_BUCKET", R2_BUCKET_NAME)
PRESIGN_TTL_SEC = 7 * 24 * 3600  # 7 days — R2's practical maximum

# R2 upload errors that are config-level (bucket missing, credentials wrong,
# endpoint unreachable). When the orchestrator sees one of these it MUST
# stop the provider chain — retrying the next provider re-bills Meshy /
# Tripo for the same upstream problem. Transient errors are handled
# separately by the per-provider network retry logic.
_R2_CONFIG_ERROR_MARKERS = (
    "NoSuchBucket",
    "InvalidAccessKeyId",
    "SignatureDoesNotMatch",
    "AccessDenied",
    "NameResolutionError",
    "ConnectTimeout",
)


def _is_r2_config_error(err: str) -> bool:
    lowered = (err or "").lower()
    return any(m.lower() in lowered for m in _R2_CONFIG_ERROR_MARKERS)


@dataclass
class ResolvedProp:
    """Return shape for resolve(). Exactly one of (success+glb_url) or
    (success=False+error) is populated."""
    success: bool
    glb_url: Optional[str]
    fingerprint: str
    provider: Optional[str]   # "cache" | "blenderkit" | "meshy" | "tripo"
    cache_hit: bool
    size_kb: Optional[int]
    elapsed_sec: Optional[float]
    description: str
    error: Optional[str] = None
    attempts: Optional[List[Dict[str, Any]]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "glbUrl": self.glb_url,
            "fingerprint": self.fingerprint,
            "provider": self.provider,
            "cacheHit": self.cache_hit,
            "sizeKb": self.size_kb,
            "elapsedSec": self.elapsed_sec,
            "description": self.description,
            "error": self.error,
            "attempts": self.attempts,
        }


@dataclass
class ResolvedCharacter:
    """Return shape for resolve_character(). A rigged humanoid has more
    facets than a static prop — skeleton yes/no, animation track count,
    height. We carry all of it so the browser can decide per-scene which
    animation to play and how to scale."""
    success: bool
    glb_url: Optional[str]   # The rigged GLB (T-pose + embedded skeleton)
    fingerprint: str
    provider: Optional[str]  # "cache" | "meshy"
    cache_hit: bool
    size_kb: Optional[int]
    elapsed_sec: Optional[float]
    description: str
    height_meters: float
    # Animation URLs (presigned). None when the caller opted out or the
    # tier didn't include them. Currently Meshy ships walk + run only;
    # other actions go through Meshy's Animation API separately.
    walking_glb_url: Optional[str] = None
    running_glb_url: Optional[str] = None
    # The PBR-textured (refined) variant of the same character — Meshy's
    # rigged output ships without textures, so we keep this side-by-side
    # for the frontend to use on static shots where appearance beats
    # animation. None when a generation predates the refine pipeline or
    # the refine step failed.
    textured_glb_url: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "glbUrl": self.glb_url,
            "fingerprint": self.fingerprint,
            "provider": self.provider,
            "cacheHit": self.cache_hit,
            "sizeKb": self.size_kb,
            "elapsedSec": self.elapsed_sec,
            "description": self.description,
            "heightMeters": self.height_meters,
            "walkingGlbUrl": self.walking_glb_url,
            "runningGlbUrl": self.running_glb_url,
            "texturedGlbUrl": self.textured_glb_url,
            "error": self.error,
        }


def fingerprint_character(description: str, height_m: float = 1.78) -> str:
    """Stable fingerprint for a rigged character. Height goes into the key
    because a 1.65m "Anna" and a 1.78m "Anna" produce different skeletons;
    Meshy's rig scales to the requested height, and we don't want a cache
    collision between them.
    """
    normal = " ".join((description or "").lower().split())
    h = hashlib.sha256()
    h.update(b"character|")
    h.update(normal.encode("utf-8"))
    h.update(f"|h={height_m:.2f}".encode("utf-8"))
    return h.hexdigest()


def character_r2_key(fingerprint: str, variant: str = "rigged") -> str:
    """Path of a character GLB in R2.

    Variants:
      • "rigged"   → static rest-pose-with-skeleton (Meshy's default).
                     Single keyframe; not animated. Use as the
                     character's identity asset.
      • "walking"  → skinned walk-cycle GLB, ~1.5s loop.
      • "running"  → skinned run-cycle GLB, ~0.8s loop.
    """
    if variant == "rigged":
        return f"{R2_CHARACTERS_PREFIX}{fingerprint}.glb"
    return f"{R2_CHARACTERS_PREFIX}{fingerprint}_{variant}.glb"


def character_presigned_url(
    fingerprint: str,
    variant: str = "rigged",
    ttl_sec: int = PRESIGN_TTL_SEC,
) -> str:
    """Returns a CORS-safe URL for a character GLB variant.

    Instead of the S3 presigned URL — which the browser blocks because
    R2 IAM tokens can't `PutBucketCors` — we route through the backend
    `/api/scene-director/r2/{key}` proxy, which serves the bytes with
    `Access-Control-Allow-Origin: *`. The URL is stable per fingerprint
    so the browser caches aggressively; no expiry to worry about.

    `ttl_sec` is accepted for backward compat but ignored.
    """
    del ttl_sec  # unused; the proxy URL doesn't expire.
    return f"/api/scene-director/r2/{character_r2_key(fingerprint, variant)}"


def fingerprint_description(description: str, style_hint: str = "realistic") -> str:
    """SHA-256 of (normalised description, style). Used as the R2 cache key.

    Description is lower-cased and whitespace-collapsed so trivial variants
    ("Vintage Brass Typewriter" vs "vintage brass typewriter ") map to the
    same cache entry. Style is part of the key so a future "stylised"
    variant doesn't collide with the "realistic" one.
    """
    normal = " ".join((description or "").lower().split())
    h = hashlib.sha256()
    h.update(normal.encode("utf-8"))
    h.update(b"|")
    h.update((style_hint or "").encode("utf-8"))
    return h.hexdigest()


def r2_key_for(fingerprint: str) -> str:
    return f"{R2_PROPS_PREFIX}{fingerprint}.glb"


def presigned_url_for(fingerprint: str, ttl_sec: int = PRESIGN_TTL_SEC) -> str:
    """Returns a CORS-safe URL for the prop GLB.

    Routes through the backend `/api/scene-director/r2/{key}` proxy
    rather than handing out an S3 presigned URL — the proxy adds
    `Access-Control-Allow-Origin: *` so the browser will fetch it.
    Pre-signed URLs are blocked by browsers because R2's IAM token
    cannot `PutBucketCors` (we tested this). Once an operator
    configures CORS in the Cloudflare dashboard we can switch back
    to direct presigned URLs to skip the proxy hop.

    `ttl_sec` is accepted for backward compat but ignored — proxy URLs
    are stable per fingerprint.
    """
    del ttl_sec
    return f"/api/scene-director/r2/{r2_key_for(fingerprint)}"


class PropResolverService:
    """Single entry-point the Scene Director calls per prop."""

    def __init__(self) -> None:
        self.blenderkit = get_blenderkit_service()
        self.meshy = get_meshy_service()
        # Provider chain — stable order. BlenderKit first (free/fast) then
        # Meshy (paid/slow but always succeeds on recognisable concepts).
        # Tripo slot is reserved; added here when we have the Replicate
        # model slug wired up.
        self._providers: List[Dict[str, Any]] = [
            {
                "name": "blenderkit",
                "enabled": self.blenderkit.enabled,
                "call": self._call_blenderkit,
            },
            {
                "name": "meshy",
                "enabled": self.meshy.enabled,
                "call": self._call_meshy,
            },
        ]

    # ---- public API ------------------------------------------------------

    async def resolve(
        self,
        description: str,
        *,
        style_hint: str = "realistic",
        meshy_timeout_sec: int = 300,
        force_refresh: bool = False,
    ) -> ResolvedProp:
        """Resolve a prop description to a public GLB URL.

        `force_refresh=True` bypasses the R2 cache — use sparingly, it
        re-bills Meshy credits. The browser's `resolve-prop` route exposes
        it as an opt-in query param for debugging.
        """
        started = time.monotonic()
        description = (description or "").strip()
        if not description:
            return ResolvedProp(
                success=False,
                glb_url=None,
                fingerprint="",
                provider=None,
                cache_hit=False,
                size_kb=None,
                elapsed_sec=0.0,
                description=description,
                error="empty description",
            )

        fingerprint = fingerprint_description(description, style_hint)
        r2_key = r2_key_for(fingerprint)

        # ---- cache hit ---------------------------------------------------
        if not force_refresh and check_file_exists_in_r2(
            r2_key, bucket=PROPS_BUCKET
        ):
            return ResolvedProp(
                success=True,
                glb_url=presigned_url_for(fingerprint),
                fingerprint=fingerprint,
                provider="cache",
                cache_hit=True,
                size_kb=None,  # Not fetched — HEAD only; saves a round-trip.
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description,
            )

        # ---- provider chain ---------------------------------------------
        attempts: List[Dict[str, Any]] = []
        for provider in self._providers:
            if not provider["enabled"]:
                attempts.append({
                    "provider": provider["name"],
                    "status": "skipped",
                    "reason": "not configured",
                })
                continue

            prov_started = time.monotonic()
            try:
                result = await provider["call"](
                    description,
                    style_hint=style_hint,
                    meshy_timeout_sec=meshy_timeout_sec,
                )
            except Exception as exc:
                attempts.append({
                    "provider": provider["name"],
                    "status": "exception",
                    "error": f"{type(exc).__name__}: {exc}",
                    "elapsed_sec": round(time.monotonic() - prov_started, 2),
                })
                continue

            attempts.append({
                "provider": provider["name"],
                "status": "ok" if result.get("success") else "miss",
                "error": result.get("error"),
                "elapsed_sec": round(time.monotonic() - prov_started, 2),
            })

            if not result.get("success"):
                continue

            local_path = Path(result["local_path"])
            if not local_path.exists():
                attempts[-1]["error"] = f"provider reported success but {local_path} missing"
                continue

            glb_bytes = local_path.read_bytes()
            if not glb_bytes:
                attempts[-1]["error"] = "provider returned 0 bytes"
                continue

            # Sanity-check the magic bytes before we cache it — we promised
            # the browser a valid GLB, not any file that happens to have
            # the right extension.
            if glb_bytes[:4] != b"glTF":
                attempts[-1]["error"] = (
                    f"file magic isn't glTF (got {glb_bytes[:4]!r}); "
                    "provider returned the wrong format"
                )
                continue

            # Upload to R2 so the browser can load it, and so the next call
            # for this exact description skips the provider entirely.
            # Upload directly via the S3 client (bypassing the upload_to_r2
            # helper that's hardwired to the non-existent casting-assets
            # bucket) so we can target the bucket the current IAM key
            # actually owns.
            try:
                client = get_r2_client()
                # S3 metadata values must be pure ASCII — a "café" or "naïve"
                # in the description string trips ParamValidationError and
                # throws away a paid Meshy generation. Strip to ASCII before
                # putting it on the object, or the upload fails after we've
                # already burned the provider credit.
                client.put_object(
                    Bucket=PROPS_BUCKET,
                    Key=r2_key,
                    Body=glb_bytes,
                    ContentType=GLB_CONTENT_TYPE,
                    Metadata={
                        "vs-provider": provider["name"],
                        "vs-description": description[:128]
                            .encode("ascii", "ignore")
                            .decode("ascii"),
                    },
                )
            except Exception as exc:
                err = f"{type(exc).__name__}: {exc}"
                attempts[-1]["error"] = f"R2 upload failed: {err}"
                # Config-level R2 errors repeat on the next provider for
                # the same reason, burning credits. Fail-fast: surface the
                # bytes we already have via the local fallback field so the
                # operator can still see a GLB in dev, then return.
                if _is_r2_config_error(err):
                    return ResolvedProp(
                        success=False,
                        glb_url=None,
                        fingerprint=fingerprint,
                        provider=provider["name"],
                        cache_hit=False,
                        size_kb=len(glb_bytes) // 1024,
                        elapsed_sec=round(time.monotonic() - started, 2),
                        description=description,
                        error=(
                            f"R2 misconfigured ({err}). "
                            f"Fix R2 bucket/creds before retrying — Meshy/Tripo "
                            f"credits are NOT burned for config errors. "
                            f"Local bytes available at {local_path}."
                        ),
                        attempts=attempts,
                    )
                continue

            return ResolvedProp(
                success=True,
                glb_url=presigned_url_for(fingerprint),
                fingerprint=fingerprint,
                provider=provider["name"],
                cache_hit=False,
                size_kb=len(glb_bytes) // 1024,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description,
                attempts=attempts,
            )

        # ---- total failure ----------------------------------------------
        return ResolvedProp(
            success=False,
            glb_url=None,
            fingerprint=fingerprint,
            provider=None,
            cache_hit=False,
            size_kb=None,
            elapsed_sec=round(time.monotonic() - started, 2),
            description=description,
            error="all providers exhausted; no GLB resolved",
            attempts=attempts,
        )

    async def resolve_many(
        self,
        descriptions: List[str],
        *,
        style_hint: str = "realistic",
        meshy_timeout_sec: int = 300,
        concurrency: int = 2,
    ) -> List[ResolvedProp]:
        """Resolve a batch concurrently. Default concurrency=2 so we
        don't submit a dozen Meshy jobs in parallel and eat credits on a
        typo. Cache hits are essentially free and benefit from being
        parallel, so this is still much faster than sequential."""
        semaphore = asyncio.Semaphore(max(1, concurrency))

        async def bounded(desc: str) -> ResolvedProp:
            async with semaphore:
                return await self.resolve(
                    desc,
                    style_hint=style_hint,
                    meshy_timeout_sec=meshy_timeout_sec,
                )

        return await asyncio.gather(*(bounded(d) for d in descriptions))

    # ---- provider adapters ----------------------------------------------

    async def _call_blenderkit(
        self,
        description: str,
        *,
        style_hint: str,
        meshy_timeout_sec: int,
    ) -> Dict[str, Any]:
        # BlenderKit's find_and_download already returns the normalized
        # shape {success, local_path, asset_name, format, provider}.
        return await self.blenderkit.find_and_download(description)

    async def _call_meshy(
        self,
        description: str,
        *,
        style_hint: str,
        meshy_timeout_sec: int,
    ) -> Dict[str, Any]:
        return await self.meshy.generate_prop(
            description,
            art_style=style_hint,
            timeout_sec=meshy_timeout_sec,
        )

    # =======================================================================
    # Character resolver — Meshy-only chain (text→mesh→rig→download→R2)
    # =======================================================================
    #
    # BlenderKit doesn't serve rigged humanoids with standard humanoid rigs
    # (their free models are skinnless, or use custom rigs that Babylon's
    # skeleton loader can't animate portably). Meshy's auto-rigging IS the
    # path. If a future tier opens up (RPM API with license, Tripo rigged,
    # etc.) it'll join this method's chain. Today: Meshy or bust.
    # ---------------------------------------------------------------------

    async def resolve_character(
        self,
        description: str,
        *,
        height_meters: float = 1.78,
        include_animations: bool = True,
        style_hint: str = "realistic",
        force_refresh: bool = False,
        preview_timeout_sec: int = 300,
        rig_timeout_sec: int = 600,
    ) -> ResolvedCharacter:
        """Resolve a character description to a rigged GLB URL. Same
        fingerprint cache strategy as props — identical (description,
        height) pair always hits the same R2 object, so a re-request is
        free after the first generation."""
        started = time.monotonic()
        description = (description or "").strip()
        if not description:
            return ResolvedCharacter(
                success=False, glb_url=None, fingerprint="",
                provider=None, cache_hit=False, size_kb=None,
                elapsed_sec=0.0, description=description,
                height_meters=height_meters,
                error="empty description",
            )

        fp = fingerprint_character(description, height_meters)
        r2_key = character_r2_key(fp, "rigged")

        # ---- cache hit ---------------------------------------------------
        # The rigged variant is the load-bearing one (every character has
        # it); walking/running are best-effort. When the rigged variant
        # exists we return cache hit and ALSO probe for animation
        # variants — character resolves predating the animation upload
        # only have the rigged file, so animations may legitimately be
        # absent. HEAD-only check, no download.
        if not force_refresh and check_file_exists_in_r2(r2_key, bucket=PROPS_BUCKET):
            walking_url: Optional[str] = None
            running_url: Optional[str] = None
            textured_url: Optional[str] = None
            if include_animations:
                if check_file_exists_in_r2(
                    character_r2_key(fp, "walking"), bucket=PROPS_BUCKET,
                ):
                    walking_url = character_presigned_url(fp, "walking")
                if check_file_exists_in_r2(
                    character_r2_key(fp, "running"), bucket=PROPS_BUCKET,
                ):
                    running_url = character_presigned_url(fp, "running")
            # Probe for the refined-textured variant — present only on
            # characters generated after the refine pipeline shipped.
            # Older cache entries return null and the frontend falls
            # back to the rigged-with-default-PBR repaint.
            if check_file_exists_in_r2(
                character_r2_key(fp, "textured"), bucket=PROPS_BUCKET,
            ):
                textured_url = character_presigned_url(fp, "textured")
            return ResolvedCharacter(
                success=True,
                glb_url=character_presigned_url(fp, "rigged"),
                fingerprint=fp,
                provider="cache",
                cache_hit=True,
                size_kb=None,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description,
                height_meters=height_meters,
                walking_glb_url=walking_url,
                running_glb_url=running_url,
                textured_glb_url=textured_url,
            )

        # ---- live Meshy chain -------------------------------------------
        if not self.meshy.enabled:
            return ResolvedCharacter(
                success=False, glb_url=None, fingerprint=fp,
                provider=None, cache_hit=False, size_kb=None,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description, height_meters=height_meters,
                error="Meshy not configured; cannot generate character",
            )

        result = await self.meshy.generate_character(
            description,
            height_meters=height_meters,
            include_animations=include_animations,
            art_style=style_hint,
            preview_timeout_sec=preview_timeout_sec,
            rig_timeout_sec=rig_timeout_sec,
        )
        if not result.get("success"):
            return ResolvedCharacter(
                success=False, glb_url=None, fingerprint=fp,
                provider="meshy", cache_hit=False, size_kb=None,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description, height_meters=height_meters,
                error=result.get("error"),
            )

        paths = result.get("local_paths") or {}
        rigged_path = Path(paths.get("rigged") or "")
        if not rigged_path.exists():
            return ResolvedCharacter(
                success=False, glb_url=None, fingerprint=fp,
                provider="meshy", cache_hit=False, size_kb=None,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description, height_meters=height_meters,
                error=f"Meshy reported success but rigged file missing: {rigged_path}",
            )

        glb_bytes = rigged_path.read_bytes()
        if glb_bytes[:4] != b"glTF":
            return ResolvedCharacter(
                success=False, glb_url=None, fingerprint=fp,
                provider="meshy", cache_hit=False, size_kb=None,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description, height_meters=height_meters,
                error=f"rigged file has wrong magic: {glb_bytes[:4]!r}",
            )

        # Upload all three GLBs (rigged + walking + running) to R2 so the
        # browser can swap between them per scene mood (action chase →
        # running, dialogue → rigged static, romantic stroll → walking).
        # Each variant gets its own R2 key so we can serve any one
        # individually without a manifest indirection.
        client = get_r2_client()

        def _put(key: str, body: bytes, variant: str) -> None:
            client.put_object(
                Bucket=PROPS_BUCKET,
                Key=key,
                Body=body,
                ContentType=GLB_CONTENT_TYPE,
                Metadata={
                    "vs-provider": "meshy",
                    "vs-kind": "character",
                    "vs-variant": variant,
                    "vs-height-m": f"{height_meters:.2f}",
                    "vs-description": description[:128]
                        .encode("ascii", "ignore")
                        .decode("ascii"),
                },
            )

        try:
            _put(r2_key, glb_bytes, "rigged")
        except Exception as exc:
            err = f"{type(exc).__name__}: {exc}"
            return ResolvedCharacter(
                success=False, glb_url=None, fingerprint=fp,
                provider="meshy", cache_hit=False,
                size_kb=len(glb_bytes) // 1024,
                elapsed_sec=round(time.monotonic() - started, 2),
                description=description, height_meters=height_meters,
                error=f"R2 upload failed (rigged): {err}",
            )

        # Walking + running + textured are best-effort. If a variant is
        # missing on disk (Meshy returned partial output, or refine
        # failed), we surface null URLs and let the frontend fall back
        # to the rigged-with-default-PBR repaint. Don't fail the whole
        # resolve over a missing variant — the rigged character is the
        # load-bearing deliverable.
        walking_url: Optional[str] = None
        running_url: Optional[str] = None
        textured_url: Optional[str] = None
        for variant in ("walking", "running", "textured"):
            local_path_str = (paths or {}).get(variant)
            if not local_path_str:
                continue
            local_path = Path(local_path_str)
            if not local_path.exists():
                continue
            anim_bytes = local_path.read_bytes()
            if anim_bytes[:4] != b"glTF":
                continue  # corrupt; skip
            try:
                _put(character_r2_key(fp, variant), anim_bytes, variant)
            except Exception as exc:
                # Don't block the rigged-character delivery on an animation
                # upload failure; just log and move on.
                print(
                    f"[prop_resolver] {variant} upload failed for {fp[:8]}: "
                    f"{type(exc).__name__}: {exc}"
                )
                continue
            if variant == "walking":
                walking_url = character_presigned_url(fp, "walking")
            elif variant == "running":
                running_url = character_presigned_url(fp, "running")
            elif variant == "textured":
                textured_url = character_presigned_url(fp, "textured")

        return ResolvedCharacter(
            success=True,
            glb_url=character_presigned_url(fp, "rigged"),
            fingerprint=fp,
            provider="meshy",
            cache_hit=False,
            size_kb=len(glb_bytes) // 1024,
            elapsed_sec=round(time.monotonic() - started, 2),
            description=description,
            height_meters=height_meters,
            walking_glb_url=walking_url,
            running_glb_url=running_url,
            textured_glb_url=textured_url,
        )

    async def resolve_cast(
        self,
        descriptions: List[str],
        *,
        height_meters: float = 1.78,
        include_animations: bool = True,
        concurrency: int = 1,
        **kwargs: Any,
    ) -> List[ResolvedCharacter]:
        """Resolve a list of character descriptions concurrently.
        Default concurrency=1 because each fresh character takes ~90s +
        ~10 Meshy credits; running 5 in parallel is a big Meshy invoice
        and a crowded thermal queue. Cached descriptions are effectively
        free to parallelise — bump concurrency when you know the cache
        is warm."""
        sem = asyncio.Semaphore(max(1, concurrency))

        async def one(desc: str) -> ResolvedCharacter:
            async with sem:
                return await self.resolve_character(
                    desc,
                    height_meters=height_meters,
                    include_animations=include_animations,
                    **kwargs,
                )

        return await asyncio.gather(*(one(d) for d in descriptions))

    # ---- introspection ---------------------------------------------------

    def describe_chain(self) -> List[Dict[str, Any]]:
        return [
            {"provider": p["name"], "enabled": p["enabled"]} for p in self._providers
        ]


# ---- module-level singleton -------------------------------------------

_service: Optional[PropResolverService] = None


def get_prop_resolver_service() -> PropResolverService:
    global _service
    if _service is None:
        _service = PropResolverService()
    return _service
