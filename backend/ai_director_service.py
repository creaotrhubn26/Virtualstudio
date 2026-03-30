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

from openai import OpenAI

_openai_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    """Lazy OpenAI client — reads env vars at first call so integration secrets are available."""
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
]

SYSTEM_PROMPT = """Du er AI Direktør for Virtual Studio — en profesjonell 3D-lysstudio-simulator.
Du hjelper fotografer og filmregissører med å sette opp perfekte scener.

Svar alltid på norsk. Vær presis, profesjonell og entusiastisk.

Når brukeren beskriver en scene, bruk function calling for å sette opp lys, kamera, props og karakterer.
Du KAN og BØR kalle flere funksjoner i én respons for å bygge hele scenen på en gang.

═══════════════════════════════════════════════════
STUDIO KOORDINATSYSTEM — Lær dette utenat:
═══════════════════════════════════════════════════

• Gulvet er alltid Y = 0. Systemet justerer automatisk Y slik at props hviler på gulvet.
  → Sett alltid Y = 0 i posisjonsarrayene dine. Aldri negativ Y.

• Motivet (avatar/karakter) står i origo: [0, 0, 0]

• Kamera er plassert ca. ved Z = -4 (foran motivet), ser mot [0, 1.5, 0]
  → Props med Z < -2 vil havne bak kamera og ikke synes!
  → Props bør ha Z mellom 0 og +6 (bak motivet) eller X mellom ±1 og ±4 (til sidene)

• Studioets bruksareal: X = [-5 til +5], Z = [0 til +8]

• Skjermbilde/kameravinkel: kameraet ser mot bakveggen (positiv Z)
  → Venstre i bildet = positiv X, Høyre = negativ X (speilvend for kameraet)

PLASSERING AV PROPS OG KARAKTERER:
─────────────────────────────────────
• Hver prop/karakter trenger minst 0.8 m avstand fra andre (unngå overlapp)
• Spre props horisontalt: bruk ulike X-verdier (f.eks. -2, 0, +2, +3)
• Legg sekundære karakterer bak primærmotivet (større Z) eller til sidene
• Typiske posisjoner for en filmscene med 4 personer:
  - Primæraktør: [0, 0, 1]
  - Regissør: [-2.5, 0, 2]
  - Kameraoperatør: [2, 0, 0.5] (sett til siden, nær kamera)
  - Script supervisor: [-3, 0, 1.5]
• Utstyr (stativer, monitorer) settes ved sidene: X = ±3 til ±4

SCENE-STATE OG KORRIGERING:
─────────────────────────────
• Du vil motta en "NÅVÆRENDE SCENE-TILSTAND" med alle props, navn og faktiske posisjoner
• Bruk denne informasjonen til å:
  1. Unngå å plassere nye props der det allerede er noe
  2. Bruke reposition_prop for å korrigere props som er feil plassert
  3. Bruke remove_prop for å fjerne duplikater eller feilplasserte objekter
• Hvis brukeren ber deg "ordne scenen" eller "fiks plasseringen" → analyser scene-tilstanden
  og bruk reposition_prop for alle props som trenger korrigering

LYSKJEMA-RETNINGSLINJER:
─────────────────────────
• Key light: Primærlys, 45° til siden, litt over øyehøyde
  Posisjon: [-2, 4, -1] (venstre, høy, litt foran)
  Intensitet: 0.8–1.0, CCT: 5600K

• Fill light: Motatt side fra key, halvparten av key-intensitet
  Posisjon: [2, 3, -1], Intensitet: 0.4–0.5

• Rim/back light: Bak motivet for separasjon fra bakgrunn
  Posisjon: [1, 4, 3] eller [-1, 4, 3], Intensitet: 0.6–0.8

• CCT guide: 3200K=tungsten/varm, 4500K=overskyet, 5600K=dagslys, 6500K=skyet

GENERERING AV PROPS (generate_prop):
──────────────────────────────────────
• Beskriv objektet detaljert på engelsk for beste resultat
• Sett realistiske X/Z posisjoner uten overlapp (Y = 0 alltid)
• Systemet plasserer automatisk proppen på gulvet uansett Y-verdi du gir

Når brukeren laster opp et referansebilde, analyser lyssettingen og gjenskap den.
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

    return events


def _describe_tool_call(tool_name: str, args: Dict[str, Any]) -> str:
    """Return a Norwegian progress description for a tool call."""
    descriptions = {
        "apply_scenario_preset": f"Setter opp lysscene: {args.get('navn', 'nytt oppsett')}…",
        "set_outdoor_sun": f"Konfigurerer utendørs sol (høyde: {args.get('elevation', 45)}°, azimut: {args.get('azimuth', 180)}°)…",
        "set_fog": "Aktiverer tåke…" if args.get("enabled") else "Deaktiverer tåke…",
        "apply_lut": "Anvender fargegradering…",
        "set_camera": f"Setter kamera til {args.get('focal_length', 50)}mm…",
        "add_prop": f"Legger til prop: {args.get('prop_id', '')}…",
        "load_prop": f"Laster prop: {args.get('prop_id', '')}…",
        "generate_prop": f"Genererer 3D-prop: {args.get('description', '')[:40]}…",
        "load_character": f"Laster karakter: {args.get('avatar_type', '')}…",
        "load_story_character": f"Laster karakter: {args.get('avatar_type', '')}…",
        "clear_characters": "Fjerner alle karakterer…",
        "set_light_property": f"Justerer {args.get('property', 'egenskap')} på lys {args.get('light_id', '')}…",
        "set_camera_fov": f"Setter kamera-brennvidde til {args.get('focal_length', 50)}mm…",
        "reposition_prop": f"Flytter prop {args.get('prop_id', '')[:20]} til {args.get('position', [0,0,0])}…",
        "remove_prop": f"Fjerner prop {args.get('prop_id', '')[:20]}…",
    }
    return descriptions.get(tool_name, f"Utfører {tool_name}…")


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
        SSE streaming version of chat().
        Yields newline-delimited JSON strings, each prefixed with 'data: '.

        Event types:
          {"type": "step",   "text": "..."}        — tool-call progress label
          {"type": "events", "events": [...]}        — frontend events to dispatch
          {"type": "reply",  "text": "..."}          — final assistant reply
          {"type": "error",  "text": "..."}          — error message
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

        # Inject current scene state so the AI knows what's already placed and where
        if scene_context:
            props = scene_context.get("props", [])
            camera = scene_context.get("camera", {})
            scene_lines = ["NÅVÆRENDE SCENE-TILSTAND (oppdatert):"]
            scene_lines.append(f"Kamera: posisjon={camera.get('position', 'ukjent')}")
            if props:
                scene_lines.append(f"Props i scenen ({len(props)} stk):")
                for p in props:
                    pos = p.get("position", [0, 0, 0])
                    size = p.get("size")
                    size_str = f", størrelse=[{size[0]:.2f}m × {size[1]:.2f}m × {size[2]:.2f}m]" if size else ""
                    scene_lines.append(
                        f"  • id={p.get('id')} navn=\"{p.get('name', p.get('assetId', 'ukjent'))}\" "
                        f"pos=[{pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f}]{size_str}"
                    )
            else:
                scene_lines.append("Ingen props i scenen ennå.")
            scene_context_text = "\n".join(scene_lines)
            chat_messages.append({
                "role": "system",
                "content": scene_context_text,
            })

        chat_messages += list(messages)

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
        tool_calls_made: List[str] = []

        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: _get_client().chat.completions.create(
                    model="gpt-4o",
                    messages=chat_messages,
                    tools=DIRECTOR_TOOLS,
                    tool_choice="auto",
                    max_tokens=1500,
                ),
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
                tool_calls_made.append(fn_name)

                yield "data: " + json.dumps({"type": "step", "text": step_label}) + "\n\n"
                await asyncio.sleep(0)

                events = _tool_call_to_events(fn_name, args)
                all_events.extend(events)

                if events:
                    yield "data: " + json.dumps({"type": "events", "events": events}) + "\n\n"
                    await asyncio.sleep(0)

            if not reply_text and tool_calls:
                tool_names_no = {
                    "apply_scenario_preset": "lysoppsett",
                    "set_outdoor_sun": "sol",
                    "set_fog": "tåke",
                    "apply_lut": "fargegradering",
                    "set_camera": "kamera",
                    "set_camera_fov": "kamera-vinkel",
                    "add_prop": "prop",
                    "load_character": "karakter",
                    "clear_characters": "rydding",
                    "set_light_property": "lysjustering",
                }
                done_items = [tool_names_no.get(n, n) for n in tool_calls_made]
                reply_text = f"Ferdig! Jeg har satt opp: {', '.join(done_items)}."

            yield "data: " + json.dumps({"type": "reply", "text": reply_text}) + "\n\n"

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
