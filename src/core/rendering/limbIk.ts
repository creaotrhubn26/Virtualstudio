/**
 * Two-bone inverse kinematics for arms and legs.
 *
 * Placing a hand by rotating the shoulder and then the elbow is how a rig
 * works, not how a photographer thinks. This solves the other way round: give
 * it where the hand should be and it returns where the elbow has to go.
 *
 * The same analytic solve already produces the seated pose in
 * `scripts/characters/build_studio_characters.py`, where the arms are placed
 * onto the thighs from the real limb lengths. Keeping the runtime on the same
 * construction means a posed limb and a bundled clip bend the same way.
 *
 * Pure vector arithmetic on plain objects: no Babylon types, so the geometry
 * can be asserted in unit tests rather than judged on screen.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TwoBoneChain {
  /** Shoulder or hip, in world space. */
  root: Vec3;
  /** Elbow or knee, in world space. Sets the limb lengths and the rest bend. */
  mid: Vec3;
  /** Hand or foot, in world space. */
  end: Vec3;
}

export interface TwoBoneSolution {
  /** Where the elbow or knee ends up. */
  mid: Vec3;
  /** Where the hand or foot ends up — the target, unless it is out of reach. */
  end: Vec3;
  /** True when the target was further away than the limb can stretch. */
  overextended: boolean;
  /** Interior angle at the elbow or knee, radians: π is straight. */
  bend: number;
}

/**
 * How close to straight a limb may lock.
 *
 * A fully extended limb has no plane left to bend in, so the elbow position
 * becomes undefined and the joint snaps about. Real limbs stop short of
 * straight too.
 */
export const MAX_EXTENSION = 0.995;

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, factor: number): Vec3 {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3, fallback: Vec3 = { x: 0, y: 0, z: 1 }): Vec3 {
  const len = length(a);
  return len > 1e-9 ? scale(a, 1 / len) : { ...fallback };
}

/** The part of `a` that is perpendicular to the unit vector `axis`. */
export function reject(a: Vec3, axis: Vec3): Vec3 {
  return subtract(a, scale(axis, dot(a, axis)));
}

/**
 * The plane the limb currently bends in, as a unit vector from the root-to-end
 * line towards the elbow.
 *
 * Used when the caller gives no preference, so a solved limb keeps bending the
 * way it already does instead of flipping its elbow behind the body.
 */
export function chainPole(chain: TwoBoneChain, fallback: Vec3 = { x: 0, y: 0, z: 1 }): Vec3 {
  const axis = normalize(subtract(chain.end, chain.root), fallback);
  const towardsMid = reject(subtract(chain.mid, chain.root), axis);
  if (length(towardsMid) > 1e-6) return normalize(towardsMid);

  // A straight limb has no plane of its own; take any direction across it.
  const seed = Math.abs(axis.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  return normalize(reject(seed, axis), fallback);
}

/**
 * Place the hand or foot at `target` and work out where the elbow or knee goes.
 *
 * Law of cosines on the triangle root–mid–end: the distance along the line to
 * the target fixes how far down that line the elbow sits, and the remaining
 * side of the triangle fixes how far out. `pole` chooses which way "out" is;
 * without one the limb keeps its current bend plane.
 *
 * ponytail: analytic two-bone solve, no joint limits of its own. The caller
 * clamps the rotations it derives, which is where the limits live.
 */
export function solveTwoBoneIk(
  chain: TwoBoneChain,
  target: Vec3,
  pole?: Vec3,
): TwoBoneSolution {
  const upper = length(subtract(chain.mid, chain.root));
  const lower = length(subtract(chain.end, chain.mid));
  if (!(upper > 1e-9) || !(lower > 1e-9)) {
    throw new RangeError('A two-bone chain needs two segments of non-zero length');
  }

  const toTarget = subtract(target, chain.root);
  const reach = length(toTarget);
  const maxReach = (upper + lower) * MAX_EXTENSION;
  const minReach = Math.abs(upper - lower) * 1.001 + 1e-4;

  const fallbackAxis = normalize(subtract(chain.end, chain.root));
  const direction = reach > 1e-9 ? scale(toTarget, 1 / reach) : fallbackAxis;
  const overextended = reach > maxReach;
  const distance = Math.min(Math.max(reach, minReach), maxReach);

  // Distance from the root to the foot of the elbow's perpendicular.
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const offset = Math.sqrt(Math.max(0, upper * upper - along * along));

  const preferred = pole ?? chainPole(chain, fallbackAxis);
  const planar = reject(preferred, direction);
  const bendDirection = length(planar) > 1e-6
    ? normalize(planar)
    : chainPole({ ...chain, end: add(chain.root, scale(direction, distance)) }, fallbackAxis);

  const mid = add(chain.root, add(scale(direction, along), scale(bendDirection, offset)));
  const end = add(chain.root, scale(direction, distance));

  // Interior angle at the elbow, from the triangle's three sides.
  const cosBend = (upper * upper + lower * lower - distance * distance) / (2 * upper * lower);
  const bend = Math.acos(Math.min(1, Math.max(-1, cosBend)));

  return { mid, end, overextended, bend };
}
