/**
 * Rental Manifest Service — Guardrail Tests
 *
 * Validates that buildRentalManifest() and buildRentalCsv() produce correct
 * output for the equipment types in the virtual studio fixture database.
 * These are pure functions with no DOM or Babylon.js dependency.
 */
import { describe, it, expect } from 'vitest';
import { buildRentalManifest, buildRentalCsv } from './rentalManifestService';
import type { ManifestLight } from './rentalManifestService';

function makeLight(overrides: Partial<ManifestLight> = {}): ManifestLight {
  return {
    id: 'light_0',
    name: 'Key Light',
    type: 'led',
    cct: 5600,
    intensity: 80,
    modifier: 'none',
    enabled: true,
    ...overrides,
  };
}

// buildRentalManifest always appends sandbag + cable rows.
// Helper: return only the light/fixture rows (not accessories).
function fixtureRows(items: ReturnType<typeof buildRentalManifest>) {
  return items.filter(i => i.kategori !== 'Sikkerhet' && i.kategori !== 'Kabel/Strøm' && i.kategori !== 'Stativ');
}

describe('buildRentalManifest — type mapping', () => {
  it('maps led → Aputure brand', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'led' })]));
    expect(items).toHaveLength(1);
    expect(items[0].merke).toBe('Aputure');
  });

  it('maps strobe → Profoto brand', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'strobe' })]));
    expect(items[0].merke).toBe('Profoto');
  });

  it('maps hmi → Arri brand', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'hmi' })]));
    expect(items[0].merke).toBe('Arri');
  });

  it('maps area → Litepanels brand', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'area' })]));
    expect(items[0].merke).toBe('Litepanels');
  });

  it('maps kinoflo → Kino Flo brand', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'kinoflo' })]));
    expect(items[0].merke).toBe('Kino Flo');
  });

  it('falls back to Diverse brand for unknown types', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'mystery-fixture-xz900' })]));
    expect(items[0].merke).toBe('Diverse');
  });

  it('type matching is case-insensitive', () => {
    const items = fixtureRows(buildRentalManifest([makeLight({ type: 'LED' })]));
    expect(items[0].merke).toBe('Aputure');
  });
});

describe('buildRentalManifest — modifier mapping', () => {
  it('maps softbox modifier to full Norwegian name', () => {
    const items = buildRentalManifest([makeLight({ modifier: 'softbox' })]);
    expect(items[0].tilbehør).toContain('Softboks');
  });

  it('maps octabox modifier to Norwegian name', () => {
    const items = buildRentalManifest([makeLight({ modifier: 'octabox' })]);
    expect(items[0].tilbehør).toContain('Oktagondiffusor');
  });

  it('maps none modifier to —', () => {
    const items = buildRentalManifest([makeLight({ modifier: 'none' })]);
    expect(items[0].tilbehør).toBe('—');
  });

  it('maps empty modifier string to —', () => {
    const items = buildRentalManifest([makeLight({ modifier: '' })]);
    expect(items[0].tilbehør).toBe('—');
  });
});

describe('buildRentalManifest — enabled/disabled filtering', () => {
  it('excludes disabled lights from fixture rows', () => {
    const items = fixtureRows(buildRentalManifest([
      makeLight({ id: 'on', enabled: true }),
      makeLight({ id: 'off', enabled: false }),
    ]));
    expect(items).toHaveLength(1);
    expect(items[0].antall).toBe(1);
  });

  it('returns empty array when all lights disabled', () => {
    const items = buildRentalManifest([
      makeLight({ enabled: false }),
      makeLight({ enabled: false }),
    ]);
    // No fixture rows; sandbags/cables are only added when items.length > 0
    expect(fixtureRows(items)).toHaveLength(0);
  });

  it('includes all enabled lights in correct order', () => {
    const items = fixtureRows(buildRentalManifest([
      makeLight({ id: 'A', name: 'Key', type: 'led', enabled: true }),
      makeLight({ id: 'B', name: 'Fill', type: 'hmi', enabled: true }),
    ]));
    expect(items).toHaveLength(2);
    expect(items[0].navn).toBe('Key');
    expect(items[1].navn).toBe('Fill');
  });
});

describe('buildRentalManifest — output fields', () => {
  it('CCT field uses K suffix', () => {
    const items = buildRentalManifest([makeLight({ cct: 5600 })]);
    expect(items[0].cct).toBe('5600K');
  });

  it('effekt field rounds to nearest percent', () => {
    const items = buildRentalManifest([makeLight({ intensity: 75.7 })]);
    expect(items[0].effekt).toBe('76%');
  });

  it('antall is always 1 per light row', () => {
    const items = buildRentalManifest([makeLight()]);
    expect(items[0].antall).toBe(1);
  });

  it('kategori is set for known types', () => {
    const items = buildRentalManifest([makeLight({ type: 'led' })]);
    expect(items[0].kategori).toBe('LED');
  });
});

describe('buildRentalCsv — format', () => {
  const CSV = buildRentalCsv(
    [
      makeLight({ id: 'l0', name: 'Nøkkellys', type: 'led', cct: 5600, intensity: 100, modifier: 'softbox' }),
      makeLight({ id: 'l1', name: 'Fylllys', type: 'strobe', cct: 5500, intensity: 50, modifier: 'none' }),
    ],
    'Test Scene',
  );

  it('contains Norwegian column headers', () => {
    expect(CSV).toContain('Navn');
    expect(CSV).toContain('Merke');
    expect(CSV).toContain('Modell');
    expect(CSV).toContain('Stativ');
  });

  it('contains light names in output', () => {
    expect(CSV).toContain('Nøkkellys');
    expect(CSV).toContain('Fylllys');
  });

  it('contains scene name header', () => {
    expect(CSV).toContain('Test Scene');
  });

  it('separates fields with commas (CSV standard)', () => {
    const lines = CSV.split('\n');
    const dataLine = lines.find(l => l.includes('Nøkkellys'));
    expect(dataLine).toBeTruthy();
    expect(dataLine!.split(',').length).toBeGreaterThan(3);
  });

  it('includes sandbag rows from buildRentalManifest', () => {
    expect(CSV.toLowerCase()).toContain('sandsekk');
  });
});
