import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCATION_ID,
  STUDIO_LOCATIONS,
  insideRoom,
  locationById,
  locationForRoom,
  unknownLooks,
} from './studioLocations';
import { LIGHTING_LOOKS, lookById } from './lightingLooks';

describe('the places a scene can be set in', () => {
  it('names a place, explains it plainly, and is not offered twice', () => {
    expect(STUDIO_LOCATIONS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(STUDIO_LOCATIONS.map(l => l.id)).size).toBe(STUDIO_LOCATIONS.length);
    for (const location of STUDIO_LOCATIONS) {
      expect(location.label.length, location.id).toBeGreaterThan(3);
      // The hint is what a button is for someone who has never lit anything.
      expect(location.hint.length, location.id).toBeGreaterThan(20);
    }
    expect(locationById(DEFAULT_LOCATION_ID)).toBeDefined();
  });

  it('arrives lit: every place asks for a look that exists', () => {
    expect(unknownLooks()).toEqual([]);
    for (const location of STUDIO_LOCATIONS) {
      expect(LIGHTING_LOOKS.map(look => look.id), location.id).toContain(location.look);
    }
  });

  it('lights each room the way that room is lit', () => {
    // Not a detail: a kitchen under the studio portrait rig is a lighting test
    // with cupboards behind it, which is the thing this replaces.
    expect(locationById('kjokken')!.look).toBe('kjokken-morgen');
    expect(locationById('sykehusrom')!.look).toBe('sykehus');
    expect(locationById('studio')!.look).toBe('studio-portrett');
  });

  it('reads a place back from the room that is standing', () => {
    for (const location of STUDIO_LOCATIONS) {
      // One room per place, so an opened document can report where it is
      // rather than trusting whichever button was pressed last.
      expect(locationForRoom(location.room)?.id, location.id).toBe(location.id);
    }
    expect(new Set(STUDIO_LOCATIONS.map(l => l.room)).size).toBe(STUDIO_LOCATIONS.length);
  });

  it('keeps the empty stage empty', () => {
    const open = locationById('tomt')!;
    expect(open.room).toBe('none');
    // Furnishings and room lights in a room that does not exist would be a
    // switch with nothing behind it.
    expect(open.furnishings).toBe(false);
    expect(open.practicals).toBe(false);
  });
});

describe('a rig that fits the room it is in', () => {
  const kitchen = locationById('kjokken')!;

  it('leaves a stand that is already inside exactly where it is', () => {
    const aim = { x: 0, y: 1.3, z: 0 };
    const inside = { x: 1.4, y: 2, z: -1.2 };
    expect(insideRoom(inside, aim, kitchen.bounds!)).toEqual(inside);
  });

  it('walks a stand in along its own aim line rather than sliding it sideways', () => {
    // The studio key stands 4.2 m out, which in a 5.4 m kitchen is through the
    // wall. What must survive is the direction: the modelling and the shadow
    // angle are the look, the distance is not.
    const aim = { x: 0, y: 1.3, z: 0 };
    const outside = { x: 4.2, y: 2.4, z: -0.6 };
    const moved = insideRoom(outside, aim, kitchen.bounds!);

    expect(Math.abs(moved.x)).toBeLessThanOrEqual(kitchen.bounds!.halfWidth);
    expect(Math.abs(moved.z)).toBeLessThanOrEqual(kitchen.bounds!.halfDepth);
    expect(moved.y).toBeLessThanOrEqual(kitchen.bounds!.height);

    const before = Math.atan2(outside.z - aim.z, outside.x - aim.x);
    const after = Math.atan2(moved.z - aim.z, moved.x - aim.x);
    expect(after).toBeCloseTo(before, 10);
    // And it is closer than it was, never further.
    expect(Math.hypot(moved.x - aim.x, moved.z - aim.z))
      .toBeLessThan(Math.hypot(outside.x - aim.x, outside.z - aim.z));
  });

  it('never leaves a fixture standing through a wall, in any place that has them', () => {
    for (const location of STUDIO_LOCATIONS) {
      if (!location.bounds) continue;
      for (const fixture of lookById(location.look)!.fixtures) {
        const moved = insideRoom(fixture.position, fixture.aim, location.bounds);
        const where = `${location.id}/${fixture.name}`;
        expect(Math.abs(moved.x), where).toBeLessThanOrEqual(location.bounds.halfWidth);
        expect(Math.abs(moved.z), where).toBeLessThanOrEqual(location.bounds.halfDepth);
        expect(moved.y, where).toBeLessThanOrEqual(location.bounds.height);
        // And never underground, which a ceiling fixture walked in could be.
        expect(moved.y, where).toBeGreaterThan(0);
      }
    }
  });
});
