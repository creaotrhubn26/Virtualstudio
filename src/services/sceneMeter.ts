/**
 * Metering the scene where the photographer points, in photographic units.
 *
 * The studio has six video scopes — histogram, waveform, vectorscope, skin
 * tone, zebra and false colour — and all six describe the *picture*. None of
 * them answers the question a photographer actually asks on the floor: how
 * much light is falling on that cheek, and what aperture does it want.
 *
 * `photometry` already has the arithmetic for one fixture at one distance.
 * This is the rest of it: several fixtures at once, through their cones, onto
 * a surface that may be turned away from them.
 */

import { apertureForIlluminance, evAtIso100, illuminanceAt, stopsBetween } from '../core/rendering/photometry';

export interface MeterVec3 {
  x: number;
  y: number;
  z: number;
}

export interface MeterFixture {
  /** A name, so a reading can say which light did the work. */
  name?: string;
  position: MeterVec3;
  /** Where it points. Omitted for a source that throws light everywhere. */
  direction?: MeterVec3;
  /** On-axis luminous intensity, candela. */
  candela: number;
  /** Full cone angle, radians. Omitted for a source with no cone. */
  coneRad?: number;
  /** Hotspot falloff inside the cone; Babylon's spot exponent. */
  exponent?: number;
  enabled?: boolean;
}

function subtract(a: MeterVec3, b: MeterVec3): MeterVec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function length(v: MeterVec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function normalise(v: MeterVec3): MeterVec3 {
  const len = length(v);
  return len > 1e-9 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
}

function dot(a: MeterVec3, b: MeterVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * What one fixture delivers at a point, lux.
 *
 * Three things reduce it from the on-axis figure, and all three are real:
 * distance by the inverse square, the angle off the beam axis by the spot's
 * own falloff, and the tilt of the surface by Lambert's cosine law. A meter
 * held flat to the light reads the most; the same meter turned away reads
 * less, which is why an incident reading is taken facing the camera.
 */
export function fixtureIlluminanceAt(
  fixture: MeterFixture,
  point: MeterVec3,
  surfaceNormal?: MeterVec3,
): number {
  if (fixture.enabled === false) return 0;
  if (!Number.isFinite(fixture.candela) || fixture.candela <= 0) return 0;

  const toPoint = subtract(point, fixture.position);
  const distance = length(toPoint);
  if (distance < 1e-6) return 0;
  const ray = normalise(toPoint);

  let beam = 1;
  if (fixture.direction) {
    const axis = normalise(fixture.direction);
    const cosAngle = dot(axis, ray);
    // Behind the fixture, or outside its cone: no light at all.
    if (cosAngle <= 0) return 0;
    if (fixture.coneRad !== undefined && cosAngle < Math.cos(fixture.coneRad / 2)) return 0;
    beam = Math.pow(cosAngle, Math.max(0, fixture.exponent ?? 0));
  }

  let incidence = 1;
  if (surfaceNormal) {
    const normal = normalise(surfaceNormal);
    // The surface faces the light by however much it faces it, and not at all
    // once it has turned away.
    incidence = Math.max(0, -dot(normal, ray));
  }

  return illuminanceAt(fixture.candela, distance) * beam * incidence;
}

export interface MeterReading {
  /** Total illuminance at the point, lux. */
  lux: number;
  /** Exposure value at ISO 100. */
  ev: number;
  /** The aperture this reading wants at the given ISO and shutter. */
  aperture: number;
  /** Which fixture contributed most, and how much of the total it was. */
  dominant: { name: string; lux: number; share: number } | null;
  /** Every fixture's own contribution, brightest first. */
  contributions: { name: string; lux: number }[];
}

export interface MeterSettings {
  iso: number;
  shutterSeconds: number;
  /** Which way the meter faces. Towards the camera for an incident reading. */
  normal?: MeterVec3;
}

/**
 * A reading at a point, the way a handheld meter gives one.
 *
 * The breakdown matters as much as the number: "1 240 lux, and 80 % of it is
 * the key" tells a photographer what to change, where a single figure does not.
 */
export function meterAt(
  fixtures: MeterFixture[],
  point: MeterVec3,
  settings: MeterSettings,
): MeterReading {
  const contributions = fixtures
    .map((fixture, index) => ({
      name: fixture.name ?? `lys ${index + 1}`,
      lux: fixtureIlluminanceAt(fixture, point, settings.normal),
    }))
    .filter(entry => entry.lux > 0)
    .sort((a, b) => b.lux - a.lux);

  const lux = contributions.reduce((total, entry) => total + entry.lux, 0);
  const dominant = contributions.length > 0
    ? { ...contributions[0], share: lux > 0 ? contributions[0].lux / lux : 0 }
    : null;

  return {
    lux,
    ev: lux > 0 ? evAtIso100(lux) : Number.NEGATIVE_INFINITY,
    aperture: lux > 0 ? apertureForIlluminance(lux, settings.iso, settings.shutterSeconds) : 0,
    dominant,
    contributions,
  };
}

/**
 * The lighting ratio between two points, in stops.
 *
 * Metering the lit cheek and the shadowed one is how a key-to-fill ratio is
 * actually established, rather than read off the numbers that were typed in.
 */
export function ratioBetween(
  fixtures: MeterFixture[],
  bright: MeterVec3,
  shadow: MeterVec3,
  settings: MeterSettings,
): number {
  const a = meterAt(fixtures, bright, settings).lux;
  const b = meterAt(fixtures, shadow, settings).lux;
  if (a <= 0 || b <= 0) return 0;
  return stopsBetween(b, a);
}
