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
    }


@router.get("/status")
async def scene_director_status():
    """Return availability + LLM mode."""
    try:
        from scene_director_service import get_scene_director  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Scene Director service not available: {exc}",
        )
    svc = get_scene_director()
    return JSONResponse(
        {
            "available": True,
            "llmEnrichmentEnabled": svc.llm_enabled,
            "openaiBaseUrl": svc.openai_base_url,
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
