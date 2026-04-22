"""Shared Claude client for Virtual Studio's AI bootstrap.

Claude is our primary reasoning engine for:
  * Scene Director enrichment (mood inference, rich environment prompts,
    director's rationale)
  * Vision analysis of reference images (Claude Vision) — user uploads a
    still or painting, Claude reads its lighting/mood/composition
  * Future: AI Director function calling (tool use to modify live scenes)

Design:
  * Singleton via ``get_claude_client()`` — constructed once at first use.
  * Prompt caching is enabled by default on system prompts so repeated
    Scene Director calls don't re-pay the base prompt cost.
  * Structured JSON output uses tool-use with ``input_schema`` — the most
    reliable way to get typed responses from Claude.
  * Graceful degradation: if ``ANTHROPIC_API_KEY`` isn't set, ``enabled``
    is False and every helper raises ``ClaudeUnavailable`` so callers can
    fall back to rules.

Env vars:
  ANTHROPIC_API_KEY    (required)
  CLAUDE_MODEL         (optional; default "claude-sonnet-4-6")
  CLAUDE_VISION_MODEL  (optional; default same as CLAUDE_MODEL)
  CLAUDE_DIRECTOR_MODEL (optional; default "claude-opus-4-7" for the big
                         reasoning tasks when we want more)
"""

from __future__ import annotations

import base64
import logging
import os
from typing import Any, Dict, List, Optional

try:
    from anthropic import Anthropic
    _ANTHROPIC_IMPORTED = True
except ImportError:  # pragma: no cover
    Anthropic = None  # type: ignore
    _ANTHROPIC_IMPORTED = False

log = logging.getLogger(__name__)

DEFAULT_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")
DEFAULT_VISION_MODEL = os.environ.get("CLAUDE_VISION_MODEL", DEFAULT_MODEL)
DEFAULT_DIRECTOR_MODEL = os.environ.get("CLAUDE_DIRECTOR_MODEL", "claude-opus-4-7")


class ClaudeUnavailable(RuntimeError):
    """Raised when Claude is asked for something but isn't configured."""


class ClaudeClient:
    def __init__(self) -> None:
        self.api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self.enabled = bool(self.api_key) and _ANTHROPIC_IMPORTED
        self._client: Optional[Any] = None
        if self.enabled:
            self._client = Anthropic(api_key=self.api_key)
            log.info(
                "Claude client ready (default=%s, director=%s, vision=%s)",
                DEFAULT_MODEL, DEFAULT_DIRECTOR_MODEL, DEFAULT_VISION_MODEL,
            )
        elif not _ANTHROPIC_IMPORTED:
            log.info("Claude disabled: anthropic SDK not installed")
        else:
            log.info("Claude disabled: ANTHROPIC_API_KEY not set")

    # -- raw completion -----------------------------------------------------

    def complete(
        self,
        *,
        system: str,
        user: str,
        model: Optional[str] = None,
        max_tokens: int = 1024,
        cache_system: bool = True,
    ) -> str:
        """Plain text → text completion.

        When ``cache_system=True`` the system prompt is marked with
        ``cache_control`` so identical subsequent calls within 5 min hit
        the prompt cache (cheaper + faster).
        """
        if not self.enabled or self._client is None:
            raise ClaudeUnavailable("ANTHROPIC_API_KEY not set")

        system_block: List[Dict[str, Any]]
        if cache_system:
            system_block = [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            system_block = [{"type": "text", "text": system}]

        resp = self._client.messages.create(
            model=model or DEFAULT_MODEL,
            max_tokens=max_tokens,
            system=system_block,
            messages=[{"role": "user", "content": user}],
        )
        # Concatenate text blocks (Claude may return multiple)
        return "".join(
            block.text for block in resp.content if getattr(block, "type", None) == "text"
        ).strip()

    # -- structured JSON via tool use --------------------------------------

    def complete_json(
        self,
        *,
        system: str,
        user: str,
        schema: Dict[str, Any],
        tool_name: str = "return_structured_response",
        tool_description: str = "Return the structured response.",
        model: Optional[str] = None,
        max_tokens: int = 2048,
        cache_system: bool = True,
    ) -> Dict[str, Any]:
        """Ask Claude to produce a JSON object matching ``schema``.

        Uses tool use under the hood — forces ``tool_choice`` so Claude
        must invoke our tool with a conforming argument object. That's the
        most reliable way to get structured output from Claude; it beats
        "respond with JSON only" prompting for correctness.
        """
        if not self.enabled or self._client is None:
            raise ClaudeUnavailable("ANTHROPIC_API_KEY not set")

        system_block: List[Dict[str, Any]]
        if cache_system:
            system_block = [
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}
            ]
        else:
            system_block = [{"type": "text", "text": system}]

        tools = [
            {
                "name": tool_name,
                "description": tool_description,
                "input_schema": schema,
            }
        ]

        resp = self._client.messages.create(
            model=model or DEFAULT_MODEL,
            max_tokens=max_tokens,
            system=system_block,
            tools=tools,
            tool_choice={"type": "tool", "name": tool_name},
            messages=[{"role": "user", "content": user}],
        )

        for block in resp.content:
            if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
                return dict(block.input)
        raise RuntimeError(
            f"Claude did not call tool {tool_name!r} — got "
            f"{[getattr(b, 'type', '?') for b in resp.content]}"
        )

    # -- vision ------------------------------------------------------------

    def analyze_image(
        self,
        *,
        image_base64: str,
        prompt: str,
        media_type: str = "image/jpeg",
        model: Optional[str] = None,
        max_tokens: int = 800,
    ) -> str:
        """Claude Vision: send an image + prompt, get a text analysis."""
        if not self.enabled or self._client is None:
            raise ClaudeUnavailable("ANTHROPIC_API_KEY not set")

        # Accept data-URL or bare base64
        if image_base64.startswith("data:"):
            header, _, payload = image_base64.partition(",")
            image_base64 = payload
            if "image/" in header:
                media_type = header.split(";")[0].replace("data:", "") or media_type

        resp = self._client.messages.create(
            model=model or DEFAULT_VISION_MODEL,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return "".join(
            b.text for b in resp.content if getattr(b, "type", None) == "text"
        ).strip()

    def analyze_image_structured(
        self,
        *,
        image_base64: str,
        system: str,
        user_prompt: str,
        schema: Dict[str, Any],
        tool_name: str = "describe_image",
        tool_description: str = "Return a structured analysis of the image.",
        media_type: str = "image/jpeg",
        model: Optional[str] = None,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        """Claude Vision + tool use: structured visual analysis."""
        if not self.enabled or self._client is None:
            raise ClaudeUnavailable("ANTHROPIC_API_KEY not set")

        if image_base64.startswith("data:"):
            header, _, payload = image_base64.partition(",")
            image_base64 = payload
            if "image/" in header:
                media_type = header.split(";")[0].replace("data:", "") or media_type

        tools = [
            {
                "name": tool_name,
                "description": tool_description,
                "input_schema": schema,
            }
        ]
        resp = self._client.messages.create(
            model=model or DEFAULT_VISION_MODEL,
            max_tokens=max_tokens,
            system=[
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}
            ],
            tools=tools,
            tool_choice={"type": "tool", "name": tool_name},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                }
            ],
        )
        for block in resp.content:
            if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
                return dict(block.input)
        raise RuntimeError(
            f"Claude did not call tool {tool_name!r} on vision prompt"
        )


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_INSTANCE: Optional[ClaudeClient] = None


def get_claude_client() -> ClaudeClient:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = ClaudeClient()
    return _INSTANCE


# Convenience helper for the common case of "encode a local file to base64 URL".
def image_file_to_data_url(path: str) -> str:
    """Read a local image file and return a data-URL string."""
    ext = os.path.splitext(path)[1].lower()
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(ext, "image/jpeg")
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{data}"
