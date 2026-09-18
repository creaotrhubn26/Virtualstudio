import { describe, it, expect } from 'vitest';
import { parseStudioDocument } from './studioDocument';

/**
 * The scene contract, written down.
 *
 * Validation runs before the current scene is cleared, so what this accepts
 * and refuses decides whether a photographer loses their work to a bad file.
 * It is also the specification any other edition of this studio has to meet:
 * the document is plain versioned JSON with no renderer types in it, so a
 * native app can read and write the same files — provided it enforces the same
 * rules. These tests are those rules.
 */

const minimal = {
  id: 'doc-1',
  name: 'Oppsett',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  cameras: [{ id: 'cam', alpha: 0, beta: 1.2, radius: 4, target: { x: 0, y: 1.4, z: 0 }, fov: 0.8 }],
  lights: [],
  nodes: [],
  actors: [],
  props: [],
  layers: [],
  cameraSettings: { aperture: 2.8, iso: 100, focalLength: 50, shutter: '1/125', nd: 0 },
};

const actor = {
  id: 'model_1',
  name: 'Studiomodell · Kvinne',
  type: 'model',
  transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
  visible: true,
  locked: false,
  userData: {
    modelUrl: '/models/avatars/studio/studio-woman.glb',
    heightMeters: 1.72,
    studioPose: 'StudioSeated',
    wardrobe: ['female_casualsuit01', 'shoes01'],
  },
};

describe('what a document must carry', () => {
  it('accepts the smallest complete scene', () => {
    expect(() => parseStudioDocument(minimal)).not.toThrow();
  });

  it('refuses a scene with no camera to shoot it from', () => {
    // Everything else can be empty; without a camera there is no photograph.
    expect(() => parseStudioDocument({ ...minimal, cameras: [] })).toThrow();
  });

  it('refuses what is not a document at all', () => {
    for (const nonsense of [undefined, null, 42, 'a scene', [], {}]) {
      expect(() => parseStudioDocument(nonsense)).toThrow();
    }
  });
});

describe('what survives validation untouched', () => {
  it('keeps an actor’s pose, height and wardrobe', () => {
    // The figure has to open in the part it was cast in.
    const parsed: any = parseStudioDocument({ ...minimal, actors: [actor] });
    expect(parsed.actors[0].userData).toEqual(actor.userData);
  });

  it('keeps joint edits, which are the difference from the clip', () => {
    const edited = {
      ...actor,
      userData: { ...actor.userData, jointRotations: { leftElbow: { x: -0.4, y: 0, z: 0 } } },
    };
    const parsed: any = parseStudioDocument({ ...minimal, actors: [edited] });
    expect(parsed.actors[0].userData.jointRotations.leftElbow.x).toBeCloseTo(-0.4, 10);
  });

  it('keeps the place, its switches and whose place it is', () => {
    const parsed: any = parseStudioDocument({
      ...minimal,
      environment: {
        walls: [], floors: [],
        room: {
          type: 'pizzeria', furnishings: true, practicals: true,
          brand: { name: 'Holy Crust', tagline: 'DETROIT STYLE PIZZA I OSLO', accent: '#e03a20' },
        },
      },
    });
    expect(parsed.environment.room.type).toBe('pizzeria');
    expect(parsed.environment.room.brand.name).toBe('Holy Crust');
  });

  it('keeps the timeline, in radians, with its cues', () => {
    const parsed: any = parseStudioDocument({
      ...minimal,
      animation: {
        duration: 8,
        tracks: [{ id: 't1', nodeId: 'light_1', type: 'intensity', keyframes: [{ time: 0, value: { x: 1, y: 0, z: 0 } }] }],
        cues: [{
          id: 'c1', name: 'Dolly inn', start: 2, duration: 4, enabled: true,
          tracks: [{ id: 't2', nodeId: 'takingCamera', type: 'position', keyframes: [{ time: 0, value: { x: 0, y: 1.5, z: -4 } }] }],
        }],
      },
    });
    expect(parsed.animation.cues[0].name).toBe('Dolly inn');
    expect(parsed.animation.tracks[0].type).toBe('intensity');
  });

  it('keeps claimed objects and where they were put', () => {
    const parsed: any = parseStudioDocument({
      ...minimal,
      studioProps: [{
        id: 'p1', name: 'Portrettstol',
        source: { kind: 'scene', mesh: 'studioPortraitChair' },
        transform: { position: [0.4, 0, 1], rotation: [0, 0.3, 0], scale: [1, 1, 1] },
        visible: true, locked: false,
      }],
    });
    expect(parsed.studioProps[0].source.mesh).toBe('studioPortraitChair');
  });
});

describe('what it refuses, before the current scene is cleared', () => {
  it('refuses a room that is not a place this studio builds', () => {
    const room = (type: string) => ({
      ...minimal,
      environment: { walls: [], floors: [], room: { type, furnishings: true, practicals: true } },
    });
    for (const known of ['none', 'industrial', 'kitchen', 'hospital', 'pizzeria']) {
      expect(() => parseStudioDocument(room(known)), known).not.toThrow();
    }
    expect(() => parseStudioDocument(room('spaceship'))).toThrow();
  });

  it('refuses a keyframe with no time or no value', () => {
    // A broken keyframe would throw whatever it addresses somewhere unreachable.
    const withTrack = (keyframes: unknown) => ({
      ...minimal,
      animation: { duration: 1, tracks: [{ id: 't', nodeId: 'n', type: 'position', keyframes }] },
    });
    expect(() => parseStudioDocument(withTrack([{ time: 0, value: { x: 0, y: 0, z: 0 } }]))).not.toThrow();
    expect(() => parseStudioDocument(withTrack([{ time: -1, value: { x: 0, y: 0, z: 0 } }]))).toThrow();
    expect(() => parseStudioDocument(withTrack([{ time: 0, value: { x: 0, y: 0 } }]))).toThrow();
    expect(() => parseStudioDocument(withTrack([{ time: 0 }]))).toThrow();
  });

  it('refuses a channel it cannot drive', () => {
    const track = (type: string) => ({
      ...minimal,
      animation: { duration: 1, tracks: [{ id: 't', nodeId: 'n', type, keyframes: [{ time: 0, value: { x: 0, y: 0, z: 0 } }] }] },
    });
    for (const channel of ['position', 'rotation', 'intensity', 'color', 'target']) {
      expect(() => parseStudioDocument(track(channel)), channel).not.toThrow();
    }
    expect(() => parseStudioDocument(track('smell'))).toThrow();
  });

  it('refuses a shutter that is not a shutter', () => {
    const shutter = (value: string) => ({ ...minimal, cameraSettings: { ...minimal.cameraSettings, shutter: value } });
    for (const good of ['1/125', '1/8000', '2', '0.5']) {
      expect(() => parseStudioDocument(shutter(good)), good).not.toThrow();
    }
    for (const bad of ['1/0', 'fast', '', '1//125']) {
      expect(() => parseStudioDocument(shutter(bad)), bad).toThrow();
    }
  });

  it('refuses camera settings that cannot describe an exposure', () => {
    const settings = (patch: Record<string, unknown>) =>
      ({ ...minimal, cameraSettings: { ...minimal.cameraSettings, ...patch } });
    expect(() => parseStudioDocument(settings({ aperture: 0 }))).toThrow();
    expect(() => parseStudioDocument(settings({ iso: -100 }))).toThrow();
    expect(() => parseStudioDocument(settings({ focalLength: 0 }))).toThrow();
    // ND is a filter strength, and zero is a real answer.
    expect(() => parseStudioDocument(settings({ nd: 0 }))).not.toThrow();
  });

  it('refuses numbers that are not numbers', () => {
    const broken = {
      ...minimal,
      cameras: [{ ...minimal.cameras[0], radius: Number.POSITIVE_INFINITY }],
    };
    expect(() => parseStudioDocument(broken)).toThrow();
    expect(() => parseStudioDocument({
      ...minimal,
      cameras: [{ ...minimal.cameras[0], fov: Math.PI }],
    })).toThrow();
  });

  it('refuses an actor with no transform to place it by', () => {
    const { transform, ...withoutTransform } = actor;
    expect(() => parseStudioDocument({ ...minimal, actors: [withoutTransform] })).toThrow();
  });

  it('refuses a claimed object that names no source', () => {
    expect(() => parseStudioDocument({
      ...minimal,
      studioProps: [{
        id: 'p1', name: 'Noe',
        source: { kind: 'model' },
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        visible: true, locked: false,
      }],
    })).toThrow();
  });
});

describe('room for what has not been invented yet', () => {
  it('carries fields it does not know about', () => {
    // Schema changes are optional or versioned, so an older reader must not
    // throw away what a newer writer added.
    const parsed: any = parseStudioDocument({
      ...minimal,
      storyboard: { title: 'Holy Crust · 20 sekunder', shots: [] },
      somethingLater: { ok: true },
    });
    expect(parsed.storyboard.title).toBe('Holy Crust · 20 sekunder');
    expect(parsed.somethingLater.ok).toBe(true);
  });
});
