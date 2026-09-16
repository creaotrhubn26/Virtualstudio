import { describe, it, expect } from 'vitest';
import {
  apertureForIlluminance,
  coneSolidAngle,
  contactHardeningRatio,
  evAtIso100,
  distanceForIlluminance,
  fixtureCandela,
  flashApertureAt,
  flashEquivalentCandela,
  flashLuminousExposureAt1m,
  flashShutterCompensation,
  illuminanceAt,
  isFlashFixture,
  modifierSizeMetres,
  sceneIntensityFromCandela,
  spotConeRadians,
  MAX_SPOT_CONE_RAD,
  stopsBetween,
} from './photometry';
import { getLightById } from '../../data/lightFixtures';

/** Reference scene: fixture on axis, subject at 2.5 m, ISO 100, 1/125 s. */
const SUBJECT_DISTANCE_M = 2.5;
const REFERENCE_SHUTTER_S = 1 / 125;

function referenceAperture(id: string): number {
  const spec = getLightById(id);
  if (!spec) throw new Error(`Missing fixture ${id}`);
  const candela = fixtureCandela({
    type: spec.type,
    guideNumber: spec.guideNumber,
    lux1m: spec.lux1m,
    lumens: spec.lumens,
    beamAngleDeg: spec.beamAngle,
  });
  if (candela === null) throw new Error(`Fixture ${id} carries no photometric data`);
  // Flash output is expressed at the 1/125 s reference, so metering the
  // reference scene at that shutter is the one case where the two agree.
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

  it('inverts the inverse-square law to place a fixture', () => {
    // Placement and falloff have to be each other's inverse, or a rig built
    // from a target reading will not render that reading.
    expect(distanceForIlluminance(45000, 45000)).toBeCloseTo(1, 6);
    expect(illuminanceAt(45000, distanceForIlluminance(45000, 2000))).toBeCloseTo(2000, 6);
    // Halving the wanted illuminance is 1.41x the distance.
    expect(distanceForIlluminance(45000, 1000) / distanceForIlluminance(45000, 2000)).toBeCloseTo(Math.SQRT2, 6);
    for (const bad of [0, -1, NaN]) expect(() => distanceForIlluminance(bad, 100)).toThrow();
    for (const bad of [0, -1, NaN]) expect(() => distanceForIlluminance(100, bad)).toThrow();
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
    // The strobe lands where its own guide number says it should: f = GN / d.
    expect(referenceAperture('profoto-b10')).toBeCloseTo(flashApertureAt(72, SUBJECT_DISTANCE_M), 3);
    // Which is several stops past what the LEDs need — so a mixed rig is only
    // correctly exposed for one of them at a time, as on a real set.
    expect(referenceAperture('profoto-b10')).toBeGreaterThan(referenceAperture('aputure-600d') * 4);
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

describe('flash versus continuous', () => {
  it('reads a strobe from its guide number, not its modelling lamp', () => {
    expect(isFlashFixture('strobe')).toBe(true);
    expect(isFlashFixture('speedlight')).toBe(true);
    expect(isFlashFixture('led')).toBe(false);
    expect(isFlashFixture(undefined)).toBe(false);

    const b10 = getLightById('profoto-b10')!;
    expect(b10.type).toBe('strobe');
    // The catalogue lists lux1m 10000 for this head — a modelling-lamp figure.
    // Using it would put a 250 Ws strobe below a 300 W LED.
    const viaSpec = fixtureCandela({ type: b10.type, guideNumber: b10.guideNumber, lux1m: b10.lux1m, lumens: b10.lumens })!;
    expect(viaSpec).toBe(flashEquivalentCandela(b10.guideNumber!));
    expect(viaSpec).toBeGreaterThan(b10.lux1m! * 100);
  });

  it('follows the guide-number definition f = GN / d', () => {
    // H = (C/S)·GN² at 1 m, so a flash meter reads f = GN / d at ISO 100.
    expect(flashLuminousExposureAt1m(72)).toBeCloseTo(2.5 * 72 * 72, 6);
    expect(flashApertureAt(72, 2.5)).toBeCloseTo(28.8, 3);
    expect(flashApertureAt(72, 1)).toBeCloseTo(72, 6);
    // Four times the ISO is two stops, so two stops smaller aperture.
    expect(flashApertureAt(72, 2.5, 400)).toBeCloseTo(57.6, 3);
    // Doubling the guide number is two stops of light.
    expect(stopsBetween(flashLuminousExposureAt1m(36), flashLuminousExposureAt1m(72))).toBeCloseTo(2, 6);
    for (const bad of [0, -1, NaN, Infinity]) expect(() => flashLuminousExposureAt1m(bad)).toThrow();
  });

  it('puts a studio strobe well above a continuous LED', () => {
    const strobe = (id: string) => {
      const s = getLightById(id)!;
      return fixtureCandela({ type: s.type, guideNumber: s.guideNumber, lux1m: s.lux1m, lumens: s.lumens })!;
    };
    const led = fixtureCandela({ lux1m: getLightById('aputure-300d')!.lux1m })!;
    // A 1000 Ws head against a 300 W LED is several stops, not a rounding error.
    expect(stopsBetween(led, strobe('profoto-d2'))).toBeGreaterThan(5);
    // Strobe against strobe still tracks output: 200 Ws to 1000 Ws.
    expect(stopsBetween(strobe('godox-ad200pro'), strobe('profoto-d2'))).toBeCloseTo(
      stopsBetween(52 * 52, 145 * 145), 6,
    );
  });

  it('cancels the shutter term so flash exposure ignores shutter speed', () => {
    // The frame's exposure carries the shutter; this factor removes it again.
    expect(flashShutterCompensation(1 / 125)).toBeCloseTo(1, 6);
    expect(flashShutterCompensation(1 / 250)).toBeCloseTo(2, 6);
    expect(flashShutterCompensation(1 / 60)).toBeCloseTo(0.48, 6);
    // Net rendered flash exposure is the same at every shutter speed.
    for (const seconds of [1 / 60, 1 / 125, 1 / 250, 1 / 1000]) {
      expect(flashShutterCompensation(seconds) * (seconds * 125)).toBeCloseTo(1, 6);
    }
    for (const bad of [0, -1, NaN]) expect(() => flashShutterCompensation(bad)).toThrow();
  });
});

describe('a published beam angle as a spot cone', () => {
  it('passes an ordinary beam through unchanged', () => {
    expect(spotConeRadians(55)).toBeCloseTo((55 * Math.PI) / 180, 12);
    expect(spotConeRadians(120)).toBeCloseTo((120 * Math.PI) / 180, 12);
  });

  it('caps a bulb, a tube and a window below a half turn', () => {
    // These are real catalogue values: a pendant is published at 360°, a tube
    // at 180°. A cone cannot open that far, and the shadow-softness arithmetic
    // refuses anything at or past π outright.
    for (const published of [180, 200, 360]) {
      const cone = spotConeRadians(published);
      expect(cone).toBeLessThan(Math.PI);
      expect(cone).toBe(MAX_SPOT_CONE_RAD);
      expect(() => contactHardeningRatio(1, cone)).not.toThrow();
    }
  });

  it('refuses an angle that is not one', () => {
    expect(() => spotConeRadians(0)).toThrow(RangeError);
    expect(() => spotConeRadians(Number.NaN)).toThrow(RangeError);
  });
});
