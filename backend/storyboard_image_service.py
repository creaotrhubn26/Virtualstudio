"""
Storyboard Image Generation Service using OpenAI gpt-image-1.
Uses Replit AI Integrations for OpenAI access - no API key required.
Charges are billed to your Replit credits.
"""

import base64
import os
from typing import Dict, Any, Optional
from openai import OpenAI

AI_INTEGRATIONS_OPENAI_API_KEY = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
AI_INTEGRATIONS_OPENAI_BASE_URL = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")

openai_client = OpenAI(
    api_key=AI_INTEGRATIONS_OPENAI_API_KEY,
    base_url=AI_INTEGRATIONS_OPENAI_BASE_URL
)

STORYBOARD_TEMPLATES = {
    "cinematic": {
        "name": "Filmisk",
        "description": "Dramatisk kinolook med profesjonell lyssetting",
        "style_prefix": "Cinematic film still, dramatic lighting, shallow depth of field, anamorphic lens flare, 2.39:1 aspect ratio composition, professional cinematography, movie scene, ",
        "style_suffix": ", shot on ARRI Alexa, color graded, film grain, high production value, dramatic shadows, atmospheric"
    },
    "documentary": {
        "name": "Dokumentar",
        "description": "Naturlig og autentisk dokumentarstil",
        "style_prefix": "Documentary photography style, natural lighting, authentic moment, candid shot, observational, ",
        "style_suffix": ", shot on Canon C300, natural colors, realistic, journalistic, unposed, genuine atmosphere"
    },
    "commercial": {
        "name": "Reklame",
        "description": "Polert og profesjonelt reklameutseende",
        "style_prefix": "High-end commercial photography, perfect lighting, polished aesthetic, advertising quality, ",
        "style_suffix": ", studio lighting, clean composition, vibrant colors, professional retouching, premium look, aspirational"
    },
    "music_video": {
        "name": "Musikkvideo",
        "description": "Kreativ og stilisert musikkvideolook",
        "style_prefix": "Music video aesthetic, stylized lighting, creative composition, dynamic angle, artistic, ",
        "style_suffix": ", neon accents, dramatic contrast, bold colors, MTV style, visually striking, contemporary"
    },
    "news": {
        "name": "Nyhetsreportasje",
        "description": "Nøytral og informativ nyhetsstil",
        "style_prefix": "News broadcast style, neutral lighting, informative framing, professional journalism, ",
        "style_suffix": ", clean background, balanced exposure, factual presentation, broadcast quality, clear and objective"
    },
    "drama": {
        "name": "Drama/TV-serie",
        "description": "Varme toner og intimt TV-drama",
        "style_prefix": "Television drama cinematography, warm color palette, intimate framing, emotional lighting, ",
        "style_suffix": ", shot on RED camera, carefully composed, character-focused, premium TV production, atmospheric depth"
    },
    "horror": {
        "name": "Skrekk/Thriller",
        "description": "Mørk og uhyggelig stemning",
        "style_prefix": "Horror film cinematography, low-key lighting, unsettling atmosphere, tension, ",
        "style_suffix": ", dark shadows, desaturated colors, eerie mood, suspenseful, creepy ambiance, psychological tension"
    },
    "comedy": {
        "name": "Komedie",
        "description": "Lys og munter stemning",
        "style_prefix": "Comedy film style, bright even lighting, warm tones, approachable aesthetic, ",
        "style_suffix": ", cheerful atmosphere, clean composition, sitcom quality, inviting colors, light-hearted mood"
    },
    "action": {
        "name": "Action",
        "description": "Dynamisk og energisk actionfilm",
        "style_prefix": "Action movie cinematography, dynamic angle, high contrast, intense lighting, ",
        "style_suffix": ", motion blur, adrenaline, blockbuster quality, powerful composition, explosive energy, heroic framing"
    },
    "noir": {
        "name": "Film Noir",
        "description": "Klassisk svart-hvitt noir-stil",
        "style_prefix": "Film noir style, high contrast black and white, dramatic shadows, venetian blind lighting, ",
        "style_suffix": ", moody atmosphere, 1940s aesthetic, chiaroscuro lighting, mysterious, hardboiled detective genre"
    },
    "romantic": {
        "name": "Romantisk",
        "description": "Myk og romantisk stemning",
        "style_prefix": "Romantic film cinematography, soft diffused lighting, warm golden tones, dreamy atmosphere, ",
        "style_suffix": ", bokeh background, intimate framing, gentle mood, love story aesthetic, tender and emotional"
    },
    "sci_fi": {
        "name": "Sci-Fi",
        "description": "Futuristisk science fiction-look",
        "style_prefix": "Science fiction cinematography, futuristic aesthetic, cool blue tones, high-tech environment, ",
        "style_suffix": ", sleek design, holographic elements, cyberpunk influences, advanced technology, dystopian or utopian atmosphere"
    }
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
    "two-shot": "two-shot, two subjects in frame together"
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
    "zoom": "zoom shot, focal length change"
}


class StoryboardImageService:
    def __init__(self):
        self.enabled = bool(AI_INTEGRATIONS_OPENAI_API_KEY and AI_INTEGRATIONS_OPENAI_BASE_URL)
        if self.enabled:
            print("Storyboard Image Service: Ready (using Replit AI Integrations)")
        else:
            print("Storyboard Image Service: Not configured (missing AI Integrations env vars)")
    
    def get_templates(self) -> Dict[str, Any]:
        """Return all available storyboard templates."""
        return {
            key: {
                "id": key,
                "name": template["name"],
                "description": template["description"]
            }
            for key, template in STORYBOARD_TEMPLATES.items()
        }
    
    def get_camera_angles(self) -> Dict[str, str]:
        """Return all available camera angles."""
        return CAMERA_ANGLE_PROMPTS
    
    def get_camera_movements(self) -> Dict[str, str]:
        """Return all available camera movements."""
        return CAMERA_MOVEMENT_PROMPTS
    
    def build_prompt(
        self,
        description: str,
        template_id: str = "cinematic",
        camera_angle: Optional[str] = None,
        camera_movement: Optional[str] = None,
        additional_notes: Optional[str] = None
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
        size: str = "1536x1024"
    ) -> Dict[str, Any]:
        """
        Generate a storyboard frame image.
        
        Args:
            description: Scene description
            template_id: Visual style template
            camera_angle: Camera angle type
            camera_movement: Camera movement type
            additional_notes: Extra details
            size: Image size (1024x1024, 1536x1024, 1024x1536)
        
        Returns:
            Dict with base64 image data and metadata
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "Storyboard Image Service is not configured"
            }
        
        try:
            full_prompt = self.build_prompt(
                description=description,
                template_id=template_id,
                camera_angle=camera_angle,
                camera_movement=camera_movement,
                additional_notes=additional_notes
            )
            
            print(f"Generating storyboard image with prompt: {full_prompt[:100]}...")
            
            response = openai_client.images.generate(
                model="gpt-image-1",
                prompt=full_prompt,
                size=size,
            )
            
            image_base64 = response.data[0].b64_json or ""
            
            return {
                "success": True,
                "image_base64": image_base64,
                "prompt_used": full_prompt,
                "template": template_id,
                "size": size
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error generating storyboard image: {error_msg}")
            
            if "FREE_CLOUD_BUDGET_EXCEEDED" in error_msg:
                return {
                    "success": False,
                    "error": "Kredittgrensen er nådd. Vennligst oppgrader din Replit-plan.",
                    "error_code": "BUDGET_EXCEEDED"
                }
            
            return {
                "success": False,
                "error": f"Bildegenerering feilet: {error_msg}"
            }


storyboard_image_service = StoryboardImageService()
