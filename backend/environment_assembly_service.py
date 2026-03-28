"""
Environment assembly service.

Converts an EnvironmentPlan into a normalized shell, a backend scenegraph and a
set of runtime prop requests. This mirrors the frontend scene assembly layer so
the plan can be validated, stored and later evaluated server-side.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

try:
    from asset_retrieval_service import AssetRetrievalService
    from environment_planner_service import build_room_shell_spec
except ImportError:
    from backend.asset_retrieval_service import AssetRetrievalService
    from backend.environment_planner_service import build_room_shell_spec


VALID_WALL_TARGETS = {"backWall", "leftWall", "rightWall", "rearWall"}
VALID_SURFACE_TARGETS = VALID_WALL_TARGETS | {"floor"}
SURFACE_HINT_BY_ANCHOR_KIND = {
    "banquette": "table",
    "bench": "table",
    "counter": "counter",
    "display": "shelf",
    "menu_board": "shelf",
    "prep_surface": "counter",
    "shelf": "shelf",
    "signage": "shelf",
    "storage_rack": "shelf",
    "table": "table",
}
ANCHOR_KEYWORDS_BY_KIND = {
    "banquette": ["banquette", "booth", "seat"],
    "bench": ["bench", "seat"],
    "counter": ["counter", "cashier", "register", "checkout", "front counter"],
    "display": ["display", "showcase", "shelf", "merch"],
    "menu_board": ["menu", "menu board", "price board"],
    "oven": ["oven", "pizza oven", "bake"],
    "prep_surface": ["prep", "pizza", "dough", "kitchen", "station", "worktop"],
    "shelf": ["shelf", "display", "wall shelf"],
    "signage": ["sign", "logo", "signage", "poster"],
    "storage_rack": ["storage", "rack", "backroom"],
    "table": ["table", "tabletop", "dining", "wine", "glass", "plate"],
}


def _includes_any(text: str, values: List[str]) -> bool:
    return any(value in text for value in values)


def _normalize_wall_target(value: Any, fallback: str = "backWall") -> str:
    normalized = str(value or fallback).strip()
    if normalized in VALID_WALL_TARGETS:
        return normalized
    return fallback


def _infer_wall_target(placement_hint: str) -> str:
    lowered = placement_hint.lower()
    if "left" in lowered:
        return "leftWall"
    if "right" in lowered or "side" in lowered:
        return "rightWall"
    if "rear" in lowered or "backside" in lowered:
        return "rearWall"
    return "backWall"


def _infer_relative_side(placement_hint: str) -> Optional[str]:
    lowered = placement_hint.lower()
    if _includes_any(lowered, ["camera-left", "left side", "slightly left", "to the left", "left foreground"]):
        return "left"
    if _includes_any(lowered, ["camera-right", "right side", "slightly right", "to the right", "right foreground"]):
        return "right"
    if "center" in lowered:
        return "center"
    return None


def _infer_relative_type(placement_hint: str) -> Optional[str]:
    lowered = placement_hint.lower()
    if _includes_any(lowered, ["behind", "background", "just behind", "layered behind"]):
        return "behind"
    if _includes_any(lowered, ["next to", "beside", "to the side", "camera-left", "camera-right", "slightly left", "slightly right"]):
        return "next_to"
    if "centered" in lowered:
        return "centered_on"
    return None


def _infer_surface_anchor(placement_hint: str, description: str) -> Optional[str]:
    lowered = f"{placement_hint} {description}".lower()
    if "counter" in lowered:
        return "counter"
    if "shelf" in lowered:
        return "shelf"
    if "podium" in lowered or "pedestal" in lowered:
        return "podium"
    if _includes_any(lowered, ["table", "tabletop"]):
        return "table"
    return None


def _infer_preferred_mode(placement_hint: str, description: str) -> Optional[str]:
    lowered = f"{placement_hint} {description}".lower()
    if "wall" in lowered or "backdrop" in lowered or "mounted" in lowered:
        return "wall"
    if _includes_any(lowered, ["table", "counter", "shelf", "podium", "on the"]):
        return "surface"
    return None


def _get_prop_role(priority: str, placement_mode: str, anchor_role: str) -> str:
    if anchor_role == "surface_anchor":
        return "anchor"
    if priority == "high":
        return "hero"
    if priority == "medium":
        return "supporting"
    if placement_mode == "wall":
        return "set_dressing"
    return "set_dressing"


def _create_relationship(
    rel_type: str,
    source_node_id: str,
    target_node_id: str,
    reason: Optional[str] = None,
    strength: Optional[float] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "id": f"{rel_type}:{source_node_id}:{target_node_id}",
        "type": rel_type,
        "sourceNodeId": source_node_id,
        "targetNodeId": target_node_id,
    }
    if reason:
        payload["reason"] = reason
    if strength is not None:
        payload["strength"] = round(float(strength), 3)
    return payload


def _dedupe_relationships(relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    unique_by_id: Dict[str, Dict[str, Any]] = {}
    for relationship in relationships:
        relationship_id = str(relationship.get("id") or "")
        if relationship_id and relationship_id not in unique_by_id:
            unique_by_id[relationship_id] = relationship
    return list(unique_by_id.values())


def _normalize_plan_layout_hints(plan: Dict[str, Any]) -> Dict[str, Any]:
    guidance = plan.get("layoutGuidance")
    if not isinstance(guidance, dict):
        return {}
    return guidance


def _normalize_layout_object_anchors(layout_guidance: Dict[str, Any]) -> List[Dict[str, Any]]:
    anchors = layout_guidance.get("objectAnchors") if isinstance(layout_guidance, dict) else None
    if not isinstance(anchors, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for item in anchors:
        if not isinstance(item, dict):
            continue
        anchor_id = str(item.get("id") or "").strip()
        kind = str(item.get("kind") or "").strip().lower()
        if not anchor_id or not kind:
            continue
        bbox = item.get("bbox")
        normalized_bbox = None
        if isinstance(bbox, list) and len(bbox) >= 4:
            try:
                normalized_bbox = [
                    max(0.0, min(1.0, float(bbox[0]))),
                    max(0.0, min(1.0, float(bbox[1]))),
                    max(0.0, min(1.0, float(bbox[2]))),
                    max(0.0, min(1.0, float(bbox[3]))),
                ]
            except (TypeError, ValueError):
                normalized_bbox = None

        normalized.append({
            "id": anchor_id,
            "kind": kind,
            "label": str(item.get("label") or kind).strip(),
            "placementMode": str(item.get("placementMode") or "ground").strip().lower(),
            "bbox": normalized_bbox,
            "wallTarget": _normalize_wall_target(item.get("wallTarget"), "backWall") if item.get("wallTarget") else None,
            "targetSurface": str(item.get("targetSurface") or "").strip() or None,
            "preferredZonePurpose": str(item.get("preferredZonePurpose") or "").strip() or None,
            "confidence": float(item.get("confidence") or 0.0),
        })

    return normalized


def _get_layout_anchor_surface_hint(kind: str) -> Optional[str]:
    return SURFACE_HINT_BY_ANCHOR_KIND.get(str(kind or "").strip().lower())


def _get_layout_anchor_shot_zone_x(anchor: Dict[str, Any]) -> Optional[float]:
    bbox = anchor.get("bbox")
    if not isinstance(bbox, list) or len(bbox) < 4:
        return None
    center_x = (float(bbox[0]) + float(bbox[2])) / 2.0
    return round(max(-1.0, min(1.0, (center_x - 0.5) * 2.0)), 3)


def _get_layout_anchor_depth_zone(anchor: Dict[str, Any]) -> Optional[str]:
    bbox = anchor.get("bbox")
    if isinstance(bbox, list) and len(bbox) >= 4:
        center_y = (float(bbox[1]) + float(bbox[3])) / 2.0
        if center_y >= 0.68:
            return "foreground"
        if center_y <= 0.34:
            return "background"
        return "midground"

    purpose = str(anchor.get("preferredZonePurpose") or "")
    if purpose in {"storage", "background"}:
        return "background"
    if purpose in {"hero", "counter", "prep", "dining"}:
        return "midground"
    return None


def _find_best_layout_object_anchor(
    *,
    layout_guidance: Dict[str, Any],
    placement_mode: str,
    text: str,
    preferred_surface_hint: Optional[str] = None,
    priority: str = "medium",
) -> Optional[Dict[str, Any]]:
    anchors = _normalize_layout_object_anchors(layout_guidance)
    if not anchors:
        return None

    normalized_text = text.lower()
    best_anchor = None
    best_score = 0.0

    for anchor in anchors:
        kind = str(anchor.get("kind") or "")
        keywords = ANCHOR_KEYWORDS_BY_KIND.get(kind, [kind])
        anchor_surface_hint = _get_layout_anchor_surface_hint(kind)
        score = float(anchor.get("confidence") or 0.0)

        if placement_mode == "wall" and anchor.get("placementMode") == "wall":
            score += 2.2
        elif placement_mode == "surface" and kind in {"counter", "prep_surface", "table", "bench", "banquette", "display", "shelf"}:
            score += 2.0
        elif placement_mode == "ground" and anchor.get("placementMode") == "ground":
            score += 1.4

        if preferred_surface_hint and anchor_surface_hint == preferred_surface_hint:
            score += 2.8

        if _includes_any(normalized_text, keywords):
            score += 2.4
        label = str(anchor.get("label") or "").lower()
        if label and label in normalized_text:
            score += 1.2

        if priority == "high" and str(anchor.get("preferredZonePurpose") or "") in {"counter", "prep", "hero", "display"}:
            score += 0.6
        if placement_mode == "wall" and anchor.get("wallTarget"):
            score += 0.35
        if placement_mode == "surface" and str(anchor.get("preferredZonePurpose") or "") in {"counter", "prep", "dining"}:
            score += 0.45

        if score > best_score:
            best_score = score
            best_anchor = anchor

    return best_anchor if best_score >= 1.25 else None


def _has_explicit_directional_hint(placement_hint: str) -> bool:
    lowered = placement_hint.lower()
    return _includes_any(
        lowered,
        [
            "left",
            "right",
            "center",
            "foreground",
            "background",
            "front",
            "back",
            "behind",
            "next to",
            "camera-left",
            "camera-right",
        ],
    )


def _apply_layout_guidance_metadata(
    *,
    metadata: Dict[str, Any],
    placement_mode: str,
    priority: str,
    placement_hint: str,
    layout_guidance: Dict[str, Any],
) -> None:
    if not layout_guidance or _has_explicit_directional_hint(placement_hint):
        return

    suggested_zones = layout_guidance.get("suggestedZones")
    if not isinstance(suggested_zones, dict):
        return

    if priority == "high":
        hero_zone = suggested_zones.get("hero") if isinstance(suggested_zones.get("hero"), dict) else {}
        metadata["shotZoneX"] = hero_zone.get("xBias")
        metadata["shotDepthZone"] = hero_zone.get("depthZone")
        metadata["shotAwarePlacement"] = True
        return

    if priority == "medium":
        supporting_zone = suggested_zones.get("supporting") if isinstance(suggested_zones.get("supporting"), dict) else {}
        side = supporting_zone.get("side")
        metadata["shotZoneX"] = -0.68 if side == "left" else 0.68 if side == "right" else 0
        metadata["shotDepthZone"] = supporting_zone.get("depthZone")
        metadata["shotAwarePlacement"] = True
    else:
        background_zone = suggested_zones.get("background") if isinstance(suggested_zones.get("background"), dict) else {}
        metadata["shotZoneX"] = 0
        metadata["shotDepthZone"] = background_zone.get("depthZone")
        metadata["shotAwarePlacement"] = True

    if placement_mode == "wall":
        background_zone = suggested_zones.get("background") if isinstance(suggested_zones.get("background"), dict) else {}
        metadata["preferredWallTarget"] = _normalize_wall_target(background_zone.get("wallTarget"), str(metadata.get("preferredWallTarget") or "backWall"))


def _apply_layout_object_anchor_metadata(
    *,
    metadata: Dict[str, Any],
    layout_guidance: Dict[str, Any],
    placement_mode: str,
    priority: str,
    text: str,
) -> None:
    preferred_surface_hint = str(metadata.get("surfaceHint") or "").strip() or None
    anchor = _find_best_layout_object_anchor(
        layout_guidance=layout_guidance,
        placement_mode=placement_mode,
        text=text,
        preferred_surface_hint=preferred_surface_hint,
        priority=priority,
    )
    if not anchor:
        return

    metadata["layoutAnchorId"] = anchor.get("id")
    metadata["layoutAnchorKind"] = anchor.get("kind")
    metadata["layoutAnchorConfidence"] = anchor.get("confidence")
    if anchor.get("preferredZonePurpose"):
        metadata["preferredZonePurpose"] = anchor.get("preferredZonePurpose")

    anchor_surface_hint = _get_layout_anchor_surface_hint(str(anchor.get("kind") or ""))
    if placement_mode == "surface" and anchor_surface_hint:
        metadata["surfaceHint"] = anchor_surface_hint
    if placement_mode == "wall" and anchor.get("wallTarget"):
        metadata["preferredWallTarget"] = anchor.get("wallTarget")

    shot_zone_x = _get_layout_anchor_shot_zone_x(anchor)
    shot_depth_zone = _get_layout_anchor_depth_zone(anchor)
    if shot_zone_x is not None:
        metadata["shotZoneX"] = shot_zone_x
        metadata["shotAwarePlacement"] = True
    if shot_depth_zone:
        metadata["shotDepthZone"] = shot_depth_zone
        metadata["shotAwarePlacement"] = True


def _placement_rank(request: Dict[str, Any]) -> int:
    metadata = request.get("metadata") or {}
    if metadata.get("assetBrainAnchorRole") == "surface_anchor":
        return 0
    placement_mode = str(metadata.get("placementMode") or "ground")
    if placement_mode == "ground":
        return 1
    if placement_mode == "wall":
        return 2
    if placement_mode == "surface":
        return 3
    return 4


def _priority_rank(request: Dict[str, Any]) -> int:
    priority = str(request.get("priority") or "medium")
    if priority == "high":
        return 0
    if priority == "medium":
        return 1
    return 2


def _choose_match(matches: List[Dict[str, Any]], selected_asset_ids: set[str]) -> Optional[Dict[str, Any]]:
    if not matches:
        return None
    for match in matches:
        entry = match.get("entry") if isinstance(match, dict) else None
        asset_id = str((entry or {}).get("id") or "")
        if asset_id and asset_id not in selected_asset_ids:
            return match
    return matches[0]


def _is_surface_anchor_entry(entry: Dict[str, Any]) -> bool:
    profile = entry.get("placementProfile") if isinstance(entry.get("placementProfile"), dict) else {}
    return str(profile.get("anchorRole") or "none") == "surface_anchor"


def _get_surface_anchor_types_from_request(request: Dict[str, Any]) -> List[str]:
    metadata = request.get("metadata") if isinstance(request.get("metadata"), dict) else {}
    explicit = metadata.get("surfaceHint")
    if isinstance(explicit, str) and explicit.strip():
        return [explicit.strip()]

    profile_types = metadata.get("assetBrainSurfaceAnchorTypes")
    if isinstance(profile_types, list):
        return [str(value) for value in profile_types if str(value).strip()]

    return []


def _is_compatible_anchor_request(anchor_request: Dict[str, Any], anchor_types: List[str]) -> bool:
    metadata = anchor_request.get("metadata") if isinstance(anchor_request.get("metadata"), dict) else {}
    if str(metadata.get("assetBrainAnchorRole") or "none") != "surface_anchor":
        return False

    if not anchor_types:
        return True

    candidate_types = metadata.get("assetBrainSurfaceAnchorTypes")
    if not isinstance(candidate_types, list):
        return False

    candidate_values = {str(value) for value in candidate_types}
    return any(anchor_type in candidate_values for anchor_type in anchor_types)


def _find_anchor_request_for_surface(
    requests: List[Dict[str, Any]],
    surface_request: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    metadata = surface_request.get("metadata") if isinstance(surface_request.get("metadata"), dict) else {}
    preferred_anchor_asset_id = metadata.get("preferredAnchorAssetId")
    if isinstance(preferred_anchor_asset_id, str) and preferred_anchor_asset_id:
        for candidate in requests:
            if str(candidate.get("assetId") or "") == preferred_anchor_asset_id:
                return candidate

    desired_anchor_types = _get_surface_anchor_types_from_request(surface_request)
    for candidate in requests:
        if candidate is surface_request:
            continue
        if _is_compatible_anchor_request(candidate, desired_anchor_types):
            return candidate
    return None


def _infer_anchor_placement_hint(surface_request: Dict[str, Any]) -> str:
    placement_hint = str(surface_request.get("placementHint") or "").lower()
    if "left" in placement_hint:
        return "Left foreground"
    if "right" in placement_hint:
        return "Right foreground"
    return "Center foreground"


def _create_auto_added_anchor_request(
    *,
    entry: Dict[str, Any],
    surface_request: Dict[str, Any],
) -> Dict[str, Any]:
    profile = entry.get("placementProfile") if isinstance(entry.get("placementProfile"), dict) else {}
    surface_anchor_types = profile.get("surfaceAnchorTypes") if isinstance(profile.get("surfaceAnchorTypes"), list) else []
    return {
        "assetId": entry["id"],
        "name": entry.get("name") or entry["id"],
        "description": f"Auto-added anchor for {surface_request.get('name') or entry['id']}",
        "priority": "medium",
        "placementHint": _infer_anchor_placement_hint(surface_request),
        "metadata": {
            "placementMode": profile.get("defaultPlacementMode") or "ground",
            "surfaceHint": surface_anchor_types[0] if surface_anchor_types else None,
            "assetBrainAnchorRole": profile.get("anchorRole"),
            "assetBrainDimensions": profile.get("dimensions"),
            "assetBrainSurfaceAnchorTypes": surface_anchor_types,
            "assetBrainMinClearance": profile.get("minClearance"),
            "assetBrainWallYOffset": profile.get("wallYOffset"),
            "autoAddedByAssembly": "support_anchor",
            "supportsAssetId": surface_request.get("assetId"),
        },
    }


def _infer_anchor_entry_for_surface(
    *,
    retrieval_service: AssetRetrievalService,
    surface_request: Dict[str, Any],
    room_type: str,
    context_text: str,
) -> Optional[Dict[str, Any]]:
    anchor_types = _get_surface_anchor_types_from_request(surface_request)
    search_terms = " ".join(
        value for value in [
            str(surface_request.get("name") or ""),
            str(surface_request.get("description") or ""),
            "support anchor",
            " ".join(anchor_types),
        ] if value
    ).strip()
    retrieval = retrieval_service.search(
        text=search_terms or "support anchor",
        placement_hint=str(surface_request.get("placementHint") or ""),
        context_text=context_text,
        asset_types=["prop"],
        preferred_room_types=[room_type],
        surface_anchor=anchor_types[0] if anchor_types else None,
        category_hint="supporting",
        limit=8,
        min_score=0.45,
    )
    matches = retrieval.get("matches") if isinstance(retrieval, dict) else []
    for match in matches:
        entry = match.get("entry") if isinstance(match, dict) else None
        if not isinstance(entry, dict):
            continue
        if not _is_surface_anchor_entry(entry):
            continue
        if anchor_types:
            profile = entry.get("placementProfile") if isinstance(entry.get("placementProfile"), dict) else {}
            candidate_types = profile.get("surfaceAnchorTypes") if isinstance(profile.get("surfaceAnchorTypes"), list) else []
            if not any(anchor_type in {str(value) for value in candidate_types} for anchor_type in anchor_types):
                continue
        return entry
    return None


class EnvironmentAssemblyService:
    def __init__(self, retrieval_service: Optional[AssetRetrievalService] = None) -> None:
        self.retrieval_service = retrieval_service or AssetRetrievalService()

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": "local_scenegraph",
            "usesAssetRetrieval": True,
            "supportsRuntimeRequests": True,
            "supportsShellNormalization": True,
            "supportsAutoAddedAnchors": True,
            "supportsLayoutGuidance": True,
        }

    def assemble(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        prompt = str(plan.get("prompt") or "")
        layout_guidance = _normalize_plan_layout_hints(plan)
        shell = build_room_shell_spec(
            plan.get("roomShell") if isinstance(plan.get("roomShell"), dict) else {},
            prompt=prompt,
            layout_hints=layout_guidance,
        )

        effective_plan = dict(plan)
        effective_plan["roomShell"] = shell
        concept = str(effective_plan.get("concept") or "Environment")
        plan_id = str(effective_plan.get("planId") or "environment-plan")
        summary = str(effective_plan.get("summary") or "")
        recommended_preset_id = effective_plan.get("recommendedPresetId")
        room_type = str(shell.get("type") or "studio_shell")
        surfaces = effective_plan.get("surfaces") if isinstance(effective_plan.get("surfaces"), list) else []
        prop_suggestions = effective_plan.get("props") if isinstance(effective_plan.get("props"), list) else []
        context_text = " ".join([concept, summary, prompt]).strip()

        runtime_props: List[Dict[str, Any]] = []
        selected_asset_ids: set[str] = set()
        auto_added_asset_ids: List[str] = []

        for index, suggestion in enumerate(prop_suggestions):
            if not isinstance(suggestion, dict):
                continue

            name = str(suggestion.get("name") or f"prop-{index}")
            description = str(suggestion.get("description") or "")
            placement_hint = str(suggestion.get("placementHint") or "")
            category_hint = str(suggestion.get("category") or "supporting")
            priority = str(suggestion.get("priority") or "medium")
            preferred_mode = _infer_preferred_mode(placement_hint, description)
            surface_anchor = _infer_surface_anchor(placement_hint, description)

            retrieval = self.retrieval_service.search(
                text=" ".join([name, description]).strip(),
                placement_hint=placement_hint,
                context_text=context_text,
                asset_types=["prop"],
                preferred_placement_mode=preferred_mode,
                preferred_room_types=[room_type],
                surface_anchor=surface_anchor,
                category_hint=category_hint,
                limit=4,
                min_score=0.45,
            )
            matches = retrieval.get("matches") if isinstance(retrieval, dict) else []
            chosen = _choose_match(matches, selected_asset_ids)
            entry = chosen.get("entry") if isinstance(chosen, dict) else None
            if not isinstance(entry, dict):
                continue

            placement_profile = entry.get("placementProfile") if isinstance(entry.get("placementProfile"), dict) else {}
            placement_mode = str(placement_profile.get("defaultPlacementMode") or preferred_mode or "ground")
            anchor_role = str(placement_profile.get("anchorRole") or "none")
            surface_anchor_types = placement_profile.get("surfaceAnchorTypes") if isinstance(placement_profile.get("surfaceAnchorTypes"), list) else []
            metadata: Dict[str, Any] = {
                "placementMode": placement_mode,
                "priority": priority,
                "placementHint": placement_hint or None,
                "retrievalScore": chosen.get("score") if isinstance(chosen, dict) else None,
                "retrievalReasons": chosen.get("reasons") if isinstance(chosen, dict) else [],
                "preferredWallTarget": _infer_wall_target(placement_hint) if placement_mode == "wall" else None,
                "surfaceHint": surface_anchor or (surface_anchor_types[0] if surface_anchor_types else None),
                "assetBrainAnchorRole": anchor_role,
                "assetBrainDimensions": placement_profile.get("dimensions"),
                "assetBrainSurfaceAnchorTypes": surface_anchor_types,
                "assetBrainMinClearance": placement_profile.get("minClearance"),
                "assetBrainWallYOffset": placement_profile.get("wallYOffset"),
            }

            relative_type = _infer_relative_type(placement_hint)
            relative_side = _infer_relative_side(placement_hint)
            if relative_type:
                metadata["relativePlacementType"] = relative_type
                metadata["relativePlacementSide"] = relative_side

            _apply_layout_guidance_metadata(
                metadata=metadata,
                placement_mode=placement_mode,
                priority=priority,
                placement_hint=placement_hint,
                layout_guidance=layout_guidance,
            )
            _apply_layout_object_anchor_metadata(
                metadata=metadata,
                layout_guidance=layout_guidance,
                placement_mode=placement_mode,
                priority=priority,
                text=" ".join([name, description, placement_hint]).strip(),
            )

            runtime_props.append({
                "assetId": entry["id"],
                "name": name,
                "description": description or None,
                "priority": priority,
                "placementHint": placement_hint or None,
                "metadata": metadata,
            })
            selected_asset_ids.add(str(entry["id"]))

        for request in list(runtime_props):
            metadata = request.get("metadata") if isinstance(request.get("metadata"), dict) else {}
            if str(metadata.get("placementMode") or "ground") != "surface":
                continue

            existing_anchor = _find_anchor_request_for_surface(runtime_props, request)
            if existing_anchor:
                metadata["preferredAnchorAssetId"] = existing_anchor.get("assetId")
                continue

            anchor_entry = _infer_anchor_entry_for_surface(
                retrieval_service=self.retrieval_service,
                surface_request=request,
                room_type=room_type,
                context_text=context_text,
            )
            if not anchor_entry:
                matches = self.retrieval_service.search(
                    text=" ".join([
                        str(request.get("name") or ""),
                        str(request.get("description") or ""),
                        "support anchor",
                        " ".join(_get_surface_anchor_types_from_request(request)),
                    ]).strip(),
                    placement_hint=str(request.get("placementHint") or ""),
                    context_text=context_text,
                    asset_types=["prop"],
                    preferred_placement_mode="ground",
                    preferred_room_types=[room_type],
                    surface_anchor=(_get_surface_anchor_types_from_request(request) or [None])[0],
                    category_hint="supporting",
                    limit=8,
                    min_score=0.45,
                ).get("matches", [])
                for match in matches:
                    entry = match.get("entry") if isinstance(match, dict) else None
                    if not isinstance(entry, dict):
                        continue
                    if not _is_surface_anchor_entry(entry):
                        continue
                    request_types = _get_surface_anchor_types_from_request(request)
                    if request_types:
                        profile = entry.get("placementProfile") if isinstance(entry.get("placementProfile"), dict) else {}
                        candidate_types = profile.get("surfaceAnchorTypes") if isinstance(profile.get("surfaceAnchorTypes"), list) else []
                        if not any(anchor_type in {str(value) for value in candidate_types} for anchor_type in request_types):
                            continue
                    anchor_entry = entry
                    break

            if not anchor_entry:
                continue

            anchor_asset_id = str(anchor_entry.get("id") or "")
            if anchor_asset_id in selected_asset_ids:
                continue

            anchor_request = _create_auto_added_anchor_request(entry=anchor_entry, surface_request=request)
            runtime_props.append(anchor_request)
            selected_asset_ids.add(anchor_asset_id)
            auto_added_asset_ids.append(anchor_asset_id)
            metadata["preferredAnchorAssetId"] = anchor_asset_id

        ordered_requests = sorted(
            runtime_props,
            key=lambda request: (
                _placement_rank(request),
                _priority_rank(request),
                str(request.get("name") or ""),
                str(request.get("assetId") or ""),
            ),
        )

        shell_node_id = f"shell:{plan_id}"
        camera_node_id = "camera:primary"
        nodes: List[Dict[str, Any]] = [
            {
                "id": shell_node_id,
                "type": "room_shell",
                "label": concept,
                "role": "shell",
                "roomShell": shell,
                "metadata": {
                    "source": effective_plan.get("source"),
                    "recommendedPresetId": recommended_preset_id,
                },
            },
            {
                "id": camera_node_id,
                "type": "camera",
                "label": f"camera:{((effective_plan.get('camera') or {}).get('shotType') or 'default')}",
                "role": "shell",
                "metadata": {
                    "shotType": (effective_plan.get("camera") or {}).get("shotType"),
                    "positionHint": (effective_plan.get("camera") or {}).get("positionHint"),
                    "target": (effective_plan.get("camera") or {}).get("target"),
                    "fov": (effective_plan.get("camera") or {}).get("fov"),
                },
            },
        ]
        relationships: List[Dict[str, Any]] = [
            _create_relationship("contains", shell_node_id, camera_node_id, "Shell contains the active framing camera."),
        ]

        surface_node_ids: Dict[str, str] = {}
        for surface in surfaces:
            if not isinstance(surface, dict):
                continue
            target = str(surface.get("target") or "")
            if target not in VALID_SURFACE_TARGETS:
                continue
            node_id = f"surface:{target}"
            surface_node_ids[target] = node_id
            nodes.append({
                "id": node_id,
                "type": "surface",
                "label": f"{target}:{surface.get('materialId')}",
                "role": "shell",
                "surfaceTarget": target,
                "metadata": {
                    "materialId": surface.get("materialId"),
                    "visible": bool(surface.get("visible", True)),
                },
            })
            relationships.append(_create_relationship("contains", shell_node_id, node_id, "Shell owns the environment surfaces."))

        request_by_node_id: Dict[str, Dict[str, Any]] = {}
        hero_node_id: Optional[str] = None
        for index, request in enumerate(ordered_requests):
            asset_id = str(request.get("assetId") or f"prop-{index}")
            metadata = request.get("metadata") if isinstance(request.get("metadata"), dict) else {}
            node_id = f"prop:{index}:{asset_id}"
            metadata["assemblyNodeId"] = node_id
            role = _get_prop_role(
                str(request.get("priority") or "medium"),
                str(metadata.get("placementMode") or "ground"),
                str(metadata.get("assetBrainAnchorRole") or "none"),
            )
            nodes.append({
                "id": node_id,
                "type": "prop",
                "label": request.get("name") or asset_id,
                "assetId": asset_id,
                "placementMode": metadata.get("placementMode") or "ground",
                "role": role,
                "autoAdded": bool(metadata.get("autoAddedByAssembly")),
                "metadata": {
                    "priority": request.get("priority"),
                    "placementHint": request.get("placementHint"),
                    "preferredAnchorAssetId": metadata.get("preferredAnchorAssetId"),
                    "preferredWallTarget": metadata.get("preferredWallTarget"),
                    "preferredZonePurpose": metadata.get("preferredZonePurpose"),
                    "layoutAnchorKind": metadata.get("layoutAnchorKind"),
                    "layoutAnchorId": metadata.get("layoutAnchorId"),
                    "shotZoneX": metadata.get("shotZoneX"),
                    "shotDepthZone": metadata.get("shotDepthZone"),
                },
            })
            request_by_node_id[node_id] = request
            relationships.append(_create_relationship("contains", shell_node_id, node_id, "Shell contains assembled runtime props."))
            if role == "hero" and hero_node_id is None:
                hero_node_id = node_id

        for request in ordered_requests:
            metadata = request.get("metadata") if isinstance(request.get("metadata"), dict) else {}
            node_id = str(metadata.get("assemblyNodeId") or "")
            placement_mode = str(metadata.get("placementMode") or "ground")
            if not node_id:
                continue

            if placement_mode == "wall":
                wall_target = _normalize_wall_target(
                    metadata.get("preferredWallTarget"),
                    _infer_wall_target(str(request.get("placementHint") or "")),
                )
                surface_node_id = surface_node_ids.get(wall_target)
                if surface_node_id:
                    relationships.append(_create_relationship("attached_to", node_id, surface_node_id, "Wall prop is attached to a shell surface."))
                continue

            if placement_mode == "surface":
                anchor_request = _find_anchor_request_for_surface(ordered_requests, request)
                anchor_node_id = str(((anchor_request or {}).get("metadata") or {}).get("assemblyNodeId") or "")
                if anchor_node_id and anchor_node_id != node_id:
                    relationships.append(_create_relationship("supported_by", node_id, anchor_node_id, "Surface prop is supported by an anchor asset."))
                    relationships.append(_create_relationship("supports", anchor_node_id, node_id, "Anchor asset carries a surface prop."))

            relative_type = metadata.get("relativePlacementType")
            if isinstance(relative_type, str) and hero_node_id and hero_node_id != node_id:
                relationships.append(_create_relationship(relative_type, node_id, hero_node_id, "Placement hint requested relative staging."))

            placement_hint = str(request.get("placementHint") or "").lower()
            if hero_node_id and hero_node_id != node_id and str(metadata.get("assetBrainAnchorRole") or "none") != "surface_anchor":
                relationships.append(_create_relationship("near", node_id, hero_node_id, "Supporting props should cluster around the hero object."))
            if _includes_any(placement_hint, ["towards the camera", "toward the camera", "facing the camera", "towards camera", "toward camera"]):
                relationships.append(_create_relationship("facing", node_id, camera_node_id, "Placement hint requests that the asset faces the camera."))

        if hero_node_id:
            relationships.append(_create_relationship("hero_focus", shell_node_id, hero_node_id, "Hero prop should stay in the primary composition field."))

        return {
            "success": True,
            "provider": "local_scenegraph",
            "shell": shell,
            "assembly": {
                "planId": plan_id,
                "nodes": nodes,
                "relationships": _dedupe_relationships(relationships),
                "autoAddedAssetIds": auto_added_asset_ids,
            },
            "runtimeProps": ordered_requests,
        }
