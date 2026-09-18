import { describe, it, expect } from 'vitest';
import { fixtureIlluminanceAt, meterAt, ratioBetween, type MeterFixture } from './sceneMeter';
import { apertureForIlluminance, evAtIso100 } from '../core/rendering/photometry';

/** A key three metres out, aimed at a face at eye height. */
const key: MeterFixture = {
  name: 'Hovedlys',
  position: { x: 2, y: 2.2, z: -2 },
  direction: { x: -2, y: -0.75, z: 2 },
  candela: 12000,
  coneRad: Math.PI / 3,
  exponent: 2,
};

const face = { x: 0, y: 1.45, z: 0 };
const settings = { iso: 100, shutterSeconds: 1 / 125 };

describe('what one fixture delivers', () => {
  it('falls off with the square of the distance', () => {
    const bare: MeterFixture = { position: { x: 0, y: 1.45, z: -1 }, candela: 1000 };
    const near = fixtureIlluminanceAt(bare, face);
    const far = fixtureIlluminanceAt({ ...bare, position: { x: 0, y: 1.45, z: -2 } }, face);
    expect(near / far).toBeCloseTo(4, 6);
  });

  it('gives nothing outside its cone, and nothing behind it', () => {
    // A spot is a cone: a point outside it is not dimly lit, it is unlit.
    const narrow: MeterFixture = {
      position: { x: 0, y: 1.45, z: -3 },
      direction: { x: 0, y: 0, z: 1 },
      candela: 5000,
      coneRad: Math.PI / 12,
    };
    expect(fixtureIlluminanceAt(narrow, face)).toBeGreaterThan(0);
    expect(fixtureIlluminanceAt(narrow, { x: 3, y: 1.45, z: 0 })).toBe(0);
    // Behind the fixture there is no light at all.
    expect(fixtureIlluminanceAt(narrow, { x: 0, y: 1.45, z: -5 })).toBe(0);
  });

  it('dims towards the edge of the beam, by the exponent it was given', () => {
    const wide: MeterFixture = {
      position: { x: 0, y: 1.45, z: -3 },
      direction: { x: 0, y: 0, z: 1 },
      candela: 5000,
      coneRad: Math.PI / 2,
      exponent: 4,
    };
    const onAxis = fixtureIlluminanceAt(wide, face);
    const offAxis = fixtureIlluminanceAt(wide, { x: 1.2, y: 1.45, z: 0 });
    expect(offAxis).toBeGreaterThan(0);
    expect(offAxis).toBeLessThan(onAxis);
    // A flat field is what exponent zero means, distance aside.
    const flat = { ...wide, exponent: 0 };
    const flatOn = fixtureIlluminanceAt(flat, face);
    const flatOff = fixtureIlluminanceAt(flat, { x: 1.2, y: 1.45, z: 0 });
    // Only the inverse square separates them now.
    expect(flatOff / flatOn).toBeCloseTo(9 / (1.2 * 1.2 + 9), 6);
  });

  it('reads less on a surface turned away, and nothing on one facing off', () => {
    // Lambert's law: this is why an incident reading is taken facing the lens.
    const facingLight = fixtureIlluminanceAt(key, face, { x: 2, y: 0.75, z: -2 });
    const facingCamera = fixtureIlluminanceAt(key, face, { x: 0, y: 0, z: -1 });
    const facingAway = fixtureIlluminanceAt(key, face, { x: -1, y: 0, z: 1 });
    expect(facingLight).toBeGreaterThan(facingCamera);
    expect(facingCamera).toBeGreaterThan(0);
    expect(facingAway).toBe(0);
  });

  it('gives nothing when it is switched off, or has no output', () => {
    expect(fixtureIlluminanceAt({ ...key, enabled: false }, face)).toBe(0);
    expect(fixtureIlluminanceAt({ ...key, candela: 0 }, face)).toBe(0);
    expect(fixtureIlluminanceAt({ ...key, candela: Number.NaN }, face)).toBe(0);
  });
});

describe('a reading at a point', () => {
  const fill: MeterFixture = {
    name: 'Utfylling',
    position: { x: -2.5, y: 1.8, z: -2 },
    direction: { x: 2.5, y: -0.35, z: 2 },
    candela: 4000,
    coneRad: Math.PI / 2,
    exponent: 1,
  };

  it('adds the fixtures up and says which did the work', () => {
    const reading = meterAt([key, fill], face, settings);
    const alone = fixtureIlluminanceAt(key, face) + fixtureIlluminanceAt(fill, face);
    expect(reading.lux).toBeCloseTo(alone, 6);
    // The breakdown is the part a photographer acts on.
    expect(reading.dominant?.name).toBe('Hovedlys');
    expect(reading.dominant?.share).toBeGreaterThan(0.5);
    expect(reading.contributions.map(c => c.name)).toEqual(['Hovedlys', 'Utfylling']);
  });

  it('agrees with the exposure arithmetic it is built on', () => {
    const reading = meterAt([key], face, settings);
    expect(reading.ev).toBeCloseTo(evAtIso100(reading.lux), 10);
    expect(reading.aperture).toBeCloseTo(
      apertureForIlluminance(reading.lux, settings.iso, settings.shutterSeconds), 10);
  });

  it('opens up when the light is halved, by exactly one stop', () => {
    const bright = meterAt([key], face, settings);
    const dim = meterAt([{ ...key, candela: key.candela / 2 }], face, settings);
    expect(Math.log2(bright.lux / dim.lux)).toBeCloseTo(1, 10);
    // An aperture is the square root of the light, so a stop is a factor of √2.
    expect(bright.aperture / dim.aperture).toBeCloseTo(Math.SQRT2, 6);
  });

  it('says nothing rather than something when the point is dark', () => {
    const dark = meterAt([{ ...key, enabled: false }], face, settings);
    expect(dark.lux).toBe(0);
    expect(dark.aperture).toBe(0);
    expect(dark.dominant).toBeNull();
    expect(dark.contributions).toEqual([]);
    // Negative infinity, not a number that looks like a reading.
    expect(dark.ev).toBe(Number.NEGATIVE_INFINITY);
  });

  it('leaves out fixtures that contribute nothing at all', () => {
    const behind: MeterFixture = {
      name: 'Bak veggen',
      position: { x: 0, y: 1.45, z: 4 },
      direction: { x: 0, y: 0, z: 1 },
      candela: 9000,
      coneRad: Math.PI / 6,
    };
    const reading = meterAt([key, behind], face, settings);
    expect(reading.contributions.map(c => c.name)).toEqual(['Hovedlys']);
  });
});

describe('the ratio between two cheeks', () => {
  const fill: MeterFixture = {
    position: { x: -2.5, y: 1.8, z: -2 },
    direction: { x: 2.5, y: -0.35, z: 2 },
    candela: 4000,
    coneRad: Math.PI / 2,
    exponent: 1,
  };

  it('is how a lighting ratio is actually established', () => {
    // Metering the lit side and the shadow side, rather than reading back the
    // numbers that were typed into the fixtures.
    const lit = { x: 0.08, y: 1.45, z: 0 };
    const shadow = { x: -0.08, y: 1.45, z: 0 };
    const stops = ratioBetween([key, fill], lit, shadow, settings);
    expect(stops).toBeGreaterThan(0);
    expect(Number.isFinite(stops)).toBe(true);
  });

  it('is zero when both sides read the same', () => {
    const point = { x: 0, y: 1.45, z: 0 };
    expect(ratioBetween([key, fill], point, point, settings)).toBeCloseTo(0, 10);
  });

  it('refuses to report a ratio against darkness', () => {
    // A shadow with no light in it is not a ratio, it is an absence.
    expect(ratioBetween([key], face, { x: 0, y: 1.45, z: 12 }, settings)).toBe(0);
  });
});
