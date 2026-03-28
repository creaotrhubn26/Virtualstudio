import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvironmentPlan } from '../core/models/environmentPlan';

const apiRequestMock = vi.fn();

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

const basePlan = {
  version: '1.0',
  planId: 'plan-validate',
  prompt: 'pizza restaurant',
  source: 'prompt',
  summary: 'Warm pizzeria',
  concept: 'Pizza scene',
  roomShell: {
    type: 'storefront',
    width: 14,
    depth: 10,
    height: 4.5,
    openCeiling: false,
    notes: [],
    openings: [],
    zones: [],
    fixtures: [],
    niches: [],
    wallSegments: [],
  },
  surfaces: [],
  atmosphere: {},
  ambientSounds: [],
  props: [],
  characters: [],
  branding: null,
  lighting: [],
  camera: {
    shotType: 'medium',
    target: [0, 1.4, 0],
    positionHint: [0, 1.8, -6],
    fov: 0.68,
  },
  assemblySteps: [],
  compatibility: {
    currentStudioShellSupported: true,
    confidence: 0.8,
    gaps: [],
    nextBuildModules: [],
  },
} as unknown as EnvironmentPlan;

describe('environmentValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).__virtualStudioEnvironmentValidationMock;
    delete (window as any).__virtualStudioEnvironmentValidationRequests;
  });

  it('uses the browser mock when available', async () => {
    (window as any).__virtualStudioEnvironmentValidationMock = {
      success: true,
      provider: 'mock',
      evaluation: {
        provider: 'mock',
        verdict: 'approved',
        overallScore: 0.91,
        categories: {
          promptFidelity: { score: 0.9, notes: [] },
          compositionMatch: { score: 0.9, notes: [] },
          lightingIntentMatch: { score: 0.9, notes: [] },
          technicalIntegrity: { score: 0.9, notes: [] },
          roomRealism: { score: 0.9, notes: [] },
        },
        suggestedAdjustments: [],
        validatedAt: '2026-03-24T00:00:00.000Z',
      },
    };

    const { environmentValidationService } = await import('./environmentValidationService');
    const result = await environmentValidationService.validate(basePlan);

    expect(result.provider).toBe('mock');
    expect((window as any).__virtualStudioEnvironmentValidationRequests).toHaveLength(1);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it('posts plan payloads to the backend when no mock is present', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      provider: 'heuristic_environment_validation',
      evaluation: {
        provider: 'heuristic_environment_validation',
        verdict: 'approved',
        overallScore: 0.82,
        categories: {
          promptFidelity: { score: 0.9, notes: [] },
          compositionMatch: { score: 0.8, notes: [] },
          lightingIntentMatch: { score: 0.8, notes: [] },
          technicalIntegrity: { score: 0.8, notes: [] },
          roomRealism: { score: 0.8, notes: [] },
        },
        suggestedAdjustments: [],
        validatedAt: '2026-03-24T00:00:00.000Z',
      },
    });

    const { environmentValidationService } = await import('./environmentValidationService');
    const result = await environmentValidationService.validate(basePlan, {
      previewImage: 'data:image/jpeg;base64,preview',
      provider: 'vision_vlm',
      validationOptions: {
        referenceMode: 'runtime_preview',
      },
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/environment/validate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        plan: basePlan,
        previewImage: 'data:image/jpeg;base64,preview',
        provider: 'vision_vlm',
        validationOptions: {
          referenceMode: 'runtime_preview',
        },
      }),
    }));
    expect(result.evaluation.overallScore).toBe(0.82);
  });
});
