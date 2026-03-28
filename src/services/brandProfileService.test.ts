import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./settingsService', () => {
  const store = new Map<string, unknown>();
  return {
    default: {
      getSetting: vi.fn(async (namespace: string) => (store.get(namespace) ?? null)),
      setSetting: vi.fn(async (namespace: string, data: unknown) => {
        store.set(namespace, data);
        return data;
      }),
      deleteSetting: vi.fn(async (namespace: string) => {
        store.delete(namespace);
        return true;
      }),
    },
  };
});

import {
  buildBrandReferenceFromProfile,
  clearStoredBrandProfile,
  getStoredBrandProfile,
  hasMeaningfulBrandProfile,
  saveStoredBrandProfile,
} from './brandProfileService';

describe('brandProfileService', () => {
  beforeEach(async () => {
    await clearStoredBrandProfile();
  });

  it('persists and restores a normalized brand profile', async () => {
    await saveStoredBrandProfile({
      brandName: ' Luigi Pizza ',
      brandNotes: ' Warm red branding ',
      logoName: 'logo.png',
      logoImage: 'data:image/png;base64,abc',
      paletteOptions: [
        {
          id: 'logo-original',
          label: 'Fra logo',
          description: 'Original',
          colors: ['#C0392B', '#f4e7d3', 'invalid'],
        },
      ],
      selectedPaletteId: 'logo-original',
      selectedPaletteColors: ['#C0392B', '#f4e7d3', '#1f2937'],
      applicationTargets: ['Signage', 'Wardrobe', 'Packaging', 'Interior Details'],
    });

    const restored = await getStoredBrandProfile();
    expect(restored?.brandName).toBe('Luigi Pizza');
    expect(restored?.paletteOptions[0].colors).toEqual(['#c0392b', '#f4e7d3']);
    expect(restored?.selectedPaletteColors).toEqual(['#c0392b', '#f4e7d3', '#1f2937']);
    expect(restored?.applicationTargets).toEqual(['signage', 'wardrobe', 'packaging', 'interior_details']);
  });

  it('builds a planner-ready brand reference with persistent targets', async () => {
    await saveStoredBrandProfile({
      brandName: 'Luigi Pizza',
      brandNotes: 'Keep it rustic.',
      selectedPaletteColors: ['#c0392b', '#f4e7d3'],
    });

    const profile = await getStoredBrandProfile();
    const reference = buildBrandReferenceFromProfile(profile);

    expect(reference?.brandName).toBe('Luigi Pizza');
    expect(reference?.profileName).toBe('Luigi Pizza');
    expect(reference?.palette).toEqual(['#c0392b', '#f4e7d3']);
    expect(reference?.usageNotes).toContain('Keep it rustic.');
    expect(reference?.usageNotes).toContain('signage, wardrobe, packaging, interior details');
    expect(reference?.applicationTargets).toEqual(['signage', 'wardrobe', 'packaging', 'interior_details']);
  });

  it('uses the selected direction label as profileName when available', async () => {
    await saveStoredBrandProfile({
      brandName: 'Luigi Pizza',
      brandNotes: 'Keep it rustic.',
      selectedPaletteColors: ['#c0392b', '#f4e7d3'],
      selectedDirectionId: 'trattoria-warm',
    });

    const profile = await getStoredBrandProfile();
    const reference = buildBrandReferenceFromProfile(profile);

    expect(reference?.profileName).toBe('Varm trattoria');
    expect(reference?.usageNotes).toContain('menu-board signage');
  });

  it('detects when a brand profile is meaningful', () => {
    expect(hasMeaningfulBrandProfile({})).toBe(false);
    expect(hasMeaningfulBrandProfile({ brandName: 'A' })).toBe(true);
    expect(hasMeaningfulBrandProfile({ selectedPaletteColors: ['#ffffff'] })).toBe(true);
  });
});
