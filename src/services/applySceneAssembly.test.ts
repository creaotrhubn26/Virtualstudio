/**
 * applySceneAssembly — guardrail tests for the four bug fixes shipped
 * in commit b023fc0. They lock down behaviour that was previously
 * silently wrong, so a future refactor that regresses one of them
 * fails the test suite immediately.
 *
 * Covered:
 *   • placementForHint default fan layout (fix #3) — must use total,
 *     not (index+2), so 6+ props don't pile up on one half.
 *   • resolveAndDispatchProps result-by-description matching (fix #2)
 *     — backend dedupe / reorder / partial-failure must not shuffle
 *     GLBs onto the wrong props.
 *   • resolveAndDispatchProps backend-failure fallback shape — all
 *     planProps surface as failed with "backend unreachable" rather
 *     than the function throwing.
 *   • Same matching guarantees for resolveAndDispatchCast (fix #2
 *     applied to characters).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  placementForHint,
  resolveAndDispatchProps,
  resolveAndDispatchCast,
  type PlanProp,
  type CastInput,
} from './applySceneAssembly';
import * as resolver from './propResolverClient';

const SUBJECT = { x: 0, y: 1.65, z: 0 };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('placementForHint default fan-out', () => {
  it('spaces 6 props evenly around 360°, not piled on one half', () => {
    const total = 6;
    const angles: number[] = [];
    for (let i = 0; i < total; i++) {
      const p = placementForHint(null, SUBJECT, i, total);
      // recover angle from the (sin, cos) pair the function emits
      const dx = p.x - SUBJECT.x;
      const dz = p.z - SUBJECT.z;
      angles.push(Math.atan2(dx, dz));
    }
    // sort + check successive deltas: with i*2π/total, deltas land at
    // 2π/total ± floating noise. The pre-fix formula (index+2) gave
    // monotonically-decreasing angles bunched on one half.
    const sorted = [...angles].sort((a, b) => a - b);
    const expectedStep = (Math.PI * 2) / total;
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i] - sorted[i - 1];
      expect(delta).toBeGreaterThan(expectedStep * 0.7);
      expect(delta).toBeLessThan(expectedStep * 1.3);
    }
  });

  it('two props with no hint land on opposite sides of the subject', () => {
    const a = placementForHint(null, SUBJECT, 0, 2);
    const b = placementForHint(null, SUBJECT, 1, 2);
    // sin(0)=0, sin(π)=0 — both x at subject.x. The z offsets have
    // opposite signs (one in front, one behind); their magnitudes
    // differ because the radius varies by `index % 3` to avoid stacking.
    const za = a.z - SUBJECT.z;
    const zb = b.z - SUBJECT.z;
    expect(Math.sign(za)).toBe(-Math.sign(zb));
    expect(Math.abs(za)).toBeGreaterThan(0.5);
    expect(Math.abs(zb)).toBeGreaterThan(0.5);
  });

  it('respects explicit hints over the fan default', () => {
    const ceiling = placementForHint('overhead', SUBJECT, 0, 4);
    expect(ceiling.y).toBeGreaterThan(SUBJECT.y);
    const wall = placementForHint('behind subject on wall', SUBJECT, 0, 4);
    expect(wall.z).toBeLessThan(SUBJECT.z);
  });
});

describe('resolveAndDispatchProps — match by description, not index', () => {
  const planProps: PlanProp[] = [
    { description: 'vintage brass typewriter', name: 'typewriter', category: 'hero', placementHint: 'desk', priority: 'high' },
    { description: 'wooden crate', name: 'crate', category: 'set_dressing', placementHint: 'floor', priority: 'low' },
    { description: 'antique brass lamp', name: 'lamp', category: 'practical', placementHint: 'desk', priority: 'med' },
  ];

  function fakeResult(description: string, glbUrl: string | null = `https://r2.test/${encodeURIComponent(description)}.glb`) {
    return {
      success: glbUrl !== null,
      glbUrl,
      fingerprint: description,
      provider: 'cache' as const,
      cacheHit: true,
      sizeKb: 100,
      elapsedSec: 0.01,
      description,
      error: glbUrl === null ? 'failed' : null,
    };
  }

  it('reorders the backend response and still attaches the right URL to each prop', async () => {
    // Backend returns results in REVERSE order — by completion time, say.
    const reversedResults = [
      fakeResult('antique brass lamp'),
      fakeResult('wooden crate'),
      fakeResult('vintage brass typewriter'),
    ];
    const spy = vi.spyOn(resolver, 'resolveProps').mockResolvedValue({
      count: reversedResults.length,
      results: reversedResults,
    });

    const dispatched: Array<{ url: string; name: string }> = [];
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      dispatched.push({ url: detail.url, name: detail.name });
    };
    window.addEventListener('vs-load-external-glb', handler);

    const warnings: string[] = [];
    const result = await resolveAndDispatchProps(planProps, SUBJECT, 30, warnings);

    window.removeEventListener('vs-load-external-glb', handler);
    expect(spy).toHaveBeenCalledOnce();

    // Every input must be paired with the result whose description matches.
    expect(result.total).toBe(3);
    expect(result.resolved).toBe(3);
    expect(result.loaded).toBe(3);
    expect(warnings).toEqual([]);

    // Dispatched events should have the correct URL+name for each prop —
    // pre-fix this would have shuffled because of the reversed order.
    const byName = new Map(dispatched.map((d) => [d.name, d.url]));
    expect(byName.get('typewriter')).toContain('vintage%20brass%20typewriter');
    expect(byName.get('crate')).toContain('wooden%20crate');
    expect(byName.get('lamp')).toContain('antique%20brass%20lamp');
  });

  it('falls back to index-match with a warning when the backend echo is missing', async () => {
    // Backend strips the description field — older shape. Same order
    // as input, so index-match is correct; we just want the warning.
    const stripped = planProps.map((p) => ({ ...fakeResult(p.description), description: '' }));
    vi.spyOn(resolver, 'resolveProps').mockResolvedValue({
      count: stripped.length,
      results: stripped,
    });

    const warnings: string[] = [];
    const result = await resolveAndDispatchProps(planProps, SUBJECT, 30, warnings);

    expect(result.total).toBe(3);
    expect(result.resolved).toBe(3);
    expect(warnings.length).toBe(3);
    for (const w of warnings) {
      expect(w).toContain('matched');
      expect(w).toContain('backend echo missing');
    }
  });

  it('marks props as failed when the backend returns fewer results than inputs', async () => {
    // Backend dropped "wooden crate" from the response entirely.
    vi.spyOn(resolver, 'resolveProps').mockResolvedValue({
      count: 2,
      results: [
        fakeResult('vintage brass typewriter'),
        fakeResult('antique brass lamp'),
      ],
    });

    const warnings: string[] = [];
    const result = await resolveAndDispatchProps(planProps, SUBJECT, 30, warnings);

    expect(result.total).toBe(3);
    expect(result.resolved).toBe(2);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].description).toBe('wooden crate');
    expect(result.failed[0].error).toBe('no result returned by resolver');
  });

  it('returns a clean "backend unreachable" shape on resolver throw', async () => {
    vi.spyOn(resolver, 'resolveProps').mockRejectedValue(new Error('ECONNREFUSED'));
    const warnings: string[] = [];
    const result = await resolveAndDispatchProps(planProps, SUBJECT, 30, warnings);
    expect(result.total).toBe(3);
    expect(result.resolved).toBe(0);
    expect(result.loaded).toBe(0);
    expect(result.failed.length).toBe(3);
    for (const f of result.failed) expect(f.error).toBe('backend unreachable');
    expect(warnings.some((w) => w.includes('resolveProps request failed'))).toBe(true);
  });
});

describe('resolveAndDispatchCast — match by description, not index', () => {
  const inputs: CastInput[] = [
    { name: 'detective', description: 'cinematic man with beard, leather jacket', suggestedPlacement: null },
    { name: 'elder', description: 'cinematic elderly man, worn cardigan, reading glasses', suggestedPlacement: null },
  ];

  function fakeChar(description: string) {
    return {
      success: true,
      glbUrl: `https://r2.test/cast/${encodeURIComponent(description)}.glb`,
      fingerprint: description,
      provider: 'cache' as const,
      cacheHit: true,
      sizeKb: 5000,
      elapsedSec: 0.01,
      description,
      heightMeters: 1.78,
      walkingGlbUrl: null,
      runningGlbUrl: null,
      texturedGlbUrl: null,
      error: null,
    };
  }

  it('matches reordered cast results to the right character slot', async () => {
    vi.spyOn(resolver, 'resolveCast').mockResolvedValue({
      count: 2,
      results: [
        fakeChar('cinematic elderly man, worn cardigan, reading glasses'),
        fakeChar('cinematic man with beard, leather jacket'),
      ],
    });

    const dispatched: Array<{ url: string; name: string }> = [];
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      dispatched.push({ url: detail.url, name: detail.name });
    };
    window.addEventListener('vs-load-external-glb', handler);

    const warnings: string[] = [];
    const result = await resolveAndDispatchCast(inputs, SUBJECT, 1.78, warnings);
    window.removeEventListener('vs-load-external-glb', handler);

    expect(result.resolved).toBe(2);
    const byName = new Map(dispatched.map((d) => [d.name, d.url]));
    expect(byName.get('detective')).toContain('beard');
    expect(byName.get('elder')).toContain('elderly');
  });
});
