import asyncio
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.avatar_provider_service import AvatarGenerationRequest, AvatarProviderService, DidimoApiAvatarProvider


class _DummyProvider:
    def __init__(self, provider_id: str, generation_ready: bool = True):
        self.provider_id = provider_id
        self.generation_ready = generation_ready
        self.generate_calls = 0

    def get_health(self, probe: bool = False):
        return {
            "id": self.provider_id,
            "generationReady": self.generation_ready,
            "probe": {"healthy": self.generation_ready} if probe else None,
        }

    async def generate(self, input_path, output_path, request_id, request, depth_path=None, extra_input_paths=None):
        del input_path, request_id, request, depth_path, extra_input_paths
        self.generate_calls += 1
        output_path.write_bytes(b"glb")
        return {
            "success": True,
            "providerName": self.provider_id.title(),
            "metadata": {
                "type": "avatar",
            },
        }


class _AsyncResponse:
    def __init__(self, status_code, json_data=None, content=b"", text=""):
        self.status_code = status_code
        self._json_data = json_data
        self.content = content
        self.text = text or ("" if json_data is None else str(json_data))
        self.headers = {"content-type": "application/json" if json_data is not None else "model/gltf-binary"}

    def json(self):
        if self._json_data is None:
            raise ValueError("No JSON payload")
        return self._json_data


class _AsyncClientStub:
    def __init__(self, responses):
        self._responses = list(responses)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        del args, kwargs
        return self._responses.pop(0)

    async def get(self, *args, **kwargs):
        del args, kwargs
        return self._responses.pop(0)


async def _noop_sleep(_seconds):
    return None


class AvatarProviderServiceTest(unittest.TestCase):
    def test_didimo_provider_polls_and_downloads_gltf_result(self):
        provider = DidimoApiAvatarProvider()
        input_path = Path("/tmp/didimo-input.jpg")
        output_path = Path("/tmp/didimo-output.glb")
        input_path.write_bytes(b"image")

        responses = [
            _AsyncResponse(201, {"key": "didimo_123", "status": "processing"}),
            _AsyncResponse(200, {"key": "didimo_123", "status": "completed", "results": {"gltf": {"url": "https://download.example/gltf"}}}),
            _AsyncResponse(200, None, content=b"glb-bytes"),
        ]

        try:
            with patch.dict(
                os.environ,
                {
                    "DIDIMO_API_KEY": "test-key",
                    "DIDIMO_API_BASE_URL": "https://api.didimo.co",
                    "DIDIMO_POLL_INTERVAL_SECONDS": "1",
                },
                clear=False,
            ), patch("backend.avatar_provider_service.httpx.AsyncClient", return_value=_AsyncClientStub(responses)), \
                patch("backend.avatar_provider_service.asyncio.sleep", new=_noop_sleep):
                result = asyncio.run(
                    provider.generate(
                        input_path=input_path,
                        output_path=output_path,
                        request_id="req-hero",
                        request=AvatarGenerationRequest(provider="didimo", character_tier="hero_talent"),
                    )
                )
        finally:
            if input_path.exists():
                input_path.unlink()
            if output_path.exists():
                output_path.unlink()

        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "didimo")
        self.assertEqual(result["metadata"]["didimoKey"], "didimo_123")

    def test_recommend_provider_prefers_hero_provider_when_ready(self):
        service = AvatarProviderService()
        service.providers = {
            "didimo": _DummyProvider("didimo", generation_ready=True),
            "avaturn": _DummyProvider("avaturn", generation_ready=True),
            "in3d": _DummyProvider("in3d", generation_ready=True),
            "local": _DummyProvider("local", generation_ready=True),
        }

        recommendation = service.recommend_provider("hero_talent", "auto")

        self.assertEqual(recommendation["provider"], "didimo")
        self.assertEqual(recommendation["qualityMode"], "premium")

    def test_recommend_provider_falls_back_to_local_when_premium_missing(self):
        service = AvatarProviderService()
        service.providers = {
            "didimo": _DummyProvider("didimo", generation_ready=False),
            "avaturn": _DummyProvider("avaturn", generation_ready=True),
            "in3d": _DummyProvider("in3d", generation_ready=True),
            "local": _DummyProvider("local", generation_ready=True),
        }

        recommendation = service.recommend_provider("hero_talent", "auto")

        self.assertEqual(recommendation["provider"], "local")
        self.assertEqual(recommendation["blockedProvider"], "didimo")
        self.assertEqual(recommendation["qualityMode"], "fallback")

    def test_generate_avatar_blocks_auto_fallback_without_permission(self):
        service = AvatarProviderService()
        service.providers = {
            "didimo": _DummyProvider("didimo", generation_ready=False),
            "avaturn": _DummyProvider("avaturn", generation_ready=True),
            "in3d": _DummyProvider("in3d", generation_ready=True),
            "local": _DummyProvider("local", generation_ready=True),
        }

        request = AvatarGenerationRequest(
            provider="auto",
            character_tier="hero_talent",
            allow_fallback=False,
        )

        with self.assertRaises(RuntimeError):
            asyncio.run(
                service.generate_avatar(
                    input_path=Path("/tmp/avatar-input.jpg"),
                    output_path=Path("/tmp/avatar-output.glb"),
                    request_id="req-1",
                    request=request,
                )
            )

    def test_generate_avatar_uses_local_fallback_when_allowed(self):
        service = AvatarProviderService()
        didimo = _DummyProvider("didimo", generation_ready=False)
        local = _DummyProvider("local", generation_ready=True)
        service.providers = {
            "didimo": didimo,
            "avaturn": _DummyProvider("avaturn", generation_ready=True),
            "in3d": _DummyProvider("in3d", generation_ready=True),
            "local": local,
        }

        request = AvatarGenerationRequest(
            provider="auto",
            character_tier="hero_talent",
            allow_fallback=True,
        )

        output_path = Path("/tmp/avatar-provider-service-output.glb")
        try:
            result = asyncio.run(
                service.generate_avatar(
                    input_path=Path("/tmp/avatar-input.jpg"),
                    output_path=output_path,
                    request_id="req-2",
                    request=request,
                )
            )
        finally:
            if output_path.exists():
                output_path.unlink()

        self.assertEqual(result["provider"], "local")
        self.assertTrue(result["usedFallback"])
        self.assertFalse(result["qualityReport"]["premiumReady"])
        self.assertEqual(local.generate_calls, 1)


if __name__ == "__main__":
    unittest.main()
