/**
 * LocationScene — stream Google Photorealistic 3D Tiles into a Babylon
 * scene at any (lat, lon) on Earth. Self-contained: own Engine, own
 * Scene with right-handed orientation (required by 3d-tiles-renderer's
 * Babylon adapter). Mounts on a <canvas> element passed by the caller;
 * does NOT touch the main studio scene.
 *
 * Why this exists
 * ---------------
 * The studio Scene Director gives us "any controlled environment with
 * studio lights". For "any real-world location" (the user's "middle of
 * New York" ask) we need photogrammetric meshes streamed live. Google's
 * 3D Tiles deliver that — accessed either directly with a Map Tiles API
 * key, or through Cesium ion's asset 2275207 (better caching/quota).
 *
 * Coordinate frame
 * ----------------
 * The tileset coordinates are ECEF (Earth-Centered, Earth-Fixed —
 * meters, origin at planet center, axes aligned with WGS84). At those
 * scales (~6.378 × 10^6 m) float32 quickly loses sub-meter precision.
 * Two ways to deal with it:
 *
 *   1. Babylon 9.0 ships GeospatialCamera + useLargeWorldRendering that
 *      keep the camera at the origin and shift geometry shader-side.
 *   2. We're on Babylon 8.42, so we localize manually: build an
 *      East-North-Up (ENU) basis at the requested lat/lon, attach an
 *      inverse transform to the tileset root so that point sits at
 *      world (0, 0, 0). Anything we add (a 1.78 m human, a camera
 *      orbiting the area) lives in small local coordinates and float32
 *      precision holds for a city-block-scale region.
 *
 * Trade-off: the localized approach can't render a planet (camera
 * would shoot off into ECEF land). It can render any one local area
 * crisply. That matches "stand in the middle of New York" perfectly.
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { Ray } from '@babylonjs/core/Culling/ray';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Node } from '@babylonjs/core/node';
import '@babylonjs/core/Animations/animatable';
import { iesForModifier } from '../data/modifierIESMap';
import { applyIESToSpotLight, parseIES } from '../services/iesProfileService';
import { lightWorldPosition } from '../services/applySceneAssembly';
import type { LightingPlan, LightSource } from '../services/sceneDirectorClient';
import { buildLightingSpec, kelvinToColor3 } from './locationLighting';
import type { TimeOfDay } from './locationLighting';
import { applyMovement } from './cameraMovements';
import type { ShotMovement, MovementHandle } from './cameraMovements';
// Named import (not pure-side-effect) so Vite/Rollup can't tree-shake
// the glTF loader registration. Without `GLTFFileLoader` referenced,
// SceneLoader.LoadAssetContainerAsync('.glb') returns "No plugin or
// fallback for .glb" — and the 3d-tiles-renderer's b3dm path also
// fails with `file:https://…` URL errors because it falls back to
// Babylon's SceneLoader internally.
import { GLTFFileLoader } from '@babylonjs/loaders/glTF';
// Pin the import so the bundler keeps it. Reading the constructor at
// load-time triggers the side-effect that registers the plugin.
void GLTFFileLoader;

import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import {
  CesiumIonAuthPlugin,
  GoogleCloudAuthPlugin,
} from '3d-tiles-renderer/core/plugins';

// WGS84 ellipsoid constants — used for lat/lon → ECEF.
const PLANET_RADIUS = 6378137; // semi-major axis (a)
const WGS84_F = 1 / 298.257223563; // flattening
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;

// Cesium ion's published asset id for Google Photorealistic 3D Tiles.
// Stable since 2023; see https://cesium.com/learn/3d-tiles/photorealistic-3d-tiles/
// Stored as string because the plugin's TS types accept string|null.
const GOOGLE_TILES_ION_ASSET_ID = '2275207';

export interface LocationSceneOptions {
  /** Latitude in degrees (e.g. 40.7484 for Empire State). */
  lat: number;
  /** Longitude in degrees (e.g. -73.9857). */
  lon: number;
  /** Camera orbit radius in metres. Default 600 = "feels like helicopter". */
  initialRadiusM?: number;
  /**
   * Auth provider preference. "ion" uses Cesium ion (Google tileset via
   * asset 2275207) — usually has better caching. "google" uses the
   * Google Map Tiles API directly. Defaults to "ion" when its token is
   * present, else "google".
   */
  preferredProvider?: 'ion' | 'google';
  /**
   * Screen-space pixel error target. Lower = sharper but more bandwidth.
   * Default 16 is comfortable for dev; 6–10 for hero shots; 24+ for
   * minimum bandwidth.
   */
  errorTarget?: number;
  /**
   * Director-level scene mood — drives sun direction/colour, ambient
   * fill, scene exposure, and fog density. Defaults to DAY when the
   * caller doesn't pass one. Caller can also call
   * `handle.setTimeOfDay(...)` later to swap.
   */
  timeOfDay?: TimeOfDay;
}

export interface LoadedGlb {
  /** The AssetContainer Babylon returns — keep it so callers can dispose. */
  container: AssetContainer;
  /** Root node (parent of every loaded mesh). Move/rotate/scale this. */
  root: TransformNode;
  /** Original URL — useful for logs and reload. */
  url: string;
}

export interface PlacedDirectorLight {
  source: LightSource;
  light: SpotLight;
  worldPosition: { x: number; y: number; z: number };
  iesAttached: boolean;
}

export interface LocationSceneHandle {
  engine: Engine;
  scene: Scene;
  tiles: any; // TilesRenderer doesn't export its type cleanly
  setLatLon: (lat: number, lon: number) => void;
  /**
   * Load a GLB at a local-ENU position relative to the lat/lon origin.
   * Position is in metres: `x` = east, `y` = up, `z` = north (right-
   * handed Babylon convention). Default y=0 puts the model on the
   * ground plane. Returns the AssetContainer + a parent TransformNode
   * the caller can move further if needed.
   */
  loadGlbAt: (
    url: string,
    options?: {
      x?: number;
      y?: number;
      z?: number;
      scale?: number;
      name?: string;
      /**
       * Auto-start the first AnimationGroup the GLB ships with.
       * Defaults to false. For Meshy walk/run GLBs (which embed a
       * skinned animation cycle) set true.
       */
      autoplayFirstAnimation?: boolean;
      /**
       * Loop the animation. Defaults to true (only relevant when
       * autoplayFirstAnimation is true).
       */
      loop?: boolean;
      /**
       * After load, raycast straight down onto the tile geometry
       * and snap the asset's Y to the hit point. Default false —
       * pass true for cast/props that should sit on terrain (the
       * ENU origin sits on the WGS-84 ellipsoid surface, often
       * tens of metres off the actual ground).
       */
      dropToGround?: boolean;
    },
  ) => Promise<LoadedGlb>;
  /**
   * Frame the camera on a moving subject — Babylon's
   * `ArcRotateCamera.lockedTarget` re-reads the node's world position
   * every frame, so as the subject is animated/translated the camera
   * follows. Pass null to release.
   */
  setCameraLockedTarget: (node: TransformNode | null) => void;
  /** Set camera radius (distance from target) in metres. */
  setCameraRadius: (radiusM: number) => void;
  /**
   * Load an HDRI from URL and assign it as `scene.environmentTexture`,
   * driving IBL for every PBR material in the scene. Without this,
   * PBR characters/props (Meshy outputs are PBR) read as flat grey —
   * spotlights provide direct illumination but there's no ambient
   * indirect lighting to fill shadows or tint the rim. Returns true
   * when the texture was scheduled for load (it loads async; PBR
   * materials pick it up once ready).
   */
  setEnvironmentHDRI: (url: string, intensity?: number) => boolean;
  /**
   * Swap the time-of-day baseline (sun direction, ambient fill,
   * exposure, fog). Re-runs the astronomical calc against the
   * current lat/lon and `Date.now()`. The director can call this
   * mid-scene to do "same place, different time".
   */
  setTimeOfDay: (time: TimeOfDay) => void;
  /**
   * Apply the SAME LightingPlan the studio uses (key/fill/rim/practical
   * with real IES profiles + CCT-driven colour + spherical placement).
   * Re-callable: each call disposes the previous director-owned
   * SpotLights so the rig stays clean.
   *
   * `subject` is the world-space anchor the lights aim at — defaults
   * to (0, 1.65, 0) which puts a 1.65m head where the lat/lon origin
   * sits on the ground plane.
   */
  applyDirectorLighting: (
    lighting: LightingPlan,
    subject?: { x: number; y: number; z: number },
  ) => Promise<PlacedDirectorLight[]>;
  /**
   * Apply the director's `shot.movement` choice as a real camera
   * animation (pan / tilt / dolly / handheld / tracking). Auto-cancels
   * any prior movement before applying the new one. `static` is a
   * no-op; the camera stays exactly where it is.
   */
  setCameraMovement: (movement: ShotMovement) => void;
  dispose: () => void;
}

/**
 * Convert WGS84 (lat, lon, alt) to ECEF (x, y, z) in metres.
 * Standard textbook formulation; double precision throughout, the
 * result downcasts to float at scene insert.
 */
function latLonAltToEcef(latDeg: number, lonDeg: number, alt: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  const N = PLANET_RADIUS / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  return [
    (N + alt) * cosLat * cosLon,
    (N + alt) * cosLat * sinLon,
    (N * (1 - WGS84_E2) + alt) * sinLat,
  ];
}

/**
 * Build a 4×4 transform that takes any ECEF point and expresses it in
 * the local East-North-Up frame at (lat0, lon0). Origin of the local
 * frame is `ecef0` (the ECEF coords of (lat0, lon0, 0)).
 *
 * Mathematically this is: `local = R^T · (ecef − ecef0)` where R is
 * the ENU basis at (lat0, lon0). Babylon's Matrix is column-major; we
 * store the transposed-rotation directly so the same matrix applied
 * to a child TransformNode shifts the entire tileset to local origin.
 */
function buildEcefToLocalEnu(latDeg: number, lonDeg: number): Matrix {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  // ENU basis vectors at (lat, lon):
  // east  = (-sinλ,             cosλ,  0)
  // north = (-sinφ·cosλ,  -sinφ·sinλ,  cosφ)
  // up    = ( cosφ·cosλ,   cosφ·sinλ,  sinφ)
  const ex = -sinLon;
  const ey = cosLon;
  const ez = 0;
  const nx = -sinLat * cosLon;
  const ny = -sinLat * sinLon;
  const nz = cosLat;
  const ux = cosLat * cosLon;
  const uy = cosLat * sinLon;
  const uz = sinLat;

  const [tx, ty, tz] = latLonAltToEcef(latDeg, lonDeg, 0);

  // Babylon's RH world axes are (X=right, Y=up, Z=back). To match the
  // intuition "ground is the XZ plane and Y points to the sky" the
  // ENU basis must be remapped:
  //
  //     east  → Babylon X
  //     up    → Babylon Y       ← swapped from "north" so buildings
  //     north → Babylon Z         actually point upward, not into the
  //                               screen. (The original mapping put
  //                               'up' along Z, which made Manhattan
  //                               appear lying-on-its-back from the
  //                               default ArcRotateCamera angle —
  //                               i.e. "upside down".)
  //
  // Matrix.FromValues is column-major. We're constructing M such that
  // world = M · ecef → world.x = e·(ecef-ecef0), world.y = u·(...),
  // world.z = n·(...). Each column below is (M[0,i], M[1,i], M[2,i],
  // M[3,i]); rows are (east, up, north).
  return Matrix.FromValues(
    // col 0 = ECEF X factor → contributes to (east·X, up·Y, north·Z)
    ex, ux, nx, 0,
    // col 1 = ECEF Y factor
    ey, uy, ny, 0,
    // col 2 = ECEF Z factor
    ez, uz, nz, 0,
    // col 3 = translation in (east, up, north) at the origin
    -(ex * tx + ey * ty + ez * tz),
    -(ux * tx + uy * ty + uz * tz),
    -(nx * tx + ny * ty + nz * tz),
    1,
  );
}

export function mountLocationScene(
  canvas: HTMLCanvasElement,
  opts: LocationSceneOptions,
): LocationSceneHandle {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    // Antialias is on by default — keep it; the photogrammetry has
    // sharp building edges that benefit a lot.
  });
  const scene = new Scene(engine);
  // 3d-tiles-renderer's Babylon adapter requires right-handed; the
  // tileset's ECEF axes don't make sense in left-handed Babylon space.
  scene.useRightHandedSystem = true;
  // Sky colour while tiles stream in — better than the default ugly
  // grey. Real sky comes from the photogrammetry itself once loaded.
  scene.clearColor = new Color4(0.55, 0.7, 0.85, 1);
  scene.ambientColor = new Color3(0.4, 0.4, 0.45);

  // ENU origin lives at world (0, 0, 0). The camera orbits it.
  const camera = new ArcRotateCamera(
    'locCam',
    Math.PI / 2,
    Math.PI / 3,
    opts.initialRadiusM ?? 600,
    Vector3.Zero(),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.minZ = 1;
  camera.maxZ = 50_000;
  camera.wheelDeltaPercentage = 0.02;
  // Allow the camera to come right up to the subject (humans are
  // ~1.78 m tall; an action-scene close-up wants 2–4 m radius).
  // The previous 50 m floor was sized for city-scale establishing
  // shots and silently clamped every director-driven shot to a
  // helicopter view of the cast, no matter what cameraDistanceM
  // the ShotPlan asked for.
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 20_000;

  // ---- lighting ------------------------------------------------------
  // The 3D Tiles photogrammetry encodes captured lighting in its
  // diffuse textures, but anything we drop on top (props, characters)
  // needs analytical lights to read as PBR. Two layers:
  //
  //   1. ENVIRONMENT — sun (or moon) + hemispheric ambient,
  //      driven by `buildLightingSpec(lat, lon, timeOfDay, now)`.
  //      Runs astronomical sun calc against the lat/lon so DAY scenes
  //      get an actually-correct sun direction, NIGHT scenes get a
  //      cool fill, DUSK scenes get a low warm rim, etc. Re-applied
  //      whenever `setTimeOfDay()` is called.
  //
  //   2. DIRECTOR RIG — the same LightingPlan the studio uses (key /
  //      fill / rim / practical with real IES profiles + CCT-driven
  //      colour). Created lazily by `applyDirectorLighting()`. We
  //      keep this layer separate from the env so the director can
  //      add/remove lights without touching the sun.
  const ambient = new HemisphericLight(
    'locAmbient',
    new Vector3(0, 1, 0),
    scene,
  );
  const sun = new DirectionalLight(
    'locSun',
    new Vector3(0, -1, 0),  // overridden by applyEnvLighting below
    scene,
  );

  function applyEnvLighting(time: TimeOfDay): void {
    const spec = buildLightingSpec(opts.lat, opts.lon, time);
    ambient.intensity = spec.ambient.intensity;
    ambient.diffuse = spec.ambient.diffuse;
    ambient.groundColor = spec.ambient.groundColor;
    sun.direction = spec.sun.direction;
    sun.intensity = spec.sun.intensity;
    sun.diffuse = spec.sun.diffuse;
    scene.clearColor = new Color4(
      spec.scene.clearColor.r,
      spec.scene.clearColor.g,
      spec.scene.clearColor.b,
      1,
    );
    scene.imageProcessingConfiguration.exposure = spec.scene.exposure;
    if (spec.scene.fogDensity > 0) {
      scene.fogMode = 3; // FOGMODE_EXP
      scene.fogColor = spec.scene.clearColor;
      scene.fogDensity = spec.scene.fogDensity;
    } else {
      scene.fogMode = 0;
    }
    console.log(
      `[LocationScene] env lighting → time=${time}  sun.alt=${spec.sun.altitudeDeg.toFixed(1)}°  ` +
      `${spec.sun.isMoonlight ? 'MOONLIGHT' : 'sunlight'}  exposure=${spec.scene.exposure}`,
    );
  }
  applyEnvLighting(opts.timeOfDay ?? 'DAY');

  // ---- token resolution ---------------------------------------------
  const ionToken =
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_CESIUM_ION_TOKEN || '';
  const googleKey =
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_GOOGLE_MAP_TILES_KEY || '';
  const provider =
    opts.preferredProvider ?? (ionToken ? 'ion' : googleKey ? 'google' : 'ion');

  if (provider === 'ion' && !ionToken) {
    throw new Error(
      'LocationScene: VITE_CESIUM_ION_TOKEN missing — set it in .env or pass preferredProvider: "google"',
    );
  }
  if (provider === 'google' && !googleKey) {
    throw new Error(
      'LocationScene: VITE_GOOGLE_MAP_TILES_KEY missing — set it in .env or pass preferredProvider: "ion"',
    );
  }

  // ---- tileset --------------------------------------------------------
  // First arg is the tileset URL; the auth plugin overrides it at
  // runtime, so an empty string is safe (and matches the canonical
  // Babylon example, which passes `null` despite the TS type).
  const tiles: any = new TilesRenderer('', scene);
  tiles.errorTarget = opts.errorTarget ?? 16;
  if (provider === 'ion') {
    tiles.registerPlugin(
      new CesiumIonAuthPlugin({
        apiToken: ionToken,
        assetId: GOOGLE_TILES_ION_ASSET_ID,
        autoRefreshToken: true,
      }),
    );
  } else {
    tiles.registerPlugin(
      new GoogleCloudAuthPlugin({
        apiToken: googleKey,
        autoRefreshToken: true,
      }),
    );
  }

  // The tileset attaches its meshes to `tiles.group` (a Babylon
  // TransformNode in the Babylon adapter). We parent that to a holder
  // node and apply the ECEF→local-ENU matrix as the holder's transform.
  // Updating the matrix later (setLatLon) re-localises without
  // rebuilding the tileset.
  const holder = new TransformNode('locHolder', scene);
  if (tiles.group instanceof TransformNode) {
    tiles.group.parent = holder;
  } else {
    // Defensive — adapter API has shifted between versions; if .group
    // isn't a TransformNode, attach via the scene's root so loaded tile
    // meshes still inherit our transform once they parent themselves.
    console.warn(
      '[LocationScene] tiles.group is not a TransformNode; ECEF→ENU may be incomplete',
    );
  }

  function applyLocalisation(latDeg: number, lonDeg: number) {
    const m = buildEcefToLocalEnu(latDeg, lonDeg);
    // Decompose into scale/rotation/translation and feed each into the
    // holder. This is the cleanest cross-version path (Babylon's
    // TransformNode doesn't expose a public "set world matrix" setter).
    const scaling = new Vector3();
    const rotation = new Quaternion();
    const position = new Vector3();
    m.decompose(scaling, rotation, position);
    holder.scaling = scaling;
    holder.rotationQuaternion = rotation;
    holder.position = position;
  }
  applyLocalisation(opts.lat, opts.lon);

  // Poll-update the tileset every frame; LOD / streaming runs in here.
  scene.onBeforeRenderObservable.add(() => {
    if (typeof tiles.update === 'function') tiles.update();
  });

  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  // GLB asset root — every loaded prop / character ends up parented to
  // this node so the operator can inspect what's been spawned, hide the
  // whole crowd at once, etc.
  const assetsRoot = new TransformNode('locAssets', scene);

  /**
   * Snap a node's Y to the tile geometry directly underneath it.
   *
   * The ECEF→ENU origin sits on the WGS-84 ellipsoid surface — but real
   * terrain rarely does. NYC's geoid is ~30 m below the ellipsoid so
   * Manhattan tile geometry lands at roughly y = −30 m in our world,
   * which means a character placed naively at y = 0 floats ~30 m above
   * the street. Same problem affects every ENU-anchored location.
   *
   * The fix: cast a ray straight down from well above `node` and snap
   * its Y to the first hit on the tile geometry. Picks are filtered to
   * descendants of `holder` (the tiles' parent) so we never snap onto
   * an asset placed earlier in the same scene.
   *
   * Returns true on a successful snap, false when no tile geometry was
   * found below the node — typical when 3D Tiles streaming hasn't
   * delivered the chunk under the subject yet. Callers retry with a
   * delay; see loadGlbAt below.
   */
  function isUnderTilesHolder(mesh: AbstractMesh): boolean {
    let p: Node | null = mesh;
    for (let i = 0; i < 16 && p; i++) {
      if (p === holder) return true;
      p = p.parent;
    }
    return false;
  }

  function dropToGround(node: TransformNode, fromAboveM = 200, maxDownM = 800): boolean {
    const here = node.getAbsolutePosition().clone();
    here.y += fromAboveM;
    const ray = new Ray(here, new Vector3(0, -1, 0), maxDownM);
    const pick = scene.pickWithRay(ray, (mesh) => isUnderTilesHolder(mesh as AbstractMesh));
    if (!pick?.hit || !pick.pickedPoint) return false;
    const delta = pick.pickedPoint.y - node.getAbsolutePosition().y;
    node.position.y += delta;
    return true;
  }

  async function loadGlbAt(
    url: string,
    options: {
      x?: number;
      y?: number;
      z?: number;
      scale?: number;
      name?: string;
      autoplayFirstAnimation?: boolean;
      loop?: boolean;
      /**
       * After load, raycast straight down onto the tile geometry and
       * snap the asset's Y to the hit point. Default false — keep
       * loadGlbAt primitive and let callers opt in. Director-driven
       * cast and props pass true; location-test debugging passes
       * the user-supplied Y verbatim by leaving this unset.
       */
      dropToGround?: boolean;
    } = {},
  ): Promise<LoadedGlb> {
    if (!url) throw new Error('loadGlbAt: empty url');
    // SceneLoader.LoadAssetContainerAsync resolves to an AssetContainer
    // — gives us isolated meshes/materials/animations we can freely
    // dispose later without nuking unrelated scene assets.
    const container = await SceneLoader.LoadAssetContainerAsync(
      '',         // rootUrl — pass empty + full URL in `sceneFilename`
      url,
      scene,
      undefined,
      '.glb',
    );
    container.addAllToScene();

    // Build a holder so we can position the whole asset uniformly
    // regardless of how the GLB authored its own root transforms.
    const root = new TransformNode(
      options.name || `glb_${url.split('/').pop()?.split('?')[0] || 'asset'}`,
      scene,
    );
    root.parent = assetsRoot;
    root.position = new Vector3(options.x ?? 0, options.y ?? 0, options.z ?? 0);
    if (options.scale && options.scale > 0) {
      root.scaling = new Vector3(options.scale, options.scale, options.scale);
    }
    // Re-parent every transform-root the GLB shipped to our holder so
    // the ENU offset applies cleanly. AssetContainer keeps the scene
    // graph; we just shift parentage.
    for (const node of container.rootNodes) {
      node.parent = root;
    }

    // Auto-play the first AnimationGroup if asked. AssetContainer
    // imports register groups but never auto-start (unlike
    // ImportMeshAsync which does); we have to call .start(loop)
    // ourselves. For Meshy's walk/run GLBs this is the difference
    // between a frozen mannequin and an actually-running cast member.
    if (options.autoplayFirstAnimation && container.animationGroups.length > 0) {
      const group = container.animationGroups[0];
      const loop = options.loop ?? true;
      try {
        group.start(loop);
      } catch (err) {
        console.warn(
          `[LocationScene] failed to start animation on ${url.split('/').pop()}:`,
          err,
        );
      }
    }
    // Snap-to-terrain. Tiles stream in based on camera frustum, so the
    // tile under (x,z) might not have arrived yet when this fires. Try
    // immediately, then again twice with backoff — the second/third
    // attempt almost always wins once tiles populate around the
    // subject.
    if (options.dropToGround === true) {
      const tryDrop = (attempt: number) => {
        if (dropToGround(root)) return;
        if (attempt < 3) setTimeout(() => tryDrop(attempt + 1), 1500 * attempt);
      };
      tryDrop(1);
    }

    return { container, root, url };
  }

  // ---- director-owned IES rig ---------------------------------------
  //
  // The studio's `applySceneAssembly` places lights via the global
  // `virtualStudio.addLight(...)` (which also spawns physical fixture
  // GLBs). LocationScene doesn't need fixture meshes on Manhattan, so
  // this is a leaner Babylon-only path that produces the SAME final
  // photometric result:
  //   • SpotLight per source at sphericalToCartesian + subject offset
  //   • IES profile via the shared modifier→IES map + parser
  //   • CCT → diffuse Color3 via Tanner Helland in locationLighting
  //   • Inverse-square falloff
  //
  // We dispose previous director-owned lights on each call so the
  // operator can iterate the rig from the UI without leaking lights.
  let directorRig: PlacedDirectorLight[] = [];

  function disposeDirectorRig(): void {
    for (const placed of directorRig) {
      try {
        placed.light.dispose();
      } catch {
        /* noop */
      }
    }
    directorRig = [];
  }

  async function applyDirectorLighting(
    lighting: LightingPlan,
    subject: { x: number; y: number; z: number } = { x: 0, y: 1.65, z: 0 },
  ): Promise<PlacedDirectorLight[]> {
    disposeDirectorRig();
    const sources = lighting.sources ?? [];

    // SpotLight construction is synchronous, so the lights are all
    // created in iteration order before any await. The IES fetches
    // then race in parallel — five lights × cold-cache IES used to
    // serialise into 5× round-trip latency. Promise.all gives back
    // results in the same order Promise.all preserves on inputs, so
    // the rig's audit log still reads top-to-bottom.
    const placed = await Promise.all(
      sources.map(async (source: LightSource, i: number) => {
        // Right-handed convention (Cesium/3D-Tiles); see lightWorldPosition.
        const worldPos = lightWorldPosition(source, subject, { handedness: 'RH' });
        const aimAt = new Vector3(subject.x, subject.y, subject.z);
        const position = new Vector3(worldPos.x, worldPos.y, worldPos.z);
        const dir = aimAt.subtract(position).normalize();
        const light = new SpotLight(
          `dir_${source.role}_${i}`,
          position,
          dir,
          Math.PI / 3,   // half-angle (overridden by IES if attached)
          2,              // exponent (overridden)
          scene,
        );
        // CCT → colour via the shared Helland approximation in
        // locationLighting; keeps the colour model consistent across
        // sun/moon/practical sources. Falls back to neutral when CCT is
        // missing or zero.
        const cct = Number.isFinite(source.colorTempKelvin) && source.colorTempKelvin > 0
          ? source.colorTempKelvin
          : 5600;
        light.diffuse = kelvinToColor3(cct);
        // Intensity is director-relative (0..1). Map to PBR scene-units —
        // we use a base of 200 (analogous to a Profoto B10 modeling
        // light at ~600 cd) scaled by the source's relative weight.
        light.intensity = Math.max(0, source.intensity) * 200;
        // Physical inverse-square so the spread feels right without
        // tuning per-light.
        light.falloffType = 1; // FALLOFF_PHYSICAL
        light.range = 50;

        // Attempt IES — same modifier map + parser as the studio scene.
        let iesAttached = false;
        const iesMatch = iesForModifier(source.modifier);
        if (iesMatch) {
          try {
            const resp = await fetch(iesMatch.url);
            if (resp.ok) {
              const text = await resp.text();
              const profile = parseIES(text, iesMatch.filename);
              const preservedAngle = light.angle;
              applyIESToSpotLight(light, profile, scene);
              if (iesMatch.preserveBeamAngle) light.angle = preservedAngle;
              iesAttached = true;
            }
          } catch (err) {
            console.warn(`[LocationScene] IES fetch/parse failed for ${source.modifier}:`, err);
          }
        }

        return { source, light, worldPosition: worldPos, iesAttached };
      }),
    );

    directorRig = placed;
    console.log(
      `[LocationScene] director rig applied — ${placed.length} lights, ` +
      `${placed.filter((p) => p.iesAttached).length} with real IES`,
    );
    return placed;
  }

  // Track the active camera-movement handle so re-applying cancels
  // the previous animation before starting the new one.
  let activeMovement: MovementHandle | null = null;

  return {
    engine,
    scene,
    tiles,
    setLatLon(lat: number, lon: number) {
      applyLocalisation(lat, lon);
    },
    loadGlbAt,
    setTimeOfDay(time: TimeOfDay) {
      applyEnvLighting(time);
    },
    applyDirectorLighting,
    setCameraMovement(movement: ShotMovement) {
      try {
        activeMovement?.dispose();
      } catch {
        /* noop */
      }
      activeMovement = applyMovement(scene, camera, movement);
    },
    setCameraLockedTarget(node: TransformNode | null) {
      // Babylon's ArcRotateCamera.lockedTarget re-reads the node's
      // world matrix every frame — perfect for following an animated
      // subject (cast member running through the scene). null releases
      // the lock and reverts to the static `target` Vector3.
      camera.lockedTarget = node;
    },
    setCameraRadius(radiusM: number) {
      camera.radius = Math.max(camera.lowerRadiusLimit ?? 1, Math.min(camera.upperRadiusLimit ?? 50_000, radiusM));
    },
    setEnvironmentHDRI(url: string, intensity = 1.0): boolean {
      // PBR materials on the loaded cast/props need an environmentTexture
      // for IBL — without it Meshy's PBR outputs render as flat grey
      // because there's no ambient indirect lighting. HDRCubeTexture
      // loads async; PBR materials sample it once ready, so we can
      // assign and forget. We dispose any previous env to avoid GPU
      // leaks when the operator iterates the HDRI choice.
      try {
        const previous = scene.environmentTexture;
        // 256 = balanced quality/speed for a sky env — high enough to
        // not show banding on smooth metals, low enough to keep the
        // mip chain cheap on mid-range GPUs.
        const tex = new HDRCubeTexture(url, scene, 256);
        scene.environmentTexture = tex;
        scene.environmentIntensity = Math.max(0, intensity);
        if (previous) {
          try { previous.dispose(); } catch { /* noop */ }
        }
        return true;
      } catch (err) {
        console.warn(`[LocationScene] setEnvironmentHDRI failed for ${url}:`, err);
        return false;
      }
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      try {
        activeMovement?.dispose();
      } catch {
        /* noop */
      }
      disposeDirectorRig();
      try {
        tiles?.dispose?.();
      } catch {
        /* noop */
      }
      scene.dispose();
      engine.dispose();
    },
  };
}
