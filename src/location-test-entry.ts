/**
 * Standalone entry for the Google 3D Tiles location-scene test page.
 * Mounts a self-contained Babylon scene that streams photogrammetric
 * tiles for the requested (lat, lon). Reads `lat` / `lon` / `provider`
 * from the URL query string so you can drop different coordinates in
 * without code changes.
 *
 * Try in dev:
 *   http://localhost:5003/location-test.html?lat=40.7484&lon=-73.9857
 *   http://localhost:5003/location-test.html?lat=51.5007&lon=-0.1246
 *   http://localhost:5003/location-test.html?lat=35.6586&lon=139.7454
 */

// Pin the glTF loader at the entry-point level — see commentary in
// director-scene-entry.ts. Without this Vite can split the chunk so
// the side-effect import in LocationScene.ts disappears, and
// 3d-tiles-renderer's b3dm decoder fails on every tile.
import { GLTFFileLoader } from '@babylonjs/loaders/glTF';
void GLTFFileLoader;

import { mountLocationScene } from './scenes/LocationScene';

const params = new URLSearchParams(window.location.search);
const lat = Number(params.get('lat') ?? 40.7484);   // Empire State Building
const lon = Number(params.get('lon') ?? -73.9857);
const provider = params.get('provider') as 'ion' | 'google' | null;
const errorTarget = Number(params.get('errorTarget') ?? 16);

const status = document.getElementById('status');
const set = (msg: string, isError = false) => {
  if (!status) return;
  status.textContent = msg;
  status.style.color = isError ? '#ff8888' : '#cccccc';
};

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
if (!canvas) {
  set('Could not find #renderCanvas in the DOM', true);
  throw new Error('canvas missing');
}

set(`Loading tiles for (${lat.toFixed(4)}, ${lon.toFixed(4)}) via ${provider ?? 'auto'}…`);

try {
  const handle = mountLocationScene(canvas, {
    lat,
    lon,
    preferredProvider: provider ?? undefined,
    errorTarget,
  });
  set(
    `Streaming tiles. drag = orbit, scroll = zoom. lat=${lat.toFixed(6)} lon=${lon.toFixed(6)} provider=${
      provider ?? 'auto'
    } errorTarget=${errorTarget}`,
  );
  // Expose for debugging from the JS console.
  (window as unknown as { locationScene?: typeof handle }).locationScene = handle;

  // Optional `?glb=<url>` for compositing test — drop a prop on top of
  // the photogrammetric tiles. Use ?glb=&glbX=&glbY=&glbZ=&glbScale=
  // to position it. Useful for smoke-testing prop+location compositing
  // without touching the Scene Director.
  const glbUrl = params.get('glb');
  if (glbUrl) {
    const glbX = Number(params.get('glbX') ?? 0);
    const glbY = Number(params.get('glbY') ?? 0);
    const glbZ = Number(params.get('glbZ') ?? 0);
    const glbScale = Number(params.get('glbScale') ?? 1);
    handle
      .loadGlbAt(glbUrl, { x: glbX, y: glbY, z: glbZ, scale: glbScale, name: 'queryParamGlb' })
      .then((loaded) => {
        set(
          `Tiles streaming + prop loaded ` +
            `(${loaded.container.meshes.length} meshes) at (${glbX}, ${glbY}, ${glbZ})`,
        );
      })
      .catch((err) => {
        console.error('GLB load failed', err);
        set(`Tiles streaming, prop FAILED: ${err.message}`, true);
      });
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  set(`Failed to mount: ${msg}`, true);
  console.error(err);
}
