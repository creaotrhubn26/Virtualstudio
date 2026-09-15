import { describe, it, expect } from 'vitest';
import {
  DEG,
  EDITABLE_JOINTS,
  clampJointRotation,
  freeAxes,
  isWithinLimits,
  jointById,
  jointByNode,
} from './poseRig';

/** The single-axis rotations the pose clips in the character builder apply. */
const CLIP_ROTATIONS: { joint: string; rotation: { x: number; y: number; z: number } }[] = [
  { joint: 'leftShoulder', rotation: { x: 0, y: 0, z: -0.4 } },   // StudioStand
  { joint: 'rightShoulder', rotation: { x: 0, y: 0, z: 0.4 } },
  { joint: 'leftElbow', rotation: { x: -1.0, y: 0, z: 0 } },      // StudioSeated
  { joint: 'rightElbow', rotation: { x: -1.0, y: 0, z: 0 } },
  { joint: 'leftHip', rotation: { x: -1.35, y: 0, z: 0 } },
  { joint: 'rightHip', rotation: { x: -1.35, y: 0, z: 0 } },
  { joint: 'leftKnee', rotation: { x: 1.35, y: 0, z: 0 } },
  { joint: 'rightKnee', rotation: { x: 1.35, y: 0, z: 0 } },
  { joint: 'head', rotation: { x: 0, y: 0.22, z: 0 } },           // StudioPortrait
  { joint: 'chest', rotation: { x: 0, y: -0.12, z: 0 } },
];

describe('editable rig definition', () => {
  it('covers the joints a photographer poses, and nothing that belongs to the clip', () => {
    const ids = EDITABLE_JOINTS.map(j => j.id);
    for (const required of ['head', 'lowerBack', 'leftShoulder', 'rightElbow', 'leftHand', 'rightHip', 'leftKnee']) {
      expect(ids).toContain(required);
    }
    // The root is the character's own transform, and fingers are posed by the clip.
    expect(ids).not.toContain('hips');
    expect(EDITABLE_JOINTS.every(j => !/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(j.node))).toBe(true);
    // Every joint resolves both ways, and no node is claimed twice.
    expect(new Set(EDITABLE_JOINTS.map(j => j.node)).size).toBe(EDITABLE_JOINTS.length);
    for (const joint of EDITABLE_JOINTS) {
      expect(jointById(joint.id)).toBe(joint);
      expect(jointByNode(joint.node)).toBe(joint);
      // A limit that is empty or inverted would silently lock the joint.
      for (const axis of freeAxes(joint)) {
        expect(joint.limits[axis]!.min).toBeLessThan(joint.limits[axis]!.max);
      }
    }
    expect(jointById('nope')).toBeUndefined();
  });

  it('keeps hinges to a single direction of travel', () => {
    for (const id of ['leftElbow', 'rightElbow', 'leftKnee', 'rightKnee']) {
      expect(freeAxes(jointById(id)!)).toEqual(['x']);
    }
    // An elbow bends one way and a knee the other, as the seated clip does.
    expect(clampJointRotation('leftElbow', { x: -1.0, y: 0, z: 0 }).x).toBeCloseTo(-1.0, 6);
    expect(clampJointRotation('leftElbow', { x: 0.6, y: 0, z: 0 }).x).toBe(0);
    expect(clampJointRotation('leftKnee', { x: 1.0, y: 0, z: 0 }).x).toBeCloseTo(1.0, 6);
    expect(clampJointRotation('leftKnee', { x: -0.6, y: 0, z: 0 }).x).toBe(0);
    // Sideways play on a hinge is removed, not merely limited.
    const wrenched = clampJointRotation('leftKnee', { x: 0.5, y: 0.4, z: -0.3 });
    expect(wrenched).toEqual({ x: 0.5, y: 0, z: 0 });
  });

  it('mirrors the left side onto the right', () => {
    const left = jointById('leftShoulder')!.limits;
    const right = jointById('rightShoulder')!.limits;
    // Bend is the same on both sides; twist and swing reverse.
    expect(right.x).toEqual(left.x);
    expect(right.y).toEqual({ min: -left.y!.max, max: -left.y!.min });
    expect(right.z).toEqual({ min: -left.z!.max, max: -left.z!.min });
    // So the arms-down stance is symmetric: equal and opposite on Z.
    const leftDown = clampJointRotation('leftShoulder', { x: 0, y: 0, z: -0.4 });
    const rightDown = clampJointRotation('rightShoulder', { x: 0, y: 0, z: 0.4 });
    expect(leftDown.z).toBeCloseTo(-rightDown.z, 6);
  });

  it('admits every pose the bundled clips already strike', () => {
    // A limit that rejected a shipped pose would fight the reset states.
    for (const { joint, rotation } of CLIP_ROTATIONS) {
      expect(isWithinLimits(joint, rotation), `${joint} must accept its clip rotation`).toBe(true);
      expect(clampJointRotation(joint, rotation)).toEqual(rotation);
    }
  });

  it('refuses impossible limb angles', () => {
    // A knee past 150° or an elbow bent backwards is not a pose, it is an injury.
    expect(isWithinLimits('leftKnee', { x: 170 * DEG, y: 0, z: 0 })).toBe(false);
    expect(clampJointRotation('leftKnee', { x: 170 * DEG, y: 0, z: 0 }).x).toBeCloseTo(150 * DEG, 6);
    expect(isWithinLimits('rightElbow', { x: 0.4, y: 0, z: 0 })).toBe(false);
    // The head turns, but not over the shoulder and round.
    expect(clampJointRotation('head', { x: 0, y: Math.PI, z: 0 }).y).toBeCloseTo(70 * DEG, 6);
    expect(clampJointRotation('head', { x: 0, y: -Math.PI, z: 0 }).y).toBeCloseTo(-70 * DEG, 6);
    // Garbage in is a rest joint, not a NaN transform on the skeleton.
    expect(clampJointRotation('head', { x: NaN, y: Infinity, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(() => clampJointRotation('nope', { x: 0, y: 0, z: 0 })).toThrow();
  });
});
