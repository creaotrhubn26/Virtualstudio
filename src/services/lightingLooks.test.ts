import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOOK_ID,
  LIGHTING_LOOKS,
  STUDIO_KEY_ILLUMINANCE,
  fixtureIlluminance,
  lookById,
  lookKeyIlluminance,
  unknownFixtures,
} from './lightingLooks';
import { getLightById } from '../data/lightFixtures';
import { distanceForIlluminance, fixtureCandela, sceneIntensityFromCandela } from '../core/rendering/photometry';

/** How far a fixture ends up from what it lights, once it is dialled to its level. */
function standingDistance(lookId: string, fixtureName: string): number {
  const look = lookById(lookId)!;
  const spec = look.fixtures.find(f => f.name === fixtureName)!;
  const catalogue = getLightById(spec.fixture)!;
  const candela = fixtureCandela({
    type: catalogue.type,
    guideNumber: catalogue.guideNumber,
    lux1m: catalogue.lux1m,
    lumens: catalogue.lumens,
    beamAngleDeg: catalogue.beamAngle,
  })!;
  const output = sceneIntensityFromCandela(candela);
  const wanted = fixtureIlluminance(look, spec);

  // A working light carries an angle and a distance; only a source that is a
  // thing in the room still carries a position.
  const preferred = spec.placement
    ? spec.placement.distance
    : Math.hypot(
        spec.position!.x - spec.aim!.x,
        spec.position!.y - spec.aim!.y,
        spec.position!.z - spec.aim!.z);
  // It stays where it stands if it has the light to spare, and comes closer if not.
  if (spec.motivating) return preferred;
  return wanted * preferred * preferred <= output ? preferred : distanceForIlluminance(output, wanted);
}

describe('the looks on offer', () => {
  it('names a place, explains it plainly, and is not offered twice', () => {
    expect(LIGHTING_LOOKS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(LIGHTING_LOOKS.map(l => l.id)).size).toBe(LIGHTING_LOOKS.length);
    for (const look of LIGHTING_LOOKS) {
      expect(look.label.length, look.id).toBeGreaterThan(3);
      // The hint is the whole point: nobody has to know what a key light is.
      expect(look.hint.length, look.id).toBeGreaterThan(20);
      expect(['studio', 'rom', 'ute', 'stemning']).toContain(look.group);
    }
    expect(lookById(DEFAULT_LOOK_ID)).toBeDefined();
  });

  it('asks only for fixtures that exist', () => {
    for (const look of LIGHTING_LOOKS) {
      expect(unknownFixtures(look), look.id).toEqual([]);
    }
  });

  it('has exactly one key, and nothing brighter than it', () => {
    for (const look of LIGHTING_LOOKS) {
      const keys = look.fixtures.filter(f => f.stops === 0);
      expect(keys.length, look.id).toBe(1);
      for (const fixture of look.fixtures) {
        // A negative stop would put a fixture above the key, which means the
        // look's key is not actually its key.
        expect(fixture.stops, `${look.id}/${fixture.name}`).toBeGreaterThanOrEqual(0);
        expect(fixture.stops, `${look.id}/${fixture.name}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it('says where a fixture stands in exactly one way', () => {
    // A working light is an angle from the camera; a lamp or a candle is a
    // thing in the room with a position. Carrying both would be two sources of
    // truth, and one of them would drift.
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures) {
        const where = `${look.id}/${fixture.name}`;
        if (fixture.motivating) {
          expect(fixture.position, where).toBeDefined();
          expect(fixture.aim, where).toBeDefined();
          expect(fixture.placement, where).toBeUndefined();
        } else {
          expect(fixture.placement, where).toBeDefined();
          expect(fixture.position, where).toBeUndefined();
        }
      }
    }
  });

  it('keeps every visible source in the room and off the subject', () => {
    for (const look of LIGHTING_LOOKS) {
      for (const { name, position, aim } of look.fixtures.filter(f => f.motivating)) {
        const where = `${look.id}/${name}`;
        expect(Math.abs(position!.x), where).toBeLessThanOrEqual(8);
        expect(position!.z, where).toBeGreaterThanOrEqual(-9);
        expect(position!.z, where).toBeLessThanOrEqual(8);
        expect(position!.y, where).toBeGreaterThan(0);
        expect(position!.y, where).toBeLessThanOrEqual(6);
        // Aimed at a person standing at the origin, roughly at their height.
        expect(Math.hypot(aim!.x, aim!.z), where).toBeLessThan(2);
        expect(aim!.y, where).toBeGreaterThan(0.5);
      }
    }
  });

  it('never writes a working light onto the lens axis', () => {
    // This is the kitchen photograph, settled in the data rather than patched
    // at render time: a fixture within a few degrees of the camera's own
    // bearing stands between the lens and the face, whatever room it is in.
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures.filter(f => f.placement)) {
        const where = `${look.id}/${fixture.name}`;
        expect(Math.abs(fixture.placement!.azimuthDeg), where).toBeGreaterThanOrEqual(25);
        expect(Math.abs(fixture.placement!.azimuthDeg), where).toBeLessThanOrEqual(180);
      }
    }
  });

  it('asks for angles and distances a real stand can hold', () => {
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures.filter(f => f.placement)) {
        const where = `${look.id}/${fixture.name}`;
        const { elevationDeg, distance } = fixture.placement!;
        // From a low underlight to a hard toplight, and no further.
        expect(elevationDeg, where).toBeGreaterThanOrEqual(-60);
        expect(elevationDeg, where).toBeLessThanOrEqual(70);
        // Close enough to matter, far enough to stand somewhere.
        expect(distance, where).toBeGreaterThanOrEqual(0.8);
        expect(distance, where).toBeLessThanOrEqual(12);
      }
    }
  });

  it('gels each fixture to a colour a real source has', () => {
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures) {
        // Candlelight at the bottom, a cold night sky at the top.
        expect(fixture.cct, `${look.id}/${fixture.name}`).toBeGreaterThanOrEqual(1800);
        expect(fixture.cct, `${look.id}/${fixture.name}`).toBeLessThanOrEqual(8000);
      }
    }
  });

  it('never has to shove a working light into the subject to reach its level', () => {
    // The trap this catches: a ceiling pendant puts out 250 lux at a metre, so
    // asking it to key a face means hanging it 60 cm from the nose. A light
    // that can be walked in still has to end up somewhere a stand fits.
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures.filter(f => !f.motivating)) {
        expect(standingDistance(look.id, fixture.name), `${look.id}/${fixture.name}`)
          .toBeGreaterThan(0.75);
      }
    }
  });

  it('leaves every visible source exactly where it was put', () => {
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures.filter(f => f.motivating)) {
        const where = `${look.id}/${fixture.name}`;
        const preferred = Math.hypot(
          fixture.position!.x - fixture.aim!.x,
          fixture.position!.y - fixture.aim!.y,
          fixture.position!.z - fixture.aim!.z);
        expect(standingDistance(look.id, fixture.name), where).toBeCloseTo(preferred, 10);
      }
    }
  });

  it('marks every lamp, window and candle as a source that is seen', () => {
    // A practical or an atmospheric that is not marked would be dragged across
    // the room to make a level it was never able to give.
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures) {
        const type = getLightById(fixture.fixture)!.type;
        if (type === 'practical' || type === 'atmospheric') {
          expect(fixture.motivating, `${look.id}/${fixture.name}`).toBe(true);
        }
      }
    }
  });
});

describe('levels are stops, not scene numbers', () => {
  it('measures every look against the studio key', () => {
    const studio = lookById(DEFAULT_LOOK_ID)!;
    expect(lookKeyIlluminance(studio)).toBeCloseTo(STUDIO_KEY_ILLUMINANCE, 10);
    // An evening living room is darker than a lit studio; a sunlit kitchen is not.
    expect(lookKeyIlluminance(lookById('stue-kveld')!)).toBeLessThan(STUDIO_KEY_ILLUMINANCE);
    expect(lookKeyIlluminance(lookById('kjokken-morgen')!)).toBeGreaterThan(STUDIO_KEY_ILLUMINANCE);
  });

  it('reproduces the hand-tuned studio rig exactly', () => {
    // These three readings are what the rig delivered before it was described
    // as a look; the ratios, not the absolute numbers, are the claim.
    const studio = lookById(DEFAULT_LOOK_ID)!;
    const [key, fill, rim] = studio.fixtures;
    expect(fixtureIlluminance(studio, key)).toBeCloseTo(520 / 19.86, 10);
    expect(fixtureIlluminance(studio, fill)).toBeCloseTo(178 / 20.24, 10);
    expect(fixtureIlluminance(studio, rim)).toBeCloseTo(500 / 24.75, 10);
  });

  it('a stop down is half the light, wherever it is used', () => {
    const horror = lookById('skrekk')!;
    const key = horror.fixtures[0];
    const rim = horror.fixtures[1];
    expect(fixtureIlluminance(horror, rim) / fixtureIlluminance(horror, key))
      .toBeCloseTo(Math.pow(2, -rim.stops), 10);
  });
});

describe('a lamp is where the room hung it', () => {
  it('names the lamp it is, rather than repeating its coordinates', () => {
    // The kitchen pendant used to carry its own position, written separately
    // from the pendant the room actually built — so one hung over the table
    // and the other over whoever stood at the origin.
    const known = ['pendant', 'window', 'oven', 'ceiling', 'candle'];
    let anchored = 0;
    for (const look of LIGHTING_LOOKS) {
      for (const fixture of look.fixtures) {
        if (!fixture.anchor) continue;
        anchored++;
        expect(known, `${look.id}/${fixture.name}`).toContain(fixture.anchor);
        // Only a source that is seen can be a lamp in the room.
        expect(fixture.motivating, `${look.id}/${fixture.name}`).toBe(true);
        // And it keeps a position, because a place with no geometry of its own
        // still has to put it somewhere.
        expect(fixture.position, `${look.id}/${fixture.name}`).toBeDefined();
      }
    }
    expect(anchored).toBeGreaterThanOrEqual(5);
  });
});
