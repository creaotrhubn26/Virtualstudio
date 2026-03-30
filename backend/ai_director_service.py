"""
AI Studio Director Service

Uses GPT-4o with function calling to orchestrate Virtual Studio:
- Natural language light setup
- Scene generation from creative briefs
- Reference photo → lighting recreation (Vision)
- Text → gpt-image-1 → TripoSR GLB asset pipeline
"""

from __future__ import annotations

import base64
import json
import os
import re
from typing import Any, Dict, List, Optional

from openai import OpenAI, AsyncOpenAI

_openai_client: Optional[OpenAI] = None
_async_openai_client: Optional[AsyncOpenAI] = None


def _get_client() -> OpenAI:
    """Lazy sync OpenAI client — used for non-streaming calls."""
    global _openai_client
    if _openai_client is None:
        api_key = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
        base_url = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")
        kwargs: Dict[str, Any] = {}
        if api_key:
            kwargs["api_key"] = api_key
        if base_url:
            kwargs["base_url"] = base_url
        _openai_client = OpenAI(**kwargs)
    return _openai_client


def _get_async_client() -> AsyncOpenAI:
    """Lazy async OpenAI client — used for real-time token streaming."""
    global _async_openai_client
    if _async_openai_client is None:
        api_key = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
        base_url = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")
        kwargs: Dict[str, Any] = {}
        if api_key:
            kwargs["api_key"] = api_key
        if base_url:
            kwargs["base_url"] = base_url
        _async_openai_client = AsyncOpenAI(**kwargs)
    return _async_openai_client

DIRECTOR_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "apply_scenario_preset",
            "description": (
                "Apply a full lighting and scene preset. "
                "Use this to create complete scenes with multiple lights, backdrop, and camera settings."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "navn": {
                        "type": "string",
                        "description": "Name of the preset (Norwegian)",
                    },
                    "beskrivelse": {
                        "type": "string",
                        "description": "Short description of the preset (Norwegian)",
                    },
                    "lights": {
                        "type": "array",
                        "description": "List of lights to set up",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "enum": [
                                        "key-light", "fill-light", "rim-light", "back-light",
                                        "hair-light", "background-light", "beauty-dish",
                                        "softbox", "floor-light", "backdrop-light",
                                    ],
                                },
                                "position": {
                                    "type": "array",
                                    "items": {"type": "number"},
                                    "minItems": 3,
                                    "maxItems": 3,
                                    "description": "[x, y, z] in metres. x: left/right, y: height, z: depth from subject.",
                                },
                                "rotation": {
                                    "type": "array",
                                    "items": {"type": "number"},
                                    "minItems": 3,
                                    "maxItems": 3,
                                    "description": "[x, y, z] rotation in degrees",
                                },
                                "intensity": {
                                    "type": "number",
                                    "description": "Light intensity 0.0–2.0",
                                },
                                "cct": {
                                    "type": "number",
                                    "description": "Colour temperature in Kelvin (2700–10000). Warm=3200, Daylight=5600",
                                },
                                "modifier": {
                                    "type": "string",
                                    "description": "Light modifier (e.g. softbox-60x90, octabox-120, beauty-dish-56, umbrella-white, stripbox-15x60, reflector-white, fresnel, barn-doors, snoot, grid-40)",
                                },
                            },
                            "required": ["type", "position", "rotation", "intensity", "cct"],
                        },
                    },
                    "backdrop_color": {
                        "type": "string",
                        "description": "Hex color for the backdrop, e.g. '#ffffff', '#1a1a1a'",
                    },
                    "camera_focal_length": {
                        "type": "number",
                        "description": "Camera focal length in mm (e.g. 35, 50, 85, 105)",
                    },
                    "camera_position": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "Camera position [x, y, z]",
                    },
                },
                "required": ["navn", "lights"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_outdoor_sun",
            "description": "Configure the outdoor directional sun light.",
            "parameters": {
                "type": "object",
                "properties": {
                    "elevation": {
                        "type": "number",
                        "description": "Sun elevation angle in degrees (0=horizon, 90=zenith). Golden hour ~15°, midday ~70°.",
                    },
                    "azimuth": {
                        "type": "number",
                        "description": "Sun azimuth angle in degrees (0=north, 90=east, 180=south, 270=west).",
                    },
                    "intensity": {
                        "type": "number",
                        "description": "Sun intensity (0.0–5.0). Typical: 2.5",
                    },
                    "color": {
                        "type": "string",
                        "description": "Sun color hex. Golden hour: '#ffb347', daylight: '#fff8e8', blue hour: '#88aaff'",
                    },
                    "enabled": {
                        "type": "boolean",
                        "description": "Whether the sun is enabled.",
                    },
                },
                "required": ["elevation", "azimuth"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_fog",
            "description": "Configure atmospheric fog in the scene.",
            "parameters": {
                "type": "object",
                "properties": {
                    "enabled": {
                        "type": "boolean",
                    },
                    "mode": {
                        "type": "string",
                        "enum": ["exp2", "linear"],
                        "description": "Fog mode. exp2 is exponential (natural), linear has hard cutoff.",
                    },
                    "density": {
                        "type": "number",
                        "description": "Fog density for exp2 mode (0.001=very light to 0.05=thick). Typical: 0.005",
                    },
                    "color": {
                        "type": "string",
                        "description": "Fog color hex. Typical: '#c0c8d0' (cool) or '#d4c8b0' (warm)",
                    },
                },
                "required": ["enabled"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "apply_lut",
            "description": "Apply colour grading / LUT to the camera image processing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contrast": {
                        "type": "number",
                        "description": "Contrast 0.5–2.0 (1.0=neutral)",
                    },
                    "exposure": {
                        "type": "number",
                        "description": "Exposure 0.5–2.0 (1.0=neutral)",
                    },
                    "saturation": {
                        "type": "number",
                        "description": "Saturation 0–150 (100=neutral)",
                    },
                    "shadows_hue": {
                        "type": "number",
                        "description": "Shadow tint hue 0–360",
                    },
                    "shadows_density": {
                        "type": "number",
                        "description": "Shadow tint density 0–100",
                    },
                    "highlights_hue": {
                        "type": "number",
                        "description": "Highlight tint hue 0–360",
                    },
                    "highlights_density": {
                        "type": "number",
                        "description": "Highlight tint density 0–100",
                    },
                    "vignette": {
                        "type": "number",
                        "description": "Vignette strength 0.0–1.0",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_camera",
            "description": "Set camera focal length and white balance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "focal_length": {
                        "type": "number",
                        "description": "Focal length in mm. Wide: 24–35, Normal: 50, Portrait: 85–105, Tele: 135–200",
                    },
                    "white_balance": {
                        "type": "number",
                        "description": "White balance in Kelvin. Tungsten: 3200, Daylight: 5600, Overcast: 6500",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "load_prop",
            "description": (
                "Add a 3D prop/object to the scene from the library. "
                "If the prop is not in the library, call generate_prop instead."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "prop_id": {
                        "type": "string",
                        "description": (
                            "Prop ID from the prop library. Available: "
                            "dining-table, wooden-chair-restaurant, pizza-plate, candle-holder, "
                            "chef-counter, wine_bottle_red, shooting-table-studio, broadcast-chair, "
                            "podium-branded, chair, table, sofa, plant, lamp"
                        ),
                    },
                    "position": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "[x, y, z] position in metres",
                    },
                },
                "required": ["prop_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_prop",
            "description": (
                "Generate a new 3D prop from a text description using AI (gpt-image-1 → TripoSR). "
                "Use this when load_prop cannot find the requested object in the library. "
                "The prop will be generated and automatically loaded into the scene."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": (
                            "Detailed description of the 3D object to generate. "
                            "Be specific about materials, style, and details. "
                            "E.g. 'vintage espresso machine in rustic copper and brass, detailed'"
                        ),
                    },
                    "position": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "[x, y, z] position in metres where the prop will be placed",
                    },
                },
                "required": ["description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "load_story_character",
            "description": "Load an AI story character (avatar) into the scene.",
            "parameters": {
                "type": "object",
                "properties": {
                    "avatar_type": {
                        "type": "string",
                        "enum": [
                            "waiter", "bakemester", "customer_woman",
                            "baker_assistant", "food_photographer",
                        ],
                        "description": "Avatar type to load",
                    },
                    "position": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "[x, y, z] position in metres",
                    },
                    "name": {
                        "type": "string",
                        "description": "Display name for the character",
                    },
                },
                "required": ["avatar_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "clear_characters",
            "description": "Remove all story characters from the scene.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_light_property",
            "description": (
                "Modify a property of an existing studio light by its ID. "
                "Supports fine-grained control: intensity, color temperature (CCT), "
                "color, position, modifier (softbox type), and enabled state. "
                "Use light_id='*' to apply to all lights."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "light_id": {
                        "type": "string",
                        "description": (
                            "The light's ID (e.g. 'key-light-1', 'fill-light-1', 'rim-light-1'). "
                            "Use '*' to apply to all studio lights."
                        ),
                    },
                    "property": {
                        "type": "string",
                        "enum": ["intensity", "cct", "color", "enabled", "position", "modifier"],
                        "description": "Which property to change.",
                    },
                    "value": {
                        "description": (
                            "New value: "
                            "number 0–2 for intensity; "
                            "number 2000–10000 for cct (Kelvin); "
                            "hex string '#rrggbb' for color; "
                            "boolean for enabled; "
                            "[x,y,z] array in metres for position; "
                            "string like 'softbox-60x90', 'umbrella', 'beauty-dish' for modifier."
                        ),
                    },
                },
                "required": ["light_id", "property", "value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_camera_fov",
            "description": (
                "Set the camera field of view by specifying a focal length in mm "
                "(35mm full-frame equivalent). Also optionally sets white balance in Kelvin."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "focal_length": {
                        "type": "number",
                        "description": "Focal length in mm. E.g. 24=wide, 50=normal, 85=portrait, 135=telephoto.",
                    },
                    "white_balance": {
                        "type": "number",
                        "description": "White balance in Kelvin (2000–10000). 5500 = neutral daylight.",
                    },
                },
                "required": ["focal_length"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "reposition_prop",
            "description": (
                "Move an existing prop or character to a new position in the scene. "
                "Use this to correct placement after receiving feedback about actual positions, "
                "to avoid overlaps, or to rebalance the composition. "
                "prop_id comes from the scene state you were given."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "prop_id": {
                        "type": "string",
                        "description": "The prop's ID as given in the current scene state (e.g. 'prop-1234567890-chair').",
                    },
                    "position": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "[x, y, z] new position in metres. Y=0 places the prop on the floor.",
                    },
                },
                "required": ["prop_id", "position"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_prop",
            "description": (
                "Remove an existing prop from the scene. "
                "Use this to clean up overlapping, wrong, or unwanted props. "
                "prop_id comes from the scene state you were given."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "prop_id": {
                        "type": "string",
                        "description": "The prop's ID as given in the current scene state.",
                    },
                },
                "required": ["prop_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_backdrop_color",
            "description": (
                "Change the studio backdrop/background color. "
                "Use this to set the mood — white for high-key, black for drama, "
                "grey tones for natural, or colored for creative looks."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "color": {
                        "type": "string",
                        "description": (
                            "Hex color for the backdrop. "
                            "White: '#ffffff', Black: '#0a0a0a', Mid-grey: '#808080', "
                            "Warm grey: '#9a8a7a', Cobalt blue: '#1a3a6a', Forest: '#1a3a1a'"
                        ),
                    },
                },
                "required": ["color"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "clear_scene",
            "description": (
                "Remove ALL props from the scene and optionally clear all lights and characters too. "
                "Use this to start fresh before building a new setup."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "clear_lights": {
                        "type": "boolean",
                        "description": "Also remove all studio lights (default: false)",
                    },
                    "clear_characters": {
                        "type": "boolean",
                        "description": "Also remove all characters/avatars (default: true)",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "duplicate_prop",
            "description": (
                "Duplicate an existing prop in the scene and place the copy at a new position. "
                "Useful for quickly populating the scene with multiple identical objects."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "prop_id": {
                        "type": "string",
                        "description": "ID of the prop to duplicate (from scene state).",
                    },
                    "position": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "[x, y, z] position for the new copy.",
                    },
                },
                "required": ["prop_id", "position"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "focus_camera_on",
            "description": (
                "Reposition the camera to focus on a specific prop, character, or world position. "
                "Use this after placing elements to frame them properly."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 3,
                        "maxItems": 3,
                        "description": "[x, y, z] world position to focus on. E.g. [0, 1.5, 0] for a standing subject.",
                    },
                    "distance": {
                        "type": "number",
                        "description": "How far back to pull the camera (metres). E.g. 4.0 for close portrait, 8.0 for full-body.",
                    },
                },
                "required": ["target"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_scene_name",
            "description": "Give the current scene a descriptive name that will be shown in the UI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Scene name in Norwegian, e.g. 'Romantisk portrett – varm kveldsstemning'",
                    },
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_ambient_light",
            "description": (
                "Adjust the global ambient/fill light level. "
                "Ambient light fills shadows uniformly — lower values create more dramatic contrast."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "intensity": {
                        "type": "number",
                        "description": (
                            "Ambient intensity 0.0–1.0. "
                            "0.05 = near-zero fill (very dramatic), "
                            "0.15 = low-key portrait fill, "
                            "0.30 = natural studio, "
                            "0.60 = high-key / bright studio."
                        ),
                    },
                    "color": {
                        "type": "string",
                        "description": "Ambient colour hex. '#ffffff' = neutral, '#f0e8d8' = warm, '#d0e0f0' = cool.",
                    },
                },
                "required": ["intensity"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "audit_lighting",
            "description": (
                "Analyze the current lighting setup and provide professional feedback. "
                "Reports key-to-fill ratio, missing lights, CCT consistency, and quality score. "
                "Call this when the user asks for a critique or quality check of the scene."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "report_language": {
                        "type": "string",
                        "description": "Language for report — always 'no' (Norwegian)",
                        "enum": ["no"],
                    },
                },
                "required": [],
            },
        },
    },
]

SYSTEM_PROMPT = """Du er AI Direktør for Virtual Studio — en prisbelønt 3D-lysstudio-simulator.
Du er en erfaren fotografilærer, filmfotograf og lysdesigner i én person.
Du hjelper brukeren med å skape perfekte scener ved å kombinere presis teknisk kunnskap
med kreativt kunstnerisk blikk.

ALLTID norsk. ALLTID forklarende — si kort HVORFOR du gjør de valgene du gjør.
Bruk function calling aktivt. Kall gjerne 3–6 funksjoner i én respons for å bygge hele scenen.
Etter oppsett: gi en kort vurdering av lysoppsettets styrker og eventuelt hva som kan forbedres.

═══════════════════════════════════════════════════════
STUDIO-KOORDINATSYSTEM (memoriser dette)
═══════════════════════════════════════════════════════

Y=0 = gulvet. Props og karakterer hviler alltid på Y=0.
Motivet/subjektet: origo [0, 0, 0]
Kamera: Z ≈ -4, ser mot [0, 1.5, 0] (positiv Z-retning)
Bruksareal: X ∈ [-5, +5], Z ∈ [0, +8]
Props med Z < -2 er BEHIND kameraet og USYNLIGE — aldri bruk Z < 0 for props!
Venstre i bildet = positiv X. Høyre = negativ X (speil av kameraet).

Typiske lysposisjoner (Y = lyshøyde over gulvet, høy Y = takvinkel):
  Key light:  X=-2.5, Y=4.0, Z=-1.5   (45° til siden, over motivet)
  Fill light: X=+2.5, Y=3.0, Z=-1.0   (lavere, mykere, mot skyggeside)
  Rim light:  X=±1.0, Y=4.5, Z=+3.0   (bak motivet, adskiller fra bakgrunn)
  Hair light: X=0,    Y=5.0, Z=+1.0   (rett over hodet, fremhever hår)

═══════════════════════════════════════════════════════
LYSTEORI OG KEY:FILL-FORHOLD (memoriser dette)
═══════════════════════════════════════════════════════

Key:Fill ratio bestemmer scenekarakteren:
  1:1   = Flat, myk, glamour/mote (Hollywood-reklame)
  2:1   = Mykt, naturlig (nyheter, intervju, komedi)
  3:1   = Standard Hollywood-portrett (mest brukt)
  4:1   = Dramatisk (thriller, portrett med karakter)
  6:1   = Noir-belysning (meget dramatisk, kunstnerisk)
  8:1+  = Silhouette/svart/hvitt kunstfoto

Eksempel med key intensity=1.0:
  Filmisk portrett (3:1): fill=0.33
  Dramatisk (5:1): fill=0.20
  Noir (8:1): fill=0.12

CCT-KOMBINASJONER FOR STEMNING:
  Varm+kald kontrast (editorial):  Key=3200K, Rim=6500K — spenning og dybde
  Dagslys-ren:                     Key=5600K, Fill=5600K, Rim=6000K
  Golden hour:                     Key=3000K, Fill=3500K, Rim=5600K
  Kald krim/thriller:              Key=6500K, Fill=5000K, Rim=7000K
  Tungsten studio (vintage):       Key=3200K, Fill=3400K, Rim=3000K

MODIFIER-GUIDE:
  softbox-60x90  = myk, wrap-around (portrett, mat, skjønnhet)
  octabox-120    = meget myk, nær omnidireksjonell (skjønnhet, glamour)
  beauty-dish-56 = halvskarp, strukturert lys med fill-ring (fashion)
  stripbox-15x60 = smal, rettet catchlight (rim, bakgrunnslys)
  umbrella-white = stor, myk, lav kontrast (budsjett fill)
  fresnel        = fokusert, konturerende (film, teater, dramatisk)
  barn-doors     = styrt spill, unngår flare (bakgrunnslys)
  snoot          = spot, svært fokusert (hair light, accent)
  grid-40        = som snoot men bredere (foreground accent)

═══════════════════════════════════════════════════════
KAMERAVALG OG KOMPOSISJON
═══════════════════════════════════════════════════════

Brennvidde-guide (full-frame ekvivalent):
  24–28mm: Dramatisk vidvinkel, arkitektur, miljøportretter (nær-distorsjon)
  35mm:    Fotojournalistisk, naturlig perspektiv (dokumentar, mote editorial)
  50mm:    «Øyets» brennvidde, nøytralt, allsidig
  85mm:    Klassisk portrett, flattenende, bokeh — IDEELL for ansikt
  105mm:   Komprimert portrett, headshot, skjønnhet
  135mm:   Sterk kompresjon, løsrevet fra bakgrunn (editorial, celebrity)
  200mm+:  Sport, lange avstandsskudd, ekstrem kompresjon

Regel: kortere brennvidde → mer miljø/kontekst, lengre → mer subjektfokus.

KOMPOSISJONSREGLER:
  Tredjedelsloven: subjekt langs tredjedelslinjer (X≈±1.5)
  Leadroom: subjektet bør ha plass til å «se inn i» bildet
  Dybdeforhold: fordel props på ulike Z-verdier for perspektivdybde

═══════════════════════════════════════════════════════
PROP-PLASSERING
═══════════════════════════════════════════════════════

Minst 0.8m mellomrom mellom alle props/karakterer.
Spre horisontalt (ulike X) og i dybden (ulike Z).
Sekundære karakterer: bak primærmotivet (Z+1 til +3) eller til sidene (X±2 til ±4).
Utstyr (stativer): X±3 til ±5.
Møbler foran motivet: Z+0.5 til +2 (f.eks. bord foran, Z=+1).

generate_prop: Beskriv alltid på ENGELSK, detaljert (materiale, stil, epoke).

═══════════════════════════════════════════════════════
SCENE-TILSTAND OG KORREKSJON
═══════════════════════════════════════════════════════

Du vil se "NÅVÆRENDE SCENE-TILSTAND" med lys, props og karakterer.
Bruk denne for å:
1. Unngå overlapp (se om noe allerede er plassert)
2. Korrigere feil med reposition_prop / remove_prop
3. Bygge videre på eksisterende oppsett intelligens

Audit ved forespørsel: Analyser key:fill-ratio, manglende rim-lys, inkonsistent CCT,
og gi en kvalitetsvurdering 1–10 med konkrete forbedringspunkter.
"""


def _tool_call_to_events(tool_name: str, args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Convert a GPT-4o tool call to a list of frontend events to dispatch."""
    events = []

    if tool_name == "apply_scenario_preset":
        lights = args.get("lights", [])
        backdrop_color = args.get("backdrop_color", "#808080")
        focal_length = args.get("camera_focal_length", 85)
        camera_position = args.get("camera_position", [0, 1.6, 3.5])

        preset = {
            "id": f"ai-generated-{len(lights)}lights",
            "navn": args.get("navn", "AI Generert"),
            "kategori": "portrett",
            "beskrivelse": args.get("beskrivelse", "AI-generert lysoppsett"),
            "tags": ["ai-generated"],
            "sceneConfig": {
                "lights": [
                    {
                        "type": l.get("type", "key-light"),
                        "position": l.get("position", [0, 2, 2]),
                        "rotation": l.get("rotation", [0, 0, 0]),
                        "intensity": l.get("intensity", 1.0),
                        "cct": l.get("cct", 5600),
                        "modifier": l.get("modifier", "softbox-60x90"),
                    }
                    for l in lights
                ],
                "backdrop": {"type": "seamless", "color": backdrop_color},
                "camera": {
                    "position": camera_position,
                    "target": [0, 1.5, 0],
                    "focalLength": focal_length,
                },
            },
            "recommendedAssets": {"lights": [], "modifiers": [], "backdrops": []},
        }
        events.append({"event": "applyScenarioPreset", "detail": preset})

    elif tool_name == "set_outdoor_sun":
        events.append({
            "event": "vs-outdoor-sun",
            "detail": {
                "elevation": args.get("elevation", 45),
                "azimuth": args.get("azimuth", 180),
                "intensity": args.get("intensity", 2.5),
                "color": args.get("color", "#fff8e8"),
                "enabled": args.get("enabled", True),
            },
        })

    elif tool_name == "set_fog":
        events.append({
            "event": "vs-outdoor-fog",
            "detail": {
                "fogEnabled": args.get("enabled", False),
                "mode": args.get("mode", "exp2"),
                "density": args.get("density", 0.005),
                "color": args.get("color", "#c0c8d0"),
            },
        })

    elif tool_name == "apply_lut":
        events.append({
            "event": "vs-lut-preview",
            "detail": {
                "contrast": args.get("contrast", 1.0),
                "exposure": args.get("exposure", 1.0),
                "saturation": args.get("saturation", 100),
                "shadowsHue": args.get("shadows_hue", 0),
                "shadowsDensity": args.get("shadows_density", 0),
                "highlightsHue": args.get("highlights_hue", 0),
                "highlightsDensity": args.get("highlights_density", 0),
                "midtonesHue": 0,
                "midtonesDensity": 0,
                "vignette": args.get("vignette", 0),
                "intensity": 1.0,
                "id": "ai-lut",
            },
        })

    elif tool_name == "set_camera":
        photo_settings: Dict[str, Any] = {}
        if "focal_length" in args:
            photo_settings["focalLength"] = args["focal_length"]
        if "white_balance" in args:
            photo_settings["whiteBalance"] = args["white_balance"]
        if photo_settings:
            events.append({
                "event": "vs-camera-settings",
                "detail": {"mode": "photo", "photo": photo_settings},
            })

    elif tool_name in ("add_prop", "load_prop"):
        events.append({
            "event": "vs-add-prop",
            "detail": {
                "propId": args["prop_id"],
                "position": args.get("position", [0, 0, 0]),
            },
        })

    elif tool_name == "generate_prop":
        events.append({
            "event": "vs-generate-prop-request",
            "detail": {
                "description": args.get("description", ""),
                "position": args.get("position", [0, 0, 0]),
            },
        })

    elif tool_name in ("load_character", "load_story_character"):
        avatar_type = args.get("avatar_type", "waiter")
        avatar_urls: Dict[str, str] = {
            "waiter": "/models/avatars/waiter.glb",
            "bakemester": "/models/avatars/bakemester.glb",
            "customer_woman": "/models/avatars/customer_woman.glb",
            "baker_assistant": "/models/avatars/baker_assistant.glb",
            "food_photographer": "/models/avatars/food_photographer.glb",
        }
        import uuid
        story_rig_id = f"ai-{avatar_type}-{uuid.uuid4().hex[:6]}"
        events.append({
            "event": "ch-load-story-character",
            "detail": {
                "modelUrl": avatar_urls.get(avatar_type, avatar_urls["waiter"]),
                "name": args.get("name", avatar_type.replace("_", " ").title()),
                "skinTone": "medium",
                "height": 1.75,
                "position": args.get("position", [0, 0, 0]),
                "rotation": [0, 0, 0],
                "storyRigId": story_rig_id,
            },
        })

    elif tool_name == "clear_characters":
        events.append({"event": "ch-clear-story-characters", "detail": {}})

    elif tool_name == "set_light_property":
        events.append({
            "event": "vs-set-light-property",
            "detail": {
                "lightId": args.get("light_id"),
                "property": args.get("property"),
                "value": args.get("value"),
            },
        })

    elif tool_name == "set_camera_fov":
        photo: Dict[str, Any] = {"focalLength": args["focal_length"]}
        if "white_balance" in args:
            photo["whiteBalance"] = args["white_balance"]
        events.append({
            "event": "vs-camera-settings",
            "detail": {"mode": "photo", "photo": photo},
        })

    elif tool_name == "reposition_prop":
        events.append({
            "event": "vs-reposition-prop",
            "detail": {
                "propId": args["prop_id"],
                "position": args["position"],
            },
        })

    elif tool_name == "remove_prop":
        events.append({
            "event": "vs-remove-prop",
            "detail": {
                "propId": args["prop_id"],
            },
        })

    elif tool_name == "set_backdrop_color":
        events.append({
            "event": "vs-set-backdrop-color",
            "detail": {
                "color": args.get("color", "#808080"),
            },
        })

    elif tool_name == "clear_scene":
        events.append({
            "event": "vs-clear-scene",
            "detail": {
                "clearLights": args.get("clear_lights", False),
                "clearCharacters": args.get("clear_characters", True),
            },
        })

    elif tool_name == "duplicate_prop":
        events.append({
            "event": "vs-duplicate-prop",
            "detail": {
                "propId": args.get("prop_id"),
                "position": args.get("position", [2, 0, 0]),
            },
        })

    elif tool_name == "focus_camera_on":
        events.append({
            "event": "vs-focus-camera-on",
            "detail": {
                "target": args.get("target", [0, 1.5, 0]),
                "distance": args.get("distance", 4.0),
            },
        })

    elif tool_name == "set_scene_name":
        events.append({
            "event": "vs-set-scene-name",
            "detail": {
                "name": args.get("name", ""),
            },
        })

    elif tool_name == "set_ambient_light":
        events.append({
            "event": "vs-set-ambient-light",
            "detail": {
                "intensity": args.get("intensity", 0.2),
                "color": args.get("color", "#ffffff"),
            },
        })

    elif tool_name == "audit_lighting":
        # The AI handles the response text; no frontend event needed
        pass

    return events


def _describe_tool_call(tool_name: str, args: Dict[str, Any]) -> str:
    """Return a Norwegian progress description for a tool call."""
    if tool_name == "apply_scenario_preset":
        n = args.get("navn", "nytt oppsett")
        nl = len(args.get("lights", []))
        return f"Setter opp «{n}» med {nl} lyskilder…"
    if tool_name == "set_outdoor_sun":
        elev = args.get("elevation", 45)
        az = args.get("azimuth", 180)
        hour = "gyllen time ☀" if elev < 20 else ("middagssol" if elev > 60 else "dagslys")
        return f"Setter sol — {hour} ({elev}° høyde, {az}° azimut)…"
    if tool_name == "set_fog":
        return ("Aktiverer tåke (tetthet %.3f)…" % args.get("density", 0.005)) if args.get("enabled") else "Deaktiverer tåke…"
    if tool_name == "apply_lut":
        mood = "nøytral"
        if args.get("contrast", 1.0) > 1.3:
            mood = "høy kontrast"
        elif args.get("exposure", 1.0) > 1.2:
            mood = "lys/high-key"
        elif args.get("exposure", 1.0) < 0.8:
            mood = "mørk/low-key"
        return f"Anvender fargegradering ({mood})…"
    if tool_name in ("set_camera", "set_camera_fov"):
        fl = args.get("focal_length", 50)
        style = "portrett" if fl >= 85 else ("normalt" if fl >= 45 else "vidvinkel")
        return f"Setter kamera til {fl}mm ({style}-perspektiv)…"
    if tool_name in ("add_prop", "load_prop"):
        return f"Laster prop: {args.get('prop_id', '')}…"
    if tool_name == "generate_prop":
        desc = args.get("description", "")[:50]
        pos = args.get("position", [0, 0, 0])
        return f"Genererer 3D-prop «{desc}» ved [{pos[0]:.1f}, {pos[1]:.1f}, {pos[2]:.1f}]…"
    if tool_name in ("load_character", "load_story_character"):
        avatar = args.get("avatar_type", "").replace("_", " ").title()
        name = args.get("name", avatar)
        return f"Laster karakter: {name}…"
    if tool_name == "clear_characters":
        return "Fjerner alle karakterer fra scenen…"
    if tool_name == "set_light_property":
        prop = args.get("property", "egenskap")
        lid = args.get("light_id", "*")
        val = args.get("value", "")
        prop_labels = {"intensity": "intensitet", "cct": "fargetemperatur", "color": "farge",
                       "enabled": "av/på", "position": "posisjon", "modifier": "modifier"}
        return f"Justerer {prop_labels.get(prop, prop)} på {lid} → {val}…"
    if tool_name == "reposition_prop":
        pos = args.get("position", [0, 0, 0])
        return f"Flytter prop til [{pos[0]:.1f}, {pos[1]:.1f}, {pos[2]:.1f}]…"
    if tool_name == "remove_prop":
        return "Fjerner prop fra scenen…"
    if tool_name == "set_backdrop_color":
        color = args.get("color", "#808080")
        return f"Endrer bakgrunn til {color}…"
    if tool_name == "clear_scene":
        parts = ["Rydder alle props"]
        if args.get("clear_lights"):
            parts.append("lys")
        if args.get("clear_characters", True):
            parts.append("karakterer")
        return f"{', '.join(parts)} fra scenen…"
    if tool_name == "duplicate_prop":
        pos = args.get("position", [0, 0, 0])
        return f"Dupliserer prop til [{pos[0]:.1f}, {pos[1]:.1f}, {pos[2]:.1f}]…"
    if tool_name == "focus_camera_on":
        tgt = args.get("target", [0, 1.5, 0])
        return f"Fokuserer kamera mot [{tgt[0]:.1f}, {tgt[1]:.1f}, {tgt[2]:.1f}]…"
    if tool_name == "set_scene_name":
        return f"Navngir scenen: «{args.get('name', '')}»…"
    if tool_name == "set_ambient_light":
        pct = int(args.get("intensity", 0.2) * 100)
        return f"Setter ambientlys til {pct}%…"
    if tool_name == "audit_lighting":
        return "Analyserer lyskvalitet og komposisjon…"
    return f"Utfører {tool_name}…"


def _generate_suggestions(
    tool_calls_made: List[str],
    scene_context: Optional[Dict[str, Any]],
) -> List[str]:
    """Return 3 proactive Norwegian follow-up action suggestions based on what was just done."""
    props = (scene_context or {}).get("props", [])
    lights = (scene_context or {}).get("lights", [])
    has_props = len(props) > 0
    has_lights = len(lights) > 0

    if "apply_scenario_preset" in tool_calls_made:
        return [
            "Legg til karakterer i scenen",
            "Generer 3D-props automatisk for scenen",
            "Juster fargegradering og mood",
        ]
    if "generate_prop" in tool_calls_made or "load_prop" in tool_calls_made:
        return [
            "Korriger plasseringen av alle props",
            "Legg til en karakter i scenen",
            "Tilpass lysretning mot propsen",
        ]
    if "reposition_prop" in tool_calls_made or "remove_prop" in tool_calls_made:
        return [
            "Sjekk helhetskomposisjonen",
            "Juster belysningen for scenen",
            "Legg til en karakter i forgrunnen",
        ]
    if any(t in tool_calls_made for t in ["set_light_property", "apply_lut", "set_camera_fov"]):
        return [
            "Lag en low-key dramatisk versjon",
            "Optimaliser key-to-fill forholdet",
            "Legg til rim-lys for dybde",
        ]
    if "set_outdoor_sun" in tool_calls_made or "set_fog" in tool_calls_made:
        return [
            "Juster solhøyden til gyllen time (15°)",
            "Legg til tåke for stemningseffekt",
            "Analyser og gjenskap lyssettingen fra et bilde",
        ]
    if "load_story_character" in tool_calls_made:
        return [
            "Legg til et prop til karakteren",
            "Juster kameravinkelen mot karakteren",
            "Endre belysningen for scenen",
        ]
    if has_props and not has_lights:
        return [
            "Sett opp tre-punkt belysning",
            "Dramatisk noir-oppsett med sidelys",
            "Korriger plasseringen av props",
        ]
    if not has_lights:
        return [
            "Tre-punkt belysning for portrett",
            "Dramatisk noir med hardt sidelys",
            "Filmisk gyllen time-belysning",
        ]
    return [
        "Sjekk og korriger plasseringen av props",
        "Finjuster fargegradering",
        "Legg til karakterer i scenen",
    ]


class AiDirectorService:
    def __init__(self) -> None:
        print("AI Director Service: Initialized (GPT-4o via Replit AI Integrations)")

    @property
    def enabled(self) -> bool:
        return bool(
            os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
            or os.environ.get("OPENAI_API_KEY")
        )

    def get_status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "model": "gpt-4o" if self.enabled else None,
            "capabilities": [
                "scene_generation",
                "light_control",
                "reference_analysis",
                "prop_generation",
            ],
        }

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        image_data_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run the AI Director conversation loop with tool calling.

        Returns:
            {
                "reply": str,         # Norwegian text reply
                "events": [...],       # frontend events to dispatch
                "steps": [...],        # progress labels shown during execution
                "tool_calls_made": [...],
                "error": str|None
            }
        """
        if not self.enabled:
            return {
                "reply": "AI Direktør er ikke aktivert. Mangler API-konfigurasjon.",
                "events": [],
                "steps": [],
                "tool_calls_made": [],
                "error": "not_configured",
            }

        system_message = {"role": "system", "content": SYSTEM_PROMPT}
        chat_messages = [system_message] + list(messages)

        if image_data_url:
            last_user_msg = next(
                (m for m in reversed(chat_messages) if m["role"] == "user"), None
            )
            if last_user_msg:
                content = last_user_msg.get("content", "")
                if isinstance(content, str):
                    last_user_msg["content"] = [
                        {"type": "text", "text": content or "Analyser dette bildet."},
                        {"type": "image_url", "image_url": {"url": image_data_url}},
                    ]

        all_events: List[Dict[str, Any]] = []
        all_steps: List[str] = []
        tool_calls_made: List[str] = []

        try:
            response = _get_client().chat.completions.create(
                model="gpt-4o",
                messages=chat_messages,
                tools=DIRECTOR_TOOLS,
                tool_choice="auto",
                max_tokens=1500,
            )

            message = response.choices[0].message
            reply_text = message.content or ""
            tool_calls = message.tool_calls or []

            for tc in tool_calls:
                fn_name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}

                step_label = _describe_tool_call(fn_name, args)
                all_steps.append(step_label)
                tool_calls_made.append(fn_name)
                events = _tool_call_to_events(fn_name, args)
                all_events.extend(events)

            if not reply_text and tool_calls:
                tool_names_no = {
                    "apply_scenario_preset": "lysoppsett",
                    "set_outdoor_sun": "sol",
                    "set_fog": "tåke",
                    "apply_lut": "fargegradering",
                    "set_camera": "kamera",
                    "add_prop": "prop",
                    "load_character": "karakter",
                    "clear_characters": "rydding",
                }
                done_items = [tool_names_no.get(n, n) for n in tool_calls_made]
                reply_text = f"Ferdig! Jeg har satt opp: {', '.join(done_items)}."

            return {
                "reply": reply_text,
                "events": all_events,
                "steps": all_steps,
                "tool_calls_made": tool_calls_made,
                "error": None,
            }

        except Exception as exc:
            error_msg = str(exc)
            print(f"[AiDirectorService] Error: {error_msg}")
            if "FREE_CLOUD_BUDGET_EXCEEDED" in error_msg:
                return {
                    "reply": "Kredittgrensen er nådd. Vennligst oppgrader din Replit-plan.",
                    "events": [],
                    "steps": [],
                    "tool_calls_made": [],
                    "error": "budget_exceeded",
                }
            return {
                "reply": "En feil oppstod. Prøv igjen.",
                "events": [],
                "steps": [],
                "tool_calls_made": [],
                "error": error_msg[:200],
            }

    async def chat_stream(
        self,
        messages: List[Dict[str, Any]],
        image_data_url: Optional[str] = None,
        scene_context: Optional[Dict[str, Any]] = None,
    ):
        """
        SSE streaming version of chat() using real-time token streaming.
        Yields newline-delimited JSON strings, each prefixed with 'data: '.

        Event types:
          {"type": "token",       "text": "..."}      — streaming text token (appears in real-time)
          {"type": "step",        "text": "..."}      — tool-call progress label
          {"type": "events",      "events": [...]}    — frontend events to dispatch
          {"type": "reply",       "text": "..."}      — final complete reply (text may already be shown via tokens)
          {"type": "suggestions", "items": [...]}     — proactive follow-up action chips
          {"type": "error",       "text": "..."}      — error message
        """
        import asyncio

        if not self.enabled:
            yield "data: " + json.dumps({
                "type": "error",
                "text": "AI Direktør er ikke aktivert. Mangler API-konfigurasjon.",
            }) + "\n\n"
            return

        system_message = {"role": "system", "content": SYSTEM_PROMPT}
        chat_messages = [system_message]

        # Inject current scene state (props + lights + characters + camera)
        if scene_context:
            props = scene_context.get("props", [])
            lights = scene_context.get("lights", [])
            characters = scene_context.get("characters", [])
            scene_name = scene_context.get("sceneName", "")
            camera = scene_context.get("camera", {})
            scene_lines = ["NÅVÆRENDE SCENE-TILSTAND (oppdatert):"]
            if scene_name:
                scene_lines.append(f"Scenenavn: «{scene_name}»")
            cam_pos = camera.get("position", [])
            if cam_pos:
                scene_lines.append(f"Kamera: posisjon=[{cam_pos[0]:.1f}, {cam_pos[1]:.1f}, {cam_pos[2]:.1f}]")
            if lights:
                scene_lines.append(f"Lys i scenen ({len(lights)} stk):")
                for lt in lights:
                    pos = lt.get("position", [0, 0, 0])
                    scene_lines.append(
                        f"  • id={lt.get('id', '?')} type={lt.get('lightType', '?')} "
                        f"intensitet={lt.get('intensity', 0):.2f} CCT={lt.get('cct', 5600)}K "
                        f"modifier={lt.get('modifier', 'none')} "
                        f"pos=[{pos[0]:.1f}, {pos[1]:.1f}, {pos[2]:.1f}]"
                    )
            else:
                scene_lines.append("Ingen lys satt opp ennå.")
            if characters:
                scene_lines.append(f"Karakterer i scenen ({len(characters)} stk):")
                for ch in characters:
                    pos = ch.get("position", [0, 0, 0])
                    scene_lines.append(
                        f"  • id={ch.get('id')} navn=\"{ch.get('name', '?')}\" "
                        f"type={ch.get('avatarType', '?')} "
                        f"pos=[{pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f}]"
                    )
            else:
                scene_lines.append("Ingen karakterer i scenen ennå.")
            if props:
                scene_lines.append(f"Props i scenen ({len(props)} stk):")
                for p in props:
                    pos = p.get("position", [0, 0, 0])
                    size = p.get("size")
                    size_str = f" størrelse=[{size[0]:.2f}×{size[1]:.2f}×{size[2]:.2f}m]" if size else ""
                    scene_lines.append(
                        f"  • id={p.get('id')} navn=\"{p.get('name', p.get('assetId', '?'))}\" "
                        f"pos=[{pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f}]{size_str}"
                    )
            else:
                scene_lines.append("Ingen props i scenen ennå.")
            chat_messages.append({"role": "system", "content": "\n".join(scene_lines)})

        # Truncate history to last 14 messages to avoid context window overflow
        trimmed = list(messages)
        if len(trimmed) > 14:
            trimmed = trimmed[-14:]
        chat_messages += trimmed

        if image_data_url:
            last_user_msg = next(
                (m for m in reversed(chat_messages) if m["role"] == "user"), None
            )
            if last_user_msg:
                content = last_user_msg.get("content", "")
                if isinstance(content, str):
                    last_user_msg["content"] = [
                        {"type": "text", "text": content or "Analyser dette bildet."},
                        {"type": "image_url", "image_url": {"url": image_data_url}},
                    ]

        # Accumulate streaming tool call deltas by index
        accumulated_tool_calls: Dict[int, Dict[str, str]] = {}
        reply_text = ""
        tool_calls_made: List[str] = []

        try:
            stream = await _get_async_client().chat.completions.create(
                model="gpt-4o",
                messages=chat_messages,
                tools=DIRECTOR_TOOLS,
                tool_choice="auto",
                max_tokens=1500,
                stream=True,
            )

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta

                # Stream text tokens in real-time
                if delta.content:
                    reply_text += delta.content
                    yield "data: " + json.dumps({"type": "token", "text": delta.content}) + "\n\n"
                    await asyncio.sleep(0)

                # Accumulate tool call argument deltas
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in accumulated_tool_calls:
                            accumulated_tool_calls[idx] = {"name": "", "arguments": ""}
                        if tc.function:
                            if tc.function.name:
                                accumulated_tool_calls[idx]["name"] += tc.function.name
                            if tc.function.arguments:
                                accumulated_tool_calls[idx]["arguments"] += tc.function.arguments

            # Execute assembled tool calls in order
            for idx in sorted(accumulated_tool_calls.keys()):
                tc = accumulated_tool_calls[idx]
                fn_name = tc["name"]
                try:
                    args = json.loads(tc["arguments"])
                except json.JSONDecodeError:
                    args = {}

                step_label = _describe_tool_call(fn_name, args)
                tool_calls_made.append(fn_name)

                yield "data: " + json.dumps({"type": "step", "text": step_label}) + "\n\n"
                await asyncio.sleep(0)

                events = _tool_call_to_events(fn_name, args)
                if events:
                    yield "data: " + json.dumps({"type": "events", "events": events}) + "\n\n"
                    await asyncio.sleep(0)

            # Auto-generate reply when GPT-4o only called tools (no text)
            if not reply_text and tool_calls_made:
                tool_names_no = {
                    "apply_scenario_preset": "lysoppsett",
                    "set_outdoor_sun": "sol",
                    "set_fog": "tåke",
                    "apply_lut": "fargegradering",
                    "set_camera": "kamera",
                    "set_camera_fov": "kamera-vinkel",
                    "add_prop": "prop",
                    "load_prop": "prop",
                    "load_story_character": "karakter",
                    "clear_characters": "rydding",
                    "set_light_property": "lysjustering",
                    "generate_prop": "3D-prop-generering",
                    "reposition_prop": "omposisjonering",
                    "remove_prop": "fjerning",
                }
                done_items = [tool_names_no.get(n, n) for n in tool_calls_made]
                reply_text = f"Ferdig! Jeg har utført: {', '.join(done_items)}."

            yield "data: " + json.dumps({"type": "reply", "text": reply_text}) + "\n\n"

            # Emit proactive follow-up suggestions
            suggestions = _generate_suggestions(tool_calls_made, scene_context)
            yield "data: " + json.dumps({"type": "suggestions", "items": suggestions}) + "\n\n"

        except Exception as exc:
            error_msg = str(exc)
            print(f"[AiDirectorService.stream] Error: {error_msg}")
            if "FREE_CLOUD_BUDGET_EXCEEDED" in error_msg:
                yield "data: " + json.dumps({
                    "type": "error",
                    "text": "Kredittgrensen er nådd. Vennligst oppgrader din Replit-plan.",
                }) + "\n\n"
            else:
                yield "data: " + json.dumps({
                    "type": "error",
                    "text": "En feil oppstod. Prøv igjen.",
                }) + "\n\n"

    async def analyze_reference_image(self, image_data_url: str) -> Dict[str, Any]:
        """
        Analyze a reference photo using GPT-4o Vision.
        Returns a partial ScenarioPreset JSON with extracted lighting.
        """
        if not self.enabled:
            return {"success": False, "error": "not_configured"}

        prompt = """Analyser lyssettingen i dette bildet som en profesjonell lysdesigner.
Returner et JSON-objekt med følgende struktur — BARE JSON, ingen forklaringstekst:

{
  "summary": "Norsk beskrivelse av lyssettingen (1-2 setninger)",
  "lights": [
    {
      "type": "key-light|fill-light|rim-light|back-light|hair-light|beauty-dish",
      "position": [x, y, z],
      "rotation": [rx, ry, rz],
      "intensity": 0.0-2.0,
      "cct": 2700-10000,
      "modifier": "softbox|octabox|beauty-dish|umbrella-white|stripbox|fresnel|natural"
    }
  ],
  "backdrop_color": "#rrggbb",
  "camera_focal_length": 35-200,
  "lut": {
    "contrast": 1.0,
    "exposure": 1.0,
    "saturation": 100,
    "shadows_hue": 0,
    "shadows_density": 0,
    "highlights_hue": 0,
    "highlights_density": 0
  },
  "mood": "dramatisk|myk|naturlig|romantisk|kald|varm|high-key|low-key"
}

Retningslinjer:
- Estimer lysposisjon i 3D: x=venstre/høyre, y=høyde (0=gulv, 2.5=tak), z=foran/bak (positiv=foran)
- Analyser antall synlige lyskilder fra skygger og høylys
- Estimer CCT fra fargetonen (oransje=tungsten≈3200K, hvit=dagslys≈5600K, blå=skyet≈7000K)
- Modifier: softbox for myke skygger, beauty-dish for skarp/myk blanding
- Returner alltid valid JSON."""

        try:
            response = _get_client().chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_data_url}},
                        ],
                    }
                ],
                max_tokens=1000,
            )

            raw = response.choices[0].message.content or ""
            raw = raw.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?", "", raw).strip()
                raw = re.sub(r"```$", "", raw).strip()

            analysis = json.loads(raw)

            preset = {
                "id": "reference-extracted",
                "navn": f"Referanse: {analysis.get('mood', 'analysert')}",
                "kategori": "portrett",
                "beskrivelse": analysis.get("summary", "Ekstrahert fra referansebilde"),
                "tags": ["reference", "ai-extracted"],
                "sceneConfig": {
                    "lights": [
                        {
                            "type": l.get("type", "key-light"),
                            "position": l.get("position", [0, 2, 2]),
                            "rotation": l.get("rotation", [0, 0, 0]),
                            "intensity": l.get("intensity", 1.0),
                            "cct": l.get("cct", 5600),
                            "modifier": l.get("modifier", "softbox-60x90"),
                        }
                        for l in analysis.get("lights", [])
                    ],
                    "backdrop": {
                        "type": "seamless",
                        "color": analysis.get("backdrop_color", "#808080"),
                    },
                    "camera": {
                        "position": [0, 1.6, 3.5],
                        "target": [0, 1.5, 0],
                        "focalLength": analysis.get("camera_focal_length", 85),
                    },
                },
                "recommendedAssets": {"lights": [], "modifiers": [], "backdrops": []},
            }

            lut = analysis.get("lut", {})
            events: List[Dict[str, Any]] = [
                {"event": "applyScenarioPreset", "detail": preset},
            ]
            if any(lut.get(k, 0) != (1.0 if k in ("contrast", "exposure") else 100 if k == "saturation" else 0) for k in lut):
                events.append({
                    "event": "vs-lut-preview",
                    "detail": {
                        "contrast": lut.get("contrast", 1.0),
                        "exposure": lut.get("exposure", 1.0),
                        "saturation": lut.get("saturation", 100),
                        "shadowsHue": lut.get("shadows_hue", 0),
                        "shadowsDensity": lut.get("shadows_density", 0),
                        "highlightsHue": lut.get("highlights_hue", 0),
                        "highlightsDensity": lut.get("highlights_density", 0),
                        "midtonesHue": 0,
                        "midtonesDensity": 0,
                        "vignette": 0,
                        "intensity": 1.0,
                        "id": "reference-lut",
                    },
                })

            return {
                "success": True,
                "summary": analysis.get("summary", ""),
                "mood": analysis.get("mood", ""),
                "light_count": len(analysis.get("lights", [])),
                "preset": preset,
                "events": events,
            }

        except json.JSONDecodeError as exc:
            print(f"[analyze_reference] JSON parse error: {exc}")
            return {"success": False, "error": "Kunne ikke tolke analyseresultatet."}
        except Exception as exc:
            error_msg = str(exc)
            print(f"[analyze_reference] Error: {error_msg}")
            return {"success": False, "error": error_msg[:200]}

    async def generate_prop_concept_image(self, description: str) -> Dict[str, Any]:
        """
        Step 1 of the asset pipeline: use GPT-4o to write an optimized TripoSR image prompt,
        then call gpt-image-1 to generate a concept image.

        Returns base64 image data ready to be passed to TripoSR.
        """
        if not self.enabled:
            return {"success": False, "error": "not_configured"}

        try:
            prompt_response = _get_client().chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You write image generation prompts optimised for 3D model reconstruction via TripoSR. "
                            "Rules: single object centred, white or neutral background, even lighting from front-above, "
                            "no shadows, high detail, photorealistic render style. "
                            "Output: one short English prompt, no preamble."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Object to model: {description}",
                    },
                ],
                max_tokens=120,
            )
            optimised_prompt = (prompt_response.choices[0].message.content or description).strip()
            print(f"[generate_prop] Optimised prompt: {optimised_prompt[:100]}")

            image_response = _get_client().images.generate(
                model="gpt-image-1",
                prompt=optimised_prompt,
                size="1024x1024",
            )
            image_base64 = image_response.data[0].b64_json or ""

            return {
                "success": True,
                "image_base64": image_base64,
                "optimised_prompt": optimised_prompt,
            }

        except Exception as exc:
            error_msg = str(exc)
            print(f"[generate_prop] Error: {error_msg}")
            if "FREE_CLOUD_BUDGET_EXCEEDED" in error_msg:
                return {
                    "success": False,
                    "error": "Kredittgrensen er nådd. Vennligst oppgrader din Replit-plan.",
                    "error_code": "BUDGET_EXCEEDED",
                }
            return {"success": False, "error": error_msg[:200]}


ai_director_service = AiDirectorService()
