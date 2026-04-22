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

import type {
  SceneAssembly,
  LightSource,
  ShotPlan,
} from './sceneDirectorClient';
import {
  sphericalToCartesian,
  focalLengthToFovRadians,
} from './sceneDirectorClient';

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
  setCameraPosition?: (position: Vector3Like) => void;
  setCameraTarget?: (target: Vector3Like) => void;
  setCameraFov?: (fov: number) => void;
  loadAvatarModel?: (
    glbUrl: string,
    metadata?: { name?: string; category?: string },
  ) => Promise<void>;
}

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

function makeVector3(x: number, y: number, z: number): Vector3Like {
  // Babylon's Vector3 constructor lives on the global BABYLON namespace
  // via @babylonjs/core; detect and use it if available, otherwise fall
  // back to a plain { x, y, z } which Babylon accepts in many setters.
  const BJS = (globalThis as { BABYLON?: { Vector3?: new (x: number, y: number, z: number) => Vector3Like } }).BABYLON;
  if (BJS?.Vector3) {
    return new BJS.Vector3(x, y, z);
  }
  return { x, y, z };
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
   * Called for each light that was placed, so the caller can hook into
   * studio state (store the light IDs for later removal, etc.).
   */
  onLightPlaced?: (source: LightSource, lightId: string) => void;
}

export interface ApplyResult {
  placedLights: Array<{ source: LightSource; lightId: string; position: Vector3Like }>;
  camera: { position: Vector3Like; target: Vector3Like; fovRad: number } | null;
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

  if (!studio) {
    warnings.push('window.virtualStudio is not available; nothing applied');
    return { placedLights, camera: cameraOut, warnings };
  }

  const subject = options.subject ?? {
    x: 0,
    y: SUBJECT_EYE_HEIGHT_M,
    z: 0,
  };

  // ---- lights -----------------------------------------------------------
  if (!options.skipLights && studio.addLight) {
    for (const source of assembly.lighting.sources) {
      const fixture = MODIFIER_TO_FIXTURE[source.modifier] ?? DEFAULT_FIXTURE;
      const worldPos = lightWorldPosition(source, subject);
      const babylonPos = makeVector3(worldPos.x, worldPos.y, worldPos.z);
      try {
        const lightId = await studio.addLight(fixture, babylonPos);
        placedLights.push({ source, lightId, position: worldPos });
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

  return { placedLights, camera: cameraOut, warnings };
}
