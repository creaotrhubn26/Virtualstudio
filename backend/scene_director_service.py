"""
Scene Director — turns a parsed script beat into a complete scene blueprint.

Hybrid filmmaker + photographer model, inspired by set.a.light 3D's physically
accurate photography-studio approach combined with cinematic shot grammar.

Takes one beat ({location, int/ext, time, characters, action, mood, dialogue})
and returns a ``SceneAssembly`` — environment plan + physically grounded
lighting (pattern, modifiers, key/fill/rim specs, color temp) + camera
(lens, aperture, height in meters, movement) + shot framing + character
casting + storyboard prompt.

Inside it combines:
  - Photography lighting patterns: Rembrandt / loop / split / butterfly /
    clamshell / broad / short, each with concrete modifier gear (octabox,
    stripbox, snoot, beauty dish, gobo, scrim).
  - Cinematic shot grammar ("INT + NIGHT + intimate → tight OTS, 85 mm f/1.4,
    warm 3200 K, hard key, deep shadows").
  - Environment prompt enrichment that's mood-aware.
  - A call into the existing environment_planner_service for the scenegraph
    plan (the frontend already knows how to apply this).

The frontend POSTs one beat to /api/scene-director/from-beat and gets back
everything it needs to build the Babylon.js scene.

Design goals:
  1. Works without any LLM key (pure rules) — returns a sensible scene.
  2. If OpenAI / Gemini available, uses them for prompt enrichment only,
     not for decisions — so we stay fast and predictable.
  3. Serializable via Pydantic to camelCase JSON for the TS client.
  4. Lighting decisions reference real-world gear the frontend already
     models in src/data/lightFixtures.ts (Profoto, Godox, ARRI…) so the
     applied scene matches what a photographer would build on set.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Literal, Optional

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data contracts
# ---------------------------------------------------------------------------


@dataclass
class ParsedBeat:
    """Input: one parsed beat from the script, enriched enough to direct.

    The frontend script analyzer already emits most of these fields; the
    director fills in defaults for anything missing.
    """

    location: str                       # "Cozy café", "Dovre fjell"
    int_ext: Literal["INT", "EXT"] = "INT"
    time_of_day: str = "DAY"            # "DAY" | "NIGHT" | "DUSK" | "DAWN" | "MAGIC HOUR"
    characters: List[str] = field(default_factory=list)
    action: str = ""                    # The action-line text
    dialogue: str = ""                  # Optional dialogue text (for tone hints)
    mood: Optional[str] = None          # "tense", "romantic", "horror"… free-form
    scene_number: Optional[str] = None
    language: str = "no"                # "no" | "en"
    # Optional reference image (base64 data-URL or bare b64). When present
    # Claude Vision describes its lighting/mood/composition and the director
    # uses that description to bias decisions toward the reference.
    reference_image_base64: Optional[str] = None


@dataclass
class ShotPlan:
    type: str                           # "close-up" | "medium" | "wide" | "ots" | "two-shot" | "establishing"
    angle: str                          # "eye-level" | "low" | "high" | "dutch" | "pov"
    framing: str                        # "headshot" | "thirds" | "center" | "golden"
    focal_length_mm: int                # 24, 35, 50, 85, 135
    aperture_f: float                   # f/1.4, f/2.8, f/5.6, f/8 — drives DOF
    depth_of_field: str                 # "deep" | "normal" | "shallow" | "very-shallow"
    camera_height_m: float              # Subject-relative in meters (1.65 = eye for ~180cm actor)
    camera_distance_m: float            # Front-of-subject distance in meters
    movement: str                       # "static" | "pan" | "tilt" | "dolly-in" | "dolly-out" | "tracking" | "handheld"
    sensor: str = "full-frame"          # "full-frame" | "super-35" | "apsc"
    rationale: str = ""                 # Human-readable why


@dataclass
class LightSource:
    """One concrete light on set — modelled after set.a.light 3D gear."""
    role: str                           # "key" | "fill" | "rim" | "hair" | "background" | "practical"
    fixture: str                        # Real gear ID (matches src/data/lightFixtures.ts)
    modifier: str                       # "octabox-120", "stripbox-30x120", "beauty-dish-42",
                                        #   "snoot", "grid-20deg", "bare-bulb", "gobo-window"
    power_ws: Optional[int]             # Flash: Ws. Continuous: watts or None.
    color_temp_kelvin: int
    azimuth_deg: int                    # Horizontal from subject: 0=front, 90=camera-right, 180=back
    elevation_deg: int                  # Vertical: positive=above, negative=below subject
    distance_m: float                   # From subject
    intensity: float                    # 0.0–1.0 relative


@dataclass
class LightingPlan:
    pattern: str                        # "rembrandt" | "loop" | "split" | "butterfly" |
                                        #   "clamshell" | "broad" | "short" | "rim-only" | "ambient"
    preset_id: str                      # Backend identifier (e.g. "noir-rembrandt-3200")
    hdri: Optional[str]                 # HDRI id hint (applies mostly EXT)
    ambient_intensity: float            # 0.0 (dark) .. 1.0 (flat)
    sources: List[LightSource]          # Concrete lights on set
    color_temp_kelvin: int              # Dominant key temp
    key_to_fill_ratio: str              # "8:1" | "4:1" | "2:1" | "1:1"  (higher = more contrasty)
    mood_notes: str


@dataclass
class CharacterCast:
    name: str
    description: Optional[str]          # "Grizzled 50-year-old detective"
    avatar_ref: Optional[str]           # Known avatar ID if already generated
    needs_generation: bool              # True if no avatar yet
    suggested_placement: Optional[str]  # "at window", "center", "seated"


@dataclass
class ReferenceAnalysis:
    """Claude Vision's read of a user-provided reference image."""
    mood: str
    lighting_pattern: str               # As close as possible to our vocab
    key_light_description: str
    color_palette: str
    composition: str
    time_of_day_guess: str
    raw_caption: str                    # Freeform human-readable summary


@dataclass
class SceneAssembly:
    scene_id: str
    source_beat: Dict[str, Any]
    environment_plan: Dict[str, Any]    # From EnvironmentPlannerService
    environment_prompt_used: str
    shot: ShotPlan
    lighting: LightingPlan
    characters: List[CharacterCast]
    storyboard_prompt: str              # For optional gpt-image-1 pass
    director_notes: List[str]           # Audit trail of decisions
    reference_analysis: Optional[ReferenceAnalysis] = None


# ---------------------------------------------------------------------------
# Rule tables (filmmaker knowledge embedded)
# ---------------------------------------------------------------------------

_DIALOGUE_TRIGGERS = [
    "says", "asks", "whispers", "shouts", "replies", "mutters",
    "sier", "hvisker", "roper", "spør",
]
_INTIMATE_TRIGGERS = [
    "kiss", "whisper", "close", "touches", "tender", "cries",
    "hvisker", "kysser", "gråter", "nær",
]
_ACTION_TRIGGERS = [
    "runs", "jumps", "shoots", "fights", "explodes", "crashes", "chases",
    "løper", "hopper", "skyter", "eksploderer",
]
_ESTABLISHING_TRIGGERS = [
    "arrives", "sees for the first time", "enters the", "stands before",
    "ankommer", "trer inn", "ser for første gang",
]

_MOOD_KEYWORDS = {
    "tense": ["tense", "nervous", "threat", "stalk", "dark", "whisper",
              "anspent", "nervøs", "trussel"],
    "romantic": ["romantic", "tender", "kiss", "intimate", "golden",
                 "romantisk", "kjærlig", "intim"],
    "horror": ["horror", "scream", "blood", "monster", "dread",
               "skrekk", "blod", "skrekken"],
    "comedic": ["laugh", "joke", "funny", "absurd",
                "ler", "vits", "morsom"],
    "melancholy": ["sad", "alone", "quiet", "rain", "mourning",
                   "trist", "alene", "stille", "regn"],
    "grand": ["epic", "vast", "mountain", "ocean", "sky", "battle",
              "episk", "enorm", "fjell", "hav"],
    "cozy": ["cozy", "warm", "café", "kitchen", "fireplace",
             "koselig", "varmt", "kafé", "peis"],
}

# Location keyword → enrichment prefix for the environment prompt
_LOCATION_HINTS = {
    "café": "A warm, inviting café interior with wooden tables, soft pendant lights",
    "cafe": "A warm, inviting café interior with wooden tables, soft pendant lights",
    "kafé": "En varm, innbydende kafé med tre-bord og myke pendel-lamper",
    "office": "A modern office interior with a large desk, city view through tall windows",
    "kontor": "Et moderne kontor med stort skrivebord, byutsikt gjennom høye vinduer",
    "kitchen": "A homey kitchen with an island counter, warm overhead lights",
    "kjøkken": "Et hjemlig kjøkken med kjøkkenøy og varm overhengslys",
    "bedroom": "A quiet bedroom with soft natural light, minimalist decor",
    "soverom": "Et stille soverom med mykt naturlys, minimalistisk innredning",
    "forest": "A dense forest with dappled light filtering through tall trees",
    "skog": "En tett skog med lys som filtreres gjennom høye trær",
    "mountain": "A vast mountain landscape with dramatic rocky terrain",
    "fjell": "Et stort fjelllandskap med dramatisk steinete terreng",
    "street": "An urban street scene with tall buildings and wet asphalt",
    "gate": "En urban gate-scene med høye bygninger og våt asfalt",
    "warehouse": "A cavernous warehouse interior with metal beams and scattered crates",
    "lager": "Et stort lager-interiør med metallbjelker og spredte kasser",
    "tunnel": "A claustrophobic tunnel with concrete walls and scattered utility lights",
    "tunnel": "En klaustrofobisk tunnel med betongvegger og spredte arbeidslys",
    "restaurant": "An elegant restaurant with warm ambient light and set tables",
    "church": "A cathedral interior with tall stained-glass windows casting colored light",
    "kirke": "Et katedral-interiør med høye glassmalerier som kaster farget lys",
}

# time_of_day → ambient lighting bias
_TIME_LIGHTING = {
    "DAY":          dict(color_temp=5600, hdri="daylight-soft", ambient=0.6, practical="window-sun"),
    "DAWN":         dict(color_temp=4200, hdri="dawn-golden", ambient=0.4, practical="window-warm"),
    "DUSK":         dict(color_temp=3400, hdri="dusk-magic",  ambient=0.3, practical="window-orange"),
    "MAGIC HOUR":   dict(color_temp=3200, hdri="golden-hour", ambient=0.35, practical="warm-flare"),
    "NIGHT":        dict(color_temp=3200, hdri="moonlight",   ambient=0.2, practical="practicals-warm"),
}

# Mood → photography lighting pattern + concrete set.a.light-style gear choices.
# Each mood maps to a classic lighting pattern, a key modifier (hard vs soft),
# a key-to-fill ratio (contrast), and whether rim/hair light fires.
_MOOD_LIGHTING_OVERRIDES: Dict[str, Dict[str, Any]] = {
    "tense": dict(
        pattern="split",              # Half the face in shadow
        preset_id="noir-split-hard",
        key_modifier="beauty-dish-42", key_intensity=1.0,
        fill_ratio="8:1", ambient=0.10,
        rim=True, rim_modifier="stripbox-30x120", rim_intensity=0.6,
        hair=False, key_temp=3200,
    ),
    "romantic": dict(
        pattern="clamshell",          # Soft from above + fill from below
        preset_id="romantic-clamshell-soft",
        key_modifier="octabox-120",   key_intensity=0.9,
        fill_ratio="2:1", ambient=0.45,
        rim=True, rim_modifier="stripbox-30x120", rim_intensity=0.7,
        hair=True, key_temp=3400,
    ),
    "horror": dict(
        pattern="rim-only",           # Ambiguity — face barely readable
        preset_id="horror-underlit-cold",
        key_modifier="snoot",         key_intensity=0.8,
        fill_ratio="16:1", ambient=0.05,
        rim=True, rim_modifier="grid-20deg", rim_intensity=0.9,
        hair=False, key_temp=5600,    # Cold blue
    ),
    "comedic": dict(
        pattern="butterfly",          # Flat, flattering
        preset_id="bright-butterfly-flat",
        key_modifier="octabox-180",   key_intensity=1.0,
        fill_ratio="1.5:1", ambient=0.70,
        rim=False, rim_modifier=None, rim_intensity=0.0,
        hair=True, key_temp=5600,
    ),
    "melancholy": dict(
        pattern="loop",               # Subtle asymmetry
        preset_id="overcast-loop-muted",
        key_modifier="scrim-large",   key_intensity=0.7,
        fill_ratio="3:1", ambient=0.55,
        rim=False, rim_modifier=None, rim_intensity=0.0,
        hair=False, key_temp=5200,    # Slightly cool overcast
    ),
    "grand": dict(
        pattern="broad",              # Wide face wash for heroic reveal
        preset_id="epic-landscape-broad",
        key_modifier="par64-open",    key_intensity=1.0,
        fill_ratio="4:1", ambient=0.40,
        rim=True, rim_modifier="stripbox-60x180", rim_intensity=0.8,
        hair=True, key_temp=4200,
    ),
    "cozy": dict(
        pattern="rembrandt",          # Classic warm — small triangle under eye
        preset_id="warm-rembrandt-practical",
        key_modifier="octabox-90",    key_intensity=0.85,
        fill_ratio="3:1", ambient=0.60,
        rim=False, rim_modifier=None, rim_intensity=0.0,
        hair=False, key_temp=3200,    # Tungsten warmth
    ),
}


# ---------------------------------------------------------------------------
# The service
# ---------------------------------------------------------------------------


class SceneDirectorService:
    """Stateless orchestrator. Construct once at startup, call .direct_beat()."""

    def __init__(self) -> None:
        # Claude is the primary AI bootstrap. Rule-based fallbacks stay in
        # place so the service works without any key, but with Claude the
        # mood inference and environment prompt are vastly richer.
        try:
            from claude_client import get_claude_client  # noqa: WPS433
            self._claude = get_claude_client()
        except Exception as exc:
            log.warning("Claude client unavailable: %s", exc)
            self._claude = None
        self.llm_enabled = bool(self._claude and self._claude.enabled)
        if self.llm_enabled:
            log.info("SceneDirector: Claude enrichment ENABLED")
        else:
            log.info(
                "SceneDirector: Claude disabled — running in pure rule mode "
                "(set ANTHROPIC_API_KEY to enable vision + smart prompting)"
            )

    # -- public --------------------------------------------------------------

    async def direct_beat(
        self,
        beat: ParsedBeat,
        *,
        environment_planner=None,
    ) -> SceneAssembly:
        """Return a complete SceneAssembly for one parsed beat.

        ``environment_planner`` is the existing EnvironmentPlannerService
        instance. If not provided we try to import it lazily; if that fails
        we return a fallback plan (rules-only).

        When Claude is available:
          1. If a reference image was provided, Claude Vision reads it.
          2. Mood inference is done by Claude with broader understanding.
          3. Environment prompt is enriched from sparse input.
          4. Director's rationale is upgraded to a crafted filmmaker note.
        """
        notes: List[str] = []

        # 0) Optional: analyze reference image via Claude Vision
        reference_analysis: Optional[ReferenceAnalysis] = None
        if beat.reference_image_base64 and self.llm_enabled:
            try:
                reference_analysis = self._analyze_reference_image(beat)
                notes.append(
                    f"reference: {reference_analysis.mood} / "
                    f"{reference_analysis.lighting_pattern}"
                )
            except Exception as exc:
                log.warning("Reference-image analysis failed: %s", exc)
                notes.append(f"reference-failed: {exc}")

        # 1) Detect mood
        if beat.mood:
            mood = beat.mood
            notes.append(f"mood={mood!r} (user-provided)")
        elif reference_analysis and reference_analysis.mood in _MOOD_KEYWORDS:
            mood = reference_analysis.mood
            notes.append(f"mood={mood!r} (from reference image)")
        elif self.llm_enabled:
            mood = self._infer_mood_with_claude(beat) or self._infer_mood(beat)
            notes.append(f"mood={mood!r} (claude)")
        else:
            mood = self._infer_mood(beat)
            notes.append(f"mood={mood!r} (rule-based)")

        # 2) Build environment prompt — Claude enrichment if available
        if self.llm_enabled:
            try:
                env_prompt = self._enrich_environment_prompt_with_claude(
                    beat, mood, reference_analysis
                )
                notes.append("env_prompt=claude-enriched")
            except Exception as exc:
                log.warning("Claude env-prompt enrichment failed: %s", exc)
                env_prompt = self._build_environment_prompt(beat, mood)
                notes.append("env_prompt=rule-based-fallback")
        else:
            env_prompt = self._build_environment_prompt(beat, mood)
            notes.append(f"env_prompt={env_prompt[:80]!r}")

        # 3) Call environment planner (or fallback)
        environment_plan = await self._call_planner(
            env_prompt, beat, environment_planner
        )

        # 4) Classify shot from action
        shot = self._classify_shot(beat)
        notes.append(f"shot={shot.type} {shot.framing} {shot.focal_length_mm}mm")

        # 5) Decide lighting — reference image biases the pattern if strong match
        lighting = self._decide_lighting(beat, mood)
        if reference_analysis:
            ref_pattern = reference_analysis.lighting_pattern
            if ref_pattern in self._PATTERN_GEOMETRY:
                # Override the mood-based pattern if reference is definitive
                lighting.pattern = ref_pattern
                lighting.mood_notes += f" + refpattern:{ref_pattern}"
                notes.append(f"lighting pattern overridden by reference: {ref_pattern}")
        notes.append(
            f"lighting preset={lighting.preset_id} temp={lighting.color_temp_kelvin}K"
        )

        # 6) Cast characters (v1: placeholder refs; real generation is follow-up)
        characters = [self._cast_character(name, beat) for name in beat.characters]
        notes.append(f"cast={len(characters)}")

        # 7) Build storyboard prompt
        storyboard_prompt = self._build_storyboard_prompt(beat, shot, lighting, mood)

        return SceneAssembly(
            scene_id=f"scene-{uuid.uuid4().hex[:10]}",
            source_beat=asdict(beat),
            environment_plan=environment_plan,
            environment_prompt_used=env_prompt,
            shot=shot,
            lighting=lighting,
            characters=characters,
            storyboard_prompt=storyboard_prompt,
            director_notes=notes,
            reference_analysis=reference_analysis,
        )

    # -- Claude-enriched decisions -----------------------------------------

    _CLAUDE_DIRECTOR_SYSTEM = (
        "You are a film director + cinematographer + photographer rolled into one, "
        "hired as an assistant for Virtual Studio. Your job is to take a short "
        "script beat and reason about how a skilled DP (think Deakins, Doyle, "
        "Lachman) would shoot it. Be concise and decisive. When you answer the "
        "'mood' question, your label MUST be one of: tense, romantic, horror, "
        "comedic, melancholy, grand, cozy."
    )

    def _infer_mood_with_claude(self, beat: ParsedBeat) -> Optional[str]:
        """Ask Claude for a mood label. Falls back to keyword scoring if it
        misbehaves. Uses structured output so the result is guaranteed to be
        one of our seven mood tokens."""
        if not self._claude:
            return None
        schema = {
            "type": "object",
            "properties": {
                "mood": {
                    "type": "string",
                    "enum": list(_MOOD_KEYWORDS.keys()),
                },
                "rationale": {"type": "string"},
            },
            "required": ["mood"],
        }
        user = (
            f"Scene beat — pick the single best mood label.\n\n"
            f"- Location: {beat.location}\n"
            f"- INT/EXT: {beat.int_ext}\n"
            f"- Time of day: {beat.time_of_day}\n"
            f"- Characters: {', '.join(beat.characters) or '—'}\n"
            f"- Action: {beat.action or '—'}\n"
            f"- Dialogue: {beat.dialogue or '—'}\n"
        )
        try:
            result = self._claude.complete_json(
                system=self._CLAUDE_DIRECTOR_SYSTEM,
                user=user,
                schema=schema,
                tool_name="pick_scene_mood",
                tool_description="Return the best mood label for this beat.",
                max_tokens=300,
            )
            return result.get("mood")
        except Exception as exc:
            log.warning("Claude mood call failed: %s", exc)
            return None

    def _enrich_environment_prompt_with_claude(
        self,
        beat: ParsedBeat,
        mood: str,
        reference: Optional["ReferenceAnalysis"],
    ) -> str:
        """Ask Claude to write a rich visual prompt for the environment
        planner. Takes sparse input ('Cozy café') and returns a dense
        paragraph the planner can use to populate surfaces, props, and light
        sources."""
        if not self._claude:
            return self._build_environment_prompt(beat, mood)

        ref_hint = ""
        if reference:
            ref_hint = (
                f"\n\nReference image analysis for style bias:\n"
                f"- Mood: {reference.mood}\n"
                f"- Lighting: {reference.lighting_pattern} ({reference.key_light_description})\n"
                f"- Palette: {reference.color_palette}\n"
                f"- Composition: {reference.composition}\n"
                f"- Time of day guess: {reference.time_of_day_guess}\n"
            )

        user = (
            "Write ONE dense visual prompt (2–4 sentences) describing the "
            "environment we should build for this beat. Focus on surfaces, "
            "furniture, light sources, time of day, and mood. No camera talk. "
            "Plain prose, no bullet points.\n\n"
            f"- Location: {beat.location}\n"
            f"- INT/EXT: {beat.int_ext}\n"
            f"- Time of day: {beat.time_of_day}\n"
            f"- Mood: {mood}\n"
            f"- Action: {beat.action or '—'}\n"
            f"- Characters: {', '.join(beat.characters) or '—'}"
            f"{ref_hint}"
        )
        try:
            text = self._claude.complete(
                system=self._CLAUDE_DIRECTOR_SYSTEM,
                user=user,
                max_tokens=400,
            )
            return text or self._build_environment_prompt(beat, mood)
        except Exception as exc:
            log.warning("Claude env-prompt call failed: %s", exc)
            return self._build_environment_prompt(beat, mood)

    # -- Claude Vision: reference image analysis ---------------------------

    _VISION_SCHEMA = {
        "type": "object",
        "properties": {
            "mood":         {"type": "string", "enum": list(_MOOD_KEYWORDS.keys())},
            "lightingPattern": {
                "type": "string",
                "enum": list(["rembrandt", "loop", "split", "butterfly",
                              "clamshell", "broad", "short", "rim-only", "ambient"]),
            },
            "keyLightDescription": {"type": "string"},
            "colorPalette":  {"type": "string"},
            "composition":   {"type": "string"},
            "timeOfDayGuess": {"type": "string"},
            "rawCaption":    {"type": "string"},
        },
        "required": [
            "mood", "lightingPattern", "keyLightDescription",
            "colorPalette", "composition", "timeOfDayGuess", "rawCaption",
        ],
    }

    def _analyze_reference_image(self, beat: ParsedBeat) -> ReferenceAnalysis:
        """Claude Vision reads a reference image and returns a structured
        analysis of its lighting/mood/composition."""
        if not self._claude or not beat.reference_image_base64:
            raise RuntimeError("Reference image analysis requires Claude + image")

        data = self._claude.analyze_image_structured(
            image_base64=beat.reference_image_base64,
            system=(
                self._CLAUDE_DIRECTOR_SYSTEM
                + " For reference images, identify the photography lighting "
                "pattern (Rembrandt, loop, split, butterfly, clamshell, broad, "
                "short, rim-only, or ambient) that a studio photographer "
                "would use to reproduce this look."
            ),
            user_prompt=(
                "Analyze this reference image. Return its mood (one of our "
                "seven labels), the classic lighting pattern a photographer "
                "would identify, a short description of the key light, the "
                "dominant color palette, the compositional framing, and a "
                "best-guess time of day. Finally give a one-sentence "
                "human-readable caption that a director would use to brief a DP."
            ),
            schema=self._VISION_SCHEMA,
            tool_name="describe_reference",
            tool_description="Structured visual analysis of the reference image.",
            max_tokens=800,
        )

        return ReferenceAnalysis(
            mood=data["mood"],
            lighting_pattern=data["lightingPattern"],
            key_light_description=data["keyLightDescription"],
            color_palette=data["colorPalette"],
            composition=data["composition"],
            time_of_day_guess=data["timeOfDayGuess"],
            raw_caption=data["rawCaption"],
        )

    # -- mood inference ------------------------------------------------------

    def _infer_mood(self, beat: ParsedBeat) -> str:
        """Score moods from text, weighted so the beat's action/dialogue
        dominate the location descriptor — "a romantic moment in a cozy
        kitchen" should be *romantic*, not *cozy*.
        """
        action_text = f"{beat.action} {beat.dialogue}".lower()
        location_text = beat.location.lower()

        scores: Dict[str, float] = {}
        for mood, keywords in _MOOD_KEYWORDS.items():
            # 3× weight for hits in action/dialogue (where emotion lives),
            # 1× for hits in the location (usually a backdrop).
            action_hits = sum(1 for kw in keywords if kw in action_text)
            location_hits = sum(1 for kw in keywords if kw in location_text)
            scores[mood] = action_hits * 3 + location_hits

        best_mood, best_score = max(scores.items(), key=lambda kv: kv[1])
        if best_score == 0:
            # Use INT/EXT + time as a weak prior
            if beat.int_ext == "INT" and beat.time_of_day == "NIGHT":
                return "tense"
            if beat.int_ext == "EXT" and beat.time_of_day in {"DAWN", "DUSK", "MAGIC HOUR"}:
                return "grand"
            return "cozy" if beat.int_ext == "INT" else "grand"
        return best_mood

    # -- environment --------------------------------------------------------

    def _build_environment_prompt(self, beat: ParsedBeat, mood: str) -> str:
        loc_key = beat.location.lower()
        hint: Optional[str] = None
        for key, phrase in _LOCATION_HINTS.items():
            if key in loc_key:
                hint = phrase
                break

        parts = [
            hint or f"{beat.int_ext} scene at {beat.location}".strip(),
            f"Time of day: {beat.time_of_day.lower()}.",
            f"Mood: {mood}.",
        ]
        if beat.action:
            parts.append(f"Action context: {beat.action.strip()}")
        if beat.characters:
            char_list = ", ".join(beat.characters)
            parts.append(f"Scene features: {char_list}.")

        return " ".join(parts)

    async def _call_planner(
        self,
        prompt: str,
        beat: ParsedBeat,
        planner,
    ) -> Dict[str, Any]:
        """Call EnvironmentPlannerService.generate_plan() if available."""
        if planner is None:
            try:
                from environment_planner_service import EnvironmentPlannerService  # noqa: WPS433
                planner = EnvironmentPlannerService()
            except Exception as exc:
                log.warning("Environment planner unavailable; using fallback plan: %s", exc)
                return self._fallback_plan(prompt, beat)

        try:
            room_constraints = {
                "indoor": beat.int_ext == "INT",
                "timeOfDay": beat.time_of_day.lower(),
            }
            result = await planner.generate_plan(
                prompt=prompt,
                reference_images=[],
                room_constraints=room_constraints,
                prefer_fallback=False,
                preferred_preset_id=None,
                world_model_provider="none",
                world_model_reference=None,
            )
            return result
        except Exception as exc:
            log.warning("Environment planner call failed, returning fallback: %s", exc)
            return self._fallback_plan(prompt, beat)

    def _fallback_plan(self, prompt: str, beat: ParsedBeat) -> Dict[str, Any]:
        """A minimal, hand-crafted plan when the planner isn't available."""
        preset_id = (
            "studio-dark-dramatic"
            if beat.int_ext == "INT" and beat.time_of_day == "NIGHT"
            else "studio-classic-white"
        )
        return {
            "preset": {"id": preset_id, "rationale": "Fallback — planner unavailable"},
            "prompt": prompt,
            "surfaces": [],
            "props": [],
            "enrichments": [],
            "source": "scene_director.fallback",
        }

    # -- shot decision -------------------------------------------------------

    def _classify_shot(self, beat: ParsedBeat) -> ShotPlan:
        """Photography + cinematography hybrid shot selection.

        Rules map dramatic intent → concrete lens + aperture + distance,
        using full-frame equivalents. Distances in meters assume ~1.8 m tall
        human subject; camera_height_m of 1.65 is eye level.
        """
        action = (beat.action or "").lower()
        char_count = len(beat.characters)

        # Intimate — tight on face, separation via shallow DOF
        if any(trig in action for trig in _INTIMATE_TRIGGERS):
            return ShotPlan(
                type="close-up",
                angle="eye-level",
                framing="headshot",
                focal_length_mm=85,
                aperture_f=1.4,
                depth_of_field="very-shallow",
                camera_height_m=1.55,       # Slightly below eye softens
                camera_distance_m=1.2,
                movement="static",
                rationale="Intimate beat — 85 mm f/1.4, razor-thin DOF, slight low eye",
            )

        # Action — kinetic, wide, handheld
        if any(trig in action for trig in _ACTION_TRIGGERS):
            return ShotPlan(
                type="wide",
                angle="low",
                framing="thirds",
                focal_length_mm=24,
                aperture_f=5.6,
                depth_of_field="deep",
                camera_height_m=0.9,
                camera_distance_m=4.0,
                movement="handheld",
                rationale="Action beat — 24 mm f/5.6 deep DOF, low hero angle, handheld energy",
            )

        # Establishing — wide geography, slow push
        if any(trig in action for trig in _ESTABLISHING_TRIGGERS) or (
            char_count == 0 and beat.int_ext == "EXT"
        ):
            return ShotPlan(
                type="establishing",
                angle="high",
                framing="golden",
                focal_length_mm=35,
                aperture_f=8.0,
                depth_of_field="deep",
                camera_height_m=2.5,
                camera_distance_m=8.0,
                movement="dolly-in",
                rationale="Establishing — 35 mm f/8 deep, slightly elevated, slow push-in",
            )

        # Dialogue — classic OTS 50 mm singles
        if char_count >= 2 and any(
            trig in action + beat.dialogue.lower() for trig in _DIALOGUE_TRIGGERS
        ):
            return ShotPlan(
                type="ots",
                angle="eye-level",
                framing="thirds",
                focal_length_mm=50,
                aperture_f=2.0,
                depth_of_field="shallow",
                camera_height_m=1.65,
                camera_distance_m=1.8,
                movement="static",
                rationale="Dialogue — 50 mm f/2 OTS, eye level, shallow for separation",
            )

        # Single character, reflective
        if char_count == 1:
            return ShotPlan(
                type="medium",
                angle="eye-level",
                framing="thirds",
                focal_length_mm=50,
                aperture_f=2.8,
                depth_of_field="normal",
                camera_height_m=1.65,
                camera_distance_m=2.2,
                movement="static",
                rationale="Single character — clean 50 mm f/2.8 medium",
            )

        # Two-shot
        if char_count == 2:
            return ShotPlan(
                type="two-shot",
                angle="eye-level",
                framing="center",
                focal_length_mm=35,
                aperture_f=4.0,
                depth_of_field="normal",
                camera_height_m=1.65,
                camera_distance_m=2.8,
                movement="static",
                rationale="Two-character beat — 35 mm f/4 balanced two-shot",
            )

        # Default — neutral medium wide
        return ShotPlan(
            type="medium",
            angle="eye-level",
            framing="thirds",
            focal_length_mm=35,
            aperture_f=4.0,
            depth_of_field="normal",
            camera_height_m=1.65,
            camera_distance_m=2.5,
            movement="static",
            rationale="Default — 35 mm f/4 neutral medium wide",
        )

    # -- lighting decision --------------------------------------------------

    # Photography lighting patterns — key light position relative to subject.
    # Each pattern defines key azimuth (horizontal angle) and elevation.
    # Inspired by set.a.light 3D's lighting diagrams.
    _PATTERN_GEOMETRY = {
        #                 key azim | key elev | fill azim | fill elev
        "rembrandt":    (   45,         30,         -30,        10   ),
        "loop":         (   30,         25,         -45,        15   ),
        "split":        (   90,         15,         -60,        10   ),
        "butterfly":    (    0,         50,           0,       -20   ),
        "clamshell":    (    0,         45,           0,       -15   ),
        "broad":        (  -30,         30,          45,        10   ),
        "short":        (   60,         25,         -30,        15   ),
        "rim-only":     (  150,         20,         180,         0   ),  # Key almost behind
        "ambient":      (    0,         60,           0,         0   ),  # Flat overhead
    }

    def _decide_lighting(self, beat: ParsedBeat, mood: str) -> LightingPlan:
        base = _TIME_LIGHTING.get(beat.time_of_day.upper(), _TIME_LIGHTING["DAY"])
        override = _MOOD_LIGHTING_OVERRIDES.get(mood, _MOOD_LIGHTING_OVERRIDES["cozy"])
        pattern = override["pattern"]
        key_az, key_el, fill_az, fill_el = self._PATTERN_GEOMETRY.get(
            pattern, self._PATTERN_GEOMETRY["loop"]
        )

        # Dominant temperature: mood override wins unless EXT day (sun wins)
        if beat.int_ext == "EXT" and beat.time_of_day.upper() == "DAY":
            key_temp = base["color_temp"]   # Daylight-matched
        else:
            key_temp = override["key_temp"]

        sources: List[LightSource] = [
            # KEY
            LightSource(
                role="key",
                fixture="profoto-d2-1000",      # Matches src/data/lightFixtures.ts
                modifier=override["key_modifier"],
                power_ws=500,
                color_temp_kelvin=key_temp,
                azimuth_deg=key_az,
                elevation_deg=key_el,
                distance_m=1.8,
                intensity=override["key_intensity"],
            ),
        ]

        # FILL (skip for rim-only / horror — contrast is the point)
        if pattern not in {"rim-only"} and override["fill_ratio"] not in {"16:1"}:
            # Fill intensity derives from the ratio — "8:1" → 0.125, "2:1" → 0.5
            ratio_parts = override["fill_ratio"].split(":")
            try:
                fill_intensity = float(ratio_parts[1]) / float(ratio_parts[0])
            except (ValueError, ZeroDivisionError):
                fill_intensity = 0.35
            sources.append(
                LightSource(
                    role="fill",
                    fixture="godox-ad200pro",
                    modifier="umbrella-white-110" if pattern != "butterfly" else "reflector-silver",
                    power_ws=200,
                    color_temp_kelvin=key_temp,
                    azimuth_deg=fill_az,
                    elevation_deg=fill_el,
                    distance_m=2.4,
                    intensity=round(fill_intensity, 3),
                )
            )

        # RIM
        if override["rim"] and override["rim_modifier"]:
            sources.append(
                LightSource(
                    role="rim",
                    fixture="profoto-b10",
                    modifier=override["rim_modifier"],
                    power_ws=250,
                    # Slightly cooler rim for separation
                    color_temp_kelvin=key_temp + 200,
                    azimuth_deg=160 if pattern != "split" else 200,
                    elevation_deg=35,
                    distance_m=1.6,
                    intensity=override["rim_intensity"],
                )
            )

        # HAIR
        if override["hair"]:
            sources.append(
                LightSource(
                    role="hair",
                    fixture="godox-ad200pro",
                    modifier="snoot",
                    power_ws=100,
                    color_temp_kelvin=key_temp + 400,
                    azimuth_deg=180,
                    elevation_deg=70,      # Boomed overhead
                    distance_m=1.2,
                    intensity=0.5,
                )
            )

        # PRACTICALS (motivated by location)
        loc = beat.location.lower()
        if beat.int_ext == "INT":
            if "kitchen" in loc or "kjøkken" in loc:
                sources.append(LightSource(
                    role="practical", fixture="practical-pendant",
                    modifier="bare-bulb", power_ws=None,
                    color_temp_kelvin=2700, azimuth_deg=0,
                    elevation_deg=80, distance_m=2.0, intensity=0.4,
                ))
            elif "bedroom" in loc or "soverom" in loc:
                sources.append(LightSource(
                    role="practical", fixture="practical-table-lamp",
                    modifier="bare-bulb", power_ws=None,
                    color_temp_kelvin=2700, azimuth_deg=-45,
                    elevation_deg=10, distance_m=1.5, intensity=0.3,
                ))
            elif beat.time_of_day.upper() == "NIGHT":
                sources.append(LightSource(
                    role="practical", fixture="practical-table-lamp",
                    modifier="bare-bulb", power_ws=None,
                    color_temp_kelvin=2700, azimuth_deg=120,
                    elevation_deg=10, distance_m=2.0, intensity=0.35,
                ))
            else:
                sources.append(LightSource(
                    role="practical", fixture="window-daylight",
                    modifier="gobo-window", power_ws=None,
                    color_temp_kelvin=5600, azimuth_deg=90,
                    elevation_deg=20, distance_m=3.0, intensity=0.6,
                ))

        return LightingPlan(
            pattern=pattern,
            preset_id=override["preset_id"],
            hdri=base["hdri"],
            ambient_intensity=override["ambient"],
            sources=sources,
            color_temp_kelvin=key_temp,
            key_to_fill_ratio=override["fill_ratio"],
            mood_notes=f"{mood} + {beat.time_of_day.lower()} + {beat.int_ext} + {pattern}",
        )

    # -- character casting --------------------------------------------------

    def _cast_character(self, name: str, beat: ParsedBeat) -> CharacterCast:
        """v1: return a placeholder reference. Real FLUX+SAM3D gen is a
        follow-up endpoint (/api/characters/generate-from-description)."""
        clean = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-") or "actor"
        placement = None
        action_lower = beat.action.lower()
        if "at window" in action_lower or "ved vinduet" in action_lower:
            placement = "at-window"
        elif "enters" in action_lower or "trer inn" in action_lower:
            placement = "doorway"
        elif "seated" in action_lower or "sitter" in action_lower or "sits" in action_lower:
            placement = "seated-center"
        else:
            placement = "standing-center"

        return CharacterCast(
            name=name,
            description=None,
            avatar_ref=f"placeholder:{clean}",
            needs_generation=True,
            suggested_placement=placement,
        )

    # -- storyboard prompt --------------------------------------------------

    def _build_storyboard_prompt(
        self, beat: ParsedBeat, shot: ShotPlan, lighting: LightingPlan, mood: str
    ) -> str:
        cast = ", ".join(beat.characters) if beat.characters else "the scene"
        has_rim = any(s.role == "rim" for s in lighting.sources)
        has_hair = any(s.role == "hair" for s in lighting.sources)
        key_src = next((s for s in lighting.sources if s.role == "key"), None)
        key_desc = (
            f"{key_src.modifier} at {key_src.azimuth_deg}°"
            if key_src else "soft ambient"
        )
        return (
            f"Storyboard frame: {shot.type} ({shot.framing}), {shot.focal_length_mm}mm "
            f"f/{shot.aperture_f}, {shot.angle}. "
            f"{beat.int_ext} {beat.location}, {beat.time_of_day.lower()}. "
            f"Mood: {mood}. Lighting: {lighting.pattern} pattern, key via {key_desc}, "
            f"ratio {lighting.key_to_fill_ratio}, {lighting.color_temp_kelvin}K, "
            f"rim {'on' if has_rim else 'off'}, hair {'on' if has_hair else 'off'}. "
            f"Subject: {cast}. Action: {beat.action or '—'}."
        )


# ---------------------------------------------------------------------------
# Module-level singleton for routes
# ---------------------------------------------------------------------------

_SINGLETON: Optional[SceneDirectorService] = None


def get_scene_director() -> SceneDirectorService:
    global _SINGLETON
    if _SINGLETON is None:
        _SINGLETON = SceneDirectorService()
    return _SINGLETON
