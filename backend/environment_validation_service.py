"""
Environment validation service.

Builds a heuristic evaluation summary for a generated EnvironmentPlan. The
service is intentionally provider-shaped so it can later be upgraded from
heuristics to preview-render + VLM scoring without changing the API contract.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
import time
from typing import Any, Dict, List, Optional

import httpx


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _round_score(value: float) -> float:
    return round(_clamp(value), 3)


def _normalize_provider(value: Optional[str]) -> str:
    normalized = str(value or "auto").strip().lower()
    if normalized in {"auto", "heuristic", "vision_vlm"}:
        return normalized
    return "auto"


def _blend_scores(left: float, right: float, left_weight: float) -> float:
    return _round_score((left * left_weight) + (right * (1.0 - left_weight)))


@dataclass
class EvaluationCategory:
    score: float
    notes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": _round_score(self.score),
            "notes": self.notes[:6],
        }


class EnvironmentValidationService:
    def __init__(self, assembly_service: Any) -> None:
        self.assembly_service = assembly_service
        self.provider = _normalize_provider(os.environ.get("ENV_VALIDATION_PROVIDER", "auto"))
        self.external_validation_url = os.environ.get("ENV_VALIDATION_EXTERNAL_URL", "").strip()
        self.external_validation_health_url = os.environ.get("ENV_VALIDATION_EXTERNAL_HEALTH_URL", "").strip()
        self.external_auth_header = str(os.environ.get("ENV_VALIDATION_EXTERNAL_AUTH_HEADER", "Authorization") or "Authorization").strip() or "Authorization"
        self.external_auth_token = os.environ.get("ENV_VALIDATION_EXTERNAL_AUTH_TOKEN", "").strip()
        self.request_timeout_seconds = max(3.0, float(os.environ.get("ENV_VALIDATION_TIMEOUT_SECONDS", "20")))
        self.cache_ttl_seconds = max(0.0, float(os.environ.get("ENV_VALIDATION_CACHE_TTL_SECONDS", "120")))
        self._validation_cache: Dict[str, Dict[str, Any]] = {}

    def get_status(self) -> Dict[str, Any]:
        return {
            "enabled": True,
            "provider": self.provider,
            "availableProviders": ["auto", "heuristic", "vision_vlm"],
            "configuredProviders": [
                "heuristic",
                *(["vision_vlm"] if self.external_validation_url else []),
            ],
            "externalProviderConfigured": bool(self.external_validation_url),
            "supportsPreviewRender": True,
            "supportsVisionBackedScoring": bool(self.external_validation_url),
            "supportsAutoIteration": True,
            "previewImageSupported": True,
        }

    def get_provider_health(self, probe: bool = False) -> Dict[str, Any]:
        provider_state = {
            "configured": bool(self.external_validation_url),
            "endpoint": self.external_validation_url or None,
            "healthUrl": self.external_validation_health_url or self.external_validation_url or None,
            "supports": ["preview_similarity", "vision_scoring", "suggested_adjustments"],
        }
        if probe:
            provider_state["probe"] = self._probe_provider_url(provider_state.get("healthUrl"))

        return {
            "provider": self.provider,
            "probeEnabled": probe,
            "providers": {
                "vision_vlm": provider_state,
            },
        }

    def _build_external_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if self.external_auth_token:
            headers[self.external_auth_header] = self.external_auth_token
        return headers

    def _make_cache_key(self, payload: Dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def _get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        if self.cache_ttl_seconds <= 0:
            return None
        entry = self._validation_cache.get(cache_key)
        if not isinstance(entry, dict):
            return None
        created_at = float(entry.get("createdAt") or 0.0)
        if (time.time() - created_at) > self.cache_ttl_seconds:
            self._validation_cache.pop(cache_key, None)
            return None
        cached_value = entry.get("value")
        if not isinstance(cached_value, dict):
            return None
        cached_result = copy.deepcopy(cached_value)
        cached_result["cacheHit"] = True
        return cached_result

    def _store_cached_result(self, cache_key: str, value: Dict[str, Any]) -> None:
        if self.cache_ttl_seconds <= 0:
            return
        self._validation_cache[cache_key] = {
            "createdAt": time.time(),
            "value": copy.deepcopy(value),
        }

    def _probe_provider_url(self, url: Optional[str]) -> Dict[str, Any]:
        if not url:
            return {
                "configured": False,
                "healthy": False,
                "reachable": False,
                "error": "not_configured",
            }

        if url.startswith("internal://gemini_validation"):
            try:
                try:
                    from gemini_environment_provider import get_or_create_gemini_environment_provider
                except ImportError:
                    from backend.gemini_environment_provider import get_or_create_gemini_environment_provider

                provider = get_or_create_gemini_environment_provider()
                return {
                    "configured": True,
                    "healthy": bool(provider.enabled),
                    "reachable": bool(provider.enabled),
                    "method": "internal",
                    "statusCode": 200 if provider.enabled else None,
                    "latencyMs": 0.0,
                    "error": None if provider.enabled else "gemini_not_configured",
                }
            except Exception as exc:
                return {
                    "configured": True,
                    "healthy": False,
                    "reachable": False,
                    "error": str(exc),
                }

        headers = self._build_external_headers()
        started_at = time.perf_counter()
        last_status_code: Optional[int] = None
        last_error: Optional[str] = None

        try:
            with httpx.Client(timeout=min(self.request_timeout_seconds, 8.0), follow_redirects=True) as client:
                for method in ("HEAD", "GET"):
                    try:
                        response = client.request(method, url, headers=headers)
                        last_status_code = response.status_code
                        latency_ms = round((time.perf_counter() - started_at) * 1000, 1)
                        healthy = response.status_code < 500
                        return {
                            "configured": True,
                            "healthy": healthy,
                            "reachable": True,
                            "method": method,
                            "statusCode": response.status_code,
                            "latencyMs": latency_ms,
                            "error": None if healthy else f"http_{response.status_code}",
                        }
                    except Exception as exc:
                        last_error = str(exc)
        except Exception as exc:
            last_error = str(exc)

        return {
            "configured": True,
            "healthy": False,
            "reachable": False,
            "statusCode": last_status_code,
            "error": last_error or "probe_failed",
        }

    def validate(
        self,
        plan: Dict[str, Any],
        preview_image: Optional[str] = None,
        provider: Optional[str] = None,
        validation_options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not isinstance(plan, dict) or not plan:
            raise ValueError("A normalized environment plan is required")

        requested_provider = _normalize_provider(provider or self.provider)
        cache_key = self._make_cache_key(
            {
                "provider": requested_provider,
                "plan": plan,
                "previewImageSha": hashlib.sha256(preview_image.encode("utf-8")).hexdigest() if isinstance(preview_image, str) and preview_image else None,
                "validationOptions": validation_options or {},
            }
        )
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result
        heuristic_evaluation = self._build_heuristic_evaluation(plan)
        warnings: List[str] = []
        used_fallback = False

        if requested_provider in {"auto", "vision_vlm"}:
            if self.external_validation_url and preview_image:
                try:
                    external_evaluation = self._request_external_validation(
                        plan=plan,
                        preview_image=preview_image,
                        heuristic_evaluation=heuristic_evaluation,
                        validation_options=validation_options or {},
                    )
                    merged_evaluation = self._merge_evaluations(
                        heuristic_evaluation=heuristic_evaluation,
                        external_evaluation=external_evaluation,
                    )
                    result = {
                        "success": True,
                        "provider": str(merged_evaluation.get("provider") or "vision_vlm"),
                        "usedFallback": False,
                        "warnings": external_evaluation.get("warnings") if isinstance(external_evaluation.get("warnings"), list) else [],
                        "evaluation": merged_evaluation,
                    }
                    result["cacheHit"] = False
                    self._store_cached_result(cache_key, result)
                    return result
                except Exception as exc:
                    used_fallback = True
                    warnings.append(f"Vision validation provider unavailable; using heuristic fallback. {exc}")
            elif requested_provider == "vision_vlm":
                used_fallback = True
                if not self.external_validation_url:
                    warnings.append("Vision validation provider was requested but no external endpoint is configured. Using heuristic fallback.")
                elif not preview_image:
                    warnings.append("Vision validation provider was requested but no preview image was supplied. Using heuristic fallback.")

        heuristic_evaluation["warnings"] = warnings[:] if warnings else heuristic_evaluation.get("warnings", [])
        result = {
            "success": True,
            "provider": "heuristic_environment_validation",
            "usedFallback": used_fallback,
            "warnings": warnings,
            "evaluation": heuristic_evaluation,
        }
        result["cacheHit"] = False
        self._store_cached_result(cache_key, result)
        return result

    def _build_heuristic_evaluation(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        assembly_result = self.assembly_service.assemble(plan)
        categories = {
            "promptFidelity": self._score_prompt_fidelity(plan, assembly_result),
            "compositionMatch": self._score_composition(plan),
            "lightingIntentMatch": self._score_lighting(plan),
            "technicalIntegrity": self._score_technical_integrity(plan, assembly_result),
            "roomRealism": self._score_room_realism(plan),
        }

        brand_category = self._score_brand_consistency(plan)
        if brand_category:
            categories["brandConsistency"] = brand_category

        image_layout_category = self._score_image_layout_match(plan)
        if image_layout_category:
            categories["imageLayoutMatch"] = image_layout_category

        overall_score = self._compute_weighted_overall_score(categories)
        suggested_adjustments = self._build_suggested_adjustments(plan, categories)
        verdict = self._determine_verdict(categories, overall_score, suggested_adjustments)

        return {
            "provider": "heuristic_environment_validation",
            "verdict": verdict,
            "overallScore": overall_score,
            "categories": {key: category.to_dict() for key, category in categories.items()},
            "suggestedAdjustments": suggested_adjustments[:8],
            "validatedAt": datetime.now(timezone.utc).isoformat(),
            "previewUsed": False,
            "previewSource": None,
            "usedVisionModel": False,
            "warnings": [],
            "providerMetadata": {
                "assemblyProvider": str(assembly_result.get("provider") or "local_scenegraph"),
            },
        }

    def _compute_weighted_overall_score(self, categories: Dict[str, EvaluationCategory]) -> float:
        weights = {
            "promptFidelity": 0.24,
            "compositionMatch": 0.16,
            "lightingIntentMatch": 0.2,
            "technicalIntegrity": 0.2,
            "roomRealism": 0.14,
            "brandConsistency": 0.04,
            "imageLayoutMatch": 0.02,
            "previewSimilarity": 0.08,
        }
        weighted_score = 0.0
        active_weight = 0.0
        for key, weight in weights.items():
            category = categories.get(key)
            if isinstance(category, EvaluationCategory):
                weighted_score += category.score * weight
                active_weight += weight
        if active_weight <= 0:
            return 0.0
        return _round_score(weighted_score / active_weight)

    def _determine_verdict(
        self,
        categories: Dict[str, EvaluationCategory],
        overall_score: float,
        suggested_adjustments: List[str],
    ) -> str:
        minimum_core_score = min(
            categories["promptFidelity"].score,
            categories["compositionMatch"].score,
            categories["lightingIntentMatch"].score,
            categories["technicalIntegrity"].score,
            categories["roomRealism"].score,
        )
        return (
            "approved"
            if overall_score >= 0.72 and minimum_core_score >= 0.68 and len(suggested_adjustments) <= 2
            else "needs_refinement"
        )

    def _request_external_validation(
        self,
        *,
        plan: Dict[str, Any],
        preview_image: str,
        heuristic_evaluation: Dict[str, Any],
        validation_options: Dict[str, Any],
    ) -> Dict[str, Any]:
        payload = {
            "plan": plan,
            "prompt": str(plan.get("prompt") or ""),
            "previewImage": preview_image,
            "heuristicEvaluation": heuristic_evaluation,
            "validationOptions": validation_options,
        }
        response = self._post_external_json(self.external_validation_url, payload)
        return self._normalize_external_evaluation(response)

    def _post_external_json(self, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if url.startswith("internal://gemini_validation"):
            try:
                try:
                    from gemini_environment_provider import get_or_create_gemini_environment_provider
                except ImportError:
                    from backend.gemini_environment_provider import get_or_create_gemini_environment_provider

                provider = get_or_create_gemini_environment_provider()
                return provider.validate_environment(
                    plan=payload.get("plan") if isinstance(payload.get("plan"), dict) else {},
                    preview_image=payload.get("previewImage") if isinstance(payload.get("previewImage"), str) else None,
                    heuristic_evaluation=payload.get("heuristicEvaluation") if isinstance(payload.get("heuristicEvaluation"), dict) else None,
                    validation_options=payload.get("validationOptions") if isinstance(payload.get("validationOptions"), dict) else {},
                )
            except Exception as exc:
                raise RuntimeError(f"Internal Gemini validation provider failed: {exc}") from exc

        headers = self._build_external_headers()
        with httpx.Client(timeout=self.request_timeout_seconds) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        if not isinstance(data, dict):
            raise ValueError("External environment validation provider returned a non-object response")
        return data

    def _normalize_external_category(self, payload: Any) -> Optional[EvaluationCategory]:
        if isinstance(payload, dict):
            notes = payload.get("notes") if isinstance(payload.get("notes"), list) else []
            try:
                score = float(payload.get("score"))
            except (TypeError, ValueError):
                return None
            return EvaluationCategory(
                score=score,
                notes=[str(item) for item in notes if str(item).strip()],
            )
        if isinstance(payload, (int, float)):
            return EvaluationCategory(score=float(payload), notes=[])
        return None

    def _normalize_external_evaluation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        raw_evaluation = payload.get("evaluation") if isinstance(payload.get("evaluation"), dict) else payload
        if not isinstance(raw_evaluation, dict):
            raise ValueError("External validation payload must contain an evaluation object")

        categories: Dict[str, EvaluationCategory] = {}
        raw_categories = raw_evaluation.get("categories") if isinstance(raw_evaluation.get("categories"), dict) else {}
        for key, value in raw_categories.items():
            category = self._normalize_external_category(value)
            if category:
                categories[str(key)] = category

        preview_similarity = raw_evaluation.get("previewSimilarity")
        preview_category = self._normalize_external_category(preview_similarity)
        if preview_category:
            categories["previewSimilarity"] = preview_category

        warnings = raw_evaluation.get("warnings") if isinstance(raw_evaluation.get("warnings"), list) else payload.get("warnings") if isinstance(payload.get("warnings"), list) else []
        suggested_adjustments = raw_evaluation.get("suggestedAdjustments") if isinstance(raw_evaluation.get("suggestedAdjustments"), list) else []
        provider_metadata = raw_evaluation.get("providerMetadata") if isinstance(raw_evaluation.get("providerMetadata"), dict) else {}

        overall_score = raw_evaluation.get("overallScore")
        try:
            normalized_overall = _round_score(float(overall_score)) if overall_score is not None else None
        except (TypeError, ValueError):
            normalized_overall = None

        verdict = str(raw_evaluation.get("verdict") or "").strip().lower()
        if verdict not in {"approved", "needs_refinement"}:
            verdict = "approved" if (normalized_overall or 0.0) >= 0.72 else "needs_refinement"

        return {
            "provider": str(raw_evaluation.get("provider") or payload.get("provider") or "vision_vlm"),
            "verdict": verdict,
            "overallScore": normalized_overall,
            "categories": categories,
            "suggestedAdjustments": [str(item) for item in suggested_adjustments if str(item).strip()][:8],
            "validatedAt": str(raw_evaluation.get("validatedAt") or datetime.now(timezone.utc).isoformat()),
            "previewUsed": bool(raw_evaluation.get("previewUsed", True)),
            "previewSource": str(raw_evaluation.get("previewSource") or "runtime_capture"),
            "usedVisionModel": bool(raw_evaluation.get("usedVisionModel", True)),
            "warnings": [str(item) for item in warnings if str(item).strip()],
            "providerMetadata": provider_metadata or None,
        }

    def _merge_evaluations(
        self,
        *,
        heuristic_evaluation: Dict[str, Any],
        external_evaluation: Dict[str, Any],
    ) -> Dict[str, Any]:
        merged_categories: Dict[str, EvaluationCategory] = {}
        heuristic_categories = heuristic_evaluation.get("categories") if isinstance(heuristic_evaluation.get("categories"), dict) else {}
        external_categories = external_evaluation.get("categories") if isinstance(external_evaluation.get("categories"), dict) else {}

        external_preview_similarity = None
        if isinstance(external_categories.get("previewSimilarity"), EvaluationCategory):
            external_preview_similarity = external_categories.get("previewSimilarity")
        preview_payload = external_evaluation.get("categories") if isinstance(external_evaluation.get("categories"), dict) else {}
        if external_preview_similarity is None and isinstance(preview_payload.get("previewSimilarity"), EvaluationCategory):
            external_preview_similarity = preview_payload.get("previewSimilarity")
        scene_phase = ""
        if isinstance(external_evaluation.get("providerMetadata"), dict):
            scene_phase = str(external_evaluation["providerMetadata"].get("scenePhase") or "").strip().lower()

        def get_external_score(category_key: str) -> Optional[float]:
            category_value = external_categories.get(category_key)
            if isinstance(category_value, EvaluationCategory):
                return category_value.score
            normalized = self._normalize_external_category(category_value)
            return normalized.score if normalized else None

        preview_similarity_score = get_external_score("previewSimilarity")
        technical_integrity_score = get_external_score("technicalIntegrity")
        lighting_score = get_external_score("lightingIntentMatch")
        room_realism_score = get_external_score("roomRealism")
        structural_blockout = (
            scene_phase in {"provider_smoke", "blockout_smoke", "proxy_blockout"}
            or (
                (preview_similarity_score or 0.0) >= 0.62
                and (technical_integrity_score or 0.0) >= 0.75
                and (
                    (lighting_score is not None and lighting_score <= 0.35)
                    or (room_realism_score is not None and room_realism_score <= 0.35)
                )
            )
        )

        vulnerable_categories = {"promptFidelity", "lightingIntentMatch", "roomRealism", "brandConsistency"}
        structure_led_categories = {"compositionMatch", "technicalIntegrity", "imageLayoutMatch", "previewSimilarity"}

        all_keys = set(heuristic_categories.keys()) | set(external_categories.keys())
        for key in all_keys:
            heuristic_category = self._normalize_external_category(heuristic_categories.get(key))
            external_category = (
                external_categories.get(key)
                if isinstance(external_categories.get(key), EvaluationCategory)
                else self._normalize_external_category(external_categories.get(key))
            )

            if heuristic_category and external_category:
                if structural_blockout and key in vulnerable_categories:
                    heuristic_weight = 0.78
                elif key in structure_led_categories:
                    heuristic_weight = 0.35
                else:
                    heuristic_weight = 0.56

                merged_notes: List[str] = []
                for source_notes in [external_category.notes, heuristic_category.notes]:
                    for note in source_notes:
                        text = str(note).strip()
                        if text and text not in merged_notes:
                            merged_notes.append(text)

                merged_categories[key] = EvaluationCategory(
                    score=_blend_scores(heuristic_category.score, external_category.score, heuristic_weight),
                    notes=merged_notes[:6],
                )
            elif external_category:
                merged_categories[key] = external_category
            elif heuristic_category:
                merged_categories[key] = heuristic_category

        weighted_overall = self._compute_weighted_overall_score(merged_categories)
        external_overall = external_evaluation.get("overallScore")
        if isinstance(external_overall, (int, float)):
            external_weight = 0.18 if structural_blockout else 0.28
            overall_score = _round_score((weighted_overall * (1.0 - external_weight)) + (float(external_overall) * external_weight))
        else:
            overall_score = weighted_overall

        suggested_adjustments = []
        for source in (
            external_evaluation.get("suggestedAdjustments"),
            heuristic_evaluation.get("suggestedAdjustments"),
        ):
            if isinstance(source, list):
                for item in source:
                    text = str(item).strip()
                    if text and text not in suggested_adjustments:
                        suggested_adjustments.append(text)

        verdict = self._determine_verdict(merged_categories, overall_score, suggested_adjustments)
        warnings = []
        for source in (
            heuristic_evaluation.get("warnings"),
            external_evaluation.get("warnings"),
        ):
            if isinstance(source, list):
                for item in source:
                    text = str(item).strip()
                    if text and text not in warnings:
                        warnings.append(text)

        provider_metadata: Dict[str, Any] = {}
        if isinstance(heuristic_evaluation.get("providerMetadata"), dict):
            provider_metadata.update(heuristic_evaluation["providerMetadata"])
        if isinstance(external_evaluation.get("providerMetadata"), dict):
            provider_metadata.update(external_evaluation["providerMetadata"])
        if structural_blockout:
            provider_metadata["validationMode"] = "structural_blockout"

        return {
            "provider": str(external_evaluation.get("provider") or heuristic_evaluation.get("provider") or "vision_vlm"),
            "verdict": verdict,
            "overallScore": overall_score,
            "categories": {key: category.to_dict() for key, category in merged_categories.items()},
            "suggestedAdjustments": suggested_adjustments[:8],
            "validatedAt": str(external_evaluation.get("validatedAt") or datetime.now(timezone.utc).isoformat()),
            "previewUsed": bool(external_evaluation.get("previewUsed", True)),
            "previewSource": str(external_evaluation.get("previewSource") or "runtime_capture"),
            "usedVisionModel": True,
            "warnings": warnings,
            "providerMetadata": provider_metadata or None,
        }

    def _score_prompt_fidelity(self, plan: Dict[str, Any], assembly_result: Dict[str, Any]) -> EvaluationCategory:
        prompt = str(plan.get("prompt") or "").lower()
        shell = plan.get("roomShell") if isinstance(plan.get("roomShell"), dict) else {}
        props = plan.get("props") if isinstance(plan.get("props"), list) else []
        characters = plan.get("characters") if isinstance(plan.get("characters"), list) else []
        branding = plan.get("branding") if isinstance(plan.get("branding"), dict) else {}
        runtime_props = assembly_result.get("runtimeProps") if isinstance(assembly_result, dict) else []

        score = 0.46
        notes: List[str] = []

        if props:
            score += 0.12
            notes.append(f"Planen beskriver {len(props)} props som støtter prompten.")
        if runtime_props:
            score += 0.08
            notes.append(f"Assembly fant {len(runtime_props)} konkrete runtime-props.")
        if characters:
            score += 0.08
            notes.append(f"Planen inkluderer {len(characters)} karakterer for miljøliv.")
        if branding.get("enabled"):
            score += 0.05
            notes.append("Branding er koblet inn i planen.")

        if any(token in prompt for token in ["pizza", "restaurant", "trattoria", "bakery"]):
            if shell.get("type") in {"storefront", "interior_room"}:
                score += 0.08
                notes.append("Shell-type matcher et serveringslokale.")
            if any(str(item.get("role") or "").lower() == "baker" for item in characters if isinstance(item, dict)):
                score += 0.06
                notes.append("Baker-rolle støtter matscenariet.")

        if any(token in prompt for token in ["beauty", "fashion", "editorial", "luxury"]):
            if shell.get("type") in {"studio_shell", "abstract_stage", "interior_room"}:
                score += 0.06
                notes.append("Shell og oppsett passer en editorial/beauty-scene.")

        if any(token in prompt for token in ["warehouse", "industrial", "factory"]):
            if shell.get("type") == "warehouse":
                score += 0.1
                notes.append("Warehouse-shell matcher prompten direkte.")

        return EvaluationCategory(score=score, notes=notes or ["Prompten er mappet til et grunnleggende set-up."])

    def _score_composition(self, plan: Dict[str, Any]) -> EvaluationCategory:
        camera = plan.get("camera") if isinstance(plan.get("camera"), dict) else {}
        lighting = plan.get("lighting") if isinstance(plan.get("lighting"), list) else []
        room_shell = plan.get("roomShell") if isinstance(plan.get("roomShell"), dict) else {}
        notes: List[str] = []
        score = 0.42

        shot_type = str(camera.get("shotType") or "").strip().lower()
        if shot_type:
            score += 0.15
            notes.append(f"Kameraet har eksplisitt shotType: {shot_type}.")
        if isinstance(camera.get("target"), list) and len(camera.get("target")) >= 3:
            score += 0.08
            notes.append("Kamera-target er definert.")
        if isinstance(camera.get("positionHint"), list) and len(camera.get("positionHint")) >= 3:
            score += 0.08
            notes.append("Kamera-posisjon er foreslått.")
        if lighting:
            score += 0.05
        if isinstance(room_shell.get("zones"), list) and room_shell.get("zones"):
            score += 0.08
            notes.append("Shellen har soner som støtter shot-aware plassering.")

        return EvaluationCategory(score=score, notes=notes or ["Komposisjonen er fortsatt ganske generisk."])

    def _score_lighting(self, plan: Dict[str, Any]) -> EvaluationCategory:
        lighting = plan.get("lighting") if isinstance(plan.get("lighting"), list) else []
        mood = str((plan.get("camera") or {}).get("mood") or "").lower() if isinstance(plan.get("camera"), dict) else ""
        score = 0.38
        notes: List[str] = []

        if lighting:
            score += 0.16
            notes.append(f"Planen har {len(lighting)} lyscues.")

        intents = {str(light.get("intent") or "").strip() for light in lighting if isinstance(light, dict)}
        if intents:
            score += 0.16
            notes.append(f"Lysintensjoner er definert: {', '.join(sorted(intent for intent in intents if intent))}.")

        modifiers = [str(light.get("modifier") or "").strip() for light in lighting if isinstance(light, dict)]
        if any(modifier and modifier != "none" for modifier in modifiers):
            score += 0.08
            notes.append("Modifiere er spesifisert for flere lys.")

        beam_angles = [light.get("beamAngle") for light in lighting if isinstance(light, dict)]
        if any(isinstance(angle, (int, float)) for angle in beam_angles):
            score += 0.07
            notes.append("Beam angles er definert.")

        rationale_count = sum(1 for light in lighting if isinstance(light, dict) and light.get("rationale"))
        if rationale_count > 0:
            score += 0.07
            notes.append(f"{rationale_count} lys har AI-rationale.")

        haze_lights = [
            light for light in lighting
            if isinstance(light, dict) and isinstance(light.get("haze"), dict) and light["haze"].get("enabled")
        ]
        if haze_lights:
            score += 0.04
            notes.append("Lysplanen bruker haze der scene-familien trenger det.")

        if "noir" in mood and any(isinstance(light, dict) and isinstance(light.get("gobo"), dict) and light["gobo"].get("goboId") == "blinds" for light in lighting):
            score += 0.04
            notes.append("Noir-mood støttes av blinds-gobo.")
        if any(token in mood for token in ["food", "appetizing", "restaurant"]) and any(isinstance(light, dict) and str(light.get("intent") or "") == "food" for light in lighting):
            score += 0.04
            notes.append("Food-lysintensjon er til stede for matscenen.")

        return EvaluationCategory(score=score, notes=notes or ["Lysplanen trenger tydeligere intent og rationale."])

    def _score_technical_integrity(self, plan: Dict[str, Any], assembly_result: Dict[str, Any]) -> EvaluationCategory:
        runtime_props = assembly_result.get("runtimeProps") if isinstance(assembly_result, dict) else []
        assembly = assembly_result.get("assembly") if isinstance(assembly_result, dict) else {}
        room_shell = assembly_result.get("shell") if isinstance(assembly_result, dict) else {}
        characters = plan.get("characters") if isinstance(plan.get("characters"), list) else []
        notes: List[str] = []
        score = 0.5

        if isinstance(runtime_props, list):
            asset_ids = [str(item.get("assetId") or "") for item in runtime_props if isinstance(item, dict)]
            if len(asset_ids) == len(set(asset_ids)):
                score += 0.08
                notes.append("Runtime-props er deduplisert.")
            else:
                notes.append("Runtime-props inneholder duplikater som bør strammes inn.")

        if isinstance(assembly, dict):
            node_count = len(assembly.get("nodes") or [])
            rel_count = len(assembly.get("relationships") or [])
            if node_count >= 2:
                score += 0.08
                notes.append(f"Assembly har {node_count} noder og {rel_count} relasjoner.")

        if isinstance(room_shell, dict) and room_shell.get("type"):
            score += 0.06
            notes.append(f"Shellen ble normalisert til {room_shell.get('type')}.")

        valid_zone_ids = {
            str(zone.get("id"))
            for zone in (room_shell.get("zones") or [])
            if isinstance(zone, dict) and zone.get("id")
        } if isinstance(room_shell, dict) else set()
        invalid_character_routes = 0
        for character in characters:
            if not isinstance(character, dict):
                continue
            behavior = character.get("behaviorPlan")
            if not isinstance(behavior, dict):
                continue
            zone_ids = [behavior.get("homeZoneId")] + list(behavior.get("routeZoneIds") or [])
            for zone_id in zone_ids:
                if zone_id and str(zone_id) not in valid_zone_ids:
                    invalid_character_routes += 1
        if invalid_character_routes == 0:
            score += 0.08
            notes.append("Karakterenes behavior-ruter peker på gyldige soner.")
        else:
            notes.append(f"{invalid_character_routes} behavior-ruter peker på manglende soner.")

        return EvaluationCategory(score=score, notes=notes or ["Teknisk integritet er ikke analysert enda."])

    def _score_room_realism(self, plan: Dict[str, Any]) -> EvaluationCategory:
        shell = plan.get("roomShell") if isinstance(plan.get("roomShell"), dict) else {}
        notes: List[str] = []
        score = 0.36

        openings = shell.get("openings") or []
        fixtures = shell.get("fixtures") or []
        zones = shell.get("zones") or []
        niches = shell.get("niches") or []
        wall_segments = shell.get("wallSegments") or []

        if openings:
            score += 0.12
            notes.append(f"Shellen har {len(openings)} åpninger.")
        if fixtures:
            score += 0.1
            notes.append(f"Shellen har {len(fixtures)} fixtures.")
        if zones:
            score += 0.08
            notes.append(f"Shellen har {len(zones)} soner.")
        if niches or wall_segments:
            score += 0.08
            notes.append("Modulære veggdetaljer er til stede.")
        if any(isinstance(zone, dict) and zone.get("purpose") == "backroom" for zone in zones):
            score += 0.08
            notes.append("Backroom-sone gjør lokalet mindre studio-aktig.")
        if any(isinstance(opening, dict) and opening.get("kind") == "pass_through" for opening in openings):
            score += 0.06
            notes.append("Pass-through åpning støtter ekte serveringslokaler.")

        return EvaluationCategory(score=score, notes=notes or ["Rommet trenger flere arkitektoniske signaler for å føles ekte."])

    def _score_brand_consistency(self, plan: Dict[str, Any]) -> Optional[EvaluationCategory]:
        branding = plan.get("branding")
        if not isinstance(branding, dict) or not branding.get("enabled"):
            return None

        notes: List[str] = []
        score = 0.42
        palette = branding.get("palette") or []
        application_targets = branding.get("applicationTargets") or []
        characters = plan.get("characters") if isinstance(plan.get("characters"), list) else []

        if len(palette) >= 2:
            score += 0.16
            notes.append("Brandpaletten har flere farger.")
        if len(application_targets) >= 3:
            score += 0.16
            notes.append("Brandprofilen brukes på flere målflater.")
        if any(isinstance(character, dict) and character.get("logoPlacement") not in {None, "none"} for character in characters):
            score += 0.1
            notes.append("Minst én karakter bruker logo på antrekket.")

        return EvaluationCategory(score=score, notes=notes or ["Branding er aktiv, men kunne vært koblet til flere sceneelementer."])

    def _score_image_layout_match(self, plan: Dict[str, Any]) -> Optional[EvaluationCategory]:
        layout_guidance = plan.get("layoutGuidance")
        if not isinstance(layout_guidance, dict):
            return None

        notes: List[str] = []
        score = 0.4
        object_anchors = layout_guidance.get("objectAnchors") or []
        detected_openings = layout_guidance.get("detectedOpenings") or []
        shell = plan.get("roomShell") if isinstance(plan.get("roomShell"), dict) else {}
        shell_openings = shell.get("openings") or []

        if object_anchors:
            score += 0.18
            notes.append(f"Layoutguidance har {len(object_anchors)} objektankere.")
        if detected_openings:
            score += 0.16
            notes.append(f"Layoutguidance har {len(detected_openings)} detekterte åpninger.")
        if detected_openings and shell_openings:
            score += 0.12
            notes.append("Detekterte åpninger er mappet inn i shellen.")
        if layout_guidance.get("summary"):
            score += 0.05

        return EvaluationCategory(score=score, notes=notes or ["Bilde-layouten brukes, men signalene er fortsatt tynne."])

    def _build_suggested_adjustments(
        self,
        plan: Dict[str, Any],
        categories: Dict[str, EvaluationCategory],
    ) -> List[str]:
        suggestions: List[str] = []

        if categories["lightingIntentMatch"].score < 0.72:
            suggestions.append("Presiser lighting intent, modifier, beam angle og haze for flere lys.")
        if categories["roomRealism"].score < 0.72:
            suggestions.append("Legg til flere arkitektoniske signaler som pass-through, backroom eller nisjer.")
        if categories["technicalIntegrity"].score < 0.72:
            suggestions.append("Stram inn assemblyen: fjern duplikater og sikre at alle behavior-ruter peker på gyldige soner.")
        if categories["compositionMatch"].score < 0.7:
            suggestions.append("Juster kamera-shot, target og hero-zoner for tydeligere komposisjon.")

        image_layout = categories.get("imageLayoutMatch")
        if image_layout and image_layout.score < 0.72:
            suggestions.append("Bruk sterkere image-layout-signaler fra openings og object anchors i props og blocking.")

        if categories.get("brandConsistency") and categories["brandConsistency"].score < 0.72:
            suggestions.append("Bruk brandprofilen bredere på signage, wardrobe, packaging og interior details.")

        if not suggestions:
            suggestions.append("Scenen scorer godt. Neste steg er preview-render og VLM-sjekk for finjustering.")

        return suggestions
