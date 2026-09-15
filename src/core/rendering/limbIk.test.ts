import { describe, it, expect } from 'vitest';
import {
  MAX_EXTENSION,
  TwoBoneChain,
  Vec3,
  chainPole,
  dot,
  length,
  normalize,
  reject,
  solveTwoBoneIk,
  subtract,
} from './limbIk';

/** A right arm hanging with a slight forward bend: 30 cm upper, 25 cm lower. */
const ARM: TwoBoneChain = {
  root: { x: 0, y: 1.4, z: 0 },
  mid: { x: 0, y: 1.1, z: 0.02 },
  end: { x: 0, y: 0.85, z: 0.06 },
};

const UPPER = length(subtract(ARM.mid, ARM.root));
const LOWER = length(subtract(ARM.end, ARM.mid));

function distance(a: Vec3, b: Vec3): number {
  return length(subtract(a, b));
}

describe('two-bone limb solve', () => {
  it('keeps both segments at their real lengths', () => {
    // A solve that stretches the limb has moved the skeleton, not posed it.
    for (const target of [
      { x: 0.3, y: 1.1, z: 0.2 },
      { x: -0.1, y: 1.5, z: 0.4 },
      { x: 0, y: 0.9, z: -0.3 },
      { x: 0.2, y: 1.4, z: 0 },
    ]) {
      const solution = solveTwoBoneIk(ARM, target);
      expect(distance(ARM.root, solution.mid)).toBeCloseTo(UPPER, 9);
      expect(distance(solution.mid, solution.end)).toBeCloseTo(LOWER, 9);
    }
  });

  it('puts the hand on the target when it is in reach', () => {
    const target = { x: 0.25, y: 1.15, z: 0.15 };
    const solution = solveTwoBoneIk(ARM, target);
    expect(solution.overextended).toBe(false);
    expect(distance(solution.end, target)).toBeLessThan(1e-9);
  });

  it('stops short of locking straight when the target is too far', () => {
    const far = { x: 0, y: 1.4, z: 4 };
    const solution = solveTwoBoneIk(ARM, far);
    expect(solution.overextended).toBe(true);
    // The hand reaches as far as the arm goes, and no further.
    expect(distance(ARM.root, solution.end)).toBeCloseTo((UPPER + LOWER) * MAX_EXTENSION, 9);
    // It points at the target, just short of it.
    const toTarget = normalize(subtract(far, ARM.root));
    const toHand = normalize(subtract(solution.end, ARM.root));
    expect(dot(toTarget, toHand)).toBeCloseTo(1, 9);
    // And it keeps a trace of bend rather than hyperextending.
    expect(solution.bend).toBeLessThan(Math.PI);
    expect(solution.bend).toBeGreaterThan(Math.PI - 0.3);
  });

  it('refuses to fold the limb through itself', () => {
    // A target on top of the shoulder is inside the limb's dead zone.
    const solution = solveTwoBoneIk(ARM, { ...ARM.root });
    expect(distance(ARM.root, solution.mid)).toBeCloseTo(UPPER, 9);
    expect(distance(solution.mid, solution.end)).toBeCloseTo(LOWER, 9);
    expect(Number.isFinite(solution.bend)).toBe(true);
    // Folded as tightly as the geometry allows, not turned inside out.
    expect(solution.bend).toBeGreaterThan(0);
  });

  it('bends towards the pole, and keeps its own plane without one', () => {
    const target = { x: 0.2, y: 1.2, z: 0 };
    const forward = solveTwoBoneIk(ARM, target, { x: 0, y: 0, z: 1 });
    const backward = solveTwoBoneIk(ARM, target, { x: 0, y: 0, z: -1 });
    expect(forward.mid.z).toBeGreaterThan(backward.mid.z);

    // Without a pole the elbow stays on the side it already bends towards,
    // so a solved arm never flips its elbow behind the body.
    const free = solveTwoBoneIk(ARM, target);
    const axis = normalize(subtract(free.end, ARM.root));
    const restPole = chainPole(ARM);
    const solvedPole = normalize(reject(subtract(free.mid, ARM.root), axis));
    expect(dot(restPole, solvedPole)).toBeGreaterThan(0.5);
  });

  it('reports the bend angle the elbow actually makes', () => {
    // Straight out from the shoulder: the triangle collapses to a line.
    const straight = solveTwoBoneIk(ARM, { x: 0, y: 1.4 - (UPPER + LOWER), z: 0 });
    expect(straight.bend).toBeGreaterThan(Math.PI - 0.25);
    // Hand brought back near the shoulder: fully folded.
    const folded = solveTwoBoneIk(ARM, { x: 0.02, y: 1.38, z: 0.05 });
    expect(folded.bend).toBeLessThan(Math.PI / 2);
    expect(folded.bend).toBeLessThan(straight.bend);
  });

  it('rejects a chain that has no limb to solve', () => {
    const degenerate = { root: { x: 0, y: 0, z: 0 }, mid: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 1, z: 0 } };
    expect(() => solveTwoBoneIk(degenerate, { x: 1, y: 0, z: 0 })).toThrow();
  });
});
