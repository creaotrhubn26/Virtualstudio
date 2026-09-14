import { Mesh, MeshBuilder, PBRMaterial, Scene, Vector3, Color3 } from '@babylonjs/core';

/** Babylon's default FOV is vertical; use the 24 mm height of a full-frame sensor. */
export function focalLengthToVerticalFov(focalLength: number, sensorHeight = 24): number {
  if (!Number.isFinite(focalLength) || focalLength <= 0 || !Number.isFinite(sensorHeight) || sensorHeight <= 0) {
    throw new RangeError('Focal length and sensor height must be positive finite values');
  }
  return 2 * Math.atan(sensorHeight / (2 * focalLength));
}

/** Floor → quarter circle → wall, with horizontal and vertical tangents at the joins. */
export function coveProfile(radius: number, height: number, depth: number, backZ: number, segments = 48): Vector3[] {
  const points = [new Vector3(0, 0, backZ - radius - depth)];
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI / 2;
    points.push(new Vector3(0, radius * (1 - Math.cos(angle)), backZ - radius + radius * Math.sin(angle)));
  }
  points.push(new Vector3(0, height, backZ));
  return points;
}

export function createStudioBackdrop(scene: Scene, id: string, scale: number, receiveShadows: boolean, cyclorama = false): Mesh {
  const width = (cyclorama ? 10 : 9) * scale;
  const profile = coveProfile(1.5 * scale, 5.5 * scale, 8 * scale, 5 * scale);
  // One surface avoids seams, inconsistent normals, and child transforms shifting the floor.
  const backdrop = MeshBuilder.CreateRibbon(`backdrop_${id}`, {
    pathArray: [-width / 2, width / 2].map(x => profile.map(p => new Vector3(x, p.y, p.z))),
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  backdrop.position.y = 0.015;
  const material = new PBRMaterial(`backdropMat_${id}`, scene);
  material.albedoColor = Color3.FromHexString('#b8b8b8');
  material.roughness = 0.95;
  material.metallic = 0;
  material.maxSimultaneousLights = 8;
  backdrop.material = material;
  backdrop.receiveShadows = receiveShadows;
  backdrop.metadata = { studioBackdrop: true };
  return backdrop;
}

/** A metre grid without the diagonals produced by a triangulated wireframe ground. */
export function createStudioGrid(scene: Scene): Mesh {
  const lines: Vector3[][] = [];
  for (let i = -10; i <= 10; i++) {
    lines.push([new Vector3(i, 0.025, -10), new Vector3(i, 0.025, 10)]);
    lines.push([new Vector3(-10, 0.025, i), new Vector3(10, 0.025, i)]);
  }
  const grid = MeshBuilder.CreateLineSystem('grid', { lines }, scene);
  grid.color = Color3.FromHexString('#687681');
  grid.alpha = 0.32;
  grid.isPickable = false;
  grid.metadata = { studioHelper: true };
  return grid;
}

/** Relative photographic exposure, calibrated at ISO 100, f/2.8, 1/125 s. */
export function studioExposure(iso: number, aperture: number, shutter: string, nd: number): number {
  const parts = shutter.replace(/s$/, '').trim().split('/').map(Number);
  const seconds = parts.length === 2 ? parts[0] / parts[1] : parts[0];
  if (![iso, aperture, seconds, nd].every(Number.isFinite) || iso <= 0 || aperture <= 0 || seconds <= 0) {
    throw new RangeError('Invalid photographic exposure settings');
  }
  return (iso / 100) * (2.8 / aperture) ** 2 * (seconds * 125) * 2 ** -nd;
}
