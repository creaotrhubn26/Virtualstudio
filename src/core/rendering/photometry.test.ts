import { describe, it, expect } from 'vitest';
import {
  apertureForIlluminance,
  coneSolidAngle,
  contactHardeningRatio,
  evAtIso100,
  fixtureCandela,
  illuminanceAt,
  modifierSizeMetres,
  sceneIntensityFromCandela,
  stopsBetween,
} from './photometry';
import { getLightById } from '../../data/lightFixtures';

/** Reference scene: fixture on axis, subject at 2.5 m, ISO 100, 1/125 s. */
const SUBJECT_DISTANCE_M = 2.5;
const REFERENCE_SHUTTER_S = 1 / 125;

function referenceAperture(id: string): number {
  const spec = getLightById(id);
  if (!spec) throw new Error(`Missing fixture ${id}`);
  const candela = fixtureCandela({ lux1m: spec.lux1m, lumens: spec.lumens, beamAngleDeg: spec.beamAngle });
  if (candela === null) throw new Error(`Fixture ${id} carries no photometric data`);
  return apertureForIlluminance(illuminanceAt(candela, SUBJECT_DISTANCE_M), 100, REFERENCE_SHUTTER_S);
}

describe('fixture photometry', () => {
  it('spreads lumens over the beam solid angle', () => {
    // A full sphere is 4π sr, so an isotropic source is lm / 4π.
    expect(coneSolidAngle(360)).toBeCloseTo(4 * Math.PI, 6);
    expect(fixtureCandela({ lumens: 4 * Math.PI, beamAngleDeg: 360 })).toBeCloseTo(1, 6);
    // Narrowing the beam concentrates the same flux.
    // Ω(120°) = π sr, Ω(30°) = 2π(1 − cos 15°) ≈ 0.2141 sr → ~14.7× the candela.
    const wide = fixtureCandela({ lumens: 10000, beamAngleDeg: 120 })!;
    const narrow = fixtureCandela({ lumens: 10000, beamAngleDeg: 30 })!;
    expect(narrow / wide).toBeCloseTo(14.67, 1);
  });

  it('prefers a measured lux@1m over derived lumens', () => {
    expect(fixtureCandela({ lux1m: 45000, lumens: 18500, beamAngleDeg: 55 })).toBe(45000);
    expect(fixtureCandela({})).toBeNull();
    expect(fixtureCandela({ lux1m: 0, lumens: 0 })).toBeNull();
  });

  it('obeys the inverse-square law in stops', () => {
    const e1 = illuminanceAt(45000, 1);
    expect(e1).toBe(45000);
    // Doubling distance costs exactly two stops; 1.41× costs one.
    expect(stopsBetween(illuminanceAt(45000, 2), e1)).toBeCloseTo(2, 6);
    expect(stopsBetween(illuminanceAt(45000, Math.SQRT2), e1)).toBeCloseTo(1, 6);
    // A light at zero distance clamps instead of returning infinity.
    expect(Number.isFinite(illuminanceAt(45000, 0))).toBe(true);
    expect(() => illuminanceAt(-1, 1)).toThrow();
  });

  it('agrees with the ISO 2720 incident meter', () => {
    // f/8 at 1/128 s, ISO 100 is exactly EV 13; a flat incident receptor
    // reads E = (C/S)·2^EV = 2.5 · 2^13 = 20480 lx.
    expect(evAtIso100(20480)).toBeCloseTo(13, 6);
    expect(apertureForIlluminance(20480, 100, 1 / 128)).toBeCloseTo(8, 6);
    // Four times the ISO is two stops, so two stops smaller aperture.
    expect(apertureForIlluminance(20480, 400, 1 / 128)).toBeCloseTo(16, 6);
    // The marked 1/125 s shutter is a rounded 1/128, worth ~0.03 stop.
    expect(apertureForIlluminance(20480, 100, 1 / 125)).toBeCloseTo(8.1, 1);
    expect(() => apertureForIlluminance(0, 100, 1 / 125)).toThrow();
  });

  it('keeps real fixtures at their catalogue output ratio', () => {
    const spec = (id: string) => {
      const s = getLightById(id)!;
      return fixtureCandela({ lux1m: s.lux1m, lumens: s.lumens, beamAngleDeg: s.beamAngle })!;
    };
    // Published lux@1m: 20000 / 45000 / 86000. The 600d must stay ~2.1 stops
    // above the 120d instead of collapsing onto it at a shared ceiling.
    expect(stopsBetween(spec('aputure-120d'), spec('aputure-600d'))).toBeCloseTo(2.1, 1);
    expect(stopsBetween(spec('aputure-120d'), spec('aputure-300d'))).toBeCloseTo(1.17, 1);
    expect(sceneIntensityFromCandela(spec('aputure-300d'))).toBeCloseTo(450, 6);
    expect(sceneIntensityFromCandela(spec('aputure-600d'))).toBeGreaterThan(
      sceneIntensityFromCandela(spec('aputure-300d')),
    );
  });

  it('puts reference-scene apertures in the working photographic range', () => {
    // At 2.5 m, ISO 100, 1/125 s these fixtures should meter between f/1.4
    // and f/32 — a rig outside that range means the units are wrong.
    for (const id of ['aputure-120d', 'aputure-300d', 'aputure-600d', 'nanlite-forza300', 'profoto-b10']) {
      const f = referenceAperture(id);
      expect(f).toBeGreaterThan(1.4);
      expect(f).toBeLessThan(32);
    }
    // The 600d is two stops of light above the 120d, so one full stop of aperture.
    expect(referenceAperture('aputure-600d') / referenceAperture('aputure-120d')).toBeCloseTo(2.07, 1);
  });
});

describe('modifier size and shadow softness', () => {
  it('reads real dimensions out of catalogue labels', () => {
    // Rectangular sources collapse to the equal-area square, so a stripbox
    // stays crisper than a softbox instead of being ranked by its long side.
    expect(modifierSizeMetres('Softboks 90×120 cm')).toBeCloseTo(Math.sqrt(0.9 * 1.2), 6);
    expect(modifierSizeMetres('Oktaboks 120 cm')).toBeCloseTo(1.2, 6);
    expect(modifierSizeMetres('Stripboks 30×120 cm')).toBeCloseTo(0.6, 6);
    expect(modifierSizeMetres('Stripboks 30×120 cm')).toBeLessThan(modifierSizeMetres('Softboks 90×120 cm'));
    expect(modifierSizeMetres('Diffusjonsramme 4×4 ft')).toBeCloseTo(1.2192, 4);
    expect(modifierSizeMetres('Fresnel 12"')).toBeCloseTo(0.3048, 4);
    // A label that carries both units prefers the metric dimension.
    expect(modifierSizeMetres('Chimera 60×90 cm (2×3 ft)')).toBeCloseTo(Math.sqrt(0.6 * 0.9), 6);
    // No dimension in the label falls back to the fixture body.
    expect(modifierSizeMetres('Aputure 300D', '/models/lights/softbox-stand.glb')).toBeCloseTo(0.9, 6);
    expect(modifierSizeMetres('Snoot standard', '/models/lights/snoot-stand.glb')).toBeCloseTo(0.1, 6);
    expect(modifierSizeMetres('Unknown fixture')).toBeCloseTo(0.3, 6);
  });

  it('makes penumbra width follow source size, not fixture identity', () => {
    const beam = Math.PI / 2;
    const octa150 = contactHardeningRatio(1.5, beam);
    const octa60 = contactHardeningRatio(0.6, beam);
    const snoot = contactHardeningRatio(0.1, beam);
    expect(octa150).toBeGreaterThan(octa60);
    expect(octa60).toBeGreaterThan(snoot);
    // Softness is linear in source size: 2.5× the box is 2.5× the penumbra.
    expect(octa150 / octa60).toBeCloseTo(2.5, 3);
    // A tight beam concentrates the shadow map, so the same source covers more of it.
    expect(contactHardeningRatio(0.1, Math.PI / 12)).toBeGreaterThan(snoot);
    expect(contactHardeningRatio(4, Math.PI / 2)).toBeLessThanOrEqual(0.5);
    expect(contactHardeningRatio(0.001, Math.PI / 2)).toBeGreaterThanOrEqual(0.002);
    expect(() => contactHardeningRatio(0, beam)).toThrow();
    expect(() => contactHardeningRatio(1, Math.PI)).toThrow();
  });
});
