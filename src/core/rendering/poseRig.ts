/**
 * Constrained joint editing on the 53-joint studio rig.
 *
 * Axis convention comes from the rig itself, not from guesswork: the pose
 * clips in `scripts/characters/build_studio_characters.py` rotate a single
 * local axis per joint, and they read
 *
 *   upperarm (2, ±0.40)   elbow (0, −1.0)   thigh (0, −1.35)
 *   calf     (0, +1.35)   head  (1, +0.22)  spine_03 (1, −0.12)
 *
 * so in every joint's local frame X bends, Y twists and Z swings the limb away
 * from the body. A glTF node's rotation is already expressed relative to its
 * bind pose, so the values clamped here are anatomical angles measured from
 * the rest stance.
 *
 * The ranges are conventional clinical figures, rounded and deliberately a
 * little tighter than a trained body can reach. They are not measured from a
 * subject.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * A hinge: one axis of travel, one direction, no sideways play.
 *
 * Degrees about the joint's local X, measured from the bind pose.
 */
export interface HingeLimit {
  kind: 'hinge';
  min: number;
  max: number;
}

/**
 * A ball joint: how far the bone may point away from rest, and how far it may
 * twist about its own length.
 *
 * Per-axis Euler limits were tried first and are the wrong model. Every Euler
 * factorisation is ill-conditioned near its middle axis's ±90°, so an ordinary
 * reach decomposes into extreme numbers that a per-axis clamp then mangles —
 * an arm reaching forward came back pinned to its limits with the hand half a
 * metre off target. Swing and twist are stable everywhere, and they are what a
 * published range of motion actually describes.
 */
export interface BallLimit {
  kind: 'ball';
  /** Degrees the bone may swing away from its rest direction. */
  cone: number;
  /** Degrees of rotation about the bone's own length, either way. */
  twist: number;
}

export type JointLimit = HingeLimit | BallLimit;

export interface EditableJoint {
  /** Stable id used in scene documents. */
  id: string;
  /** glTF/Mixamo node name carrying the rotation. */
  node: string;
  /** Label shown in the studio UI. */
  label: string;
  limits: JointLimit;
}

const hinge = (min: number, max: number): HingeLimit => ({ kind: 'hinge', min, max });
const ball = (cone: number, twist: number): BallLimit => ({ kind: 'ball', cone, twist });

/**
 * The joints a photographer can reach, head downwards.
 *
 * Fingers, toes and the root stay out: the root is the character's own
 * transform, and the fingers are posed by the clip. Both sides share a figure,
 * because a body is symmetric.
 */
export const EDITABLE_JOINTS: EditableJoint[] = [
  { id: 'head', node: 'mixamorigHead', label: 'Hode', limits: ball(45, 70) },
  { id: 'neck', node: 'mixamorigNeck', label: 'Nakke', limits: ball(30, 40) },
  { id: 'chest', node: 'mixamorigSpine2', label: 'Bryst', limits: ball(25, 35) },
  { id: 'upperBack', node: 'mixamorigSpine1', label: 'Øvre rygg', limits: ball(20, 20) },
  { id: 'lowerBack', node: 'mixamorigSpine', label: 'Nedre rygg', limits: ball(25, 20) },

  { id: 'leftShoulderBlade', node: 'mixamorigLeftShoulder', label: 'Venstre skulderblad', limits: ball(20, 15) },
  { id: 'rightShoulderBlade', node: 'mixamorigRightShoulder', label: 'Høyre skulderblad', limits: ball(20, 15) },
  // The shoulder is the widest joint in the body: the arm reaches almost
  // anywhere, and rotates a long way about its own length as it does.
  { id: 'leftShoulder', node: 'mixamorigLeftArm', label: 'Venstre skulder', limits: ball(150, 90) },
  { id: 'rightShoulder', node: 'mixamorigRightArm', label: 'Høyre skulder', limits: ball(150, 90) },

  // The elbow only bends, and only one way: negative X, as the seated clip does.
  { id: 'leftElbow', node: 'mixamorigLeftForeArm', label: 'Venstre albue', limits: hinge(-150, 0) },
  { id: 'rightElbow', node: 'mixamorigRightForeArm', label: 'Høyre albue', limits: hinge(-150, 0) },

  { id: 'leftHand', node: 'mixamorigLeftHand', label: 'Venstre hånd', limits: ball(70, 25) },
  { id: 'rightHand', node: 'mixamorigRightHand', label: 'Høyre hånd', limits: ball(70, 25) },

  { id: 'leftHip', node: 'mixamorigLeftUpLeg', label: 'Venstre hofte', limits: ball(110, 45) },
  { id: 'rightHip', node: 'mixamorigRightUpLeg', label: 'Høyre hofte', limits: ball(110, 45) },

  // The knee bends the other way from the elbow: positive X, as the seated clip does.
  { id: 'leftKnee', node: 'mixamorigLeftLeg', label: 'Venstre kne', limits: hinge(0, 150) },
  { id: 'rightKnee', node: 'mixamorigRightLeg', label: 'Høyre kne', limits: hinge(0, 150) },
];

/**
 * Limbs that can be posed by their end, rather than joint by joint.
 *
 * Each is a two-bone chain: set the hinge and swing the limb so the hand or
 * foot lands where it is dragged.
 */
export interface LimbChain {
  id: string;
  label: string;
  /** Shoulder or hip — an editable joint. */
  rootJoint: string;
  /** Elbow or knee — the hinge. */
  midJoint: string;
  /** glTF node of the hand or foot the photographer drags. */
  endNode: string;
  /**
   * Which way the hinge closes on its X axis: −1 for an elbow, +1 for a knee.
   *
   * Says which end of the joint's range to fold towards when shortening the
   * limb, so an elbow folds forward and a knee folds back.
   */
  bendSign: -1 | 1;
}

export const LIMB_CHAINS: LimbChain[] = [
  { id: 'leftArm', label: 'Venstre hånd', rootJoint: 'leftShoulder', midJoint: 'leftElbow', endNode: 'mixamorigLeftHand', bendSign: -1 },
  { id: 'rightArm', label: 'Høyre hånd', rootJoint: 'rightShoulder', midJoint: 'rightElbow', endNode: 'mixamorigRightHand', bendSign: -1 },
  { id: 'leftLeg', label: 'Venstre fot', rootJoint: 'leftHip', midJoint: 'leftKnee', endNode: 'mixamorigLeftFoot', bendSign: 1 },
  { id: 'rightLeg', label: 'Høyre fot', rootJoint: 'rightHip', midJoint: 'rightKnee', endNode: 'mixamorigRightFoot', bendSign: 1 },
];

const JOINTS_BY_ID = new Map(EDITABLE_JOINTS.map(joint => [joint.id, joint]));
const JOINTS_BY_NODE = new Map(EDITABLE_JOINTS.map(joint => [joint.node, joint]));

export function jointById(id: string): EditableJoint | undefined {
  return JOINTS_BY_ID.get(id);
}

export function jointByNode(node: string): EditableJoint | undefined {
  return JOINTS_BY_NODE.get(node);
}

export const DEG = Math.PI / 180;

/** The bone direction a ball joint's cone is measured from, when none is known. */
export const DEFAULT_BONE_AXIS: Vec3 = { x: 0, y: 1, z: 0 };

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function quatLength(q: Quat): number {
  return Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
}

function normalizeQuat(q: Quat): Quat {
  const len = quatLength(q);
  if (!(len > 1e-9)) return { ...IDENTITY };
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

/** Hamilton product, matching Babylon's `Quaternion.multiply`. */
export function multiplyQuat(a: Quat, b: Quat): Quat {
  return {
    x: a.x * b.w + a.y * b.z - a.z * b.y + a.w * b.x,
    y: -a.x * b.z + a.y * b.w + a.z * b.x + a.w * b.y,
    z: a.x * b.y - a.y * b.x + a.z * b.w + a.w * b.z,
    w: -a.x * b.x - a.y * b.y - a.z * b.z + a.w * b.w,
  };
}

export function conjugateQuat(q: Quat): Quat {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

/** Rotation of `angle` radians about a unit axis. */
export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const half = angle / 2;
  const s = Math.sin(half);
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

export function unitVector(v: Vec3, fallback: Vec3 = DEFAULT_BONE_AXIS): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (!(len > 1e-9)) return { ...fallback };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Split a rotation into a swing away from `axis` and a twist about it.
 *
 * `q = swing ⊗ twist`, with the swing's own axis perpendicular to `axis`. This
 * is the decomposition a joint limit is written in: how far the bone points
 * away from rest, and how far it has rolled about its own length.
 */
export function swingTwist(q: Quat, axis: Vec3): { swing: Quat; twist: Quat } {
  const unit = unitVector(axis);
  const projection = q.x * unit.x + q.y * unit.y + q.z * unit.z;
  let twist = normalizeQuat({
    x: unit.x * projection,
    y: unit.y * projection,
    z: unit.z * projection,
    w: q.w,
  });
  // A half turn of pure swing leaves no twist to speak of; keep it identity
  // rather than letting a vanishing projection pick an arbitrary direction.
  if (Math.abs(projection) < 1e-9 && Math.abs(q.w) < 1e-9) twist = { ...IDENTITY };
  const swing = multiplyQuat(q, conjugateQuat(twist));
  return { swing, twist };
}

/** Rotation angle of a quaternion, in radians, always in [0, π]. */
export function quatAngle(q: Quat): number {
  const unit = normalizeQuat(q);
  return 2 * Math.acos(clamp(Math.abs(unit.w), -1, 1));
}

/** Shorten a rotation to at most `maxAngle` radians about its own axis. */
export function limitQuatAngle(q: Quat, maxAngle: number): Quat {
  const unit = normalizeQuat(q);
  const angle = quatAngle(unit);
  if (angle <= maxAngle + 1e-9) return unit;
  const sin = Math.sqrt(Math.max(0, 1 - unit.w * unit.w));
  if (sin < 1e-9) return { ...IDENTITY };
  const sign = unit.w < 0 ? -1 : 1;
  const axis = { x: (unit.x / sin) * sign, y: (unit.y / sin) * sign, z: (unit.z / sin) * sign };
  return quatFromAxisAngle(axis, maxAngle);
}

/** Signed rotation about `axis`, in radians, in (−π, π]. */
export function twistAngle(twist: Quat, axis: Vec3): number {
  const unit = unitVector(axis);
  const along = twist.x * unit.x + twist.y * unit.y + twist.z * unit.z;
  return 2 * Math.atan2(along, twist.w);
}

/**
 * Clamp a joint rotation to what that joint can do.
 *
 * A hinge keeps its angle about X and loses any sideways play entirely, so a
 * drag cannot accumulate drift. A ball joint keeps its swing inside its cone
 * and its twist inside its range.
 *
 * `boneAxis` is the direction of the bone in the joint's own local frame — for
 * an arm, the direction from the shoulder towards the elbow at rest. Without
 * one the joint is measured about its local Y.
 *
 * ponytail: a circular cone, not a per-direction envelope. A shoulder is
 * genuinely less free across the body than away from it; worth splitting only
 * if a pose that passes here reads as wrong.
 */
export function clampJointQuaternion(
  jointId: string,
  rotation: Quat,
  boneAxis: Vec3 = DEFAULT_BONE_AXIS,
): Quat {
  const joint = JOINTS_BY_ID.get(jointId);
  if (!joint) throw new RangeError(`Unknown joint ${jointId}`);

  const q = normalizeQuat({
    x: finite(rotation.x), y: finite(rotation.y), z: finite(rotation.z), w: finite(rotation.w),
  });

  if (joint.limits.kind === 'hinge') {
    const angle = clamp(
      twistAngle(q, { x: 1, y: 0, z: 0 }),
      joint.limits.min * DEG,
      joint.limits.max * DEG,
    );
    return quatFromAxisAngle({ x: 1, y: 0, z: 0 }, angle);
  }

  const { swing, twist } = swingTwist(q, boneAxis);
  const limitedSwing = limitQuatAngle(swing, joint.limits.cone * DEG);
  const limitedTwist = quatFromAxisAngle(
    unitVector(boneAxis),
    clamp(twistAngle(twist, boneAxis), -joint.limits.twist * DEG, joint.limits.twist * DEG),
  );
  return normalizeQuat(multiplyQuat(limitedSwing, limitedTwist));
}

/** True when a rotation is already inside the joint's range. */
export function isWithinLimits(
  jointId: string,
  rotation: Quat,
  boneAxis: Vec3 = DEFAULT_BONE_AXIS,
  toleranceRad = 1e-6,
): boolean {
  const clamped = clampJointQuaternion(jointId, rotation, boneAxis);
  const q = normalizeQuat(rotation);
  // Quaternions double-cover rotations, so compare the angle between them.
  const dotProduct = Math.abs(clamped.x * q.x + clamped.y * q.y + clamped.z * q.z + clamped.w * q.w);
  return 2 * Math.acos(clamp(dotProduct, -1, 1)) <= toleranceRad;
}

/** Which gizmo rings a joint should offer. */
export function freeAxes(joint: EditableJoint): ('x' | 'y' | 'z')[] {
  return joint.limits.kind === 'hinge' ? ['x'] : ['x', 'y', 'z'];
}

/**
 * Euler convenience, as Rz · Ry · Rx.
 *
 * The limits themselves are swing and twist; these two exist so a joint can be
 * set and read in plain angles from a panel or a test. The order puts Y in the
 * middle, so X and Z keep their full range and a folded elbow survives the
 * round trip — yaw-pitch-roll would gimbal-lock it at 90°.
 */
export function quatFromEuler(a: Vec3): Quat {
  const cx = Math.cos(a.x / 2), sx = Math.sin(a.x / 2);
  const cy = Math.cos(a.y / 2), sy = Math.sin(a.y / 2);
  const cz = Math.cos(a.z / 2), sz = Math.sin(a.z / 2);
  return {
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  };
}

/** The inverse of `quatFromEuler`. */
export function eulerFromQuat(q: Quat): Vec3 {
  const { x, y, z, w } = q;
  const pitch = clamp(2 * (w * y - z * x), -1, 1);
  return {
    x: Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
    y: Math.asin(pitch),
    z: Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
  };
}
