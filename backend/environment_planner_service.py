"""
Environment planner service.

Creates a structured EnvironmentPlan that the current studio shell can apply
right now, while also describing what is still missing for full prompt/image
to environment generation.
"""

from __future__ import annotations

import base64
import io
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

KNOWN_GOBO_IDS = {"window", "blinds", "leaves", "breakup", "dots", "lines"}
KNOWN_LIGHTING_INTENTS = {
    "hero_product",
    "beauty",
    "interview",
    "dramatic",
    "soft_daylight",
    "noir",
    "cyberpunk",
    "food",
    "luxury_retail",
    "office",
    "nightclub",
    "warehouse",
}
KNOWN_LIGHT_MODIFIERS = {
    "none",
    "softbox",
    "stripbox",
    "lantern",
    "fresnel",
    "practical_shade",
    "gobo_projector",
}
KNOWN_CHARACTER_ARCHETYPES = {
    "worker_baker",
    "worker_cashier",
    "worker_server",
    "worker_host",
    "worker_generic",
    "worker_barista",
    "talent_woman",
    "talent_man",
    "customer_woman",
    "customer_man",
}

ROOM_SHELL_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "studio_shell": {
        "width": 20.0,
        "depth": 20.0,
        "height": 8.0,
        "openCeiling": True,
        "ceilingStyle": "flat",
        "notes": ["Neutral shell for prompt-first environment dressing."],
        "openings": [],
        "zones": [
            {"id": "hero_zone", "label": "Hero zone", "purpose": "hero", "xBias": 0.0, "zBias": -0.16, "widthRatio": 0.28, "depthRatio": 0.24},
            {"id": "background_zone", "label": "Background zone", "purpose": "background", "xBias": 0.0, "zBias": 0.32, "widthRatio": 0.42, "depthRatio": 0.24},
        ],
        "fixtures": [],
        "niches": [],
        "wallSegments": [],
    },
    "interior_room": {
        "width": 14.0,
        "depth": 10.0,
        "height": 4.2,
        "openCeiling": False,
        "ceilingStyle": "coffered",
        "notes": ["Interior shell with cleaner proportions, trim and architectural cues."],
        "openings": [
            {"id": "main_entry", "wallTarget": "rearWall", "kind": "door", "widthRatio": 0.22, "heightRatio": 0.72, "xAlign": "left", "sillHeight": 0.0},
            {"id": "side_window", "wallTarget": "rightWall", "kind": "window", "widthRatio": 0.24, "heightRatio": 0.36, "xAlign": "center", "sillHeight": 1.05},
            {"id": "service_pass", "wallTarget": "backWall", "kind": "pass_through", "widthRatio": 0.18, "heightRatio": 0.24, "xAlign": "right", "sillHeight": 1.16},
        ],
        "zones": [
            {"id": "hero_zone", "label": "Hero zone", "purpose": "hero", "xBias": 0.0, "zBias": -0.18, "widthRatio": 0.26, "depthRatio": 0.22},
            {"id": "service_lane", "label": "Service lane", "purpose": "service", "xBias": 0.0, "zBias": 0.08, "widthRatio": 0.38, "depthRatio": 0.16},
            {"id": "backroom_zone", "label": "Backroom", "purpose": "backroom", "xBias": 0.34, "zBias": 0.3, "widthRatio": 0.18, "depthRatio": 0.18},
            {"id": "background_zone", "label": "Background zone", "purpose": "background", "xBias": 0.0, "zBias": 0.3, "widthRatio": 0.42, "depthRatio": 0.24},
        ],
        "fixtures": [
            {"id": "service_partition", "kind": "partition", "zoneId": "service_lane", "widthRatio": 0.18, "depthRatio": 0.05, "height": 2.2},
            {"id": "hero_plinth", "kind": "display_plinth", "zoneId": "hero_zone", "widthRatio": 0.16, "depthRatio": 0.16, "height": 0.92},
            {"id": "service_pass_shelf", "kind": "pass_shelf", "zoneId": "backroom_zone", "wallTarget": "backWall", "widthRatio": 0.18, "depthRatio": 0.08, "height": 1.2},
        ],
        "niches": [
            {"id": "hero_display_niche", "wallTarget": "backWall", "kind": "display", "widthRatio": 0.24, "heightRatio": 0.36, "xAlign": "center", "sillHeight": 0.72, "depth": 0.24},
            {"id": "side_shelf_niche", "wallTarget": "leftWall", "kind": "shelf", "widthRatio": 0.18, "heightRatio": 0.28, "xAlign": "center", "sillHeight": 1.02, "depth": 0.18},
        ],
        "wallSegments": [
            {"id": "back_panel_segment", "wallTarget": "backWall", "kind": "panel", "widthRatio": 0.24, "heightRatio": 0.54, "xAlign": "center", "sillHeight": 0.18, "depth": 0.08},
            {"id": "left_pilaster_segment", "wallTarget": "leftWall", "kind": "pilaster", "widthRatio": 0.1, "heightRatio": 0.72, "xAlign": "right", "sillHeight": 0.0, "depth": 0.06},
        ],
    },
    "warehouse": {
        "width": 22.0,
        "depth": 18.0,
        "height": 8.0,
        "openCeiling": False,
        "ceilingStyle": "open_truss",
        "notes": ["Industrial shell with exposed beams, columns and longer sightlines."],
        "openings": [
            {"id": "loading_bay", "wallTarget": "rearWall", "kind": "archway", "widthRatio": 0.34, "heightRatio": 0.78, "xAlign": "center", "sillHeight": 0.0},
        ],
        "zones": [
            {"id": "hero_zone", "label": "Hero zone", "purpose": "hero", "xBias": 0.0, "zBias": -0.12, "widthRatio": 0.26, "depthRatio": 0.18},
            {"id": "loading_lane", "label": "Loading lane", "purpose": "service", "xBias": 0.0, "zBias": 0.18, "widthRatio": 0.44, "depthRatio": 0.18},
            {"id": "background_zone", "label": "Background zone", "purpose": "background", "xBias": 0.0, "zBias": 0.36, "widthRatio": 0.5, "depthRatio": 0.24},
        ],
        "fixtures": [
            {"id": "loading_partition", "kind": "partition", "zoneId": "loading_lane", "widthRatio": 0.28, "depthRatio": 0.05, "height": 2.6},
            {"id": "hero_plinth", "kind": "display_plinth", "zoneId": "hero_zone", "widthRatio": 0.18, "depthRatio": 0.18, "height": 1.0},
        ],
        "niches": [
            {"id": "tool_alcove", "wallTarget": "leftWall", "kind": "alcove", "widthRatio": 0.18, "heightRatio": 0.34, "xAlign": "center", "sillHeight": 0.54, "depth": 0.26},
        ],
        "wallSegments": [
            {"id": "warehouse_bay_segment", "wallTarget": "backWall", "kind": "bay", "widthRatio": 0.24, "heightRatio": 0.58, "xAlign": "center", "sillHeight": 0.12, "depth": 0.08},
        ],
    },
    "storefront": {
        "width": 18.0,
        "depth": 12.0,
        "height": 6.0,
        "openCeiling": False,
        "ceilingStyle": "canopy",
        "notes": ["Street-facing shell with branded frontage, display ledge and front entry."],
        "openings": [
            {"id": "front_entry", "wallTarget": "rearWall", "kind": "door", "widthRatio": 0.22, "heightRatio": 0.72, "xAlign": "left", "sillHeight": 0.0},
            {"id": "display_window", "wallTarget": "rearWall", "kind": "window", "widthRatio": 0.36, "heightRatio": 0.42, "xAlign": "right", "sillHeight": 1.05},
            {"id": "service_pass", "wallTarget": "backWall", "kind": "pass_through", "widthRatio": 0.16, "heightRatio": 0.22, "xAlign": "right", "sillHeight": 1.12},
        ],
        "zones": [
            {"id": "hero_zone", "label": "Hero zone", "purpose": "hero", "xBias": 0.0, "zBias": -0.18, "widthRatio": 0.24, "depthRatio": 0.18},
            {"id": "front_counter", "label": "Front counter", "purpose": "counter", "xBias": 0.0, "zBias": 0.08, "widthRatio": 0.34, "depthRatio": 0.16},
            {"id": "queue_lane", "label": "Queue lane", "purpose": "queue", "xBias": 0.18, "zBias": -0.02, "widthRatio": 0.2, "depthRatio": 0.2},
            {"id": "backroom_zone", "label": "Backroom", "purpose": "backroom", "xBias": -0.34, "zBias": 0.3, "widthRatio": 0.18, "depthRatio": 0.18},
            {"id": "background_zone", "label": "Background zone", "purpose": "background", "xBias": 0.0, "zBias": 0.32, "widthRatio": 0.38, "depthRatio": 0.2},
        ],
        "fixtures": [
            {"id": "front_counter_block", "kind": "counter_block", "zoneId": "front_counter", "widthRatio": 0.34, "depthRatio": 0.14, "height": 1.06},
            {"id": "host_stand", "kind": "host_stand", "zoneId": "queue_lane", "widthRatio": 0.12, "depthRatio": 0.1, "height": 1.18},
            {"id": "window_display_plinth", "kind": "display_plinth", "zoneId": "hero_zone", "widthRatio": 0.14, "depthRatio": 0.14, "height": 0.88},
            {"id": "service_pass_shelf", "kind": "pass_shelf", "zoneId": "backroom_zone", "wallTarget": "backWall", "widthRatio": 0.16, "depthRatio": 0.08, "height": 1.16},
            {"id": "backroom_partition", "kind": "partition", "zoneId": "backroom_zone", "widthRatio": 0.18, "depthRatio": 0.05, "height": 2.4},
        ],
        "niches": [
            {"id": "menu_display_niche", "wallTarget": "rightWall", "kind": "display", "widthRatio": 0.18, "heightRatio": 0.34, "xAlign": "center", "sillHeight": 0.86, "depth": 0.22},
        ],
        "wallSegments": [
            {"id": "front_bay_segment", "wallTarget": "rearWall", "kind": "bay", "widthRatio": 0.22, "heightRatio": 0.58, "xAlign": "center", "sillHeight": 0.12, "depth": 0.08},
        ],
    },
    "abstract_stage": {
        "width": 18.0,
        "depth": 14.0,
        "height": 7.0,
        "openCeiling": True,
        "ceilingStyle": "flat",
        "notes": ["Abstract stage shell with cyclorama treatment and controlled architecture."],
        "openings": [],
        "zones": [
            {"id": "hero_zone", "label": "Hero zone", "purpose": "hero", "xBias": 0.0, "zBias": -0.2, "widthRatio": 0.28, "depthRatio": 0.22},
            {"id": "support_zone", "label": "Support zone", "purpose": "service", "xBias": -0.3, "zBias": 0.02, "widthRatio": 0.18, "depthRatio": 0.16},
            {"id": "background_zone", "label": "Background zone", "purpose": "background", "xBias": 0.0, "zBias": 0.28, "widthRatio": 0.42, "depthRatio": 0.18},
        ],
        "fixtures": [
            {"id": "hero_plinth", "kind": "display_plinth", "zoneId": "hero_zone", "widthRatio": 0.16, "depthRatio": 0.16, "height": 0.92},
            {"id": "stage_partition", "kind": "partition", "zoneId": "support_zone", "widthRatio": 0.2, "depthRatio": 0.05, "height": 2.1},
        ],
        "niches": [],
        "wallSegments": [],
    },
    "outdoor_illusion": {
        "width": 20.0,
        "depth": 14.0,
        "height": 7.0,
        "openCeiling": True,
        "ceilingStyle": "flat",
        "notes": ["Outdoor illusion shell with sky backdrop and set extension room behind the playable floor."],
        "openings": [],
        "zones": [
            {"id": "hero_zone", "label": "Hero zone", "purpose": "hero", "xBias": 0.0, "zBias": -0.18, "widthRatio": 0.24, "depthRatio": 0.2},
            {"id": "service_lane", "label": "Service lane", "purpose": "service", "xBias": 0.0, "zBias": 0.05, "widthRatio": 0.36, "depthRatio": 0.18},
            {"id": "background_zone", "label": "Background zone", "purpose": "background", "xBias": 0.0, "zBias": 0.36, "widthRatio": 0.52, "depthRatio": 0.24},
        ],
        "fixtures": [
            {"id": "planter_line", "kind": "planter_line", "zoneId": "background_zone", "widthRatio": 0.34, "depthRatio": 0.1, "height": 0.55},
            {"id": "hero_plinth", "kind": "display_plinth", "zoneId": "hero_zone", "widthRatio": 0.16, "depthRatio": 0.16, "height": 0.82},
        ],
        "niches": [],
        "wallSegments": [],
    },
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


def _coerce_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _normalize_depth_zone(value: Any, fallback: str) -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in {"foreground", "midground", "background"}:
        return normalized
    return fallback


def _normalize_supporting_side(value: Any, fallback: str) -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in {"left", "right", "center"}:
        return normalized
    return fallback


def _normalize_wall_target(value: Any, fallback: str) -> str:
    normalized = str(value or fallback).strip()
    if normalized in {"backWall", "leftWall", "rightWall", "rearWall"}:
        return normalized
    return fallback


def _normalize_gobo_id(value: Any, fallback: Optional[str] = None) -> Optional[str]:
    normalized = str(value or fallback or "").strip().lower()
    if normalized in KNOWN_GOBO_IDS:
        return normalized
    return fallback if fallback in KNOWN_GOBO_IDS else None


def _normalize_logo_placement(value: Any, fallback: str = "shirt_chest") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in {"none", "apron_chest", "shirt_chest", "cap_front"}:
        return normalized
    return fallback


def _normalize_wardrobe_style(value: Any, fallback: str = "worker") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in {"baker", "server", "cashier", "worker", "host", "casual", "branded_uniform"}:
        return normalized
    return fallback


def _normalize_lighting_intent(value: Any, fallback: str = "dramatic") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in KNOWN_LIGHTING_INTENTS:
        return normalized
    return fallback if fallback in KNOWN_LIGHTING_INTENTS else "dramatic"


def _normalize_light_modifier(value: Any, fallback: str = "none") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in KNOWN_LIGHT_MODIFIERS:
        return normalized
    return fallback if fallback in KNOWN_LIGHT_MODIFIERS else "none"


def _normalize_brand_application_targets(value: Any) -> List[str]:
    normalized_targets: List[str] = []
    for item in (value or []):
        normalized = str(item or "").strip().lower().replace(" ", "_")
        if normalized in {"environment", "wardrobe", "signage", "packaging", "interior_details"}:
            if normalized not in normalized_targets:
                normalized_targets.append(normalized)
    return normalized_targets[:5]


def _normalize_character_behavior(value: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(value, dict):
        return None

    behavior_type = str(value.get("type") or "stationary").strip().lower()
    if behavior_type not in {"stationary", "work_loop", "patrol", "counter_service", "serve_route", "hero_idle"}:
        behavior_type = "stationary"

    look_at_target = str(value.get("lookAtTarget") or "").strip().lower()
    if look_at_target not in {"camera", "hero_prop", "counter", "oven", "guests"}:
        look_at_target = None

    pace = str(value.get("pace") or "subtle").strip().lower()
    if pace not in {"still", "subtle", "active"}:
        pace = "subtle"

    route_zone_ids = [
        str(item).strip()
        for item in (value.get("routeZoneIds") or [])
        if isinstance(item, str) and str(item).strip()
    ][:6]

    home_zone_id = str(value.get("homeZoneId") or "").strip() or None

    return {
        "type": behavior_type,
        "homeZoneId": home_zone_id,
        "routeZoneIds": route_zone_ids,
        "lookAtTarget": look_at_target,
        "pace": pace,
        "radius": round(_clamp(_coerce_float(value.get("radius"), 0.8), 0.1, 6.0), 3),
    }


def _normalize_room_shell_openings(value: Any) -> List[Dict[str, Any]]:
    normalized_openings: List[Dict[str, Any]] = []
    for item in (value or []):
        if not isinstance(item, dict):
            continue
        wall_target = _normalize_wall_target(item.get("wallTarget"), "backWall")
        kind = str(item.get("kind") or "door").strip().lower()
        if kind not in {"door", "window", "service_window", "archway", "pass_through"}:
            kind = "door"
        x_align = str(item.get("xAlign") or "center").strip().lower()
        if x_align not in {"left", "center", "right"}:
            x_align = "center"
        normalized_openings.append(
            {
                "id": str(item.get("id") or f"{wall_target}_{kind}_{len(normalized_openings) + 1}").strip()[:64],
                "wallTarget": wall_target,
                "kind": kind,
                "widthRatio": round(_clamp(_coerce_float(item.get("widthRatio"), 0.22), 0.08, 0.95), 3),
                "heightRatio": round(_clamp(_coerce_float(item.get("heightRatio"), 0.48), 0.12, 0.95), 3),
                "xAlign": x_align,
                "sillHeight": round(_clamp(_coerce_float(item.get("sillHeight"), 0.0), 0.0, 4.0), 3),
                "notes": [
                    str(note)[:120]
                    for note in (item.get("notes") or [])
                    if isinstance(note, str)
                ][:4],
            }
        )
    return normalized_openings[:8]


def _normalize_room_shell_zones(value: Any) -> List[Dict[str, Any]]:
    normalized_zones: List[Dict[str, Any]] = []
    for item in (value or []):
        if not isinstance(item, dict):
            continue
        purpose = str(item.get("purpose") or "background").strip().lower()
        if purpose not in {"prep", "counter", "service", "dining", "hero", "storage", "queue", "background", "backroom"}:
            purpose = "background"
        zone_id = str(item.get("id") or f"{purpose}_{len(normalized_zones) + 1}").strip()[:64]
        normalized_zones.append(
            {
                "id": zone_id,
                "label": str(item.get("label") or zone_id.replace("_", " ").title())[:120],
                "purpose": purpose,
                "xBias": round(_clamp(_coerce_float(item.get("xBias"), 0.0), -1.0, 1.0), 3),
                "zBias": round(_clamp(_coerce_float(item.get("zBias"), 0.0), -1.0, 1.0), 3),
                "widthRatio": round(_clamp(_coerce_float(item.get("widthRatio"), 0.28), 0.08, 1.0), 3),
                "depthRatio": round(_clamp(_coerce_float(item.get("depthRatio"), 0.28), 0.08, 1.0), 3),
                "notes": [
                    str(note)[:120]
                    for note in (item.get("notes") or [])
                    if isinstance(note, str)
                ][:4],
            }
        )
    return normalized_zones[:10]


def _normalize_room_shell_fixtures(value: Any) -> List[Dict[str, Any]]:
    normalized_fixtures: List[Dict[str, Any]] = []
    for item in (value or []):
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind") or "display_plinth").strip().lower()
        if kind not in {"counter_block", "prep_island", "banquette", "host_stand", "display_plinth", "partition", "planter_line", "pass_shelf"}:
            kind = "display_plinth"
        normalized_fixtures.append(
            {
                "id": str(item.get("id") or f"{kind}_{len(normalized_fixtures) + 1}").strip()[:64],
                "kind": kind,
                "zoneId": str(item.get("zoneId") or "").strip() or None,
                "wallTarget": _normalize_wall_target(item.get("wallTarget"), "backWall") if item.get("wallTarget") else None,
                "xBias": round(_clamp(_coerce_float(item.get("xBias"), 0.0), -1.0, 1.0), 3),
                "zBias": round(_clamp(_coerce_float(item.get("zBias"), 0.0), -1.0, 1.0), 3),
                "widthRatio": round(_clamp(_coerce_float(item.get("widthRatio"), 0.22), 0.08, 1.0), 3),
                "depthRatio": round(_clamp(_coerce_float(item.get("depthRatio"), 0.14), 0.08, 1.0), 3),
                "height": round(_clamp(_coerce_float(item.get("height"), 0.95), 0.2, 4.5), 3),
                "notes": [
                    str(note)[:120]
                    for note in (item.get("notes") or [])
                    if isinstance(note, str)
                ][:4],
            }
        )
    return normalized_fixtures[:12]


def _normalize_room_shell_niches(value: Any) -> List[Dict[str, Any]]:
    normalized_niches: List[Dict[str, Any]] = []
    for item in (value or []):
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind") or "display").strip().lower()
        if kind not in {"alcove", "display", "shelf"}:
            kind = "display"
        x_align = str(item.get("xAlign") or "center").strip().lower()
        if x_align not in {"left", "center", "right"}:
            x_align = "center"
        normalized_niches.append(
            {
                "id": str(item.get("id") or f"{kind}_niche_{len(normalized_niches) + 1}").strip()[:64],
                "wallTarget": _normalize_wall_target(item.get("wallTarget"), "backWall"),
                "kind": kind,
                "widthRatio": round(_clamp(_coerce_float(item.get("widthRatio"), 0.22), 0.08, 0.9), 3),
                "heightRatio": round(_clamp(_coerce_float(item.get("heightRatio"), 0.32), 0.12, 0.8), 3),
                "xAlign": x_align,
                "sillHeight": round(_clamp(_coerce_float(item.get("sillHeight"), 0.4), 0.0, 4.0), 3),
                "depth": round(_clamp(_coerce_float(item.get("depth"), 0.24), 0.08, 1.2), 3),
                "notes": [
                    str(note)[:120]
                    for note in (item.get("notes") or [])
                    if isinstance(note, str)
                ][:4],
            }
        )
    return normalized_niches[:10]


def _normalize_room_shell_ceiling_style(value: Any, fallback: str = "flat") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in {"flat", "coffered", "exposed_beams", "open_truss", "canopy"}:
        return normalized
    return fallback


def _normalize_room_shell_wall_segments(value: Any) -> List[Dict[str, Any]]:
    normalized_segments: List[Dict[str, Any]] = []
    for item in (value or []):
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind") or "panel").strip().lower()
        if kind not in {"panel", "pilaster", "bay"}:
            kind = "panel"
        x_align = str(item.get("xAlign") or "center").strip().lower()
        if x_align not in {"left", "center", "right"}:
            x_align = "center"
        normalized_segments.append(
            {
                "id": str(item.get("id") or f"{kind}_segment_{len(normalized_segments) + 1}").strip()[:64],
                "wallTarget": _normalize_wall_target(item.get("wallTarget"), "backWall"),
                "kind": kind,
                "widthRatio": round(_clamp(_coerce_float(item.get("widthRatio"), 0.2), 0.08, 0.9), 3),
                "heightRatio": round(_clamp(_coerce_float(item.get("heightRatio"), 0.42), 0.12, 0.9), 3),
                "xAlign": x_align,
                "sillHeight": round(_clamp(_coerce_float(item.get("sillHeight"), 0.18), 0.0, 4.0), 3),
                "depth": round(_clamp(_coerce_float(item.get("depth"), 0.12), 0.03, 0.8), 3),
                "notes": [
                    str(note)[:120]
                    for note in (item.get("notes") or [])
                    if isinstance(note, str)
                ][:4],
            }
        )
    return normalized_segments[:12]


def _normalize_room_shell_type(value: Any, fallback: str = "studio_shell") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in ROOM_SHELL_DEFAULTS:
        return normalized
    return fallback


def build_room_shell_spec(
    shell_input: Optional[Dict[str, Any]] = None,
    *,
    prompt: str = "",
    layout_hints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    requested_shell = dict(shell_input or {})
    lowered_prompt = prompt.lower()
    layout_room_type = None
    if isinstance(layout_hints, dict):
        layout_room_type = _normalize_room_shell_type(layout_hints.get("roomType"), "studio_shell")

    inferred_type = "studio_shell"
    if layout_room_type and layout_room_type != "studio_shell":
        inferred_type = layout_room_type
    elif any(token in lowered_prompt for token in ["storefront", "retail", "counter service", "takeaway"]):
        inferred_type = "storefront"
    elif any(token in lowered_prompt for token in ["warehouse", "industrial", "factory", "garage"]):
        inferred_type = "warehouse"
    elif any(token in lowered_prompt for token in ["outdoor", "street", "beach", "forest", "mountain", "rooftop"]):
        inferred_type = "outdoor_illusion"
    elif any(token in lowered_prompt for token in ["editorial", "fashion", "beauty", "stage", "runway"]):
        inferred_type = "abstract_stage"
    elif any(token in lowered_prompt for token in ["office", "showroom", "meeting room", "restaurant", "interior"]):
        inferred_type = "interior_room"

    shell_type = _normalize_room_shell_type(requested_shell.get("type"), inferred_type)
    defaults = ROOM_SHELL_DEFAULTS.get(shell_type, ROOM_SHELL_DEFAULTS["studio_shell"])

    width = round(_clamp(_coerce_float(requested_shell.get("width"), defaults["width"]), 4.0, 60.0), 3)
    depth = round(_clamp(_coerce_float(requested_shell.get("depth"), defaults["depth"]), 4.0, 60.0), 3)
    height = round(_clamp(_coerce_float(requested_shell.get("height"), defaults["height"]), 2.5, 20.0), 3)
    open_ceiling = bool(requested_shell.get("openCeiling")) if "openCeiling" in requested_shell else bool(defaults["openCeiling"])
    ceiling_style = _normalize_room_shell_ceiling_style(
        requested_shell.get("ceilingStyle"),
        str(defaults.get("ceilingStyle") or "flat"),
    )

    notes = [
        str(note)[:140]
        for note in (requested_shell.get("notes") or defaults.get("notes") or [])
        if isinstance(note, str) and str(note).strip()
    ][:6]
    if layout_room_type and layout_room_type != "studio_shell" and f"Layout provider suggested {layout_room_type}." not in notes:
        notes.append(f"Layout provider suggested {layout_room_type}.")

    detected_openings = []
    if isinstance(layout_hints, dict):
        detected_openings = _normalize_room_shell_openings(layout_hints.get("detectedOpenings") or [])
        detected_anchor_count = len(layout_hints.get("objectAnchors") or []) if isinstance(layout_hints.get("objectAnchors"), list) else 0
        if detected_openings and "Layout provider detected architectural openings from the reference image." not in notes:
            notes.append("Layout provider detected architectural openings from the reference image.")
        if detected_anchor_count and "Layout provider detected prop and fixture anchors from the reference image." not in notes:
            notes.append("Layout provider detected prop and fixture anchors from the reference image.")

    requested_openings = requested_shell.get("openings")
    if isinstance(requested_openings, list) and requested_openings:
        openings = _normalize_room_shell_openings(requested_openings)
    elif detected_openings:
        openings = detected_openings
    else:
        openings = _normalize_room_shell_openings(defaults.get("openings") or [])

    zones = _normalize_room_shell_zones(requested_shell.get("zones") or defaults.get("zones") or [])
    fixtures = _normalize_room_shell_fixtures(requested_shell.get("fixtures") or defaults.get("fixtures") or [])
    niches = _normalize_room_shell_niches(requested_shell.get("niches") or defaults.get("niches") or [])
    wall_segments = _normalize_room_shell_wall_segments(requested_shell.get("wallSegments") or defaults.get("wallSegments") or [])

    return {
        "type": shell_type,
        "width": width,
        "depth": depth,
        "height": height,
        "openCeiling": open_ceiling,
        "ceilingStyle": ceiling_style,
        "notes": notes,
        "openings": openings,
        "zones": zones,
        "fixtures": fixtures,
        "niches": niches,
        "wallSegments": wall_segments,
    }


def _normalize_character_appearance(value: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(value, dict):
        return None

    hair_style = str(value.get("hairStyle") or "").strip().lower()
    if hair_style not in {"short", "medium", "long", "bun", "covered"}:
        hair_style = "short"

    facial_hair = str(value.get("facialHair") or "").strip().lower()
    if facial_hair not in {"none", "stubble", "mustache", "beard"}:
        facial_hair = "none"

    age_group = str(value.get("ageGroup") or "").strip().lower()
    if age_group not in {"teen", "young_adult", "adult", "senior"}:
        age_group = "adult"

    gender_presentation = str(value.get("genderPresentation") or "").strip().lower()
    if gender_presentation not in {"male", "female", "neutral"}:
        gender_presentation = "neutral"

    skin_tone = value.get("skinTone")
    hair_color = value.get("hairColor")

    return {
        "skinTone": (
            _normalize_hex(skin_tone, "#d9b08c")
            if isinstance(skin_tone, str) and str(skin_tone).strip()
            else None
        ),
        "hairColor": (
            _normalize_hex(hair_color, "#3b2f2f")
            if isinstance(hair_color, str) and str(hair_color).strip()
            else None
        ),
        "hairStyle": hair_style,
        "facialHair": facial_hair,
        "ageGroup": age_group,
        "genderPresentation": gender_presentation,
    }


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

    def _extract_palette_from_data_url(self, value: Optional[str], limit: int = 5) -> List[str]:
        inline = self._data_url_to_inline_data(value or "")
        if not inline:
            return []

        try:
            from PIL import Image
        except Exception:
            return []

        try:
            image_bytes = base64.b64decode(inline["data"])
            image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            image.thumbnail((128, 128))

            alpha = image.getchannel("A")
            opaque = Image.new("RGBA", image.size, (255, 255, 255, 255))
            opaque.paste(image, mask=alpha)
            quantized = opaque.convert("RGB").quantize(colors=max(3, min(limit, 8)), method=Image.MEDIANCUT)
            palette = quantized.getpalette() or []
            color_counts = quantized.getcolors() or []
            if not palette or not color_counts:
                return []

            normalized: List[str] = []
            for _, color_index in sorted(color_counts, reverse=True):
                base_index = color_index * 3
                if base_index + 2 >= len(palette):
                    continue
                r, g, b = palette[base_index:base_index + 3]
                hex_color = f"#{r:02x}{g:02x}{b:02x}"
                if hex_color not in normalized:
                    normalized.append(hex_color)
                if len(normalized) >= limit:
                    break
            return normalized
        except Exception:
            return []

    def _build_branding_reference(self, brand_reference: Optional[Dict[str, Any]], prompt: str) -> Dict[str, Any]:
        reference = dict(brand_reference or {})
        explicit_palette = [
            _normalize_hex(color, "#ffffff")
            for color in (reference.get("palette") or [])
            if isinstance(color, str)
        ]
        inferred_palette = self._extract_palette_from_data_url(reference.get("logoImage"), limit=5)
        palette = [color for color in explicit_palette if color] or inferred_palette

        brand_name = str(reference.get("brandName") or "").strip() or None
        profile_name = str(reference.get("profileName") or "").strip() or None
        usage_notes = str(reference.get("usageNotes") or "").strip() or None
        application_targets = _normalize_brand_application_targets(reference.get("applicationTargets"))
        uniform_policy = str(reference.get("uniformPolicy") or "").strip() or None
        signage_style = str(reference.get("signageStyle") or "").strip() or None
        packaging_style = str(reference.get("packagingStyle") or "").strip() or None
        interior_style = str(reference.get("interiorStyle") or "").strip() or None
        direction_id = str(reference.get("directionId") or "").strip() or None
        branding_targets_note = "Apply the brand across signage, wardrobe, packaging and interior accent details."
        style_note_parts = [
            f"Direction: {direction_id}." if direction_id else None,
            f"Signage style: {signage_style}." if signage_style else None,
            f"Packaging style: {packaging_style}." if packaging_style else None,
            f"Interior style: {interior_style}." if interior_style else None,
            f"Uniform policy: {uniform_policy}." if uniform_policy else None,
        ]
        style_note = " ".join(part for part in style_note_parts if part)
        if usage_notes:
            usage_notes = f"{usage_notes} {style_note} {branding_targets_note}".strip()
        elif brand_name or palette or reference.get("logoImage"):
            usage_notes = f"{style_note} {branding_targets_note}".strip()
        signage_text = brand_name or (prompt.strip()[:48] if prompt.strip() else None)

        return {
            "brandName": brand_name,
            "profileName": profile_name,
            "usageNotes": usage_notes,
            "logoImage": reference.get("logoImage") if isinstance(reference.get("logoImage"), str) else None,
            "palette": palette[:5],
            "signageText": signage_text,
            "applicationTargets": application_targets,
            "uniformPolicy": uniform_policy,
            "signageStyle": signage_style,
            "packagingStyle": packaging_style,
            "interiorStyle": interior_style,
            "directionId": direction_id,
            "hasBranding": bool(brand_name or usage_notes or palette or reference.get("logoImage")),
        }

    def _infer_character_archetype(self, role: str, name: Optional[str] = None) -> str:
        text = " ".join(part for part in [role, name or ""] if part).lower()
        if any(token in text for token in ["baker", "chef", "pizza", "cook", "kitchen"]):
            return "worker_baker"
        if any(token in text for token in ["cashier", "register", "counter"]):
            return "worker_cashier"
        if any(token in text for token in ["server", "waiter", "waitress", "service"]):
            return "worker_server"
        if any(token in text for token in ["host", "greeter", "welcome"]):
            return "worker_host"
        if any(token in text for token in ["barista", "coffee", "cafe"]):
            return "worker_barista"
        if any(token in text for token in ["customer", "guest", "client"]):
            return "customer_man" if any(token in text for token in ["man", "male", "mann"]) else "customer_woman"
        if any(token in text for token in ["woman", "female", "kvinne"]):
            return "talent_woman"
        if any(token in text for token in ["man", "male", "mann"]):
            return "talent_man"
        return "worker_generic"

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
        brand_reference: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        prompt = (prompt or "").strip()
        reference_images = reference_images or []
        room_constraints = room_constraints or {}
        world_model_provider = self._normalize_world_model_provider(world_model_provider)
        world_model_reference = world_model_reference or {}
        brand_reference = self._build_branding_reference(brand_reference, prompt)

        fallback_plan = self._build_fallback_plan(
            prompt,
            reference_images,
            room_constraints,
            preferred_preset_id,
            world_model_provider,
            world_model_reference,
            brand_reference,
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
                brand_reference,
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
                brand_reference,
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
        brand_reference: Dict[str, Any],
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
                    brand_reference,
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
        brand_reference: Dict[str, Any],
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
                "ceilingStyle": "flat|coffered|exposed_beams|open_truss|canopy",
                "notes": ["optional notes"],
                "openings": [
                    {
                        "id": "rear_entry",
                        "wallTarget": "backWall|leftWall|rightWall|rearWall",
                        "kind": "door|window|service_window|archway|pass_through",
                        "widthRatio": 0.3,
                        "heightRatio": 0.7,
                        "xAlign": "left|center|right",
                        "sillHeight": 0.0,
                        "notes": ["optional opening notes"],
                    }
                ],
                "zones": [
                    {
                        "id": "hero_zone",
                        "label": "Hero zone",
                        "purpose": "prep|counter|service|dining|hero|storage|queue|background",
                        "xBias": 0.0,
                        "zBias": -0.2,
                        "widthRatio": 0.28,
                        "depthRatio": 0.24,
                        "notes": ["optional zone notes"],
                    }
                ],
                "fixtures": [
                    {
                        "id": "front_counter_block",
                        "kind": "counter_block|prep_island|banquette|host_stand|display_plinth|partition|planter_line|pass_shelf",
                        "zoneId": "front_counter",
                        "wallTarget": "optional backWall|leftWall|rightWall|rearWall",
                        "xBias": 0.0,
                        "zBias": 0.0,
                        "widthRatio": 0.28,
                        "depthRatio": 0.14,
                        "height": 1.0,
                        "notes": ["optional fixture notes"],
                    }
                ],
                "niches": [
                    {
                        "id": "menu_display_niche",
                        "wallTarget": "backWall|leftWall|rightWall|rearWall",
                        "kind": "alcove|display|shelf",
                        "widthRatio": 0.18,
                        "heightRatio": 0.32,
                        "xAlign": "left|center|right",
                        "sillHeight": 0.8,
                        "depth": 0.24,
                        "notes": ["optional niche notes"],
                    }
                ],
                "wallSegments": [
                    {
                        "id": "back_panel_segment",
                        "wallTarget": "backWall|leftWall|rightWall|rearWall",
                        "kind": "panel|pilaster|bay",
                        "widthRatio": 0.22,
                        "heightRatio": 0.48,
                        "xAlign": "left|center|right",
                        "sillHeight": 0.18,
                        "depth": 0.12,
                        "notes": ["optional wall segment notes"],
                    }
                ],
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
            "characters": [
                {
                    "name": "display name",
                    "role": "baker|cashier|server|host|worker|customer|talent",
                    "archetypeId": "worker_baker|worker_cashier|worker_server|worker_host|worker_generic|worker_barista|talent_woman|talent_man|customer_woman|customer_man",
                    "description": "brief detail",
                    "priority": "high|medium|low",
                    "placementHint": "brief placement hint",
                    "actionHint": "what the person is doing",
                    "wardrobeStyle": "baker|server|cashier|worker|host|casual|branded_uniform",
                    "wardrobeVariantId": "optional wardrobe variant id",
                    "wardrobeNotes": ["optional wardrobe notes"],
                    "outfitColors": ["#ffffff", "#111111"],
                    "logoPlacement": "none|apron_chest|shirt_chest|cap_front",
                    "appearance": {
                        "skinTone": "#d9b08c",
                        "hairColor": "#3b2f2f",
                        "hairStyle": "short|medium|long|bun|covered",
                        "facialHair": "none|stubble|mustache|beard",
                        "ageGroup": "teen|young_adult|adult|senior",
                        "genderPresentation": "male|female|neutral",
                    },
                    "behaviorPlan": {
                        "type": "stationary|work_loop|patrol|counter_service|serve_route|hero_idle",
                        "homeZoneId": "optional zone id",
                        "routeZoneIds": ["optional zone ids"],
                        "lookAtTarget": "camera|hero_prop|counter|oven|guests",
                        "pace": "still|subtle|active",
                        "radius": 0.8,
                    },
                }
            ],
            "branding": {
                "enabled": True,
                "brandName": "optional brand name",
                "profileName": "optional look/profile name",
                "palette": ["#c0392b", "#f4e7d3", "#2f6b45"],
                "signageText": "optional signage text",
                "applyToEnvironment": True,
                "applyToWardrobe": True,
                "applyToSignage": True,
                "applicationTargets": ["environment", "wardrobe", "signage", "packaging", "interior_details"],
                "uniformPolicy": "match_palette|hero_staff_only|front_of_house_emphasis|kitchen_emphasis",
                "signageStyle": "painted_wall|neon|menu_board|window_decal",
                "packagingStyle": "box_stamp|sticker|printed_wrap",
                "interiorStyle": "accent_trim|full_palette|materials_only",
                "notes": ["short branding instructions"],
            },
            "lighting": [
                {
                    "role": "key|fill|rim|practical|accent",
                    "position": [0, 3, -2],
                    "intensity": 0.7,
                    "color": "#ffffff",
                    "cct": 5600,
                    "purpose": "short purpose",
                    "gobo": {
                        "goboId": "window|blinds|leaves|breakup|dots|lines",
                        "size": 1.0,
                        "rotation": 0,
                        "intensity": 0.8,
                        "rationale": "optional short reason for using this gobo",
                    },
                    "behavior": {
                        "type": "none|pulse|flicker|orbit|pan_sweep",
                        "speed": 1.0,
                        "amplitude": 0.2,
                        "radius": 0.5,
                    },
                }
            ],
            "camera": {
                "shotType": "wide|medium|close-up",
                "mood": "short mood",
                "target": [0, 1.4, 0],
                "positionHint": [0, 1.8, -6],
                "fov": 0.65,
            },
            "layoutGuidance": {
                "provider": "none|heuristics|sam2_depth",
                "summary": "optional short summary of image/layout guidance",
                "visiblePlanes": ["floor|leftWall|rightWall|backWall|rearWall"],
                "depthProfile": {
                    "quality": "shallow|medium|deep",
                    "cameraElevation": "low|eye|high",
                    "horizonLine": 0.55,
                },
                "suggestedZones": {
                    "hero": {
                        "xBias": 0.0,
                        "depthZone": "foreground|midground|background",
                    },
                    "supporting": {
                        "side": "left|right|center",
                        "depthZone": "foreground|midground|background",
                    },
                    "background": {
                        "wallTarget": "backWall|leftWall|rightWall|rearWall",
                        "depthZone": "foreground|midground|background",
                    },
                },
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
            "brandReference": brand_reference,
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
            "Characters must be visible scene elements, not abstract placeholders or invisible capsules.\n"
            "If the prompt implies staff or talent, include them in characters with clear role, action, wardrobe and placement.\n"
            "When characters are included, provide appearance guidance like skin tone, hair color/style and facial hair when it helps casting variety or brand fit.\n"
            "For restaurant or pizza prompts, include at least one baker and at least one front-of-house worker unless the prompt explicitly says otherwise.\n"
            "If brandReference is present, propagate the palette and logo intent into signage, wardrobe and environment recommendations.\n"
            "It is acceptable to anchor the plan on an existing preset/template when that improves speed or reliability.\n"
            "When preferredPresetId is present, treat that preset as the baseline look and preserve its palette/material identity unless the user's prompt clearly asks for a departure.\n"
            "If the prompt suggests a real room from an uploaded image, describe the room faithfully but add compatibility gaps for missing image-to-layout reconstruction.\n"
            "If the prompt suggests outdoor or complex architecture, mark it as an illusion if it must be faked in the current shell.\n"
            "When roomConstraints.layoutHints is present, treat it as observed image-derived geometry and framing guidance. Use it to inform room shell, visible planes and camera defaults.\n"
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
        brand_reference: Dict[str, Any],
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
            "ceilingStyle": _normalize_room_shell_ceiling_style(
                room_shell.get("ceilingStyle"),
                fallback_room_shell.get("ceilingStyle", "flat"),
            ),
            "notes": room_shell.get("notes") or fallback_room_shell.get("notes", []),
            "openings": _normalize_room_shell_openings(
                room_shell.get("openings")
                or fallback_room_shell.get("openings")
                or []
            ),
            "zones": _normalize_room_shell_zones(
                room_shell.get("zones")
                or fallback_room_shell.get("zones")
                or []
            ),
            "fixtures": _normalize_room_shell_fixtures(
                room_shell.get("fixtures")
                or fallback_room_shell.get("fixtures")
                or []
            ),
            "niches": _normalize_room_shell_niches(
                room_shell.get("niches")
                or fallback_room_shell.get("niches")
                or []
            ),
            "wallSegments": _normalize_room_shell_wall_segments(
                room_shell.get("wallSegments")
                or fallback_room_shell.get("wallSegments")
                or []
            ),
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

        fallback_characters = fallback_plan.get("characters") if isinstance(fallback_plan.get("characters"), list) else []
        normalized_characters: List[Dict[str, Any]] = []
        for character in (plan.get("characters") or []):
            if not isinstance(character, dict):
                continue
            role = str(character.get("role") or "worker")[:40]
            normalized_characters.append(
                {
                    "name": str(character.get("name") or role.title())[:120],
                    "role": role,
                    "archetypeId": (
                        str(character.get("archetypeId")).strip()
                        if str(character.get("archetypeId") or "").strip() in KNOWN_CHARACTER_ARCHETYPES
                        else self._infer_character_archetype(role, str(character.get("name") or ""))
                    ),
                    "description": (
                        str(character.get("description"))[:240]
                        if character.get("description")
                        else None
                    ),
                    "priority": str(character.get("priority") or "medium")[:16],
                    "placementHint": (
                        str(character.get("placementHint"))[:180]
                        if character.get("placementHint")
                        else None
                    ),
                    "actionHint": (
                        str(character.get("actionHint"))[:140]
                        if character.get("actionHint")
                        else None
                    ),
                    "wardrobeStyle": _normalize_wardrobe_style(character.get("wardrobeStyle"), "worker"),
                    "wardrobeVariantId": (
                        str(character.get("wardrobeVariantId"))[:64]
                        if character.get("wardrobeVariantId")
                        else None
                    ),
                    "wardrobeNotes": [
                        str(item)[:120]
                        for item in (character.get("wardrobeNotes") or [])
                        if isinstance(item, str)
                    ][:4],
                    "outfitColors": [
                        _normalize_hex(color, "#ffffff")
                        for color in (character.get("outfitColors") or [])
                        if isinstance(color, str)
                    ][:3],
                    "logoPlacement": _normalize_logo_placement(character.get("logoPlacement"), "shirt_chest"),
                    "appearance": _normalize_character_appearance(character.get("appearance")),
                    "behaviorPlan": _normalize_character_behavior(character.get("behaviorPlan")),
                }
            )

        plan["characters"] = (normalized_characters or fallback_characters)[:5]

        fallback_branding = fallback_plan.get("branding") if isinstance(fallback_plan.get("branding"), dict) else {}
        plan_branding = plan.get("branding") if isinstance(plan.get("branding"), dict) else {}
        merged_brand_palette = [
            _normalize_hex(color, "#ffffff")
            for color in (
                plan_branding.get("palette")
                or brand_reference.get("palette")
                or fallback_branding.get("palette")
                or []
            )
            if isinstance(color, str)
        ][:5]
        logo_image = (
            plan_branding.get("logoImage")
            if isinstance(plan_branding.get("logoImage"), str)
            else brand_reference.get("logoImage")
            if isinstance(brand_reference.get("logoImage"), str)
            else fallback_branding.get("logoImage")
            if isinstance(fallback_branding.get("logoImage"), str)
            else None
        )
        plan["branding"] = {
            "enabled": bool(
                plan_branding.get("enabled")
                if plan_branding.get("enabled") is not None
                else fallback_branding.get("enabled")
            ),
            "brandName": (
                str(plan_branding.get("brandName") or brand_reference.get("brandName") or fallback_branding.get("brandName"))[:120]
                if plan_branding.get("brandName") or brand_reference.get("brandName") or fallback_branding.get("brandName")
                else None
            ),
            "profileName": (
                str(plan_branding.get("profileName") or brand_reference.get("profileName") or fallback_branding.get("profileName") or "")[:120]
                if plan_branding.get("profileName") or brand_reference.get("profileName") or fallback_branding.get("profileName")
                else None
            ),
            "palette": merged_brand_palette,
            "signageText": (
                str(plan_branding.get("signageText") or brand_reference.get("signageText") or fallback_branding.get("signageText"))[:120]
                if plan_branding.get("signageText") or brand_reference.get("signageText") or fallback_branding.get("signageText")
                else None
            ),
            "logoImage": logo_image,
            "applyToEnvironment": bool(plan_branding.get("applyToEnvironment", fallback_branding.get("applyToEnvironment", False))),
            "applyToWardrobe": bool(plan_branding.get("applyToWardrobe", fallback_branding.get("applyToWardrobe", True))),
            "applyToSignage": bool(plan_branding.get("applyToSignage", fallback_branding.get("applyToSignage", True))),
            "applicationTargets": (
                _normalize_brand_application_targets(plan_branding.get("applicationTargets"))
                or _normalize_brand_application_targets(brand_reference.get("applicationTargets"))
                or _normalize_brand_application_targets(fallback_branding.get("applicationTargets"))
                or ["environment", "wardrobe", "signage"]
            ),
            "uniformPolicy": str(plan_branding.get("uniformPolicy") or brand_reference.get("uniformPolicy") or fallback_branding.get("uniformPolicy") or "match_palette")[:40],
            "signageStyle": str(plan_branding.get("signageStyle") or brand_reference.get("signageStyle") or fallback_branding.get("signageStyle") or "menu_board")[:40],
            "packagingStyle": str(plan_branding.get("packagingStyle") or brand_reference.get("packagingStyle") or fallback_branding.get("packagingStyle") or "box_stamp")[:40],
            "interiorStyle": str(plan_branding.get("interiorStyle") or brand_reference.get("interiorStyle") or fallback_branding.get("interiorStyle") or "accent_trim")[:40],
            "notes": [
                str(item)[:180]
                for item in (plan_branding.get("notes") or fallback_branding.get("notes") or [])
                if isinstance(item, str)
            ][:6],
        }

        normalized_lighting: List[Dict[str, Any]] = []
        fallback_lighting = fallback_plan.get("lighting") if isinstance(fallback_plan.get("lighting"), list) else []
        for index, light in enumerate(plan.get("lighting") or []):
            if not isinstance(light, dict):
                continue

            fallback_light = fallback_lighting[index] if index < len(fallback_lighting) and isinstance(fallback_lighting[index], dict) else {}
            inferred_recipe = self._infer_light_recipe(
                prompt,
                str(light.get("role", fallback_light.get("role", "key"))),
                str(light.get("purpose") or fallback_light.get("purpose") or ""),
                plan.get("concept"),
                plan.get("summary"),
            )
            normalized_light = {
                "role": str(light.get("role", "key"))[:40],
                "position": self._normalize_vec3(light.get("position"), [0, 3, -2]),
                "intensity": float(_clamp(float(light.get("intensity", 0.6)), 0.05, 3.0)),
                "color": _normalize_hex(light.get("color"), "#ffffff") if light.get("color") else None,
                "cct": int(light.get("cct", 5600)) if light.get("cct") is not None else None,
                "purpose": light.get("purpose"),
                "intent": _normalize_lighting_intent(
                    light.get("intent"),
                    str(inferred_recipe.get("intent") or fallback_light.get("intent") or "dramatic"),
                ),
                "modifier": _normalize_light_modifier(
                    light.get("modifier"),
                    str(inferred_recipe.get("modifier") or fallback_light.get("modifier") or "none"),
                ),
                "beamAngle": round(
                    _clamp(
                        _coerce_float(
                            light.get("beamAngle"),
                            inferred_recipe.get("beamAngle") if isinstance(inferred_recipe, dict) else fallback_light.get("beamAngle", 36.0),
                        ),
                        12.0,
                        120.0,
                    ),
                    2,
                ),
                "rationale": (
                    str(light.get("rationale") or inferred_recipe.get("rationale") or fallback_light.get("rationale") or "")[:220]
                    if light.get("rationale") or inferred_recipe.get("rationale") or fallback_light.get("rationale")
                    else None
                ),
                "behavior": (
                    {
                        "type": str((light.get("behavior") or {}).get("type", "none"))[:24],
                        "speed": float(_clamp(float((light.get("behavior") or {}).get("speed", 1.0)), 0.05, 8.0)),
                        "amplitude": float(_clamp(float((light.get("behavior") or {}).get("amplitude", 0.2)), 0.0, 2.0)),
                        "radius": float(_clamp(float((light.get("behavior") or {}).get("radius", 0.5)), 0.0, 6.0)),
                    }
                    if isinstance(light.get("behavior"), dict)
                    else None
                ),
            }
            haze_value = light.get("haze") if isinstance(light.get("haze"), dict) else fallback_light.get("haze") if isinstance(fallback_light.get("haze"), dict) else inferred_recipe.get("haze") if isinstance(inferred_recipe.get("haze"), dict) else None
            if isinstance(haze_value, dict):
                normalized_light["haze"] = {
                    "enabled": bool(haze_value.get("enabled")),
                    "density": round(_clamp(_coerce_float(haze_value.get("density"), 0.014), 0.004, 0.06), 3),
                    "rationale": (
                        str(haze_value.get("rationale") or "")[:180]
                        if haze_value.get("rationale")
                        else None
                    ),
                }
            normalized_gobo = self._normalize_light_gobo(
                light.get("gobo"),
                light.get("gobo") or fallback_light.get("gobo") or inferred_recipe.get("gobo"),
                prompt=prompt,
                role=normalized_light["role"],
                purpose=normalized_light["purpose"],
                concept=plan.get("concept"),
                summary=plan.get("summary"),
            )
            if normalized_gobo:
                normalized_light["gobo"] = normalized_gobo
            normalized_lighting.append(normalized_light)

        plan["lighting"] = normalized_lighting[:6]
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

        fallback_layout_guidance = fallback_plan.get("layoutGuidance")
        plan_layout_guidance = plan.get("layoutGuidance") if isinstance(plan.get("layoutGuidance"), dict) else {}
        if isinstance(fallback_layout_guidance, dict) or plan_layout_guidance:
            fallback_layout_guidance = fallback_layout_guidance or {}
            fallback_zones = fallback_layout_guidance.get("suggestedZones") if isinstance(fallback_layout_guidance.get("suggestedZones"), dict) else {}
            fallback_depth_profile = fallback_layout_guidance.get("depthProfile") if isinstance(fallback_layout_guidance.get("depthProfile"), dict) else {}
            plan_zones = plan_layout_guidance.get("suggestedZones") if isinstance(plan_layout_guidance.get("suggestedZones"), dict) else {}
            plan_depth_profile = plan_layout_guidance.get("depthProfile") if isinstance(plan_layout_guidance.get("depthProfile"), dict) else {}
            hero_zone = plan_zones.get("hero") if isinstance(plan_zones.get("hero"), dict) else {}
            supporting_zone = plan_zones.get("supporting") if isinstance(plan_zones.get("supporting"), dict) else {}
            background_zone = plan_zones.get("background") if isinstance(plan_zones.get("background"), dict) else {}
            fallback_hero_zone = fallback_zones.get("hero") if isinstance(fallback_zones.get("hero"), dict) else {}
            fallback_supporting_zone = fallback_zones.get("supporting") if isinstance(fallback_zones.get("supporting"), dict) else {}
            fallback_background_zone = fallback_zones.get("background") if isinstance(fallback_zones.get("background"), dict) else {}
            visible_planes = plan_layout_guidance.get("visiblePlanes")
            if not isinstance(visible_planes, list):
                visible_planes = fallback_layout_guidance.get("visiblePlanes") if isinstance(fallback_layout_guidance.get("visiblePlanes"), list) else []

            normalized_planes: List[str] = []
            for plane in visible_planes:
                plane_value = str(plane).strip()
                if plane_value in {"floor", "leftWall", "rightWall", "backWall", "rearWall"} and plane_value not in normalized_planes:
                    normalized_planes.append(plane_value)

            plan["layoutGuidance"] = {
                "provider": str(plan_layout_guidance.get("provider") or fallback_layout_guidance.get("provider") or "none")[:32],
                "summary": (
                    str(plan_layout_guidance.get("summary") or fallback_layout_guidance.get("summary"))[:280]
                    if plan_layout_guidance.get("summary") or fallback_layout_guidance.get("summary")
                    else None
                ),
                "visiblePlanes": normalized_planes,
                "depthProfile": {
                    "quality": str(plan_depth_profile.get("quality") or fallback_depth_profile.get("quality") or "medium")[:24],
                    "cameraElevation": str(plan_depth_profile.get("cameraElevation") or fallback_depth_profile.get("cameraElevation") or "eye")[:24],
                    "horizonLine": round(
                        _coerce_float(
                            plan_depth_profile.get("horizonLine", fallback_depth_profile.get("horizonLine")),
                            0.55,
                        ),
                        4,
                    ),
                },
                "suggestedZones": {
                    "hero": {
                        "xBias": round(
                            _clamp(
                                _coerce_float(hero_zone.get("xBias", fallback_hero_zone.get("xBias")), 0.0),
                                -1.0,
                                1.0,
                            ),
                            3,
                        ),
                        "depthZone": _normalize_depth_zone(hero_zone.get("depthZone"), fallback_hero_zone.get("depthZone", "midground")),
                    },
                    "supporting": {
                        "side": _normalize_supporting_side(supporting_zone.get("side"), fallback_supporting_zone.get("side", "center")),
                        "depthZone": _normalize_depth_zone(supporting_zone.get("depthZone"), fallback_supporting_zone.get("depthZone", "midground")),
                    },
                    "background": {
                        "wallTarget": _normalize_wall_target(background_zone.get("wallTarget"), fallback_background_zone.get("wallTarget", "backWall")),
                        "depthZone": _normalize_depth_zone(background_zone.get("depthZone"), fallback_background_zone.get("depthZone", "background")),
                    },
                },
            }
        else:
            plan["layoutGuidance"] = None

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

    def _infer_gobo_for_light(
        self,
        prompt: str,
        role: str,
        purpose: Optional[str],
        concept: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        text = " ".join(
            part for part in [prompt, role, purpose or "", concept or "", summary or ""] if part
        ).lower()
        role_text = str(role or "").lower()

        clean_portrait_tokens = [
            "rembrandt",
            "loop lighting",
            "loop portrait",
            "butterfly",
            "paramount",
            "clamshell",
            "three-point",
            "three point",
            "headshot",
            "clean portrait",
        ]
        textured_gobo_tokens = [
            "leaves",
            "forest",
            "garden",
            "organic",
            "blinds",
            "venetian",
            "noir",
            "detective",
            "window",
            "sunbeam",
            "sunlight",
            "cyberpunk",
            "neon",
            "scan",
            "signage",
            "ritual",
            "horror",
            "occult",
            "warehouse",
        ]

        if (
            any(token in text for token in clean_portrait_tokens)
            and not any(token in text for token in textured_gobo_tokens)
        ):
            return None

        if "leaves" in text or "forest" in text or "garden" in text or "organic" in text:
            return {
                "goboId": "leaves",
                "size": 1.5,
                "rotation": 0,
                "intensity": 0.82,
                "rationale": "Organic leaf breakup to add natural texture.",
            }
        if "blinds" in text or "venetian" in text or "noir" in text or "detective" in text:
            return {
                "goboId": "blinds",
                "size": 1.2,
                "rotation": 0,
                "intensity": 0.9,
                "rationale": "Venetian blind pattern for cinematic noir contrast.",
            }
        if "window" in text or "sunbeam" in text or "sunlight" in text:
            return {
                "goboId": "window",
                "size": 1.1,
                "rotation": 0,
                "intensity": 0.88,
                "rationale": "Window breakup to suggest architectural light entering the set.",
            }
        if "cyberpunk" in text or "neon" in text or "scan" in text:
            return {
                "goboId": "lines",
                "size": 1.0,
                "rotation": 90 if "vertical" in text else 0,
                "intensity": 0.72,
                "rationale": "Linear gobo to create synthetic signage streaks and wet-floor texture.",
            }
        if any(token in text for token in ["pizza", "pizzeria", "restaurant", "trattoria", "food", "appetizing", "crust", "steam", "glassware"]):
            if role_text in {"accent", "background", "rim", "back", "hair", "practical"}:
                return {
                    "goboId": "window",
                    "size": 1.0,
                    "rotation": 0,
                    "intensity": 0.45,
                    "rationale": "Warm window breakup adds appetizing architectural texture without cluttering the food hero.",
                }
            return None
        if any(token in text for token in ["warehouse", "industrial", "garage", "factory"]):
            if (
                role_text in {"accent", "background", "rim", "back", "hair", "practical"}
                or any(token in text for token in ["texture", "breakup", "shadow", "silhouette", "dusty", "haze", "beam", "background"])
            ):
                return {
                    "goboId": "breakup",
                    "size": 1.25,
                    "rotation": 0,
                    "intensity": 0.78,
                    "rationale": "Industrial breakup adds dusty warehouse texture and layered background contrast.",
                }
            return None
        if "beauty" in text or "fashion" in text or "luxury" in text or "editorial" in text:
            if role_text not in {"accent", "background", "rim", "back", "hair", "practical"}:
                return None
            return {
                "goboId": "breakup",
                "size": 1.0,
                "rotation": 0,
                "intensity": 0.55,
                "rationale": "Subtle breakup texture to add premium editorial depth without cluttering the face.",
            }
        if "ritual" in text or "horror" in text or "occult" in text:
            return {
                "goboId": "breakup",
                "size": 1.3,
                "rotation": 0,
                "intensity": 0.84,
                "rationale": "Irregular breakup to add unease and environmental texture.",
            }

        return None

    def _infer_light_recipe(
        self,
        prompt: str,
        role: str,
        purpose: Optional[str],
        concept: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> Dict[str, Any]:
        text = " ".join(
            part for part in [prompt, role, purpose or "", concept or "", summary or ""] if part
        ).lower()
        role_text = str(role or "").lower()

        def role_matches(tokens: List[str]) -> bool:
            return any(token in role_text for token in tokens)

        def has_any(tokens: List[str]) -> bool:
            return any(token in text for token in tokens)

        def build_recipe(
            intent: str,
            modifier: str,
            beam_angle: float,
            rationale: str,
            *,
            haze: Optional[Dict[str, Any]] = None,
            gobo: Optional[Dict[str, Any]] = None,
        ) -> Dict[str, Any]:
            recipe: Dict[str, Any] = {
                "intent": intent,
                "modifier": modifier,
                "beamAngle": round(_clamp(float(beam_angle), 12.0, 120.0), 2),
                "rationale": rationale[:220],
            }
            if haze:
                recipe["haze"] = {
                    "enabled": bool(haze.get("enabled")),
                    "density": round(_clamp(_coerce_float(haze.get("density"), 0.014), 0.004, 0.06), 3),
                    "rationale": str(haze.get("rationale") or "")[:180] or None,
                }
            if gobo:
                recipe["gobo"] = gobo
            return recipe

        if has_any(["beauty", "editorial", "fashion", "cosmetic"]):
            return build_recipe(
                "beauty",
                "softbox" if role_matches(["key", "fill"]) else "stripbox",
                66.0 if role_matches(["fill"]) else 42.0,
                purpose or "Soft beauty shaping with clean separation and flattering wrap.",
                gobo=(
                    {
                        "goboId": "breakup",
                        "size": 1.0,
                        "rotation": 0,
                        "intensity": 0.55,
                        "rationale": "Subtle breakup adds premium editorial texture without dirtying the face.",
                    }
                    if role_matches(["accent", "background", "rim", "back", "hair", "practical"])
                    else None
                ),
            )

        if has_any(["luxury retail", "retail", "boutique", "showroom"]):
            return build_recipe(
                "luxury_retail",
                "fresnel" if role_matches(["key", "accent"]) else "stripbox",
                26.0 if role_matches(["accent", "rim", "back"]) else 38.0,
                purpose or "Controlled showroom contrast with premium edge definition.",
                gobo=(
                    {
                        "goboId": "lines",
                        "size": 1.0,
                        "rotation": 90,
                        "intensity": 0.42,
                        "rationale": "Linear breakup hints at premium display slats and architectural rhythm.",
                    }
                    if role_matches(["accent", "background", "rim"])
                    else None
                ),
            )

        if has_any(["nightclub", "club", "dancefloor", "dj", "strobe"]):
            return build_recipe(
                "nightclub",
                "gobo_projector" if role_matches(["accent", "practical", "rim"]) else "fresnel",
                24.0 if role_matches(["accent", "practical"]) else 34.0,
                purpose or "Punchy nightlife lighting with visible atmosphere and graphic texture.",
                haze={
                    "enabled": True,
                    "density": 0.026,
                    "rationale": "Nightclub beams read stronger with visible haze in the volume.",
                },
                gobo=(
                    {
                        "goboId": "dots",
                        "size": 0.92,
                        "rotation": 0,
                        "intensity": 0.72,
                        "rationale": "Dot breakup mimics moving club fixtures and LED texture.",
                    }
                    if role_matches(["accent", "practical", "rim"])
                    else None
                ),
            )

        if has_any(["noir", "detective", "venetian", "low-key"]):
            return build_recipe(
                "noir",
                "fresnel",
                24.0 if role_matches(["key"]) else 32.0,
                purpose or "Hard noir modeling with disciplined spill and strong shadow texture.",
                gobo=(
                    {
                        "goboId": "blinds",
                        "size": 1.2,
                        "rotation": 0,
                        "intensity": 0.9,
                        "rationale": "Venetian blind breakup reinforces the noir silhouette language.",
                    }
                    if role_matches(["key", "accent", "rim", "back"])
                    else None
                ),
            )

        if has_any(["cyberpunk", "blade runner", "neon", "futuristic"]):
            return build_recipe(
                "cyberpunk",
                "gobo_projector" if role_matches(["accent", "practical", "rim"]) else "stripbox",
                28.0 if role_matches(["practical", "accent"]) else 34.0,
                purpose or "Synthetic neon contrast with reflective streaks and animated practicals.",
                haze={
                    "enabled": True,
                    "density": 0.018,
                    "rationale": "Light haze helps neon beams read against reflective surfaces.",
                },
                gobo=(
                    {
                        "goboId": "dots" if role_matches(["accent"]) else "lines",
                        "size": 1.0,
                        "rotation": 90 if role_matches(["rim", "back"]) else 0,
                        "intensity": 0.76 if role_matches(["practical"]) else 0.62,
                        "rationale": "Graphic breakup reinforces synthetic signage and wet-surface reflections.",
                    }
                    if role_matches(["accent", "practical", "rim", "back"])
                    else None
                ),
            )

        if has_any(["warehouse", "industrial", "garage", "factory"]):
            return build_recipe(
                "warehouse",
                "fresnel" if role_matches(["key"]) else "gobo_projector",
                28.0 if role_matches(["accent", "background", "rim", "back"]) else 36.0,
                purpose or "Industrial overhead shaping with dusty background texture and beam definition.",
                haze={
                    "enabled": True,
                    "density": 0.014,
                    "rationale": "A touch of haze helps industrial breakup and shafts read in depth.",
                } if role_matches(["accent", "background", "rim", "back"]) else None,
                gobo=(
                    {
                        "goboId": "breakup",
                        "size": 1.25,
                        "rotation": 0,
                        "intensity": 0.78,
                        "rationale": "Industrial breakup adds dusty warehouse texture and layered depth.",
                    }
                    if role_matches(["accent", "background", "rim", "back", "practical"])
                    else None
                ),
            )

        if has_any(["pizza", "pizzeria", "restaurant", "trattoria", "food", "kitchen", "menu"]):
            return build_recipe(
                "food",
                "softbox" if role_matches(["key"]) else "fresnel" if role_matches(["rim", "back"]) else "lantern",
                38.0 if role_matches(["key"]) else 30.0,
                purpose or "Warm appetizing separation with controlled architectural texture around the food hero.",
                gobo=(
                    {
                        "goboId": "window",
                        "size": 1.0,
                        "rotation": 0,
                        "intensity": 0.45,
                        "rationale": "Warm window breakup makes the set feel like a lived-in restaurant without cluttering the hero.",
                    }
                    if role_matches(["rim", "accent", "background", "back", "practical"])
                    else None
                ),
            )

        if has_any(["office", "corporate", "meeting room", "interview", "presentation"]):
            return build_recipe(
                "office",
                "softbox" if role_matches(["key", "fill"]) else "none",
                72.0 if role_matches(["fill"]) else 46.0,
                purpose or "Corporate-safe daylight style with clean spill and readable faces.",
            )

        if has_any(["product", "commercial", "hero shot"]):
            return build_recipe(
                "hero_product",
                "softbox" if role_matches(["key"]) else "stripbox",
                24.0 if role_matches(["accent", "rim", "back"]) else 36.0,
                purpose or "Commercial product rig with crisp edge control and clean reflections.",
            )

        return build_recipe(
            "dramatic" if role_matches(["key"]) else "soft_daylight",
            "fresnel" if role_matches(["key"]) else "softbox",
            34.0 if role_matches(["key"]) else 52.0,
            purpose or "Balanced studio lighting matched to the current scene intent.",
        )

    def _normalize_light_gobo(
        self,
        value: Any,
        fallback: Any,
        prompt: str,
        role: str,
        purpose: Optional[str],
        concept: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        base_value = value if isinstance(value, dict) else fallback if isinstance(fallback, dict) else None
        text = " ".join(
            part for part in [prompt, role, purpose or "", concept or "", summary or ""] if part
        ).lower()
        role_text = str(role or "").lower()
        clean_pattern_requested = any(
            token in text
            for token in [
                "rembrandt",
                "loop lighting",
                "butterfly",
                "paramount",
                "clamshell",
                "three-point",
                "three point",
                "headshot",
                "beauty",
                "fashion",
                "editorial",
                "luxury",
            ]
        )
        explicit_texture_requested = any(
            token in text
            for token in ["window", "sunbeam", "sunlight", "blinds", "venetian", "noir", "detective", "neon", "cyberpunk", "leaves", "forest"]
        )
        if clean_pattern_requested and not explicit_texture_requested and role_text not in {"accent", "background", "rim", "back", "hair", "practical"}:
            base_value = None

        inferred = self._infer_gobo_for_light(prompt, role, purpose, concept, summary)

        gobo_id = _normalize_gobo_id(
            (base_value or {}).get("goboId") if base_value else None,
            inferred.get("goboId") if inferred else None,
        )
        if not gobo_id:
            return None

        return {
            "goboId": gobo_id,
            "size": round(
                _clamp(
                    _coerce_float((base_value or {}).get("size"), inferred.get("size") if inferred else 1.0),
                    0.2,
                    4.0,
                ),
                3,
            ),
            "rotation": round(
                _coerce_float((base_value or {}).get("rotation"), inferred.get("rotation") if inferred else 0.0),
                2,
            ),
            "intensity": round(
                _clamp(
                    _coerce_float((base_value or {}).get("intensity"), inferred.get("intensity") if inferred else 0.8),
                    0.05,
                    1.0,
                ),
                3,
            ),
            "rationale": (
                str((base_value or {}).get("rationale") or (inferred or {}).get("rationale"))[:220]
                if (base_value or {}).get("rationale") or (inferred or {}).get("rationale")
                else None
            ),
        }

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

    def _get_layout_hints(self, room_constraints: Dict[str, Any]) -> Dict[str, Any]:
        raw_hints = room_constraints.get("layoutHints")
        if not isinstance(raw_hints, dict):
            return {}

        aggregate = raw_hints.get("aggregate")
        if isinstance(aggregate, dict):
            return aggregate
        return raw_hints

    def _apply_surface_visibility_hints(
        self,
        surfaces: List[Dict[str, Any]],
        layout_hints: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        if not layout_hints:
            return surfaces

        visibility_by_target = {
            "leftWall": bool(layout_hints.get("leftWallVisible")),
            "rightWall": bool(layout_hints.get("rightWallVisible")),
            "rearWall": bool(layout_hints.get("backWallVisible")),
        }

        adjusted: List[Dict[str, Any]] = []
        for surface in surfaces:
            target = str(surface.get("target") or "")
            next_surface = dict(surface)
            if target == "floor":
                next_surface["visible"] = bool(layout_hints.get("floorVisible", next_surface.get("visible", True)))
            elif target in visibility_by_target:
                next_surface["visible"] = visibility_by_target[target]
            adjusted.append(next_surface)
        return adjusted

    def _build_layout_guidance(
        self,
        room_constraints: Dict[str, Any],
        reference_images: List[str],
    ) -> Optional[Dict[str, Any]]:
        layout_hints = self._get_layout_hints(room_constraints)
        if not layout_hints and not reference_images:
            return None

        suggested_zones = layout_hints.get("suggestedZones") if isinstance(layout_hints.get("suggestedZones"), dict) else {}
        depth_profile = layout_hints.get("depthProfile") if isinstance(layout_hints.get("depthProfile"), dict) else {}
        visible_planes = layout_hints.get("visiblePlanes") if isinstance(layout_hints.get("visiblePlanes"), list) else []
        provider = str(room_constraints.get("layoutProvider") or room_constraints.get("layoutAnalysisProvider") or ("heuristics" if layout_hints else "none"))
        image_layout_summary = room_constraints.get("imageLayoutSummary")
        detected_openings = layout_hints.get("detectedOpenings") if isinstance(layout_hints.get("detectedOpenings"), list) else []
        object_anchors = layout_hints.get("objectAnchors") if isinstance(layout_hints.get("objectAnchors"), list) else []

        hero_zone = suggested_zones.get("hero") if isinstance(suggested_zones.get("hero"), dict) else {}
        supporting_zone = suggested_zones.get("supporting") if isinstance(suggested_zones.get("supporting"), dict) else {}
        background_zone = suggested_zones.get("background") if isinstance(suggested_zones.get("background"), dict) else {}

        x_bias = _clamp(_coerce_float(hero_zone.get("xBias"), 0.0), -1.0, 1.0)

        normalized_planes: List[str] = []
        for plane in visible_planes:
            plane_value = str(plane).strip()
            if plane_value in {"floor", "leftWall", "rightWall", "backWall", "rearWall"} and plane_value not in normalized_planes:
                normalized_planes.append(plane_value)

        return {
            "provider": provider[:32],
            "roomType": _normalize_room_shell_type(layout_hints.get("roomType"), "studio_shell"),
            "summary": str(image_layout_summary)[:280] if image_layout_summary else None,
            "visiblePlanes": normalized_planes,
            "depthProfile": {
                "quality": str(depth_profile.get("quality") or layout_hints.get("depthQuality") or "medium")[:24],
                "cameraElevation": str(depth_profile.get("cameraElevation") or layout_hints.get("cameraElevation") or "eye")[:24],
                "horizonLine": round(_coerce_float(depth_profile.get("horizonLine", layout_hints.get("horizonLine")), 0.55), 4),
            },
            "detectedOpenings": _normalize_room_shell_openings(detected_openings),
            "objectAnchors": [
                {
                    "id": str(item.get("id") or f"anchor_{index + 1}")[:64],
                    "kind": str(item.get("kind") or "unknown")[:48],
                    "label": str(item.get("label") or item.get("kind") or f"Anchor {index + 1}")[:120],
                    "placementMode": str(item.get("placementMode") or "ground")[:24],
                    "bbox": (
                        [
                            round(_clamp(_coerce_float(item_bbox[0], 0.0), 0.0, 1.0), 4),
                            round(_clamp(_coerce_float(item_bbox[1], 0.0), 0.0, 1.0), 4),
                            round(_clamp(_coerce_float(item_bbox[2], 1.0), 0.0, 1.0), 4),
                            round(_clamp(_coerce_float(item_bbox[3], 1.0), 0.0, 1.0), 4),
                        ]
                        if isinstance((item_bbox := item.get("bbox")), list) and len(item_bbox) >= 4
                        else None
                    ),
                    "wallTarget": (
                        _normalize_wall_target(item.get("wallTarget"), "backWall")
                        if item.get("wallTarget")
                        else None
                    ),
                    "targetSurface": (
                        str(item.get("targetSurface"))[:24]
                        if isinstance(item.get("targetSurface"), str) and str(item.get("targetSurface")).strip()
                        else None
                    ),
                    "preferredZonePurpose": str(item.get("preferredZonePurpose") or "background")[:24],
                    "confidence": round(_clamp(_coerce_float(item.get("confidence"), 0.72), 0.0, 1.0), 3),
                }
                for index, item in enumerate(object_anchors[:12])
                if isinstance(item, dict)
            ],
            "suggestedZones": {
                "hero": {
                    "xBias": round(x_bias, 3),
                    "depthZone": _normalize_depth_zone(hero_zone.get("depthZone"), "midground"),
                },
                "supporting": {
                    "side": _normalize_supporting_side(supporting_zone.get("side"), "center"),
                    "depthZone": _normalize_depth_zone(supporting_zone.get("depthZone"), "midground"),
                },
                "background": {
                    "wallTarget": _normalize_wall_target(background_zone.get("wallTarget"), "backWall"),
                    "depthZone": _normalize_depth_zone(background_zone.get("depthZone"), "background"),
                },
            },
        }

    def _build_fallback_plan(
        self,
        prompt: str,
        reference_images: List[str],
        room_constraints: Dict[str, Any],
        preferred_preset_id: Optional[str],
        world_model_provider: str,
        world_model_reference: Dict[str, Any],
        brand_reference: Dict[str, Any],
    ) -> Dict[str, Any]:
        lowered = prompt.lower()
        layout_hints = self._get_layout_hints(room_constraints)
        estimated_shell = layout_hints.get("estimatedShell") if isinstance(layout_hints.get("estimatedShell"), dict) else {}
        suggested_camera = layout_hints.get("suggestedCamera") if isinstance(layout_hints.get("suggestedCamera"), dict) else {}
        layout_room_type = str(layout_hints.get("roomType") or "").strip()
        layout_composition = str(layout_hints.get("composition") or "").strip()
        layout_depth_quality = str(layout_hints.get("depthQuality") or "").strip()
        layout_guidance = self._build_layout_guidance(room_constraints, reference_images)

        recommended_preset: Optional[str] = preferred_preset_id
        concept = "Adaptive studio environment"
        summary = "A structured environment plan mapped onto the current studio shell."
        shell_type = layout_room_type or "studio_shell"
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
        characters: List[Dict[str, Any]] = []
        shell_openings: List[Dict[str, Any]] = []
        shell_zones: List[Dict[str, Any]] = [
            {
                "id": "hero_zone",
                "label": "Hero zone",
                "purpose": "hero",
                "xBias": 0.0,
                "zBias": -0.18,
                "widthRatio": 0.28,
                "depthRatio": 0.22,
                "notes": ["Default camera-facing stage zone for the primary subject."],
            },
            {
                "id": "background_zone",
                "label": "Background zone",
                "purpose": "background",
                "xBias": 0.0,
                "zBias": 0.34,
                "widthRatio": 0.42,
                "depthRatio": 0.24,
                "notes": ["Default background zone for wall dressing and secondary action."],
            },
        ]
        shell_fixtures: List[Dict[str, Any]] = []
        branding = {
            "enabled": bool(brand_reference.get("hasBranding")),
            "brandName": brand_reference.get("brandName"),
            "profileName": brand_reference.get("profileName") or "Logo-led default",
            "palette": list(brand_reference.get("palette") or []),
            "signageText": brand_reference.get("signageText"),
            "logoImage": brand_reference.get("logoImage"),
            "applyToEnvironment": bool(brand_reference.get("hasBranding")),
            "applyToWardrobe": bool(brand_reference.get("hasBranding")),
            "applyToSignage": bool(brand_reference.get("hasBranding")),
            "applicationTargets": ["environment", "wardrobe", "signage", "packaging", "interior_details"] if brand_reference.get("hasBranding") else ["environment", "signage"],
            "uniformPolicy": "match_palette",
            "signageStyle": "menu_board",
            "packagingStyle": "box_stamp",
            "interiorStyle": "accent_trim",
            "notes": [
                "Use logo and palette on wardrobe, wall logos, menu boards, hero signage and packaging accents."
            ] if brand_reference.get("hasBranding") else [],
        }
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
            "Use lighting cues to shape depth, texture and motivated architectural breakup across the modular shell.",
        ]
        gaps = [
            "Modular shell details are available, but fully freeform architecture and exact real-world reconstruction still need richer image/layout solving.",
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
            shell_type = "storefront"
            shell_openings = [
                {
                    "id": "rear_entry_arch",
                    "wallTarget": "rearWall",
                    "kind": "archway",
                    "widthRatio": 0.34,
                    "heightRatio": 0.74,
                    "xAlign": "left",
                    "sillHeight": 0.0,
                    "notes": ["Suggests a back-of-house entry without rebuilding the whole shell."],
                },
                {
                    "id": "service_pass",
                    "wallTarget": "rightWall",
                    "kind": "pass_through",
                    "widthRatio": 0.22,
                    "heightRatio": 0.24,
                    "xAlign": "center",
                    "sillHeight": 1.14,
                    "notes": ["Creates the feeling of an active kitchen pass between prep and service."],
                },
            ]
            shell_zones = [
                {
                    "id": "prep_line",
                    "label": "Prep line",
                    "purpose": "prep",
                    "xBias": -0.48,
                    "zBias": 0.24,
                    "widthRatio": 0.24,
                    "depthRatio": 0.2,
                    "notes": ["Zone for dough stretching and pizza assembly."],
                },
                {
                    "id": "oven_wall",
                    "label": "Oven wall",
                    "purpose": "background",
                    "xBias": 0.15,
                    "zBias": 0.34,
                    "widthRatio": 0.3,
                    "depthRatio": 0.18,
                    "notes": ["Background cue for oven facade and warm practicals."],
                },
                {
                    "id": "backroom_prep",
                    "label": "Backroom prep",
                    "purpose": "backroom",
                    "xBias": -0.18,
                    "zBias": 0.34,
                    "widthRatio": 0.18,
                    "depthRatio": 0.16,
                    "notes": ["Back-of-house staging zone for boxes, ingredients and kitchen traffic."],
                },
                {
                    "id": "front_counter",
                    "label": "Front counter",
                    "purpose": "counter",
                    "xBias": 0.42,
                    "zBias": -0.18,
                    "widthRatio": 0.22,
                    "depthRatio": 0.18,
                    "notes": ["Front-of-house order taking and guest welcome position."],
                },
                {
                    "id": "dining_aisle",
                    "label": "Dining aisle",
                    "purpose": "service",
                    "xBias": 0.12,
                    "zBias": 0.02,
                    "widthRatio": 0.24,
                    "depthRatio": 0.28,
                    "notes": ["Route corridor for server movement and background life."],
                },
                {
                    "id": "hero_zone",
                    "label": "Hero zone",
                    "purpose": "hero",
                    "xBias": 0.0,
                    "zBias": -0.28,
                    "widthRatio": 0.24,
                    "depthRatio": 0.2,
                    "notes": ["Primary camera-facing tabletop zone for the hero pizza."],
                },
            ]
            shell_fixtures = [
                {
                    "id": "prep_island",
                    "kind": "prep_island",
                    "zoneId": "prep_line",
                    "widthRatio": 0.24,
                    "depthRatio": 0.14,
                    "height": 0.96,
                    "notes": ["Prep island for shaping dough and building pizzas."],
                },
                {
                    "id": "front_counter_block",
                    "kind": "counter_block",
                    "zoneId": "front_counter",
                    "widthRatio": 0.26,
                    "depthRatio": 0.14,
                    "height": 1.08,
                    "notes": ["Customer-facing order counter."],
                },
                {
                    "id": "pass_shelf",
                    "kind": "pass_shelf",
                    "zoneId": "backroom_prep",
                    "wallTarget": "rightWall",
                    "widthRatio": 0.22,
                    "depthRatio": 0.08,
                    "height": 1.24,
                    "notes": ["Hot pass shelf to bridge baker and service."],
                },
                {
                    "id": "backroom_partition",
                    "kind": "partition",
                    "zoneId": "backroom_prep",
                    "widthRatio": 0.16,
                    "depthRatio": 0.05,
                    "height": 2.3,
                    "notes": ["Separates backroom prep from customer-facing space without closing the shell."],
                },
                {
                    "id": "banquette_left",
                    "kind": "banquette",
                    "zoneId": "dining_aisle",
                    "xBias": -0.32,
                    "zBias": 0.0,
                    "widthRatio": 0.18,
                    "depthRatio": 0.12,
                    "height": 1.14,
                    "notes": ["Dining-side banquette to make the room feel operational."],
                },
                {
                    "id": "host_stand",
                    "kind": "host_stand",
                    "zoneId": "front_counter",
                    "xBias": 0.18,
                    "zBias": -0.08,
                    "widthRatio": 0.1,
                    "depthRatio": 0.08,
                    "height": 1.18,
                    "notes": ["Front greet point with logo-facing surface."],
                },
            ]
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
            characters = [
                {
                    "name": "Bakemester",
                    "role": "baker",
                    "archetypeId": "worker_baker",
                    "description": "Visible baker working the dough near the prep counter.",
                    "priority": "high",
                    "placementHint": "Back-left prep counter",
                    "actionHint": "Stretching dough and finishing pizzas",
                    "wardrobeStyle": "baker",
                    "wardrobeVariantId": "artisan_cap",
                    "wardrobeNotes": ["Keep the silhouette practical and flour-room ready."],
                    "outfitColors": list(brand_reference.get("palette") or ["#f97316", "#fff7ed"])[:2],
                    "logoPlacement": "apron_chest",
                    "appearance": {
                        "skinTone": "#c58c62",
                        "hairColor": "#2f241f",
                        "hairStyle": "covered",
                        "facialHair": "stubble",
                        "ageGroup": "adult",
                        "genderPresentation": "male",
                    },
                    "behaviorPlan": {
                        "type": "work_loop",
                        "homeZoneId": "prep_line",
                        "routeZoneIds": ["prep_line", "oven_wall"],
                        "lookAtTarget": "oven",
                        "pace": "active",
                        "radius": 0.82,
                    },
                },
                {
                    "name": "Front-of-house",
                    "role": "cashier",
                    "archetypeId": "worker_cashier",
                    "description": "Cashier or host to make the restaurant feel staffed and alive.",
                    "priority": "medium",
                    "placementHint": "Front-right counter zone",
                    "actionHint": "Welcoming guests and taking orders",
                    "wardrobeStyle": "cashier",
                    "wardrobeVariantId": "counter_polo",
                    "wardrobeNotes": ["Prioritize logo readability and a clean front-of-house silhouette."],
                    "outfitColors": list(brand_reference.get("palette") or ["#2f6b45", "#f4e7d3"])[:2],
                    "logoPlacement": "shirt_chest",
                    "appearance": {
                        "skinTone": "#f0c2a2",
                        "hairColor": "#6d4c41",
                        "hairStyle": "bun",
                        "facialHair": "none",
                        "ageGroup": "young_adult",
                        "genderPresentation": "female",
                    },
                    "behaviorPlan": {
                        "type": "counter_service",
                        "homeZoneId": "front_counter",
                        "routeZoneIds": ["front_counter"],
                        "lookAtTarget": "guests",
                        "pace": "subtle",
                        "radius": 0.46,
                    },
                },
                {
                    "name": "Servering",
                    "role": "server",
                    "archetypeId": "worker_server",
                    "description": "Supporting worker to keep the space busy without stealing focus.",
                    "priority": "medium",
                    "placementHint": "Midground right aisle",
                    "actionHint": "Carrying plates through the dining zone",
                    "wardrobeStyle": "server",
                    "wardrobeVariantId": "floor_service_apron",
                    "wardrobeNotes": ["Keep the service look lighter than the baker uniform."],
                    "outfitColors": list(brand_reference.get("palette") or ["#111827", "#f4e7d3"])[:2],
                    "logoPlacement": "shirt_chest",
                    "appearance": {
                        "skinTone": "#8d5b3d",
                        "hairColor": "#1f2937",
                        "hairStyle": "short",
                        "facialHair": "none",
                        "ageGroup": "young_adult",
                        "genderPresentation": "neutral",
                    },
                    "behaviorPlan": {
                        "type": "serve_route",
                        "homeZoneId": "dining_aisle",
                        "routeZoneIds": ["front_counter", "dining_aisle", "hero_zone"],
                        "lookAtTarget": "guests",
                        "pace": "active",
                        "radius": 0.92,
                    },
                },
                {
                    "name": "Vertskap",
                    "role": "host",
                    "archetypeId": "worker_host",
                    "description": "Host near the entry who helps the storefront read as active and branded.",
                    "priority": "low",
                    "placementHint": "Front entry host stand",
                    "actionHint": "Greeting guests at the branded host stand",
                    "wardrobeStyle": "host",
                    "wardrobeVariantId": "guest_welcome",
                    "wardrobeNotes": ["Keep the host silhouette polished and logo-forward."],
                    "outfitColors": list(brand_reference.get("palette") or ["#c0392b", "#f4e7d3", "#1f2937"])[:3],
                    "logoPlacement": "shirt_chest",
                    "appearance": {
                        "skinTone": "#b97d5a",
                        "hairColor": "#201818",
                        "hairStyle": "medium",
                        "facialHair": "none",
                        "ageGroup": "adult",
                        "genderPresentation": "female",
                    },
                    "behaviorPlan": {
                        "type": "counter_service",
                        "homeZoneId": "front_counter",
                        "routeZoneIds": ["front_counter", "hero_zone"],
                        "lookAtTarget": "guests",
                        "pace": "subtle",
                        "radius": 0.38,
                    },
                },
                {
                    "name": "Gjest",
                    "role": "customer",
                    "archetypeId": "customer_man",
                    "description": "Background customer to make the dining aisle feel occupied.",
                    "priority": "low",
                    "placementHint": "Dining aisle booth zone",
                    "actionHint": "Waiting for takeaway and glancing toward the counter",
                    "wardrobeStyle": "casual",
                    "wardrobeVariantId": "dining_guest",
                    "wardrobeNotes": ["Keep the customer neutral so the brand still belongs to the staff and set."],
                    "outfitColors": ["#6b7280", "#f4e7d3"],
                    "logoPlacement": "none",
                    "appearance": {
                        "skinTone": "#a86d4f",
                        "hairColor": "#231f20",
                        "hairStyle": "short",
                        "facialHair": "stubble",
                        "ageGroup": "adult",
                        "genderPresentation": "male",
                    },
                    "behaviorPlan": {
                        "type": "patrol",
                        "homeZoneId": "dining_aisle",
                        "routeZoneIds": ["dining_aisle", "front_counter", "hero_zone"],
                        "lookAtTarget": "guests",
                        "pace": "subtle",
                        "radius": 0.74,
                    },
                },
            ]
            if brand_reference.get("hasBranding"):
                branding.update({
                    "enabled": True,
                    "profileName": brand_reference.get("profileName") or "Rustic Italian brand system",
                    "applyToEnvironment": True,
                    "applyToWardrobe": True,
                    "applyToSignage": True,
                    "applicationTargets": ["environment", "wardrobe", "signage", "packaging", "interior_details"],
                    "uniformPolicy": "front_of_house_emphasis",
                    "signageStyle": "menu_board",
                    "packagingStyle": "printed_wrap",
                    "interiorStyle": "accent_trim",
                    "notes": [
                        "Carry the uploaded brand palette into menu signage, uniform accents and wall logos.",
                        "Use the brand logo on aprons and front-of-house wardrobe.",
                    ],
                })
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
                    "gobo": {
                        "goboId": "window",
                        "size": 1.0,
                        "rotation": 0,
                        "intensity": 0.45,
                        "rationale": "Adds warm architectural breakup like late-afternoon restaurant window light.",
                    },
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
            lighting = [
                {
                    "role": "practical",
                    "position": [-2.3, 2.4, -1.1],
                    "intensity": 0.68,
                    "color": "#38f5ff",
                    "cct": 5200,
                    "purpose": "Neon cyan signage buzz with visible streaks on reflective surfaces",
                    "gobo": {
                        "goboId": "lines",
                        "size": 1.0,
                        "rotation": 0,
                        "intensity": 0.76,
                        "rationale": "Linear gobo amplifies synthetic signage texture and puddle reflections.",
                    },
                    "behavior": {
                        "type": "flicker",
                        "speed": 2.2,
                        "amplitude": 0.18,
                        "radius": 0.3,
                    },
                },
                {
                    "role": "accent",
                    "position": [1.8, 3.1, 1.9],
                    "intensity": 0.82,
                    "color": "#ff4bd1",
                    "purpose": "Orbiting magenta kicker for wet-floor and product edge separation",
                    "gobo": {
                        "goboId": "dots",
                        "size": 0.9,
                        "rotation": 0,
                        "intensity": 0.55,
                        "rationale": "Breaks the magenta accent into lively reflected pixels.",
                    },
                    "behavior": {
                        "type": "orbit",
                        "speed": 0.9,
                        "amplitude": 0.18,
                        "radius": 1.4,
                    },
                },
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
            lighting = [
                {
                    "role": "key",
                    "position": [-2.4, 3.2, -1.6],
                    "intensity": 0.74,
                    "color": "#ffe3d2",
                    "cct": 4300,
                    "purpose": "Primary ritual key shaping the altar and subject silhouette",
                },
                {
                    "role": "accent",
                    "position": [2.0, 2.8, -0.4],
                    "intensity": 0.58,
                    "color": "#b85cff",
                    "purpose": "Textured occult breakup across the walls and floor glyphs",
                    "gobo": {
                        "goboId": "breakup",
                        "size": 1.4,
                        "rotation": 0,
                        "intensity": 0.82,
                        "rationale": "Irregular breakup deepens the unsettling chamber texture.",
                    },
                },
            ]
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
            lighting = [
                {
                    "role": "key",
                    "position": [2.1, 3.4, -2.3],
                    "intensity": 1.25,
                    "cct": 5600,
                    "purpose": "Soft beauty key with broad flattering coverage",
                },
                {
                    "role": "fill",
                    "position": [-2.2, 2.6, -2.9],
                    "intensity": 0.65,
                    "cct": 5000,
                    "purpose": "Controlled fill to keep detail open without flattening the face",
                },
                {
                    "role": "accent",
                    "position": [0.8, 3.2, 2.6],
                    "intensity": 0.52,
                    "color": "#f6d8ff",
                    "purpose": "Glossy editorial accent on the backdrop and product edges",
                    "gobo": {
                        "goboId": "breakup",
                        "size": 1.0,
                        "rotation": 0,
                        "intensity": 0.58,
                        "rationale": "Subtle breakup adds premium texture while keeping the beauty subject clean.",
                    },
                    "behavior": {
                        "type": "pan_sweep",
                        "speed": 0.85,
                        "amplitude": 0.18,
                        "radius": 0.8,
                    },
                },
            ]
            confidence = 0.85

        if layout_hints:
            summary += " Image-derived layout hints informed the shell dimensions, visible planes and initial camera framing."
            shell_type = layout_room_type or shell_type
            surfaces = self._apply_surface_visibility_hints(surfaces, layout_hints)
            if layout_hints.get("roomType") in {"interior_room", "warehouse", "storefront"} and "preserve the reference room proportions" not in assembly_steps:
                assembly_steps.insert(1, "Preserve the reference room proportions and visible planes as closely as the current shell allows.")
            gaps.append("Current image-to-layout uses local heuristics; exact reconstruction still needs SAM 2 segmentation and depth estimation.")
            next_modules.extend(["sam2_segmentation", "depth_anything_layout"])
            confidence = min(max(confidence, 0.76), 0.84)

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

        if suggested_camera:
            camera["shotType"] = str(suggested_camera.get("shotType") or camera["shotType"])
            target = suggested_camera.get("target")
            if isinstance(target, list) and len(target) >= 3:
                camera["target"] = [
                    round(_coerce_float(target[0], camera["target"][0]), 3),
                    round(_coerce_float(target[1], camera["target"][1]), 3),
                    round(_coerce_float(target[2], camera["target"][2]), 3),
                ]
            position_hint = suggested_camera.get("positionHint")
            if isinstance(position_hint, list) and len(position_hint) >= 3:
                camera["positionHint"] = [
                    round(_coerce_float(position_hint[0], camera["positionHint"][0]), 3),
                    round(_coerce_float(position_hint[1], camera["positionHint"][1]), 3),
                    round(max(2.4, _coerce_float(position_hint[2], camera["positionHint"][2])), 3),
                ]

        if layout_depth_quality == "deep":
            camera["fov"] = 0.78 if camera["shotType"] == "wide" else max(camera["fov"], 0.7)
        elif layout_depth_quality == "shallow":
            camera["fov"] = min(camera["fov"], 0.52)

        if layout_composition == "left_weighted":
            camera["target"][0] = min(-0.5, float(camera["target"][0]))
        elif layout_composition == "right_weighted":
            camera["target"][0] = max(0.5, float(camera["target"][0]))

        shell_width = round(_clamp(_coerce_float(estimated_shell.get("width"), 20.0), 6.0, 30.0), 2)
        shell_depth = round(_clamp(_coerce_float(estimated_shell.get("depth"), 20.0), 6.0, 30.0), 2)
        shell_height = round(_clamp(_coerce_float(estimated_shell.get("height"), 8.0), 3.0, 12.0), 2)
        open_ceiling = bool(estimated_shell.get("openCeiling", True))
        room_shell = build_room_shell_spec(
            {
                "type": shell_type,
                "width": shell_width,
                "depth": shell_depth,
                "height": shell_height,
                "openCeiling": open_ceiling,
                "openings": shell_openings,
                "zones": shell_zones,
                "fixtures": shell_fixtures,
                "notes": [
                    note
                    for note in [
                        "Current runtime supports modular shell geometry with openings, niches, wall segments and fixtures.",
                        "Image-derived dimensions are approximate until full depth/layout reconstruction lands." if layout_hints else None,
                    ]
                    if note
                ],
            },
            prompt=prompt,
            layout_hints=layout_hints,
        )
        normalized_lighting = []
        for light in lighting:
            recipe = self._infer_light_recipe(
                prompt,
                str(light.get("role") or "key"),
                str(light.get("purpose") or ""),
                concept,
                summary,
            )
            normalized_light = dict(light)
            normalized_light["intent"] = _normalize_lighting_intent(
                normalized_light.get("intent"),
                str(recipe.get("intent") or "dramatic"),
            )
            normalized_light["modifier"] = _normalize_light_modifier(
                normalized_light.get("modifier"),
                str(recipe.get("modifier") or "none"),
            )
            normalized_light["beamAngle"] = round(
                _clamp(_coerce_float(normalized_light.get("beamAngle"), recipe.get("beamAngle") or 36.0), 12.0, 120.0),
                2,
            )
            if recipe.get("rationale") and not normalized_light.get("rationale"):
                normalized_light["rationale"] = str(recipe.get("rationale"))[:220]
            if isinstance(recipe.get("haze"), dict) and not isinstance(normalized_light.get("haze"), dict):
                normalized_light["haze"] = dict(recipe["haze"])
            if not isinstance(normalized_light.get("gobo"), dict) and isinstance(recipe.get("gobo"), dict):
                normalized_light["gobo"] = dict(recipe["gobo"])
            normalized_lighting.append(normalized_light)
        lighting = normalized_lighting

        return {
            "version": "1.0",
            "planId": str(uuid.uuid4()),
            "prompt": prompt,
            "source": self._infer_source(reference_images, None, world_model_provider),
            "worldModel": world_model,
            "summary": summary,
            "concept": concept,
            "recommendedPresetId": recommended_preset,
            "roomShell": room_shell,
            "surfaces": surfaces,
            "atmosphere": atmosphere,
            "ambientSounds": ambient_sounds,
            "props": props,
            "characters": characters,
            "branding": branding,
            "lighting": lighting,
            "camera": camera,
            "layoutGuidance": layout_guidance,
            "assemblySteps": assembly_steps,
            "compatibility": {
                "currentStudioShellSupported": current_shell_supported,
                "confidence": confidence,
                "gaps": list(dict.fromkeys(gap for gap in gaps if gap)),
                "nextBuildModules": list(dict.fromkeys(module for module in next_modules if module)),
            },
        }
