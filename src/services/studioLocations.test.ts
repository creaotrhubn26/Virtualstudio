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
import { clearOfCamera, resolvePlacement } from './studioLocations';

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
    // Every fixture of every place's own look, resolved the way the studio
    // resolves it: an angle against a subject of average height, or the
    // position a visible source was given.
    const subject = { x: 0, z: 0, eyeHeight: 1.45 };
    const camera = { x: 0, z: -2.5 };
    for (const location of STUDIO_LOCATIONS) {
      if (!location.bounds) continue;
      for (const fixture of lookById(location.look)!.fixtures) {
        const resolved = fixture.placement
          ? resolvePlacement(fixture.placement, subject, camera)
          : { position: fixture.position!, aim: fixture.aim! };
        const moved = insideRoom(resolved.position, resolved.aim, location.bounds);
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

describe('lights placed by angle, not by coordinate', () => {
  const subject = { x: 0, z: 0, eyeHeight: 1.45 };
  const camera = { x: 0, z: -3 };

  it('aims at the eye line, wherever the eyes are', () => {
    const { aim } = resolvePlacement({ azimuthDeg: 45, elevationDeg: 35, distance: 2.5 }, subject, camera);
    expect(aim).toEqual({ x: 0, y: 1.45, z: 0 });
    // A shorter subject is lit at their own eye line, not at a fixed 1.3 m.
    const child = resolvePlacement(
      { azimuthDeg: 45, elevationDeg: 35, distance: 2.5 }, { x: 0, z: 0, eyeHeight: 1.1 }, camera);
    expect(child.aim.y).toBe(1.1);
    expect(child.position.y).toBeLessThan(
      resolvePlacement({ azimuthDeg: 45, elevationDeg: 35, distance: 2.5 }, subject, camera).position.y);
  });

  it('keeps the distance it was given', () => {
    const { position, aim } = resolvePlacement({ azimuthDeg: 45, elevationDeg: 35, distance: 2.5 }, subject, camera);
    expect(Math.hypot(position.x - aim.x, position.y - aim.y, position.z - aim.z)).toBeCloseTo(2.5, 6);
  });

  it('puts a front light in front and a back light behind', () => {
    const front = resolvePlacement({ azimuthDeg: 0, elevationDeg: 0, distance: 2 }, subject, camera);
    // Dead front means on the camera's own side of the subject.
    expect(front.position.z).toBeCloseTo(-2, 6);
    const back = resolvePlacement({ azimuthDeg: 180, elevationDeg: 0, distance: 2 }, subject, camera);
    expect(back.position.z).toBeCloseTo(2, 6);
  });

  it('carries the whole rig when the camera moves round', () => {
    // The point of measuring from the camera: a key at 45 degrees is still at
    // 45 degrees after the shot is reframed from the side.
    const fromFront = resolvePlacement({ azimuthDeg: 45, elevationDeg: 20, distance: 2 }, subject, camera);
    const fromSide = resolvePlacement({ azimuthDeg: 45, elevationDeg: 20, distance: 2 }, subject, { x: -3, z: 0 });
    const angle = (p: { x: number; z: number }, c: { x: number; z: number }) => {
      let d = Math.atan2(p.z - subject.z, p.x - subject.x) - Math.atan2(c.z - subject.z, c.x - subject.x);
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return (d * 180) / Math.PI;
    };
    expect(angle(fromFront.position, camera)).toBeCloseTo(45, 6);
    expect(angle(fromSide.position, { x: -3, z: 0 })).toBeCloseTo(45, 6);
    // And it is not in the same place, because the shot is not.
    expect(fromSide.position.x).not.toBeCloseTo(fromFront.position.x, 2);
  });

  it('elevation raises the fixture and never buries it', () => {
    const up = resolvePlacement({ azimuthDeg: 45, elevationDeg: 40, distance: 2 }, subject, camera);
    const down = resolvePlacement({ azimuthDeg: 45, elevationDeg: -40, distance: 2 }, subject, camera);
    expect(up.position.y).toBeGreaterThan(subject.eyeHeight);
    expect(down.position.y).toBeLessThan(subject.eyeHeight);
    // Even a hard underlight has to stand on something.
    expect(down.position.y).toBeGreaterThan(0);
  });
});

describe('never in the shot', () => {
  const aim = { x: 0, y: 1.45, z: 0 };
  const camera = { x: 0, y: 1.45, z: -3 };

  it('swings a fixture out of the lens axis, keeping its distance and height', () => {
    // The kitchen failure exactly: the key ended up between the lens and the
    // face, so a metre-wide softbox stood in the middle of the shot.
    const inShot = { x: 0, y: 2.1, z: -2.2 };
    const moved = clearOfCamera(inShot, aim, camera, 25);
    expect(moved.y).toBe(inShot.y);
    expect(Math.hypot(moved.x, moved.z)).toBeCloseTo(Math.hypot(inShot.x, inShot.z), 6);

    const angle = Math.abs(
      (Math.atan2(moved.z, moved.x) - Math.atan2(camera.z, camera.x)) * 180 / Math.PI);
    expect(angle).toBeGreaterThanOrEqual(25 - 1e-6);
  });

  it('leaves a fixture that is already clear exactly where it is', () => {
    const clear = { x: 2, y: 2.1, z: -1.4 };
    expect(clearOfCamera(clear, aim, camera, 25)).toEqual(clear);
  });

  it('turns the shorter way, so a key stays on its own side of the face', () => {
    const slightlyLeft = { x: -0.2, y: 2, z: -2.4 };
    const moved = clearOfCamera(slightlyLeft, aim, camera, 25);
    expect(Math.sign(moved.x)).toBe(Math.sign(slightlyLeft.x));
  });
});

describe('where a person stands in a room', () => {
  it('offers marks only where there is somewhere in particular to stand', () => {
    for (const location of STUDIO_LOCATIONS) {
      if (!location.marks) continue;
      expect(location.bounds, location.id).toBeDefined();
      expect(new Set(location.marks.map(m => m.id)).size).toBe(location.marks.length);
      for (const mark of location.marks) {
        const where = `${location.id}/${mark.id}`;
        expect(mark.label.length, where).toBeGreaterThan(3);
        // A mark has to say what the shot is from there, like every other button.
        expect(mark.hint.length, where).toBeGreaterThan(20);
      }
    }
  });

  it('never puts anybody through a wall or inside the furniture', () => {
    for (const location of STUDIO_LOCATIONS) {
      for (const mark of location.marks ?? []) {
        const where = `${location.id}/${mark.id}`;
        // Standing room, not wall space: a body needs clearance behind it.
        expect(Math.abs(mark.x), where).toBeLessThanOrEqual(location.bounds!.halfWidth - 0.35);
        expect(Math.abs(mark.z), where).toBeLessThanOrEqual(location.bounds!.halfDepth - 0.35);
      }
    }
  });

  it('faces each mark somewhere a compass can point', () => {
    for (const location of STUDIO_LOCATIONS) {
      for (const mark of location.marks ?? []) {
        expect(mark.facingDeg, `${location.id}/${mark.id}`).toBeGreaterThanOrEqual(0);
        expect(mark.facingDeg, `${location.id}/${mark.id}`).toBeLessThan(360);
      }
    }
  });

  it('gives the pizzeria a crew, not one person in an empty room', () => {
    // The scene a photographer is actually planning: somebody at the oven,
    // somebody at the pass, a guest at a table.
    const pizzeria = locationById('pizzeria')!;
    expect(pizzeria.marks!.length).toBeGreaterThanOrEqual(3);
    expect(pizzeria.marks!.map(m => m.id)).toContain('ovnen');
    expect(pizzeria.marks!.map(m => m.id)).toContain('disken');
    // No two people standing on top of each other.
    for (const [i, a] of pizzeria.marks!.entries()) {
      for (const b of pizzeria.marks!.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.id} vs ${b.id}`).toBeGreaterThan(0.6);
      }
    }
  });
});
