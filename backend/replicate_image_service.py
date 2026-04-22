"""Replicate-backed text→image generation.

Replaces OpenAI's gpt-image-1 as the image generator for the studio. Uses
Black Forest Labs' FLUX family via Replicate's prediction API:

  * ``flux-schnell``  — default. ~2-4 s per image, cheap. Good enough for
                        storyboards and character casting reference images.
  * ``flux-dev``      — 10-20 s, better quality. Set
                        REPLICATE_FLUX_MODEL=flux-dev to use.
  * ``flux-1.1-pro``  — 10-30 s, top quality. Set
                        REPLICATE_FLUX_MODEL=flux-1.1-pro.

Returns PNG bytes (no base64 — the caller base64-encodes if needed). This
keeps the return shape consistent with other image-gen services in this
codebase (flux_service.generate_frame returns ``image_bytes``).

Env vars:
  REPLICATE_API_TOKEN   — required
  REPLICATE_FLUX_MODEL  — optional, "flux-schnell" (default) | "flux-dev" |
                          "flux-1.1-pro"
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict, Optional

import httpx

log = logging.getLogger(__name__)

_MODEL_MAP: Dict[str, str] = {
    # Replicate's "owner/name" identifiers resolve to the latest version.
    "flux-schnell": "black-forest-labs/flux-schnell",
    "flux-dev": "black-forest-labs/flux-dev",
    "flux-1.1-pro": "black-forest-labs/flux-1.1-pro",
    "flux-pro": "black-forest-labs/flux-1.1-pro",
}

_DEFAULT_MODEL_KEY = os.environ.get("REPLICATE_FLUX_MODEL", "flux-schnell")


class ReplicateImageService:
    """Stateless wrapper around Replicate FLUX predictions."""

    def __init__(self) -> None:
        self.api_token = os.environ.get("REPLICATE_API_TOKEN", "")
        self.enabled = bool(self.api_token)
        self.default_model = _MODEL_MAP.get(
            _DEFAULT_MODEL_KEY, _MODEL_MAP["flux-schnell"]
        )
        if self.enabled:
            log.info(
                "Replicate image service ready (default model=%s)",
                self.default_model,
            )
        else:
            log.info("Replicate image service disabled (REPLICATE_API_TOKEN not set)")

    async def generate(
        self,
        *,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        model: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
        num_outputs: int = 1,
        seed: Optional[int] = None,
        output_format: str = "png",
        timeout_s: float = 90.0,
    ) -> Dict[str, Any]:
        """Generate one image from a text prompt. Returns::

            {
              "success": bool,
              "image_bytes": bytes,   # on success
              "prompt_used": str,
              "model": str,
              "width": int,
              "height": int,
              "error": str,           # on failure
            }

        ``width`` / ``height`` are informational — FLUX models on Replicate
        use an ``aspect_ratio`` string. If ``aspect_ratio`` is provided it
        wins; otherwise we derive it from the dims.
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "REPLICATE_API_TOKEN not set",
            }

        model_id = _MODEL_MAP.get(model, model) if model else self.default_model

        if aspect_ratio is None:
            aspect_ratio = _closest_aspect_ratio(width, height)

        # Input schema varies slightly between flux-schnell/dev/pro.
        # All three accept: prompt, aspect_ratio, output_format, num_outputs.
        # schnell uses num_inference_steps (default 4). dev has guidance_scale.
        # We keep inputs minimal — FLUX's defaults are sensible.
        payload: Dict[str, Any] = {
            "input": {
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "output_format": output_format,
                "num_outputs": num_outputs,
            }
        }
        if seed is not None:
            payload["input"]["seed"] = seed

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            # Prefer: wait lets Replicate hold the connection up to ~60s so we
            # skip polling for fast models. The HTTPX timeout covers the
            # worst case.
            "Prefer": "wait",
        }

        # For "owner/name" we use the models API (no version pinning).
        endpoint = f"https://api.replicate.com/v1/models/{model_id}/predictions"

        try:
            async with httpx.AsyncClient(timeout=timeout_s) as client:
                resp = await client.post(endpoint, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()

                # If Prefer: wait gave us a finished result, output is populated.
                # Otherwise poll the prediction URL until done.
                status = data.get("status")
                if status != "succeeded":
                    prediction_url = data.get("urls", {}).get("get") or (
                        f"https://api.replicate.com/v1/predictions/{data.get('id')}"
                    )
                    data = await self._poll_until_done(
                        client, prediction_url, timeout_s=timeout_s
                    )

                if data.get("status") != "succeeded":
                    return {
                        "success": False,
                        "error": data.get("error") or f"Replicate status={data.get('status')}",
                        "prompt_used": prompt,
                        "model": model_id,
                    }

                # `output` is typically list[str] of image URLs for FLUX.
                output = data.get("output")
                image_url = _first_url(output)
                if not image_url:
                    return {
                        "success": False,
                        "error": f"Replicate succeeded but no image URL in output: {output!r}",
                        "prompt_used": prompt,
                        "model": model_id,
                    }

                # Download the image bytes.
                img_resp = await client.get(image_url, timeout=30.0)
                img_resp.raise_for_status()
                return {
                    "success": True,
                    "image_bytes": img_resp.content,
                    "prompt_used": prompt,
                    "model": model_id,
                    "width": width,
                    "height": height,
                    "aspect_ratio": aspect_ratio,
                }
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:300]
            return {
                "success": False,
                "error": f"Replicate HTTP {exc.response.status_code}: {body}",
                "prompt_used": prompt,
                "model": model_id,
            }
        except Exception as exc:
            return {
                "success": False,
                "error": f"{type(exc).__name__}: {exc}",
                "prompt_used": prompt,
                "model": model_id,
            }

    async def _poll_until_done(
        self,
        client: httpx.AsyncClient,
        prediction_url: str,
        *,
        timeout_s: float,
        poll_interval_s: float = 1.5,
    ) -> Dict[str, Any]:
        """Poll a Replicate prediction until it reaches a terminal status."""
        import time

        start = time.time()
        while time.time() - start < timeout_s:
            r = await client.get(
                prediction_url,
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            r.raise_for_status()
            data = r.json()
            if data.get("status") in {"succeeded", "failed", "canceled"}:
                return data
            await asyncio.sleep(poll_interval_s)
        return {"status": "failed", "error": "Poll timeout"}


def _closest_aspect_ratio(width: int, height: int) -> str:
    """Map pixel dims to FLUX's supported aspect-ratio strings."""
    ratios = [
        ("1:1", 1.0),
        ("4:3", 4 / 3),
        ("3:4", 3 / 4),
        ("16:9", 16 / 9),
        ("9:16", 9 / 16),
        ("3:2", 3 / 2),
        ("2:3", 2 / 3),
        ("4:5", 4 / 5),
        ("5:4", 5 / 4),
        ("21:9", 21 / 9),
        ("9:21", 9 / 21),
    ]
    if height == 0:
        return "1:1"
    target = width / height
    best = min(ratios, key=lambda item: abs(item[1] - target))
    return best[0]


def _first_url(output: Any) -> Optional[str]:
    if isinstance(output, list) and output:
        candidate = output[0]
        if isinstance(candidate, str) and candidate.startswith("http"):
            return candidate
    if isinstance(output, str) and output.startswith("http"):
        return output
    return None


_INSTANCE: Optional[ReplicateImageService] = None


def get_replicate_image_service() -> ReplicateImageService:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = ReplicateImageService()
    return _INSTANCE
