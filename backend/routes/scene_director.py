"""Scene Director API — script beat → full scene blueprint.

POST /api/scene-director/from-beat    — one parsed beat → one SceneAssembly
POST /api/scene-director/from-script  — an array of beats → array of assemblies

The service behind this (backend/scene_director_service.py) makes
director-level decisions about shot type, lens, aperture, lighting pattern,
and concrete light modifiers so the frontend can build a Babylon.js scene
that looks like a photographer + cinematographer set it up on purpose.
"""

from dataclasses import asdict
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
