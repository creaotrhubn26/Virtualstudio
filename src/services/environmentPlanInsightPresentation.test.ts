import { describe, expect, it } from 'vitest';
import { getEnvironmentPlanInsightPresentation } from './environmentPlanInsightPresentation';

const buildPlan = (overrides: Record<string, unknown> = {}) => ({
  version: '1.0',
  planId: 'plan-insight',
  prompt: 'Luxury retail boutique showroom with premium display walls',
  source: 'prompt',
  summary: 'Premium showroom scene.',
  concept: 'Showroom',
  roomShell: {
    type: 'interior_room',
    width: 14,
    depth: 11,
    height: 4.8,
    openCeiling: false,
    ceilingStyle: 'coffered',
    openings: [{ id: 'entry', wallTarget: 'backWall', kind: 'door', widthRatio: 0.2, heightRatio: 0.72, xAlign: 'left' }],
    zones: [{ id: 'hero', label: 'Hero', purpose: 'hero', xBias: 0, zBias: 0, widthRatio: 0.3, depthRatio: 0.24 }],
    notes: [],
  },
  surfaces: [],
  atmosphere: {},
  ambientSounds: [],
  props: [],
  characters: [],
  branding: null,
  lighting: [
    {
      role: 'accent',
      position: [1, 2, -1],
      intensity: 0.8,
      intent: 'luxury_retail',
      modifier: 'stripbox',
      gobo: {
        goboId: 'lines',
        rationale: 'Linear breakup hints at premium display slats.',
      },
      purpose: 'Wall grazing accent',
    },
  ],
  camera: {
    shotType: 'hero shot',
  },
  layoutGuidance: null,
  assemblySteps: [],
  compatibility: {
    currentStudioShellSupported: true,
    confidence: 0.9,
    gaps: [],
    nextBuildModules: [],
  },
  ...overrides,
}) as any;

describe('environmentPlanInsightPresentation', () => {
  it('summarizes family, shell and lighting rationale', () => {
    const presentation = getEnvironmentPlanInsightPresentation(buildPlan());

    expect(presentation?.familyId).toBe('luxury_retail');
    expect(presentation?.familyLabel).toBe('Luxury retail');
    expect(presentation?.summary).toContain('hero shot');
    expect(presentation?.shellSummary).toContain('coffered');
    expect(presentation?.lightingDetails[0]).toContain('gobo lines');
    expect(presentation?.lightingDetails[0]).toContain('premium display slats');
  });

  it('formats validation mode metadata when present', () => {
    const presentation = getEnvironmentPlanInsightPresentation(buildPlan(), {
      provider: 'gemini_validation',
      verdict: 'approved',
      overallScore: 0.87,
      categories: {
        promptFidelity: { score: 0.9, notes: [] },
        compositionMatch: { score: 0.85, notes: [] },
        lightingIntentMatch: { score: 0.88, notes: [] },
        technicalIntegrity: { score: 0.84, notes: [] },
        roomRealism: { score: 0.83, notes: [] },
      },
      suggestedAdjustments: [],
      validatedAt: '2026-03-25T00:00:00.000Z',
      previewUsed: true,
      usedVisionModel: true,
      providerMetadata: {
        validationMode: 'structural_blockout',
      },
    } as any);

    expect(presentation?.validationModeLabel).toBe('Strukturell blockout-validering');
  });
});
