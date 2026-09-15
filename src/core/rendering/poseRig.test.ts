import { describe, it, expect } from 'vitest';
import {
  DEG,
  EDITABLE_JOINTS,
  LIMB_CHAINS,
  Quat,
  Vec3,
  clampJointQuaternion,
  eulerFromQuat,
  freeAxes,
  isWithinLimits,
  jointById,
  jointByNode,
  multiplyQuat,
  quatAngle,
  quatFromAxisAngle,
  quatFromEuler,
  swingTwist,
  twistAngle,
  unitVector,
} from './poseRig';

/** An upper arm points down its own local Y in the rest stance. */
const ARM_AXIS: Vec3 = { x: 0, y: -1, z: 0 };

/** The single-axis rotations the pose clips in the character builder apply. */
const CLIP_ROTATIONS: { joint: string; axis: 'x' | 'y' | 'z'; angle: number; boneAxis?: Vec3 }[] = [
  { joint: 'leftShoulder', axis: 'z', angle: -0.4, boneAxis: ARM_AXIS },   // StudioStand
  { joint: 'rightShoulder', axis: 'z', angle: 0.4, boneAxis: ARM_AXIS },
  { joint: 'leftElbow', axis: 'x', angle: -1.0 },                          // StudioSeated
  { joint: 'rightElbow', axis: 'x', angle: -1.0 },
  { joint: 'leftHip', axis: 'x', angle: -1.35, boneAxis: ARM_AXIS },
  { joint: 'rightHip', axis: 'x', angle: -1.35, boneAxis: ARM_AXIS },
  { joint: 'leftKnee', axis: 'x', angle: 1.35 },
  { joint: 'rightKnee', axis: 'x', angle: 1.35 },
  { joint: 'head', axis: 'y', angle: 0.22 },                               // StudioPortrait
  { joint: 'chest', axis: 'y', angle: -0.12 },
];

function about(axis: 'x' | 'y' | 'z', angle: number): Quat {
  const unit = { x: axis === 'x' ? 1 : 0, y: axis === 'y' ? 1 : 0, z: axis === 'z' ? 1 : 0 };
  return quatFromAxisAngle(unit, angle);
}

/** Angle between two rotations, radians. */
function between(a: Quat, b: Quat): number {
  const d = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  return 2 * Math.acos(Math.min(1, d));
}

describe('editable rig definition', () => {
  it('covers the joints a photographer poses, and nothing that belongs to the clip', () => {
    const ids = EDITABLE_JOINTS.map(j => j.id);
    for (const required of ['head', 'lowerBack', 'leftShoulder', 'rightElbow', 'leftHand', 'rightHip', 'leftKnee']) {
      expect(ids).toContain(required);
    }
    // The root is the character's own transform, and fingers are posed by the clip.
    expect(ids).not.toContain('hips');
    expect(EDITABLE_JOINTS.every(j => !/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(j.node))).toBe(true);
    expect(new Set(EDITABLE_JOINTS.map(j => j.node)).size).toBe(EDITABLE_JOINTS.length);
    for (const joint of EDITABLE_JOINTS) {
      expect(jointById(joint.id)).toBe(joint);
      expect(jointByNode(joint.node)).toBe(joint);
      // A range that is empty or inverted would silently lock the joint.
      if (joint.limits.kind === 'hinge') expect(joint.limits.min).toBeLessThan(joint.limits.max);
      else expect(joint.limits.cone).toBeGreaterThan(0);
    }
    expect(jointById('nope')).toBeUndefined();
  });

  it('builds every limb chain out of joints that exist', () => {
    expect(LIMB_CHAINS.map(c => c.id)).toEqual(['leftArm', 'rightArm', 'leftLeg', 'rightLeg']);
    for (const chain of LIMB_CHAINS) {
      expect(jointById(chain.rootJoint), chain.id).toBeDefined();
      // The middle of a two-bone chain has to be the hinge, or the solve has
      // more freedom than the body does.
      expect(jointById(chain.midJoint)!.limits.kind).toBe('hinge');
      expect(freeAxes(jointById(chain.midJoint)!)).toEqual(['x']);
      expect(chain.endNode.startsWith('mixamorig')).toBe(true);
    }
    // An elbow folds one way and a knee the other, and each chain says which.
    const arm = LIMB_CHAINS.find(c => c.id === 'leftArm')!;
    const leg = LIMB_CHAINS.find(c => c.id === 'leftLeg')!;
    expect(arm.bendSign).toBe(-1);
    expect(leg.bendSign).toBe(1);
    // The fold direction has to be the end of the hinge's range that exists.
    expect((jointById(arm.midJoint)!.limits as any).min).toBeLessThan(0);
    expect((jointById(leg.midJoint)!.limits as any).max).toBeGreaterThan(0);
  });
});

describe('swing and twist', () => {
  it('splits a rotation into a swing off the bone and a roll about it', () => {
    const axis = { x: 0, y: 1, z: 0 };
    const roll = about('y', 0.7);
    const lean = about('x', 0.4);

    // A pure roll is all twist.
    const rolled = swingTwist(roll, axis);
    expect(quatAngle(rolled.swing)).toBeCloseTo(0, 6);
    expect(twistAngle(rolled.twist, axis)).toBeCloseTo(0.7, 6);

    // A pure lean is all swing.
    const leaned = swingTwist(lean, axis);
    expect(quatAngle(leaned.swing)).toBeCloseTo(0.4, 6);
    expect(twistAngle(leaned.twist, axis)).toBeCloseTo(0, 6);

    // And the two parts put the rotation back together.
    const both = multiplyQuat(lean, roll);
    const split = swingTwist(both, axis);
    expect(between(multiplyQuat(split.swing, split.twist), both)).toBeCloseTo(0, 6);
  });

  it('measures a swing the same however the bone is oriented', () => {
    // The cone is about the bone, not about the world, so a limb pointing down
    // is limited exactly like one pointing up.
    for (const axis of [{ x: 0, y: 1, z: 0 }, ARM_AXIS, unitVector({ x: 1, y: -2, z: 0.5 })]) {
      const across = unitVector({ x: axis.y, y: -axis.x, z: 0 });
      const swung = quatFromAxisAngle(across, 0.9);
      expect(quatAngle(swingTwist(swung, axis).swing)).toBeCloseTo(0.9, 6);
    }
  });
});

describe('joint limits', () => {
  it('keeps hinges to a single direction of travel', () => {
    for (const id of ['leftElbow', 'rightElbow', 'leftKnee', 'rightKnee']) {
      expect(freeAxes(jointById(id)!)).toEqual(['x']);
    }
    // An elbow bends one way and a knee the other, as the seated clip does.
    expect(twistAngle(clampJointQuaternion('leftElbow', about('x', -1.0)), { x: 1, y: 0, z: 0 }))
      .toBeCloseTo(-1.0, 6);
    expect(twistAngle(clampJointQuaternion('leftElbow', about('x', 0.6)), { x: 1, y: 0, z: 0 }))
      .toBeCloseTo(0, 6);
    expect(twistAngle(clampJointQuaternion('leftKnee', about('x', 1.0)), { x: 1, y: 0, z: 0 }))
      .toBeCloseTo(1.0, 6);
    // Sideways play on a hinge is removed, not merely limited.
    const wrenched = multiplyQuat(about('y', 0.4), about('x', 0.5));
    const cleaned = clampJointQuaternion('leftKnee', wrenched);
    expect(Math.abs(cleaned.y)).toBeLessThan(1e-9);
    expect(Math.abs(cleaned.z)).toBeLessThan(1e-9);
  });

  it('holds a folded elbow, which yaw-pitch-roll could not represent', () => {
    // 150° is past the ±90° a middle Euler axis can express; the limits are
    // swing and twist precisely so this survives.
    const folded = about('x', -150 * DEG);
    expect(isWithinLimits('leftElbow', folded)).toBe(true);
    expect(twistAngle(clampJointQuaternion('leftElbow', folded), { x: 1, y: 0, z: 0 }))
      .toBeCloseTo(-150 * DEG, 6);
    // And past it the joint stops at the limit rather than wrapping round.
    expect(twistAngle(clampJointQuaternion('leftElbow', about('x', -179 * DEG)), { x: 1, y: 0, z: 0 }))
      .toBeCloseTo(-150 * DEG, 6);
  });

  it('lets a shoulder reach, and stops it short of dislocation', () => {
    const across = { x: 1, y: 0, z: 0 };
    // A wide reach is inside the shoulder's cone.
    const reach = quatFromAxisAngle(across, 120 * DEG);
    expect(isWithinLimits('leftShoulder', reach, ARM_AXIS)).toBe(true);
    // Beyond the cone the arm stops at it.
    const beyond = quatFromAxisAngle(across, 175 * DEG);
    const stopped = clampJointQuaternion('leftShoulder', beyond, ARM_AXIS);
    expect(quatAngle(swingTwist(stopped, ARM_AXIS).swing)).toBeCloseTo(150 * DEG, 5);
    // The head is far tighter than the shoulder, as it should be.
    expect(jointById('head')!.limits).toMatchObject({ kind: 'ball' });
    const turned = quatFromAxisAngle(across, 120 * DEG);
    expect(isWithinLimits('head', turned)).toBe(false);
  });

  it('limits roll about the bone separately from the swing', () => {
    const rolled = quatFromAxisAngle(unitVector(ARM_AXIS), 140 * DEG);
    const clamped = clampJointQuaternion('leftShoulder', rolled, ARM_AXIS);
    // The shoulder allows 90° of roll, no more.
    expect(Math.abs(twistAngle(swingTwist(clamped, ARM_AXIS).twist, ARM_AXIS))).toBeCloseTo(90 * DEG, 5);
    // A hand rolls far less than a shoulder.
    const handRoll = clampJointQuaternion('leftHand', rolled, ARM_AXIS);
    expect(Math.abs(twistAngle(swingTwist(handRoll, ARM_AXIS).twist, ARM_AXIS))).toBeCloseTo(25 * DEG, 5);
  });

  it('admits every pose the bundled clips already strike', () => {
    // A limit that rejected a shipped pose would fight the reset states.
    for (const { joint, axis, angle, boneAxis } of CLIP_ROTATIONS) {
      const rotation = about(axis, angle);
      expect(isWithinLimits(joint, rotation, boneAxis), `${joint} must accept its clip rotation`).toBe(true);
    }
  });

  it('turns nonsense into a resting joint rather than a broken skeleton', () => {
    const broken = clampJointQuaternion('head', { x: NaN, y: Infinity, z: 0, w: 0 });
    expect(Object.values(broken).every(Number.isFinite)).toBe(true);
    expect(quatAngle(broken)).toBeCloseTo(0, 6);
    expect(() => clampJointQuaternion('nope', about('x', 0))).toThrow();
  });
});

describe('euler convenience', () => {
  it('survives angles a limb actually reaches', () => {
    for (const angles of [
      { x: -150 * DEG, y: 0, z: 0 },
      { x: 170 * DEG, y: 0, z: 0 },
      { x: 1.1, y: -0.6, z: 0.9 },
      { x: -2.2, y: 0.3, z: -1.1 },
    ]) {
      const back = eulerFromQuat(quatFromEuler(angles));
      expect(back.x).toBeCloseTo(angles.x, 9);
      expect(back.y).toBeCloseTo(angles.y, 9);
      expect(back.z).toBeCloseTo(angles.z, 9);
    }
    expect(eulerFromQuat({ x: 0, y: 0, z: 0, w: 1 })).toEqual({ x: 0, y: 0, z: 0 });
  });
});
