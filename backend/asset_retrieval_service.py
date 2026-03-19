"""
Asset retrieval service for AI worldbuilding.

Builds a lightweight local embedding index over props, wall materials and floor
materials so planners and scene assembly can retrieve relevant assets from text.
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

EMBEDDING_DIMENSION = 192

STOP_WORDS = {
    "a",
    "an",
    "and",
    "at",
    "background",
    "behind",
    "center",
    "centered",
    "for",
    "foreground",
    "frame",
    "in",
    "just",
    "of",
    "on",
    "or",
    "slightly",
    "the",
    "to",
    "towards",
    "with",
}

CANONICAL_TOKEN_MAP = {
    "glasses": "glass",
    "greenery": "plant",
    "herbs": "herb",
    "magenta": "pink",
    "pizzeria": "pizza",
    "posters": "poster",
    "shelving": "shelf",
    "signage": "sign",
    "signs": "sign",
    "tabletop": "table",
    "vanity": "beauty",
}

ROOM_TYPE_TOKEN_MAP = {
    "beauty": ["beauty", "editorial", "fashion", "studio"],
    "pizza": ["pizza", "pizzeria", "restaurant", "food", "kitchen"],
    "neon": ["cyberpunk", "urban", "futuristic", "night"],
    "podium": ["product", "beauty", "editorial"],
    "plant": ["lifestyle", "editorial", "interior"],
    "wine": ["restaurant", "lifestyle"],
}

PROP_SYNONYMS_BY_ID = {
    "beauty_table": ["beauty table", "makeup table", "vanity table", "editorial workstation", "cosmetics station"],
    "chair_posing": ["chair", "posing chair", "portrait chair"],
    "counter_pizza_prep": ["counter", "prep counter", "pizza counter", "kitchen island"],
    "display_shelf_wall": ["display shelf", "wall shelf", "shelf"],
    "herb_pots_cluster": ["herb pots", "basil pots", "small potted herbs"],
    "menu_board_wall": ["menu board", "poster", "sign board", "framed sign"],
    "neon_sign_cyan": ["cyan neon sign", "blue neon sign", "neon signage"],
    "neon_sign_magenta": ["magenta neon sign", "pink neon sign", "neon signage"],
    "oven_facade_brick": ["oven facade", "pizza oven", "wood-fired oven"],
    "pizza_hero_display": ["hero pizza", "whole pizza", "pizza display"],
    "pizza_peel_wall": ["pizza peel", "wooden pizza peel"],
    "plant_potted": ["plant", "potted plant", "greenery"],
    "product_podium_round": ["podium", "pedestal", "product podium", "display pedestal"],
    "reflective_panel": ["reflective panel", "bounce panel", "reflector"],
    "restaurant_props_cluster": ["set dressing", "table props", "restaurant props"],
    "stool_wooden": ["stool", "wooden stool"],
    "table_rustic": ["rustic table", "wooden table", "hero table", "dining table"],
    "table_small": ["small table", "side table"],
    "vase_ceramic": ["vase", "ceramic vase"],
    "wine_bottle_red": ["wine bottle", "red bottle"],
    "wine_glass_clear": ["wine glass", "glass stemware"],
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def tokenize(text: str) -> List[str]:
    normalized = normalize_text(text)
    raw_tokens = re.split(r"[^a-z0-9]+", normalized)
    tokens: List[str] = []
    for token in raw_tokens:
        if len(token) <= 1:
            continue
        token = CANONICAL_TOKEN_MAP.get(token, token)
        if token in STOP_WORDS:
            continue
        tokens.append(token)
    return tokens


def build_character_ngrams(text: str) -> List[str]:
    collapsed = re.sub(r"[^a-z0-9]+", " ", normalize_text(text)).strip()
    if not collapsed:
        return []

    compact = f" {collapsed} "
    ngrams: List[str] = []
    for index in range(len(compact) - 2):
        gram = compact[index:index + 3].strip()
        if len(gram) >= 2:
            ngrams.append(gram)
    return ngrams


def stable_hash(value: str) -> int:
    hash_value = 2166136261
    for char in value:
        hash_value ^= ord(char)
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF
    return hash_value


def add_feature(vector: List[float], feature: str, weight: float) -> None:
    hash_value = stable_hash(feature)
    base_index = hash_value % EMBEDDING_DIMENSION
    signed_weight = weight if (hash_value & 1) == 0 else -weight
    vector[base_index] += signed_weight

    secondary_index = (base_index * 31 + 17) % EMBEDDING_DIMENSION
    vector[secondary_index] += signed_weight * 0.45


def normalize_vector(vector: List[float]) -> List[float]:
    magnitude = math.sqrt(sum(value * value for value in vector))
    if not magnitude:
        return vector
    return [value / magnitude for value in vector]


def cosine_similarity(left: List[float], right: List[float]) -> float:
    return sum(left[index] * right[index] for index in range(min(len(left), len(right))))


def create_embedding(text: str, weighted_lexicon: List[Tuple[str, float]]) -> List[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    normalized = normalize_text(text)

    for token in tokenize(normalized):
        add_feature(vector, f"tok:{token}", 1.0)
    for ngram in build_character_ngrams(normalized):
        add_feature(vector, f"ng:{ngram}", 0.22)
    for value, weight in weighted_lexicon:
        for token in tokenize(value):
            add_feature(vector, f"lex:{token}", weight)
        for ngram in build_character_ngrams(value):
            add_feature(vector, f"lex-ng:{ngram}", weight * 0.18)

    return normalize_vector(vector)


def unique(values: List[Optional[str]]) -> List[str]:
    seen = set()
    result: List[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def infer_room_types(tokens: List[str], tags: List[str]) -> List[str]:
    combined = set(tokens + tags)
    room_types = set()
    for token in combined:
        for room_type in ROOM_TYPE_TOKEN_MAP.get(token, []):
            room_types.add(room_type)
    return sorted(room_types)


def infer_styles(tokens: List[str], tags: List[str]) -> List[str]:
    candidates = [
        "beauty",
        "clean",
        "classic",
        "cyberpunk",
        "dramatic",
        "editorial",
        "industrial",
        "luxury",
        "modern",
        "moody",
        "neon",
        "rustic",
        "studio",
        "urban",
        "warm",
    ]
    lookup = set(tokens + tags)
    return [candidate for candidate in candidates if candidate in lookup]


def extract_string(block: str, field: str) -> Optional[str]:
    match = re.search(rf"{re.escape(field)}:\s*'([^']+)'", block)
    return match.group(1) if match else None


def extract_number(block: str, field: str) -> Optional[float]:
    match = re.search(rf"{re.escape(field)}:\s*([0-9]+(?:\.[0-9]+)?)", block)
    if not match:
        return None
    try:
        return float(match.group(1))
    except Exception:
        return None


def extract_string_list(block: str, field: str) -> List[str]:
    match = re.search(rf"{re.escape(field)}:\s*\[(.*?)\]", block, re.DOTALL)
    if not match:
        return []
    return re.findall(r"'([^']+)'", match.group(1))


def extract_nested_block(block: str, field: str) -> str:
    match = re.search(rf"{re.escape(field)}:\s*\{{", block)
    if not match:
        return ""
    start = match.end() - 1
    depth = 0
    for index in range(start, len(block)):
        char = block[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return block[start:index + 1]
    return ""


def extract_array_body(source: str, export_name: str) -> str:
    match = re.search(
        rf"export const {re.escape(export_name)}[^=]*=\s*\[(?P<body>.*?)\n\];",
        source,
        re.DOTALL,
    )
    return match.group("body") if match else ""


def extract_object_blocks(array_body: str) -> List[str]:
    blocks: List[str] = []
    depth = 0
    start_index: Optional[int] = None

    for index, char in enumerate(array_body):
        if char == "{":
            if depth == 0:
                start_index = index
            depth += 1
        elif char == "}":
            if depth == 0:
                continue
            depth -= 1
            if depth == 0 and start_index is not None:
                blocks.append(array_body[start_index:index + 1])
                start_index = None
    return blocks


class AssetRetrievalService:
    def __init__(self) -> None:
        self.repo_root = Path(__file__).resolve().parent.parent
        self.entries = self._load_entries()
        self.embeddings_by_id = {
            entry["id"]: create_embedding(
                entry["searchText"],
                [(value, 1.2) for value in entry["synonyms"]]
                + [(value, 0.9) for value in entry["tags"]]
                + [(value, 0.7) for value in entry["roomTypes"]]
                + [(value, 0.65) for value in entry["styles"]]
                + [(value, 0.55) for value in entry["moods"]]
                + [(value, 0.3) for value in entry["colors"]],
            )
            for entry in self.entries
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": "local_hybrid",
            "entryCount": len(self.entries),
            "assetTypes": ["prop", "wall", "floor"],
            "embeddingDimension": EMBEDDING_DIMENSION,
        }

    def search(
        self,
        *,
        text: str,
        placement_hint: str = "",
        context_text: str = "",
        asset_types: Optional[List[str]] = None,
        preferred_placement_mode: Optional[str] = None,
        preferred_room_types: Optional[List[str]] = None,
        surface_anchor: Optional[str] = None,
        category_hint: Optional[str] = None,
        limit: int = 5,
        min_score: float = 0.75,
    ) -> Dict[str, Any]:
        primary_tokens = tokenize(text)
        placement_tokens = tokenize(placement_hint)
        context_tokens = tokenize(context_text)
        room_type_tokens = unique((preferred_room_types or []) + [token for token in context_tokens if len(token) > 2])
        query_embedding = create_embedding(
            " ".join([value for value in [text, placement_hint, context_text] if value]),
            [(value, 0.8) for value in (preferred_room_types or [])]
            + ([(preferred_placement_mode, 0.75)] if preferred_placement_mode else [])
            + ([(surface_anchor, 0.8)] if surface_anchor else []),
        )

        matches: List[Dict[str, Any]] = []
        for entry in self.entries:
            if asset_types and entry["assetType"] not in asset_types:
                continue
            match = self._score_entry(
                entry=entry,
                primary_tokens=primary_tokens,
                placement_tokens=placement_tokens,
                context_tokens=context_tokens,
                room_type_tokens=room_type_tokens,
                category_hint=category_hint,
                preferred_placement_mode=preferred_placement_mode,
                surface_anchor=surface_anchor,
                query_embedding=query_embedding,
                query_text=text,
            )
            if match and match["score"] >= min_score:
                matches.append(match)

        matches.sort(key=lambda item: (-item["score"], item["entry"]["name"]))
        trimmed = matches[: max(1, min(limit, 24))]

        return {
            "success": True,
            "provider": "local_hybrid",
            "matches": trimmed,
        }

    def _load_entries(self) -> List[Dict[str, Any]]:
        return [
            *self._load_prop_entries(),
            *self._load_wall_entries(),
            *self._load_floor_entries(),
        ]

    def _read_source(self, relative_path: str) -> str:
        return (self.repo_root / relative_path).read_text(encoding="utf-8")

    def _load_prop_entries(self) -> List[Dict[str, Any]]:
        source = self._read_source("src/core/data/propDefinitions.ts")
        array_body = extract_array_body(source, "PROP_DEFINITIONS")
        entries: List[Dict[str, Any]] = []

        for block in extract_object_blocks(array_body):
            asset_id = extract_string(block, "id")
            name = extract_string(block, "name")
            description = extract_string(block, "description") or ""
            category = extract_string(block, "category") or "prop"
            if not asset_id or not name:
                continue

            metadata = extract_nested_block(block, "metadata")
            primitive = extract_string(metadata, "primitive") or ""
            explicit_placement = extract_string(metadata, "placementMode")
            default_placement_mode = explicit_placement if explicit_placement in {"wall", "surface"} else "ground"
            if primitive in {"menu-board", "neon-sign", "display-shelf", "pizza-peel"}:
                default_placement_mode = "wall"

            anchor_role = (
                "surface_anchor"
                if primitive in {"table-small", "rustic-table", "counter", "beauty-table"}
                else ("wall_display" if default_placement_mode == "wall" else "none")
            )
            inferred_anchor_type = (
                "counter"
                if primitive == "counter"
                else ("shelf" if primitive == "display-shelf" else ("table" if anchor_role == "surface_anchor" else None))
            )
            surface_anchor_types = unique([
                inferred_anchor_type,
                extract_string(metadata, "surfaceHint"),
                extract_string(metadata, "surfaceAnchor"),
                "table" if anchor_role == "surface_anchor" else None,
            ])
            width = extract_number(metadata, "width")
            height = extract_number(metadata, "height")
            depth = extract_number(metadata, "depth")
            diameter = extract_number(metadata, "diameter")
            footprint_width = width or diameter or 0.8
            footprint_depth = depth or diameter or 0.8
            min_clearance = max(0.18, min(0.6, max(footprint_width, footprint_depth) * 0.2))
            wall_y_offset = max(1.35, ((height or 0.6) * 0.75) + 1.0) if default_placement_mode == "wall" else 0

            description_text = " ".join(filter(None, [name, description, asset_id, primitive]))
            base_tokens = tokenize(description_text)
            synonyms = PROP_SYNONYMS_BY_ID.get(asset_id, [])
            tags = unique(
                base_tokens
                + [token for synonym in synonyms for token in tokenize(synonym)]
                + [category, extract_string(block, "size"), extract_string(block, "complexity"), extract_string(metadata, "surfaceHint"), extract_string(metadata, "surfaceAnchor")]
            )
            room_types = infer_room_types(base_tokens, tags)
            styles = infer_styles(base_tokens, tags)
            moods = unique(styles + (["night"] if "cyberpunk" in room_types else []) + (["warm"] if "restaurant" in room_types else []))

            entries.append({
                "id": asset_id,
                "assetType": "prop",
                "name": name,
                "category": category,
                "searchText": description_text,
                "tokens": unique(base_tokens),
                "keywords": tags,
                "synonyms": synonyms,
                "tags": tags,
                "moods": moods,
                "styles": styles,
                "roomTypes": room_types,
                "colors": unique([
                    extract_string(metadata, "color"),
                    extract_string(metadata, "accentColor"),
                    extract_string(metadata, "emissiveColor"),
                ]),
                "placementProfile": {
                    "defaultPlacementMode": default_placement_mode,
                    "supportedModes": [default_placement_mode],
                    "surfaceAnchorTypes": surface_anchor_types,
                    "anchorRole": anchor_role,
                    "minClearance": min_clearance,
                    "wallYOffset": wall_y_offset,
                    "dimensions": {
                        "width": width,
                        "height": height,
                        "depth": depth,
                        "diameter": diameter,
                        "footprintWidth": footprint_width,
                        "footprintDepth": footprint_depth,
                    },
                },
            })

        return entries

    def _load_wall_entries(self) -> List[Dict[str, Any]]:
        source = self._read_source("src/data/wallDefinitions.ts")
        array_body = extract_array_body(source, "WALL_MATERIALS")
        entries: List[Dict[str, Any]] = []

        for block in extract_object_blocks(array_body):
            asset_id = extract_string(block, "id")
            name = extract_string(block, "name")
            name_no = extract_string(block, "nameNo")
            category = extract_string(block, "category") or "wall"
            if not asset_id or not name:
                continue

            tags = unique(tokenize(" ".join(filter(None, [name, name_no, asset_id, category]))) + extract_string_list(block, "tags") + extract_string_list(block, "moodTags"))
            entries.append({
                "id": asset_id,
                "assetType": "wall",
                "name": name_no or name,
                "category": category,
                "searchText": " ".join(filter(None, [name, name_no, asset_id, category] + extract_string_list(block, "tags") + extract_string_list(block, "moodTags"))),
                "tokens": tokenize(" ".join(filter(None, [name, name_no, asset_id, category]))),
                "keywords": tags,
                "synonyms": [],
                "tags": tags,
                "moods": extract_string_list(block, "moodTags"),
                "styles": infer_styles(tags, tags),
                "roomTypes": infer_room_types(tags, tags),
                "colors": unique([
                    extract_string(block, "color"),
                    extract_string(block, "emissive"),
                ] + extract_string_list(block, "gradientColors")),
                "placementProfile": None,
            })
        return entries

    def _load_floor_entries(self) -> List[Dict[str, Any]]:
        source = self._read_source("src/data/floorDefinitions.ts")
        array_body = extract_array_body(source, "FLOOR_MATERIALS")
        entries: List[Dict[str, Any]] = []

        for block in extract_object_blocks(array_body):
            asset_id = extract_string(block, "id")
            name = extract_string(block, "name")
            name_no = extract_string(block, "nameNo")
            category = extract_string(block, "category") or "floor"
            if not asset_id or not name:
                continue

            tags = unique(tokenize(" ".join(filter(None, [name, name_no, asset_id, category]))) + extract_string_list(block, "tags") + extract_string_list(block, "moodTags"))
            entries.append({
                "id": asset_id,
                "assetType": "floor",
                "name": name_no or name,
                "category": category,
                "searchText": " ".join(filter(None, [name, name_no, asset_id, category] + extract_string_list(block, "tags") + extract_string_list(block, "moodTags"))),
                "tokens": tokenize(" ".join(filter(None, [name, name_no, asset_id, category]))),
                "keywords": tags,
                "synonyms": [],
                "tags": tags,
                "moods": extract_string_list(block, "moodTags"),
                "styles": infer_styles(tags, tags),
                "roomTypes": infer_room_types(tags, tags),
                "colors": unique([
                    extract_string(block, "color"),
                    extract_string(block, "emissive"),
                ]),
                "placementProfile": None,
            })
        return entries

    def _score_entry(
        self,
        *,
        entry: Dict[str, Any],
        primary_tokens: List[str],
        placement_tokens: List[str],
        context_tokens: List[str],
        room_type_tokens: List[str],
        category_hint: Optional[str],
        preferred_placement_mode: Optional[str],
        surface_anchor: Optional[str],
        query_embedding: List[float],
        query_text: str,
    ) -> Optional[Dict[str, Any]]:
        score = 0.0
        reasons: List[str] = []
        matched_tokens: List[str] = []
        normalized_query = normalize_text(query_text)
        normalized_name = normalize_text(entry["name"])
        searchable_keywords = unique(entry["keywords"] + [token for synonym in entry["synonyms"] for token in tokenize(synonym)])
        query_tokens = unique(primary_tokens + placement_tokens + context_tokens)

        if normalized_query and (normalized_query in normalized_name or normalized_name in normalized_query):
            score += 7.0
            reasons.append("navnefrase")

        primary_matches = [token for token in primary_tokens if token in entry["tokens"]]
        if primary_matches:
            score += len(primary_matches) * 2.8
            matched_tokens.extend(primary_matches)
            reasons.append("kjerneord: " + ", ".join(primary_matches))

        keyword_matches = [token for token in query_tokens if token in searchable_keywords]
        if keyword_matches:
            score += len(keyword_matches) * 1.35
            matched_tokens.extend(keyword_matches)
            reasons.append("tags: " + ", ".join(keyword_matches))

        room_matches = [token for token in room_type_tokens if token in entry["roomTypes"]]
        if room_matches:
            score += len(room_matches) * 0.9
            reasons.append("romtype: " + ", ".join(room_matches))

        style_matches = [token for token in context_tokens if token in entry["styles"] or token in entry["moods"]]
        if style_matches:
            score += len(style_matches) * 0.55
            reasons.append("stil: " + ", ".join(style_matches))

        embedding = self.embeddings_by_id.get(entry["id"])
        if embedding:
            vector_similarity = cosine_similarity(query_embedding, embedding)
            if vector_similarity > 0.08:
                score += vector_similarity * 5.5
                reasons.append(f"vektor: {vector_similarity:.2f}")

        placement_profile = entry.get("placementProfile") or {}
        if preferred_placement_mode and placement_profile:
            supported_modes = placement_profile.get("supportedModes") or []
            if preferred_placement_mode in supported_modes:
                score += 2.6
                reasons.append(f"plassering: {preferred_placement_mode}")
            else:
                score -= 2.4

        if surface_anchor and surface_anchor in (placement_profile.get("surfaceAnchorTypes") or []):
            score += 1.8
            reasons.append(f"anker: {surface_anchor}")

        if category_hint == "hero":
            if "hero" in entry["tags"] or "hero" in entry["name"].lower():
                score += 1.5
            if placement_profile.get("anchorRole") == "surface_anchor":
                score -= 0.6

        if category_hint == "set_dressing" and placement_profile.get("anchorRole") == "surface_anchor":
            score -= 0.3

        if entry["assetType"] == "prop" and placement_profile.get("defaultPlacementMode") == "surface" and not preferred_placement_mode:
            score += 0.2

        if score <= 0:
            return None

        return {
            "entry": entry,
            "score": round(score, 3),
            "reasons": reasons,
            "matchedTokens": unique(matched_tokens),
        }
