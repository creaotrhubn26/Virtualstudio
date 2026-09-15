import { describe, it, expect } from 'vitest';
import {
  WardrobeCatalogue,
  bodyIdFromModelUrl,
  bodyIndicesWearing,
  defaultWardrobeFor,
  garmentsForBody,
  resolveWardrobe,
} from './wardrobeService';

const catalogue: WardrobeCatalogue = {
  garments: [
    { id: 'female_casualsuit01', body: 'studio-woman', slot: 'outfit', file: 'female_casualsuit01.glb', hidesBodyTriangles: [[10, 20]], bodyTriangles: 100 },
    { id: 'female_elegantsuit01', body: 'studio-woman', slot: 'outfit', file: 'female_elegantsuit01.glb', hidesBodyTriangles: [[12, 24]], bodyTriangles: 100 },
    { id: 'shoes01', body: 'studio-woman', slot: 'shoes', file: 'shoes01.glb', hidesBodyTriangles: [[90, 96]], bodyTriangles: 100 },
    { id: 'male_worksuit01', body: 'studio-man', slot: 'outfit', file: 'male_worksuit01.glb', hidesBodyTriangles: [[5, 30]], bodyTriangles: 100 },
  ],
  defaults: { 'studio-woman': ['female_casualsuit01', 'shoes01'], 'studio-man': ['male_worksuit01'] },
};

/** Triangle t occupies indices 3t..3t+2; give each a recognisable value. */
function indicesFor(triangles: number): number[] {
  return Array.from({ length: triangles * 3 }, (_, i) => i);
}

function trianglesIn(indices: number[]): number[] {
  return indices.filter((_, i) => i % 3 === 0).map(value => value / 3);
}

describe('wardrobe catalogue', () => {
  it('reads the body shape out of a model url', () => {
    expect(bodyIdFromModelUrl('/models/avatars/studio/studio-woman.glb')).toBe('studio-woman');
    expect(bodyIdFromModelUrl('https://cdn.example/models/studio-man.glb?v=3')).toBe('studio-man');
    // Anything that is not one of the studio bodies has no wardrobe of its own.
    expect(bodyIdFromModelUrl('/models/avatars/other.glb')).toBeNull();
    expect(bodyIdFromModelUrl('')).toBeNull();
  });

  it('offers each body only the garments cut for it', () => {
    expect(garmentsForBody(catalogue, 'studio-woman').map(g => g.id))
      .toEqual(['female_casualsuit01', 'female_elegantsuit01', 'shoes01']);
    expect(garmentsForBody(catalogue, 'studio-man').map(g => g.id)).toEqual(['male_worksuit01']);
    expect(garmentsForBody(catalogue, 'nobody')).toEqual([]);
    expect(defaultWardrobeFor(catalogue, 'studio-woman')).toEqual(['female_casualsuit01', 'shoes01']);
    expect(defaultWardrobeFor(catalogue, 'nobody')).toEqual([]);
  });

  it('allows one garment per slot, and ignores what it does not have', () => {
    // Two outfits at once would intersect; the last one named is the one worn.
    const dressed = resolveWardrobe(catalogue, 'studio-woman',
      ['female_casualsuit01', 'shoes01', 'female_elegantsuit01']);
    expect(dressed.map(g => g.id).sort()).toEqual(['female_elegantsuit01', 'shoes01']);
    // A garment cut for another body, or one that does not exist, is dropped
    // rather than failing the whole change.
    expect(resolveWardrobe(catalogue, 'studio-woman', ['male_worksuit01', 'nope', 'shoes01']).map(g => g.id))
      .toEqual(['shoes01']);
    expect(resolveWardrobe(catalogue, 'studio-woman', [])).toEqual([]);
  });
});

describe('body coverage', () => {
  it('drops exactly the triangles a garment covers', () => {
    const full = indicesFor(100);
    const worn = bodyIndicesWearing(full, [{ hidesBodyTriangles: [[10, 20]] }]);
    expect(worn.length).toBe((100 - 10) * 3);
    const kept = trianglesIn(worn);
    expect(kept).not.toContain(10);
    expect(kept).not.toContain(19);
    // The boundaries are half-open: 20 is still drawn.
    expect(kept).toContain(9);
    expect(kept).toContain(20);
  });

  it('counts overlapping garments once', () => {
    const full = indicesFor(100);
    // A jacket and a shirt sharing the torso must not remove the shared
    // triangles twice, or the index buffer would go out of step.
    const worn = bodyIndicesWearing(full, [
      { hidesBodyTriangles: [[10, 20]] },
      { hidesBodyTriangles: [[15, 25]] },
    ]);
    expect(worn.length).toBe((100 - 15) * 3);
    expect(trianglesIn(worn)).not.toContain(17);
  });

  it('puts the skin back when a garment comes off', () => {
    const full = indicesFor(100);
    expect(bodyIndicesWearing(full, [])).toEqual(full);
    // Dressing and undressing from the same untouched buffer is lossless.
    const dressed = bodyIndicesWearing(full, [{ hidesBodyTriangles: [[0, 50]] }]);
    expect(dressed.length).toBe(50 * 3);
    expect(bodyIndicesWearing(full, [])).toEqual(full);
  });

  it('survives a range that runs past the body', () => {
    // A stale garment file must not read off the end of the index buffer.
    const full = indicesFor(10);
    expect(bodyIndicesWearing(full, [{ hidesBodyTriangles: [[8, 999]] }]).length).toBe(8 * 3);
    expect(bodyIndicesWearing(full, [{ hidesBodyTriangles: [[-5, 2]] }]).length).toBe(8 * 3);
    expect(bodyIndicesWearing(full, [{ hidesBodyTriangles: [[900, 999]] }]).length).toBe(10 * 3);
  });
});
