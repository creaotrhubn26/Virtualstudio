import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.avatar_provider_service import AvatarGenerationRequest

_BACKEND_MAIN_PATH = Path(__file__).resolve().parent / "main.py"
_BACKEND_MAIN_SPEC = importlib.util.spec_from_file_location("virtualstudio_backend_main_avatar_routes", _BACKEND_MAIN_PATH)
if _BACKEND_MAIN_SPEC is None or _BACKEND_MAIN_SPEC.loader is None:
    raise RuntimeError("Could not load backend/main.py for avatar provider route tests")
backend_main = importlib.util.module_from_spec(_BACKEND_MAIN_SPEC)
_BACKEND_MAIN_SPEC.loader.exec_module(backend_main)


class _AvatarProviderServiceStub:
    def get_provider_health(self, probe: bool = False):
        return {
            "providers": {
                "didimo": {
                    "id": "didimo",
                    "name": "Didimo",
                    "generationReady": True,
                    "probe": {"healthy": True} if probe else None,
                },
                "avaturn": {
                    "id": "avaturn",
                    "name": "Avaturn",
                    "generationReady": True,
                    "probe": {"healthy": True} if probe else None,
                },
                "local": {
                    "id": "local",
                    "name": "Local SAM3D",
                    "generationReady": True,
                    "probe": {"healthy": True} if probe else None,
                },
            }
        }

    def recommend_provider(self, character_tier: str, requested_provider: str = "auto"):
        if character_tier == "hero_talent":
            return {"provider": "didimo", "fallbackProvider": "local", "qualityMode": "premium"}
        return {"provider": "avaturn", "fallbackProvider": "local", "qualityMode": "premium"}

    async def generate_avatar(self, input_path, output_path, request_id, request, depth_path=None, extra_input_paths=None):
        del input_path, request_id, depth_path, extra_input_paths
        output_path.write_bytes(b"glb-binary")
        return {
            "success": True,
            "provider": "didimo" if request.character_tier == "hero_talent" else "avaturn",
            "providerName": "Didimo" if request.character_tier == "hero_talent" else "Avaturn",
            "usedFallback": False,
            "metadata": {
                "type": "avatar",
                "vertices": 125000,
                "faces": 248000,
            },
            "qualityReport": {
                "providerUsed": "didimo" if request.character_tier == "hero_talent" else "avaturn",
                "premiumReady": True,
                "usedFallback": False,
                "issues": [],
            },
        }


class AvatarProviderRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(backend_main.app)

    def test_avatar_provider_health_route_returns_recommendations(self):
        stub = {"service": _AvatarProviderServiceStub(), "requestClass": object}
        with patch.object(backend_main, "get_or_create_avatar_provider_service", return_value=stub):
            response = self.client.get("/api/avatar/providers/health?probe=true")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["recommendations"]["hero_talent"]["provider"], "didimo")
        self.assertTrue(payload["providers"]["didimo"]["probe"]["healthy"])

    def test_avatar_generate_route_returns_provider_and_quality_report(self):
        stub = {"service": _AvatarProviderServiceStub(), "requestClass": AvatarGenerationRequest}

        with patch.object(backend_main, "get_or_create_avatar_provider_service", return_value=stub), \
             patch.object(backend_main, "face_analysis", None), \
             patch.object(backend_main, "facexformer", None), \
             patch.object(backend_main, "store_generated_file", return_value={"storage": "local", "url": "/api/avatar/test.glb"}), \
             patch.object(backend_main, "write_storage_metadata", return_value=None):
            response = self.client.post(
                "/api/avatar/generate",
                data={
                    "provider": "auto",
                    "character_tier": "hero_talent",
                    "quality_target": "hero_closeup",
                    "branding_mode": "hero_styling",
                    "allow_fallback": "false",
                },
                files={"file": ("portrait.jpg", b"fake-image", "image/jpeg")},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["provider"], "didimo")
        self.assertEqual(payload["providerName"], "Didimo")
        self.assertFalse(payload["usedFallback"])
        self.assertTrue(payload["qualityReport"]["premiumReady"])
        self.assertEqual(payload["glb_url"], "/api/avatar/test.glb")


if __name__ == "__main__":
    unittest.main()
