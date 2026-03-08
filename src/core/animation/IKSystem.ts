/**
 * IK System
 * Applies, blends, captures, and resets skeletal poses on a BabylonJS Skeleton.
 *
 * Lifecycle:
 *   1. Instantiate (optionally passing a skeleton).
 *   2. Call setSkeleton() whenever the active character rig changes.
 *   3. Use applyPose / blendPoses / resetToTPose / capturePose from the UI layer.
 */

import * as BABYLON from '@babylonjs/core';
import { BoneRotation, PoseData } from './PoseLibrary';

export class IKSystem {
  private skeleton: BABYLON.Skeleton | null = null;

  /** Reference state captured the moment a skeleton is registered. */
  private tPose: PoseData = {};

  /** Named snapshots created via capturePose(). */
  private capturedPoses: Map<string, PoseData> = new Map();

  constructor(skeleton?: BABYLON.Skeleton) {
    if (skeleton) {
      this.setSkeleton(skeleton);
    }
  }

  // ---------------------------------------------------------------------------
  // Skeleton management
  // ---------------------------------------------------------------------------

  /**
   * Attach a BabylonJS skeleton.
   * The current bone state is captured as the T-pose reference so resetToTPose()
   * can always restore it.
   */
  setSkeleton(skeleton: BABYLON.Skeleton): void {
    this.skeleton = skeleton;
    this.tPose = this.snapshotCurrentPose();
    this.capturedPoses.set('tpose', this.tPose);
  }

  getSkeleton(): BABYLON.Skeleton | null {
    return this.skeleton;
  }

  // ---------------------------------------------------------------------------
  // Pose application
  // ---------------------------------------------------------------------------

  /**
   * Apply a PoseData object to the attached skeleton.
   * Bones absent from the pose keep their current rotation.
   */
  applyPose(pose: PoseData): void {
    if (!this.skeleton) return;

    for (const [boneName, rotation] of Object.entries(pose)) {
      if (!rotation) continue;
      const bone = this.findBone(boneName);
      if (bone) {
        const quat = BABYLON.Quaternion.FromEulerAngles(rotation.x, rotation.y, rotation.z);
        bone.setRotationQuaternion(quat, BABYLON.Space.LOCAL);
      }
    }
  }

  /**
   * Blend two PoseData objects by alpha (0 = full poseA, 1 = full poseB).
   * Uses spherical linear interpolation for smooth in-between rotations.
   * Returns the blended PoseData without applying it — call applyPose() separately.
   */
  blendPoses(poseA: PoseData, poseB: PoseData, alpha: number): PoseData {
    const blended: PoseData = {};
    const boneNames = new Set([...Object.keys(poseA), ...Object.keys(poseB)]);

    for (const boneName of boneNames) {
      const rotA: BoneRotation = poseA[boneName] ?? { x: 0, y: 0, z: 0 };
      const rotB: BoneRotation = poseB[boneName] ?? { x: 0, y: 0, z: 0 };

      const quatA = BABYLON.Quaternion.FromEulerAngles(rotA.x, rotA.y, rotA.z);
      const quatB = BABYLON.Quaternion.FromEulerAngles(rotB.x, rotB.y, rotB.z);
      const blendedQuat = BABYLON.Quaternion.Slerp(quatA, quatB, Math.max(0, Math.min(1, alpha)));
      const euler = blendedQuat.toEulerAngles();

      blended[boneName] = { x: euler.x, y: euler.y, z: euler.z };
    }

    return blended;
  }

  /**
   * Reset the skeleton back to the T-pose that was captured on setSkeleton().
   */
  resetToTPose(): void {
    if (!this.skeleton) return;
    this.applyPose(this.tPose);
  }

  // ---------------------------------------------------------------------------
  // Pose capture
  // ---------------------------------------------------------------------------

  /**
   * Snapshot the current skeleton state into a named PoseData entry.
   * The snapshot is stored internally (retrievable via getCapturedPose) and returned.
   *
   * @param name  Identifier for the snapshot (e.g. 'custom', 'tpose').
   */
  capturePose(name: string): PoseData {
    const pose = this.snapshotCurrentPose();
    this.capturedPoses.set(name, pose);
    return pose;
  }

  /** Retrieve a previously captured pose by name. Returns undefined if not found. */
  getCapturedPose(name: string): PoseData | undefined {
    return this.capturedPoses.get(name);
  }

  /** Return all stored capture names, including 'tpose'. */
  getCapturedPoseNames(): string[] {
    return Array.from(this.capturedPoses.keys());
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private snapshotCurrentPose(): PoseData {
    if (!this.skeleton) return {};

    const pose: PoseData = {};
    for (const bone of this.skeleton.bones) {
      const quat = bone.getRotationQuaternion(BABYLON.Space.LOCAL);
      if (quat) {
        const euler = quat.toEulerAngles();
        pose[bone.name] = { x: euler.x, y: euler.y, z: euler.z };
      }
    }
    return pose;
  }

  private findBone(name: string): BABYLON.Bone | undefined {
    return this.skeleton?.bones.find((b) => b.name === name);
  }
}
