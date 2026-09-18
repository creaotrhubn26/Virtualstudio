import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStudioDocument } from './studioDocument';

/**
 * The scene contract, as verdicts both editions have to reach.
 *
 * `studioDocument.test.ts` states the rules; this states them as data, so a
 * native edition can be held to exactly the same ones. Each case is a document
 * and whether it is accepted. The verdicts are computed here from the
 * TypeScript validator, so the fixture cannot drift from the implementation it
 * describes, and the Swift suite reads the same file.
 *
 * This matters more than the arithmetic fixtures. Validation runs before the
 * current scene is cleared, so a native app that accepts what the browser
 * refuses will open half a scene over someone's work, and one that refuses what
 * the browser writes will not open their own files at all.
 *
 *   UPDATE_FIXTURES=1 npm test -- studioDocument.fixtures
 *
 * Non-finite numbers cannot be expressed in JSON — `JSON.stringify(Infinity)`
 * is `null` — so that refusal is asserted in each language's own suite instead
 * of here.
 */

const FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apple/VirtualstudioCore/Tests/SceneDocumentTests/Fixtures/documents.json',
);

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
    jointRotations: { leftElbow: { x: -0.4, y: 0, z: 0 } },
  },
};

const light = {
  id: 'light_key', name: 'Hovedlys', type: 'spot',
  position: [2, 2.2, -2], rotation: [0, 0, 0], scale: [1, 1, 1],
  intensity: 450, cct: 5600, visible: true, modifier: 'Softboks 90×120 cm',
};

const track = (patch: Record<string, unknown> = {}) => ({
  id: 't1', nodeId: 'light_key', type: 'position',
  keyframes: [{ time: 0, value: { x: 0, y: 1.5, z: -4 } }], ...patch,
});

const room = (patch: Record<string, unknown>) => ({
  ...minimal,
  environment: { walls: [], floors: [], room: { type: 'pizzeria', furnishings: true, practicals: true, ...patch } },
});

const shutter = (value: string) => ({ ...minimal, cameraSettings: { ...minimal.cameraSettings, shutter: value } });
const settings = (patch: Record<string, unknown>) =>
  ({ ...minimal, cameraSettings: { ...minimal.cameraSettings, ...patch } });
const timeline = (patch: Record<string, unknown>) => ({ ...minimal, animation: { duration: 8, tracks: [], ...patch } });

/** Every case, in the order a reader should meet them. */
const CASES: { name: string; document: unknown }[] = [
  { name: 'the smallest complete scene', document: minimal },
  { name: 'a scene with no camera to shoot it from', document: { ...minimal, cameras: [] } },
  { name: 'not a document at all', document: 42 },
  { name: 'an empty object', document: {} },
  { name: 'an array', document: [] },

  { name: 'an actor with pose, height, wardrobe and joint edits', document: { ...minimal, actors: [actor] } },
  { name: 'an actor with no transform to place it by',
    document: { ...minimal, actors: [{ ...actor, transform: undefined }] } },
  { name: 'a lit scene', document: { ...minimal, lights: [light] } },
  { name: 'a light with a negative reading', document: { ...minimal, lights: [{ ...light, intensity: -1 }] } },
  { name: 'a light with no colour temperature', document: { ...minimal, lights: [{ ...light, cct: 0 }] } },

  { name: 'a place with its switches and whose place it is',
    document: room({ brand: { name: 'Holy Crust', tagline: 'DETROIT STYLE PIZZA I OSLO', accent: '#e03a20' } }) },
  ...(['none', 'industrial', 'kitchen', 'hospital', 'pizzeria'] as const)
    .map(type => ({ name: `the ${type} room`, document: room({ type }) })),
  { name: 'a room this studio does not build', document: room({ type: 'spaceship' }) },
  { name: 'a room with no switches', document: room({ furnishings: undefined }) },

  { name: 'a timeline with a cue', document: timeline({
    tracks: [track({ type: 'intensity' })],
    cues: [{ id: 'c1', name: 'Dolly inn', start: 2, duration: 4, enabled: true, tracks: [track({ id: 't2', nodeId: 'takingCamera' })] }],
  }) },
  { name: 'a keyframe before the start of time', document: timeline({ tracks: [track({ keyframes: [{ time: -1, value: { x: 0, y: 0, z: 0 } }] })] }) },
  { name: 'a keyframe with an incomplete value', document: timeline({ tracks: [track({ keyframes: [{ time: 0, value: { x: 0, y: 0 } }] })] }) },
  { name: 'a keyframe with no value', document: timeline({ tracks: [track({ keyframes: [{ time: 0 }] })] }) },
  { name: 'a track with no node to address', document: timeline({ tracks: [track({ nodeId: '' })] }) },
  ...(['position', 'rotation', 'intensity', 'color', 'target'] as const)
    .map(type => ({ name: `a ${type} track`, document: timeline({ tracks: [track({ type })] }) })),
  { name: 'a channel it cannot drive', document: timeline({ tracks: [track({ type: 'smell' })] }) },
  { name: 'a cue with no length', document: timeline({ cues: [{ id: 'c1', name: 'Uten lengde', start: 0, duration: 0, enabled: true, tracks: [] }] }) },
  { name: 'a timeline that runs backwards', document: timeline({ duration: -1 }) },

  { name: 'a claimed portrait chair', document: { ...minimal, studioProps: [{
    id: 'p1', name: 'Portrettstol', source: { kind: 'scene', mesh: 'studioPortraitChair' },
    transform: { position: [0.4, 0, 1], rotation: [0, 0.3, 0], scale: [1, 1, 1] }, visible: true, locked: false,
  }] } },
  { name: 'an imported prop', document: { ...minimal, studioProps: [{
    id: 'p2', name: 'Pizzaovn', source: { kind: 'model', url: '/models/props/oven.glb' },
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, locked: false,
  }] } },
  { name: 'a claimed object that names no source', document: { ...minimal, studioProps: [{
    id: 'p1', name: 'Noe', source: { kind: 'model' },
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, locked: false,
  }] } },
  { name: 'a claimed object with no id', document: { ...minimal, studioProps: [{
    id: '', name: 'Noe', source: { kind: 'scene', mesh: 'studioPortraitChair' },
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, locked: false,
  }] } },

  ...['1/125', '1/8000', '2', '0.5'].map(value => ({ name: `the shutter ${value}`, document: shutter(value) })),
  ...['1/0', 'fast', '', '1//125'].map(value => ({ name: `the shutter "${value}"`, document: shutter(value) })),
  { name: 'an aperture of zero', document: settings({ aperture: 0 }) },
  { name: 'a negative ISO', document: settings({ iso: -100 }) },
  { name: 'no focal length', document: settings({ focalLength: 0 }) },
  { name: 'no ND filter, which is a real answer', document: settings({ nd: 0 }) },
  { name: 'a field of view of exactly π', document: { ...minimal, cameras: [{ ...minimal.cameras[0], fov: Math.PI }] } },
  { name: 'a camera at no distance', document: { ...minimal, cameras: [{ ...minimal.cameras[0], radius: 0 }] } },

  { name: 'fields from a later version', document: {
    ...minimal,
    storyboard: { title: 'Holy Crust · 20 sekunder', shots: [] },
    somethingLater: { ok: true },
  } },
];

function build() {
  return {
    source: 'src/services/studioDocument.ts',
    note: 'Generated by studioDocument.fixtures.test.ts. Read by SceneDocumentTests in apple/VirtualstudioCore.',
    cases: CASES.map(({ name, document }) => {
      let accepted = true;
      try { parseStudioDocument(document); } catch { accepted = false; }
      // Through JSON, as a saved file would be, so both suites read the same
      // thing: an `undefined` field becomes an absent one either way.
      return { name, accepted, document: JSON.parse(JSON.stringify(document ?? null)) };
    }),
  };
}

describe('the verdicts both editions have to reach', () => {
  it('matches the fixture the Swift suite reads', () => {
    const current = build();
    if (process.env.UPDATE_FIXTURES) {
      mkdirSync(dirname(FIXTURE), { recursive: true });
      writeFileSync(FIXTURE, `${JSON.stringify(current, null, 2)}\n`);
    }
    expect(current).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8')));
  });

  it('refuses more than it accepts, because most of these are broken on purpose', () => {
    // A guard against a validator that has quietly stopped validating: if a
    // change made everything pass, this is the test that notices.
    const verdicts = build().cases;
    expect(verdicts.filter(c => !c.accepted).length).toBeGreaterThan(10);
    expect(verdicts.filter(c => c.accepted).length).toBeGreaterThan(10);
  });
});
