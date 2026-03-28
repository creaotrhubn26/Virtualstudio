import { describe, expect, it } from 'vitest';
import { suggestMarketplaceEnvironmentPackMetadata } from './marketplaceEnvironmentPackSuggestions';

describe('suggestMarketplaceEnvironmentPackMetadata', () => {
  it('suggests warehouse-oriented metadata from the scene family', () => {
    const result = suggestMarketplaceEnvironmentPackMetadata({
      version: '1.0',
      planId: 'warehouse-pack',
      prompt: 'Industrial warehouse bay with haze and product plinth',
      source: 'prompt',
      summary: 'Warehouse product bay',
      concept: 'Warehouse product bay',
      roomShell: {
        type: 'warehouse',
        width: 20,
        depth: 16,
        height: 8,
        openCeiling: true,
        notes: [],
      },
      surfaces: [],
      atmosphere: {
        clearColor: '#111827',
        ambientColor: '#ffffff',
        ambientIntensity: 0.5,
        fogEnabled: true,
      },
      ambientSounds: [],
      props: [],
      characters: [],
      branding: {
        enabled: false,
        palette: ['#111827'],
      },
      lighting: [],
      camera: {
        shotType: 'dramatic',
      },
      compatibility: {
        currentStudioShellSupported: true,
        confidence: 0.8,
        gaps: [],
        nextBuildModules: [],
      },
    }, {
      insights: {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'Industrial warehouse',
        roomShellSummary: 'Warehouse shell',
        validationModeLabel: 'Preview',
        lightingHeadline: 'Warehouse lights',
        lightingDetails: [],
        rationale: [],
      },
    });

    expect(result.familyId).toBe('warehouse');
    expect(result.environmentCategory).toBe('urban');
    expect(result.tags).toEqual(expect.arrayContaining(['environment', 'warehouse', 'industrial']));
    expect(result.features).toContain('Warehouse shell');
  });
});
