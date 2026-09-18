import { describe, it, expect } from 'vitest';
import { coveProfile, focalLengthToVerticalFov, studioExposure } from './studioGeometry';

describe('studio optics and cyclorama', () => {
  it('narrows the vertical field of view as focal length increases', () => {
    expect(focalLengthToVerticalFov(50) * 180 / Math.PI).toBeCloseTo(26.99, 2);
    expect(focalLengthToVerticalFov(85)).toBeLessThan(focalLengthToVerticalFov(50));
    for (const value of [0, -1, Infinity, NaN]) expect(() => focalLengthToVerticalFov(value)).toThrow();
  });
  it('joins the sweep to the floor and wall with matching tangents', () => {
    const p = coveProfile(1.5, 5.5, 8, 5);
    expect(p.every(v => v.asArray().every(Number.isFinite))).toBe(true);
    expect(p[1].y).toBe(0);
    expect(p[p.length - 2].z).toBe(5);
    const floorTangent = p[2].subtract(p[1]).normalize();
    const wallTangent = p[p.length - 2].subtract(p[p.length - 3]).normalize();
    expect(floorTangent.z).toBeGreaterThan(.999);
    expect(wallTangent.y).toBeGreaterThan(.999);
    expect(p.every((v, i) => !i || v.y >= p[i - 1].y)).toBe(true);
  });
  it('models photographic stops without changing light output', () => {
    expect(studioExposure(100, 2.8, '1/125', 0)).toBeCloseTo(1);
    expect(studioExposure(200, 2.8, '1/125', 0)).toBeCloseTo(2);
    expect(studioExposure(100, 2.8 * Math.SQRT2, '1/125', 0)).toBeCloseTo(.5);
    expect(studioExposure(100, 2.8, '1/250', 0)).toBeCloseTo(.5);
    expect(studioExposure(100, 2.8, '0.008', 1)).toBeCloseTo(.5);
    expect(() => studioExposure(100, 0, '1/125', 0)).toThrow();
  });
});
