/**
 * GLB Normalization Service
 *
 * Fixes orientation issues that are common in AI-generated (Trellis/Tripo) GLB models:
 *  1. Y-flip  (model upside-down)         → rotate 180° around Z
 *  2. Z-up export (Z is the tall axis)    → rotate -90° around X
 *  3. Ground snap (minY off the floor)    → translate so lowest vertex sits at Y = 0
 *  4. Camera-facing default yaw           → rotate so the front/face looks toward -Z
 *
 * All corrections are baked into a single wrapper TransformNode.
 * The caller can then position/scale that wrapper freely.
 */

import * as BABYLON from '@babylonjs/core';

export interface NormalizeOptions {
  snapToGround?: boolean;         // default true
  faceCamera?: boolean;           // default true — turn front face toward -Z
  targetHeight?: number;          // if set, scale uniformly so total height = targetHeight
  lightHeadJointFraction?: number; // 0-1, where to split stand vs head (default 0.72)
}

export interface NormalizedModel {
  wrapper: BABYLON.TransformNode;
  root: BABYLON.TransformNode | BABYLON.AbstractMesh;
  totalHeight: number;
  headPivotWorldY: number;
  faceYawOffset: number;          // radians — correction applied to point face toward -Z
  wasFlippedY: boolean;
  wasZUp: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getHierarchyBounds(node: BABYLON.Node): { min: BABYLON.Vector3; max: BABYLON.Vector3 } | null {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let found = false;

  const meshes = node instanceof BABYLON.AbstractMesh
    ? [node, ...(node as BABYLON.AbstractMesh).getChildMeshes(false)]
    : (node as BABYLON.TransformNode).getChildMeshes(false);

  for (const m of meshes) {
    if (!m.isEnabled()) continue;
    m.computeWorldMatrix(true);
    const bi = m.getBoundingInfo();
    if (!bi) continue;
    const { minimumWorld: mn, maximumWorld: mx } = bi.boundingBox;
    if (!isFinite(mn.x)) continue;
    found = true;
    minX = Math.min(minX, mn.x); minY = Math.min(minY, mn.y); minZ = Math.min(minZ, mn.z);
    maxX = Math.max(maxX, mx.x); maxY = Math.max(maxY, mx.y); maxZ = Math.max(maxZ, mx.z);
  }

  if (!found) return null;
  return { min: new BABYLON.Vector3(minX, minY, minZ), max: new BABYLON.Vector3(maxX, maxY, maxZ) };
}

function computeGeometryCenterOfMass(root: BABYLON.Node): BABYLON.Vector3 {
  const meshes = (root instanceof BABYLON.AbstractMesh)
    ? [root, ...(root as BABYLON.AbstractMesh).getChildMeshes(false)]
    : (root as BABYLON.TransformNode).getChildMeshes(false);

  let sumX = 0, sumY = 0, sumZ = 0, count = 0;
  for (const m of meshes) {
    if (!m.isEnabled()) continue;
    m.computeWorldMatrix(true);
    const bi = m.getBoundingInfo();
    if (!bi) continue;
    const { minimumWorld: mn, maximumWorld: mx } = bi.boundingBox;
    if (!isFinite(mn.x)) continue;
    sumX += (mn.x + mx.x) * 0.5;
    sumY += (mn.y + mx.y) * 0.5;
    sumZ += (mn.z + mx.z) * 0.5;
    count++;
  }
  if (count === 0) return BABYLON.Vector3.Zero();
  return new BABYLON.Vector3(sumX / count, sumY / count, sumZ / count);
}

/**
 * Detect which horizontal face of the mesh contains the brightest/whitest geometry.
 * Returns the yaw offset (in radians) needed to rotate the model so that face points toward -Z.
 */
function detectFaceYaw(root: BABYLON.Node, bounds: { min: BABYLON.Vector3; max: BABYLON.Vector3 }): number {
  const cx = (bounds.min.x + bounds.max.x) * 0.5;
  const cz = (bounds.min.z + bounds.max.z) * 0.5;

  const meshes = (root instanceof BABYLON.AbstractMesh)
    ? [root as BABYLON.AbstractMesh, ...(root as BABYLON.AbstractMesh).getChildMeshes(false) as BABYLON.Mesh[]]
    : (root as BABYLON.TransformNode).getChildMeshes(false) as BABYLON.Mesh[];

  const brightMeshes: BABYLON.AbstractMesh[] = [];
  for (const m of meshes) {
    if (!m.material) continue;
    let brightness = 0;
    if (m.material instanceof BABYLON.PBRMaterial) {
      const c = m.material.albedoColor;
      brightness = (c.r + c.g + c.b) / 3;
    } else if (m.material instanceof BABYLON.StandardMaterial) {
      const c = m.material.diffuseColor;
      brightness = (c.r + c.g + c.b) / 3;
    }
    if (brightness > 0.45) brightMeshes.push(m);
  }

  if (brightMeshes.length === 0) return 0; // assume -Z face

  let sumOffX = 0, sumOffZ = 0;
  for (const bm of brightMeshes) {
    bm.computeWorldMatrix(true);
    const { minimumWorld: mn, maximumWorld: mx } = bm.getBoundingInfo().boundingBox;
    sumOffX += (mn.x + mx.x) * 0.5 - cx;
    sumOffZ += (mn.z + mx.z) * 0.5 - cz;
  }
  const n = brightMeshes.length;
  const offX = sumOffX / n;
  const offZ = sumOffZ / n;

  // Determine which axis the emitter is on
  const absX = Math.abs(offX), absZ = Math.abs(offZ);
  let faceYaw = 0;
  if (absX > absZ) {
    // Emitter is on ±X face
    faceYaw = offX > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else if (absZ > 0.02) {
    // Emitter is on ±Z face
    faceYaw = offZ > 0 ? Math.PI : 0;
  }

  console.log(`[GLBNormalize] faceDetect: offX=${offX.toFixed(3)} offZ=${offZ.toFixed(3)} → yaw=${(faceYaw * 180 / Math.PI).toFixed(1)}°`);
  return faceYaw;
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Normalize an imported GLB result so it:
 *   • sits on the ground (Y=0 at base)
 *   • is right-side-up (+Y up)
 *   • faces toward -Z (camera direction)
 *   • is scaled to `targetHeight` if supplied
 *
 * Returns a wrapper TransformNode that you should use as the root.
 * The original import root is reparented inside the wrapper.
 *
 * @param importRoot  meshes[0] from SceneLoader.ImportMeshAsync
 * @param scene       Babylon scene
 * @param id          unique name prefix for created nodes
 * @param options     normalization options
 */
export function normalizeGLB(
  importRoot: BABYLON.AbstractMesh | BABYLON.TransformNode,
  scene: BABYLON.Scene,
  id: string,
  options: NormalizeOptions = {}
): NormalizedModel {
  const {
    snapToGround = true,
    faceCamera = true,
    targetHeight,
    lightHeadJointFraction = 0.72,
  } = options;

  // Create outer wrapper — this is the handle the caller positions/rotates
  const wrapper = new BABYLON.TransformNode(`${id}_wrapper`, scene);

  // Create inner correctionNode — holds the up-axis / flip correction
  const correctionNode = new BABYLON.TransformNode(`${id}_correction`, scene);
  correctionNode.parent = wrapper;

  // Re-parent import root under correctionNode
  importRoot.parent = correctionNode;

  // ── Step 1: measure native bounds before any correction ───────────────────
  wrapper.computeWorldMatrix(true);
  let bounds = getHierarchyBounds(wrapper);
  if (!bounds) {
    console.warn(`[GLBNormalize] ${id}: no valid bounds found, returning as-is`);
    return {
      wrapper, root: importRoot, totalHeight: 1, headPivotWorldY: 0.72,
      faceYawOffset: 0, wasFlippedY: false, wasZUp: false,
    };
  }

  const spanX = bounds.max.x - bounds.min.x;
  const spanY = bounds.max.y - bounds.min.y;
  const spanZ = bounds.max.z - bounds.min.z;
  const maxSpan = Math.max(spanX, spanY, spanZ);

  console.log(`[GLBNormalize] ${id}: spans X=${spanX.toFixed(3)} Y=${spanY.toFixed(3)} Z=${spanZ.toFixed(3)}`);

  let wasZUp = false;
  let wasFlippedY = false;

  // ── Step 2: Z-up detection (Z is the dominant vertical axis) ─────────────
  // If Y-span is very small relative to Z-span, model was exported with Z-up.
  // Fix: rotate correctionNode -90° on X to swap Z→Y.
  if (spanZ > spanY * 2.5 && spanZ >= maxSpan * 0.7) {
    correctionNode.rotation.x = -Math.PI / 2;
    wasZUp = true;
    console.log(`[GLBNormalize] ${id}: Z-up detected — applying -90° X rotation`);
    wrapper.computeWorldMatrix(true);
    bounds = getHierarchyBounds(wrapper)!;
  }

  // ── Step 3: Upside-down detection ─────────────────────────────────────────
  // Heuristic: compute center-of-mass Y position within the bounding box.
  // For a light stand the heavy base is at the bottom, so CoM should be in the
  // lower half of the bbox.  If CoM is in the upper half, model is flipped.
  {
    const com = computeGeometryCenterOfMass(wrapper);
    const midY = (bounds.min.y + bounds.max.y) * 0.5;
    const comFraction = (com.y - bounds.min.y) / Math.max(0.001, bounds.max.y - bounds.min.y);

    console.log(`[GLBNormalize] ${id}: CoM.y=${com.y.toFixed(3)} midY=${midY.toFixed(3)} comFraction=${comFraction.toFixed(2)}`);

    // If center-of-mass is in the TOP 30% of the bbox, model is likely upside-down
    if (comFraction > 0.70) {
      // Flip around X (so the stand base goes to the bottom)
      if (wasZUp) {
        // Already applied -90° on X, additional 180° on X → net -90°+180° = 90° on X
        correctionNode.rotation.x += Math.PI;
      } else {
        correctionNode.rotation.x = Math.PI;
      }
      wasFlippedY = true;
      console.log(`[GLBNormalize] ${id}: upside-down detected (comFraction=${comFraction.toFixed(2)}) — flipping`);
      wrapper.computeWorldMatrix(true);
      bounds = getHierarchyBounds(wrapper)!;
    }
  }

  // ── Step 4: Ground snap ───────────────────────────────────────────────────
  if (snapToGround) {
    wrapper.position.y -= bounds.min.y;
    wrapper.computeWorldMatrix(true);
    bounds = getHierarchyBounds(wrapper)!;
  }

  // ── Step 5: Scale to targetHeight ─────────────────────────────────────────
  const currentHeight = Math.max(0.01, bounds.max.y - bounds.min.y);
  if (targetHeight && targetHeight > 0) {
    const sf = targetHeight / currentHeight;
    wrapper.scaling = new BABYLON.Vector3(sf, sf, sf);
    wrapper.computeWorldMatrix(true);
    bounds = getHierarchyBounds(wrapper)!;
  }

  const totalHeight = Math.max(0.01, bounds.max.y - bounds.min.y);

  // ── Step 6: Face direction detection ──────────────────────────────────────
  let faceYawOffset = 0;
  if (faceCamera) {
    faceYawOffset = detectFaceYaw(wrapper, bounds);
    if (Math.abs(faceYawOffset) > 0.01) {
      wrapper.rotation.y += faceYawOffset;
      console.log(`[GLBNormalize] ${id}: face yaw correction ${(faceYawOffset * 180 / Math.PI).toFixed(1)}°`);
    }
  }

  const headPivotWorldY = bounds.min.y + totalHeight * lightHeadJointFraction;

  console.log(`[GLBNormalize] ${id}: done. height=${totalHeight.toFixed(3)} headY=${headPivotWorldY.toFixed(3)} wasFlipped=${wasFlippedY} wasZUp=${wasZUp}`);

  return {
    wrapper,
    root: importRoot,
    totalHeight,
    headPivotWorldY,
    faceYawOffset,
    wasFlippedY,
    wasZUp,
  };
}

/**
 * Quick orientation fix for props — wraps import root, applies up-axis/flip corrections,
 * and grounds the result.  Returns the wrapper TransformNode (use as scene root).
 */
export function normalizePropGLB(
  importRoot: BABYLON.AbstractMesh | BABYLON.TransformNode,
  scene: BABYLON.Scene,
  id: string,
): BABYLON.TransformNode {
  const result = normalizeGLB(importRoot, scene, id, {
    snapToGround: true,
    faceCamera: false,  // props face camera via rotateMeshTowardCamera
    targetHeight: undefined,
    lightHeadJointFraction: 0.5,
  });
  return result.wrapper;
}

/**
 * Calibrate faceYawOffset for a loaded light GLB.
 * Pass the already-normalized wrapper; returns the additional yaw needed
 * (in radians) so the emitting face points toward -Z.
 */
export function calibrateLightFaceYaw(
  wrapper: BABYLON.TransformNode,
  bounds: { min: BABYLON.Vector3; max: BABYLON.Vector3 }
): number {
  return detectFaceYaw(wrapper, bounds);
}

/**
 * Lightweight orientation fix applied DIRECTLY to a mesh (no wrapper node).
 * Used in propRenderingService where we must return an AbstractMesh.
 *
 * 1. Detects Z-up and applies X-rotation to the mesh's direct root child.
 * 2. Detects upside-down and flips if needed.
 * 3. Optionally grounds the mesh.
 *
 * Returns the corrected root mesh (same reference, corrected in-place).
 */
export function fixGLBOrientationInPlace(
  mesh: BABYLON.AbstractMesh,
  scene: BABYLON.Scene,
  id: string,
  options: { snapToGround?: boolean } = {}
): void {
  const { snapToGround = true } = options;

  mesh.computeWorldMatrix(true);

  const bounds = getHierarchyBounds(mesh);
  if (!bounds) {
    console.warn(`[GLBNormFix] ${id}: no bounds, skipping orientation fix`);
    return;
  }

  const spanX = bounds.max.x - bounds.min.x;
  const spanY = bounds.max.y - bounds.min.y;
  const spanZ = bounds.max.z - bounds.min.z;
  const maxSpan = Math.max(spanX, spanY, spanZ);

  console.log(`[GLBNormFix] ${id}: spans X=${spanX.toFixed(3)} Y=${spanY.toFixed(3)} Z=${spanZ.toFixed(3)}`);

  // Z-up detection
  if (spanZ > spanY * 2.5 && spanZ >= maxSpan * 0.7) {
    mesh.rotation.x = -Math.PI / 2;
    console.log(`[GLBNormFix] ${id}: Z-up → -90° X rotation applied`);
    mesh.computeWorldMatrix(true);
    const b2 = getHierarchyBounds(mesh);
    if (b2) {
      Object.assign(bounds, b2);
    }
  }

  // Upside-down detection via center-of-mass
  const com = computeGeometryCenterOfMass(mesh);
  const comFraction = (com.y - bounds.min.y) / Math.max(0.001, bounds.max.y - bounds.min.y);
  if (comFraction > 0.70) {
    mesh.rotation.x += Math.PI;
    console.log(`[GLBNormFix] ${id}: upside-down (comF=${comFraction.toFixed(2)}) → 180° X flip`);
    mesh.computeWorldMatrix(true);
    const b3 = getHierarchyBounds(mesh);
    if (b3) Object.assign(bounds, b3);
  }

  // Ground snap
  if (snapToGround && isFinite(bounds.min.y)) {
    mesh.position.y -= bounds.min.y;
    console.log(`[GLBNormFix] ${id}: ground snap -${bounds.min.y.toFixed(3)}`);
  }

  mesh.computeWorldMatrix(true);
}
