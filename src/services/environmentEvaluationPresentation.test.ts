import { describe, expect, it } from 'vitest';
import { getEnvironmentEvaluationPresentation } from './environmentEvaluationPresentation';

describe('environmentEvaluationPresentation', () => {
  it('returns success-style messaging for approved high-scoring scenes', () => {
    const presentation = getEnvironmentEvaluationPresentation({
      provider: 'heuristic_environment_validation',
      verdict: 'approved',
      overallScore: 0.86,
      categories: {
        promptFidelity: { score: 0.9, notes: ['Prompt fidelity is strong.'] },
        compositionMatch: { score: 0.84, notes: ['Composition holds up.'] },
        lightingIntentMatch: { score: 0.88, notes: ['Lighting feels intentional.'] },
        technicalIntegrity: { score: 0.82, notes: ['Assembly is stable.'] },
        roomRealism: { score: 0.8, notes: ['Room feels grounded.'] },
      },
      suggestedAdjustments: ['Scenen scorer godt. Neste steg er preview-render og VLM-sjekk for finjustering.'],
      validatedAt: '2026-03-24T00:00:00.000Z',
    });

    expect(presentation?.severity).toBe('success');
    expect(presentation?.title).toContain('86%');
    expect(presentation?.summary).toContain('Miljøet scorer');
  });

  it('returns warning/error-style messaging for low scoring scenes', () => {
    const presentation = getEnvironmentEvaluationPresentation({
      provider: 'heuristic_environment_validation',
      verdict: 'needs_refinement',
      overallScore: 0.58,
      categories: {
        promptFidelity: { score: 0.7, notes: ['Prompt is partly mapped.'] },
        compositionMatch: { score: 0.52, notes: ['Camera is too generic.'] },
        lightingIntentMatch: { score: 0.48, notes: ['Lighting lacks clear intent.'] },
        technicalIntegrity: { score: 0.64, notes: ['Some route references are weak.'] },
        roomRealism: { score: 0.56, notes: ['Room needs more architecture.'] },
      },
      suggestedAdjustments: ['Presiser lighting intent, modifier, beam angle og haze for flere lys.'],
      validatedAt: '2026-03-24T00:00:00.000Z',
    });

    expect(presentation?.severity).toBe('error');
    expect(presentation?.summary).toContain('compositionMatch');
    expect(presentation?.details[0]).toContain('Presiser lighting intent');
  });
});
