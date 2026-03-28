import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

try:
    from environment_layout_service import EnvironmentLayoutService
except ImportError:
    from backend.environment_layout_service import EnvironmentLayoutService


def _create_reference_image(path: Path, accent_side: str = "left") -> None:
    image = Image.new("RGB", (640, 360), "#c9d2db")
    draw = ImageDraw.Draw(image)

    draw.rectangle([0, 0, 639, 150], fill="#dce8f5")
    draw.polygon([(0, 160), (140, 130), (140, 359), (0, 359)], fill="#8b715b")
    draw.polygon([(639, 160), (500, 130), (500, 359), (639, 359)], fill="#726456")
    draw.polygon([(140, 130), (500, 130), (590, 359), (50, 359)], fill="#c7a87d")
    draw.rectangle([240, 150, 400, 280], fill="#556270")

    if accent_side == "left":
        draw.rectangle([90, 110, 170, 250], fill="#2f4858")
    else:
        draw.rectangle([470, 110, 550, 250], fill="#2f4858")

    image.save(path)


class EnvironmentLayoutServiceTest(unittest.TestCase):
    def create_service(self) -> EnvironmentLayoutService:
        service = EnvironmentLayoutService()
        service.external_layout_url = ""
        service.sam2_url = ""
        service.depth_url = ""
        return service

    def test_analyze_images_returns_layout_hints(self) -> None:
        service = self.create_service()

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            result = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="interior showroom for a product launch",
                preferred_room_type="interior_room",
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "heuristics")
        aggregate = result["layoutHints"]["aggregate"]
        self.assertEqual(aggregate["roomType"], "interior_room")
        self.assertIn("estimatedShell", aggregate)
        self.assertGreater(aggregate["estimatedShell"]["width"], 0)
        self.assertGreater(aggregate["estimatedShell"]["depth"], 0)
        self.assertIn(aggregate["suggestedCamera"]["shotType"], {"wide", "medium", "medium-wide", "close-up beauty"})

    def test_analyze_images_aggregates_multiple_references(self) -> None:
        service = self.create_service()

        with tempfile.TemporaryDirectory() as tmpdir:
            left_path = Path(tmpdir) / "left.png"
            right_path = Path(tmpdir) / "right.png"
            _create_reference_image(left_path, accent_side="left")
            _create_reference_image(right_path, accent_side="right")

            result = service.analyze_images(
                reference_images=[str(left_path), str(right_path)],
                prompt="warehouse showroom",
                preferred_room_type="warehouse",
            )

        aggregate = result["layoutHints"]["aggregate"]
        self.assertEqual(aggregate["imageCount"], 2)
        self.assertEqual(aggregate["roomType"], "warehouse")
        self.assertIn("dominantPalette", aggregate)
        self.assertGreaterEqual(len(aggregate["dominantPalette"]), 1)

    def test_requested_sam2_provider_falls_back_to_heuristics_when_no_external_endpoint_exists(self) -> None:
        service = self.create_service()

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            result = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="interior showroom",
                preferred_room_type="interior_room",
                provider="sam2_depth",
            )

        self.assertEqual(result["provider"], "heuristics")
        self.assertTrue(result["usedFallback"])
        self.assertTrue(any("heuristics fallback" in warning.lower() for warning in result["warnings"]))

    def test_status_reports_structured_provider_readiness(self) -> None:
        service = self.create_service()
        service.external_layout_url = ""
        service.sam2_url = "https://sam2.example/api"
        service.depth_url = ""

        status = service.get_status()

        self.assertTrue(status["supportsSegmentation"])
        self.assertFalse(status["supportsDepthEstimation"])
        self.assertTrue(status["structuredProvidersReady"])
        self.assertTrue(status["sam2Configured"])
        self.assertFalse(status["depthConfigured"])
        self.assertFalse(status["usesUnifiedExternalEndpoint"])

    def test_provider_health_reports_configuration_state(self) -> None:
        service = self.create_service()
        service.external_layout_url = ""
        service.sam2_url = "https://sam2.example/api"
        service.depth_url = ""

        health = service.get_provider_health(probe=False)

        self.assertEqual(health["provider"], service.provider)
        self.assertFalse(health["probeEnabled"])
        self.assertFalse(health["providers"]["unified"]["configured"])
        self.assertTrue(health["providers"]["sam2"]["configured"])
        self.assertFalse(health["providers"]["depth"]["configured"])

    def test_provider_health_can_probe_configured_endpoints(self) -> None:
        service = self.create_service()
        service.sam2_url = "https://sam2.example/api"
        service.depth_url = "https://depth.example/api"
        service._probe_provider_url = lambda url: {  # type: ignore[method-assign]
            "configured": True,
            "healthy": True,
            "reachable": True,
            "statusCode": 200,
            "method": "GET",
            "url": url,
        }

        health = service.get_provider_health(probe=True)

        self.assertTrue(health["probeEnabled"])
        self.assertTrue(health["providers"]["sam2"]["probe"]["healthy"])
        self.assertTrue(health["providers"]["depth"]["probe"]["reachable"])

    def test_external_provider_result_is_merged_with_heuristics(self) -> None:
        service = self.create_service()
        service.external_layout_url = "https://layout-provider.example/api"
        service.sam2_url = ""
        service.depth_url = ""
        service._request_external_layout_hints = lambda **_kwargs: {  # type: ignore[method-assign]
            "success": True,
            "provider": "sam2_depth",
            "summary": "External layout provider suggests a deeper warehouse shell.",
            "capabilities": {
                "supportsDepthEstimation": True,
                "supportsSegmentation": True,
            },
            "layoutHints": {
                "aggregate": {
                    "roomType": "warehouse",
                    "depthQuality": "deep",
                    "estimatedShell": {
                        "width": 19.5,
                        "depth": 16.2,
                        "height": 7.6,
                        "openCeiling": True,
                    },
                    "visiblePlanes": ["floor", "backWall", "leftWall"],
                    "suggestedCamera": {
                        "shotType": "wide",
                        "target": [0.4, 1.35, 0.0],
                        "positionHint": [0.1, 1.8, 7.5],
                    },
                    "suggestedZones": {
                        "hero": {
                            "xBias": 0.4,
                            "depthZone": "midground",
                        }
                    },
                }
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            result = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="industrial warehouse product set",
                provider="sam2_depth",
            )

        aggregate = result["layoutHints"]["aggregate"]
        self.assertEqual(result["provider"], "sam2_depth")
        self.assertFalse(result["usedFallback"])
        self.assertEqual(aggregate["roomType"], "warehouse")
        self.assertEqual(aggregate["depthQuality"], "deep")
        self.assertEqual(aggregate["suggestedCamera"]["shotType"], "wide")
        self.assertEqual(aggregate["suggestedZones"]["hero"]["depthZone"], "midground")

    def test_unified_external_provider_can_return_nested_segmentation_and_depth_sections(self) -> None:
        service = self.create_service()
        service.external_layout_url = "https://layout-provider.example/api"
        service.sam2_url = ""
        service.depth_url = ""
        service._request_external_layout_hints = lambda **_kwargs: service._normalize_external_result({  # type: ignore[method-assign]
            "provider": "sam2_depth",
            "segmentation": {
                "detectedOpenings": [
                    {"id": "front_entry", "kind": "door"},
                    {"id": "display_window", "kind": "window"},
                ],
                "objectAnchors": [
                    {"id": "counter_1", "kind": "counter", "bbox": [160, 210, 430, 310]},
                ],
                "visiblePlaneConfidence": {
                    "floor": 0.94,
                    "backWall": 0.88,
                },
            },
            "depth": {
                "depthProfile": {
                    "quality": "deep",
                    "cameraElevation": "mid",
                    "horizonLine": 0.45,
                },
                "estimatedShell": {
                    "width": 16.2,
                    "depth": 12.4,
                    "height": 4.7,
                    "openCeiling": False,
                },
                "suggestedCamera": {
                    "shotType": "wide",
                    "target": [0.15, 1.35, 0.0],
                    "positionHint": [0.1, 1.7, 6.1],
                },
            },
        })

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            result = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="pizza restaurant storefront interior",
                provider="sam2_depth",
            )

        aggregate = result["layoutHints"]["aggregate"]
        self.assertEqual(result["provider"], "sam2_depth")
        self.assertEqual(aggregate["estimatedShell"]["width"], 16.2)
        self.assertEqual(aggregate["depthProfile"]["quality"], "deep")
        self.assertEqual(len(aggregate["detectedOpenings"]), 2)
        self.assertEqual(aggregate["objectAnchors"][0]["kind"], "counter")

    def test_analyze_images_reuses_cached_result_for_identical_external_requests(self) -> None:
        service = self.create_service()
        service.external_layout_url = "https://layout-provider.example/api"
        service.cache_ttl_seconds = 60.0
        call_count = 0

        def _fake_external(**_kwargs):
            nonlocal call_count
            call_count += 1
            return {
                "success": True,
                "provider": "sam2_depth",
                "summary": "Cached structured layout result.",
                "capabilities": {
                    "supportsDepthEstimation": True,
                    "supportsSegmentation": True,
                },
                "layoutHints": {
                    "aggregate": {
                        "roomType": "storefront",
                        "estimatedShell": {"width": 12.0, "depth": 8.0, "height": 5.0, "openCeiling": False},
                    }
                },
            }

        service._request_external_layout_hints = _fake_external  # type: ignore[method-assign]

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            first = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="pizza storefront",
                provider="sam2_depth",
            )
            second = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="pizza storefront",
                provider="sam2_depth",
            )

        self.assertEqual(call_count, 1)
        self.assertFalse(first["cacheHit"])
        self.assertTrue(second["cacheHit"])
        self.assertEqual(second["layoutHints"]["aggregate"]["roomType"], "storefront")

    def test_build_external_headers_can_use_provider_specific_tokens(self) -> None:
        service = self.create_service()
        service.external_auth_header = "Authorization"
        service.external_auth_token = "external-token"
        service.sam2_url = "https://sam2.example/api"
        service.sam2_auth_header = "X-SAM2-Key"
        service.sam2_auth_token = "sam2-token"
        service.depth_url = "https://depth.example/api"
        service.depth_auth_header = "X-Depth-Key"
        service.depth_auth_token = "depth-token"

        self.assertEqual(service._build_external_headers()["Authorization"], "external-token")
        self.assertEqual(service._build_external_headers(service.sam2_url)["X-SAM2-Key"], "sam2-token")
        self.assertEqual(service._build_external_headers(service.depth_url)["X-Depth-Key"], "depth-token")

    def test_separate_sam2_and_depth_payloads_are_normalized_into_structured_layout_hints(self) -> None:
        service = self.create_service()
        service.external_layout_url = ""
        service.sam2_url = "https://sam2.example/api"
        service.depth_url = "https://depth.example/api"
        captured_payloads = []

        def fake_post(url: str, payload: dict) -> dict:
            captured_payloads.append((url, payload))
            if "sam2" in url:
                return {
                    "provider": "sam2",
                    "imageSize": {"width": 640, "height": 360},
                    "planes": [
                        {"target": "floor", "confidence": 0.94},
                        {"target": "back wall", "confidence": 0.88},
                        {"target": "right wall", "confidence": 0.79},
                    ],
                    "objects": [
                        {"label": "front door", "bbox": [40, 98, 170, 358], "confidence": 0.93},
                        {"label": "display window", "bbox": [432, 122, 618, 256], "confidence": 0.86},
                        {"label": "prep counter", "bbox": [176, 214, 432, 308], "confidence": 0.9},
                        {"label": "person", "bbox": [268, 138, 346, 322], "confidence": 0.78},
                    ],
                }
            return {
                "provider": "depth_anything_v2",
                "depthProfile": {
                    "foregroundDepth": 1.1,
                    "backgroundDepth": 4.7,
                    "horizonLine": 0.46,
                },
                "estimatedShell": {
                    "width": 15.4,
                    "depth": 11.6,
                    "height": 4.5,
                    "openCeiling": False,
                },
                "suggestedCamera": {
                    "shotType": "wide",
                    "target": [0.18, 1.4, 0.0],
                    "positionHint": [0.1, 1.75, 5.8],
                },
                "visiblePlanes": ["floor", "backWall", "rightWall"],
            }

        service._post_external_json = fake_post  # type: ignore[method-assign]

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            result = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="pizza restaurant storefront interior",
                preferred_room_type=None,
                provider="sam2_depth",
                layout_options={"segmentationPrompts": ["front door", "display window", "prep counter"]},
            )

        aggregate = result["layoutHints"]["aggregate"]
        self.assertEqual(result["provider"], "sam2_depth")
        self.assertFalse(result["usedFallback"])
        self.assertEqual(aggregate["roomType"], "storefront")
        self.assertEqual(aggregate["estimatedShell"]["width"], 15.4)
        self.assertEqual(aggregate["depthProfile"]["quality"], "deep")
        self.assertEqual(aggregate["suggestedCamera"]["shotType"], "wide")
        self.assertEqual(len(aggregate["detectedOpenings"]), 2)
        self.assertEqual(aggregate["detectedOpenings"][0]["kind"], "door")
        self.assertEqual(aggregate["detectedOpenings"][1]["kind"], "window")
        self.assertEqual(len(aggregate["objectAnchors"]), 1)
        self.assertEqual(aggregate["objectAnchors"][0]["kind"], "counter")
        self.assertEqual(aggregate["peopleCount"], 1)
        self.assertEqual(aggregate["sourceSignals"]["openingCount"], 2)
        self.assertEqual(aggregate["sourceSignals"]["anchorCount"], 1)
        self.assertEqual(captured_payloads[0][1]["layoutOptions"]["segmentationPrompts"][0], "front door")
        self.assertIn("display window", captured_payloads[0][1]["segmentationPrompts"])

    def test_explicit_openings_and_anchors_are_preserved_from_structured_payload(self) -> None:
        service = self.create_service()
        service.external_layout_url = ""
        service.sam2_url = "https://sam2.example/api"
        service.depth_url = "https://depth.example/api"

        def fake_post(url: str, _payload: dict) -> dict:
            if "sam2" in url:
                return {
                    "provider": "sam2",
                    "imageSize": {"width": 1280, "height": 720},
                    "planes": [
                        {"target": "floor", "confidence": 0.95},
                        {"target": "back wall", "confidence": 0.9},
                    ],
                    "openings": [
                        {
                            "id": "service_pass_window",
                            "kind": "service window",
                            "wallTarget": "backWall",
                            "bbox": [760, 180, 1150, 420],
                            "notes": ["Pass-through from kitchen to service line"],
                        }
                    ],
                    "anchors": [
                        {
                            "id": "prep_counter_explicit",
                            "kind": "prep counter",
                            "label": "Prep Counter",
                            "placementMode": "ground",
                            "preferredZonePurpose": "prep",
                            "bbox": [210, 360, 820, 560],
                        }
                    ],
                    "people": [
                        {"id": "worker_1", "role": "staff", "bbox": [430, 240, 560, 620]},
                        {"id": "worker_2", "role": "customer", "bbox": [780, 250, 920, 650]},
                    ],
                }
            return {
                "provider": "depth_anything_v2",
                "depthProfile": {
                    "foregroundDepth": 1.3,
                    "backgroundDepth": 4.1,
                    "horizonLine": 0.5,
                },
                "estimatedShell": {
                    "width": 13.8,
                    "depth": 10.4,
                    "height": 4.7,
                    "openCeiling": False,
                },
            }

        service._post_external_json = fake_post  # type: ignore[method-assign]

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "reference.png"
            _create_reference_image(image_path)

            result = service.analyze_images(
                reference_images=[str(image_path)],
                prompt="pizza restaurant kitchen pass-through",
                provider="sam2_depth",
            )

        aggregate = result["layoutHints"]["aggregate"]
        self.assertEqual(result["provider"], "sam2_depth")
        self.assertEqual(aggregate["detectedOpenings"][0]["id"], "service_pass_window")
        self.assertEqual(aggregate["detectedOpenings"][0]["kind"], "service_window")
        self.assertEqual(aggregate["objectAnchors"][0]["id"], "prep_counter_explicit")
        self.assertEqual(aggregate["objectAnchors"][0]["kind"], "counter")
        self.assertEqual(aggregate["peopleCount"], 2)


if __name__ == "__main__":
    unittest.main()
