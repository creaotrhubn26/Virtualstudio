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
 * so in every joint's local frame:
 *
 *   X — flexion and extension (bend forward, bend the limb)
 *   Y — twist and turn
 *   Z — abduction and adduction (away from or across the body)
 *
 * A glTF node's rotation is already expressed relative to its bind pose, so
 * the values clamped here are anatomical angles measured from the rest stance
 * and can be compared directly against joint range-of-motion figures.
 *
 * The ranges below are conventional clinical ranges of motion, rounded and
 * deliberately a little tighter than a trained body can reach. They are not
 * measured from a subject, and they are per-axis rather than a coupled
 * envelope, so a shoulder taken to two extremes at once is permitted here and
 * would not be comfortable in life.
 */

export type JointAxis = 'x' | 'y' | 'z';

export interface AxisLimit {
  /** Lower bound in degrees, measured from the bind pose. */
  min: number;
  /** Upper bound in degrees, measured from the bind pose. */
  max: number;
}

export interface EditableJoint {
  /** Stable id used in scene documents. */
  id: string;
  /** glTF/Mixamo node name carrying the rotation. */
  node: string;
  /** Label shown in the studio UI. */
  label: string;
  /** Limits per local axis. A missing axis is locked. */
  limits: Partial<Record<JointAxis, AxisLimit>>;
}

/** A hinge: one axis of travel and no sideways play at all. */
function hinge(min: number, max: number): Partial<Record<JointAxis, AxisLimit>> {
  return { x: { min, max } };
}

/** Mirror a left-side joint's limits: twist and swing reverse, bend does not. */
function mirrored(limits: Partial<Record<JointAxis, AxisLimit>>): Partial<Record<JointAxis, AxisLimit>> {
  const flip = (limit?: AxisLimit) => (limit ? { min: -limit.max, max: -limit.min } : undefined);
  const result: Partial<Record<JointAxis, AxisLimit>> = {};
  if (limits.x) result.x = { ...limits.x };
  const y = flip(limits.y);
  if (y) result.y = y;
  const z = flip(limits.z);
  if (z) result.z = z;
  return result;
}

const LEFT_SHOULDER_BLADE = { x: { min: -10, max: 10 }, y: { min: -15, max: 15 }, z: { min: -20, max: 20 } };
const LEFT_UPPER_ARM = { x: { min: -60, max: 170 }, y: { min: -80, max: 80 }, z: { min: -70, max: 75 } };
const LEFT_HAND = { x: { min: -70, max: 70 }, y: { min: -25, max: 25 }, z: { min: -20, max: 30 } };
const LEFT_THIGH = { x: { min: -120, max: 25 }, y: { min: -45, max: 45 }, z: { min: -45, max: 30 } };

/**
 * The joints a photographer can reach, head downwards.
 *
 * Fingers, toes and the root stay out: the root is the character's own
 * transform, and the fingers are posed by the clip.
 */
export const EDITABLE_JOINTS: EditableJoint[] = [
  { id: 'head', node: 'mixamorigHead', label: 'Hode',
    limits: { x: { min: -40, max: 25 }, y: { min: -70, max: 70 }, z: { min: -40, max: 40 } } },
  { id: 'neck', node: 'mixamorigNeck', label: 'Nakke',
    limits: { x: { min: -20, max: 20 }, y: { min: -40, max: 40 }, z: { min: -25, max: 25 } } },
  { id: 'chest', node: 'mixamorigSpine2', label: 'Bryst',
    limits: { x: { min: -20, max: 20 }, y: { min: -35, max: 35 }, z: { min: -20, max: 20 } } },
  { id: 'upperBack', node: 'mixamorigSpine1', label: 'Øvre rygg',
    limits: { x: { min: -15, max: 15 }, y: { min: -20, max: 20 }, z: { min: -15, max: 15 } } },
  { id: 'lowerBack', node: 'mixamorigSpine', label: 'Nedre rygg',
    limits: { x: { min: -20, max: 20 }, y: { min: -20, max: 20 }, z: { min: -15, max: 15 } } },

  { id: 'leftShoulderBlade', node: 'mixamorigLeftShoulder', label: 'Venstre skulderblad', limits: LEFT_SHOULDER_BLADE },
  { id: 'rightShoulderBlade', node: 'mixamorigRightShoulder', label: 'Høyre skulderblad', limits: mirrored(LEFT_SHOULDER_BLADE) },
  { id: 'leftShoulder', node: 'mixamorigLeftArm', label: 'Venstre skulder', limits: LEFT_UPPER_ARM },
  { id: 'rightShoulder', node: 'mixamorigRightArm', label: 'Høyre skulder', limits: mirrored(LEFT_UPPER_ARM) },

  // The elbow only bends, and only one way: negative X, as the seated clip does.
  { id: 'leftElbow', node: 'mixamorigLeftForeArm', label: 'Venstre albue', limits: hinge(-150, 0) },
  { id: 'rightElbow', node: 'mixamorigRightForeArm', label: 'Høyre albue', limits: hinge(-150, 0) },

  { id: 'leftHand', node: 'mixamorigLeftHand', label: 'Venstre hånd', limits: LEFT_HAND },
  { id: 'rightHand', node: 'mixamorigRightHand', label: 'Høyre hånd', limits: mirrored(LEFT_HAND) },

  { id: 'leftHip', node: 'mixamorigLeftUpLeg', label: 'Venstre hofte', limits: LEFT_THIGH },
  { id: 'rightHip', node: 'mixamorigRightUpLeg', label: 'Høyre hofte', limits: mirrored(LEFT_THIGH) },

  // The knee bends the other way from the elbow: positive X, as the seated clip does.
  { id: 'leftKnee', node: 'mixamorigLeftLeg', label: 'Venstre kne', limits: hinge(0, 150) },
  { id: 'rightKnee', node: 'mixamorigRightLeg', label: 'Høyre kne', limits: hinge(0, 150) },
];

const JOINTS_BY_ID = new Map(EDITABLE_JOINTS.map(joint => [joint.id, joint]));
const JOINTS_BY_NODE = new Map(EDITABLE_JOINTS.map(joint => [joint.node, joint]));

export function jointById(id: string): EditableJoint | undefined {
  return JOINTS_BY_ID.get(id);
}

export function jointByNode(node: string): EditableJoint | undefined {
  return JOINTS_BY_NODE.get(node);
}

/** Axes a joint can actually travel on, in order. */
export function freeAxes(joint: EditableJoint): JointAxis[] {
  return (['x', 'y', 'z'] as JointAxis[]).filter(axis => joint.limits[axis] !== undefined);
}

export const DEG = Math.PI / 180;

/**
 * Clamp a joint rotation, in radians, to what that joint can do.
 *
 * A locked axis is driven to zero rather than left where it was, so a hinge
 * cannot accumulate sideways drift from a gizmo drag.
 *
 * ponytail: per-axis clamping of an Euler decomposition. It is exact for the
 * hinges and honest for the rest; a coupled range-of-motion envelope is only
 * worth building if a pose that passes here still reads as wrong.
 */
export function clampJointRotation(
  jointId: string,
  rotation: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const joint = JOINTS_BY_ID.get(jointId);
  if (!joint) throw new RangeError(`Unknown joint ${jointId}`);
  const clampAxis = (axis: JointAxis, value: number): number => {
    const limit = joint.limits[axis];
    if (!limit) return 0;
    if (!Number.isFinite(value)) return 0;
    return Math.min(limit.max * DEG, Math.max(limit.min * DEG, value));
  };
  return {
    x: clampAxis('x', rotation.x),
    y: clampAxis('y', rotation.y),
    z: clampAxis('z', rotation.z),
  };
}

/** True when a rotation is already inside the joint's range. */
export function isWithinLimits(
  jointId: string,
  rotation: { x: number; y: number; z: number },
  toleranceRad = 1e-6,
): boolean {
  const clamped = clampJointRotation(jointId, rotation);
  return (['x', 'y', 'z'] as JointAxis[]).every(
    axis => Math.abs(clamped[axis] - rotation[axis]) <= toleranceRad,
  );
}
