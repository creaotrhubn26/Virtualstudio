/**
 * Apply a SceneAssembly (from Scene Director) to the live Babylon.js scene.
 *
 * The Scene Director makes director-level decisions in subject-relative
 * spherical coordinates. This module translates those decisions into world-
 * space Babylon transforms and calls the existing VirtualStudio API.
 *
 * Coordinate convention from the director:
 *   Subject sits at origin, facing +Z (i.e. toward the camera).
 *   azimuth 0° = in front of subject, 90° = camera-right, 180° = behind.
 *   elevation 0° = subject eye height (~1.65 m), +up, −down.
 *
 * We place the subject at the current camera target in world space.
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type {
  SceneAssembly,
  LightSource,
  ShotPlan,
  CharacterCast,
} from './sceneDirectorClient';
import {
  sphericalToCartesian,
  focalLengthToFovRadians,
  shotEV100,
  exposureMultiplierFromShot,
} from './sceneDirectorClient';
import { resolveHDRI } from '../data/hdriRegistry';
import { iesForModifier } from '../data/modifierIESMap';
import { kelvinToColor3 } from '../scenes/locationLighting';
import {
  resolveProps as backendResolveProps,
  resolveCast as backendResolveCast,
} from './propResolverClient';
import type { ResolvedProp, ResolvedCharacter } from './propResolverClient';

// Eye height in meters for a ~180cm actor. Scene Director already uses this.
const SUBJECT_EYE_HEIGHT_M = 1.65;

// Modifier → rough light-fixture ID. The VirtualStudio.addLight() API takes
// a model ID from src/data/lightFixtures.ts. For v1 we map every modifier
// to a small set of real fixtures; the POSITION is the director's key
// decision, not the exact lamp. Users can re-skin lights after placement.
const MODIFIER_TO_FIXTURE: Record<string, string> = {
  // Soft key modifiers — octaboxes, softboxes, beauty dish
  'octabox-90': 'profoto-d2-1000',
  'octabox-120': 'profoto-d2-1000',
  'octabox-180': 'profoto-d2-1000',
  'beauty-dish-42': 'profoto-d2-1000',
  'softbox-90': 'profoto-d2-1000',
  // Strip + rim
  'stripbox-30x120': 'profoto-b10',
  'stripbox-60x180': 'profoto-b10',
  // Hard-cut / hair
  snoot: 'godox-ad200pro',
  'grid-20deg': 'godox-ad200pro',
  // Flat fill
  'umbrella-white-110': 'godox-ad200pro',
  'reflector-silver': 'reflector-silver-v-flat',
  'scrim-large': 'scrim-6x6',
  // Hard sunlight / gobo / practicals
  'par64-open': 'arri-m18',
  'gobo-window': 'arri-skypanel-s60',
  'bare-bulb': 'practical-edison',
};

const DEFAULT_FIXTURE = 'profoto-d2-1000';

/**
 * Shape of the VirtualStudio global we need to talk to. Everything is
 * optional so we degrade gracefully if the app boots without the full
 * surface exposed.
 */
interface VirtualStudioAPI {
  addLight?: (modelId: string, position: Vector3Like) => Promise<string>;
  clearAllLights?: () => void;
  setCameraPosition?: (position: Vector3Like) => void;
  setCameraTarget?: (target: Vector3Like) => void;
  setCameraFov?: (fov: number) => void;
  setImageProcessingExposure?: (multiplier: number) => boolean;
  setEnvironmentHDRI?: (url: string, intensity?: number) => boolean;
  applyIESToLightById?: (
    lightId: string,
    iesUrl: string,
    preserveBeamAngle?: boolean,
  ) => Promise<string | null>;
  applyShotDepthOfField?: (opts: {
    apertureF: number;
    focalLengthMm: number;
    sensor: 'full-frame' | 'super-35' | 'apsc';
    focusDistanceM: number;
    depthHint: 'deep' | 'normal' | 'shallow' | 'very-shallow';
  }) => {
    enabled: boolean;
    fStop: number;
    focalLength: number;
    focusDistanceM: number;
    sensorWidthMm: number;
  } | null;
  loadAvatarModel?: (
    glbUrl: string,
    metadata?: { name?: string; category?: string },
  ) => Promise<void>;
  scene?: {
    clearColor?: { r: number; g: number; b: number; a?: number };
    ambientColor?: { r: number; g: number; b: number };
    fogMode?: number;
    fogColor?: { r: number; g: number; b: number };
    fogDensity?: number;
    environmentIntensity?: number;
  };
}

interface EnvironmentServiceAPI {
  applyPreset?: (presetId: string) => void;
}

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

function makeVector3(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z);
}

function getStudio(): VirtualStudioAPI | null {
  const studio = (globalThis as { virtualStudio?: VirtualStudioAPI }).virtualStudio;
  return studio ?? null;
}

export interface ApplyOptions {
  /**
   * Subject world position. Defaults to (0, 1.65, 0) = eye-height at origin.
   */
  subject?: Vector3Like;
  /**
   * Skip applying lights (useful when you only want the camera move).
   */
  skipLights?: boolean;
  /**
   * Skip applying camera (useful when the user wants to keep their framing).
   */
  skipCamera?: boolean;
  /**
   * Skip applying the environment preset (walls/floor/atmosphere). Default
   * false — the director's preset drives the room look for realism.
   */
  skipEnvironment?: boolean;
  /**
   * Clear any existing scene lights before placing the director's rig.
   * Default true — otherwise legacy scenario-preset lights with unscaled
   * intensities dominate the physically-lit director setup. Pass false to
   * keep existing lights (e.g. to layer on top for A/B compare).
   */
  clearExistingLights?: boolean;
  /**
   * Called for each light that was placed, so the caller can hook into
   * studio state (store the light IDs for later removal, etc.).
   */
  onLightPlaced?: (source: LightSource, lightId: string) => void;
  /**
   * Skip the prop-resolver pass. Useful for quick tests / when the user
   * only wants lights+camera+env changed and doesn't want to wait on
   * potential Meshy generations (60–180s) or spend credits.
   */
  skipProps?: boolean;
  /**
   * Meshy text-to-3D timeout for cache-miss props. Lower (e.g. 30) to
   * fail fast — any prop that would need a fresh Meshy generation gets
   * returned as failed instead of blocking the assembly for minutes.
   */
  propMeshyTimeoutSec?: number;
  /**
   * Called once all props have been resolved + dispatched. Lets callers
   * hide a "resolving props…" spinner without awaiting applySceneAssembly
   * itself (the whole thing returns after props finish either way).
   */
  onPropsResolved?: (props: NonNullable<ApplyResult['props']>) => void;
  /**
   * Skip the cast-resolver pass. Characters take ~3 min and ~$0.05 per
   * cache-miss on Meshy's text-to-3d → rigging chain; skip when you
   * only want the scene environment + lighting previewed.
   */
  skipCast?: boolean;
  /**
   * Subject height in meters — fed to Meshy's rigging so the skeleton
   * scale matches actor size. Defaults to 1.78 m (male actor).
   */
  castHeightMeters?: number;
  /**
   * Called once all cast has been resolved + dispatched. UI hook.
   */
  onCastResolved?: (cast: NonNullable<ApplyResult['cast']>) => void;
}

export interface PlacedLight {
  source: LightSource;
  lightId: string;
  position: Vector3Like;
  /**
   * Non-null when the director's modifier mapped to a real IES file and
   * the SpotLight got the measured candela distribution attached.
   * `profile` is the IES's description / filename; use it in audit logs.
   */
  ies: {
    modifier: string;
    iesUrl: string;
    label: string;
    profile: string | null;
    applied: boolean;
  } | null;
}

export interface ApplyResult {
  placedLights: PlacedLight[];
  camera: { position: Vector3Like; target: Vector3Like; fovRad: number } | null;
  environmentPresetApplied: string | null;
  atmosphereApplied: boolean;
  /**
   * Non-null when the ShotPlan carried a full exposure triangle and we
   * were able to drive Babylon's imageProcessing.exposure from it.
   * ev100 is the computed EV100 for audit; multiplier is what was set.
   */
  exposure: { ev100: number; multiplier: number; applied: boolean } | null;
  /**
   * HDRI outcome. Non-null whenever the director emitted a lighting.hdri
   * id. `applied` tells you whether Babylon actually swapped the env map
   * (false if the URL 404'd or the setter was missing). `fellBack` tells
   * you whether we had to substitute the default because the requested
   * HDRI file wasn't on disk.
   */
  hdri: {
    requestedId: string | null;
    resolvedUrl: string;
    label: string;
    cctKelvin: number;
    applied: boolean;
    fellBack: boolean;
    fallbackReason: string | null;
  } | null;
  /**
   * Depth-of-field outcome. `enabled=false` means the director called
   * for pan-focus ('deep') so the PhysicsBasedDOF pass was left off.
   * Otherwise the ShotPlan's aperture / focal length / subject distance
   * are pushed into the DOF shader and the pass is turned on.
   */
  dof: {
    applied: boolean;
    enabled: boolean;
    fStop: number;
    focalLengthMm: number;
    focusDistanceM: number;
    sensorWidthMm: number;
    depthHint: string;
  } | null;
  /**
   * Prop resolution + spawn outcome. Each `plan.props[]` entry goes
   * through BlenderKit → Meshy → Tripo on the backend; resolved GLBs
   * are loaded into Babylon via `vs-load-external-glb` events. Null
   * when the plan had zero props or resolver was skipped.
   */
  props: {
    total: number;
    resolved: number;
    loaded: number;
    failed: Array<{ description: string; error: string | null }>;
    items: Array<{
      description: string;
      glbUrl: string | null;
      provider: string | null;
      cacheHit: boolean;
      sizeKb: number | null;
      elapsedSec: number | null;
      dispatched: boolean;
    }>;
  } | null;
  /**
   * Character / cast resolution outcome. Each `assembly.characters[]`
   * entry that needs generation goes through Meshy text-to-3d →
   * auto-rigging on the backend; resolved rigged GLBs (skeleton + 1
   * embedded animation) are loaded via `vs-load-external-glb` at
   * positions derived from `suggestedPlacement`.
   */
  cast: {
    total: number;
    resolved: number;
    loaded: number;
    failed: Array<{ name: string; description: string; error: string | null }>;
    items: Array<{
      name: string;
      description: string;
      glbUrl: string | null;
      provider: string | null;
      cacheHit: boolean;
      sizeKb: number | null;
      elapsedSec: number | null;
      dispatched: boolean;
    }>;
  } | null;
  warnings: string[];
}

/**
 * Compute the world-space position for a LightSource given the subject
 * anchor. The light's azimuth/elevation/distance are director-relative.
 */
export function lightWorldPosition(
  source: LightSource,
  subject: Vector3Like,
): Vector3Like {
  const offset = sphericalToCartesian(
    source.azimuthDeg,
    source.elevationDeg,
    source.distanceM,
  );
  return {
    x: subject.x + offset.x,
    y: subject.y + offset.y,
    z: subject.z + offset.z,
  };
}

/**
 * Compute world-space camera position + target from a ShotPlan.
 * Camera is at (cameraDistanceM, cameraHeightM) in front of the subject,
 * looking at subject eye height.
 */
export function cameraWorldTransform(
  shot: ShotPlan,
  subject: Vector3Like,
): { position: Vector3Like; target: Vector3Like } {
  // Camera sits in front of subject at the chosen distance, at chosen height.
  const height = Math.max(shot.cameraHeightM, 0.4);
  return {
    position: {
      x: subject.x,
      y: subject.y - SUBJECT_EYE_HEIGHT_M + height,
      z: subject.z + shot.cameraDistanceM, // In front (subject faces +Z)
    },
    target: { x: subject.x, y: subject.y, z: subject.z },
  };
}

/**
 * Apply a SceneAssembly to the live VirtualStudio scene.
 *
 * v1 behaviour:
 *   - Places lights at computed world positions using addLight(modelId, pos).
 *     Modifier/power/color-temp are preserved in source metadata but not all
 *     are wired into addLight yet (it only accepts model + position).
 *   - Sets camera position, target, and FOV from the ShotPlan.
 *   - Skips environment preset and character generation — callers should
 *     call environmentService.applyPreset(assembly.environmentPlan.preset.id)
 *     and queue character GLB generation separately for v1.
 */
export async function applySceneAssembly(
  assembly: SceneAssembly,
  options: ApplyOptions = {},
): Promise<ApplyResult> {
  const studio = getStudio();
  const warnings: string[] = [];
  const placedLights: ApplyResult['placedLights'] = [];
  let cameraOut: ApplyResult['camera'] = null;
  let environmentPresetApplied: string | null = null;
  let atmosphereApplied = false;
  let exposure: ApplyResult['exposure'] = null;
  let hdri: ApplyResult['hdri'] = null;
  let dof: ApplyResult['dof'] = null;
  let props: ApplyResult['props'] = null;
  let cast: ApplyResult['cast'] = null;

  if (!studio) {
    warnings.push('window.virtualStudio is not available; nothing applied');
    return {
      placedLights,
      camera: cameraOut,
      environmentPresetApplied,
      atmosphereApplied,
      exposure,
      hdri,
      dof,
      props,
      cast,
      warnings,
    };
  }

  const subject = options.subject ?? {
    x: 0,
    y: SUBJECT_EYE_HEIGHT_M,
    z: 0,
  };

  // ---- environment preset + atmosphere ---------------------------------
  // Apply FIRST so walls/floor are in place before director lights land.
  if (!options.skipEnvironment) {
    const envResult = applyEnvironment(assembly, warnings);
    environmentPresetApplied = envResult.presetApplied;
    atmosphereApplied = envResult.atmosphereApplied;
  }

  // ---- HDRI environment (drives PBR ambient) --------------------------
  // Runs BEFORE lights so PBR materials see the correct environmentTexture
  // when the new fixtures land. Missing .hdr files degrade to the shipped
  // default instead of hanging the Babylon texture loader.
  if (!options.skipEnvironment) {
    const requestedId = assembly.lighting?.hdri ?? null;
    if (requestedId) {
      const resolved = await resolveHDRI(requestedId);
      let applied = false;
      if (studio.setEnvironmentHDRI) {
        try {
          applied = studio.setEnvironmentHDRI(
            resolved.entry.url,
            resolved.entry.defaultIntensity,
          );
        } catch (err) {
          warnings.push(
            `setEnvironmentHDRI threw: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        warnings.push(
          'studio.setEnvironmentHDRI unavailable; HDRI not applied',
        );
      }
      if (resolved.fellBack && resolved.reason) {
        warnings.push(`HDRI fallback: ${resolved.reason}`);
      }
      hdri = {
        requestedId,
        resolvedUrl: resolved.entry.url,
        label: resolved.entry.label,
        cctKelvin: resolved.entry.cctKelvin,
        applied,
        fellBack: resolved.fellBack,
        fallbackReason: resolved.reason,
      };
    }
  }

  // ---- clear existing fixtures so director owns the rig ----------------
  const shouldClear = options.clearExistingLights ?? true;
  if (shouldClear && !options.skipLights && studio.clearAllLights) {
    try {
      studio.clearAllLights();
    } catch (err) {
      warnings.push(
        `clearAllLights threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---- lights -----------------------------------------------------------
  if (!options.skipLights && studio.addLight) {
    for (const source of assembly.lighting.sources) {
      const fixture = MODIFIER_TO_FIXTURE[source.modifier] ?? DEFAULT_FIXTURE;
      const worldPos = lightWorldPosition(source, subject);
      const babylonPos = makeVector3(worldPos.x, worldPos.y, worldPos.z);
      try {
        const lightId = await studio.addLight(fixture, babylonPos);
        const iesMatch = iesForModifier(source.modifier);
        let iesOut: PlacedLight['ies'] = null;
        if (iesMatch) {
          // Initialise the record before the await so even a thrown error
          // below leaves an audit trail of what we attempted.
          iesOut = {
            modifier: source.modifier,
            iesUrl: iesMatch.url,
            label: iesMatch.label,
            profile: null,
            applied: false,
          };
          if (studio.applyIESToLightById) {
            try {
              const profile = await studio.applyIESToLightById(
                lightId,
                iesMatch.url,
                iesMatch.preserveBeamAngle,
              );
              iesOut = {
                ...iesOut,
                profile,
                applied: profile != null,
              };
              if (profile == null) {
                warnings.push(
                  `IES not attached to ${source.role} (${source.modifier}): ` +
                    `fetch/parse failed at ${iesMatch.url}`,
                );
              }
            } catch (err) {
              warnings.push(
                `applyIESToLightById threw for ${source.role}: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              );
            }
          } else {
            warnings.push(
              'studio.applyIESToLightById unavailable; IES profiles not attached',
            );
          }
        }
        placedLights.push({ source, lightId, position: worldPos, ies: iesOut });
        // Honor the director's intensity decision (key=1.0, fill=0.35, rim=0.6,
        // practicals ~0.3). addLight() sets the fixture's physical base
        // intensity; multiplying here preserves photometric ratios across
        // the rig (the *relative* key:fill ratio is what reads as mood).
        const sceneLights = (studio as any).scene?.lights as
          | Array<{ id?: string; name?: string; intensity?: number }>
          | undefined;
        // Take the LAST matching light (not the first) so two sources
        // sharing a modifier — and therefore a fixture name — don't
        // compound: addLight appends, and we want the just-appended one,
        // not a previously-multiplied namesake left over from earlier
        // in this rig or from a prior apply when clearExistingLights
        // was disabled. (filter+last instead of findLast since the lib
        // target is ES2020.)
        const matches = sceneLights?.filter(
          (l) => l.id === lightId || l.name === lightId,
        );
        const placed = matches?.[matches.length - 1];
        if (
          placed &&
          typeof placed.intensity === 'number' &&
          Number.isFinite(source.intensity)
        ) {
          placed.intensity = placed.intensity * source.intensity;
        }
        // Color temp: override with director's CCT so rim/hair lights get
        // their distinct-from-key color the director intended. Use the
        // shared Helland helper directly — no studio reach-through, no
        // swallowed catch (the function is pure math, can't throw).
        if (placed && Number.isFinite(source.colorTempKelvin)) {
          (placed as any).diffuse = kelvinToColor3(source.colorTempKelvin);
        }
        options.onLightPlaced?.(source, lightId);
      } catch (err) {
        warnings.push(
          `Failed to place ${source.role} light (${source.modifier}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  } else if (!options.skipLights) {
    warnings.push('studio.addLight is not available; lights not placed');
  }

  // ---- camera -----------------------------------------------------------
  if (!options.skipCamera && studio.setCameraPosition && studio.setCameraTarget) {
    const { position, target } = cameraWorldTransform(assembly.shot, subject);
    const fovRad = focalLengthToFovRadians(
      assembly.shot.focalLengthMm,
      assembly.shot.sensor,
    );
    studio.setCameraPosition(
      makeVector3(position.x, position.y, position.z),
    );
    studio.setCameraTarget(makeVector3(target.x, target.y, target.z));
    if (studio.setCameraFov) studio.setCameraFov(fovRad);
    cameraOut = { position, target, fovRad };
  } else if (!options.skipCamera) {
    warnings.push('studio.setCamera* not available; camera not applied');
  }

  // ---- exposure (from the director's ShotPlan triangle) ----------------
  if (!options.skipCamera) {
    const ev100 = shotEV100(assembly.shot);
    if (ev100 == null) {
      warnings.push(
        'ShotPlan missing shutterSpeedSec/iso; exposure left at pipeline default',
      );
    } else {
      const multiplier = exposureMultiplierFromShot(assembly.shot);
      let applied = false;
      if (studio.setImageProcessingExposure) {
        try {
          applied = studio.setImageProcessingExposure(multiplier);
        } catch (err) {
          warnings.push(
            `setImageProcessingExposure threw: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        warnings.push(
          'studio.setImageProcessingExposure unavailable; exposure not applied',
        );
      }
      exposure = { ev100, multiplier, applied };
    }
  }

  // ---- depth of field (PhysicsBasedDOF driven by the ShotPlan) ---------
  // Focus distance = the camera→subject distance (the ShotPlan's own
  // cameraDistanceM — subject is at camera target). Enabled iff the
  // director didn't ask for 'deep' pan-focus.
  if (!options.skipCamera) {
    const shot = assembly.shot;
    if (studio.applyShotDepthOfField) {
      try {
        const out = studio.applyShotDepthOfField({
          apertureF: shot.apertureF,
          focalLengthMm: shot.focalLengthMm,
          sensor: shot.sensor,
          focusDistanceM: shot.cameraDistanceM,
          depthHint: shot.depthOfField,
        });
        if (out) {
          dof = {
            applied: true,
            enabled: out.enabled,
            fStop: out.fStop,
            focalLengthMm: out.focalLength,
            focusDistanceM: out.focusDistanceM,
            sensorWidthMm: out.sensorWidthMm,
            depthHint: shot.depthOfField,
          };
        } else {
          warnings.push('applyShotDepthOfField returned null (PhysicsBasedDOF not initialised)');
        }
      } catch (err) {
        warnings.push(
          `applyShotDepthOfField threw: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    } else {
      warnings.push('studio.applyShotDepthOfField unavailable; DOF not driven');
    }
  }

  // ---- props (Claude-authored → BlenderKit/Meshy/Tripo → Babylon) ------
  // The callback fires whenever the phase ran — even on zero props — so
  // a UI spinner triggered before applySceneAssembly() will always get
  // a finish signal. Null is reserved for "skipped".
  if (!options.skipProps) {
    const planProps = extractPlanProps(assembly);
    props = planProps.length > 0
      ? await resolveAndDispatchProps(
          planProps,
          subject,
          options.propMeshyTimeoutSec,
          warnings,
        )
      : { total: 0, resolved: 0, loaded: 0, failed: [], items: [] };
    options.onPropsResolved?.(props);
  }

  // ---- cast (Claude-authored → Meshy rigged humanoid → Babylon) -------
  // Characters are expensive (~3 min + ~$0.05 each on cache miss), so:
  //   • Only characters with `needsGeneration=true` OR missing avatarRef
  //     are sent to the resolver — ones the director already matched to
  //     an existing avatar are skipped.
  //   • Same fingerprint cache as props — repeated prompts are free.
  if (!options.skipCast) {
    const castInputs = extractCastInputs(assembly);
    cast = castInputs.length > 0
      ? await resolveAndDispatchCast(
          castInputs,
          subject,
          options.castHeightMeters ?? 1.78,
          warnings,
        )
      : { total: 0, resolved: 0, loaded: 0, failed: [], items: [] };
    options.onCastResolved?.(cast);
  }

  return {
    placedLights,
    camera: cameraOut,
    environmentPresetApplied,
    atmosphereApplied,
    exposure,
    hdri,
    dof,
    props,
    cast,
    warnings,
  };
}

/**
 * Pull the list of prop descriptions out of the director's environment
 * plan. The backend Scene Director emits `plan.props[] = {name,
 * description, category, placementHint, priority}`. We use the richest
 * available text so Meshy/BlenderKit have something to search on —
 * `name` alone is often too terse (e.g. "lamp").
 */
export interface PlanProp {
  description: string;
  name: string;
  category: string | null;
  placementHint: string | null;
  priority: string | null;
}

function extractPlanProps(assembly: SceneAssembly): PlanProp[] {
  const plan = (assembly as any).environmentPlan?.plan as
    | { props?: Array<Record<string, unknown>> }
    | undefined;
  const raw = Array.isArray(plan?.props) ? plan!.props : [];
  const out: PlanProp[] = [];
  for (const p of raw) {
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    const desc = typeof p.description === 'string' ? p.description.trim() : '';
    // Resolver search works best with the fullest phrasing available:
    // "name + description" beats either alone on every provider tried.
    const combined = [name, desc].filter(Boolean).join(' — ').slice(0, 240);
    if (!combined) continue;
    out.push({
      description: combined,
      name: name || desc.slice(0, 32),
      category: typeof p.category === 'string' ? p.category : null,
      placementHint:
        typeof p.placementHint === 'string' ? p.placementHint : null,
      priority: typeof p.priority === 'string' ? p.priority : null,
    });
  }
  return out;
}

/**
 * Pick a world-space position for a prop based on its placementHint.
 * Keyword-based fallback — nothing clever, just "near the subject, at a
 * sensible offset". Real spatial reasoning lives further down the
 * roadmap; this is the honest MVP.
 */
export function placementForHint(
  hint: string | null,
  subject: Vector3Like,
  index: number,
  total: number,
): Vector3Like {
  const h = (hint || '').toLowerCase();
  // Subject floor is subject.y − SUBJECT_EYE_HEIGHT_M; most props sit
  // on a surface ~80 cm above the floor (desk/table height), except
  // things hinted as ceiling/overhead.
  const floorY = subject.y - SUBJECT_EYE_HEIGHT_M;
  const tableY = floorY + 0.8;

  if (/ceil|overhead|hang/.test(h)) {
    return { x: subject.x, y: floorY + 2.2, z: subject.z };
  }
  if (/wall|behind|back/.test(h)) {
    return { x: subject.x, y: floorY + 1.5, z: subject.z - 1.8 };
  }
  if (/window/.test(h)) {
    return { x: subject.x + 1.8, y: floorY + 1.2, z: subject.z - 1.2 };
  }
  if (/floor|ground|rug/.test(h)) {
    return { x: subject.x + 0.6 * (index + 1), y: floorY, z: subject.z + 0.6 };
  }
  if (/desk|table|counter/.test(h)) {
    return { x: subject.x + 0.3 * index, y: tableY, z: subject.z - 0.6 };
  }
  // Default: fan props out around the subject on the floor so they
  // don't all stack at the same (0,0,0) when Claude gives no hint.
  // Use `total` (not index+2) so 6+ props don't pile up on one half.
  const angle = (index * Math.PI * 2) / Math.max(1, total);
  const r = 1.5 + (index % 3) * 0.3;
  return {
    x: subject.x + Math.sin(angle) * r,
    y: floorY,
    z: subject.z + Math.cos(angle) * r,
  };
}

export async function resolveAndDispatchProps(
  planProps: PlanProp[],
  subject: Vector3Like,
  meshyTimeoutSec: number | undefined,
  warnings: string[],
): Promise<NonNullable<ApplyResult['props']>> {
  const descriptions = planProps.map((p) => p.description);
  let batch: { count: number; results: ResolvedProp[] };
  try {
    batch = await backendResolveProps(descriptions, {
      meshyTimeoutSec: meshyTimeoutSec ?? 120,
      concurrency: 2,
    });
  } catch (err) {
    warnings.push(
      `resolveProps request failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return {
      total: planProps.length,
      resolved: 0,
      loaded: 0,
      failed: planProps.map((p) => ({
        description: p.description,
        error: 'backend unreachable',
      })),
      items: [],
    };
  }

  const items: NonNullable<ApplyResult['props']>['items'] = [];
  const failed: NonNullable<ApplyResult['props']>['failed'] = [];
  let resolved = 0;
  let loaded = 0;

  // Match results to inputs by description rather than by array index.
  // The backend may dedupe identical descriptions, return on completion
  // order, or drop entries that errored before queue admission — any of
  // which would silently shuffle GLBs onto the wrong props if we trusted
  // position alone. ResolvedProp.description echoes the input verbatim.
  //
  // Two regimes:
  //   • All results carry a description → strict Map lookup. A missing
  //     entry means the backend dropped that input — surface it as
  //     failed, never fall through to index-match (which would
  //     misalign and reintroduce the very bug this guards against).
  //   • No result carries a description → older backend shape; index
  //     matching is the only option, but warn per-item so the UX
  //     knows the matching is fragile.
  const allHaveDescription = batch.results.length > 0
    && batch.results.every((r) => !!r.description);
  const resultByDescription = new Map<string, ResolvedProp>();
  if (allHaveDescription) {
    for (const r of batch.results) resultByDescription.set(r.description, r);
  }

  planProps.forEach((planProp, idx) => {
    let result: ResolvedProp | undefined;
    if (allHaveDescription) {
      result = resultByDescription.get(planProp.description);
    } else {
      result = batch.results[idx];
      if (result) {
        warnings.push(
          `resolveProps: matched "${planProp.description}" by array index (backend echo missing)`,
        );
      }
    }
    if (!result) {
      failed.push({
        description: planProp.description,
        error: 'no result returned by resolver',
      });
      items.push({
        description: planProp.description,
        glbUrl: null,
        provider: null,
        cacheHit: false,
        sizeKb: null,
        elapsedSec: null,
        dispatched: false,
      });
      return;
    }
    if (!result.success || !result.glbUrl) {
      failed.push({
        description: planProp.description,
        error: result.error,
      });
      items.push({
        description: planProp.description,
        glbUrl: null,
        provider: result.provider,
        cacheHit: result.cacheHit,
        sizeKb: result.sizeKb,
        elapsedSec: result.elapsedSec,
        dispatched: false,
      });
      return;
    }

    resolved += 1;
    const position = placementForHint(
      planProp.placementHint,
      subject,
      idx,
      planProps.length,
    );
    let dispatched = false;
    try {
      window.dispatchEvent(
        new CustomEvent('vs-load-external-glb', {
          detail: {
            url: result.glbUrl,
            name: planProp.name,
            position: [position.x, position.y, position.z],
          },
        }),
      );
      dispatched = true;
      loaded += 1;
    } catch (err) {
      warnings.push(
        `vs-load-external-glb dispatch failed for ${planProp.name}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    items.push({
      description: planProp.description,
      glbUrl: result.glbUrl,
      provider: result.provider,
      cacheHit: result.cacheHit,
      sizeKb: result.sizeKb,
      elapsedSec: result.elapsedSec,
      dispatched,
    });
  });

  return {
    total: planProps.length,
    resolved,
    loaded,
    failed,
    items,
  };
}

// ---------------------------------------------------------------------------
// Cast extraction + dispatch
// ---------------------------------------------------------------------------

export interface CastInput {
  name: string;
  description: string;
  suggestedPlacement: string | null;
}

/**
 * Pull characters from the SceneAssembly that need generation.
 *
 * Scene Director already emits `characters[] = {name, description,
 * avatarRef, needsGeneration, suggestedPlacement}`. We resolve only
 * those with `needsGeneration=true` OR no `avatarRef` — characters
 * that already have a cast GLB stay untouched.
 *
 * Fingerprint-wise the resolver uses `description || name`, so make
 * sure the description is the richer phrasing when available.
 */
// Generic placeholder names the Scene Director sometimes ships when
// Claude didn't bother to write a real character. Resolving these to
// rigged GLBs costs Meshy credits for ~unusable output; better to
// surface the gap as a warning and leave the slot empty.
const _GENERIC_CHARACTER_NAMES = new Set([
  'subject', 'figure', 'character', 'person',
  'man', 'woman', 'actor', 'actress',
  'placeholder', 'tbd', 'unknown',
]);

function extractCastInputs(assembly: SceneAssembly): CastInput[] {
  const list = (assembly.characters as CharacterCast[] | undefined) ?? [];
  const out: CastInput[] = [];
  for (const c of list) {
    const needs = c.needsGeneration || !c.avatarRef || c.avatarRef.startsWith('placeholder:');
    if (!needs) continue;
    // Build the resolver input. PREFER description (Claude-authored,
    // specific). Only fall back to the character name when it's not a
    // generic placeholder — "Subject"/"Figure" alone are too thin to
    // produce a meaningful Meshy character and just burn credits.
    const description = (c.description || '').trim();
    const name = (c.name || '').trim();
    let resolverInput: string;
    if (description.length >= 8) {
      resolverInput = description;
    } else if (name && !_GENERIC_CHARACTER_NAMES.has(name.toLowerCase())) {
      resolverInput = name;
    } else {
      // Too thin to resolve safely — skip and note it; the caller can
      // still see the gap in ApplyResult.warnings.
      continue;
    }
    out.push({
      name: name || resolverInput.slice(0, 40),
      description: resolverInput,
      suggestedPlacement: c.suggestedPlacement ?? null,
    });
  }
  return out;
}

/**
 * Place a cast member in world space. Characters stand on the floor
 * looking toward the camera. When the director gave a specific
 * `suggestedPlacement` string, we honor simple keywords — otherwise
 * characters fan out around the subject at a safe 1.5 m radius.
 */
function castPlacementForHint(
  hint: string | null,
  subject: Vector3Like,
  index: number,
  total: number,
): Vector3Like {
  const h = (hint || '').toLowerCase();
  const floorY = subject.y - SUBJECT_EYE_HEIGHT_M;

  if (/center|centre|middle/.test(h)) {
    return { x: subject.x, y: floorY, z: subject.z };
  }
  if (/window/.test(h)) {
    return { x: subject.x + 1.5, y: floorY, z: subject.z - 1.0 };
  }
  if (/door|entrance/.test(h)) {
    return { x: subject.x - 1.5, y: floorY, z: subject.z - 1.5 };
  }
  if (/seated|chair|sitting/.test(h)) {
    // Seated characters sit lower — approximate chair height ~0.45 m.
    return { x: subject.x, y: floorY + 0.45, z: subject.z - 0.2 };
  }
  // Default: fan out around the subject so a 5-character cast doesn't
  // stack. Subject sits at (0,eye,0) facing +Z (toward camera). Spread
  // the cast on a semicircle in front of the subject so they're all
  // visible to the director's camera.
  const spread = Math.PI * 0.8; // ~144° arc in front of subject
  const angle = -spread / 2 + (spread * index) / Math.max(1, total - 1);
  const r = 1.6;
  return {
    x: subject.x + Math.sin(angle) * r,
    y: floorY,
    z: subject.z + Math.cos(angle) * r,
  };
}

export async function resolveAndDispatchCast(
  inputs: CastInput[],
  subject: Vector3Like,
  heightMeters: number,
  warnings: string[],
): Promise<NonNullable<ApplyResult['cast']>> {
  const descriptions = inputs.map((c) => c.description);
  let batch: { count: number; results: ResolvedCharacter[] };
  try {
    batch = await backendResolveCast(descriptions, {
      heightMeters,
      includeAnimations: true,
      concurrency: 1,
    });
  } catch (err) {
    warnings.push(
      `resolveCast request failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return {
      total: inputs.length,
      resolved: 0,
      loaded: 0,
      failed: inputs.map((c) => ({
        name: c.name,
        description: c.description,
        error: 'backend unreachable',
      })),
      items: [],
    };
  }

  const items: NonNullable<ApplyResult['cast']>['items'] = [];
  const failed: NonNullable<ApplyResult['cast']>['failed'] = [];
  let resolved = 0;
  let loaded = 0;

  // Same two-regime defence as resolveAndDispatchProps. See comment
  // there for the reasoning.
  const allHaveDescription = batch.results.length > 0
    && batch.results.every((r) => !!r.description);
  const resultByDescription = new Map<string, ResolvedCharacter>();
  if (allHaveDescription) {
    for (const r of batch.results) resultByDescription.set(r.description, r);
  }

  inputs.forEach((input, idx) => {
    let result: ResolvedCharacter | undefined;
    if (allHaveDescription) {
      result = resultByDescription.get(input.description);
    } else {
      result = batch.results[idx];
      if (result) {
        warnings.push(
          `resolveCast: matched "${input.name}" by array index (backend echo missing)`,
        );
      }
    }
    if (!result) {
      failed.push({
        name: input.name,
        description: input.description,
        error: 'no result returned by resolver',
      });
      items.push({
        name: input.name,
        description: input.description,
        glbUrl: null,
        provider: null,
        cacheHit: false,
        sizeKb: null,
        elapsedSec: null,
        dispatched: false,
      });
      return;
    }
    if (!result.success || !result.glbUrl) {
      failed.push({
        name: input.name,
        description: input.description,
        error: result.error,
      });
      items.push({
        name: input.name,
        description: input.description,
        glbUrl: null,
        provider: result.provider,
        cacheHit: result.cacheHit,
        sizeKb: result.sizeKb,
        elapsedSec: result.elapsedSec,
        dispatched: false,
      });
      return;
    }

    resolved += 1;
    const position = castPlacementForHint(
      input.suggestedPlacement,
      subject,
      idx,
      inputs.length,
    );
    let dispatched = false;
    try {
      window.dispatchEvent(
        new CustomEvent('vs-load-external-glb', {
          detail: {
            url: result.glbUrl,
            name: input.name,
            position: [position.x, position.y, position.z],
          },
        }),
      );
      dispatched = true;
      loaded += 1;
    } catch (err) {
      warnings.push(
        `vs-load-external-glb dispatch failed for cast "${input.name}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    items.push({
      name: input.name,
      description: input.description,
      glbUrl: result.glbUrl,
      provider: result.provider,
      cacheHit: result.cacheHit,
      sizeKb: result.sizeKb,
      elapsedSec: result.elapsedSec,
      dispatched,
    });
  });

  return {
    total: inputs.length,
    resolved,
    loaded,
    failed,
    items,
  };
}

function parseHex(hex: string | undefined): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

/**
 * Apply environmentPlan's recommendedPresetId and atmosphere fields to the
 * live scene. Walls/floor go through environmentService.applyPreset (custom
 * events drive the Babylon side). Atmosphere (clearColor, ambientColor, fog)
 * is set directly on scene because there's no service layer for it.
 */
function applyEnvironment(
  assembly: SceneAssembly,
  warnings: string[],
): { presetApplied: string | null; atmosphereApplied: boolean } {
  const plan = (assembly as any).environmentPlan?.plan as
    | {
        recommendedPresetId?: string | null;
        atmosphere?: {
          clearColor?: string;
          ambientColor?: string;
          ambientIntensity?: number;
          fogEnabled?: boolean;
          fogColor?: string;
          fogDensity?: number;
        };
      }
    | undefined;

  if (!plan) return { presetApplied: null, atmosphereApplied: false };

  // 1. Apply preset via environmentService if available
  let presetApplied: string | null = null;
  const envService = (globalThis as { environmentService?: EnvironmentServiceAPI })
    .environmentService;
  const presetId = plan.recommendedPresetId;
  if (presetId && envService?.applyPreset) {
    try {
      envService.applyPreset(presetId);
      presetApplied = presetId;
    } catch (err) {
      warnings.push(
        `environmentService.applyPreset("${presetId}") threw: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // 2. Apply atmosphere directly on the scene for cinematic feel
  let atmosphereApplied = false;
  const studio = getStudio();
  const scene = studio?.scene as any;
  const atm = plan.atmosphere;
  if (scene && atm) {
    const clearC = parseHex(atm.clearColor);
    const ambientC = parseHex(atm.ambientColor);
    const fogC = parseHex(atm.fogColor);

    if (clearC && scene.clearColor) {
      scene.clearColor.r = clearC.r;
      scene.clearColor.g = clearC.g;
      scene.clearColor.b = clearC.b;
      if (typeof scene.clearColor.a === 'number') scene.clearColor.a = 1;
      atmosphereApplied = true;
    }
    if (ambientC && scene.ambientColor) {
      scene.ambientColor.r = ambientC.r;
      scene.ambientColor.g = ambientC.g;
      scene.ambientColor.b = ambientC.b;
      atmosphereApplied = true;
    }
    if (typeof atm.ambientIntensity === 'number') {
      scene.environmentIntensity = Math.max(0.05, Math.min(2, atm.ambientIntensity));
      atmosphereApplied = true;
    }
    if (atm.fogEnabled && fogC && typeof scene.fogMode === 'number') {
      // Babylon FOGMODE_EXP = 3
      scene.fogMode = 3;
      scene.fogColor.r = fogC.r;
      scene.fogColor.g = fogC.g;
      scene.fogColor.b = fogC.b;
      scene.fogDensity = atm.fogDensity ?? 0.01;
      atmosphereApplied = true;
    } else if (!atm.fogEnabled && typeof scene.fogMode === 'number') {
      scene.fogMode = 0; // FOGMODE_NONE
    }
  }

  return { presetApplied, atmosphereApplied };
}
