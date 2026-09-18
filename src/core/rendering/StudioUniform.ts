/**
 * Workwear with somebody's name on it.
 *
 * The wardrobe that ships with the figures is twelve garments of ordinary
 * clothes — four suits per body and some shoes. There is no apron in it, no
 * cap and no gloves, so a staffed pizzeria came out as four people in casual
 * suits standing in a restaurant, which is not what anybody who works in one
 * looks like.
 *
 * These are built rather than fitted: simple shells attached to the bones they
 * belong to, with their fronts drawn from the brand the way the signs are. It
 * is the portrait chair's technique — read the rig, build geometry, let it
 * follow — and it costs no asset pipeline at all, which is what makes a
 * branded uniform something a user can have in a second rather than a job for
 * a modeller.
 *
 * What it is not: cloth. There is no simulation and no fitting to the body
 * underneath, so a very unusual pose can push a shoulder through the strap.
 * For previsualization of who is in the room and what colour they are wearing,
 * that is the right trade.
 */

import {
  AbstractMesh, Bone, Color3, Mesh, MeshBuilder, PBRMaterial, Scene, Skeleton, TransformNode,
} from '@babylonjs/core';
import { apronTexture, capTexture } from './brandTextures';
import { brandRgb, type StudioBrand } from '../../services/studioBranding';

/** What a person at a mark is wearing over their clothes. */
export interface UniformKit {
  apron?: boolean;
  cap?: boolean;
  gloves?: boolean;
}

/** The kit each role turns up in. */
export const ROLE_UNIFORM: Record<string, UniformKit> = {
  // At an oven: apron, cap and gloves, because the oven is 400 degrees.
  arbeid: { apron: true, cap: true, gloves: true },
  // Front of house carries the brand but not the heat protection.
  vert: { apron: true, cap: true },
  gjest: {},
  fag: {},
};

const BONE_NAMES = {
  chest: ['mixamorigSpine2', 'mixamorigSpine1', 'mixamorigSpine'],
  head: ['mixamorigHead'],
  hips: ['mixamorigHips'],
  leftHand: ['mixamorigLeftHand'],
  rightHand: ['mixamorigRightHand'],
};

function findBone(skeleton: Skeleton, names: string[]): Bone | null {
  for (const name of names) {
    const bone = skeleton.bones.find(candidate => candidate.name === name);
    if (bone) return bone;
  }
  return null;
}

/**
 * The uniform worn by one figure.
 *
 * Owns its meshes and materials and takes them all away again, so changing
 * role or model cannot leave an apron floating where somebody used to stand.
 */
export class StudioUniform {
  private root: TransformNode;
  private materials: PBRMaterial[] = [];
  private pieces: Mesh[] = [];

  private constructor(private scene: Scene, figure: AbstractMesh) {
    this.root = new TransformNode(`studioUniform_${figure.uniqueId}`, scene);
  }

  /**
   * Dress a figure for its role, or take the uniform off if the role has none.
   *
   * Returns null when the figure has no rig to hang anything on, rather than
   * leaving garments standing at the origin.
   */
  static dress(
    scene: Scene,
    figure: AbstractMesh,
    skeleton: Skeleton,
    brand: StudioBrand,
    kit: UniformKit,
  ): StudioUniform | null {
    if (!kit.apron && !kit.cap && !kit.gloves) return null;
    const uniform = new StudioUniform(scene, figure);
    uniform.build(figure, skeleton, brand, kit);
    return uniform.pieces.length > 0 ? uniform : (uniform.dispose(), null);
  }

  private material(name: string, colour: string, roughness: number): PBRMaterial {
    const material = new PBRMaterial(`studioUniform_${name}`, this.scene);
    material.albedoColor = Color3.FromHexString(colour);
    material.roughness = roughness;
    material.metallic = 0;
    material.maxSimultaneousLights = 8;
    this.materials.push(material);
    return material;
  }

  private attach(mesh: Mesh, material: PBRMaterial, bone: Bone, figure: AbstractMesh): Mesh {
    mesh.material = material;
    mesh.parent = this.root;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.metadata = { studioUniform: true };
    // Bone space, so it follows every pose and every joint edit for free.
    mesh.attachToBone(bone, figure);
    this.pieces.push(mesh);
    return mesh;
  }

  private build(figure: AbstractMesh, skeleton: Skeleton, brand: StudioBrand, kit: UniformKit): void {
    const chest = findBone(skeleton, BONE_NAMES.chest);
    const head = findBone(skeleton, BONE_NAMES.head);
    const hands = [findBone(skeleton, BONE_NAMES.leftHand), findBone(skeleton, BONE_NAMES.rightHand)];

    if (kit.apron && chest) {
      const material = this.material('apron', brand.surface, 0.82);
      material.albedoTexture = apronTexture(this.scene, brand);
      // A panel down the front, from the chest to mid-thigh.
      const apron = MeshBuilder.CreatePlane('studioUniform_apron',
        { width: 0.42, height: 0.72, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
      this.attach(apron, material, chest, figure);
      apron.position.set(0, -0.3, 0.115);

      // The strap round the neck, in the brand's own colour.
      const strapColour = this.material('apronStrap', brand.accent, 0.7);
      for (const side of [-1, 1]) {
        const strap = MeshBuilder.CreateBox(`studioUniform_apronStrap_${side}`,
          { width: 0.035, height: 0.3, depth: 0.02 }, this.scene);
        this.attach(strap, strapColour, chest, figure);
        strap.position.set(side * 0.1, 0.06, 0.1);
        strap.rotation.z = side * 0.24;
      }
    }

    if (kit.cap && head) {
      const capMaterial = this.material('cap', brand.surface, 0.76);
      capMaterial.albedoTexture = capTexture(this.scene, brand);
      const crown = MeshBuilder.CreateSphere('studioUniform_cap',
        { diameter: 0.21, segments: 16, slice: 0.55 }, this.scene);
      this.attach(crown, capMaterial, head, figure);
      crown.position.set(0, 0.085, 0.005);
      crown.scaling.y = 0.8;

      const brimMaterial = this.material('capBrim', brand.surface, 0.76);
      const brim = MeshBuilder.CreateBox('studioUniform_capBrim',
        { width: 0.2, height: 0.016, depth: 0.1 }, this.scene);
      this.attach(brim, brimMaterial, head, figure);
      brim.position.set(0, 0.078, 0.105);
      brim.rotation.x = -0.12;
    }

    if (kit.gloves) {
      // Black, because an oven glove is, and slightly loose on the hand.
      const gloveMaterial = this.material('glove', '#15161a', 0.88);
      const accent = brandRgb(brand.accent);
      gloveMaterial.albedoColor = new Color3(
        0.08 + accent.r * 0.05, 0.085 + accent.g * 0.05, 0.095 + accent.b * 0.05);
      for (const [index, hand] of hands.entries()) {
        if (!hand) continue;
        const glove = MeshBuilder.CreateBox(`studioUniform_glove_${index}`,
          { width: 0.105, height: 0.055, depth: 0.2 }, this.scene);
        this.attach(glove, gloveMaterial, hand, figure);
        glove.position.set(0, 0, 0.06);
      }
    }
  }

  /** Cast shadows like everything else a light can see. */
  meshes(): Mesh[] {
    return [...this.pieces];
  }

  dispose(): void {
    for (const piece of this.pieces) {
      piece.detachFromBone();
      piece.dispose(false, true);
    }
    this.pieces = [];
    this.materials.forEach(material => material.dispose(true, true));
    this.materials = [];
    this.root.dispose();
  }
}
