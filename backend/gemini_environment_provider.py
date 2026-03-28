"""
Gemini-backed internal providers for environment layout analysis and validation.

These providers expose the same JSON contracts as the external layout/validation
endpoints so the rest of the pipeline can target `internal://...` URLs without
being coupled to a specific port or transport.
"""

from __future__ import annotations

import base64
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx


def _extract_json_payload(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def _clamp_score(value: Any, fallback: float = 0.5) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = fallback
    return round(max(0.0, min(1.0, numeric)), 3)


def _extract_heuristic_scores(heuristic_evaluation: Optional[Dict[str, Any]]) -> Dict[str, float]:
    if not isinstance(heuristic_evaluation, dict):
        return {}
    categories = heuristic_evaluation.get("categories")
    if not isinstance(categories, dict):
        return {}
    normalized: Dict[str, float] = {}
    for key, value in categories.items():
        if not isinstance(value, dict):
            continue
        normalized[str(key)] = _clamp_score(value.get("score"), 0.0)
    return normalized


class GeminiEnvironmentProvider:
    def __init__(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        self.model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.enabled = bool(self.api_key)
        self.timeout_seconds = max(8.0, float(os.environ.get("GEMINI_PROVIDER_TIMEOUT_SECONDS", "45")))

    def get_status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": "gemini_internal",
            "model": self.model,
        }

    def _data_url_to_inline_data(self, value: str) -> Optional[Dict[str, str]]:
        if not isinstance(value, str) or not value.startswith("data:"):
            return None
        try:
            header, payload = value.split(",", 1)
        except ValueError:
            return None
        if ";base64" not in header:
            return None
        mime_type = header.split(":", 1)[1].split(";", 1)[0].strip() or "image/png"
        try:
            base64.b64decode(payload, validate=True)
        except Exception:
            return None
        return {
            "mime_type": mime_type,
            "data": payload,
        }

    def _request_json(self, parts: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("Gemini internal provider is not configured")

        payload = {
            "contents": [{
                "role": "user",
                "parts": parts,
            }],
            "generationConfig": {
                "temperature": 0.15,
                "responseMimeType": "application/json",
            },
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemini internal provider returned no candidates")
        raw_parts = candidates[0].get("content", {}).get("parts", [])
        text = "\n".join(
            part.get("text", "")
            for part in raw_parts
            if isinstance(part, dict) and part.get("text")
        ).strip()
        if not text:
            raise RuntimeError("Gemini internal provider returned empty JSON content")
        return _extract_json_payload(text)

    def analyze_layout(
        self,
        *,
        reference_images: List[str],
        prompt: str,
        preferred_room_type: Optional[str],
        segmentation_prompts: Optional[List[str]] = None,
        layout_options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not reference_images:
            raise ValueError("reference_images is required")

        instruction = {
            "task": "image_to_environment_layout",
            "goal": "Infer structured room, depth, openings, planes, anchors and camera hints from the reference images.",
            "rules": [
                "Return valid JSON only.",
                "Prefer realistic commercial set interpretation over generic studio answers.",
                "If uncertain, still make the best structured estimate and lower confidence scores.",
                "Use wall targets backWall|leftWall|rightWall|rearWall.",
                "Use room types studio_shell|interior_room|warehouse|storefront|abstract_stage|outdoor_illusion.",
            ],
            "prompt": prompt,
            "preferredRoomType": preferred_room_type,
            "segmentationPrompts": segmentation_prompts or [],
            "layoutOptions": layout_options or {},
            "responseSchema": {
                "provider": "gemini_layout",
                "summary": "short string",
                "capabilities": {
                    "supportsDepthEstimation": True,
                    "supportsSegmentation": True,
                },
                "layoutHints": {
                    "aggregate": {
                        "roomType": "storefront",
                        "composition": "centered|left_weighted|right_weighted",
                        "cameraElevation": "low|mid|high",
                        "depthQuality": "shallow|medium|deep",
                        "visiblePlanes": ["floor", "backWall"],
                        "estimatedShell": {
                            "width": 14.0,
                            "depth": 10.0,
                            "height": 4.6,
                            "openCeiling": False,
                        },
                        "suggestedCamera": {
                            "shotType": "hero shot|wide|medium|close-up beauty",
                            "target": [0.0, 1.4, 0.0],
                            "positionHint": [0.0, 1.8, -6.0],
                        },
                        "suggestedZones": {
                            "hero": {"xBias": 0.0, "depthZone": "midground", "supportingSide": "center"},
                            "supporting": {"xBias": -0.2, "depthZone": "midground", "supportingSide": "left"},
                            "background": {"xBias": 0.0, "depthZone": "background", "supportingSide": "center"},
                        },
                        "detectedOpenings": [{
                            "id": "front_entry",
                            "kind": "door|window|service_window|archway|pass_through",
                            "wallTarget": "rearWall",
                            "xAlign": "left|center|right",
                            "widthRatio": 0.22,
                            "heightRatio": 0.72,
                            "sillHeight": 0.0,
                            "notes": ["optional"],
                        }],
                        "objectAnchors": [{
                            "id": "counter_1",
                            "kind": "counter|table|shelf|oven|display|person|door|window",
                            "label": "Counter",
                            "bbox": [140, 210, 420, 308],
                            "depthZone": "foreground|midground|background",
                            "wallTarget": "backWall|leftWall|rightWall|rearWall|null",
                            "zoneId": "optional_zone",
                            "notes": ["optional"],
                        }],
                        "surfacePolygons": {},
                        "visiblePlaneConfidence": {
                            "floor": 0.92,
                            "backWall": 0.84,
                        },
                        "sourceSignals": {
                            "openingCount": 1,
                            "anchorCount": 2,
                            "peopleCount": 1,
                            "planeConfidence": 0.86,
                        },
                    }
                }
            },
        }

        parts: List[Dict[str, Any]] = [{"text": json.dumps(instruction, ensure_ascii=False)}]
        for image in reference_images[:3]:
            inline_data = self._data_url_to_inline_data(image)
            if inline_data:
                parts.append({"inline_data": inline_data})
            else:
                parts.append({"text": f"Reference image hint: {image}"})

        response = self._request_json(parts)
        aggregate = (
            response.get("layoutHints", {}).get("aggregate", {})
            if isinstance(response.get("layoutHints"), dict)
            else {}
        )
        if not isinstance(aggregate, dict):
            raise RuntimeError("Gemini layout provider returned an invalid aggregate payload")

        response.setdefault("provider", "gemini_layout")
        response.setdefault("capabilities", {
            "supportsDepthEstimation": True,
            "supportsSegmentation": True,
        })
        response.setdefault("layoutHints", {"aggregate": aggregate, "images": []})
        response.setdefault(
            "summary",
            f"Gemini inferred {str(aggregate.get('roomType') or preferred_room_type or 'storefront').replace('_', ' ')} layout signals from the reference image.",
        )
        return response

    def validate_environment(
        self,
        *,
        plan: Dict[str, Any],
        preview_image: Optional[str],
        heuristic_evaluation: Optional[Dict[str, Any]],
        validation_options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not preview_image:
            raise ValueError("preview_image is required for Gemini validation")

        heuristic_scores = _extract_heuristic_scores(heuristic_evaluation)
        scene_phase = str(
            (validation_options or {}).get("scenePhase")
            or (validation_options or {}).get("source")
            or (validation_options or {}).get("referenceMode")
            or ""
        ).strip().lower()
        structural_blockout = scene_phase in {"provider_smoke", "blockout_smoke", "proxy_blockout"}

        instruction = {
            "task": "environment_preview_validation",
            "goal": "Compare the current preview render to the structured plan and score whether the environment matches the creative intent.",
            "rules": [
                "Return valid JSON only.",
                "Score categories from 0.0 to 1.0.",
                "Be strict but production-oriented.",
                "Use approved only when the preview is clearly usable.",
                "If the preview is a structural blockout, proxy render or smoke-test image, judge whether the intended layout, lighting direction and branding are structurally represented, not whether the scene already has final textures or polished shading.",
                "Do not collapse prompt, lighting, realism or brand scores to near-zero solely because the preview is abstract or uses placeholder geometry.",
            ],
            "validationOptions": validation_options or {},
            "plan": plan,
            "heuristicEvaluation": heuristic_evaluation or {},
            "responseSchema": {
                "provider": "gemini_validation",
                "evaluation": {
                    "provider": "gemini_validation",
                    "overallScore": 0.82,
                    "verdict": "approved|needs_refinement",
                    "previewSimilarity": {
                        "score": 0.84,
                        "notes": ["The preview matches the prompt strongly."],
                    },
                    "categories": {
                        "promptFidelity": {"score": 0.84, "notes": ["..."]},
                        "compositionMatch": {"score": 0.8, "notes": ["..."]},
                        "lightingIntentMatch": {"score": 0.82, "notes": ["..."]},
                        "technicalIntegrity": {"score": 0.8, "notes": ["..."]},
                        "roomRealism": {"score": 0.78, "notes": ["..."]},
                        "brandConsistency": {"score": 0.76, "notes": ["..."]},
                        "imageLayoutMatch": {"score": 0.79, "notes": ["..."]},
                    },
                    "suggestedAdjustments": ["short concrete adjustment"],
                    "previewUsed": True,
                    "previewSource": "runtime_capture",
                    "usedVisionModel": True,
                    "providerMetadata": {"model": self.model},
                }
            },
        }

        parts: List[Dict[str, Any]] = [{"text": json.dumps(instruction, ensure_ascii=False)}]
        inline_data = self._data_url_to_inline_data(preview_image)
        if inline_data:
            parts.append({"inline_data": inline_data})
        else:
            parts.append({"text": "Preview image could not be attached; validate from plan text only."})

        response = self._request_json(parts)
        evaluation = response.get("evaluation") if isinstance(response.get("evaluation"), dict) else response
        if not isinstance(evaluation, dict):
            raise RuntimeError("Gemini validation provider returned an invalid evaluation payload")

        categories = evaluation.get("categories") if isinstance(evaluation.get("categories"), dict) else {}
        normalized_categories: Dict[str, Any] = {}
        for key, value in categories.items():
            if not isinstance(value, dict):
                continue
            normalized_categories[str(key)] = {
                "score": _clamp_score(value.get("score")),
                "notes": [str(item) for item in (value.get("notes") or []) if str(item).strip()][:6],
            }

        preview_similarity = evaluation.get("previewSimilarity")
        if isinstance(preview_similarity, dict):
            evaluation["previewSimilarity"] = {
                "score": _clamp_score(preview_similarity.get("score")),
                "notes": [str(item) for item in (preview_similarity.get("notes") or []) if str(item).strip()][:6],
            }

        evaluation["provider"] = str(evaluation.get("provider") or "gemini_validation")
        evaluation["categories"] = normalized_categories
        evaluation["overallScore"] = _clamp_score(evaluation.get("overallScore"), 0.75)
        evaluation["verdict"] = (
            str(evaluation.get("verdict") or "").strip().lower()
            if str(evaluation.get("verdict") or "").strip().lower() in {"approved", "needs_refinement"}
            else ("approved" if evaluation["overallScore"] >= 0.72 else "needs_refinement")
        )
        evaluation["suggestedAdjustments"] = [
            str(item) for item in (evaluation.get("suggestedAdjustments") or []) if str(item).strip()
        ][:8]
        evaluation["previewUsed"] = True
        evaluation["previewSource"] = str(evaluation.get("previewSource") or "runtime_capture")
        evaluation["usedVisionModel"] = True
        evaluation["validatedAt"] = str(evaluation.get("validatedAt") or datetime.now(timezone.utc).isoformat())
        provider_metadata = evaluation.get("providerMetadata") if isinstance(evaluation.get("providerMetadata"), dict) else {}
        provider_metadata.setdefault("model", self.model)
        provider_metadata["scenePhase"] = scene_phase or "runtime_preview"
        if structural_blockout:
            vulnerable_categories = {"promptFidelity", "lightingIntentMatch", "roomRealism", "brandConsistency"}
            for category_key in vulnerable_categories:
                if category_key not in evaluation["categories"]:
                    continue
                heuristic_score = heuristic_scores.get(category_key)
                if heuristic_score is None:
                    continue
                floored_score = round(max(evaluation["categories"][category_key]["score"], heuristic_score * 0.62), 3)
                evaluation["categories"][category_key]["score"] = floored_score
            if "previewSimilarity" in evaluation["categories"] and evaluation["categories"]["previewSimilarity"]["score"] >= 0.62:
                evaluation["overallScore"] = round(max(
                    evaluation["overallScore"],
                    (sum(category["score"] for category in evaluation["categories"].values()) / max(1, len(evaluation["categories"]))) * 0.9,
                ), 3)
            provider_metadata["validationMode"] = "structural_blockout"
        evaluation["providerMetadata"] = provider_metadata

        return {
            "provider": "gemini_validation",
            "evaluation": evaluation,
        }


_provider_instance: Optional[GeminiEnvironmentProvider] = None


def get_or_create_gemini_environment_provider() -> GeminiEnvironmentProvider:
    global _provider_instance
    if _provider_instance is None:
        _provider_instance = GeminiEnvironmentProvider()
    return _provider_instance
