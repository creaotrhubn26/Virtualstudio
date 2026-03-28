import unittest
import importlib.util
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

_BACKEND_MAIN_PATH = Path(__file__).resolve().parent / "main.py"
_BACKEND_MAIN_SPEC = importlib.util.spec_from_file_location("virtualstudio_backend_main", _BACKEND_MAIN_PATH)
if _BACKEND_MAIN_SPEC is None or _BACKEND_MAIN_SPEC.loader is None:
    raise RuntimeError("Could not load backend/main.py for provider route tests")
backend_main = importlib.util.module_from_spec(_BACKEND_MAIN_SPEC)
_BACKEND_MAIN_SPEC.loader.exec_module(backend_main)


class _PlannerStub:
    def get_status(self):
        return {"enabled": True, "provider": "gemini"}


class _LayoutStub:
    def get_status(self):
        return {"provider": "auto", "configuredProviders": ["heuristics"]}

    def get_provider_health(self, probe: bool = False):
        return {
            "provider": "auto",
            "probeEnabled": probe,
            "providers": {
                "sam2": {
                    "configured": True,
                    "probe": {"healthy": True, "reachable": True} if probe else None,
                },
            },
        }

    def analyze_images(self, **_kwargs):
        return {
            "success": True,
            "provider": "heuristics",
            "usedFallback": False,
            "summary": "Smoke layout ok",
            "layoutHints": {
                "images": [],
                "aggregate": {
                    "roomType": "storefront",
                    "estimatedShell": {"width": 14.0, "depth": 10.0, "height": 4.6, "openCeiling": False},
                    "suggestedCamera": {"shotType": "hero shot", "target": [0, 1.4, 0], "positionHint": [0, 1.8, -6]},
                    "suggestedZones": {},
                    "objectAnchors": [{"id": "counter_1", "kind": "counter"}],
                    "detectedOpenings": [{"id": "front_entry", "kind": "door"}],
                    "visiblePlanes": ["floor", "backWall"],
                },
            },
        }


class _ValidationStub:
    def get_status(self):
        return {"provider": "auto", "configuredProviders": ["heuristic"]}

    def get_provider_health(self, probe: bool = False):
        return {
            "provider": "auto",
            "probeEnabled": probe,
            "providers": {
                "vision_vlm": {
                    "configured": False,
                    "probe": {"healthy": False, "reachable": False} if probe else None,
                },
            },
        }

    def validate(self, *_args, **_kwargs):
        return {
            "success": True,
            "provider": "heuristic_environment_validation",
            "evaluation": {
                "provider": "heuristic_environment_validation",
                "verdict": "approved",
                "overallScore": 0.82,
                "categories": {
                    "promptFidelity": {"score": 0.84, "notes": []},
                    "compositionMatch": {"score": 0.8, "notes": []},
                    "lightingIntentMatch": {"score": 0.82, "notes": []},
                    "technicalIntegrity": {"score": 0.81, "notes": []},
                    "roomRealism": {"score": 0.8, "notes": []},
                },
                "suggestedAdjustments": [],
                "validatedAt": "2026-03-24T00:00:00Z",
            },
        }


class EnvironmentProviderRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(backend_main.app)

    def test_provider_health_route_returns_layout_and_validation_status(self):
        with patch.object(backend_main, "get_or_create_environment_planner", return_value=_PlannerStub()), \
             patch.object(backend_main, "get_or_create_environment_layout_service", return_value=_LayoutStub()), \
             patch.object(backend_main, "get_or_create_environment_validation_service", return_value=_ValidationStub()):
            response = self.client.get("/api/environment/providers/health?probe=true")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertTrue(payload["probe"])
        self.assertTrue(payload["layout"]["health"]["providers"]["sam2"]["probe"]["healthy"])

    def test_provider_smoke_route_returns_layout_and_validation_results(self):
        with patch.object(backend_main, "get_or_create_environment_layout_service", return_value=_LayoutStub()), \
             patch.object(backend_main, "get_or_create_environment_validation_service", return_value=_ValidationStub()):
            response = self.client.post("/api/environment/providers/smoke", json={})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["layout"]["provider"], "heuristics")
        self.assertEqual(payload["validation"]["provider"], "heuristic_environment_validation")


if __name__ == "__main__":
    unittest.main()
