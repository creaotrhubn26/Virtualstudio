"""
Environment layout service.

Extracts lightweight image-derived layout hints from reference images so the
planner can reason about room type, visible planes, composition bias and
camera elevation even before full SAM 2 / depth integration lands.
"""

from __future__ import annotations

import base64
import copy
import hashlib
import io
import json
import mimetypes
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from PIL import Image


class EnvironmentLayoutService:
    def __init__(self) -> None:
        self.provider = self._normalize_provider(os.environ.get("ENV_LAYOUT_PROVIDER", "auto"))
        self.max_images = max(1, int(os.environ.get("ENV_LAYOUT_MAX_IMAGES", "3")))
        self.max_dimension = max(256, int(os.environ.get("ENV_LAYOUT_MAX_DIMENSION", "512")))
        self.segmentation_prompt_limit = max(4, int(os.environ.get("ENV_LAYOUT_SEGMENTATION_PROMPT_LIMIT", "12")))
        self.external_layout_url = os.environ.get("ENV_LAYOUT_EXTERNAL_URL", "").strip()
        self.sam2_url = os.environ.get("ENV_LAYOUT_SAM2_URL", "").strip()
        self.depth_url = os.environ.get("ENV_LAYOUT_DEPTH_URL", "").strip()
        self.external_layout_health_url = os.environ.get("ENV_LAYOUT_EXTERNAL_HEALTH_URL", "").strip()
        self.sam2_health_url = os.environ.get("ENV_LAYOUT_SAM2_HEALTH_URL", "").strip()
        self.depth_health_url = os.environ.get("ENV_LAYOUT_DEPTH_HEALTH_URL", "").strip()
        self.external_auth_header = str(os.environ.get("ENV_LAYOUT_EXTERNAL_AUTH_HEADER", "Authorization") or "Authorization").strip() or "Authorization"
        self.external_auth_token = os.environ.get("ENV_LAYOUT_EXTERNAL_AUTH_TOKEN", "").strip()
        self.sam2_auth_header = str(os.environ.get("ENV_LAYOUT_SAM2_AUTH_HEADER", self.external_auth_header) or self.external_auth_header).strip() or self.external_auth_header
        self.sam2_auth_token = os.environ.get("ENV_LAYOUT_SAM2_AUTH_TOKEN", "").strip()
        self.depth_auth_header = str(os.environ.get("ENV_LAYOUT_DEPTH_AUTH_HEADER", self.external_auth_header) or self.external_auth_header).strip() or self.external_auth_header
        self.depth_auth_token = os.environ.get("ENV_LAYOUT_DEPTH_AUTH_TOKEN", "").strip()
        self.request_timeout_seconds = max(3.0, float(os.environ.get("ENV_LAYOUT_TIMEOUT_SECONDS", "20")))
        self.cache_ttl_seconds = max(0.0, float(os.environ.get("ENV_LAYOUT_CACHE_TTL_SECONDS", "120")))
        self._analysis_cache: Dict[str, Dict[str, Any]] = {}

    def _normalize_provider(self, provider: Optional[str]) -> str:
        normalized = str(provider or "auto").strip().lower()
        if normalized in {"heuristics", "sam2_depth", "auto"}:
            return normalized
        return "auto"

    def _external_provider_available(self) -> bool:
        return bool(self.external_layout_url or self.sam2_url or self.depth_url)

    def _structured_provider_ready(self) -> bool:
        return bool(self.external_layout_url or self.sam2_url or self.depth_url)

    def get_status(self) -> Dict[str, Any]:
        external_available = self._external_provider_available()
        sam2_configured = bool(self.external_layout_url or self.sam2_url)
        depth_configured = bool(self.external_layout_url or self.depth_url)
        structured_ready = self._structured_provider_ready()
        configured_providers = ["heuristics"]
        if external_available:
            configured_providers.append("sam2_depth")

        return {
            "enabled": True,
            "provider": self.provider,
            "availableProviders": ["auto", "heuristics", "sam2_depth"],
            "configuredProviders": configured_providers,
            "externalProviderConfigured": external_available,
            "sam2Configured": sam2_configured,
            "depthConfigured": depth_configured,
            "structuredProvidersReady": structured_ready,
            "usesUnifiedExternalEndpoint": bool(self.external_layout_url),
            "supportsDepthEstimation": depth_configured,
            "supportsSegmentation": sam2_configured,
            "supportsStructuredLayoutSignals": structured_ready,
            "maxImages": self.max_images,
            "maxDimension": self.max_dimension,
            "segmentationPromptLimit": self.segmentation_prompt_limit,
        }

    def get_provider_health(self, probe: bool = False) -> Dict[str, Any]:
        providers = {
            "unified": {
                "configured": bool(self.external_layout_url),
                "endpoint": self.external_layout_url or None,
                "healthUrl": self.external_layout_health_url or self.external_layout_url or None,
                "supports": ["segmentation", "depth", "structured_layout"],
            },
            "sam2": {
                "configured": bool(self.sam2_url),
                "endpoint": self.sam2_url or None,
                "healthUrl": self.sam2_health_url or self.sam2_url or None,
                "supports": ["segmentation", "planes", "anchors", "openings"],
            },
            "depth": {
                "configured": bool(self.depth_url),
                "endpoint": self.depth_url or None,
                "healthUrl": self.depth_health_url or self.depth_url or None,
                "supports": ["depth", "estimated_shell", "camera_hints"],
            },
        }

        if probe:
            for provider_state in providers.values():
                provider_state["probe"] = self._probe_provider_url(provider_state.get("healthUrl"))

        return {
            "provider": self.provider,
            "probeEnabled": probe,
            "providers": providers,
        }

    def _build_external_headers(self, url: Optional[str] = None) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        auth_header = self.external_auth_header
        auth_token = self.external_auth_token
        if url and self.sam2_url and url == self.sam2_url and self.sam2_auth_token:
            auth_header = self.sam2_auth_header
            auth_token = self.sam2_auth_token
        elif url and self.depth_url and url == self.depth_url and self.depth_auth_token:
            auth_header = self.depth_auth_header
            auth_token = self.depth_auth_token
        if auth_token:
            headers[auth_header] = auth_token
        return headers

    def _probe_provider_url(self, url: Optional[str]) -> Dict[str, Any]:
        if not url:
            return {
                "configured": False,
                "healthy": False,
                "reachable": False,
                "error": "not_configured",
            }

        if url.startswith("internal://gemini_layout"):
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

        headers = self._build_external_headers(url)
        started_at = time.perf_counter()
        methods = ("HEAD", "GET")
        last_status_code: Optional[int] = None
        last_error: Optional[str] = None

        try:
            with httpx.Client(timeout=min(self.request_timeout_seconds, 8.0), follow_redirects=True) as client:
                for method in methods:
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

    def _make_cache_key(self, payload: Dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def _get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        if self.cache_ttl_seconds <= 0:
            return None
        entry = self._analysis_cache.get(cache_key)
        if not isinstance(entry, dict):
            return None
        created_at = float(entry.get("createdAt") or 0.0)
        if (time.time() - created_at) > self.cache_ttl_seconds:
            self._analysis_cache.pop(cache_key, None)
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
        self._analysis_cache[cache_key] = {
            "createdAt": time.time(),
            "value": copy.deepcopy(value),
        }

    def _build_reference_fingerprints(self, reference_images: List[str]) -> List[Dict[str, Any]]:
        fingerprints: List[Dict[str, Any]] = []
        for image_ref in reference_images[: self.max_images]:
            try:
                data_url = self._image_ref_to_data_url(image_ref)
            except Exception:
                fingerprints.append({"imageRef": str(image_ref)})
                continue
            fingerprints.append(
                {
                    "imageRef": str(image_ref),
                    "sha256": hashlib.sha256(data_url.encode("utf-8")).hexdigest(),
                    "length": len(data_url),
                }
            )
        return fingerprints

    def analyze_images(
        self,
        reference_images: List[str],
        prompt: str = "",
        preferred_room_type: Optional[str] = None,
        provider: Optional[str] = None,
        layout_options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not reference_images:
            raise ValueError("At least one reference image is required")

        requested_provider = self._normalize_provider(provider or self.provider)
        reference_fingerprints = self._build_reference_fingerprints(reference_images)
        cache_key = self._make_cache_key(
            {
                "provider": requested_provider,
                "prompt": str(prompt or ""),
                "preferredRoomType": preferred_room_type,
                "layoutOptions": layout_options or {},
                "referenceFingerprints": reference_fingerprints,
            }
        )
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result
        heuristic_analyses = [
            self._analyze_single_image(image_ref, prompt, preferred_room_type)
            for image_ref in reference_images[: self.max_images]
        ]
        heuristic_aggregate = self._aggregate_layout_hints(heuristic_analyses, prompt, preferred_room_type)
        heuristic_result = {
            "success": True,
            "provider": "heuristics",
            "requestedProvider": requested_provider,
            "usedFallback": False,
            "warnings": [],
            "capabilities": {
                "supportsDepthEstimation": False,
                "supportsSegmentation": False,
            },
            "summary": self._build_summary(heuristic_aggregate, provider_label="heuristic"),
            "layoutHints": {
                "images": heuristic_analyses,
                "aggregate": heuristic_aggregate,
            },
        }

        if requested_provider == "heuristics":
            heuristic_result["cacheHit"] = False
            self._store_cached_result(cache_key, heuristic_result)
            return heuristic_result

        warnings: List[str] = []
        if self.external_layout_url:
            try:
                external_result = self._request_external_layout_hints(
                    reference_images=reference_images[: self.max_images],
                    prompt=prompt,
                    preferred_room_type=preferred_room_type,
                )
                merged_result = self._merge_layout_results(heuristic_result, external_result, requested_provider)
                merged_result["cacheHit"] = False
                self._store_cached_result(cache_key, merged_result)
                return merged_result
            except Exception as exc:
                warnings.append(f"External layout provider unavailable; using heuristics fallback. {exc}")
        elif self.sam2_url or self.depth_url:
            try:
                structured_result = self._request_structured_layout_hints(
                    heuristic_result=heuristic_result,
                    reference_images=reference_images[: self.max_images],
                    prompt=prompt,
                    preferred_room_type=preferred_room_type,
                    layout_options=layout_options or {},
                )
                structured_result["cacheHit"] = False
                self._store_cached_result(cache_key, structured_result)
                return structured_result
            except Exception as exc:
                warnings.append(f"SAM 2 / depth provider unavailable; using heuristics fallback. {exc}")
        elif requested_provider == "sam2_depth":
            warnings.append("SAM 2 / depth provider was requested but no external endpoint is configured. Using heuristics fallback.")

        heuristic_result["usedFallback"] = requested_provider == "sam2_depth"
        heuristic_result["warnings"] = warnings
        heuristic_result["requestedProvider"] = requested_provider
        heuristic_result["cacheHit"] = False
        self._store_cached_result(cache_key, heuristic_result)
        return heuristic_result

    def _build_summary(self, aggregate: Dict[str, Any], provider_label: str = "layout") -> str:
        room_type = str(aggregate.get("roomType", "studio_shell")).replace("_", " ")
        composition = str(aggregate.get("composition", "centered")).replace("_", " ")
        depth_quality = str(aggregate.get("depthQuality", "medium"))
        estimated_shell = aggregate.get("estimatedShell") or {}
        width = round(float(estimated_shell.get("width", 20)), 1)
        depth = round(float(estimated_shell.get("depth", 20)), 1)
        height = round(float(estimated_shell.get("height", 8)), 1)
        return (
            f"{provider_label.capitalize()} layout hints suggest a {room_type} with {depth_quality} depth, "
            f"{composition} composition, and an estimated shell of {width}x{depth}x{height}m."
        )

    def _analyze_single_image(
        self,
        image_ref: str,
        prompt: str,
        preferred_room_type: Optional[str],
    ) -> Dict[str, Any]:
        image = self._load_image(image_ref)
        image.thumbnail((self.max_dimension, self.max_dimension))
        rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
        height, width = rgb.shape[:2]

        gray = (rgb[:, :, 0] * 0.299) + (rgb[:, :, 1] * 0.587) + (rgb[:, :, 2] * 0.114)
        grad_y = np.abs(np.diff(gray, axis=0))
        grad_x = np.abs(np.diff(gray, axis=1))
        edge_map = np.pad(grad_y, ((0, 1), (0, 0)), mode="edge") + np.pad(grad_x, ((0, 0), (0, 1)), mode="edge")

        horizon = self._estimate_horizon(gray)
        composition = self._estimate_composition(edge_map)
        camera_elevation = self._infer_camera_elevation(horizon)
        floor_visible = self._detect_floor_visibility(gray, horizon)
        left_wall_visible, right_wall_visible, back_wall_visible = self._detect_surface_visibility(grad_x, grad_y)
        palette = self._extract_palette(rgb)
        room_type = self._infer_room_type(
            prompt=prompt,
            preferred_room_type=preferred_room_type,
            rgb=rgb,
            floor_visible=floor_visible,
            left_wall_visible=left_wall_visible,
            right_wall_visible=right_wall_visible,
        )
        depth_quality = self._infer_depth_quality(
            floor_visible=floor_visible,
            left_wall_visible=left_wall_visible,
            right_wall_visible=right_wall_visible,
            back_wall_visible=back_wall_visible,
        )
        estimated_shell = self._estimate_shell_dimensions(
            room_type=room_type,
            depth_quality=depth_quality,
            aspect_ratio=width / max(1.0, float(height)),
            open_ceiling=self._infer_open_ceiling(room_type, rgb),
        )
        camera_target_bias = {
            "left_weighted": -0.8,
            "right_weighted": 0.8,
            "centered": 0.0,
        }.get(composition, 0.0)
        base_target_y = 1.15 if camera_elevation == "low" else (1.55 if camera_elevation == "high" else 1.35)
        suggested_shot_type = "wide" if depth_quality == "deep" else ("close-up beauty" if depth_quality == "shallow" else "medium")
        suggested_camera = {
            "shotType": suggested_shot_type,
            "target": [camera_target_bias, base_target_y, 0.0],
            "positionHint": [
                round(camera_target_bias * 0.55, 3),
                round(base_target_y + (0.25 if camera_elevation != "high" else 0.4), 3),
                round(max(3.2, estimated_shell["depth"] * (0.5 if suggested_shot_type == "wide" else 0.38)), 3),
            ],
        }
        visible_planes = [
            plane
            for plane, is_visible in [
                ("floor", floor_visible),
                ("leftWall", left_wall_visible),
                ("rightWall", right_wall_visible),
                ("backWall", back_wall_visible),
            ]
            if is_visible
        ]
        suggested_zones = self._build_suggested_zones(
            composition=composition,
            depth_quality=depth_quality,
            room_type=room_type,
            left_wall_visible=left_wall_visible,
            right_wall_visible=right_wall_visible,
            back_wall_visible=back_wall_visible,
        )

        return {
            "imageSize": {"width": width, "height": height},
            "aspectRatio": round(width / max(1.0, float(height)), 4),
            "horizonLine": round(horizon, 4),
            "cameraElevation": camera_elevation,
            "composition": composition,
            "floorVisible": floor_visible,
            "leftWallVisible": left_wall_visible,
            "rightWallVisible": right_wall_visible,
            "backWallVisible": back_wall_visible,
            "roomType": room_type,
            "depthQuality": depth_quality,
            "openCeiling": estimated_shell["openCeiling"],
            "dominantPalette": palette,
            "visiblePlanes": visible_planes,
            "depthProfile": {
                "quality": depth_quality,
                "cameraElevation": camera_elevation,
                "horizonLine": round(horizon, 4),
            },
            "estimatedShell": estimated_shell,
            "suggestedCamera": suggested_camera,
            "suggestedZones": suggested_zones,
        }

    def _load_image(self, image_ref: str) -> Image.Image:
        if image_ref.startswith("data:"):
            header, payload = image_ref.split(",", 1)
            if ";base64" not in header:
                raise ValueError("Only base64 data URLs are supported")
            return Image.open(io.BytesIO(base64.b64decode(payload))).convert("RGB")

        candidate = Path(image_ref)
        if not candidate.is_absolute():
            candidate = Path(__file__).resolve().parent.parent / image_ref.lstrip("/")
        if not candidate.exists():
            raise FileNotFoundError(f"Image not found: {image_ref}")
        return Image.open(candidate).convert("RGB")

    def _image_ref_to_data_url(self, image_ref: str) -> str:
        if image_ref.startswith("data:"):
            return image_ref

        candidate = Path(image_ref)
        if not candidate.is_absolute():
            candidate = Path(__file__).resolve().parent.parent / image_ref.lstrip("/")
        if not candidate.exists():
            raise FileNotFoundError(f"Image not found: {image_ref}")

        mime_type = mimetypes.guess_type(candidate.name)[0] or "image/png"
        payload = base64.b64encode(candidate.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{payload}"

    def _estimate_horizon(self, gray: np.ndarray) -> float:
        if gray.shape[0] < 8:
            return 0.55

        vertical_energy = np.mean(np.abs(np.diff(gray, axis=0)), axis=1)
        row_count = vertical_energy.shape[0]
        start = int(row_count * 0.18)
        end = max(start + 1, int(row_count * 0.86))
        search = vertical_energy[start:end]
        weights = np.linspace(0.75, 1.15, num=search.shape[0], dtype=np.float32)
        horizon_row = start + int(np.argmax(search * weights))
        return float(horizon_row / max(1, gray.shape[0] - 1))

    def _estimate_composition(self, edge_map: np.ndarray) -> str:
        lower_half = edge_map[int(edge_map.shape[0] * 0.35) :, :]
        column_weights = np.sum(lower_half, axis=0)
        total = float(column_weights.sum())
        if total <= 0.001:
            return "centered"

        normalized_x = np.linspace(0.0, 1.0, num=column_weights.shape[0], dtype=np.float32)
        center_of_mass = float(np.dot(column_weights, normalized_x) / total)
        if center_of_mass < 0.44:
            return "left_weighted"
        if center_of_mass > 0.56:
            return "right_weighted"
        return "centered"

    def _infer_camera_elevation(self, horizon: float) -> str:
        if horizon < 0.42:
            return "low"
        if horizon > 0.62:
            return "high"
        return "eye"

    def _detect_floor_visibility(self, gray: np.ndarray, horizon: float) -> bool:
        height = gray.shape[0]
        start_row = min(height - 2, max(int(height * max(horizon, 0.45)), int(height * 0.45)))
        bottom_region = gray[start_row:, :]
        if bottom_region.size == 0:
            return False

        variance = float(np.var(bottom_region))
        gradient_energy = float(np.mean(np.abs(np.diff(bottom_region, axis=0)))) if bottom_region.shape[0] > 1 else 0.0
        return variance > 220 or gradient_energy > 7.5

    def _detect_surface_visibility(
        self,
        grad_x: np.ndarray,
        grad_y: np.ndarray,
    ) -> tuple[bool, bool, bool]:
        width = grad_x.shape[1]
        left_band = grad_x[:, : max(1, width // 3)]
        center_band = grad_x[:, max(1, width // 3) : max(2, (2 * width) // 3)]
        right_band = grad_x[:, max(1, (2 * width) // 3) :]

        left_energy = float(np.mean(left_band)) if left_band.size else 0.0
        center_energy = float(np.mean(center_band)) if center_band.size else 0.0
        right_energy = float(np.mean(right_band)) if right_band.size else 0.0
        back_energy = float(np.mean(grad_y[:, max(1, width // 4) : max(2, (3 * width) // 4)])) if grad_y.size else 0.0

        left_visible = left_energy >= max(4.5, center_energy * 0.82)
        right_visible = right_energy >= max(4.5, center_energy * 0.82)
        back_visible = back_energy >= 4.0 or (left_visible or right_visible)
        return left_visible, right_visible, back_visible

    def _extract_palette(self, rgb: np.ndarray) -> List[str]:
        flat = rgb.reshape(-1, 3)
        quantized = (np.clip(flat, 0, 255) // 32).astype(np.int32) * 32
        unique_colors, counts = np.unique(quantized, axis=0, return_counts=True)
        ranked = sorted(
            zip(unique_colors.tolist(), counts.tolist()),
            key=lambda item: item[1],
            reverse=True,
        )

        palette: List[str] = []
        for color, _count in ranked[:4]:
            r, g, b = [int(max(0, min(255, channel))) for channel in color]
            palette.append(f"#{r:02x}{g:02x}{b:02x}")
        return palette

    def _infer_room_type(
        self,
        prompt: str,
        preferred_room_type: Optional[str],
        rgb: np.ndarray,
        floor_visible: bool,
        left_wall_visible: bool,
        right_wall_visible: bool,
    ) -> str:
        if preferred_room_type in {"studio_shell", "interior_room", "warehouse", "storefront", "abstract_stage", "outdoor_illusion"}:
            return preferred_room_type

        lowered = prompt.lower()
        if any(token in lowered for token in ["warehouse", "industrial", "garage", "factory"]):
            return "warehouse"
        if any(token in lowered for token in ["showroom", "store", "retail", "boutique", "shop"]):
            return "storefront"
        if any(token in lowered for token in ["office", "meeting", "restaurant", "kitchen", "living room", "interior"]):
            return "interior_room"
        if any(token in lowered for token in ["abstract", "stage", "runway"]):
            return "abstract_stage"

        top_slice = rgb[: max(1, rgb.shape[0] // 4), :, :]
        top_mean = np.mean(top_slice, axis=(0, 1))
        looks_like_open_sky = (
            float(top_mean[2]) > float(top_mean[0]) * 1.15
            and float(top_mean[2]) > float(top_mean[1]) * 1.05
            and float(np.mean(top_slice)) > 120.0
        )
        if looks_like_open_sky and not left_wall_visible and not right_wall_visible:
            return "outdoor_illusion"
        if floor_visible and (left_wall_visible or right_wall_visible):
            return "interior_room"
        return "studio_shell"

    def _infer_depth_quality(
        self,
        floor_visible: bool,
        left_wall_visible: bool,
        right_wall_visible: bool,
        back_wall_visible: bool,
    ) -> str:
        if floor_visible and (left_wall_visible or right_wall_visible):
            return "deep"
        if floor_visible or (left_wall_visible and right_wall_visible) or back_wall_visible:
            return "medium"
        return "shallow"

    def _infer_open_ceiling(self, room_type: str, rgb: np.ndarray) -> bool:
        if room_type in {"warehouse", "studio_shell", "outdoor_illusion", "abstract_stage"}:
            return True

        top_slice = rgb[: max(1, rgb.shape[0] // 5), :, :]
        top_brightness = float(np.mean(top_slice))
        return top_brightness > 170.0

    def _estimate_shell_dimensions(
        self,
        room_type: str,
        depth_quality: str,
        aspect_ratio: float,
        open_ceiling: bool,
    ) -> Dict[str, Any]:
        base_dimensions = {
            "studio_shell": {"width": 20.0, "depth": 20.0, "height": 8.0},
            "interior_room": {"width": 14.0, "depth": 10.0, "height": 4.6},
            "warehouse": {"width": 18.0, "depth": 14.0, "height": 7.5},
            "storefront": {"width": 12.0, "depth": 8.0, "height": 5.0},
            "abstract_stage": {"width": 18.0, "depth": 14.0, "height": 7.0},
            "outdoor_illusion": {"width": 24.0, "depth": 18.0, "height": 8.0},
        }.get(room_type, {"width": 20.0, "depth": 20.0, "height": 8.0})

        width = base_dimensions["width"]
        depth = base_dimensions["depth"]
        height = base_dimensions["height"]

        if aspect_ratio > 1.25:
            width += 2.0
        elif aspect_ratio < 0.85:
            depth += 1.5

        if depth_quality == "deep":
            depth += 2.0
        elif depth_quality == "shallow":
            depth = max(6.0, depth - 1.5)

        if open_ceiling:
            height += 0.8

        return {
            "width": round(width, 2),
            "depth": round(depth, 2),
            "height": round(height, 2),
            "openCeiling": open_ceiling,
        }

    def _build_suggested_zones(
        self,
        composition: str,
        depth_quality: str,
        room_type: str,
        left_wall_visible: bool,
        right_wall_visible: bool,
        back_wall_visible: bool,
    ) -> Dict[str, Any]:
        hero_x_bias = {
            "left_weighted": -0.72,
            "right_weighted": 0.72,
            "centered": 0.0,
        }.get(composition, 0.0)
        hero_depth_zone = (
            "foreground"
            if depth_quality == "shallow"
            else "midground"
            if depth_quality == "medium"
            else "midground"
        )
        if room_type == "outdoor_illusion":
            hero_depth_zone = "midground"

        if back_wall_visible:
            background_wall_target = "backWall"
        elif left_wall_visible and not right_wall_visible:
            background_wall_target = "leftWall"
        elif right_wall_visible and not left_wall_visible:
            background_wall_target = "rightWall"
        else:
            background_wall_target = "rearWall"

        support_side = (
            "right"
            if composition == "left_weighted"
            else "left"
            if composition == "right_weighted"
            else "center"
        )

        return {
            "hero": {
                "xBias": hero_x_bias,
                "depthZone": hero_depth_zone,
            },
            "supporting": {
                "side": support_side,
                "depthZone": "midground",
            },
            "background": {
                "wallTarget": background_wall_target,
                "depthZone": "background",
            },
        }

    def _normalize_confidence(self, value: Any, fallback: float = 0.72) -> float:
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return fallback
        return max(0.0, min(1.0, confidence))

    def _normalize_surface_target(self, value: Any) -> Optional[str]:
        normalized = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
        mapping = {
            "floor": "floor",
            "ground": "floor",
            "floor_plane": "floor",
            "ground_plane": "floor",
            "leftwall": "leftWall",
            "left_wall": "leftWall",
            "wall_left": "leftWall",
            "rightwall": "rightWall",
            "right_wall": "rightWall",
            "wall_right": "rightWall",
            "backwall": "backWall",
            "back_wall": "backWall",
            "rearwall": "rearWall",
            "rear_wall": "rearWall",
            "wall": "backWall",
            "ceiling": "ceiling",
            "roof": "ceiling",
        }
        return mapping.get(normalized)

    def _normalize_opening_kind(self, value: Any) -> Optional[str]:
        normalized = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
        if not normalized:
            return None
        if any(token in normalized for token in ["service_window", "pass_through", "pass_window"]):
            return "service_window"
        if any(token in normalized for token in ["window", "display_glass"]):
            return "window"
        if any(token in normalized for token in ["arch", "archway"]):
            return "archway"
        if any(token in normalized for token in ["door", "entry", "entrance"]):
            return "door"
        return None

    def _normalize_anchor_kind(self, value: Any) -> Optional[str]:
        normalized = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
        if not normalized:
            return None
        candidates = {
            "counter": "counter",
            "cashwrap": "counter",
            "cashier_desk": "counter",
            "bar": "counter",
            "oven": "oven",
            "pizza_oven": "oven",
            "prep": "prep_surface",
            "prep_table": "prep_surface",
            "island": "prep_surface",
            "table": "table",
            "dining_table": "table",
            "menu_board": "menu_board",
            "sign": "signage",
            "shelf": "shelf",
            "display": "display",
            "rack": "storage_rack",
            "planter": "planter",
            "bench": "bench",
            "banquette": "banquette",
        }
        for token, kind in candidates.items():
            if token in normalized:
                return kind
        return None

    def _normalize_image_size(self, payload: Dict[str, Any]) -> Optional[Dict[str, float]]:
        image_size = payload.get("imageSize") if isinstance(payload.get("imageSize"), dict) else payload.get("size")
        if not isinstance(image_size, dict):
            return None

        try:
            width = float(image_size.get("width") or image_size.get("w") or 0)
            height = float(image_size.get("height") or image_size.get("h") or 0)
        except (TypeError, ValueError):
            return None

        if width <= 0 or height <= 0:
            return None

        return {"width": width, "height": height}

    def _normalize_bbox(self, value: Any, image_size: Optional[Dict[str, float]]) -> Optional[List[float]]:
        coords: Optional[List[float]] = None
        if isinstance(value, dict):
            if all(key in value for key in ("x", "y", "width", "height")):
                try:
                    x0 = float(value["x"])
                    y0 = float(value["y"])
                    x1 = x0 + float(value["width"])
                    y1 = y0 + float(value["height"])
                    coords = [x0, y0, x1, y1]
                except (TypeError, ValueError):
                    coords = None
            elif all(key in value for key in ("left", "top", "right", "bottom")):
                try:
                    coords = [
                        float(value["left"]),
                        float(value["top"]),
                        float(value["right"]),
                        float(value["bottom"]),
                    ]
                except (TypeError, ValueError):
                    coords = None
            elif all(key in value for key in ("x0", "y0", "x1", "y1")):
                try:
                    coords = [
                        float(value["x0"]),
                        float(value["y0"]),
                        float(value["x1"]),
                        float(value["y1"]),
                    ]
                except (TypeError, ValueError):
                    coords = None
        elif isinstance(value, (list, tuple)) and len(value) >= 4:
            try:
                coords = [float(value[0]), float(value[1]), float(value[2]), float(value[3])]
            except (TypeError, ValueError):
                coords = None

        if not coords:
            return None

        x0, y0, x1, y1 = coords[:4]
        if image_size and max(abs(x0), abs(y0), abs(x1), abs(y1)) > 1.0:
            width = max(1.0, float(image_size["width"]))
            height = max(1.0, float(image_size["height"]))
            x0, x1 = x0 / width, x1 / width
            y0, y1 = y0 / height, y1 / height

        x0, x1 = sorted((max(0.0, min(1.0, x0)), max(0.0, min(1.0, x1))))
        y0, y1 = sorted((max(0.0, min(1.0, y0)), max(0.0, min(1.0, y1))))
        if x1 - x0 <= 0.001 or y1 - y0 <= 0.001:
            return None
        return [round(x0, 4), round(y0, 4), round(x1, 4), round(y1, 4)]

    def _normalize_polygon(self, value: Any, image_size: Optional[Dict[str, float]]) -> List[List[float]]:
        raw_points: List[List[float]] = []
        if isinstance(value, list):
            if value and isinstance(value[0], (list, tuple)) and len(value[0]) >= 2:
                for point in value:
                    try:
                        raw_points.append([float(point[0]), float(point[1])])
                    except (TypeError, ValueError, IndexError):
                        continue
            elif len(value) % 2 == 0 and len(value) >= 6:
                for index in range(0, len(value), 2):
                    try:
                        raw_points.append([float(value[index]), float(value[index + 1])])
                    except (TypeError, ValueError, IndexError):
                        continue

        if not raw_points:
            return []

        should_scale = image_size and any(max(abs(x), abs(y)) > 1.0 for x, y in raw_points)
        normalized_points: List[List[float]] = []
        for x, y in raw_points:
            if should_scale:
                x = x / max(1.0, float(image_size["width"]))
                y = y / max(1.0, float(image_size["height"]))
            normalized_points.append([
                round(max(0.0, min(1.0, x)), 4),
                round(max(0.0, min(1.0, y)), 4),
            ])

        return normalized_points[:32]

    def _bbox_from_polygon(self, polygon: List[List[float]]) -> Optional[List[float]]:
        if not polygon:
            return None
        xs = [point[0] for point in polygon]
        ys = [point[1] for point in polygon]
        return [min(xs), min(ys), max(xs), max(ys)]

    def _infer_wall_target_from_bbox(self, bbox: Optional[List[float]], fallback: str = "backWall") -> str:
        if not bbox:
            return fallback
        center_x = (bbox[0] + bbox[2]) / 2.0
        if center_x <= 0.35:
            return "leftWall"
        if center_x >= 0.65:
            return "rightWall"
        return fallback

    def _infer_x_align_from_bbox(self, bbox: Optional[List[float]], fallback: str = "center") -> str:
        if not bbox:
            return fallback
        center_x = (bbox[0] + bbox[2]) / 2.0
        if center_x <= 0.35:
            return "left"
        if center_x >= 0.65:
            return "right"
        return "center"

    def _build_opening_from_signal(
        self,
        *,
        opening_kind: str,
        label: str,
        bbox: Optional[List[float]],
        wall_target: Optional[str],
        confidence: float,
        index: int,
    ) -> Dict[str, Any]:
        width_ratio = round(max(0.08, min(0.95, (bbox[2] - bbox[0]) if bbox else 0.22)), 3)
        height_ratio = round(max(0.12, min(0.95, (bbox[3] - bbox[1]) if bbox else 0.48)), 3)
        sill_height = 0.0 if opening_kind in {"door", "archway"} else round(max(0.0, min(3.5, (1.0 - (bbox[3] if bbox else 0.72)) * 2.4)), 3)
        return {
            "id": f"detected_{opening_kind}_{index}",
            "kind": opening_kind,
            "wallTarget": wall_target or self._infer_wall_target_from_bbox(bbox),
            "xAlign": self._infer_x_align_from_bbox(bbox),
            "widthRatio": width_ratio,
            "heightRatio": height_ratio,
            "sillHeight": sill_height,
            "confidence": round(confidence, 3),
            "notes": [f"Detected from segmentation label '{label}'."],
        }

    def _normalize_opening_signal(
        self,
        item: Dict[str, Any],
        *,
        image_size: Optional[Dict[str, float]],
        index: int,
    ) -> Optional[Dict[str, Any]]:
        opening_kind = self._normalize_opening_kind(item.get("kind") or item.get("label") or item.get("name"))
        if not opening_kind:
            return None

        bbox = self._normalize_bbox(item.get("bbox") or item.get("box"), image_size)
        confidence = self._normalize_confidence(item.get("confidence") or item.get("score"), 0.74)
        label = str(item.get("label") or item.get("name") or opening_kind).strip()
        explicit_width_ratio = item.get("widthRatio")
        explicit_height_ratio = item.get("heightRatio")
        explicit_sill_height = item.get("sillHeight")

        opening = self._build_opening_from_signal(
            opening_kind=opening_kind,
            label=label or opening_kind,
            bbox=bbox,
            wall_target=self._normalize_surface_target(item.get("wallTarget")),
            confidence=confidence,
            index=index,
        )
        opening["id"] = str(item.get("id") or opening["id"])
        if explicit_width_ratio is not None:
            try:
                opening["widthRatio"] = round(max(0.08, min(0.95, float(explicit_width_ratio))), 3)
            except (TypeError, ValueError):
                pass
        if explicit_height_ratio is not None:
            try:
                opening["heightRatio"] = round(max(0.12, min(0.95, float(explicit_height_ratio))), 3)
            except (TypeError, ValueError):
                pass
        if explicit_sill_height is not None:
            try:
                opening["sillHeight"] = round(max(0.0, min(4.0, float(explicit_sill_height))), 3)
            except (TypeError, ValueError):
                pass
        notes = item.get("notes")
        if isinstance(notes, list):
            opening["notes"] = [str(value) for value in notes if str(value).strip()]
        return opening

    def _build_anchor_from_signal(
        self,
        *,
        anchor_kind: str,
        label: str,
        bbox: Optional[List[float]],
        confidence: float,
        index: int,
    ) -> Dict[str, Any]:
        placement_mode = "ground"
        wall_target: Optional[str] = None
        target_surface: Optional[str] = None
        preferred_zone = "background"
        if anchor_kind in {"counter", "prep_surface", "table", "bench", "banquette", "planter"}:
            placement_mode = "ground"
            preferred_zone = "counter" if anchor_kind == "counter" else ("prep" if anchor_kind == "prep_surface" else "dining")
        elif anchor_kind in {"menu_board", "signage"}:
            placement_mode = "wall"
            wall_target = self._infer_wall_target_from_bbox(bbox)
            preferred_zone = "background"
        elif anchor_kind in {"shelf", "display", "storage_rack"}:
            placement_mode = "wall"
            wall_target = self._infer_wall_target_from_bbox(bbox)
            preferred_zone = "storage" if anchor_kind == "storage_rack" else "background"
        elif anchor_kind == "oven":
            placement_mode = "ground"
            preferred_zone = "prep"
        else:
            target_surface = "floor"

        return {
            "id": f"anchor_{anchor_kind}_{index}",
            "kind": anchor_kind,
            "label": label[:80],
            "placementMode": placement_mode,
            "wallTarget": wall_target,
            "targetSurface": target_surface,
            "preferredZonePurpose": preferred_zone,
            "bbox": bbox,
            "confidence": round(confidence, 3),
        }

    def _normalize_anchor_signal(
        self,
        item: Dict[str, Any],
        *,
        image_size: Optional[Dict[str, float]],
        index: int,
    ) -> Optional[Dict[str, Any]]:
        anchor_kind = self._normalize_anchor_kind(item.get("kind") or item.get("label") or item.get("name"))
        if not anchor_kind:
            return None

        bbox = self._normalize_bbox(item.get("bbox") or item.get("box"), image_size)
        confidence = self._normalize_confidence(item.get("confidence") or item.get("score"), 0.72)
        label = str(item.get("label") or item.get("name") or anchor_kind).strip()

        anchor = self._build_anchor_from_signal(
            anchor_kind=anchor_kind,
            label=label or anchor_kind,
            bbox=bbox,
            confidence=confidence,
            index=index,
        )
        anchor["id"] = str(item.get("id") or anchor["id"])
        if item.get("placementMode"):
            anchor["placementMode"] = str(item.get("placementMode")).strip().lower()
        if item.get("wallTarget"):
            anchor["wallTarget"] = self._normalize_surface_target(item.get("wallTarget"))
        if item.get("targetSurface") is not None:
            anchor["targetSurface"] = str(item.get("targetSurface") or "").strip().lower() or None
        if item.get("preferredZonePurpose"):
            anchor["preferredZonePurpose"] = str(item.get("preferredZonePurpose")).strip().lower()
        polygon = self._normalize_polygon(item.get("polygon") or item.get("points"), image_size)
        if polygon and not anchor.get("bbox"):
            anchor["bbox"] = self._bbox_from_polygon(polygon)
        return anchor

    def _dedupe_by_id(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen: set[str] = set()
        deduped: List[Dict[str, Any]] = []
        for item in items:
            key = str(item.get("id") or item)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped

    def _infer_room_type_from_structured_signals(
        self,
        prompt: str,
        preferred_room_type: Optional[str],
        visible_planes: List[str],
        openings: List[Dict[str, Any]],
        object_anchors: List[Dict[str, Any]],
        fallback_room_type: str,
    ) -> str:
        if preferred_room_type in {"studio_shell", "interior_room", "warehouse", "storefront", "abstract_stage", "outdoor_illusion"}:
            return preferred_room_type

        lowered = prompt.lower()
        anchor_kinds = {str(item.get("kind") or "") for item in object_anchors}
        if "counter" in anchor_kinds or any(item.get("kind") == "window" for item in openings):
            return "storefront"
        if "oven" in anchor_kinds or "prep_surface" in anchor_kinds or any(token in lowered for token in ["restaurant", "kitchen", "pizza", "cafe"]):
            return "interior_room"
        if "storage_rack" in anchor_kinds or any(token in lowered for token in ["warehouse", "industrial", "factory"]):
            return "warehouse"
        if "floor" in visible_planes and any(plane in visible_planes for plane in ["leftWall", "rightWall", "backWall"]):
            return "interior_room"
        return fallback_room_type

    def _infer_structured_zones(
        self,
        fallback_zones: Dict[str, Any],
        object_anchors: List[Dict[str, Any]],
        visible_planes: List[str],
    ) -> Dict[str, Any]:
        hero = dict(fallback_zones.get("hero") or {"xBias": 0.0, "depthZone": "midground"})
        supporting = dict(fallback_zones.get("supporting") or {"side": "center", "depthZone": "midground"})
        background = dict(fallback_zones.get("background") or {"wallTarget": "backWall", "depthZone": "background"})

        for anchor in object_anchors:
            if anchor.get("preferredZonePurpose") in {"counter", "prep"}:
                bbox = anchor.get("bbox") if isinstance(anchor.get("bbox"), list) else None
                if bbox:
                    center_x = (float(bbox[0]) + float(bbox[2])) / 2.0
                    hero["xBias"] = round(max(-1.0, min(1.0, (center_x - 0.5) * 2.0)), 3)
                    break

        if any(anchor.get("preferredZonePurpose") == "dining" for anchor in object_anchors):
            supporting["depthZone"] = "midground"
        if any(plane in visible_planes for plane in ["leftWall", "rightWall", "backWall", "rearWall"]):
            background["wallTarget"] = (
                "backWall"
                if "backWall" in visible_planes
                else "rearWall"
                if "rearWall" in visible_planes
                else "leftWall"
                if "leftWall" in visible_planes
                else "rightWall"
            )

        return {
            "hero": {
                "xBias": round(float(hero.get("xBias", 0.0)), 3),
                "depthZone": str(hero.get("depthZone") or "midground"),
            },
            "supporting": {
                "side": str(supporting.get("side") or "center"),
                "depthZone": str(supporting.get("depthZone") or "midground"),
            },
            "background": {
                "wallTarget": str(background.get("wallTarget") or "backWall"),
                "depthZone": str(background.get("depthZone") or "background"),
            },
        }

    def _normalize_segmentation_payload(
        self,
        payload: Dict[str, Any],
        *,
        prompt: str,
        preferred_room_type: Optional[str],
        fallback_room_type: str,
        fallback_zones: Dict[str, Any],
    ) -> Dict[str, Any]:
        image_size = self._normalize_image_size(payload)
        visible_plane_confidence: Dict[str, float] = {}
        surface_polygons: Dict[str, List[List[float]]] = {}
        openings: List[Dict[str, Any]] = []
        object_anchors: List[Dict[str, Any]] = []
        people_count = 0

        plane_items = payload.get("planes") if isinstance(payload.get("planes"), list) else []
        segmentation_items = []
        for key in ("segments", "detections", "objects", "masks"):
            if isinstance(payload.get(key), list):
                segmentation_items.extend(item for item in payload.get(key) if isinstance(item, dict))

        explicit_openings = payload.get("openings") if isinstance(payload.get("openings"), list) else []
        explicit_anchors = payload.get("objectAnchors") if isinstance(payload.get("objectAnchors"), list) else payload.get("anchors") if isinstance(payload.get("anchors"), list) else []
        explicit_people = payload.get("people") if isinstance(payload.get("people"), list) else []

        for index, item in enumerate(plane_items):
            if not isinstance(item, dict):
                continue
            label = str(item.get("target") or item.get("label") or "").strip()
            target = self._normalize_surface_target(label)
            if not target:
                continue
            confidence = self._normalize_confidence(item.get("confidence") or item.get("score"), 0.78)
            visible_plane_confidence[target] = max(confidence, visible_plane_confidence.get(target, 0.0))
            polygon = self._normalize_polygon(item.get("polygon") or item.get("points"), image_size)
            if polygon:
                surface_polygons[target] = polygon

        for index, item in enumerate(segmentation_items):
            label = str(item.get("label") or item.get("name") or item.get("class") or item.get("category") or "").strip()
            normalized_label = label.lower().replace("-", "_").replace(" ", "_")
            confidence = self._normalize_confidence(item.get("confidence") or item.get("score"), 0.7)
            bbox = self._normalize_bbox(item.get("bbox") or item.get("box"), image_size)
            polygon = self._normalize_polygon(item.get("polygon") or item.get("points") or item.get("maskPolygon"), image_size)
            if not bbox and polygon:
                bbox = self._bbox_from_polygon(polygon)

            surface_target = self._normalize_surface_target(item.get("surfaceTarget") or item.get("planeTarget") or label)
            if surface_target:
                visible_plane_confidence[surface_target] = max(confidence, visible_plane_confidence.get(surface_target, 0.0))
                if polygon and surface_target not in surface_polygons:
                    surface_polygons[surface_target] = polygon
                continue

            if any(token in normalized_label for token in ["person", "worker", "staff", "customer", "human"]):
                people_count += 1
                continue

            opening_kind = self._normalize_opening_kind(item.get("kind") or label)
            if opening_kind:
                openings.append(
                    self._build_opening_from_signal(
                        opening_kind=opening_kind,
                        label=label or opening_kind,
                        bbox=bbox,
                        wall_target=self._normalize_surface_target(item.get("wallTarget")),
                        confidence=confidence,
                        index=len(openings) + 1,
                    )
                )
                continue

            anchor_kind = self._normalize_anchor_kind(item.get("kind") or label)
            if anchor_kind:
                object_anchors.append(
                    self._build_anchor_from_signal(
                        anchor_kind=anchor_kind,
                        label=label or anchor_kind,
                        bbox=bbox,
                        confidence=confidence,
                        index=len(object_anchors) + 1,
                    )
                )

        for index, item in enumerate(explicit_openings, start=len(openings) + 1):
            if not isinstance(item, dict):
                continue
            normalized_opening = self._normalize_opening_signal(item, image_size=image_size, index=index)
            if normalized_opening:
                openings.append(normalized_opening)

        for index, item in enumerate(explicit_anchors, start=len(object_anchors) + 1):
            if not isinstance(item, dict):
                continue
            normalized_anchor = self._normalize_anchor_signal(item, image_size=image_size, index=index)
            if normalized_anchor:
                object_anchors.append(normalized_anchor)

        people_count += sum(1 for item in explicit_people if isinstance(item, dict))

        visible_planes = [plane for plane in ["floor", "leftWall", "rightWall", "backWall", "rearWall", "ceiling"] if visible_plane_confidence.get(plane)]
        room_type = self._infer_room_type_from_structured_signals(
            prompt=prompt,
            preferred_room_type=preferred_room_type,
            visible_planes=visible_planes,
            openings=openings,
            object_anchors=object_anchors,
            fallback_room_type=fallback_room_type,
        )
        suggested_zones = self._infer_structured_zones(fallback_zones, object_anchors, visible_planes)
        confidences = list(visible_plane_confidence.values()) + [float(item.get("confidence") or 0.0) for item in openings] + [float(item.get("confidence") or 0.0) for item in object_anchors]
        mean_confidence = round(sum(confidences) / len(confidences), 3) if confidences else 0.0

        return {
            "provider": str(payload.get("provider") or "sam2"),
            "visiblePlanes": visible_planes,
            "visiblePlaneConfidence": {plane: round(confidence, 3) for plane, confidence in visible_plane_confidence.items()},
            "surfacePolygons": surface_polygons,
            "detectedOpenings": self._dedupe_by_id(openings),
            "objectAnchors": self._dedupe_by_id(object_anchors),
            "peopleCount": people_count,
            "roomType": room_type,
            "suggestedZones": suggested_zones,
            "confidence": mean_confidence,
        }

    def _normalize_depth_payload(
        self,
        payload: Dict[str, Any],
        *,
        heuristic_aggregate: Dict[str, Any],
    ) -> Dict[str, Any]:
        depth_profile = payload.get("depthProfile") if isinstance(payload.get("depthProfile"), dict) else {}
        estimated_shell = payload.get("estimatedShell") if isinstance(payload.get("estimatedShell"), dict) else payload.get("roomDimensions") if isinstance(payload.get("roomDimensions"), dict) else {}
        visible_planes = payload.get("visiblePlanes") if isinstance(payload.get("visiblePlanes"), list) else []
        suggested_camera = payload.get("suggestedCamera") if isinstance(payload.get("suggestedCamera"), dict) else {}
        suggested_zones = payload.get("suggestedZones") if isinstance(payload.get("suggestedZones"), dict) else {}

        foreground_depth = payload.get("foregroundDepth", depth_profile.get("foregroundDepth"))
        background_depth = payload.get("backgroundDepth", depth_profile.get("backgroundDepth"))
        horizon_line = float(depth_profile.get("horizonLine", payload.get("horizonLine", heuristic_aggregate.get("horizonLine", 0.55))))
        horizon_line = max(0.0, min(1.0, horizon_line))
        explicit_depth_quality = str(depth_profile.get("quality") or payload.get("depthQuality") or "").strip().lower()
        depth_quality = explicit_depth_quality
        has_structured_depth_signal = (
            foreground_depth is not None
            or background_depth is not None
            or bool(depth_profile)
        )
        if depth_quality not in {"shallow", "medium", "deep"} and has_structured_depth_signal:
            try:
                depth_span = float(background_depth) - float(foreground_depth)
            except (TypeError, ValueError):
                depth_span = 0.0
            if depth_span >= 2.5:
                depth_quality = "deep"
            elif depth_span >= 1.1:
                depth_quality = "medium"
            else:
                depth_quality = "shallow"
        if depth_quality not in {"shallow", "medium", "deep"}:
            depth_quality = str(heuristic_aggregate.get("depthQuality") or "medium")

        camera_elevation = str(depth_profile.get("cameraElevation") or payload.get("cameraElevation") or "").strip().lower()
        if camera_elevation not in {"low", "eye", "high"}:
            camera_elevation = "low" if horizon_line < 0.42 else "high" if horizon_line > 0.62 else "eye"

        fallback_shell = heuristic_aggregate.get("estimatedShell") if isinstance(heuristic_aggregate.get("estimatedShell"), dict) else {}
        width = float(estimated_shell.get("width", fallback_shell.get("width", 20.0)))
        depth = float(estimated_shell.get("depth", fallback_shell.get("depth", 20.0)))
        height = float(estimated_shell.get("height", fallback_shell.get("height", 8.0)))
        open_ceiling = bool(estimated_shell.get("openCeiling", fallback_shell.get("openCeiling", False)))

        if not suggested_camera:
            suggested_camera = {
                "shotType": "wide" if depth_quality == "deep" else "medium" if depth_quality == "medium" else "close-up beauty",
                "target": [0.0, 1.55 if camera_elevation == "high" else 1.25 if camera_elevation == "low" else 1.35, 0.0],
                "positionHint": [0.0, 1.85 if camera_elevation != "low" else 1.55, round(max(3.2, depth * 0.46), 3)],
            }

        plane_confidence = self._normalize_confidence(
            payload.get("planeConfidence", depth_profile.get("planeConfidence", payload.get("confidence"))),
            0.76,
        )

        return {
            "provider": str(payload.get("provider") or "depth_anything"),
            "visiblePlanes": [str(plane) for plane in visible_planes if isinstance(plane, str)],
            "depthProfile": {
                "quality": depth_quality,
                "cameraElevation": camera_elevation,
                "horizonLine": round(horizon_line, 4),
                "foregroundDepth": foreground_depth,
                "backgroundDepth": background_depth,
            },
            "estimatedShell": {
                "width": round(max(4.0, min(60.0, width)), 2),
                "depth": round(max(4.0, min(60.0, depth)), 2),
                "height": round(max(2.5, min(20.0, height)), 2),
                "openCeiling": open_ceiling,
            },
            "suggestedCamera": suggested_camera,
            "suggestedZones": suggested_zones,
            "planeConfidence": plane_confidence,
        }

    def _build_segmentation_prompts(
        self,
        prompt: str,
        preferred_room_type: Optional[str],
        layout_options: Dict[str, Any],
    ) -> List[str]:
        requested_prompts = layout_options.get("segmentationPrompts")
        prompts: List[str] = []
        if isinstance(requested_prompts, list):
            prompts.extend(str(item).strip() for item in requested_prompts if isinstance(item, str) and str(item).strip())

        base_prompts = ["floor", "back wall", "left wall", "right wall", "door", "window", "counter", "table", "shelf", "person"]
        lowered = prompt.lower()
        if preferred_room_type == "storefront" or any(token in lowered for token in ["store", "retail", "pizza", "restaurant", "cafe", "shop"]):
            base_prompts.extend(["menu board", "prep counter", "oven", "display window"])
        if preferred_room_type == "warehouse" or any(token in lowered for token in ["warehouse", "industrial", "factory"]):
            base_prompts.extend(["loading bay", "rack", "pallet"])

        for item in base_prompts:
            if item not in prompts:
                prompts.append(item)
        return prompts[: self.segmentation_prompt_limit]

    def _request_structured_layout_hints(
        self,
        *,
        heuristic_result: Dict[str, Any],
        reference_images: List[str],
        prompt: str,
        preferred_room_type: Optional[str],
        layout_options: Dict[str, Any],
    ) -> Dict[str, Any]:
        heuristic_layout = heuristic_result.get("layoutHints") if isinstance(heuristic_result.get("layoutHints"), dict) else {}
        heuristic_aggregate = heuristic_layout.get("aggregate") if isinstance(heuristic_layout.get("aggregate"), dict) else {}
        data_urls = [self._image_ref_to_data_url(image_ref) for image_ref in reference_images]
        payload = {
            "referenceImages": data_urls,
            "prompt": prompt,
            "preferredRoomType": preferred_room_type,
            "segmentationPrompts": self._build_segmentation_prompts(prompt, preferred_room_type, layout_options),
            "layoutOptions": layout_options,
        }

        warnings: List[str] = []
        segmentation_payload: Dict[str, Any] = {}
        depth_payload: Dict[str, Any] = {}

        if self.sam2_url:
            try:
                segmentation_payload = self._post_external_json(self.sam2_url, payload)
            except Exception as exc:
                warnings.append(f"SAM 2 request failed: {exc}")

        if self.depth_url:
            try:
                depth_payload = self._post_external_json(self.depth_url, payload)
            except Exception as exc:
                warnings.append(f"Depth request failed: {exc}")

        if not segmentation_payload and not depth_payload:
            raise RuntimeError("No structured layout signals were returned from SAM 2 / depth endpoints")

        segmentation_result = self._normalize_segmentation_payload(
            segmentation_payload if isinstance(segmentation_payload, dict) else {},
            prompt=prompt,
            preferred_room_type=preferred_room_type,
            fallback_room_type=str(heuristic_aggregate.get("roomType") or "studio_shell"),
            fallback_zones=heuristic_aggregate.get("suggestedZones") if isinstance(heuristic_aggregate.get("suggestedZones"), dict) else {},
        )
        depth_result = self._normalize_depth_payload(
            depth_payload if isinstance(depth_payload, dict) else {},
            heuristic_aggregate=heuristic_aggregate,
        )

        return self._merge_structured_layout_results(
            heuristic_result=heuristic_result,
            segmentation_result=segmentation_result,
            depth_result=depth_result,
            warnings=warnings,
        )

    def _merge_structured_layout_results(
        self,
        *,
        heuristic_result: Dict[str, Any],
        segmentation_result: Dict[str, Any],
        depth_result: Dict[str, Any],
        warnings: List[str],
    ) -> Dict[str, Any]:
        heuristic_layout = heuristic_result.get("layoutHints") if isinstance(heuristic_result.get("layoutHints"), dict) else {}
        heuristic_images = heuristic_layout.get("images") if isinstance(heuristic_layout.get("images"), list) else []
        heuristic_aggregate = heuristic_layout.get("aggregate") if isinstance(heuristic_layout.get("aggregate"), dict) else {}

        aggregate = dict(heuristic_aggregate)
        visible_planes = [
            plane
            for plane in segmentation_result.get("visiblePlanes", []) or depth_result.get("visiblePlanes", []) or aggregate.get("visiblePlanes", [])
            if isinstance(plane, str)
        ]
        if visible_planes:
            aggregate["visiblePlanes"] = visible_planes
            aggregate["floorVisible"] = "floor" in visible_planes
            aggregate["leftWallVisible"] = "leftWall" in visible_planes
            aggregate["rightWallVisible"] = "rightWall" in visible_planes
            aggregate["backWallVisible"] = "backWall" in visible_planes or "rearWall" in visible_planes

        room_type = segmentation_result.get("roomType") or aggregate.get("roomType") or "studio_shell"
        aggregate["roomType"] = room_type

        if isinstance(depth_result.get("depthProfile"), dict):
            depth_profile = depth_result["depthProfile"]
            aggregate["depthProfile"] = depth_profile
            aggregate["depthQuality"] = depth_profile.get("quality") or aggregate.get("depthQuality")
            aggregate["cameraElevation"] = depth_profile.get("cameraElevation") or aggregate.get("cameraElevation")
            aggregate["horizonLine"] = depth_profile.get("horizonLine", aggregate.get("horizonLine"))

        if isinstance(depth_result.get("estimatedShell"), dict):
            aggregate["estimatedShell"] = depth_result["estimatedShell"]
        if isinstance(depth_result.get("suggestedCamera"), dict):
            aggregate["suggestedCamera"] = self._deep_merge(aggregate.get("suggestedCamera") or {}, depth_result["suggestedCamera"])

        structured_zones = segmentation_result.get("suggestedZones") if isinstance(segmentation_result.get("suggestedZones"), dict) else {}
        if not structured_zones and isinstance(depth_result.get("suggestedZones"), dict):
            structured_zones = depth_result["suggestedZones"]
        if structured_zones:
            aggregate["suggestedZones"] = self._deep_merge(aggregate.get("suggestedZones") or {}, structured_zones)

        aggregate["detectedOpenings"] = segmentation_result.get("detectedOpenings") or []
        aggregate["objectAnchors"] = segmentation_result.get("objectAnchors") or []
        aggregate["surfacePolygons"] = segmentation_result.get("surfacePolygons") or {}
        aggregate["peopleCount"] = int(segmentation_result.get("peopleCount") or 0)
        aggregate["visiblePlaneConfidence"] = segmentation_result.get("visiblePlaneConfidence") or {}
        aggregate["sourceSignals"] = {
            "segmentationProvider": segmentation_result.get("provider"),
            "depthProvider": depth_result.get("provider"),
            "openingCount": len(aggregate["detectedOpenings"]),
            "anchorCount": len(aggregate["objectAnchors"]),
            "peopleCount": aggregate["peopleCount"],
            "planeConfidence": float(depth_result.get("planeConfidence") or segmentation_result.get("confidence") or 0.0),
        }

        summary = (
            f"SAM 2 / depth layout resolved {room_type.replace('_', ' ')} with "
            f"{len(visible_planes)} visible plane(s), {len(aggregate['detectedOpenings'])} opening(s) "
            f"and {len(aggregate['objectAnchors'])} anchor hint(s)."
        )

        merged_images: List[Dict[str, Any]] = [dict(item) for item in heuristic_images]
        if merged_images:
            merged_images[0]["structuredSignals"] = {
                "detectedOpenings": aggregate["detectedOpenings"],
                "objectAnchors": aggregate["objectAnchors"],
                "surfacePolygons": aggregate["surfacePolygons"],
                "peopleCount": aggregate["peopleCount"],
            }
        else:
            merged_images = [{"structuredSignals": aggregate.get("sourceSignals") or {}}]

        return {
            "success": True,
            "provider": "sam2_depth",
            "requestedProvider": "sam2_depth",
            "usedFallback": False,
            "warnings": warnings,
            "capabilities": {
                "supportsDepthEstimation": bool(self.depth_url),
                "supportsSegmentation": bool(self.sam2_url),
            },
            "summary": summary,
            "layoutHints": {
                "images": merged_images,
                "aggregate": aggregate,
            },
        }

    def _deep_merge(self, base: Any, override: Any) -> Any:
        if isinstance(base, dict) and isinstance(override, dict):
            merged = dict(base)
            for key, value in override.items():
                if key in merged:
                    merged[key] = self._deep_merge(merged[key], value)
                else:
                    merged[key] = value
            return merged

        if isinstance(base, list) and isinstance(override, list):
            if not override:
                return list(base)
            return list(override)

        return override if override is not None else base

    def _normalize_external_result(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("External layout payload must be an object")

        normalized_payload = dict(payload)
        for nested_key in ["layout", "segmentation", "depth", "sam2"]:
            nested_payload = normalized_payload.get(nested_key)
            if isinstance(nested_payload, dict):
                normalized_payload = self._deep_merge(normalized_payload, nested_payload)

        layout_hints = normalized_payload.get("layoutHints")
        if isinstance(layout_hints, dict):
            aggregate = layout_hints.get("aggregate") if isinstance(layout_hints.get("aggregate"), dict) else dict(layout_hints)
            images = layout_hints.get("images") if isinstance(layout_hints.get("images"), list) else []
        else:
            aggregate = {}
            images = []

        if not aggregate:
            for key in [
                "roomType",
                "composition",
                "cameraElevation",
                "depthQuality",
                "floorVisible",
                "leftWallVisible",
                "rightWallVisible",
                "backWallVisible",
                "visiblePlanes",
                "estimatedShell",
                "suggestedCamera",
                "suggestedZones",
                "depthProfile",
                "dominantPalette",
                "detectedOpenings",
                "objectAnchors",
                "surfacePolygons",
                "visiblePlaneConfidence",
                "sourceSignals",
            ]:
                value = normalized_payload.get(key)
                if value is not None:
                    aggregate[key] = value

        capabilities = normalized_payload.get("capabilities") if isinstance(normalized_payload.get("capabilities"), dict) else {}
        supports_depth = bool(capabilities.get("supportsDepthEstimation", normalized_payload.get("supportsDepthEstimation", True)))
        supports_segmentation = bool(capabilities.get("supportsSegmentation", normalized_payload.get("supportsSegmentation", True)))

        return {
            "success": True,
            "provider": str(normalized_payload.get("provider") or "sam2_depth"),
            "requestedProvider": "sam2_depth",
            "usedFallback": False,
            "warnings": normalized_payload.get("warnings") if isinstance(normalized_payload.get("warnings"), list) else [],
            "capabilities": {
                "supportsDepthEstimation": supports_depth,
                "supportsSegmentation": supports_segmentation,
            },
            "summary": str(normalized_payload.get("summary") or "").strip(),
            "layoutHints": {
                "images": images,
                "aggregate": aggregate,
            },
        }

    def _post_external_json(self, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if url.startswith("internal://gemini_layout"):
            try:
                try:
                    from gemini_environment_provider import get_or_create_gemini_environment_provider
                except ImportError:
                    from backend.gemini_environment_provider import get_or_create_gemini_environment_provider

                provider = get_or_create_gemini_environment_provider()
                return provider.analyze_layout(
                    reference_images=payload.get("referenceImages") or [],
                    prompt=str(payload.get("prompt") or ""),
                    preferred_room_type=payload.get("preferredRoomType"),
                    segmentation_prompts=payload.get("segmentationPrompts") if isinstance(payload.get("segmentationPrompts"), list) else [],
                    layout_options=payload.get("layoutOptions") if isinstance(payload.get("layoutOptions"), dict) else {},
                )
            except Exception as exc:
                raise RuntimeError(f"Internal Gemini layout provider failed: {exc}") from exc

        headers = self._build_external_headers(url)
        with httpx.Client(timeout=self.request_timeout_seconds) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        if not isinstance(data, dict):
            raise ValueError("External layout provider returned a non-object response")
        return data

    def _request_external_layout_hints(
        self,
        reference_images: List[str],
        prompt: str,
        preferred_room_type: Optional[str],
    ) -> Dict[str, Any]:
        data_urls = [self._image_ref_to_data_url(image_ref) for image_ref in reference_images]
        payload = {
            "referenceImages": data_urls,
            "prompt": prompt,
            "preferredRoomType": preferred_room_type,
        }

        if self.external_layout_url:
            return self._normalize_external_result(self._post_external_json(self.external_layout_url, payload))

        merged_payload: Dict[str, Any] = {}
        if self.sam2_url:
            merged_payload = self._deep_merge(merged_payload, self._post_external_json(self.sam2_url, payload))
        if self.depth_url:
            merged_payload = self._deep_merge(merged_payload, self._post_external_json(self.depth_url, payload))

        if not merged_payload:
            raise RuntimeError("No external layout provider endpoints are configured")

        if "provider" not in merged_payload:
            merged_payload["provider"] = "sam2_depth"
        if "capabilities" not in merged_payload:
            merged_payload["capabilities"] = {
                "supportsDepthEstimation": bool(self.depth_url),
                "supportsSegmentation": bool(self.sam2_url),
            }
        return self._normalize_external_result(merged_payload)

    def _merge_layout_results(
        self,
        heuristic_result: Dict[str, Any],
        external_result: Dict[str, Any],
        requested_provider: str,
    ) -> Dict[str, Any]:
        heuristic_layout = heuristic_result.get("layoutHints") if isinstance(heuristic_result.get("layoutHints"), dict) else {}
        external_layout = external_result.get("layoutHints") if isinstance(external_result.get("layoutHints"), dict) else {}

        heuristic_images = heuristic_layout.get("images") if isinstance(heuristic_layout.get("images"), list) else []
        external_images = external_layout.get("images") if isinstance(external_layout.get("images"), list) else []
        merged_images: List[Dict[str, Any]] = []
        max_images = max(len(heuristic_images), len(external_images))
        for index in range(max_images):
            base_image = heuristic_images[index] if index < len(heuristic_images) and isinstance(heuristic_images[index], dict) else {}
            override_image = external_images[index] if index < len(external_images) and isinstance(external_images[index], dict) else {}
            merged_images.append(self._deep_merge(base_image, override_image))

        heuristic_aggregate = heuristic_layout.get("aggregate") if isinstance(heuristic_layout.get("aggregate"), dict) else {}
        external_aggregate = external_layout.get("aggregate") if isinstance(external_layout.get("aggregate"), dict) else {}
        merged_aggregate = self._deep_merge(heuristic_aggregate, external_aggregate)

        provider = str(external_result.get("provider") or "sam2_depth")
        capabilities = external_result.get("capabilities") if isinstance(external_result.get("capabilities"), dict) else {}
        warnings = []
        for source in [heuristic_result.get("warnings"), external_result.get("warnings")]:
            if isinstance(source, list):
                warnings.extend(str(item) for item in source if item)

        summary = str(external_result.get("summary") or "").strip() or self._build_summary(merged_aggregate, provider_label=provider.replace("_", " "))
        return {
            "success": True,
            "provider": provider,
            "requestedProvider": requested_provider,
            "usedFallback": False,
            "warnings": warnings,
            "capabilities": {
                "supportsDepthEstimation": bool(capabilities.get("supportsDepthEstimation", False)),
                "supportsSegmentation": bool(capabilities.get("supportsSegmentation", False)),
            },
            "summary": summary,
            "layoutHints": {
                "images": merged_images,
                "aggregate": merged_aggregate,
            },
        }

    def _aggregate_layout_hints(
        self,
        analyses: List[Dict[str, Any]],
        prompt: str,
        preferred_room_type: Optional[str],
    ) -> Dict[str, Any]:
        if len(analyses) == 1:
            single = dict(analyses[0])
            single["imageCount"] = 1
            return single

        def vote(key: str, default: str) -> str:
            counts: Dict[str, int] = {}
            for analysis in analyses:
                value = str(analysis.get(key, default))
                counts[value] = counts.get(value, 0) + 1
            return max(counts.items(), key=lambda item: item[1])[0]

        image_count = len(analyses)
        avg_horizon = sum(float(item.get("horizonLine", 0.55)) for item in analyses) / image_count
        avg_shell_width = sum(float(item["estimatedShell"]["width"]) for item in analyses) / image_count
        avg_shell_depth = sum(float(item["estimatedShell"]["depth"]) for item in analyses) / image_count
        avg_shell_height = sum(float(item["estimatedShell"]["height"]) for item in analyses) / image_count
        open_ceiling = sum(1 for item in analyses if bool(item.get("openCeiling"))) >= max(1, image_count // 2)
        suggested_cameras = [item.get("suggestedCamera") or {} for item in analyses]
        avg_target_x = sum(float((camera.get("target") or [0.0, 1.35, 0.0])[0]) for camera in suggested_cameras) / image_count
        avg_target_y = sum(float((camera.get("target") or [0.0, 1.35, 0.0])[1]) for camera in suggested_cameras) / image_count
        avg_pos_x = sum(float((camera.get("positionHint") or [0.0, 1.65, 4.5])[0]) for camera in suggested_cameras) / image_count
        avg_pos_y = sum(float((camera.get("positionHint") or [0.0, 1.65, 4.5])[1]) for camera in suggested_cameras) / image_count
        avg_pos_z = sum(float((camera.get("positionHint") or [0.0, 1.65, 4.5])[2]) for camera in suggested_cameras) / image_count

        palette: List[str] = []
        for analysis in analyses:
            for color in analysis.get("dominantPalette", []):
                if color not in palette:
                    palette.append(color)
                if len(palette) >= 4:
                    break
            if len(palette) >= 4:
                break

        room_type = preferred_room_type or vote("roomType", "studio_shell")
        depth_quality = vote("depthQuality", "medium")
        composition = vote("composition", "centered")
        if room_type == "outdoor_illusion" or depth_quality == "deep":
            shot_type = "wide"
        elif depth_quality == "shallow":
            shot_type = "close-up beauty"
        else:
            shot_type = "medium" if composition == "centered" else "medium-wide"
        aggregate_visible_planes: List[str] = []
        for analysis in analyses:
            for plane in analysis.get("visiblePlanes", []):
                if plane not in aggregate_visible_planes:
                    aggregate_visible_planes.append(str(plane))
        suggested_zones = self._build_suggested_zones(
            composition=composition,
            depth_quality=depth_quality,
            room_type=room_type,
            left_wall_visible=sum(1 for item in analyses if item.get("leftWallVisible")) >= max(1, image_count // 2),
            right_wall_visible=sum(1 for item in analyses if item.get("rightWallVisible")) >= max(1, image_count // 2),
            back_wall_visible=sum(1 for item in analyses if item.get("backWallVisible")) >= max(1, image_count // 2),
        )
        return {
            "imageCount": image_count,
            "roomType": room_type,
            "composition": composition,
            "cameraElevation": vote("cameraElevation", "eye"),
            "depthQuality": depth_quality,
            "floorVisible": sum(1 for item in analyses if item.get("floorVisible")) >= max(1, image_count // 2),
            "leftWallVisible": sum(1 for item in analyses if item.get("leftWallVisible")) >= max(1, image_count // 2),
            "rightWallVisible": sum(1 for item in analyses if item.get("rightWallVisible")) >= max(1, image_count // 2),
            "backWallVisible": sum(1 for item in analyses if item.get("backWallVisible")) >= max(1, image_count // 2),
            "horizonLine": round(avg_horizon, 4),
            "openCeiling": open_ceiling,
            "dominantPalette": palette,
            "visiblePlanes": aggregate_visible_planes,
            "depthProfile": {
                "quality": depth_quality,
                "cameraElevation": vote("cameraElevation", "eye"),
                "horizonLine": round(avg_horizon, 4),
            },
            "estimatedShell": {
                "width": round(avg_shell_width, 2),
                "depth": round(avg_shell_depth, 2),
                "height": round(avg_shell_height, 2),
                "openCeiling": open_ceiling,
            },
            "suggestedCamera": {
                "shotType": shot_type,
                "target": [round(avg_target_x, 3), round(avg_target_y, 3), 0.0],
                "positionHint": [round(avg_pos_x, 3), round(avg_pos_y, 3), round(avg_pos_z, 3)],
            },
            "suggestedZones": suggested_zones,
            "promptBias": prompt[:240],
        }
