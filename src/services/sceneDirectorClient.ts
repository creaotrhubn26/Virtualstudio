/**
 * Scene Director client.
 *
 * The backend orchestrator that turns a parsed script beat into a full
 * "scene blueprint" — environment + physically grounded lighting (Profoto-
 * / Godox-style gear with concrete modifiers) + camera (lens + aperture +
 * camera height/distance in meters) + shot framing + character casting.
 *
 * Paired with backend/scene_director_service.py and
 * backend/routes/scene_director.py.
 *
 * Usage:
 *   import { directFromBeat } from '@/services/sceneDirectorClient';
 *
 *   const assembly = await directFromBeat({
 *     location: 'Cozy café',
 *     intExt: 'INT',
 *     timeOfDay: 'DAY',
 *     characters: ['Anna'],
 *     action: 'Anna sits alone at a window table, stirring her coffee.',
 *   });
 *
 *   applyAssemblyToScene(scene, assembly); // TODO — see notes below
 *
 * How to wire the assembly into the Babylon.js scene (separate integration
 * step, not done here because it depends on the scene-graph helpers you
 * already have in src/main.ts and src/services/environmentScenegraphAssembly.ts):
 *
 *   1. Apply environment:
 *        const envResult = assembleEnvironmentScenegraph(assembly.environmentPlan);
 *        environmentService.applyPreset(assembly.environmentPlan.preset.id);
 *
 *   2. Apply lighting — for each source in assembly.lighting.sources, place
 *      a Babylon light at (azimuthDeg, elevationDeg, distanceM) relative to
 *      the scene's "subject" anchor. Use colorTempKelvin + intensity.
 *
 *   3. Apply camera — position the camera at cameraDistanceM in front of
 *      the subject, at cameraHeightM. Set lens focal length (fov derived
 *      from focalLengthMm + sensor) and DOF aperture.
 *
 *   4. Place characters — each CharacterCast has a suggestedPlacement
 *      ("at-window", "seated-center", etc.). For v1 use placeholder avatars;
 *      queue real generation if needsGeneration is true.
 */

export type IntExt = 'INT' | 'EXT';
export type TimeOfDay = 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'MAGIC HOUR';
export type Language = 'no' | 'en';

export interface BeatInput {
  location: string;
  intExt?: IntExt;
  timeOfDay?: TimeOfDay | string;
  characters?: string[];
  action?: string;
  dialogue?: string;
  mood?: string;
  sceneNumber?: string;
  language?: Language;
}

export interface ShotPlan {
  type: 'close-up' | 'medium' | 'wide' | 'ots' | 'two-shot' | 'establishing';
  angle: 'eye-level' | 'low' | 'high' | 'dutch' | 'pov';
  framing: 'headshot' | 'thirds' | 'center' | 'golden';
  focalLengthMm: number;
  apertureF: number;
  depthOfField: 'deep' | 'normal' | 'shallow' | 'very-shallow';
  cameraHeightM: number;
  cameraDistanceM: number;
  movement:
    | 'static'
    | 'pan'
    | 'tilt'
    | 'dolly-in'
    | 'dolly-out'
    | 'tracking'
    | 'handheld';
  sensor: 'full-frame' | 'super-35' | 'apsc';
  rationale: string;
}

export type LightRole = 'key' | 'fill' | 'rim' | 'hair' | 'background' | 'practical';

export interface LightSource {
  role: LightRole;
  fixture: string;        // Matches IDs in src/data/lightFixtures.ts
  modifier: string;       // "octabox-120", "stripbox-30x120", "beauty-dish-42" …
  powerWs: number | null; // Flash Ws, null for continuous / practicals
  colorTempKelvin: number;
  azimuthDeg: number;     // 0 = front, 90 = camera right, 180 = behind
  elevationDeg: number;   // +above subject, −below
  distanceM: number;
  intensity: number;      // 0.0–1.0 relative
}

export type LightingPattern =
  | 'rembrandt'
  | 'loop'
  | 'split'
  | 'butterfly'
  | 'clamshell'
  | 'broad'
  | 'short'
  | 'rim-only'
  | 'ambient';

export interface LightingPlan {
  pattern: LightingPattern;
  presetId: string;
  hdri: string | null;
  ambientIntensity: number;
  colorTempKelvin: number;
  keyToFillRatio: string; // "8:1", "4:1", "2:1", "1:1"
  moodNotes: string;
  sources: LightSource[];
}

export interface CharacterCast {
  name: string;
  description: string | null;
  avatarRef: string | null;
  needsGeneration: boolean;
  suggestedPlacement: string | null;
}

export interface SceneAssembly {
  sceneId: string;
  sourceBeat: Record<string, unknown>;
  environmentPlan: Record<string, unknown>;
  environmentPromptUsed: string;
  shot: ShotPlan;
  lighting: LightingPlan;
  characters: CharacterCast[];
  storyboardPrompt: string;
  directorNotes: string[];
}

export interface DirectorStatus {
  available: boolean;
  llmEnrichmentEnabled: boolean;
  openaiBaseUrl: string | null;
}

const API_BASE = '/api/scene-director';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Scene Director ${response.status}: ${detail}`);
  }
  return (await response.json()) as T;
}

/**
 * Orchestrate one parsed beat into a full scene blueprint.
 * Safe to call without any LLM keys configured — the backend falls back
 * to pure rule-based decisions.
 */
export async function directFromBeat(beat: BeatInput): Promise<SceneAssembly> {
  const payload: BeatInput = {
    intExt: 'INT',
    timeOfDay: 'DAY',
    characters: [],
    action: '',
    dialogue: '',
    language: 'no',
    ...beat,
  };
  const result = await postJson<{ success: boolean; assembly: SceneAssembly }>(
    '/from-beat',
    payload,
  );
  return result.assembly;
}

/**
 * Orchestrate a whole script (array of parsed beats) into an array of
 * scene blueprints. Returns any per-beat errors separately — partial
 * success is still returned.
 */
export async function directFromScript(beats: BeatInput[]): Promise<{
  assemblies: SceneAssembly[];
  errors: Array<{ index: number; error: string }>;
  beatCount: number;
}> {
  const payload = {
    beats: beats.map((beat) => ({
      intExt: 'INT',
      timeOfDay: 'DAY',
      characters: [],
      action: '',
      dialogue: '',
      language: 'no',
      ...beat,
    })),
  };
  return postJson<{
    success: boolean;
    assemblies: SceneAssembly[];
    errors: Array<{ index: number; error: string }>;
    beatCount: number;
  }>('/from-script', payload);
}

/**
 * Check if Scene Director is available and whether LLM enrichment is
 * enabled on the backend.
 */
export async function getDirectorStatus(): Promise<DirectorStatus> {
  const response = await fetch(`${API_BASE}/status`);
  if (!response.ok) {
    throw new Error(`Scene Director status ${response.status}`);
  }
  return (await response.json()) as DirectorStatus;
}

// ---------------------------------------------------------------------------
// Helpers for turning assembly data into Babylon.js coordinates.
// Not a full integration — that lives in src/main.ts / virtualStudio. These
// are the math primitives the integration will need.
// ---------------------------------------------------------------------------

/**
 * Convert (azimuthDeg, elevationDeg, distanceM) from the director's
 * subject-relative frame into an XYZ offset.
 *
 * Frame:
 *   - Subject is at origin, facing +Z (toward the camera).
 *   - azimuth: 0° = camera side (+Z), 90° = camera-right (+X), 180° = behind (−Z).
 *   - elevation: 0° = subject eye height, positive = above, negative = below.
 *
 * Returns meters. The caller adds the subject's world position to get
 * the final light/camera world position.
 */
export function sphericalToCartesian(
  azimuthDeg: number,
  elevationDeg: number,
  distanceM: number,
): { x: number; y: number; z: number } {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const horizontal = Math.cos(el) * distanceM;
  return {
    x: horizontal * Math.sin(az),
    y: Math.sin(el) * distanceM,
    z: horizontal * Math.cos(az),
  };
}

/**
 * Full-frame FOV from a focal length in millimetres.
 * Babylon uses radians for perspective cameras.
 */
export function focalLengthToFovRadians(
  focalLengthMm: number,
  sensor: 'full-frame' | 'super-35' | 'apsc' = 'full-frame',
): number {
  const sensorHeightMm = sensor === 'full-frame' ? 24 : sensor === 'super-35' ? 13.86 : 15.6;
  return 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm));
}
