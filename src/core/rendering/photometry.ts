/**
 * Photometric conversions for studio fixtures.
 *
 * Everything here is pure arithmetic on documented photographic units so the
 * numbers can be asserted in unit tests instead of judged by eye:
 *
 *  - candela (cd)  : on-axis luminous intensity of a fixture
 *  - lux (lx)      : illuminance arriving at a surface, E = I / d²
 *  - EV            : exposure value at ISO 100
 *
 * ISO 2720:1974 incident metering with a flat receptor uses C = 250, giving
 * E = (C / S) · 2^EV. At ISO 100 that is E = 2.5 · 2^EV.
 *
 * Scene intensity is Babylon's `Light.intensity` with `FALLOFF_PHYSICAL`,
 * which applies the same 1/d² law. It is therefore proportional to candela;
 * the single constant below is the scene's calibration, nothing else.
 */

export interface FixturePhotometrics {
  /** Manufacturer-measured illuminance at 1 m, on axis. Most reliable. */
  lux1m?: number;
  /** Total luminous flux. Converted through the beam solid angle. */
  lumens?: number;
  /** Beam angle in degrees (full angle, not half). */
  beamAngleDeg?: number;
}

/** ISO 2720:1974 incident-light constant for a flat receptor. */
export const INCIDENT_METER_CONSTANT_C = 250;

/**
 * Babylon scene intensity per candela.
 *
 * Calibrated on the Aputure LS 300d II: lux@1m = 45000 maps to the scene
 * intensity 450 that the hand-tuned studio rig was built around, so existing
 * saved scenes keep their exposure while every other fixture now sits at its
 * true ratio relative to it.
 */
export const SCENE_INTENSITY_PER_CANDELA = 0.01;

/** Fallback beam angle (degrees) when a fixture publishes no beam data. */
export const DEFAULT_BEAM_ANGLE_DEG = 120;

/** Solid angle of a cone in steradian: Ω = 2π(1 − cos(θ/2)). */
export function coneSolidAngle(beamAngleDeg: number): number {
  if (!Number.isFinite(beamAngleDeg) || beamAngleDeg <= 0) {
    throw new RangeError('Beam angle must be a positive finite number of degrees');
  }
  const full = Math.min(beamAngleDeg, 360);
  return 2 * Math.PI * (1 - Math.cos((full / 2) * (Math.PI / 180)));
}

/**
 * On-axis luminous intensity of a fixture, in candela.
 *
 * lux@1m is preferred because manufacturers measure it directly; lumens is a
 * derived second choice because it has to be spread over the beam solid angle.
 * Returns null when the fixture carries neither.
 */
export function fixtureCandela(spec: FixturePhotometrics): number | null {
  if (typeof spec.lux1m === 'number' && spec.lux1m > 0) {
    return spec.lux1m;
  }
  if (typeof spec.lumens === 'number' && spec.lumens > 0) {
    const beam = spec.beamAngleDeg && spec.beamAngleDeg > 0 ? spec.beamAngleDeg : DEFAULT_BEAM_ANGLE_DEG;
    const solidAngle = coneSolidAngle(beam);
    return solidAngle > 1e-6 ? spec.lumens / solidAngle : spec.lumens;
  }
  return null;
}

/** Inverse-square law: E = I / d². */
export function illuminanceAt(candela: number, metres: number, minMetres = 0.05): number {
  if (!Number.isFinite(candela) || candela < 0) {
    throw new RangeError('Candela must be a non-negative finite number');
  }
  const d = Math.max(metres, minMetres);
  return candela / (d * d);
}

/** Stops between two illuminances (positive when `to` is brighter). */
export function stopsBetween(from: number, to: number): number {
  if (from <= 0 || to <= 0) throw new RangeError('Illuminance must be positive to compare stops');
  return Math.log2(to / from);
}

/** Incident EV at ISO 100 for a measured illuminance. */
export function evAtIso100(lux: number): number {
  if (!Number.isFinite(lux) || lux <= 0) throw new RangeError('Illuminance must be positive');
  return Math.log2((lux * 100) / INCIDENT_METER_CONSTANT_C);
}

/** Aperture that exposes `lux` correctly: f = √(E · t · S / C). */
export function apertureForIlluminance(lux: number, iso: number, shutterSeconds: number): number {
  if (![lux, iso, shutterSeconds].every(v => Number.isFinite(v) && v > 0)) {
    throw new RangeError('Illuminance, ISO and shutter must be positive finite values');
  }
  return Math.sqrt((lux * shutterSeconds * iso) / INCIDENT_METER_CONSTANT_C);
}

/** Babylon `Light.intensity` for a fixture's real candela. Linear, never clamped. */
export function sceneIntensityFromCandela(candela: number): number {
  if (!Number.isFinite(candela) || candela < 0) {
    throw new RangeError('Candela must be a non-negative finite number');
  }
  return candela * SCENE_INTENSITY_PER_CANDELA;
}

/**
 * Effective emitting size of a fixture or modifier, in metres.
 *
 * The catalogue labels carry real dimensions ("Softboks 90×120 cm",
 * "Oktaboks 120 cm", "Diffusjonsramme 4×4 ft", "Fresnel 12\""), so the label
 * is the source of truth and the GLB is only the fallback. Penumbra width
 * scales with this, which is the whole reason a 150 cm octabox looks different
 * from a snoot.
 *
 * A rectangular source casts a different penumbra along each axis; a 30×120 cm
 * stripbox is soft down its length and crisp across it. One scalar cannot hold
 * both, so we take the geometric mean — the size of the square source with the
 * same area. Taking the larger side instead would rank a stripbox as softer
 * than a 90 cm softbox, which is backwards.
 *
 * ponytail: single-axis approximation. Split into per-axis penumbra only if
 * rim shadows from strip sources read wrong against a reference render.
 */
export function modifierSizeMetres(label: string, glbFile?: string): number {
  const text = label ?? '';

  const cmPair = text.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  if (cmPair) return geometricMean(num(cmPair[1]), num(cmPair[2])) / 100;

  const cmSingle = text.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
  if (cmSingle) return num(cmSingle[1]) / 100;

  const ftPair = text.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*ft/i);
  if (ftPair) return geometricMean(num(ftPair[1]), num(ftPair[2])) * 0.3048;

  const inches = text.match(/(\d+(?:[.,]\d+)?)\s*"/);
  if (inches) return num(inches[1]) * 0.0254;

  return glbFallbackSizeMetres(glbFile);
}

function num(raw: string): number {
  return Number.parseFloat(raw.replace(',', '.'));
}

/** Side of the square with the same area as an a × b source. */
function geometricMean(a: number, b: number): number {
  return Math.sqrt(a * b);
}

/** Sizes for bare fixtures whose label carries no dimension. */
const GLB_FALLBACK_SIZE_METRES: Record<string, number> = {
  'softbox-stand.glb': 0.9,
  'octabox-stand.glb': 0.9,
  'stripbox-stand.glb': 0.3,
  'beauty-dish-stand.glb': 0.42,
  'ring-light-stand.glb': 0.35,
  'led-panel-stand.glb': 0.4,
  'hmi-fresnel-stand.glb': 0.25,
  'snoot-stand.glb': 0.1,
  'parabolic-stand.glb': 0.9,
  'umbrella-stand.glb': 1.0,
  'umbrella-shootthrough.glb': 1.0,
  'umbrella-gold.glb': 1.0,
  'chimera-frame.glb': 0.9,
  'lantern-globe.glb': 0.6,
  'kino-flo-bank.glb': 0.6,
  'diffusion-frame.glb': 1.2,
  'open-reflector.glb': 0.3,
};

export function glbFallbackSizeMetres(glbFile?: string): number {
  if (!glbFile) return 0.3;
  const file = glbFile.split('/').pop() ?? '';
  return GLB_FALLBACK_SIZE_METRES[file] ?? 0.3;
}

/**
 * Babylon `contactHardeningLightSizeUVRatio` for a source of the given size.
 *
 * PCSS reads the light size in shadow-map UV space, and the shadow map spans
 * the spot cone at its far plane: width ≈ 2·far·tan(θ/2). So the ratio is the
 * source's share of that width, which makes a big modifier produce a wide
 * penumbra and a snoot a crisp edge — the same relationship as the real set.
 *
 * ponytail: a single on-axis ratio, not a per-pixel solid-angle solve. Good
 * enough for previsualization; revisit if measured penumbra widths disagree.
 */
export function contactHardeningRatio(
  sourceSizeMetres: number,
  beamAngleRad: number,
  shadowFarMetres = 30,
  minRatio = 0.002,
  maxRatio = 0.5,
): number {
  if (!Number.isFinite(sourceSizeMetres) || sourceSizeMetres <= 0) {
    throw new RangeError('Source size must be a positive finite number of metres');
  }
  if (!Number.isFinite(beamAngleRad) || beamAngleRad <= 0 || beamAngleRad >= Math.PI) {
    throw new RangeError('Beam angle must be a positive finite angle below π radians');
  }
  const mapWidth = 2 * shadowFarMetres * Math.tan(beamAngleRad / 2);
  return clamp(sourceSizeMetres / mapWidth, minRatio, maxRatio);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
