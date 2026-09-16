/**
 * Movement that survives being saved.
 *
 * A scenario is rarely a still: an air ambulance arrives, a door opens, a light
 * is walked in. The studio could already keyframe a light, but only a light —
 * `applyAnimationAtTime` looked its target up in the light table and nothing
 * else could move — and none of it was written to the document, so a scene
 * that depended on movement did not survive being reopened.
 *
 * A track addresses a node by id and says nothing about what that node is. The
 * caller resolves the id, so a light, a prop and an actor are all animated by
 * the same code.
 *
 * Angles are radians here, as everywhere else in a scene document. The light
 * panel works in degrees and converts at its own edge; keeping two units in the
 * saved format would guarantee that one day something turns by a factor of 57.
 */

export interface Vec3Value {
  x: number;
  y: number;
  z: number;
}

export interface Keyframe {
  /** Seconds from the start of the timeline. */
  time: number;
  value: Vec3Value;
}

export type TrackChannel = 'position' | 'rotation';

export interface AnimationTrack {
  id: string;
  /** Whatever the caller can resolve: a light, a prop, an actor. */
  nodeId: string;
  type: TrackChannel;
  keyframes: Keyframe[];
}

export interface SceneAnimation {
  /** Seconds. Never shorter than the last keyframe. */
  duration: number;
  tracks: AnimationTrack[];
}

export const EMPTY_ANIMATION: SceneAnimation = { duration: 0, tracks: [] };

/** Two keyframes closer together than this are the same moment. */
export const KEYFRAME_EPSILON = 0.01;

function isFinite3(value: unknown): value is Vec3Value {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['x', 'y', 'z'].every(axis => typeof v[axis] === 'number' && Number.isFinite(v[axis] as number));
}

/**
 * Where a track stands at `time`.
 *
 * Holds at the first and last keyframe rather than extrapolating: a helicopter
 * that has landed should stay landed, not carry on through the floor. Returns
 * null for a track with nothing in it, so the caller leaves the node alone
 * instead of moving it to the origin.
 */
export function sampleTrack(keyframes: Keyframe[], time: number): Vec3Value | null {
  if (keyframes.length === 0) return null;
  const sorted = sortKeyframes(keyframes);
  if (sorted.length === 1 || time <= sorted[0].time) return { ...sorted[0].value };
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return { ...last.value };

  let previous = sorted[0];
  let next = last;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      previous = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const span = next.time - previous.time;
  // Two keyframes at the same instant: the later one wins rather than dividing by zero.
  if (span <= 0) return { ...next.value };
  const t = (time - previous.time) / span;
  return {
    x: previous.value.x + (next.value.x - previous.value.x) * t,
    y: previous.value.y + (next.value.y - previous.value.y) * t,
    z: previous.value.z + (next.value.z - previous.value.z) * t,
  };
}

/** Keyframes in time order, without disturbing the caller's array. */
export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

/**
 * Put a keyframe on a track, replacing one already at that moment.
 *
 * Returns a new array: a track being played from must not change underfoot.
 */
export function upsertKeyframe(keyframes: Keyframe[], time: number, value: Vec3Value): Keyframe[] {
  const next = keyframes.filter(frame => Math.abs(frame.time - time) >= KEYFRAME_EPSILON);
  next.push({ time, value: { ...value } });
  return sortKeyframes(next);
}

/** The moment the last thing stops moving. */
export function animationDuration(tracks: AnimationTrack[]): number {
  let end = 0;
  for (const track of tracks) {
    for (const frame of track.keyframes) {
      if (frame.time > end) end = frame.time;
    }
  }
  return end;
}

/** Node ids a set of tracks needs the scene to provide. */
export function animatedNodeIds(tracks: AnimationTrack[]): string[] {
  return [...new Set(tracks.map(track => track.nodeId))];
}

function parseTrack(raw: unknown): AnimationTrack | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string' || !value.id) return null;
  if (typeof value.nodeId !== 'string' || !value.nodeId) return null;
  if (value.type !== 'position' && value.type !== 'rotation') return null;
  if (!Array.isArray(value.keyframes)) return null;

  const keyframes: Keyframe[] = [];
  for (const entry of value.keyframes) {
    if (!entry || typeof entry !== 'object') continue;
    const frame = entry as Record<string, unknown>;
    // A keyframe at no particular time, or holding nothing, would move the
    // node somewhere nobody asked for.
    if (typeof frame.time !== 'number' || !Number.isFinite(frame.time) || frame.time < 0) continue;
    if (!isFinite3(frame.value)) continue;
    const v = frame.value as Vec3Value;
    keyframes.push({ time: frame.time, value: { x: v.x, y: v.y, z: v.z } });
  }
  if (keyframes.length === 0) return null;
  return { id: value.id, nodeId: value.nodeId, type: value.type, keyframes: sortKeyframes(keyframes) };
}

/**
 * Read a document's animation.
 *
 * Tracks that describe nothing playable are dropped rather than half-applied,
 * and the duration is never allowed to fall short of the last keyframe: a
 * timeline that ends before the movement does would cut it off.
 */
export function parseAnimation(raw: unknown): SceneAnimation {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ANIMATION, tracks: [] };
  const value = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const tracks: AnimationTrack[] = [];
  for (const entry of Array.isArray(value.tracks) ? value.tracks : []) {
    const track = parseTrack(entry);
    if (!track || seen.has(track.id)) continue;
    seen.add(track.id);
    tracks.push(track);
  }
  const stated = typeof value.duration === 'number' && Number.isFinite(value.duration) && value.duration > 0
    ? value.duration
    : 0;
  return { duration: Math.max(stated, animationDuration(tracks)), tracks };
}
