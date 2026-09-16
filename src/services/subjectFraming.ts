/**
 * Getting the head in the same place, whoever is standing there.
 *
 * A rig is built for a head at a height. A school photographer does not
 * rebuild it three hundred times in a day: the head stays where it is and the
 * seat moves, which is the only reason a class can be photographed in one
 * morning. That trick only works if the numbers are right, so they are here,
 * as arithmetic that can be asserted rather than judged by eye.
 *
 * The body ratios are the conventional anthropometric proportions of stature,
 * not measurements of a particular person: eye height is about 93.6 % of
 * standing height, vertex above the seat about 52 %, and eyes above the seat
 * about 45 %. They are close enough to place a light and a stool, and they are
 * stated here rather than buried so that a better source can replace them.
 *
 * Children are proportionally longer in the torso than adults, so a young
 * child's sitting height is a slightly larger share of their stature. The
 * correction below is small and deliberate: ignoring it puts a six-year-old's
 * eyes about two centimetres low, which is less than the error in guessing.
 */

import { illuminanceAt, stopsBetween } from '../core/rendering/photometry';

/** Standing eye height as a share of stature. */
export const EYE_RATIO = 0.936;
/** Vertex above the seat, as a share of stature, for an adult. */
export const SITTING_HEIGHT_RATIO = 0.52;
/** Eyes above the seat, as a share of stature, for an adult. */
export const SITTING_EYE_RATIO = 0.45;

/** What a real adjustable stool can actually do, in metres. */
export const STOOL_RANGE = { min: 0.3, max: 0.78 };

export interface Subject {
  /** Standing height, metres. */
  height: number;
  /** A name for the row in a rehearsal, if there is one. */
  label?: string;
}

/**
 * How much longer a child's torso is, as a factor on the sitting ratios.
 *
 * One at adult stature, rising gently for a small child. A six-year-old at
 * 1.17 m comes out about 4 % taller sitting than the adult ratio would say.
 */
export function sittingCorrection(height: number): number {
  if (!Number.isFinite(height) || height <= 0) return 1;
  const child = Math.max(0, Math.min(1, (1.72 - height) / (1.72 - 1.1)));
  return 1 + 0.06 * child;
}

/** Eye height standing, metres. */
export function standingEyeHeight(height: number): number {
  return height * EYE_RATIO;
}

/** Vertex above the seat, metres. */
export function sittingHeight(height: number): number {
  return height * SITTING_HEIGHT_RATIO * sittingCorrection(height);
}

/** Eye height above the seat, metres. */
export function sittingEyeHeight(height: number): number {
  return height * SITTING_EYE_RATIO * sittingCorrection(height);
}

export interface SeatSolution {
  /** Where the seat has to be, metres. */
  seatHeight: number;
  /** Whether a real stool reaches that, or it was clamped to what one does. */
  reachable: boolean;
  /** Where the eyes actually end up once the stool has done what it can. */
  eyeHeight: number;
}

/**
 * The seat height that puts this person's eyes at `targetEye`.
 *
 * Clamped to what a stool can do, and honest about it: a rehearsal that says a
 * seat sits at 4 cm has told the photographer nothing.
 */
export function seatForEyeHeight(targetEye: number, height: number): SeatSolution {
  const wanted = targetEye - sittingEyeHeight(height);
  const seatHeight = Math.max(STOOL_RANGE.min, Math.min(STOOL_RANGE.max, wanted));
  return {
    seatHeight,
    reachable: wanted >= STOOL_RANGE.min - 1e-9 && wanted <= STOOL_RANGE.max + 1e-9,
    eyeHeight: seatHeight + sittingEyeHeight(height),
  };
}

/**
 * Where the key should hang for a given eye height.
 *
 * The portrait convention is a key about 35° above the eye line: high enough
 * for a nose shadow that falls towards the mouth, low enough not to lose the
 * eyes in their sockets.
 */
export function keyHeightFor(eyeHeight: number, distance: number, angleDeg = 35): number {
  return eyeHeight + distance * Math.tan((angleDeg * Math.PI) / 180);
}

/**
 * The angle a lens at `cameraHeight` looks at eyes at `eyeHeight`, in degrees.
 *
 * Positive means looking down at the subject. Past a couple of degrees this is
 * visible, and on a child it reads as an adult standing over them.
 */
export function cameraTiltDeg(cameraHeight: number, eyeHeight: number, distance: number): number {
  if (distance <= 0) return 0;
  return (Math.atan2(cameraHeight - eyeHeight, distance) * 180) / Math.PI;
}

export interface RigProbe {
  /** Where the key stands, metres. */
  position: { x: number; y: number; z: number };
  /** Its on-axis intensity, candela. */
  candela: number;
}

/** Illuminance on a face at `point`, lux. */
export function faceIlluminance(rig: RigProbe, point: { x: number; y: number; z: number }): number {
  const distance = Math.hypot(
    rig.position.x - point.x, rig.position.y - point.y, rig.position.z - point.z);
  return illuminanceAt(rig.candela, distance);
}

export interface RehearsalRow {
  label: string;
  height: number;
  seatHeight: number;
  reachable: boolean;
  eyeHeight: number;
  /** Lux measured at this person's eyes. */
  faceLux: number;
  /** How far this face sits from the reference, in stops. */
  stopsFromReference: number;
  /** Degrees the lens looks down. Negative is looking up. */
  cameraTilt: number;
}

export interface RehearsalOptions {
  /** Where the heads are put, metres. Everyone's eyes end up here. */
  targetEye: number;
  /** The key, as it stands. */
  key: RigProbe;
  /** Where the lens is, metres. */
  cameraHeight: number;
  /** How far the lens is from the subject, metres. */
  cameraDistance: number;
  /** Where the subject stands, so the key's distance is real. */
  subject?: { x: number; z: number };
}

/**
 * Put a whole class through one rig, without changing a thing.
 *
 * This is the question a photographer actually has before the day starts: does
 * my setup hold from the smallest to the tallest? Every row is measured, not
 * estimated — the same inverse-square arithmetic the renderer uses.
 */
export function rehearse(subjects: Subject[], options: RehearsalOptions): RehearsalRow[] {
  const where = options.subject ?? { x: 0, z: 0 };
  const rows = subjects.map((subject, index) => {
    const seat = seatForEyeHeight(options.targetEye, subject.height);
    const faceLux = faceIlluminance(options.key, { x: where.x, y: seat.eyeHeight, z: where.z });
    return {
      label: subject.label ?? `${index + 1}`,
      height: subject.height,
      seatHeight: seat.seatHeight,
      reachable: seat.reachable,
      eyeHeight: seat.eyeHeight,
      faceLux,
      stopsFromReference: 0,
      cameraTilt: cameraTiltDeg(options.cameraHeight, seat.eyeHeight, options.cameraDistance),
    };
  });

  // The reference is the reading the rig was set for: the first subject whose
  // seat actually reaches, so a clamped outlier does not define the exposure.
  const reference = rows.find(row => row.reachable) ?? rows[0];
  if (!reference) return rows;
  for (const row of rows) {
    row.stopsFromReference = row.faceLux > 0 && reference.faceLux > 0
      ? stopsBetween(reference.faceLux, row.faceLux)
      : 0;
  }
  return rows;
}

/** The widest exposure difference across a rehearsal, in stops. */
export function rehearsalSpread(rows: RehearsalRow[]): number {
  if (rows.length === 0) return 0;
  const stops = rows.map(row => row.stopsFromReference);
  return Math.max(...stops) - Math.min(...stops);
}

/**
 * A spread of heights to rehearse against.
 *
 * The defaults are a Norwegian primary school: a small six-year-old at the one
 * end and a tall lower-secondary pupil at the other.
 */
export function heightSpread(min = 1.15, max = 1.75, count = 5): Subject[] {
  if (count < 2) return [{ height: min, label: `${Math.round(min * 100)} cm` }];
  return Array.from({ length: count }, (_, index) => {
    const height = min + ((max - min) * index) / (count - 1);
    return { height, label: `${Math.round(height * 100)} cm` };
  });
}
