"""Storyboard Image Generation Service — Replicate FLUX backend.

Migrated from OpenAI gpt-image-1 to Replicate FLUX. Public API preserved so
callers (routes/storyboards.py, character_casting_service.py) don't need
changes — the only visible difference is the ``model`` field in the
response and the underlying provider.

Templates + camera-angle/movement prompt dictionaries remain unchanged.
Output shape is still ``{ success, image_base64, prompt_used, template,
size }`` so existing downstream code keeps working.

Env vars:
  REPLICATE_API_TOKEN       — required
  REPLICATE_FLUX_MODEL      — optional; "flux-schnell" | "flux-dev" |
                              "flux-1.1-pro" (default flux-schnell)
"""

from __future__ import annotations

import base64
import logging
from typing import Any, Dict, Optional

log = logging.getLogger(__name__)

STORYBOARD_TEMPLATES: Dict[str, Dict[str, str]] = {
    "cinematic": {
        "name": "Filmisk",
        "description": "Dramatisk kinolook med profesjonell lyssetting",
        "style_prefix": "Cinematic film still, dramatic lighting, shallow depth of field, anamorphic lens flare, 2.39:1 aspect ratio composition, professional cinematography, movie scene, ",
        "style_suffix": ", shot on ARRI Alexa, color graded, film grain, high production value, dramatic shadows, atmospheric",
    },
    "documentary": {
        "name": "Dokumentar",
        "description": "Naturlig og autentisk dokumentarstil",
        "style_prefix": "Documentary photography style, natural lighting, authentic moment, candid shot, observational, ",
        "style_suffix": ", shot on Canon C300, natural colors, realistic, journalistic, unposed, genuine atmosphere",
    },
    "commercial": {
        "name": "Reklame",
        "description": "Polert og profesjonelt reklameutseende",
        "style_prefix": "High-end commercial photography, perfect lighting, polished aesthetic, advertising quality, ",
        "style_suffix": ", studio lighting, clean composition, vibrant colors, professional retouching, premium look, aspirational",
    },
    "music_video": {
        "name": "Musikkvideo",
        "description": "Kreativ og stilisert musikkvideolook",
        "style_prefix": "Music video aesthetic, stylized lighting, creative composition, dynamic angle, artistic, ",
        "style_suffix": ", neon accents, dramatic contrast, bold colors, MTV style, visually striking, contemporary",
    },
    "news": {
        "name": "Nyhetsreportasje",
        "description": "Nøytral og informativ nyhetsstil",
        "style_prefix": "News broadcast style, neutral lighting, informative framing, professional journalism, ",
        "style_suffix": ", clean background, balanced exposure, factual presentation, broadcast quality, clear and objective",
    },
    "drama": {
        "name": "Drama/TV-serie",
        "description": "Varme toner og intimt TV-drama",
        "style_prefix": "Television drama cinematography, warm color palette, intimate framing, emotional lighting, ",
        "style_suffix": ", shot on RED camera, carefully composed, character-focused, premium TV production, atmospheric depth",
    },
    "horror": {
        "name": "Skrekk/Thriller",
        "description": "Mørk og uhyggelig stemning",
        "style_prefix": "Horror film cinematography, low-key lighting, unsettling atmosphere, tension, ",
        "style_suffix": ", dark shadows, desaturated colors, eerie mood, suspenseful, creepy ambiance, psychological tension",
    },
    "comedy": {
        "name": "Komedie",
        "description": "Lys og munter stemning",
        "style_prefix": "Comedy film style, bright even lighting, warm tones, approachable aesthetic, ",
        "style_suffix": ", cheerful atmosphere, clean composition, sitcom quality, inviting colors, light-hearted mood",
    },
    "action": {
        "name": "Action",
        "description": "Dynamisk og energisk actionfilm",
        "style_prefix": "Action movie cinematography, dynamic angle, high contrast, intense lighting, ",
        "style_suffix": ", motion blur, adrenaline, blockbuster quality, powerful composition, explosive energy, heroic framing",
    },
    "noir": {
        "name": "Film Noir",
        "description": "Klassisk svart-hvitt noir-stil",
        "style_prefix": "Film noir style, high contrast black and white, dramatic shadows, venetian blind lighting, ",
        "style_suffix": ", moody atmosphere, 1940s aesthetic, chiaroscuro lighting, mysterious, hardboiled detective genre",
    },
    "romantic": {
        "name": "Romantisk",
        "description": "Myk og romantisk stemning",
        "style_prefix": "Romantic film cinematography, soft diffused lighting, warm golden tones, dreamy atmosphere, ",
        "style_suffix": ", bokeh background, intimate framing, gentle mood, love story aesthetic, tender and emotional",
    },
    "sci_fi": {
        "name": "Sci-Fi",
        "description": "Futuristisk science fiction-look",
        "style_prefix": "Science fiction cinematography, futuristic aesthetic, cool blue tones, high-tech environment, ",
        "style_suffix": ", sleek design, holographic elements, cyberpunk influences, advanced technology, dystopian or utopian atmosphere",
    },
}

CAMERA_ANGLE_PROMPTS = {
    "wide": "extreme wide shot, establishing shot, full environment visible",
    "full": "full shot, entire subject visible from head to toe",
    "medium": "medium shot, subject visible from waist up",
    "medium-close": "medium close-up, subject from chest up",
    "close-up": "close-up shot, face fills the frame",
    "extreme-close-up": "extreme close-up, detail shot, specific feature",
    "over-shoulder": "over-the-shoulder shot, conversation framing",
    "pov": "point-of-view shot, first-person perspective",
    "high-angle": "high angle shot, looking down at subject",
    "low-angle": "low angle shot, looking up at subject, heroic",
    "dutch-angle": "dutch angle, tilted frame, tension",
    "aerial": "aerial shot, bird's eye view, drone perspective",
    "two-shot": "two-shot, two subjects in frame together",
}

CAMERA_MOVEMENT_PROMPTS = {
    "static": "static camera, locked off, stable tripod shot",
    "pan": "horizontal pan movement, sweeping view",
    "tilt": "vertical tilt movement",
    "dolly": "dolly shot, camera moving toward or away from subject",
    "tracking": "tracking shot, camera following subject movement",
    "crane": "crane shot, vertical camera movement, sweeping",
    "steadicam": "steadicam shot, smooth floating movement",
    "handheld": "handheld camera, slight movement, documentary feel",
    "zoom": "zoom shot, focal length change",
}


def _size_to_wh(size: str) -> tuple[int, int]:
    parts = size.split("x")
    if len(parts) == 2:
        try:
            return int(parts[0]), int(parts[1])
        except ValueError:
            pass
    return 1024, 1024


class StoryboardImageService:
    def __init__(self):
        # Replicate FLUX replaces OpenAI gpt-image-1. The replicate image
        # service is imported lazily so this module loads even when the
        # replicate package isn't pulled in by other paths.
        try:
            from replicate_image_service import get_replicate_image_service
            self._replicate = get_replicate_image_service()
        except Exception as exc:  # pragma: no cover
            log.warning("Replicate image service unavailable: %s", exc)
            self._replicate = None
        self.enabled = bool(self._replicate and self._replicate.enabled)
        if self.enabled:
            print(
                f"Storyboard Image Service: Ready (Replicate FLUX, "
                f"default={self._replicate.default_model})"
            )
        else:
            print(
                "Storyboard Image Service: Not configured (missing REPLICATE_API_TOKEN)"
            )

    def get_templates(self) -> Dict[str, Any]:
        """Return all available storyboard templates."""
        return {
            key: {
                "id": key,
                "name": template["name"],
                "description": template["description"],
            }
            for key, template in STORYBOARD_TEMPLATES.items()
        }

    def get_camera_angles(self) -> Dict[str, str]:
        return CAMERA_ANGLE_PROMPTS

    def get_camera_movements(self) -> Dict[str, str]:
        return CAMERA_MOVEMENT_PROMPTS

    def build_prompt(
        self,
        description: str,
        template_id: str = "cinematic",
        camera_angle: Optional[str] = None,
        camera_movement: Optional[str] = None,
        additional_notes: Optional[str] = None,
    ) -> str:
        """Build an optimized prompt for storyboard image generation."""
        template = STORYBOARD_TEMPLATES.get(template_id, STORYBOARD_TEMPLATES["cinematic"])
        prompt_parts = [template["style_prefix"]]
        if camera_angle and camera_angle in CAMERA_ANGLE_PROMPTS:
            prompt_parts.append(CAMERA_ANGLE_PROMPTS[camera_angle] + ", ")
        if camera_movement and camera_movement in CAMERA_MOVEMENT_PROMPTS:
            prompt_parts.append(CAMERA_MOVEMENT_PROMPTS[camera_movement] + ", ")
        prompt_parts.append(description)
        if additional_notes:
            prompt_parts.append(f", {additional_notes}")
        prompt_parts.append(template["style_suffix"])
        return "".join(prompt_parts)

    async def generate_image(
        self,
        description: str,
        template_id: str = "cinematic",
        camera_angle: Optional[str] = None,
        camera_movement: Optional[str] = None,
        additional_notes: Optional[str] = None,
        size: str = "1536x1024",
    ) -> Dict[str, Any]:
        """Generate a storyboard frame image via Replicate FLUX.

        Return shape preserves the OpenAI-era contract so callers don't
        need to change: ``{success, image_base64, prompt_used, template, size}``.
        """
        if not self.enabled or self._replicate is None:
            return {
                "success": False,
                "error": (
                    "Storyboard Image Service not configured — set "
                    "REPLICATE_API_TOKEN to enable FLUX image generation."
                ),
            }

        full_prompt = self.build_prompt(
            description=description,
            template_id=template_id,
            camera_angle=camera_angle,
            camera_movement=camera_movement,
            additional_notes=additional_notes,
        )
        width, height = _size_to_wh(size)

        print(f"[Storyboard] Replicate FLUX prompt: {full_prompt[:100]}…")
        result = await self._replicate.generate(
            prompt=full_prompt,
            width=width,
            height=height,
        )

        if not result.get("success"):
            return {
                "success": False,
                "error": f"Bildegenerering feilet: {result.get('error')}",
            }

        image_bytes: bytes = result["image_bytes"]
        image_base64 = base64.b64encode(image_bytes).decode("ascii")

        return {
            "success": True,
            "image_base64": image_base64,
            "prompt_used": full_prompt,
            "template": template_id,
            "size": size,
            "model": result.get("model", "replicate:flux"),
        }


storyboard_image_service = StoryboardImageService()
