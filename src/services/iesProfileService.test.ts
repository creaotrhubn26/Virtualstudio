/**
 * IES Profile Service — Guardrail Tests
 *
 * These tests validate the ANSI/IESNA LM-63 parser so any future change
 * to iesProfileService.ts that breaks the parser will be caught immediately.
 * parseIES() is pure (no DOM, no Babylon.js) and runs cleanly in Node.
 */
import { describe, it, expect } from 'vitest';
import { parseIES } from './iesProfileService';

// ── Minimal valid IES string (LM-63-2002, rotationally symmetric) ─────────────
const MINIMAL_IES = `IESNA:LM-63-2002
[TEST] TEST-MINIMAL-001
[MANUFAC] TestBrand
[LUMCAT] TEST-FIX-1K
[LUMINAIRE] Test fixture 1000W
TILT=NONE
1 5000 1.0 5 1 1 2 0.0 0.0 0.0
1.0 1.0 100
0 22.5 45 67.5 90
0
5000.0 4000.0 2500.0 800.0 0.0
`;

// ── Wider distribution (Aputure open-face style, 91 vertical angles) ──────────
function buildGaussianIES(halfPowerAngle: number, maxCd: number, numVert = 19): string {
  const sigma = halfPowerAngle / Math.sqrt(2 * Math.log(2));
  const angles = Array.from({ length: numVert }, (_, i) => ((i * 90) / (numVert - 1)).toFixed(1));
  const candela = angles.map(a => {
    const v = parseFloat(a);
    const cd = maxCd * Math.exp(-0.5 * (v / sigma) ** 2);
    return cd.toFixed(1);
  });
  return [
    'IESNA:LM-63-2002',
    '[TEST] TEST-GAUSS',
    '[MANUFAC] VirtualStudio',
    '[LUMCAT] TEST-GAUSS',
    'TILT=NONE',
    `1 15000 1.0 ${numVert} 1 1 2 0.0 0.0 0.0`,
    '1.0 1.0 350',
    angles.join(' '),
    '0',
    candela.join(' '),
    '',
  ].join('\n');
}

// ── 1991 format (no IESNA: header) ───────────────────────────────────────────
const LEGACY_IES_1991 = `[TEST] LEGACY-1991
[MANUFAC] LegacyCo
TILT=NONE
1 3000 1.0 3 1 1 1 0.0 0.0 0.0
1.0 1.0 200
0 45 90
0
3000.0 2000.0 0.0
`;

describe('parseIES — basic structure', () => {
  it('parses vertical angles correctly', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.verticalAngles).toEqual([0, 22.5, 45, 67.5, 90]);
  });

  it('parses horizontal angles correctly (rotationally symmetric)', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.horizontalAngles).toHaveLength(1);
    expect(p.horizontalAngles[0]).toBe(0);
  });

  it('extracts maxCandela from candela matrix', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.maxCandela).toBeCloseTo(5000, 0);
  });

  it('sets luminousFlux from lamp lumen value', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.luminousFlux).toBe(5000);
  });

  it('extracts manufacturer from [MANUFAC] header', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.manufacturer).toBe('TestBrand');
  });

  it('extracts description from [TEST] header', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.description).toContain('TEST-MINIMAL-001');
  });

  it('preserves filename', () => {
    const p = parseIES(MINIMAL_IES, 'mylight.ies');
    expect(p.filename).toBe('mylight.ies');
  });
});

describe('parseIES — candela matrix', () => {
  it('candela matrix has correct dimensions [horiz][vert]', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.candelaMatrix).toHaveLength(1);       // 1 horizontal plane
    expect(p.candelaMatrix[0]).toHaveLength(5);    // 5 vertical angles
  });

  it('first candela value (nadir, 0°) is maxCandela', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.candelaMatrix[0][0]).toBeCloseTo(5000, 0);
  });

  it('last candela value (90°) is zero', () => {
    const p = parseIES(MINIMAL_IES, 'test.ies');
    expect(p.candelaMatrix[0][4]).toBe(0);
  });

  it('Gaussian distribution peaks at 0° and falls monotonically', () => {
    const ies = buildGaussianIES(27.5, 26820, 19);
    const p = parseIES(ies, 'gauss.ies');
    const row = p.candelaMatrix[0];
    for (let i = 1; i < row.length; i++) {
      expect(row[i]).toBeLessThanOrEqual(row[i - 1] + 0.1);
    }
  });
});

describe('parseIES — format variants', () => {
  it('parses LM-63-1991 format (no IESNA: header)', () => {
    const p = parseIES(LEGACY_IES_1991, 'legacy.ies');
    expect(p.maxCandela).toBeCloseTo(3000, 0);
    expect(p.verticalAngles).toHaveLength(3);
  });

  it('applies candelaMultiplier correctly', () => {
    const scaled = MINIMAL_IES.replace('1 5000 1.0 5', '1 5000 2.0 5');
    const p = parseIES(scaled, 'scaled.ies');
    expect(p.maxCandela).toBeCloseTo(10000, 0);
  });

  it('applies ballastFactor correctly', () => {
    const withBallast = MINIMAL_IES.replace('1.0 1.0 100', '0.95 1.0 100');
    const p = parseIES(withBallast, 'ballast.ies');
    expect(p.maxCandela).toBeCloseTo(4750, 0);
  });

  it('handles CRLF line endings', () => {
    const crlf = MINIMAL_IES.replace(/\n/g, '\r\n');
    const p = parseIES(crlf, 'crlf.ies');
    expect(p.maxCandela).toBeCloseTo(5000, 0);
  });

  it('throws on missing TILT line', () => {
    const bad = MINIMAL_IES.replace('TILT=NONE', '');
    expect(() => parseIES(bad, 'bad.ies')).toThrow('Ugyldig IES-fil');
  });
});

describe('parseIES — generated library fixtures', () => {
  it('Arri M18 HMI spot: maxCandela is ~1.6M cd', () => {
    // Build a spot-profile IES inline (matches what the generator produces)
    const sigma = 6.5 / Math.sqrt(2 * Math.log(2));
    const vert = Array.from({ length: 91 }, (_, i) => i);
    const cd = vert.map(v => (1600000 * Math.exp(-0.5 * (v / sigma) ** 2)).toFixed(1));
    const ies = [
      'IESNA:LM-63-2002',
      '[TEST] ARRI-M18-SPOT',
      '[MANUFAC] Arri',
      '[LUMCAT] M18-HMI-SPOT',
      'TILT=NONE',
      `1 250000 1.0 ${vert.length} 1 1 2 0.0 0.0 0.0`,
      '1.0 1.0 1800',
      vert.join(' '),
      '0',
      cd.join(' '),
      '',
    ].join('\n');

    const p = parseIES(ies, 'arri-m18-hmi-spot.ies');
    expect(p.maxCandela).toBeGreaterThan(1_000_000);
    expect(p.verticalAngles).toHaveLength(91);
  });

  it('Lambertian panel: maxCandela at 0°, near-zero at 90°', () => {
    const maxCd = 27900;
    const vert = Array.from({ length: 46 }, (_, i) => i * 2);
    const cd = vert.map(v => (maxCd * Math.cos((v * Math.PI) / 180) ** 1.3).toFixed(1));
    const ies = [
      'IESNA:LM-63-2002',
      '[TEST] ARRI-SKYPANEL-S60',
      '[MANUFAC] Arri',
      '[LUMCAT] SkyPanel-S60-C',
      'TILT=NONE',
      `1 27000 1.0 ${vert.length} 1 1 2 0.0 0.0 0.0`,
      '1.0 1.0 380',
      vert.join(' '),
      '0',
      cd.join(' '),
      '',
    ].join('\n');

    const p = parseIES(ies, 'arri-skypanel-s60-c.ies');
    expect(p.candelaMatrix[0][0]).toBeGreaterThan(20000);
    expect(p.candelaMatrix[0][p.candelaMatrix[0].length - 1]).toBeLessThan(500);
  });
});
