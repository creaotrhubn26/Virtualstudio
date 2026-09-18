/**
 * Shots, and what to tell the people in them.
 *
 * Everything else in the studio makes a picture. This makes the thing you hand
 * to somebody: a numbered shot with one sentence per person, in words they can
 * act on without the director standing next to them.
 *
 * The distinction that matters is between a *scene* and a *shot*. The document
 * holds one scene — a place, a rig, a crew standing on marks. A commercial is
 * six shots of that scene, each with its own frame, its own length and its own
 * instruction to each person. A mark says where somebody stands; a direction
 * says what they do there, and without it a mark is an X on the floor.
 *
 * Nothing here renders or touches the scene: it is the sheet, not the set.
 */

export interface ShotDirection {
  /** The mark the person is standing on. */
  markId: string;
  /** Who they are, as the shot calls them: "Servitør", "Gjest ved bordet". */
  who: string;
  /**
   * What they do, in one sentence, addressed to them.
   *
   * "Du setter fra deg pizzaen og ser opp på gjesten." Second person, present
   * tense, one action — the way a direction is actually given on a floor.
   */
  action: string;
}

export interface ShotCamera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  focalLength: number;
  aperture: number;
}

export interface StudioShot {
  id: string;
  /** What people call it on the day. Renumbered by `numberShots`. */
  number: number;
  /** A short name: "Nært på hendene ved ovnen". */
  name: string;
  /** Where it is and how it is lit, by the ids the studio already uses. */
  locationId: string;
  lookId: string;
  camera: ShotCamera;
  /** The named camera move, if the shot moves at all. */
  move?: string;
  /** Who does what. One line each. */
  directions: ShotDirection[];
  /** A note for the crew rather than the cast. */
  note?: string;
  /** Seconds on screen. */
  duration: number;
  /**
   * A still from the taking camera, as a data URL.
   *
   * This is the visual idea — the reason an extra understands in two seconds
   * what a paragraph would not convey. Held apart from the rest so a board can
   * be edited, saved and reordered without carrying megabytes around.
   */
  frame?: string;
}

export interface Storyboard {
  title: string;
  /** Who it is for, printed on the sheet. */
  forWhom?: string;
  shots: StudioShot[];
}

export const EMPTY_STORYBOARD: Storyboard = { title: 'Uten navn', shots: [] };

/** Shots numbered 1, 2, 3 in the order they are in, without disturbing the input. */
export function numberShots(shots: StudioShot[]): StudioShot[] {
  return shots.map((shot, index) => ({ ...shot, number: index + 1 }));
}

/** How long the whole board runs, in seconds. */
export function boardDuration(board: Pick<Storyboard, 'shots'>): number {
  return board.shots.reduce((total, shot) => total + Math.max(0, shot.duration), 0);
}

/** Seconds as a shooting clock: 1:05, not 65. */
export function asClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

/** The lens this shot is on, whatever the board carried. */
export function shotFocalLength(shot: StudioShot): number {
  return shot.camera?.focalLength ?? 50;
}

/**
 * The line the crew reads: lens, aperture, move and length.
 *
 * Deliberately not the same line the cast reads. A camera assistant needs
 * millimetres; an extra needs a sentence about what to do with their hands.
 */
export function shotSummary(shot: StudioShot): string {
  const parts = [`${Math.round(shotFocalLength(shot))} mm`, `f/${shot.camera.aperture}`];
  if (shot.move) parts.push(shot.move);
  parts.push(`${shot.duration.toFixed(1).replace('.', ',')} s`);
  return parts.join(' · ');
}

/**
 * Everything one person is asked to do, across the whole board.
 *
 * This is the sheet you actually hand to an extra: their shots, in order, with
 * their own line in each. Nobody should have to read six shots to find the two
 * they are in.
 */
export function callSheetFor(board: Pick<Storyboard, 'shots'>, markId: string): {
  number: number;
  name: string;
  who: string;
  action: string;
}[] {
  return board.shots.flatMap(shot => {
    const direction = shot.directions.find(entry => entry.markId === markId);
    return direction
      ? [{ number: shot.number, name: shot.name, who: direction.who, action: direction.action }]
      : [];
  });
}

/** Every person the board asks for, in the order they first appear. */
export function peopleOnBoard(board: Pick<Storyboard, 'shots'>): { markId: string; who: string }[] {
  const seen = new Map<string, string>();
  for (const shot of board.shots) {
    for (const direction of shot.directions) {
      if (!seen.has(direction.markId)) seen.set(direction.markId, direction.who);
    }
  }
  return [...seen].map(([markId, who]) => ({ markId, who }));
}

/**
 * Marks with somebody standing on them and nothing to do.
 *
 * This is the failure the whole feature exists to prevent: a person on set,
 * in costume, in frame, who was never told what the shot needs from them. It
 * is reported per shot rather than summed, because "somebody is undirected"
 * is useless without knowing in which shot.
 */
export function undirected(shot: StudioShot, occupiedMarks: string[]): string[] {
  const directed = new Set(shot.directions.map(entry => entry.markId));
  return occupiedMarks.filter(mark => !directed.has(mark));
}

/** A direction worth giving: addressed to somebody, and about something. */
export function isUsableDirection(direction: Pick<ShotDirection, 'action'>): boolean {
  const action = direction.action?.trim() ?? '';
  // Two words is not an instruction; it is a label.
  return action.length >= 8 && action.split(/\s+/).length >= 2;
}

function text(value: unknown, fallback: string, limit = 240): string {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate ? candidate.slice(0, limit) : fallback;
}

function vec(raw: unknown, fallback: { x: number; y: number; z: number }) {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const read = (key: 'x' | 'y' | 'z') =>
    typeof value[key] === 'number' && Number.isFinite(value[key] as number)
      ? (value[key] as number)
      : fallback[key];
  return { x: read('x'), y: read('y'), z: read('z') };
}

function parseShot(raw: unknown, index: number): StudioShot | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const camera = (value.camera && typeof value.camera === 'object' ? value.camera : {}) as Record<string, unknown>;

  const directions: ShotDirection[] = [];
  for (const entry of Array.isArray(value.directions) ? value.directions : []) {
    if (!entry || typeof entry !== 'object') continue;
    const direction = entry as Record<string, unknown>;
    const markId = typeof direction.markId === 'string' ? direction.markId.trim() : '';
    // A direction addressed to nobody cannot be handed to anybody.
    if (!markId) continue;
    directions.push({
      markId,
      who: text(direction.who, markId, 60),
      action: text(direction.action, '', 240),
    });
  }

  const duration = typeof value.duration === 'number' && Number.isFinite(value.duration) && value.duration > 0
    ? Math.min(value.duration, 600)
    : 4;

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `shot-${index + 1}`,
    number: index + 1,
    name: text(value.name, `Opptak ${index + 1}`, 120),
    locationId: text(value.locationId, 'studio', 60),
    lookId: text(value.lookId, 'studio-portrett', 60),
    camera: {
      position: vec(camera.position, { x: 0, y: 1.5, z: -3 }),
      target: vec(camera.target, { x: 0, y: 1.4, z: 0 }),
      focalLength: typeof camera.focalLength === 'number' && camera.focalLength > 0 ? camera.focalLength : 50,
      aperture: typeof camera.aperture === 'number' && camera.aperture > 0 ? camera.aperture : 2.8,
    },
    ...(typeof value.move === 'string' && value.move ? { move: value.move } : {}),
    directions,
    ...(typeof value.note === 'string' && value.note.trim() ? { note: value.note.trim().slice(0, 240) } : {}),
    duration,
    ...(typeof value.frame === 'string' && value.frame.startsWith('data:image') ? { frame: value.frame } : {}),
  };
}

/**
 * Read a board back, keeping whatever is usable.
 *
 * A board is a working document that people edit by hand and machines write
 * badly. A shot that cannot be read is dropped rather than half-restored, and
 * everything else is renumbered so the sheet is still 1, 2, 3.
 */
export function parseStoryboard(raw: unknown): Storyboard {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STORYBOARD, shots: [] };
  const value = raw as Record<string, unknown>;

  const shots: StudioShot[] = [];
  for (const entry of Array.isArray(value.shots) ? value.shots : []) {
    const shot = parseShot(entry, shots.length);
    if (shot) shots.push(shot);
  }

  return {
    title: text(value.title, EMPTY_STORYBOARD.title, 120),
    ...(typeof value.forWhom === 'string' && value.forWhom.trim()
      ? { forWhom: value.forWhom.trim().slice(0, 120) }
      : {}),
    shots: numberShots(shots),
  };
}
