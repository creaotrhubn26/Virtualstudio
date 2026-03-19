"""
Environment planner service.

Creates a structured EnvironmentPlan that the current studio shell can apply
right now, while also describing what is still missing for full prompt/image
to environment generation.
"""

from __future__ import annotations

import base64
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

KNOWN_TEMPLATE_PRESET_SURFACES: Dict[str, List[Dict[str, Any]]] = {
    "studio-classic-white": [
        {"target": "backWall", "materialId": "white", "visible": True, "rationale": "Preset base surface"},
        {"target": "leftWall", "materialId": "white", "visible": False, "rationale": "Preset base surface"},
        {"target": "rightWall", "materialId": "white", "visible": False, "rationale": "Preset base surface"},
        {"target": "rearWall", "materialId": "white", "visible": False, "rationale": "Preset base surface"},
        {"target": "floor", "materialId": "infinity", "visible": True, "rationale": "Preset base surface"},
    ],
    "studio-dark-dramatic": [
        {"target": "backWall", "materialId": "black", "visible": True, "rationale": "Preset base surface"},
        {"target": "leftWall", "materialId": "black", "visible": True, "rationale": "Preset base surface"},
        {"target": "rightWall", "materialId": "black", "visible": True, "rationale": "Preset base surface"},
        {"target": "rearWall", "materialId": "black", "visible": False, "rationale": "Preset base surface"},
        {"target": "floor", "materialId": "black-glossy", "visible": True, "rationale": "Preset base surface"},
    ],
    "cinematic-blade-runner": [
        {"target": "backWall", "materialId": "blade-runner", "visible": True, "rationale": "Preset base surface"},
        {"target": "leftWall", "materialId": "blade-runner", "visible": True, "rationale": "Preset base surface"},
        {"target": "rightWall", "materialId": "blade-runner", "visible": True, "rationale": "Preset base surface"},
        {"target": "rearWall", "materialId": "blade-runner", "visible": False, "rationale": "Preset base surface"},
        {"target": "floor", "materialId": "blade-runner-wet", "visible": True, "rationale": "Preset base surface"},
    ],
    "cinematic-kubrick": [
        {"target": "backWall", "materialId": "kubrick-red", "visible": True, "rationale": "Preset base surface"},
        {"target": "leftWall", "materialId": "kubrick-red", "visible": True, "rationale": "Preset base surface"},
        {"target": "rightWall", "materialId": "kubrick-red", "visible": True, "rationale": "Preset base surface"},
        {"target": "rearWall", "materialId": "kubrick-red", "visible": False, "rationale": "Preset base surface"},
        {"target": "floor", "materialId": "kubrick-shine", "visible": True, "rationale": "Preset base surface"},
    ],
    "urban-industrial-loft": [
        {"target": "backWall", "materialId": "old-brick", "visible": True, "rationale": "Preset base surface"},
        {"target": "leftWall", "materialId": "rusted-metal", "visible": True, "rationale": "Preset base surface"},
        {"target": "rightWall", "materialId": "corrugated", "visible": True, "rationale": "Preset base surface"},
        {"target": "rearWall", "materialId": "old-brick", "visible": True, "rationale": "Preset base surface"},
        {"target": "floor", "materialId": "urban-warehouse", "visible": True, "rationale": "Preset base surface"},
    ],
    "urban-neon-arcade": [
        {"target": "backWall", "materialId": "neon-panel", "visible": True, "rationale": "Preset base surface"},
        {"target": "leftWall", "materialId": "neon-cyan", "visible": True, "rationale": "Preset base surface"},
        {"target": "rightWall", "materialId": "neon-orange", "visible": True, "rationale": "Preset base surface"},
        {"target": "rearWall", "materialId": "neon-panel", "visible": True, "rationale": "Preset base surface"},
        {"target": "floor", "materialId": "urban-neon-floor", "visible": True, "rationale": "Preset base surface"},
    ],
}

GENERIC_NEUTRAL_SURFACE_SIGNATURE = {
    "backWall": ("gray-medium", True),
    "leftWall": ("gray-dark", False),
    "rightWall": ("gray-dark", False),
    "rearWall": ("gray-dark", False),
    "floor": ("gray-dark", True),
}


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _normalize_hex(value: Optional[str], fallback: str) -> str:
    if not value or not isinstance(value, str):
        return fallback

    value = value.strip()
    if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return value.lower()
    if re.fullmatch(r"#[0-9a-fA-F]{8}", value):
        return value[:7].lower()
    return fallback


def _extract_json_payload(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    return json.loads(text)


class EnvironmentPlannerService:
    def __init__(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        self.model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.enabled = bool(self.api_key)
        self.wall_material_ids = self._load_known_material_ids(
            "src/data/wallDefinitions.ts",
            "WALL_MATERIALS",
            {
                "white",
                "gray-light",
                "gray-medium",
                "gray-dark",
                "black",
                "cream",
                "brick-red",
                "brick-white",
                "wood-panels",
                "plaster",
                "stucco",
            },
        )
        self.floor_material_ids = self._load_known_material_ids(
            "src/data/floorDefinitions.ts",
            "FLOOR_MATERIALS",
            {
                "white",
                "gray-light",
                "gray-dark",
                "black",
                "black-glossy",
                "oak-light",
                "oak-dark",
                "walnut",
                "pine",
                "herringbone",
                "reclaimed",
                "concrete-raw",
                "concrete-polished",
                "checkerboard",
                "terrazzo",
                "marble-white",
                "marble-black",
            },
        )

        if self.enabled:
            print(f"Environment Planner Service: Ready ({self.model})")
        else:
            print("Environment Planner Service: Running in fallback mode (missing GEMINI_API_KEY)")

    def get_status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": "gemini" if self.enabled else "fallback",
            "model": self.model if self.enabled else "fallback",
            "hasVisionSupport": self.enabled,
            "supportedWorldModelProviders": ["none", "manual", "genie"],
        }

    def _load_known_material_ids(
        self,
        relative_path: str,
        block_name: str,
        fallback_ids: set[str],
    ) -> set[str]:
        repo_root = Path(__file__).resolve().parent.parent
        file_path = repo_root / relative_path

        try:
            source = file_path.read_text(encoding="utf-8")
            block_match = re.search(
                rf"export const {block_name}[^=]*=\s*\[(?P<body>.*?)\n\];",
                source,
                re.DOTALL,
            )
            if not block_match:
                return fallback_ids

            ids = set(re.findall(r"id:\s*'([^']+)'", block_match.group("body")))
            return ids or fallback_ids
        except Exception:
            return fallback_ids

    def _normalize_surface_target(self, value: Any) -> Optional[str]:
        if value in {"backWall", "leftWall", "rightWall", "rearWall", "floor"}:
            return str(value)
        return None

    def _normalize_surface_material_id(
        self,
        target: str,
        value: Any,
        fallback_material_id: str,
    ) -> str:
        material_id = str(value) if isinstance(value, str) and value else fallback_material_id
        known_ids = self.floor_material_ids if target == "floor" else self.wall_material_ids
        return material_id if material_id in known_ids else fallback_material_id

    def _get_known_preset_surfaces(self, preset_id: Optional[str]) -> Optional[List[Dict[str, Any]]]:
        if not preset_id:
            return None
        surfaces = KNOWN_TEMPLATE_PRESET_SURFACES.get(preset_id)
        if not surfaces:
            return None
        return [dict(surface) for surface in surfaces]

    def _looks_like_generic_neutral_surfaces(self, surfaces: List[Dict[str, Any]]) -> bool:
        if len(surfaces) != len(GENERIC_NEUTRAL_SURFACE_SIGNATURE):
            return False

        surface_map = {surface.get("target"): surface for surface in surfaces if isinstance(surface, dict)}
        if set(surface_map.keys()) != set(GENERIC_NEUTRAL_SURFACE_SIGNATURE.keys()):
            return False

        for target, (material_id, visible) in GENERIC_NEUTRAL_SURFACE_SIGNATURE.items():
            surface = surface_map[target]
            if surface.get("materialId") != material_id:
                return False
            if bool(surface.get("visible")) != visible:
                return False
        return True

    def _safe_live_error_message(self, exc: Exception) -> str:
        if isinstance(exc, httpx.HTTPStatusError):
            status_code = exc.response.status_code if exc.response is not None else None
            if status_code == 429:
                return "Live planner reached a temporary rate limit. Using fallback plan."
            if status_code in {401, 403}:
                return "Live planner authorization failed. Using fallback plan."
            if status_code is not None and status_code >= 500:
                return "Live planner is temporarily unavailable. Using fallback plan."
            if status_code is not None:
                return f"Live planner request failed ({status_code}). Using fallback plan."
        if isinstance(exc, httpx.TimeoutException):
            return "Live planner timed out. Using fallback plan."
        return "Live planner is unavailable right now. Using fallback plan."

    def _safe_live_error_log(self, exc: Exception) -> str:
        if isinstance(exc, httpx.HTTPStatusError):
            status_code = exc.response.status_code if exc.response is not None else "unknown"
            return f"HTTPStatusError(status={status_code})"
        if isinstance(exc, httpx.TimeoutException):
            return "TimeoutException"
        return exc.__class__.__name__

    def _normalize_world_model_provider(self, value: Optional[str]) -> str:
        if value in {"none", "manual", "genie"}:
            return value
        return "none"

    def _default_world_model_summary(
        self,
        provider: str,
        mode: str,
        imported_image_count: int,
    ) -> str:
        if provider == "genie":
            return (
                f"Genie import attached as {mode.replace('_', ' ')} reference"
                f" with {imported_image_count} screenshot(s)."
            )
        if provider == "manual":
            return f"Manual world-model reference attached with {imported_image_count} image(s)."
        return "No external world-model reference attached."

    def _normalize_world_model(
        self,
        world_model: Optional[Dict[str, Any]],
        fallback_world_model: Dict[str, Any],
        provider: str,
        prompt: str,
        reference_images: List[str],
        world_model_reference: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        source_world_model = world_model if isinstance(world_model, dict) else {}
        request_world_model = world_model_reference if isinstance(world_model_reference, dict) else {}

        normalized_provider = self._normalize_world_model_provider(
            source_world_model.get("provider")
            or request_world_model.get("provider")
            or provider
        )
        inferred_mode = "world_sketch" if normalized_provider == "genie" else (
            "reference_capture" if reference_images else "none"
        )
        mode = source_world_model.get("mode") or request_world_model.get("mode") or fallback_world_model.get("mode") or inferred_mode
        if mode not in {"none", "reference_capture", "lookdev", "world_sketch"}:
            mode = inferred_mode

        preview_labels = [
            str(item)[:120]
            for item in (
                source_world_model.get("previewLabels")
                or request_world_model.get("previewLabels")
                or fallback_world_model.get("previewLabels")
                or []
            )
            if isinstance(item, str)
        ][:8]

        imported_image_count = len(reference_images)
        try:
            imported_image_count = int(
                source_world_model.get("importedImageCount")
                or request_world_model.get("importedImageCount")
                or imported_image_count
            )
        except Exception:
            imported_image_count = len(reference_images)
        imported_image_count = max(imported_image_count, len(reference_images))

        summary = (
            source_world_model.get("summary")
            or request_world_model.get("summary")
            or fallback_world_model.get("summary")
            or self._default_world_model_summary(normalized_provider, mode, imported_image_count)
        )

        return {
            "provider": normalized_provider,
            "mode": mode,
            "prompt": (
                source_world_model.get("prompt")
                or request_world_model.get("prompt")
                or fallback_world_model.get("prompt")
                or (prompt if normalized_provider != "none" else None)
            ),
            "notes": (
                source_world_model.get("notes")
                or request_world_model.get("notes")
                or fallback_world_model.get("notes")
            ),
            "importedImageCount": imported_image_count,
            "summary": str(summary)[:240],
            "previewLabels": preview_labels,
        }

    async def generate_plan(
        self,
        prompt: str,
        reference_images: Optional[List[str]] = None,
        room_constraints: Optional[Dict[str, Any]] = None,
        prefer_fallback: bool = False,
        preferred_preset_id: Optional[str] = None,
        world_model_provider: str = "none",
        world_model_reference: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        prompt = (prompt or "").strip()
        reference_images = reference_images or []
        room_constraints = room_constraints or {}
        world_model_provider = self._normalize_world_model_provider(world_model_provider)
        world_model_reference = world_model_reference or {}

        fallback_plan = self._build_fallback_plan(
            prompt,
            reference_images,
            room_constraints,
            preferred_preset_id,
            world_model_provider,
            world_model_reference,
        )

        if prefer_fallback or not self.enabled:
            return {
                "success": True,
                "provider": "fallback",
                "model": "fallback",
                "usedFallback": True,
                "warning": None if prefer_fallback else "Gemini is not configured. Using local planner heuristics.",
                "plan": fallback_plan,
            }

        try:
            live_plan = await self._generate_with_gemini(
                prompt,
                reference_images,
                room_constraints,
                preferred_preset_id,
                world_model_provider,
                world_model_reference,
            )
            normalized_plan = self._normalize_plan(
                live_plan,
                fallback_plan,
                prompt,
                reference_images,
                room_constraints,
                preferred_preset_id,
                world_model_provider,
                world_model_reference,
            )
            return {
                "success": True,
                "provider": "gemini",
                "model": self.model,
                "usedFallback": False,
                "plan": normalized_plan,
            }
        except Exception as exc:
            print(
                "Environment Planner Service: Gemini request failed, using fallback. "
                f"Error: {self._safe_live_error_log(exc)}"
            )
            return {
                "success": True,
                "provider": "fallback",
                "model": "fallback",
                "usedFallback": True,
                "warning": self._safe_live_error_message(exc),
                "plan": fallback_plan,
            }

    async def _generate_with_gemini(
        self,
        prompt: str,
        reference_images: List[str],
        room_constraints: Dict[str, Any],
        preferred_preset_id: Optional[str],
        world_model_provider: str,
        world_model_reference: Dict[str, Any],
    ) -> Dict[str, Any]:
        parts: List[Dict[str, Any]] = [
            {
                "text": self._build_instruction(
                    prompt,
                    room_constraints,
                    preferred_preset_id,
                    world_model_provider,
                    world_model_reference,
                    reference_images,
                ),
            }
        ]

        for image in reference_images[:3]:
            inline_data = self._data_url_to_inline_data(image)
            if inline_data:
                parts.append({"inline_data": inline_data})
            else:
                parts.append({"text": f"Reference image hint: {image}"})

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("No Gemini candidates returned")

        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        raw_text = "\n".join(text_parts).strip()
        if not raw_text:
            raise RuntimeError("Gemini returned an empty response")

        return _extract_json_payload(raw_text)

    def _build_instruction(
        self,
        prompt: str,
        room_constraints: Dict[str, Any],
        preferred_preset_id: Optional[str],
        world_model_provider: str,
        world_model_reference: Dict[str, Any],
        reference_images: List[str],
    ) -> str:
        schema = {
            "version": "1.0",
            "planId": "string",
            "prompt": prompt,
            "source": "prompt|reference_image|hybrid|genie_reference",
            "worldModel": {
                "provider": "none|manual|genie",
                "mode": "none|reference_capture|lookdev|world_sketch",
                "prompt": "optional upstream world-model prompt",
                "notes": "optional import notes",
                "importedImageCount": 0,
                "summary": "short summary of how the world-model reference was used",
                "previewLabels": ["optional file labels"],
            },
            "summary": "short summary",
            "concept": "high-level concept name",
            "recommendedPresetId": "optional existing preset id",
            "roomShell": {
                "type": "studio_shell|interior_room|warehouse|storefront|abstract_stage|outdoor_illusion",
                "width": 20,
                "depth": 20,
                "height": 8,
                "openCeiling": True,
                "notes": ["optional notes"],
            },
            "surfaces": [
                {
                    "target": "backWall|leftWall|rightWall|rearWall|floor",
                    "materialId": "existing repo material id",
                    "visible": True,
                    "rationale": "why this material fits",
                }
            ],
            "atmosphere": {
                "fogEnabled": False,
                "fogDensity": 0.01,
                "fogColor": "#101820",
                "clearColor": "#101820",
                "ambientColor": "#ffffff",
                "ambientIntensity": 0.35,
            },
            "ambientSounds": ["optional sound ids"],
            "props": [
                {
                    "name": "hero prop",
                    "category": "hero|supporting|set_dressing",
                    "description": "brief detail",
                    "priority": "high|medium|low",
                    "placementHint": "brief placement hint",
                }
            ],
            "lighting": [
                {
                    "role": "key|fill|rim|practical|accent",
                    "position": [0, 3, -2],
                    "intensity": 0.7,
                    "color": "#ffffff",
                    "cct": 5600,
                    "purpose": "short purpose",
                }
            ],
            "camera": {
                "shotType": "wide|medium|close-up",
                "mood": "short mood",
                "target": [0, 1.4, 0],
                "positionHint": [0, 1.8, -6],
                "fov": 0.65,
            },
            "assemblySteps": ["ordered steps the product should do next"],
            "compatibility": {
                "currentStudioShellSupported": True,
                "confidence": 0.8,
                "gaps": ["what still cannot be built automatically"],
                "nextBuildModules": ["image_to_layout", "parametric_room", "asset_retrieval"],
            },
        }

        provider_context = {
            "preferredPresetId": preferred_preset_id,
            "provider": world_model_provider,
            "referenceImageCount": len(reference_images),
            "worldModelReference": world_model_reference,
        }

        world_model_instruction = (
            "No external world-model provider is attached."
            if world_model_provider == "none"
            else (
                "A Genie 3 import is attached. Treat the uploaded Genie screenshots and notes as lookdev/world-sketch guidance, not as authoritative geometry. "
                "Extract palette, atmosphere, layout cues, prop clusters, signage hints and camera mood. "
                "Be explicit that direct Genie runtime embedding/export is not yet supported in the current studio."
                if world_model_provider == "genie"
                else "A manual world-model reference bundle is attached. Use it as lookdev guidance and keep geometry assumptions conservative."
            )
        )

        return (
            "You are planning a virtual studio environment for a browser-based scene editor.\n"
            "Return strict JSON only. Do not wrap in markdown.\n"
            "Be honest about what the current studio can and cannot do.\n"
            "Favor material IDs and presets that a current shell with four walls and one floor can apply now.\n"
            "It is acceptable to anchor the plan on an existing preset/template when that improves speed or reliability.\n"
            "When preferredPresetId is present, treat that preset as the baseline look and preserve its palette/material identity unless the user's prompt clearly asks for a departure.\n"
            "If the prompt suggests a real room from an uploaded image, describe the room faithfully but add compatibility gaps for missing image-to-layout reconstruction.\n"
            "If the prompt suggests outdoor or complex architecture, mark it as an illusion if it must be faked in the current shell.\n"
            f"World-model provider context: {json.dumps(provider_context, ensure_ascii=True)}\n"
            f"{world_model_instruction}\n"
            f"Current room constraints: {json.dumps(room_constraints, ensure_ascii=True)}\n"
            f"Expected schema: {json.dumps(schema, ensure_ascii=True)}\n"
            f"User prompt: {prompt}"
        )

    def _data_url_to_inline_data(self, value: str) -> Optional[Dict[str, str]]:
        if not value.startswith("data:"):
            return None

        match = re.match(r"^data:(?P<mime>[^;]+);base64,(?P<data>.+)$", value)
        if not match:
            return None

        mime_type = match.group("mime")
        data = match.group("data")

        try:
            base64.b64decode(data, validate=True)
        except Exception:
            return None

        return {
            "mime_type": mime_type,
            "data": data,
        }

    def _normalize_plan(
        self,
        live_plan: Dict[str, Any],
        fallback_plan: Dict[str, Any],
        prompt: str,
        reference_images: List[str],
        room_constraints: Dict[str, Any],
        preferred_preset_id: Optional[str],
        world_model_provider: str,
        world_model_reference: Dict[str, Any],
    ) -> Dict[str, Any]:
        plan = dict(fallback_plan)
        plan.update({k: v for k, v in live_plan.items() if v is not None})

        plan["version"] = "1.0"
        plan["planId"] = str(plan.get("planId") or uuid.uuid4())
        plan["prompt"] = prompt
        plan["source"] = self._infer_source(reference_images, plan.get("source"), world_model_provider)
        plan["worldModel"] = self._normalize_world_model(
            plan.get("worldModel"),
            fallback_plan["worldModel"],
            world_model_provider,
            prompt,
            reference_images,
            world_model_reference,
        )
        plan["summary"] = str(plan.get("summary") or fallback_plan["summary"])[:500]
        plan["concept"] = str(plan.get("concept") or fallback_plan["concept"])[:120]

        room_shell = plan.get("roomShell") or {}
        fallback_room_shell = fallback_plan["roomShell"]
        plan["roomShell"] = {
            "type": room_shell.get("type") or fallback_room_shell["type"],
            "width": float(room_shell.get("width", fallback_room_shell["width"])),
            "depth": float(room_shell.get("depth", fallback_room_shell["depth"])),
            "height": float(room_shell.get("height", fallback_room_shell["height"])),
            "openCeiling": bool(room_shell.get("openCeiling", fallback_room_shell["openCeiling"])),
            "notes": room_shell.get("notes") or fallback_room_shell.get("notes", []),
        }

        surfaces = plan.get("surfaces")
        if not isinstance(surfaces, list):
            surfaces = []

        surfaces_by_target: Dict[str, Dict[str, Any]] = {}
        for surface in surfaces:
            if not isinstance(surface, dict):
                continue
            target = self._normalize_surface_target(surface.get("target"))
            if not target or target in surfaces_by_target:
                continue
            surfaces_by_target[target] = surface

        normalized_surfaces: List[Dict[str, Any]] = []
        for fallback_surface in fallback_plan["surfaces"]:
            target = fallback_surface["target"]
            source_surface = surfaces_by_target.get(target, {})
            normalized_surfaces.append(
                {
                    "target": target,
                    "materialId": self._normalize_surface_material_id(
                        target,
                        source_surface.get("materialId"),
                        fallback_surface["materialId"],
                    ),
                    "visible": bool(source_surface.get("visible", fallback_surface["visible"])),
                    "rationale": source_surface.get("rationale", fallback_surface.get("rationale")),
                }
            )

        recommended_preset_id = (
            str(plan["recommendedPresetId"])
            if plan.get("recommendedPresetId")
            else (preferred_preset_id or fallback_plan.get("recommendedPresetId"))
        )
        preset_surfaces = self._get_known_preset_surfaces(recommended_preset_id)
        if preset_surfaces and self._looks_like_generic_neutral_surfaces(normalized_surfaces):
            normalized_surfaces = preset_surfaces

        plan["surfaces"] = normalized_surfaces

        atmosphere = plan.get("atmosphere") or {}
        fallback_atmosphere = fallback_plan["atmosphere"]
        plan["atmosphere"] = {
            "fogEnabled": bool(atmosphere.get("fogEnabled", fallback_atmosphere.get("fogEnabled", False))),
            "fogDensity": float(_clamp(float(atmosphere.get("fogDensity", fallback_atmosphere["fogDensity"])), 0.0, 0.2)),
            "fogColor": _normalize_hex(atmosphere.get("fogColor"), fallback_atmosphere["fogColor"]),
            "clearColor": _normalize_hex(atmosphere.get("clearColor"), fallback_atmosphere["clearColor"]),
            "ambientColor": _normalize_hex(atmosphere.get("ambientColor"), fallback_atmosphere["ambientColor"]),
            "ambientIntensity": float(_clamp(float(atmosphere.get("ambientIntensity", fallback_atmosphere["ambientIntensity"])), 0.05, 2.0)),
        }

        plan["ambientSounds"] = [
            sound for sound in (plan.get("ambientSounds") or []) if isinstance(sound, str)
        ][:6]

        plan["props"] = [
            {
                "name": str(prop.get("name", "Unnamed prop"))[:120],
                "category": prop.get("category", "supporting"),
                "description": prop.get("description"),
                "priority": prop.get("priority", "medium"),
                "placementHint": prop.get("placementHint"),
            }
            for prop in (plan.get("props") or [])
            if isinstance(prop, dict)
        ][:8]

        plan["lighting"] = [
            {
                "role": str(light.get("role", "key"))[:40],
                "position": self._normalize_vec3(light.get("position"), [0, 3, -2]),
                "intensity": float(_clamp(float(light.get("intensity", 0.6)), 0.05, 3.0)),
                "color": _normalize_hex(light.get("color"), "#ffffff") if light.get("color") else None,
                "cct": int(light.get("cct", 5600)) if light.get("cct") is not None else None,
                "purpose": light.get("purpose"),
            }
            for light in (plan.get("lighting") or [])
            if isinstance(light, dict)
        ][:6]
        if not plan["lighting"]:
            plan["lighting"] = fallback_plan["lighting"]

        camera = plan.get("camera") or {}
        fallback_camera = fallback_plan["camera"]
        plan["camera"] = {
            "shotType": camera.get("shotType", fallback_camera["shotType"]),
            "mood": camera.get("mood", fallback_camera.get("mood")),
            "target": self._normalize_vec3(camera.get("target"), fallback_camera["target"]),
            "positionHint": self._normalize_vec3(camera.get("positionHint"), fallback_camera["positionHint"]),
            "fov": float(_clamp(float(camera.get("fov", fallback_camera["fov"])), 0.2, 1.4)),
        }

        plan["assemblySteps"] = [
            str(step)[:240]
            for step in (plan.get("assemblySteps") or fallback_plan["assemblySteps"])
            if isinstance(step, str)
        ][:8]

        compatibility = plan.get("compatibility") or {}
        fallback_compatibility = fallback_plan["compatibility"]
        plan["compatibility"] = {
            "currentStudioShellSupported": bool(
                compatibility.get("currentStudioShellSupported", fallback_compatibility["currentStudioShellSupported"])
            ),
            "confidence": float(_clamp(float(compatibility.get("confidence", fallback_compatibility["confidence"])), 0.0, 1.0)),
            "gaps": [
                str(item)[:240]
                for item in (compatibility.get("gaps") or fallback_compatibility["gaps"])
                if isinstance(item, str)
            ][:8],
            "nextBuildModules": [
                str(item)[:120]
                for item in (compatibility.get("nextBuildModules") or fallback_compatibility["nextBuildModules"])
                if isinstance(item, str)
            ][:8],
        }

        plan["recommendedPresetId"] = recommended_preset_id

        return plan

    def _normalize_vec3(self, value: Any, fallback: List[float]) -> List[float]:
        if not isinstance(value, list) or len(value) < 3:
            return fallback
        try:
            return [float(value[0]), float(value[1]), float(value[2])]
        except Exception:
            return fallback

    def _infer_source(
        self,
        reference_images: List[str],
        requested: Optional[str],
        world_model_provider: str = "none",
    ) -> str:
        if requested in {"prompt", "reference_image", "hybrid", "fallback", "genie_reference"}:
            return requested
        if world_model_provider == "genie":
            return "genie_reference"
        if reference_images:
            return "hybrid"
        return "prompt"

    def _build_fallback_plan(
        self,
        prompt: str,
        reference_images: List[str],
        room_constraints: Dict[str, Any],
        preferred_preset_id: Optional[str],
        world_model_provider: str,
        world_model_reference: Dict[str, Any],
    ) -> Dict[str, Any]:
        lowered = prompt.lower()

        recommended_preset: Optional[str] = preferred_preset_id
        concept = "Adaptive studio environment"
        summary = "A structured environment plan mapped onto the current studio shell."
        shell_type = "studio_shell"
        default_surfaces = [
            {"target": "backWall", "materialId": "gray-medium", "visible": True, "rationale": "Neutral hero wall"},
            {"target": "leftWall", "materialId": "gray-dark", "visible": False, "rationale": "Keep side clean"},
            {"target": "rightWall", "materialId": "gray-dark", "visible": False, "rationale": "Keep side clean"},
            {"target": "rearWall", "materialId": "gray-dark", "visible": False, "rationale": "Avoid back clutter"},
            {"target": "floor", "materialId": "gray-dark", "visible": True, "rationale": "Neutral working floor"},
        ]
        surfaces = self._get_known_preset_surfaces(preferred_preset_id) or default_surfaces
        atmosphere = {
            "fogEnabled": False,
            "fogDensity": 0.01,
            "fogColor": "#101820",
            "clearColor": "#101820",
            "ambientColor": "#ffffff",
            "ambientIntensity": 0.35,
        }
        ambient_sounds: List[str] = []
        props: List[Dict[str, Any]] = []
        lighting = [
            {
                "role": "key",
                "position": [-2.5, 3.0, -1.5],
                "intensity": 0.85,
                "color": "#fff4e8",
                "cct": 5200,
                "purpose": "Main subject shaping",
            },
            {
                "role": "fill",
                "position": [2.0, 2.4, -1.0],
                "intensity": 0.35,
                "color": "#dbeafe",
                "cct": 6500,
                "purpose": "Shadow control",
            },
        ]
        camera = {
            "shotType": "medium",
            "mood": "clean commercial",
            "target": [0.0, 1.4, 0.0],
            "positionHint": [0.0, 1.8, -6.0],
            "fov": 0.68,
        }
        assembly_steps = [
            "Apply the shell-compatible wall and floor materials.",
            "Stage hero props inside the center third of the current room.",
            "Use lighting cues to fake depth until parametric room generation exists.",
        ]
        gaps = [
            "The current studio still uses one fixed shell, so geometry and architecture are not rebuilt from the prompt yet.",
        ]
        next_modules = [
            "prompt_to_environment_plan",
            "asset_retrieval_and_tagging",
            "parametric_room_builder",
        ]
        confidence = 0.72
        current_shell_supported = True
        world_model = self._normalize_world_model(
            world_model_reference,
            {
                "provider": world_model_provider,
                "mode": "world_sketch" if world_model_provider == "genie" else ("reference_capture" if reference_images else "none"),
                "prompt": world_model_reference.get("prompt") if isinstance(world_model_reference, dict) else None,
                "notes": world_model_reference.get("notes") if isinstance(world_model_reference, dict) else None,
                "importedImageCount": len(reference_images),
                "summary": None,
                "previewLabels": world_model_reference.get("previewLabels", []) if isinstance(world_model_reference, dict) else [],
            },
            world_model_provider,
            prompt,
            reference_images,
            world_model_reference,
        )

        if any(token in lowered for token in ["pizza", "pizzeria", "restaurant", "food", "kitchen"]):
            concept = "Warm pizza commercial set"
            summary = "A warm food-commercial environment with inviting surfaces, product-friendly contrast and room for hero food shots."
            surfaces = [
                {"target": "backWall", "materialId": "brick-white", "visible": True, "rationale": "Clean pizzeria texture"},
                {"target": "leftWall", "materialId": "stucco", "visible": True, "rationale": "Warm sidewall bounce"},
                {"target": "rightWall", "materialId": "wood-panels", "visible": True, "rationale": "Adds warmth and craft feel"},
                {"target": "rearWall", "materialId": "plaster", "visible": False, "rationale": "Not needed on camera"},
                {"target": "floor", "materialId": "checkerboard", "visible": True, "rationale": "Classic diner/pizzeria cue"},
            ]
            atmosphere.update({
                "clearColor": "#2b1e18",
                "ambientColor": "#ffe7c2",
                "ambientIntensity": 0.42,
            })
            props = [
                {"name": "Pizza prep counter", "category": "hero", "description": "Main product table", "priority": "high", "placementHint": "Center foreground"},
                {"name": "Wood-fired oven facade", "category": "supporting", "description": "Background brand anchor", "priority": "medium", "placementHint": "Back wall"},
                {"name": "Menu board and olive oil props", "category": "set_dressing", "description": "Restaurant cues", "priority": "medium", "placementHint": "Side wall shelves"},
            ]
            lighting = [
                {
                    "role": "key",
                    "position": [-2.0, 3.2, -1.5],
                    "intensity": 0.9,
                    "color": "#ffd8a8",
                    "cct": 4300,
                    "purpose": "Make food look warm and appetizing",
                },
                {
                    "role": "rim",
                    "position": [2.5, 2.6, -0.5],
                    "intensity": 0.45,
                    "color": "#fff1db",
                    "cct": 5200,
                    "purpose": "Separate steam and crust texture",
                },
            ]
            camera.update({
                "shotType": "medium-close",
                "mood": "appetizing premium commercial",
                "fov": 0.55,
            })
            confidence = 0.81
            next_modules.append("prop_layout_from_prompt")

        elif any(token in lowered for token in ["cyberpunk", "blade runner", "neon", "futuristic"]):
            recommended_preset = "cinematic-blade-runner"
            concept = "Neon cyberpunk stage"
            summary = "A rainy neon-forward cyberpunk setup mapped to the current walls and reflective floor."
            surfaces = [
                {"target": "backWall", "materialId": "blade-runner", "visible": True, "rationale": "Primary hero wall"},
                {"target": "leftWall", "materialId": "urban-neon-cyan", "visible": True, "rationale": "Cool side accent"},
                {"target": "rightWall", "materialId": "urban-neon-orange", "visible": True, "rationale": "Warm side accent"},
                {"target": "rearWall", "materialId": "blade-runner", "visible": False, "rationale": "Keep shell clean"},
                {"target": "floor", "materialId": "blade-runner-wet", "visible": True, "rationale": "Reflective cyberpunk floor"},
            ]
            atmosphere.update({
                "fogEnabled": True,
                "fogDensity": 0.03,
                "fogColor": "#160d26",
                "clearColor": "#0d1120",
                "ambientColor": "#f4d8ff",
                "ambientIntensity": 0.26,
            })
            ambient_sounds = ["city-ambient", "rain-heavy", "synth-drone"]
            props = [
                {"name": "Product podium", "category": "hero", "description": "Central hero base for the featured product", "priority": "high", "placementHint": "Center foreground"},
                {"name": "Cyan neon sign", "category": "supporting", "description": "Cool neon accent signage", "priority": "medium", "placementHint": "Left wall"},
                {"name": "Magenta neon sign", "category": "supporting", "description": "Warm neon accent signage", "priority": "medium", "placementHint": "Right wall"},
            ]
            confidence = 0.88

        elif any(token in lowered for token in ["horror", "lovecraft", "ritual", "cosmic"]):
            recommended_preset = "lovecraft-ritual" if "ritual" in lowered else "lovecraft-void"
            concept = "Occult horror chamber"
            summary = "A horror-oriented shell plan with oppressive darkness, selective highlights and deliberate compatibility warnings."
            surfaces = [
                {"target": "backWall", "materialId": "lovecraft-ritual", "visible": True, "rationale": "Hero ritual wall"},
                {"target": "leftWall", "materialId": "lovecraft-ancient", "visible": True, "rationale": "Ancient side texture"},
                {"target": "rightWall", "materialId": "lovecraft-ancient", "visible": True, "rationale": "Ancient side texture"},
                {"target": "rearWall", "materialId": "lovecraft-void", "visible": True, "rationale": "Dark rear closure"},
                {"target": "floor", "materialId": "lovecraft-ritual", "visible": True, "rationale": "Occult floor mark"},
            ]
            atmosphere.update({
                "fogEnabled": True,
                "fogDensity": 0.02,
                "fogColor": "#140b12",
                "clearColor": "#09060a",
                "ambientColor": "#d7a0a0",
                "ambientIntensity": 0.18,
            })
            ambient_sounds = ["lovecraft-whispers", "fire-crackling"]
            confidence = 0.86

        elif any(token in lowered for token in ["warehouse", "industrial", "garage", "factory"]):
            concept = "Industrial warehouse shell"
            summary = "An industrial environment using concrete and metal cues within the existing stage boundaries."
            shell_type = "warehouse"
            surfaces = [
                {"target": "backWall", "materialId": "urban-corrugated", "visible": True, "rationale": "Warehouse hero wall"},
                {"target": "leftWall", "materialId": "concrete", "visible": True, "rationale": "Structural sidewall"},
                {"target": "rightWall", "materialId": "urban-rusted-metal", "visible": True, "rationale": "Industrial weathering"},
                {"target": "rearWall", "materialId": "urban-painted-metal", "visible": True, "rationale": "Loading-bay feel"},
                {"target": "floor", "materialId": "urban-warehouse", "visible": True, "rationale": "Factory floor cue"},
            ]
            atmosphere.update({
                "clearColor": "#15191d",
                "ambientColor": "#dde7ef",
                "ambientIntensity": 0.28,
            })
            confidence = 0.83

        elif any(token in lowered for token in ["office", "corporate", "meeting room", "showroom"]):
            concept = "Corporate interview room"
            summary = "A restrained corporate environment for interviews, explainers and brand-safe product work."
            shell_type = "interior_room"
            surfaces = [
                {"target": "backWall", "materialId": "gray-light", "visible": True, "rationale": "Neutral presentation wall"},
                {"target": "leftWall", "materialId": "navy", "visible": True, "rationale": "Corporate accent wall"},
                {"target": "rightWall", "materialId": "brick-white", "visible": False, "rationale": "Keep frame uncluttered"},
                {"target": "rearWall", "materialId": "gray-medium", "visible": False, "rationale": "Clean back side"},
                {"target": "floor", "materialId": "oak-light", "visible": True, "rationale": "Warm but professional floor"},
            ]
            atmosphere.update({
                "clearColor": "#edf2f7",
                "ambientColor": "#ffffff",
                "ambientIntensity": 0.5,
            })
            confidence = 0.8

        elif any(token in lowered for token in ["fashion", "beauty", "luxury", "editorial"]):
            recommended_preset = "studio-dark-dramatic"
            concept = "Luxury editorial studio"
            summary = "A premium editorial shell with dark contrast, reflective floor and controlled highlights."
            surfaces = [
                {"target": "backWall", "materialId": "black", "visible": True, "rationale": "Luxury hero wall"},
                {"target": "leftWall", "materialId": "nolan-dark", "visible": True, "rationale": "Low distraction side"},
                {"target": "rightWall", "materialId": "burgundy", "visible": False, "rationale": "Optional accent"},
                {"target": "rearWall", "materialId": "black", "visible": False, "rationale": "Reduce spill"},
                {"target": "floor", "materialId": "black-glossy", "visible": True, "rationale": "Editorial reflection"},
            ]
            atmosphere.update({
                "clearColor": "#09090b",
                "ambientColor": "#f5e8de",
                "ambientIntensity": 0.22,
            })
            props = [
                {"name": "Beauty table", "category": "hero", "description": "Front-of-frame workstation for editorial styling", "priority": "high", "placementHint": "Center foreground"},
                {"name": "Reflective panel", "category": "supporting", "description": "Large panel for soft reflections and fill cues", "priority": "medium", "placementHint": "Right side"},
            ]
            confidence = 0.85

        if any(token in lowered for token in ["outdoor", "street", "beach", "forest", "mountain", "rooftop"]):
            shell_type = "outdoor_illusion"
            current_shell_supported = False
            confidence = min(confidence, 0.58)
            gaps.append("Outdoor environments still need sky domes, distant set extension and parallax backgrounds.")
            next_modules.extend(["sky_and_hdri_orchestrator", "set_extension_builder"])

        if reference_images:
            summary += " Reference images were supplied and should be treated as style/layout guidance."
            gaps.append("Exact room reconstruction from a reference photo still needs image-to-layout, depth and segmentation services.")
            next_modules.extend(["image_to_layout", "depth_estimation", "segmentation_and_matte"])
            current_shell_supported = current_shell_supported and shell_type != "outdoor_illusion"
            confidence = min(confidence, 0.78)

        if world_model_provider == "genie":
            summary += " Genie references were supplied as lookdev/world-sketch guidance."
            assembly_steps.insert(0, "Translate the Genie world reference into shell-safe materials, props and camera cues.")
            gaps.append("Direct Genie runtime embedding/export is not connected to the studio yet.")
            next_modules.extend(["world_model_provider_bridge", "genie_runtime_connector"])
            confidence = min(confidence, 0.76 if reference_images else 0.8)
            if world_model.get("notes"):
                assembly_steps.append("Use the imported Genie notes to preserve the strongest world-building cues.")

        current_shell = room_constraints.get("currentShell")
        if isinstance(current_shell, str) and current_shell:
            assembly_steps.insert(0, f"Map the plan onto the current shell: {current_shell}.")

        return {
            "version": "1.0",
            "planId": str(uuid.uuid4()),
            "prompt": prompt,
            "source": self._infer_source(reference_images, None, world_model_provider),
            "worldModel": world_model,
            "summary": summary,
            "concept": concept,
            "recommendedPresetId": recommended_preset,
            "roomShell": {
                "type": shell_type,
                "width": 20,
                "depth": 20,
                "height": 8,
                "openCeiling": True,
                "notes": [
                    "Current runtime supports one shell with four walls and one floor.",
                ],
            },
            "surfaces": surfaces,
            "atmosphere": atmosphere,
            "ambientSounds": ambient_sounds,
            "props": props,
            "lighting": lighting,
            "camera": camera,
            "assemblySteps": assembly_steps,
            "compatibility": {
                "currentStudioShellSupported": current_shell_supported,
                "confidence": confidence,
                "gaps": gaps,
                "nextBuildModules": next_modules,
            },
        }
