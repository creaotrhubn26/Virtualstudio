import { describe, expect, it } from 'vitest';
import type { EnvironmentPlanInsightPresentation } from './environmentPlanInsightPresentation';
import {
  getLightingInsightForRole,
  inferRecommendedBeamAngle,
  inferRecommendedGoboId,
  inferRecommendedModifier,
} from './lightingInsightRecommendations';

describe('lightingInsightRecommendations', () => {
  const warehouseInsight: EnvironmentPlanInsightPresentation = {
    familyId: 'warehouse',
    familyLabel: 'Warehouse',
    summary: 'AI leser dette som warehouse.',
    lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
  };

  it('returns the matching lighting detail for a role', () => {
    expect(getLightingInsightForRole(warehouseInsight, 'rim')).toContain('fresnel');
    expect(getLightingInsightForRole(warehouseInsight, 'key')).toBeNull();
  });

  it('infers gobo ids from light rationale text', () => {
    expect(inferRecommendedGoboId('rim', warehouseInsight.lightingDetails[0], warehouseInsight)).toBe('breakup');
  });

  it('infers modifiers from light rationale text', () => {
    expect(inferRecommendedModifier(warehouseInsight.lightingDetails[0])).toBe('fresnel');
  });

  it('infers beam angle from light rationale text', () => {
    expect(inferRecommendedBeamAngle(warehouseInsight.lightingDetails[0])).toBe(24);
  });
});
