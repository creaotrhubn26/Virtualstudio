/**
 * Director-driven location scene — entry script for the standalone
 * /director-scene.html page. Reads a SceneAssembly that the main app
 * stashed in sessionStorage, mounts a right-handed Babylon LocationScene
 * at the geocoded lat/lon, and spawns every resolved prop + cast member
 * on top of the photogrammetric tiles.
 *
 * Flow
 * ----
 *   SceneDirectorApp "Apply" (when assembly.locationHint present)
 *     ↓ sessionStorage.setItem('vs:lastAssembly', JSON.stringify(assembly))
 *     ↓ window.open('/director-scene.html', '_blank')
 *   This entry runs in the new window:
 *     ↓ read assembly from sessionStorage
 *     ↓ mount LocationScene at (locationHint.lat, locationHint.lon)
 *     ↓ resolve props + cast through the existing /resolve-props +
 *       /resolve-cast routes (cache hits = instant; misses = full
 *       Meshy round-trip)
 *     ↓ load each GLB into the scene at a fanned position around the
 *       origin (the geocoded point sits at world (0, 0, 0))
 *
 * The studio editor in the original window stays open — the operator
 * can keep tweaking lights / shot in the studio and re-launch the
 * location view as needed.
 */

// Pin the glTF loader at the entry-point level so Vite's per-page
// chunking cannot tree-shake it out of the director-scene bundle. The
// 3d-tiles-renderer's b3dm decoder routes through Babylon's SceneLoader
// for embedded glTF, and `loadGlbAt` uses LoadAssetContainerAsync —
// both fail with "No plugin or fallback for .glb" if this isn't here.
import { GLTFFileLoader } from '@babylonjs/loaders/glTF';
void GLTFFileLoader;

import { mountLocationScene } from './scenes/LocationScene';
import { resolveProps, resolveCast } from './services/propResolverClient';
import type { SceneAssembly } from './services/sceneDirectorClient';
import { resolveHDRI } from './data/hdriRegistry';

const SESSION_KEY = 'vs:lastAssembly';
const FALLBACK_DEFAULT_LAT = 40.7484;
const FALLBACK_DEFAULT_LON = -73.9857;

const status = document.getElementById('status');
const setStatus = (msg: string, isErr = false) => {
  if (!status) return;
  status.textContent = msg;
  status.style.color = isErr ? '#ff8888' : '#cccccc';
};

function readAssembly(): SceneAssembly | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SceneAssembly;
  } catch (err) {
    console.error('[director-scene] sessionStorage read failed', err);
    return null;
  }
}

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
if (!canvas) {
  setStatus('No #renderCanvas in DOM', true);
  throw new Error('canvas missing');
}

const assembly = readAssembly();

let lat = FALLBACK_DEFAULT_LAT;
let lon = FALLBACK_DEFAULT_LON;
let label = 'Empire State (default — no assembly in sessionStorage)';

if (assembly?.locationHint) {
  lat = assembly.locationHint.lat;
  lon = assembly.locationHint.lon;
  label = assembly.locationHint.displayName ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
} else if (assembly) {
  setStatus(
    `Assembly has no locationHint (location string didn't geocode). Using default Empire State.`,
    true,
  );
}

// Pull time-of-day off the source beat so the location scene's
// astronomical sun calc + ambient palette match what the director
// asked for. The backend ships sourceBeat as raw `asdict()` output —
// Python snake_case — so the field is `time_of_day`, not `timeOfDay`.
// Accept both for forward-compat with a future camelCase pass.
const timeOfDay = (() => {
  const beat = (assembly?.sourceBeat as Record<string, unknown> | undefined) ?? {};
  const raw = beat.timeOfDay ?? beat.time_of_day;
  if (typeof raw === 'string') {
    const u = raw.toUpperCase();
    if (u === 'DAY' || u === 'DUSK' || u === 'DAWN' || u === 'NIGHT' || u === 'MAGIC HOUR') {
      return u as 'DAY' | 'DUSK' | 'DAWN' | 'NIGHT' | 'MAGIC HOUR';
    }
  }
  return 'DAY' as const;
})();

// Compute the camera radius the ShotPlan implies BEFORE mounting so
// the camera starts framed for the scene — otherwise it pops in from
// 600 m (the helicopter default) once cast loads, several seconds in.
//
// Camera height/distance are movement-aware:
//   • handheld     → 4 m radius (operator running with the action)
//   • tracking     → 6 m radius (Steadicam following at distance)
//   • static / pan → director's cameraDistanceM (typically 2-3 m)
//   • dolly-* / tilt → 8 m radius (mid-range)
//   • establishing → keep the helicopter altitude
function radiusForMovement(movement: string | undefined, directorDist: number): number {
  switch (movement) {
    case 'handheld': return directorDist > 0 ? Math.max(directorDist, 3) : 4;
    case 'tracking': return 6;
    case 'dolly-in':
    case 'dolly-out':
    case 'tilt': return 8;
    case 'pan': return 12;
    case 'static': return directorDist > 0 ? Math.max(directorDist, 3) : 5;
    default: return 600; // establishing / unknown — keep helicopter altitude
  }
}

const directorMovement = assembly?.shot?.movement;
const directorCameraDist = assembly?.shot?.cameraDistanceM ?? 0;
const initialRadiusM = radiusForMovement(directorMovement, directorCameraDist);

setStatus(`Mounting tiles for ${label} (${timeOfDay})…`);

const handle = mountLocationScene(canvas, {
  lat,
  lon,
  errorTarget: 16,
  timeOfDay,
  initialRadiusM,
});
(window as unknown as { directorScene?: typeof handle }).directorScene = handle;

// HDRI environment — resolves the director's mood-keyed HDRI id
// (daylight-soft, dawn-golden, dusk-magic, …) to a real .hdr file
// and assigns it as scene.environmentTexture. Without this, PBR
// materials on Meshy cast/props read as flat grey (no IBL fill).
// Falls back to the shipped venice_sunset_2k when the requested
// .hdr isn't on disk; see hdriRegistry.resolveHDRI.
//
// Independent of terrain anchoring (HDRI is sky/env, not ground), so
// fire-and-forget alongside the anchor wait below.
if (assembly?.lighting?.hdri) {
  resolveHDRI(assembly.lighting.hdri)
    .then((resolved) => {
      handle.setEnvironmentHDRI(resolved.entry.url, resolved.entry.defaultIntensity);
      console.log(
        `[director-scene] HDRI → ${resolved.entry.label} (${resolved.entry.url})` +
        (resolved.fellBack ? `  fell back: ${resolved.reason}` : ''),
      );
    })
    .catch((err) => {
      console.warn('[director-scene] HDRI resolve failed:', err);
    });
}

// Camera movement attached early — radius was already set at mount via
// initialRadiusM, this just wires the movement style (handheld jitter,
// tracking lock-on, etc).
if (directorMovement) {
  handle.setCameraMovement(directorMovement);
  console.log(
    `[director-scene] camera movement → ${directorMovement}  radius=${initialRadiusM}m`,
  );
}

/**
 * Wait until the tile geometry under the lat/lon origin has streamed in,
 * then anchor the scene to it: assetsRoot.position.y = groundY (so cast
 * + props at local y=0 land on the street rather than tens of metres
 * below the WGS-84 ellipsoid surface) and camera.target = (0, groundY +
 * 1.65, 0) (so the camera frames the action, not empty subterranean
 * space).
 *
 * Without this the camera ends up looking at a "random place" — namely
 * Vector3.Zero(), which in NYC is ~30 m below the actual street because
 * the ENU origin sits on the ellipsoid, not on the geoid+terrain.
 *
 * Retries with backoff because 3D Tiles streams in based on camera
 * frustum: the chunk under origin can take 1–10 s to arrive on a cold
 * start. Returns groundY=0 as a last-resort fallback after ~25 s of
 * total wait so we don't block the rest of the bootstrap forever.
 */
async function anchorWhenReady(): Promise<{ groundY: number; anchored: boolean }> {
  const delaysMs = [200, 500, 1000, 2000, 4000, 7000, 10000];
  for (let i = 0; i < delaysMs.length; i++) {
    await new Promise((r) => setTimeout(r, delaysMs[i]));
    const result = handle.anchorToTerrain();
    if (result) {
      console.log(
        `[director-scene] anchored to terrain at Y=${result.groundY.toFixed(2)} m ` +
        `(attempt ${i + 1})`,
      );
      return { groundY: result.groundY, anchored: true };
    }
  }
  console.warn('[director-scene] anchor failed after 25 s — using y=0 default');
  return { groundY: 0, anchored: false };
}
const anchorPromise = anchorWhenReady();

// Apply the SAME LightingPlan the studio uses — director's key/fill/
// rim/practical with their real IES profiles + CCT. Defer until the
// anchor has resolved so lights aim at the actual subject head height
// (groundY + 1.65) instead of empty space below the visible ground.
if (assembly?.lighting?.sources?.length) {
  anchorPromise
    .then(({ groundY }) =>
      handle.applyDirectorLighting(assembly.lighting, {
        x: 0,
        y: groundY + 1.65,
        z: 0,
      }),
    )
    .then((rig) => {
      const iesHits = rig.filter((p) => p.iesAttached).length;
      console.log(
        `[director-scene] director rig: ${rig.length} lights, ${iesHits} with IES`,
      );
    })
    .catch((err) => {
      console.error('[director-scene] applyDirectorLighting failed', err);
    });
}

/**
 * Fan loaded props around the lat/lon origin on a 3 m circle, evenly.
 * Cast goes on a 4 m outer ring so they don't collide with props.
 * Real placement (matching Director.suggestedPlacement) is a follow-up
 * — for the MVP we just want the assets visibly attached to the tiles.
 */
function fanPosition(index: number, total: number, radius: number): { x: number; z: number } {
  const angle = (Math.PI * 2 * index) / Math.max(1, total);
  return {
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  };
}

/**
 * Pick the best GLB variant for a resolved character given the current
 * scene mood. For action / chase / fight beats we want characters
 * actually moving — running for high-energy scenes, walking for
 * pedestrian / dialogue background. Falls back to the rigged static
 * pose when the requested variant is missing (older cache entries
 * predate the animation upload).
 */
function pickCharacterVariant(
  result: { glbUrl: string | null; walkingGlbUrl: string | null; runningGlbUrl: string | null },
  mood: string | null,
  shotType: string | null,
): { url: string; variant: 'rigged' | 'walking' | 'running' } {
  const m = (mood || '').toLowerCase();
  const isAction = /action|chase|tense|combat|fight/i.test(m)
    || /chase|run|fight/i.test(shotType || '');
  if (isAction && result.runningGlbUrl) {
    return { url: result.runningGlbUrl, variant: 'running' };
  }
  // Walking is a good general-purpose default for non-action ambient
  // scenes. Use it when a walking variant exists AND the scene mood
  // isn't explicitly static-portrait-y.
  const isStatic = /portrait|posed|still|romantic|melancholy/i.test(m);
  if (!isStatic && result.walkingGlbUrl) {
    return { url: result.walkingGlbUrl, variant: 'walking' };
  }
  return { url: result.glbUrl ?? '', variant: 'rigged' };
}

// First successfully-loaded cast member. The camera locks onto this
// node when the director's shot.movement is "tracking" so the
// camera follows the subject through space.
let leadCastNode: import('@babylonjs/core/Meshes/transformNode').TransformNode | null = null;

async function loadCast(): Promise<{ ok: number; fail: number }> {
  if (!assembly?.characters?.length) return { ok: 0, fail: 0 };
  // Reuse the same filter the studio path uses: only resolve characters
  // with real descriptions, skip placeholders like "Subject"/"Figure".
  const inputs = assembly.characters
    .filter((c) => c.needsGeneration || !c.avatarRef || (c.avatarRef ?? '').startsWith('placeholder:'))
    .map((c) => {
      const desc = (c.description || '').trim();
      const name = (c.name || '').trim();
      const PLACEHOLDERS = new Set(['subject', 'figure', 'character', 'person', 'man', 'woman', 'actor', 'actress']);
      let resolverInput = '';
      if (desc.length >= 8) resolverInput = desc;
      else if (name && !PLACEHOLDERS.has(name.toLowerCase())) resolverInput = name;
      return resolverInput ? { name: name || resolverInput.slice(0, 40), description: resolverInput } : null;
    })
    .filter((x): x is { name: string; description: string } => x !== null);

  if (!inputs.length) return { ok: 0, fail: 0 };
  setStatus(`${label} — resolving cast (${inputs.length} character${inputs.length > 1 ? 's' : ''})…`);
  let response: Awaited<ReturnType<typeof resolveCast>>;
  try {
    response = await resolveCast(inputs.map((i) => i.description), {
      heightMeters: 1.78,
      includeAnimations: true,
      concurrency: 1,
    });
  } catch (err) {
    console.error('[director-scene] resolveCast failed', err);
    return { ok: 0, fail: inputs.length };
  }

  // Determine mood + shot type from the assembly so we can pick the
  // right variant per character. mood lives on environmentPlan.plan
  // (Claude's mood label) or sourceBeat; shotType on the ShotPlan.
  const mood =
    (((assembly?.environmentPlan as Record<string, unknown> | undefined)?.plan as Record<string, unknown> | undefined)?.mood as string | undefined)
    ?? ((assembly?.sourceBeat as Record<string, unknown> | undefined)?.mood as string | undefined)
    ?? null;
  const shotType = assembly?.shot?.type ?? null;

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < response.results.length; i++) {
    const result = response.results[i];
    if (!result.success || !result.glbUrl) {
      fail += 1;
      console.warn('[director-scene] cast item failed:', inputs[i].name, result.error);
      continue;
    }
    const picked = pickCharacterVariant(result, mood, shotType);
    if (!picked.url) {
      fail += 1;
      continue;
    }
    const pos = fanPosition(i, response.results.length, 4);
    try {
      const loaded = await handle.loadGlbAt(picked.url, {
        x: pos.x,
        y: 0,
        z: pos.z,
        scale: 1,
        name: `cast_${inputs[i].name}_${picked.variant}`,
        // walk + run variants are skinned-animation GLBs — start the
        // first AnimationGroup so the cast actually moves. The rigged
        // variant has only a single-keyframe rest pose; playing it
        // is harmless but pointless.
        autoplayFirstAnimation: picked.variant !== 'rigged',
        loop: true,
        // ENU origin sits on the WGS-84 ellipsoid surface, not actual
        // terrain — characters at y=0 float ~30 m above NYC streets.
        // Snap onto the tile geometry once tiles around the subject
        // have streamed in.
        dropToGround: true,
      });
      ok += 1;
      console.log(
        `[director-scene] cast loaded: ${inputs[i].name} (${picked.variant})`,
      );
      // Anoint the first successfully-loaded cast member as the lead
      // for camera tracking. Director can override later via the
      // exposed handle if needed.
      if (!leadCastNode) leadCastNode = loaded.root;
    } catch (err) {
      console.error('[director-scene] cast loadGlbAt failed:', inputs[i].name, err);
      fail += 1;
    }
  }
  return { ok, fail };
}

async function loadProps(): Promise<{ ok: number; fail: number }> {
  const planProps = ((assembly as unknown as { environmentPlan?: { plan?: { props?: Array<Record<string, unknown>> } } })
    ?.environmentPlan?.plan?.props ?? []) as Array<Record<string, unknown>>;
  if (!planProps.length) return { ok: 0, fail: 0 };

  const descriptions: string[] = [];
  for (const p of planProps) {
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    const desc = typeof p.description === 'string' ? p.description.trim() : '';
    const combined = [name, desc].filter(Boolean).join(' — ').slice(0, 240);
    if (combined) descriptions.push(combined);
  }
  if (!descriptions.length) return { ok: 0, fail: 0 };

  setStatus(`${label} — resolving props (${descriptions.length})…`);
  let response: Awaited<ReturnType<typeof resolveProps>>;
  try {
    response = await resolveProps(descriptions, {
      meshyTimeoutSec: 240,
      concurrency: 2,
    });
  } catch (err) {
    console.error('[director-scene] resolveProps failed', err);
    return { ok: 0, fail: descriptions.length };
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < response.results.length; i++) {
    const result = response.results[i];
    if (!result.success || !result.glbUrl) {
      fail += 1;
      console.warn('[director-scene] prop failed:', descriptions[i], result.error);
      continue;
    }
    const pos = fanPosition(i, response.results.length, 3);
    try {
      // Props sit on the ground. Scale 1 because Meshy returns models
      // that are roughly meter-scale. dropToGround snaps Y to the tile
      // terrain after load (ENU origin is on the WGS-84 ellipsoid,
      // not the actual street level).
      await handle.loadGlbAt(result.glbUrl, {
        x: pos.x,
        y: 0,
        z: pos.z,
        scale: 1,
        dropToGround: true,
        name: `prop_${i}`,
      });
      ok += 1;
    } catch (err) {
      console.error('[director-scene] prop loadGlbAt failed:', descriptions[i], err);
      fail += 1;
    }
  }
  return { ok, fail };
}

(async () => {
  try {
    // Wait for the scene to be anchored to the actual terrain before
    // dispatching cast/props — otherwise their first frame renders at
    // world y=0 (below the visible street) and the user sees them
    // "appear from underground" once the anchor lands. Anchor itself
    // has its own retry/timeout; we don't block forever.
    await anchorPromise;
    // Run props + cast in parallel — both are I/O bound and the
    // resolver server-side caps its own concurrency, so it's safe.
    const [props, cast] = await Promise.all([loadProps(), loadCast()]);
    if (directorMovement === 'tracking' && leadCastNode) {
      handle.setCameraLockedTarget(leadCastNode);
      console.log('[director-scene] camera locked to lead cast member');
    }
    setStatus(
      `${label} — props ${props.ok}/${props.ok + props.fail}, cast ${cast.ok}/${cast.ok + cast.fail}. Drag to orbit, scroll to zoom.`,
    );
  } catch (err) {
    setStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`, true);
    console.error(err);
  }
})();
