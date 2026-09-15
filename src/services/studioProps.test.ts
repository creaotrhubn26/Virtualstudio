import { describe, it, expect } from 'vitest';
import {
  IDENTITY_TRANSFORM,
  StudioProp,
  parseProp,
  parseProps,
  propId,
  propIsResolvable,
  resolveProps,
} from './studioProps';

const chair: StudioProp = {
  id: 'studioseat-chair',
  name: 'Portrettstol',
  source: { kind: 'scene', mesh: 'studioSeat_chair' },
  transform: { position: [0, 0, 0.4], rotation: [0, 1.2, 0], scale: [1, 1, 1] },
  visible: true,
  locked: false,
};

describe('reading props out of a document', () => {
  it('keeps a well-formed prop exactly as written', () => {
    expect(parseProp(JSON.parse(JSON.stringify(chair)))).toEqual(chair);
  });

  it('fills in what a document leaves out', () => {
    // Older documents, and hand-written ones, need not spell out every field.
    const sparse = parseProp({ id: 'bed', source: { kind: 'model', url: '/models/bed.glb' } });
    expect(sparse).toEqual({
      id: 'bed',
      name: 'bed',
      source: { kind: 'model', url: '/models/bed.glb' },
      transform: IDENTITY_TRANSFORM,
      visible: true,
      locked: false,
    });
  });

  it('refuses anything that does not describe a placeable thing', () => {
    // No geometry to show, or no way to name it later.
    expect(parseProp({ source: { kind: 'model', url: '/models/bed.glb' } })).toBeNull();
    expect(parseProp({ id: 'bed' })).toBeNull();
    expect(parseProp({ id: 'bed', source: { kind: 'model', url: '' } })).toBeNull();
    expect(parseProp({ id: 'bed', source: { kind: 'scene' } })).toBeNull();
    expect(parseProp({ id: 'bed', source: { kind: 'elsewhere', url: '/x.glb' } })).toBeNull();
    expect(parseProp(null)).toBeNull();
    expect(parseProp('bed')).toBeNull();
  });

  it('will not place a prop where it cannot be found again', () => {
    // A broken transform would put the object out of reach, and a zero scale
    // would make it invisible with nothing left to grab.
    const broken = parseProp({
      id: 'bed',
      source: { kind: 'model', url: '/models/bed.glb' },
      transform: { position: [1, null, 3], rotation: 'sideways', scale: [0, 1, 1] },
    })!;
    expect(broken.transform).toEqual(IDENTITY_TRANSFORM);
    const partial = parseProp({
      id: 'bed',
      source: { kind: 'model', url: '/models/bed.glb' },
      transform: { position: [1, 2, 3], scale: [2, 2, 2] },
    })!;
    expect(partial.transform).toEqual({ position: [1, 2, 3], rotation: [0, 0, 0], scale: [2, 2, 2] });
  });

  it('lets one object be claimed once', () => {
    const props = parseProps([
      chair,
      { ...chair, name: 'Duplicate' },
      { id: 'bed', source: { kind: 'model', url: '/models/bed.glb' } },
      'rubbish',
    ]);
    expect(props.map(p => p.id)).toEqual(['studioseat-chair', 'bed']);
    expect(props[0].name).toBe('Portrettstol');
    expect(parseProps(undefined)).toEqual([]);
  });
});

describe('naming a new prop', () => {
  it('names it after what it is', () => {
    expect(propId({ kind: 'scene', mesh: 'studioSeat_chair' }, [])).toBe('studioseat_chair');
    expect(propId({ kind: 'model', url: '/models/props/air-ambulance.glb' }, [])).toBe('air-ambulance');
    expect(propId({ kind: 'model', url: 'https://cdn.example/a/Hospital Bed.glb' }, [])).toBe('hospital-bed');
  });

  it('never hands out an id that is taken', () => {
    const taken = ['air-ambulance', 'air-ambulance-2'];
    expect(propId({ kind: 'model', url: '/models/air-ambulance.glb' }, taken)).toBe('air-ambulance-3');
    // Something unnameable still gets a usable id rather than an empty one.
    expect(propId({ kind: 'model', url: '/models/___.glb' }, [])).toBe('prop');
  });
});

describe('placing props back into a scene', () => {
  it('only claims geometry this scene actually builds', () => {
    // Swapping the industrial room for an empty one takes its furniture with
    // it; a claim on a sofa that is gone must not resurrect one.
    const bed: StudioProp = { ...chair, id: 'bed', source: { kind: 'model', url: '/models/bed.glb' } };
    const meshes = ['studioSeat_chair', 'studioRoom_sofa'];
    expect(propIsResolvable(chair, meshes)).toBe(true);
    expect(propIsResolvable(bed, [])).toBe(true);
    expect(propIsResolvable({ ...chair, source: { kind: 'scene', mesh: 'gone' } }, meshes)).toBe(false);

    const { placeable, unresolved } = resolveProps(
      [chair, bed, { ...chair, id: 'ghost', source: { kind: 'scene', mesh: 'gone' } }], meshes);
    expect(placeable.map(p => p.id)).toEqual(['studioseat-chair', 'bed']);
    expect(unresolved.map(p => p.id)).toEqual(['ghost']);
  });
});
