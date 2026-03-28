from __future__ import annotations

import asyncio
import base64
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import httpx


AvatarProviderId = str


@dataclass
class AvatarGenerationRequest:
    provider: str = "auto"
    character_tier: str = "staff_branded"
    quality_target: str = "production"
    avatar_name: Optional[str] = None
    branding_mode: str = "none"
    body_type: Optional[str] = None
    telephoto: bool = False
    allow_fallback: bool = False


class ConfiguredEndpointAvatarProvider:
    def __init__(
        self,
        provider_id: str,
        display_name: str,
        generate_url_env: str,
        health_url_env: str,
        auth_header_env: str,
        auth_token_env: str,
        api_key_env: str,
        base_url_env: str,
        provider_kind: str,
        quality_ceiling: str,
    ) -> None:
        self.provider_id = provider_id
        self.display_name = display_name
        self.generate_url_env = generate_url_env
        self.health_url_env = health_url_env
        self.auth_header_env = auth_header_env
        self.auth_token_env = auth_token_env
        self.api_key_env = api_key_env
        self.base_url_env = base_url_env
        self.provider_kind = provider_kind
        self.quality_ceiling = quality_ceiling

    def _generate_url(self) -> str:
        return str(os.environ.get(self.generate_url_env, "") or "").strip()

    def _health_url(self) -> str:
        configured = str(os.environ.get(self.health_url_env, "") or "").strip()
        if configured:
            return configured
        return self._generate_url()

    def _auth_header(self) -> str:
        return str(os.environ.get(self.auth_header_env, "Authorization") or "Authorization").strip()

    def _auth_token(self) -> str:
        api_key = str(os.environ.get(self.api_key_env, "") or "").strip()
        if api_key:
            return api_key
        return str(os.environ.get(self.auth_token_env, "") or "").strip()

    def _base_url(self) -> str:
        return str(os.environ.get(self.base_url_env, "") or "").strip()

    def _headers(self) -> Dict[str, str]:
        token = self._auth_token()
        if not token:
            return {}
        header_name = self._auth_header()
        if header_name.lower() == "authorization" and not token.lower().startswith("bearer "):
            token = f"Bearer {token}"
        return {header_name: token}

    def get_health(self, probe: bool = False) -> Dict[str, Any]:
        generate_url = self._generate_url()
        health_url = self._health_url()
        auth_token = self._auth_token()
        base_url = self._base_url()
        health: Dict[str, Any] = {
            "id": self.provider_id,
            "name": self.display_name,
            "kind": self.provider_kind,
            "qualityCeiling": self.quality_ceiling,
            "configured": bool(generate_url),
            "generationReady": bool(generate_url),
            "hasApiKey": bool(auth_token),
            "baseUrl": base_url or None,
            "generateUrl": generate_url or None,
            "healthUrl": health_url or None,
            "probe": None,
        }

        if not probe:
            return health

        if not health_url:
            health["probe"] = {
                "healthy": False,
                "reachable": False,
                "status": "not_configured",
            }
            return health

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(health_url, headers=self._headers())
            health["probe"] = {
                "healthy": response.status_code < 500,
                "reachable": True,
                "statusCode": response.status_code,
            }
        except Exception as error:
            health["probe"] = {
                "healthy": False,
                "reachable": False,
                "status": str(error),
            }
        return health

    async def generate(
        self,
        input_path: Path,
        output_path: Path,
        request_id: str,
        request: AvatarGenerationRequest,
        depth_path: Optional[Path] = None,
        extra_input_paths: Optional[Dict[str, Path]] = None,
    ) -> Dict[str, Any]:
        generate_url = self._generate_url()
        if not generate_url:
            raise RuntimeError(f"{self.display_name} is not configured for generation")

        request_payload = {
            "provider": self.provider_id,
            "requestId": request_id,
            "characterTier": request.character_tier,
            "qualityTarget": request.quality_target,
            "avatarName": request.avatar_name,
            "brandingMode": request.branding_mode,
            "bodyType": request.body_type,
            "telephoto": request.telephoto,
        }

        with input_path.open("rb") as photo_file:
            files = {
                "image": (input_path.name, photo_file.read(), "image/jpeg"),
            }
        if depth_path and depth_path.exists():
            with depth_path.open("rb") as depth_file:
                files["depth_image"] = (depth_path.name, depth_file.read(), "image/png")
        if extra_input_paths:
            for field_name, path in extra_input_paths.items():
                if not path.exists():
                    continue
                content_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
                with path.open("rb") as extra_file:
                    files[field_name] = (path.name, extra_file.read(), content_type)

        data = {"request": json.dumps(request_payload)}

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                generate_url,
                headers=self._headers(),
                data=data,
                files=files,
            )

            if response.status_code >= 400:
                raise RuntimeError(f"{self.display_name} generation failed ({response.status_code}): {response.text}")

            try:
                payload = response.json()
            except Exception as error:
                raise RuntimeError(f"{self.display_name} returned invalid JSON: {error}") from error

            glb_url = (
                payload.get("glb_url")
                or payload.get("download_url")
                or ((payload.get("avatar") or {}) if isinstance(payload.get("avatar"), dict) else {}).get("glb_url")
                or ((payload.get("result") or {}) if isinstance(payload.get("result"), dict) else {}).get("glb_url")
            )
            glb_base64 = (
                payload.get("glb_base64")
                or ((payload.get("avatar") or {}) if isinstance(payload.get("avatar"), dict) else {}).get("glb_base64")
                or ((payload.get("result") or {}) if isinstance(payload.get("result"), dict) else {}).get("glb_base64")
            )

            if glb_base64:
                output_path.write_bytes(base64.b64decode(glb_base64))
            elif glb_url:
                asset_response = await client.get(glb_url, headers=self._headers(), follow_redirects=True)
                if asset_response.status_code >= 400:
                    raise RuntimeError(f"{self.display_name} download failed ({asset_response.status_code})")
                output_path.write_bytes(asset_response.content)
            else:
                raise RuntimeError(
                    f"{self.display_name} response did not include glb_url, download_url, or glb_base64",
                )

        provider_metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
        return {
            "success": True,
            "provider": self.provider_id,
            "providerName": self.display_name,
            "metadata": {
                **provider_metadata,
                "providerKind": self.provider_kind,
                "qualityCeiling": self.quality_ceiling,
                "source": "external_provider",
            },
        }


class DidimoApiAvatarProvider:
    provider_id = "didimo"
    display_name = "Didimo"
    provider_kind = "hero"
    quality_ceiling = "hero_closeup"

    def _base_url(self) -> str:
        return str(os.environ.get("DIDIMO_API_BASE_URL", "") or "").strip().rstrip("/")

    def _api_key(self) -> str:
        return str(os.environ.get("DIDIMO_API_KEY", "") or "").strip()

    def _headers(self) -> Dict[str, str]:
        api_key = self._api_key()
        if not api_key:
            return {}
        return {"DIDIMO-API-Key": api_key}

    def _generate_url(self) -> str:
        configured = str(os.environ.get("DIDIMO_GENERATE_URL", "") or "").strip()
        if configured:
            return configured
        base_url = self._base_url()
        return f"{base_url}/v3/didimos" if base_url else ""

    def _health_url(self) -> str:
        configured = str(os.environ.get("DIDIMO_HEALTH_URL", "") or "").strip()
        if configured:
            return configured
        base_url = self._base_url()
        return f"{base_url}/v3/didimos?limit=1" if base_url else ""

    def _upload_field(self) -> str:
        return str(os.environ.get("DIDIMO_UPLOAD_FIELD", "photo") or "photo").strip()

    def _depth_field(self) -> str:
        return str(os.environ.get("DIDIMO_DEPTH_FIELD", "depth") or "depth").strip()

    def _result_name(self) -> str:
        return str(os.environ.get("DIDIMO_RESULT_NAME", "gltf") or "gltf").strip()

    def _poll_interval_seconds(self) -> float:
        try:
            return max(1.0, float(os.environ.get("DIDIMO_POLL_INTERVAL_SECONDS", "3") or "3"))
        except ValueError:
            return 3.0

    def _timeout_seconds(self) -> float:
        try:
            return max(30.0, float(os.environ.get("DIDIMO_TIMEOUT_SECONDS", "240") or "240"))
        except ValueError:
            return 240.0

    def _extract_didimo_key(self, payload: Dict[str, Any]) -> Optional[str]:
        candidates = [
            payload.get("key"),
            payload.get("didimoKey"),
            payload.get("id"),
        ]
        didimo = payload.get("didimo")
        if isinstance(didimo, dict):
            candidates.extend([
                didimo.get("key"),
                didimo.get("didimoKey"),
                didimo.get("id"),
            ])
        for value in candidates:
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    def _extract_status(self, payload: Dict[str, Any]) -> str:
        candidates = [
            payload.get("status"),
            payload.get("state"),
            payload.get("processing_status"),
        ]
        didimo = payload.get("didimo")
        if isinstance(didimo, dict):
            candidates.extend([
                didimo.get("status"),
                didimo.get("state"),
                didimo.get("processing_status"),
            ])
        for value in candidates:
            if isinstance(value, str) and value.strip():
                return value.strip().lower()
        return "unknown"

    def _looks_terminal_success(self, status: str) -> bool:
        return status in {"done", "completed", "complete", "finished", "ok", "success"}

    def _looks_terminal_error(self, status: str) -> bool:
        return status in {"error", "failed", "failure", "cancelled", "canceled"}

    def _extract_result_url(self, payload: Dict[str, Any], result_name: str) -> Optional[str]:
        direct_candidates = [
            payload.get("gltf_url"),
            payload.get("glb_url"),
            payload.get("download_url"),
            payload.get("uri"),
            payload.get("url"),
        ]
        for value in direct_candidates:
            if isinstance(value, str) and value.strip():
                return value.strip()

        results = payload.get("results")
        if isinstance(results, dict):
            result_entry = results.get(result_name) or results.get(result_name.lower()) or results.get(result_name.upper())
            if isinstance(result_entry, str) and result_entry.strip():
                return result_entry.strip()
            if isinstance(result_entry, dict):
                for key in ("url", "uri", "download_url"):
                    value = result_entry.get(key)
                    if isinstance(value, str) and value.strip():
                        return value.strip()
        elif isinstance(results, list):
            for entry in results:
                if not isinstance(entry, dict):
                    continue
                entry_name = str(entry.get("name") or entry.get("key") or entry.get("type") or "").strip().lower()
                if entry_name == result_name.lower():
                    for key in ("url", "uri", "download_url"):
                        value = entry.get(key)
                        if isinstance(value, str) and value.strip():
                            return value.strip()

        links = payload.get("_links")
        if isinstance(links, dict):
            result_link = links.get(result_name) or links.get("download") or links.get("gltf")
            if isinstance(result_link, str) and result_link.strip():
                return result_link.strip()
            if isinstance(result_link, dict):
                href = result_link.get("href")
                if isinstance(href, str) and href.strip():
                    return href.strip()

        return None

    def get_health(self, probe: bool = False) -> Dict[str, Any]:
        generate_url = self._generate_url()
        health_url = self._health_url()
        api_key = self._api_key()
        base_url = self._base_url()
        health: Dict[str, Any] = {
            "id": self.provider_id,
            "name": self.display_name,
            "kind": self.provider_kind,
            "qualityCeiling": self.quality_ceiling,
            "configured": bool(base_url and api_key),
            "generationReady": bool(generate_url and api_key),
            "hasApiKey": bool(api_key),
            "baseUrl": base_url or None,
            "generateUrl": generate_url or None,
            "healthUrl": health_url or None,
            "probe": None,
        }

        if not probe:
            return health

        if not health_url or not api_key:
            health["probe"] = {
                "healthy": False,
                "reachable": False,
                "status": "not_configured",
            }
            return health

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(health_url, headers=self._headers())
            health["probe"] = {
                "healthy": response.status_code < 500,
                "reachable": True,
                "statusCode": response.status_code,
            }
        except Exception as error:
            health["probe"] = {
                "healthy": False,
                "reachable": False,
                "status": str(error),
            }
        return health

    async def generate(
        self,
        input_path: Path,
        output_path: Path,
        request_id: str,
        request: AvatarGenerationRequest,
        depth_path: Optional[Path] = None,
        extra_input_paths: Optional[Dict[str, Path]] = None,
    ) -> Dict[str, Any]:
        del request_id
        generate_url = self._generate_url()
        if not generate_url or not self._api_key():
            raise RuntimeError("Didimo is not configured for generation")

        files: Dict[str, Any] = {}
        with input_path.open("rb") as photo_file:
            files[self._upload_field()] = (input_path.name, photo_file.read(), "image/jpeg")
        if depth_path and depth_path.exists():
            with depth_path.open("rb") as depth_file:
                files[self._depth_field()] = (depth_path.name, depth_file.read(), "image/png")
        if extra_input_paths:
            for field_name, path in extra_input_paths.items():
                if not path.exists():
                    continue
                content_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
                with path.open("rb") as extra_file:
                    files[field_name] = (path.name, extra_file.read(), content_type)

        data = {
            "input_type": "photo",
            "output_format": "gltf",
            "quality_target": request.quality_target,
        }
        if request.avatar_name:
            data["name"] = request.avatar_name
        if request.body_type:
            data["body_type"] = request.body_type
        if request.telephoto:
            data["telephoto"] = "true"
        if request.branding_mode:
            data["branding_mode"] = request.branding_mode

        async with httpx.AsyncClient(timeout=self._timeout_seconds(), follow_redirects=True) as client:
            create_response = await client.post(
                generate_url,
                headers=self._headers(),
                data=data,
                files=files,
            )
            if create_response.status_code >= 400:
                raise RuntimeError(f"Didimo generation failed ({create_response.status_code}): {create_response.text}")

            try:
                create_payload = create_response.json()
            except Exception as error:
                raise RuntimeError(f"Didimo returned invalid JSON: {error}") from error

            didimo_key = self._extract_didimo_key(create_payload)
            if not didimo_key:
                raise RuntimeError("Didimo response did not include a didimo key")

            base_url = self._base_url()
            status_url = f"{base_url}/v3/didimos/{didimo_key}"
            elapsed = 0.0
            poll_payload = create_payload
            status = self._extract_status(create_payload)
            while not self._looks_terminal_success(status):
                if self._looks_terminal_error(status):
                    raise RuntimeError(f"Didimo generation failed with status '{status}'")
                if elapsed >= self._timeout_seconds():
                    raise RuntimeError("Didimo generation timed out")
                await asyncio.sleep(self._poll_interval_seconds())
                elapsed += self._poll_interval_seconds()
                status_response = await client.get(status_url, headers=self._headers())
                if status_response.status_code >= 400:
                    raise RuntimeError(f"Didimo status check failed ({status_response.status_code}): {status_response.text}")
                try:
                    poll_payload = status_response.json()
                except Exception as error:
                    raise RuntimeError(f"Didimo status returned invalid JSON: {error}") from error
                status = self._extract_status(poll_payload)

            result_name = self._result_name()
            download_url = self._extract_result_url(poll_payload, result_name)
            if not download_url:
                download_url = f"{base_url}/v3/didimos/{didimo_key}/results/{result_name}"

            download_response = await client.get(download_url, headers=self._headers())
            if download_response.status_code >= 400:
                raise RuntimeError(f"Didimo download failed ({download_response.status_code}): {download_response.text}")

            if "application/json" in str(download_response.headers.get("content-type") or ""):
                payload = download_response.json()
                nested_url = self._extract_result_url(payload, result_name)
                glb_base64 = payload.get("glb_base64") or payload.get("gltf_base64")
                if glb_base64:
                    output_path.write_bytes(base64.b64decode(glb_base64))
                elif nested_url:
                    final_response = await client.get(nested_url, headers=self._headers(), follow_redirects=True)
                    if final_response.status_code >= 400:
                        raise RuntimeError(f"Didimo nested download failed ({final_response.status_code}): {final_response.text}")
                    output_path.write_bytes(final_response.content)
                else:
                    raise RuntimeError("Didimo download response did not include a downloadable glTF resource")
            else:
                output_path.write_bytes(download_response.content)

        return {
            "success": True,
            "provider": self.provider_id,
            "providerName": self.display_name,
            "metadata": {
                "providerKind": self.provider_kind,
                "qualityCeiling": self.quality_ceiling,
                "source": "didimo_api",
                "didimoKey": didimo_key,
                "resultName": result_name,
                "status": status,
            },
        }


class LocalSam3DAvatarProvider:
    provider_id = "local"
    display_name = "Local SAM3D"
    provider_kind = "fallback"
    quality_ceiling = "placeholder_to_mid"

    def __init__(self, sam3d_service: Any) -> None:
        self.sam3d_service = sam3d_service

    def get_health(self, probe: bool = False) -> Dict[str, Any]:
        ready = self.sam3d_service is not None
        status = {
            "id": self.provider_id,
            "name": self.display_name,
            "kind": self.provider_kind,
            "qualityCeiling": self.quality_ceiling,
            "configured": ready,
            "generationReady": ready,
            "probe": None,
        }
        if probe:
            status["probe"] = {
                "healthy": ready,
                "reachable": ready,
                "status": "ready" if ready else "missing_service",
            }
        return status

    async def generate(
        self,
        input_path: Path,
        output_path: Path,
        request_id: str,
        request: AvatarGenerationRequest,
        depth_path: Optional[Path] = None,
        extra_input_paths: Optional[Dict[str, Path]] = None,
    ) -> Dict[str, Any]:
        del request_id, request, depth_path, extra_input_paths
        if self.sam3d_service is None:
            raise RuntimeError("Local SAM3D service not initialized")

        result = await self.sam3d_service.generate_avatar(str(input_path), str(output_path))
        metadata = result.get("metadata", {}) if isinstance(result, dict) else {}
        return {
            "success": bool(result.get("success")),
            "provider": self.provider_id,
            "providerName": self.display_name,
            "metadata": {
                **metadata,
                "providerKind": self.provider_kind,
                "qualityCeiling": self.quality_ceiling,
                "source": "local_sam3d",
            },
        }


class AvatarProviderService:
    def __init__(self, sam3d_service: Any = None) -> None:
        self.providers: Dict[str, Any] = {
            "didimo": DidimoApiAvatarProvider(),
            "avaturn": ConfiguredEndpointAvatarProvider(
                provider_id="avaturn",
                display_name="Avaturn",
                generate_url_env="AVATURN_GENERATE_URL",
                health_url_env="AVATURN_HEALTH_URL",
                auth_header_env="AVATURN_AUTH_HEADER",
                auth_token_env="AVATURN_AUTH_TOKEN",
                api_key_env="AVATURN_API_TOKEN",
                base_url_env="AVATURN_API_BASE_URL",
                provider_kind="staff",
                quality_ceiling="web_photoreal",
            ),
            "in3d": ConfiguredEndpointAvatarProvider(
                provider_id="in3d",
                display_name="in3D",
                generate_url_env="IN3D_GENERATE_URL",
                health_url_env="IN3D_HEALTH_URL",
                auth_header_env="IN3D_AUTH_HEADER",
                auth_token_env="IN3D_AUTH_TOKEN",
                api_key_env="IN3D_API_TOKEN",
                base_url_env="IN3D_API_BASE_URL",
                provider_kind="scan",
                quality_ceiling="scan_photoreal",
            ),
            "local": LocalSam3DAvatarProvider(sam3d_service),
        }

    def recommend_provider(self, character_tier: str, requested_provider: str = "auto") -> Dict[str, Any]:
        normalized_tier = (character_tier or "staff_branded").strip().lower()
        requested = (requested_provider or "auto").strip().lower()

        if requested in self.providers and requested != "auto":
            selected = requested
        elif normalized_tier in {"hero_talent", "hero", "lead"}:
            selected = "didimo"
        elif normalized_tier in {"scan_subject", "scan", "fast_scan"}:
            selected = "in3d"
        else:
            selected = "avaturn"

        preferred_provider = self.providers.get(selected)
        if preferred_provider and preferred_provider.get_health().get("generationReady"):
            return {
                "provider": selected,
                "fallbackProvider": "local",
                "qualityMode": "premium" if selected != "local" else "fallback",
            }

        return {
            "provider": "local",
            "fallbackProvider": None,
            "qualityMode": "fallback",
            "blockedProvider": selected,
        }

    def get_provider_health(self, probe: bool = False) -> Dict[str, Any]:
        providers = {provider_id: provider.get_health(probe=probe) for provider_id, provider in self.providers.items()}
        return {
            "success": True,
            "providers": providers,
        }

    async def generate_avatar(
        self,
        input_path: Path,
        output_path: Path,
        request_id: str,
        request: AvatarGenerationRequest,
        depth_path: Optional[Path] = None,
        extra_input_paths: Optional[Dict[str, Path]] = None,
    ) -> Dict[str, Any]:
        recommendation = self.recommend_provider(request.character_tier, request.provider)
        selected_provider_id = recommendation["provider"]
        selected_provider = self.providers[selected_provider_id]

        if (
            selected_provider_id == "local"
            and recommendation.get("blockedProvider")
            and request.provider != "local"
            and not request.allow_fallback
        ):
            blocked_provider = recommendation.get("blockedProvider") or request.provider
            raise RuntimeError(
                f"Premium provider '{blocked_provider}' is not generation-ready. Configure the provider or allow fallback explicitly.",
            )

        provider_result = await selected_provider.generate(
            input_path=input_path,
            output_path=output_path,
            request_id=request_id,
            request=request,
            depth_path=depth_path,
            extra_input_paths=extra_input_paths,
        )

        provider_metadata = provider_result.get("metadata", {})
        metadata_type = str(provider_metadata.get("type") or "").strip().lower()
        placeholder_note = str(provider_metadata.get("note") or "").lower()
        used_placeholder = metadata_type == "placeholder" or "placeholder" in placeholder_note
        premium_ready = selected_provider_id != "local" and not used_placeholder

        quality_report = {
            "requestedProvider": request.provider,
            "recommendedProvider": recommendation.get("provider"),
            "providerUsed": selected_provider_id,
            "characterTier": request.character_tier,
            "qualityTarget": request.quality_target,
            "bodyType": request.body_type,
            "telephoto": request.telephoto,
            "premiumReady": premium_ready,
            "usedFallback": selected_provider_id == "local",
            "issues": [
                "Local fallback does not meet hero close-up quality"
                if selected_provider_id == "local"
                else "No blocking issues detected"
            ],
        }
        if quality_report["issues"] == ["No blocking issues detected"]:
            quality_report["issues"] = []

        return {
            "success": bool(provider_result.get("success")),
            "provider": selected_provider_id,
            "providerName": provider_result.get("providerName"),
            "usedFallback": selected_provider_id == "local",
            "metadata": provider_metadata,
            "qualityReport": quality_report,
        }
