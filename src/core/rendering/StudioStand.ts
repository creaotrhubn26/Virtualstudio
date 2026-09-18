/**
 * Light stands and modifiers, built rather than imported.
 *
 * The stands that ship with the studio are generated GLBs: a dark slab on a
 * pole. They read as a placeholder from two metres away, and worse, their size
 * has nothing to do with the modifier the photometry is using — the shadow
 * softness is computed from a 90 × 120 softbox while the picture shows a box
 * of whatever size the model happened to be exported at.
 *
 * These are built from the fixture's own numbers, so what you see is the
 * modifier the maths is using: a 30 × 120 stripbox is tall and narrow on the
 * stand as well as crisp in the shadow. The stand under it is an ordinary
 * three-section steel stand with a tripod base, riser knuckles, a tilt head
 * and a cable, because those are the parts that make a stand read as a stand.
 *
 * It is all primitives, and cheap: a stand is about 1500 triangles, and the
 * parts that share a material are merged so it costs a handful of draw calls.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, Vector3 } from '@babylonjs/core';

export type ModifierShape = 'softbox' | 'stripbox' | 'octabox' | 'beautydish' | 'fresnel' | 'bare';

export interface StandSpec {
  /** Head height above the floor, metres. */
  headHeight: number;
  /** The modifier's emitting size, metres. A rectangle is given as width and height. */
  modifierWidth: number;
  modifierHeight: number;
  shape: ModifierShape;
  /** Colour of the light, so the diffusion glows the way the fixture does. */
  tint?: Color3;
  /** Whether the fixture is on, which decides if the front glows at all. */
  lit?: boolean;
}

interface StandParts {
  root: Mesh;
  materials: PBRMaterial[];
}

/** Which way the modifier points before the light aims it: down the +z axis. */
export const STAND_FORWARD = new Vector3(0, 0, 1);

function material(scene: Scene, name: string, colour: string, roughness: number, metallic: number): PBRMaterial {
  const made = new PBRMaterial(`studioStand_${name}`, scene);
  made.albedoColor = Color3.FromHexString(colour);
  made.roughness = roughness;
  made.metallic = metallic;
  made.maxSimultaneousLights = 8;
  return made;
}

/**
 * Build a stand with its modifier, returned as one mesh the caller owns.
 *
 * The head sits at the origin of the returned root facing +z, so the existing
 * aiming code can point it exactly as it points the imported models.
 */
export function buildStudioStand(scene: Scene, id: string, spec: StandSpec): StandParts {
  const steel = material(scene, `${id}_steel`, '#8d9195', 0.34, 0.85);
  const dark = material(scene, `${id}_dark`, '#1c1e21', 0.72, 0.1);
  const rubber = material(scene, `${id}_rubber`, '#141517', 0.92, 0);
  const silver = material(scene, `${id}_silver`, '#d8dce0', 0.22, 0.9);
  const cloth = material(scene, `${id}_cloth`, '#101215', 0.88, 0);

  const diffusion = material(scene, `${id}_diffusion`, '#f2f4f7', 0.58, 0);
  if (spec.lit !== false) {
    // The front of a softbox in use is the brightest thing in the room, and a
    // studio photograph without that is missing its most familiar shape.
    const tint = spec.tint ?? new Color3(1, 0.97, 0.92);
    diffusion.emissiveColor = tint.scale(0.55);
  }

  const materials = [steel, dark, rubber, silver, cloth, diffusion];
  const root = new Mesh(`${id}_stand`, scene);
  const parts: { mesh: Mesh; material: PBRMaterial }[] = [];

  const add = (mesh: Mesh, mat: PBRMaterial): Mesh => {
    mesh.parent = root;
    mesh.isPickable = false;
    parts.push({ mesh, material: mat });
    return mesh;
  };

  const head = Math.max(0.6, spec.headHeight);
  // The stand's own parts are positioned from the floor, and the whole thing
  // is lifted so the head lands at the origin.
  const floor = -head;

  // Tripod base: three legs, braced, on rubber feet.
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const reach = 0.36;
    const leg = add(MeshBuilder.CreateCylinder(`${id}_leg${i}`,
      { diameterTop: 0.022, diameterBottom: 0.03, height: 0.62, tessellation: 8 }, scene), steel);
    leg.position.set(Math.cos(angle) * reach * 0.5, floor + 0.27, Math.sin(angle) * reach * 0.5);
    leg.rotation.x = Math.cos(angle) * 0.62;
    leg.rotation.z = -Math.sin(angle) * 0.62;

    const foot = add(MeshBuilder.CreateCylinder(`${id}_foot${i}`,
      { diameter: 0.055, height: 0.03, tessellation: 10 }, scene), rubber);
    foot.position.set(Math.cos(angle) * reach, floor + 0.015, Math.sin(angle) * reach);

    const brace = add(MeshBuilder.CreateCylinder(`${id}_brace${i}`,
      { diameter: 0.014, height: 0.26, tessellation: 6 }, scene), steel);
    brace.position.set(Math.cos(angle) * reach * 0.34, floor + 0.44, Math.sin(angle) * reach * 0.34);
    brace.rotation.x = Math.cos(angle) * 1.05;
    brace.rotation.z = -Math.sin(angle) * 1.05;
  }
  const collar = add(MeshBuilder.CreateCylinder(`${id}_collar`,
    { diameter: 0.07, height: 0.07, tessellation: 12 }, scene), dark);
  collar.position.set(0, floor + 0.56, 0);

  // Three riser sections, each thinner than the one below, with a knuckle and
  // a locking knob where they meet — the detail that says "stand".
  const sections = 3;
  const riserHeight = (head - 0.56) / sections;
  for (let i = 0; i < sections; i++) {
    const diameter = 0.042 - i * 0.008;
    const riser = add(MeshBuilder.CreateCylinder(`${id}_riser${i}`,
      { diameter, height: riserHeight + 0.02, tessellation: 12 }, scene), steel);
    riser.position.set(0, floor + 0.56 + riserHeight * (i + 0.5), 0);

    if (i < sections - 1) {
      const knuckle = add(MeshBuilder.CreateCylinder(`${id}_knuckle${i}`,
        { diameter: diameter + 0.022, height: 0.05, tessellation: 12 }, scene), dark);
      knuckle.position.set(0, floor + 0.56 + riserHeight * (i + 1), 0);
      const knob = add(MeshBuilder.CreateCylinder(`${id}_knob${i}`,
        { diameter: 0.028, height: 0.038, tessellation: 10 }, scene), dark);
      knob.position.set(diameter * 0.5 + 0.022, floor + 0.56 + riserHeight * (i + 1), 0);
      knob.rotation.z = Math.PI / 2;
    }
  }

  // The tilt head the modifier hangs off.
  const tilt = add(MeshBuilder.CreateBox(`${id}_tilt`, { width: 0.07, height: 0.09, depth: 0.05 }, scene), dark);
  tilt.position.set(0, -0.055, -0.02);
  const tiltKnob = add(MeshBuilder.CreateCylinder(`${id}_tiltKnob`,
    { diameter: 0.034, height: 0.03, tessellation: 10 }, scene), steel);
  tiltKnob.position.set(0.05, -0.055, -0.02);
  tiltKnob.rotation.z = Math.PI / 2;

  buildModifier(scene, id, spec, add, { cloth, silver, diffusion, dark, steel });

  // A cable, hanging the way a cable hangs rather than running straight down.
  const cable = Array.from({ length: 18 }, (_, i) => {
    const t = i / 17;
    return new Vector3(
      Math.sin(t * 2.2) * 0.05,
      -0.1 - t * (head - 0.2),
      -0.06 - Math.sin(t * Math.PI) * 0.08,
    );
  });
  add(MeshBuilder.CreateTube(`${id}_cable`, { path: cable, radius: 0.008, tessellation: 6 }, scene), dark);

  // Merge by material so a stand is a few draw calls rather than forty.
  for (const mat of materials) {
    const group = parts.filter(part => part.material === mat).map(part => part.mesh);
    if (group.length < 2) {
      group.forEach(mesh => { mesh.material = mat; });
      continue;
    }
    group.forEach(mesh => mesh.computeWorldMatrix(true));
    const merged = Mesh.MergeMeshes(group, true, true, undefined, false, false);
    if (merged) {
      merged.name = `${id}_${mat.name}`;
      merged.material = mat;
      merged.parent = root;
      merged.isPickable = false;
    }
  }

  return { root, materials };
}

function buildModifier(
  scene: Scene,
  id: string,
  spec: StandSpec,
  add: (mesh: Mesh, material: PBRMaterial) => Mesh,
  mats: { cloth: PBRMaterial; silver: PBRMaterial; diffusion: PBRMaterial; dark: PBRMaterial; steel: PBRMaterial },
): void {
  const width = Math.max(0.12, spec.modifierWidth);
  const height = Math.max(0.12, spec.modifierHeight);
  const depth = Math.max(0.16, Math.min(width, height) * 0.72);

  if (spec.shape === 'bare' || spec.shape === 'fresnel') {
    // A hard source: a barrel with a lens, and barn doors on a fresnel.
    const barrel = add(MeshBuilder.CreateCylinder(`${id}_barrel`,
      { diameter: width, height: depth, tessellation: 20 }, scene), mats.dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -depth / 2;
    const lens = add(MeshBuilder.CreateDisc(`${id}_lens`,
      { radius: width * 0.46, tessellation: 22 }, scene), mats.diffusion);
    lens.position.z = 0.002;
    if (spec.shape === 'fresnel') {
      for (const [dx, dy, rz] of [[width * 0.5, 0, 0.5], [-width * 0.5, 0, -0.5], [0, width * 0.5, 0], [0, -width * 0.5, 0]]) {
        const door = add(MeshBuilder.CreateBox(`${id}_barnDoor`,
          { width: width * 0.9, height: width * 0.55, depth: 0.006 }, scene), mats.dark);
        door.position.set(dx * 0.8, dy * 0.8, -0.03);
        door.rotation.z = rz;
        door.rotation.x = dy !== 0 ? Math.sign(dy) * 0.6 : 0;
        door.rotation.y = dx !== 0 ? -Math.sign(dx) * 0.6 : 0;
      }
    }
    return;
  }

  // A speedring the rods socket into.
  const ring = add(MeshBuilder.CreateCylinder(`${id}_speedring`,
    { diameter: 0.16, height: 0.04, tessellation: 16 }, scene), mats.dark);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = -depth;

  const corners: [number, number][] = spec.shape === 'octabox'
    ? Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return [Math.cos(a) * width * 0.5, Math.sin(a) * height * 0.5];
      })
    : [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]];

  // Rods from the ring to each corner, which is what gives a softbox its shape.
  for (const [x, y] of corners) {
    const tip = new Vector3(x, y, 0);
    const base = new Vector3(0, 0, -depth);
    const rod = add(MeshBuilder.CreateTube(`${id}_rod`,
      { path: [base, tip], radius: 0.007, tessellation: 5 }, scene), mats.steel);
    rod.isVisible = true;
  }

  // The black outer skin, as four (or eight) panels between ring and front.
  for (let i = 0; i < corners.length; i++) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % corners.length];
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const span = Math.hypot(x2 - x1, y2 - y1);
    const slant = Math.hypot(Math.hypot(midX, midY), depth);
    const panel = add(MeshBuilder.CreatePlane(`${id}_skin${i}`,
      { width: span, height: slant, sideOrientation: Mesh.DOUBLESIDE }, scene), mats.cloth);
    panel.position.set(midX / 2, midY / 2, -depth / 2);
    panel.rotation.x = -Math.atan2(midY, depth);
    panel.rotation.y = Math.atan2(midX, depth);
    panel.rotation.z = Math.atan2(y2 - y1, x2 - x1);

    // The silver interior, a hair inside the skin.
    const inner = add(MeshBuilder.CreatePlane(`${id}_inner${i}`,
      { width: span * 0.96, height: slant * 0.96, sideOrientation: Mesh.DOUBLESIDE }, scene), mats.silver);
    inner.position.copyFrom(panel.position);
    inner.position.z += 0.004;
    inner.rotation.copyFrom(panel.rotation);
  }

  // The front diffusion, which is the light as far as the subject is concerned.
  const front = spec.shape === 'octabox'
    ? MeshBuilder.CreateDisc(`${id}_front`, { radius: width * 0.5, tessellation: 24 }, scene)
    : MeshBuilder.CreatePlane(`${id}_front`, { width, height }, scene);
  add(front, mats.diffusion);
  front.position.z = 0.004;

  // A recessed inner baffle, visible as the second surface a real box has.
  const baffle = spec.shape === 'octabox'
    ? MeshBuilder.CreateDisc(`${id}_baffle`, { radius: width * 0.34, tessellation: 20 }, scene)
    : MeshBuilder.CreatePlane(`${id}_baffle`, { width: width * 0.62, height: height * 0.62 }, scene);
  add(baffle, mats.diffusion);
  baffle.position.z = -depth * 0.45;
}

/** Everything a stand owns, so a fixture can take its stand away with it. */
export function disposeStudioStand(parts: StandParts): void {
  parts.root.dispose(false, true);
  parts.materials.forEach(material => material.dispose(true, true));
}
