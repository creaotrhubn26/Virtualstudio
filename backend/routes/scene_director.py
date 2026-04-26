"""Scene Director API — script beat → full scene blueprint.

POST /api/scene-director/from-beat    — one parsed beat → one SceneAssembly
POST /api/scene-director/from-script  — an array of beats → array of assemblies

The service behind this (backend/scene_director_service.py) makes
director-level decisions about shot type, lens, aperture, lighting pattern,
and concrete light modifiers so the frontend can build a Babylon.js scene
that looks like a photographer + cinematographer set it up on purpose.
"""

from dataclasses import asdict
import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/scene-director", tags=["scene_director"])


class BeatPayload(BaseModel):
    """Request body for a single parsed script beat.

    This mirrors ``scene_director_service.ParsedBeat`` but uses camelCase
    for the frontend contract.
    """
    location: str
    intExt: str = Field(default="INT", pattern="^(INT|EXT)$")
    timeOfDay: str = Field(default="DAY")
    characters: List[str] = Field(default_factory=list)
    action: str = ""
    dialogue: str = ""
    mood: Optional[str] = None
    sceneNumber: Optional[str] = None
    language: str = Field(default="no", pattern="^(no|en)$")
    referenceImageBase64: Optional[str] = Field(
        default=None,
        description=(
            "Optional reference image (base64 data-URL or bare b64). When "
            "provided AND Claude is configured, Claude Vision analyses "
            "the image's lighting/mood/composition and the director uses "
            "that to bias decisions."
        ),
    )


class ScriptPayload(BaseModel):
    beats: List[BeatPayload]


def _to_internal(payload: BeatPayload):
    # Lazy import so this module stays cheap to import.
    from scene_director_service import ParsedBeat  # type: ignore

    return ParsedBeat(
        location=payload.location,
        int_ext=payload.intExt,
        time_of_day=payload.timeOfDay,
        characters=payload.characters,
        action=payload.action,
        dialogue=payload.dialogue,
        mood=payload.mood,
        scene_number=payload.sceneNumber,
        language=payload.language,
        reference_image_base64=payload.referenceImageBase64,
    )


def _assembly_to_dict(assembly) -> dict:
    """Serialise SceneAssembly with camelCase keys for the TS client."""
    return {
        "sceneId": assembly.scene_id,
        "sourceBeat": assembly.source_beat,
        "environmentPlan": assembly.environment_plan,
        "environmentPromptUsed": assembly.environment_prompt_used,
        "shot": {
            "type": assembly.shot.type,
            "angle": assembly.shot.angle,
            "framing": assembly.shot.framing,
            "focalLengthMm": assembly.shot.focal_length_mm,
            "apertureF": assembly.shot.aperture_f,
            "shutterSpeedSec": assembly.shot.shutter_speed_sec,
            "iso": assembly.shot.iso,
            "depthOfField": assembly.shot.depth_of_field,
            "cameraHeightM": assembly.shot.camera_height_m,
            "cameraDistanceM": assembly.shot.camera_distance_m,
            "movement": assembly.shot.movement,
            "sensor": assembly.shot.sensor,
            "rationale": assembly.shot.rationale,
        },
        "lighting": {
            "pattern": assembly.lighting.pattern,
            "presetId": assembly.lighting.preset_id,
            "hdri": assembly.lighting.hdri,
            "ambientIntensity": assembly.lighting.ambient_intensity,
            "colorTempKelvin": assembly.lighting.color_temp_kelvin,
            "keyToFillRatio": assembly.lighting.key_to_fill_ratio,
            "moodNotes": assembly.lighting.mood_notes,
            "sources": [
                {
                    "role": s.role,
                    "fixture": s.fixture,
                    "modifier": s.modifier,
                    "powerWs": s.power_ws,
                    "colorTempKelvin": s.color_temp_kelvin,
                    "azimuthDeg": s.azimuth_deg,
                    "elevationDeg": s.elevation_deg,
                    "distanceM": s.distance_m,
                    "intensity": s.intensity,
                }
                for s in assembly.lighting.sources
            ],
        },
        "characters": [
            {
                "name": c.name,
                "description": c.description,
                "avatarRef": c.avatar_ref,
                "needsGeneration": c.needs_generation,
                "suggestedPlacement": c.suggested_placement,
            }
            for c in assembly.characters
        ],
        "storyboardPrompt": assembly.storyboard_prompt,
        "directorNotes": assembly.director_notes,
        "referenceAnalysis": (
            {
                "mood": assembly.reference_analysis.mood,
                "lightingPattern": assembly.reference_analysis.lighting_pattern,
                "keyLightDescription": assembly.reference_analysis.key_light_description,
                "colorPalette": assembly.reference_analysis.color_palette,
                "composition": assembly.reference_analysis.composition,
                "timeOfDayGuess": assembly.reference_analysis.time_of_day_guess,
                "rawCaption": assembly.reference_analysis.raw_caption,
            }
            if assembly.reference_analysis
            else None
        ),
        "locationHint": (
            {
                "query": assembly.location_hint.query,
                "lat": assembly.location_hint.lat,
                "lon": assembly.location_hint.lon,
                "displayName": assembly.location_hint.display_name,
                "placeId": assembly.location_hint.place_id,
                "locationType": assembly.location_hint.location_type,
                "types": assembly.location_hint.types,
            }
            if assembly.location_hint
            else None
        ),
    }


@router.get("/status")
async def scene_director_status():
    """Return availability + AI bootstrap mode (Claude or rule-based)."""
    import os

    try:
        from scene_director_service import get_scene_director  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Scene Director service not available: {exc}",
        )
    svc = get_scene_director()
    claude_on = svc.llm_enabled
    return JSONResponse(
        {
            "available": True,
            "aiBootstrap": "claude" if claude_on else "rules",
            "llmEnrichmentEnabled": claude_on,
            "visionSupported": claude_on,
            "claudeModel": os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")
            if claude_on else None,
            "claudeDirectorModel": os.environ.get(
                "CLAUDE_DIRECTOR_MODEL", "claude-opus-4-7"
            ) if claude_on else None,
        }
    )


@router.post("/from-beat")
async def direct_from_beat(payload: BeatPayload):
    """Turn one parsed script beat into a full scene blueprint."""
    try:
        from scene_director_service import get_scene_director  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Scene Director service not available: {exc}",
        )
    svc = get_scene_director()
    try:
        assembly = await svc.direct_beat(_to_internal(payload))
        return JSONResponse({"success": True, "assembly": _assembly_to_dict(assembly)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scene Director error: {exc}")


class DescribeRenderPayload(BaseModel):
    """Request body for the reverse-describe endpoint."""
    imageBase64: str = Field(
        description="Base64 data-URL or bare base64 of the current Babylon render.",
    )
    context: Optional[str] = Field(
        default=None,
        description="Optional free-text context the director should use as a hint.",
    )


@router.post("/describe-current-render")
async def describe_current_render(payload: DescribeRenderPayload):
    """Claude Vision reads a render of the current Babylon scene and returns
    a structured, script-ready description (scene heading, action, implied
    mood, visible characters, suggested shot + lighting).

    Requires ANTHROPIC_API_KEY. Useful for "I built a scene manually, now
    show me the Fountain line" loops and for auto-generating storyboard
    captions from the live 3D scene.
    """
    try:
        from claude_client import get_claude_client  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Claude client unavailable: {exc}"
        )

    client = get_claude_client()
    if not client.enabled:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY not set — reverse-describe requires Claude Vision.",
        )

    schema = {
        "type": "object",
        "properties": {
            "sceneHeading": {
                "type": "string",
                "description": "Fountain-style scene heading, e.g. 'INT. COZY CAFÉ - DAY'",
            },
            "intExt": {"type": "string", "enum": ["INT", "EXT"]},
            "location": {"type": "string"},
            "timeOfDay": {
                "type": "string",
                "enum": ["DAY", "NIGHT", "DAWN", "DUSK", "MAGIC HOUR"],
            },
            "mood": {
                "type": "string",
                "enum": [
                    "tense", "romantic", "horror", "comedic",
                    "melancholy", "grand", "cozy",
                ],
            },
            "characters": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Characters or placeholders visible in the frame.",
            },
            "action": {
                "type": "string",
                "description": "One concise action line describing what's happening.",
            },
            "suggestedShotType": {
                "type": "string",
                "enum": [
                    "close-up", "medium", "wide", "ots",
                    "two-shot", "establishing",
                ],
            },
            "lightingPattern": {
                "type": "string",
                "enum": [
                    "rembrandt", "loop", "split", "butterfly",
                    "clamshell", "broad", "short", "rim-only", "ambient",
                ],
            },
            "colorPalette": {"type": "string"},
            "caption": {
                "type": "string",
                "description": "One-sentence human caption.",
            },
        },
        "required": [
            "sceneHeading", "intExt", "location", "timeOfDay", "mood",
            "characters", "action", "suggestedShotType",
            "lightingPattern", "colorPalette", "caption",
        ],
    }

    system = (
        "You are a script supervisor + cinematographer. Given a rendered "
        "3D scene, read it the way a film's script line would describe it. "
        "Produce a Fountain-style scene heading, a concise action line, the "
        "most likely mood (from our seven labels), and a shot + lighting "
        "recommendation that matches what the DP would call."
    )
    user_prompt = payload.context or (
        "Describe this rendered scene as a script line. Identify the "
        "location, time of day, mood, any characters present, and what "
        "shot + lighting a DP would use here. Return your answer via the "
        "describe_render tool."
    )

    try:
        result = client.analyze_image_structured(
            image_base64=payload.imageBase64,
            system=system,
            user_prompt=user_prompt,
            schema=schema,
            tool_name="describe_render",
            tool_description="Structured analysis of a rendered scene.",
            max_tokens=1024,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Claude Vision describe failed: {exc}"
        )

    return JSONResponse({"success": True, "description": result})


@router.post("/from-script")
async def direct_from_script(payload: ScriptPayload):
    """Turn an array of parsed beats into an array of scene blueprints.

    Runs the beats sequentially so the environment planner isn't hammered
    (it calls Gemini). Consider making this streaming if it matters for UX.
    """
    try:
        from scene_director_service import get_scene_director  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Scene Director service not available: {exc}",
        )
    svc = get_scene_director()
    assemblies = []
    errors = []
    for idx, beat_payload in enumerate(payload.beats):
        try:
            assembly = await svc.direct_beat(_to_internal(beat_payload))
            assemblies.append(_assembly_to_dict(assembly))
        except Exception as exc:
            errors.append({"index": idx, "error": str(exc)})
    return JSONResponse(
        {
            "success": len(errors) == 0,
            "assemblies": assemblies,
            "errors": errors,
            "beatCount": len(payload.beats),
        }
    )


# ---------------------------------------------------------------------------
# Prop resolver — description → GLB URL
# ---------------------------------------------------------------------------

class ResolvePropPayload(BaseModel):
    """Request body for a single prop resolution.

    `description` is Claude's free-text prop name (e.g. "vintage brass
    typewriter on desk"). The resolver fingerprints it, checks the R2
    cache, and falls back through the provider chain (BlenderKit → Meshy
    → Tripo) when there's a miss.
    """
    description: str = Field(min_length=1, max_length=400)
    styleHint: str = Field(default="realistic")
    forceRefresh: bool = Field(default=False)
    # Meshy's text-to-3d preview is 60-180s in practice. Callers that
    # can't wait that long (UI-facing requests) can lower the timeout
    # and fall back to a skeleton mesh while polling separately.
    meshyTimeoutSec: int = Field(default=300, ge=30, le=900)


class ResolvePropsPayload(BaseModel):
    """Batch resolution — one network round-trip for a whole SceneAssembly."""
    descriptions: List[str] = Field(min_length=1, max_length=16)
    styleHint: str = Field(default="realistic")
    forceRefresh: bool = Field(default=False)
    meshyTimeoutSec: int = Field(default=300, ge=30, le=900)
    concurrency: int = Field(default=2, ge=1, le=4)


@router.get("/prop-resolver/status")
async def prop_resolver_status():
    """Return which providers are wired + enabled. Frontend can degrade
    gracefully when no provider is available (e.g. show a warning rather
    than spinning forever)."""
    try:
        from prop_resolver_service import get_prop_resolver_service  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Prop resolver unavailable: {exc}",
        )
    svc = get_prop_resolver_service()
    chain = svc.describe_chain()
    any_enabled = any(p["enabled"] for p in chain)
    return JSONResponse(
        {
            "available": any_enabled,
            "chain": chain,
        }
    )


@router.post("/resolve-prop")
async def resolve_prop(payload: ResolvePropPayload):
    """Resolve one prop description to a browser-loadable GLB URL.

    Cheap when it's a cache hit (~300 ms — R2 HEAD + presign). Expensive
    when it's a first-time resolution through Meshy (~180 s, ~$0.10).
    BlenderKit in the middle is fast-and-free when the description matches
    a curated model.
    """
    try:
        from prop_resolver_service import get_prop_resolver_service  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Prop resolver unavailable: {exc}",
        )
    svc = get_prop_resolver_service()
    resolved = await svc.resolve(
        payload.description,
        style_hint=payload.styleHint,
        meshy_timeout_sec=payload.meshyTimeoutSec,
        force_refresh=payload.forceRefresh,
    )
    return JSONResponse(resolved.to_dict())


@router.post("/resolve-props")
async def resolve_props(payload: ResolvePropsPayload):
    """Batch resolution — takes a list of descriptions from one scene's
    `plan.props[]` and returns a list of ResolvedProp dicts in the same
    order. Concurrency is capped at 4 so an 8-prop scene with all cache
    misses doesn't submit 8 parallel Meshy jobs.
    """
    try:
        from prop_resolver_service import get_prop_resolver_service  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Prop resolver unavailable: {exc}",
        )
    svc = get_prop_resolver_service()
    resolved = await svc.resolve_many(
        payload.descriptions,
        style_hint=payload.styleHint,
        meshy_timeout_sec=payload.meshyTimeoutSec,
        concurrency=payload.concurrency,
    )
    return JSONResponse(
        {
            "count": len(resolved),
            "results": [r.to_dict() for r in resolved],
        }
    )


# ---------------------------------------------------------------------------
# Cast resolver — description → rigged humanoid GLB URL
# ---------------------------------------------------------------------------

class ResolveCharacterPayload(BaseModel):
    """Request body for a single character resolution.

    Meshy text-to-3D → auto-rigging pipeline. First-ever call costs
    ~$0.05 and takes ~2 minutes; cache hits are ~300 ms.
    """
    description: str = Field(min_length=1, max_length=400)
    heightMeters: float = Field(default=1.78, ge=0.5, le=2.5)
    includeAnimations: bool = Field(default=True)
    styleHint: str = Field(default="realistic")
    forceRefresh: bool = Field(default=False)
    previewTimeoutSec: int = Field(default=300, ge=30, le=900)
    rigTimeoutSec: int = Field(default=600, ge=30, le=1800)


class ResolveCastPayload(BaseModel):
    """Batch cast resolution — Scene Director sends N humanoid
    descriptions and the resolver walks them serially (default) or
    in parallel (only safe with a warm cache; fresh Meshy generations
    in parallel = crowded queue + simultaneous credit burn)."""
    descriptions: List[str] = Field(min_length=1, max_length=12)
    heightMeters: float = Field(default=1.78, ge=0.5, le=2.5)
    includeAnimations: bool = Field(default=True)
    styleHint: str = Field(default="realistic")
    forceRefresh: bool = Field(default=False)
    concurrency: int = Field(default=1, ge=1, le=4)


@router.post("/resolve-character")
async def resolve_character(payload: ResolveCharacterPayload):
    """Resolve a single character description to a rigged humanoid GLB.

    Always serves a presigned R2 URL — private bucket with a 7-day TTL.
    Fingerprint includes the requested height so a 1.65 m "Anna" and a
    1.78 m "Anna" don't share a cache entry (Meshy scales the skeleton).
    """
    try:
        from prop_resolver_service import get_prop_resolver_service  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Prop resolver unavailable: {exc}",
        )
    svc = get_prop_resolver_service()
    resolved = await svc.resolve_character(
        payload.description,
        height_meters=payload.heightMeters,
        include_animations=payload.includeAnimations,
        style_hint=payload.styleHint,
        force_refresh=payload.forceRefresh,
        preview_timeout_sec=payload.previewTimeoutSec,
        rig_timeout_sec=payload.rigTimeoutSec,
    )
    return JSONResponse(resolved.to_dict())


@router.post("/resolve-cast")
async def resolve_cast(payload: ResolveCastPayload):
    """Batch character resolution for a whole scene's cast. Returns
    an ordered list of ResolvedCharacter dicts — frontend dispatches
    one `vs-load-external-glb` per success and places them around the
    subject according to the scene blocking."""
    try:
        from prop_resolver_service import get_prop_resolver_service  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Prop resolver unavailable: {exc}",
        )
    svc = get_prop_resolver_service()
    resolved = await svc.resolve_cast(
        payload.descriptions,
        height_meters=payload.heightMeters,
        include_animations=payload.includeAnimations,
        style_hint=payload.styleHint,
        force_refresh=payload.forceRefresh,
        concurrency=payload.concurrency,
    )
    return JSONResponse(
        {
            "count": len(resolved),
            "results": [r.to_dict() for r in resolved],
        }
    )


# ---------------------------------------------------------------------------
# Location resolver — place name → (lat, lon) via Google Geocoding
# ---------------------------------------------------------------------------

class ResolveLocationPayload(BaseModel):
    """Request body for geocoding a place name into a Google 3D Tiles
    target. Frontend feeds the result into LocationScene.setLatLon."""
    query: str = Field(min_length=1, max_length=300)


@router.get("/r2/{key:path}")
async def r2_proxy(key: str):
    """Stream an R2 object with permissive CORS so the browser can
    fetch GLBs without us needing public-bucket access on R2.

    Why this exists
    ---------------
    Resolved props/characters live in the private `ml-models` bucket.
    Pre-signed S3 GETs work for `curl` but get blocked by browsers
    because R2's IAM-only token can't `PutBucketCors`. The Cloudflare
    UI can set CORS, but that's a manual step. This proxy gives us
    same-origin fetches today; switch back to direct presigned URLs
    once an operator configures bucket CORS in the Cloudflare dashboard.

    The route is rate-limited only by the underlying R2 bandwidth +
    FastAPI's worker count. Cache-Control: 7 days lets the browser
    + any Vite dev proxy cache aggressively (the URL is stable per
    fingerprint, so safe).
    """
    from fastapi.responses import StreamingResponse
    try:
        from utils.r2_client import (  # type: ignore
            get_r2_client, R2_BUCKET_NAME,
        )
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"R2 unavailable: {exc}")

    # Defensive: require the key to live under the props/ prefix so the
    # proxy can't be aimed at arbitrary keys in the bucket.
    if not key.startswith("props/") or ".." in key:
        raise HTTPException(status_code=400, detail="invalid key")

    bucket = os.environ.get("CLOUDFLARE_R2_PROPS_BUCKET", R2_BUCKET_NAME)
    client = get_r2_client()
    try:
        obj = client.get_object(Bucket=bucket, Key=key)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"R2 fetch: {exc}")

    body = obj["Body"]   # botocore StreamingBody
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
        "Cache-Control": "public, max-age=604800, immutable",
        "Content-Length": str(obj.get("ContentLength") or ""),
    }
    return StreamingResponse(
        iter(lambda: body.read(65536), b""),
        media_type=obj.get("ContentType", "model/gltf-binary"),
        headers=headers,
    )


@router.post("/resolve-location")
async def resolve_location(payload: ResolveLocationPayload):
    """Geocode a free-text location string ("middle of Times Square at
    night") into structured `{lat, lon, displayName, ...}` so the
    Director can hand a real-world coordinate to the LocationScene.

    Returns success=False (with status=ZERO_RESULTS) when the string
    is fictional — caller should fall back to studio backdrop.
    """
    try:
        from geocoder_service import get_geocoder_service  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503, detail=f"Geocoder unavailable: {exc}",
        )
    svc = get_geocoder_service()
    result = await svc.geocode(payload.query)
    return JSONResponse(result)
