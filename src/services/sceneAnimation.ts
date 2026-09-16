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

/**
 * What a track drives.
 *
 * All four carry the same keyframe shape, which keeps one sampler and one
 * document format:
 *
 * - `position`, `rotation` — metres and radians, xyz
 * - `intensity` — the fixture's own output scale in `x`; y and z unused
 * - `color`     — red, green and blue in xyz, each 0 to 1
 * - `target`    — what a camera looks at, in metres
 *
 * Without intensity and colour a flickering bulb, a police light and a lamp
 * dimmed through a scene are not expressible at all, which is most of what
 * film lighting actually does.
 */
export type TrackChannel = 'position' | 'rotation' | 'intensity' | 'color' | 'target';

export const TRACK_CHANNELS: TrackChannel[] = ['position', 'rotation', 'intensity', 'color', 'target'];

export interface AnimationTrack {
  id: string;
  /** Whatever the caller can resolve: a light, a prop, an actor. */
  nodeId: string;
  type: TrackChannel;
  keyframes: Keyframe[];
}

/**
 * A named piece of the sequence, played when the photographer says.
 *
 * A scene is rarely one continuous move: the helicopter arrives, then the
 * light fails, then the car pulls away. A cue holds its tracks in its own
 * time, starting at zero, and `start` places it on the scene's clock. Moving
 * a cue moves everything in it together, which is the point — otherwise
 * retiming a beat means editing every keyframe in it.
 */
export interface AnimationCue {
  id: string;
  name: string;
  /** Where the cue begins on the scene timeline, in seconds. */
  start: number;
  /**
   * How long it plays, if it should stop before its tracks run out. Absent
   * means it runs to its own last keyframe and then holds.
   */
  duration?: number;
  enabled: boolean;
  /** Keyframe times are relative to the cue, not to the scene. */
  tracks: AnimationTrack[];
}

export interface SceneAnimation {
  /** Seconds. Never shorter than the last thing that moves. */
  duration: number;
  /** Tracks on the scene's own clock. */
  tracks: AnimationTrack[];
  /** Cues, each on its own clock, placed by `start`. */
  cues: AnimationCue[];
}

export const EMPTY_ANIMATION: SceneAnimation = { duration: 0, tracks: [], cues: [] };

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

/** The moment the last thing on these tracks stops moving. */
export function animationDuration(tracks: AnimationTrack[]): number {
  let end = 0;
  for (const track of tracks) {
    for (const frame of track.keyframes) {
      if (frame.time > end) end = frame.time;
    }
  }
  return end;
}

/** How long a cue runs: what it was given, or what its tracks need. */
export function cueDuration(cue: AnimationCue): number {
  const own = animationDuration(cue.tracks);
  return cue.duration !== undefined ? Math.min(cue.duration, own) || cue.duration : own;
}

/** The moment the whole sequence, cues included, comes to rest. */
export function sequenceDuration(animation: Pick<SceneAnimation, 'tracks' | 'cues'>): number {
  let end = animationDuration(animation.tracks);
  for (const cue of animation.cues ?? []) {
    const finish = cue.start + cueDuration(cue);
    if (finish > end) end = finish;
  }
  return end;
}

/** One value a scene should hold at a moment, for one thing and one channel. */
export interface ChannelValue {
  nodeId: string;
  channel: TrackChannel;
  value: Vec3Value;
}

/**
 * Everything the scene should be showing at `time`.
 *
 * Scene tracks play throughout. A cue contributes only once it has started,
 * and holds its last value afterwards rather than snapping back — a light
 * dimmed by a cue stays dim until something else changes it. A disabled cue
 * contributes nothing, which is how a beat is muted while the rest is worked
 * on.
 *
 * Later cues win over earlier ones on the same thing and channel, so a
 * sequence reads top to bottom like a cue sheet.
 */
export function sampleAnimation(
  animation: Pick<SceneAnimation, 'tracks' | 'cues'>,
  time: number,
): ChannelValue[] {
  const values = new Map<string, ChannelValue>();

  const collect = (tracks: AnimationTrack[], localTime: number) => {
    for (const track of tracks) {
      const value = sampleTrack(track.keyframes, localTime);
      if (!value) continue;
      values.set(`${track.nodeId}:${track.type}`, { nodeId: track.nodeId, channel: track.type, value });
    }
  };

  collect(animation.tracks, time);

  const cues = [...(animation.cues ?? [])].sort((a, b) => a.start - b.start);
  for (const cue of cues) {
    if (!cue.enabled) continue;
    const local = time - cue.start;
    // Not yet: whatever it will do has not begun, so it must not reach back
    // and move something before its moment.
    if (local < 0) continue;
    const length = cueDuration(cue);
    collect(cue.tracks, cue.duration !== undefined ? Math.min(local, length) : local);
  }

  return [...values.values()];
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
  if (!TRACK_CHANNELS.includes(value.type as TrackChannel)) return null;
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
  return { id: value.id, nodeId: value.nodeId, type: value.type as TrackChannel, keyframes: sortKeyframes(keyframes) };
}

function parseTracks(raw: unknown): AnimationTrack[] {
  const seen = new Set<string>();
  const tracks: AnimationTrack[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const track = parseTrack(entry);
    if (!track || seen.has(track.id)) continue;
    seen.add(track.id);
    tracks.push(track);
  }
  return tracks;
}

function parseCue(raw: unknown): AnimationCue | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string' || !value.id) return null;
  const tracks = parseTracks(value.tracks);
  // A cue with nothing in it would occupy the sequence without doing anything.
  if (tracks.length === 0) return null;
  const start = typeof value.start === 'number' && Number.isFinite(value.start) ? Math.max(0, value.start) : 0;
  const duration = typeof value.duration === 'number' && Number.isFinite(value.duration) && value.duration > 0
    ? value.duration
    : undefined;
  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name ? value.name : value.id,
    start,
    ...(duration !== undefined ? { duration } : {}),
    enabled: value.enabled !== false,
    tracks,
  };
}

/**
 * Read a document's sequence.
 *
 * Tracks and cues that describe nothing playable are dropped rather than
 * half-applied, and the duration is never allowed to fall short of the last
 * thing that moves: a timeline that ends before its own movement would cut it
 * off.
 */
export function parseAnimation(raw: unknown): SceneAnimation {
  if (!raw || typeof raw !== 'object') return { duration: 0, tracks: [], cues: [] };
  const value = raw as Record<string, unknown>;
  const tracks = parseTracks(value.tracks);

  const seenCues = new Set<string>();
  const cues: AnimationCue[] = [];
  for (const entry of Array.isArray(value.cues) ? value.cues : []) {
    const cue = parseCue(entry);
    if (!cue || seenCues.has(cue.id)) continue;
    seenCues.add(cue.id);
    cues.push(cue);
  }

  const stated = typeof value.duration === 'number' && Number.isFinite(value.duration) && value.duration > 0
    ? value.duration
    : 0;
  return { duration: Math.max(stated, sequenceDuration({ tracks, cues })), tracks, cues };
}
