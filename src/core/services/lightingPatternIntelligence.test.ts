import { describe, expect, it } from 'vitest';
import {
  formatLightingPatternLabel,
  getRecommendedLightingPatternIdsForSceneFamily,
  getRecommendedLightingPatternLabelsForSceneFamily,
  inferEnvironmentLightingGobo,
  inferEnvironmentLightingRecipe,
  getLightingPatternGobo,
  getTopViewGuideForPattern,
  inferLightingPatternIntent,
  isLightingPatternRecommendedForSceneFamily,
  resolveLightingPatternThumbnail,
  resolveLightingPatternThumbnailFallback,
  resolveScenarioPresetPreview,
} from './lightingPatternIntelligence';

describe('lightingPatternIntelligence', () => {
  it('resolves known thumbnails to attached assets', () => {
    expect(resolveLightingPatternThumbnail('rembrandt')).toBe(
      '/attached_assets/generated_images/rembrandt_lighting_pattern_diagram.png',
    );
    expect(resolveLightingPatternThumbnail('three-point')).toBe(
      '/attached_assets/generated_images/three-point_lighting_diagram.png',
    );
  });

  it('maps hollywood scenario presets to valid preview images', () => {
    expect(
      resolveScenarioPresetPreview('hollywood-rembrandt', '/images/presets/hollywood-rembrandt.png', 'hollywood'),
    ).toBe('/attached_assets/generated_images/rembrandt_lighting_pattern_diagram.png');
  });

  it('can generate a generic fallback preview even for known patterns', () => {
    expect(resolveLightingPatternThumbnailFallback('rembrandt')).toContain('data:image/svg+xml,');
    expect(resolveLightingPatternThumbnailFallback({
      id: 'warehouse-texture',
      name: 'Warehouse Texture',
      category: 'dramatic',
    })).toContain('data:image/svg+xml,');
  });

  it('falls back to a generated preview for unknown presets', () => {
    expect(resolveScenarioPresetPreview('custom-wedding-look', '/images/presets/custom-wedding-look.png', 'portrait')).toContain(
      'data:image/svg+xml,',
    );
  });

  it('infers top-view guide ids from pattern metadata', () => {
    expect(getTopViewGuideForPattern({ id: 'hollywood-loop', name: 'Loop Lighting' })).toBe('loop');
    expect(getTopViewGuideForPattern({ id: 'hollywood-clamshell', name: 'Clamshell Lighting' })).toBe('clamshell');
  });

  it('returns pattern-specific gobos only when the pattern calls for them', () => {
    expect(getLightingPatternGobo('cyberpunk', 'accent')?.goboId).toBe('dots');
    expect(getLightingPatternGobo('motivated', 'key')?.goboId).toBe('window');
    expect(getLightingPatternGobo('rembrandt', 'key')).toBeNull();
  });

  it('infers appetizing restaurant gobos for support lights when AI omits them', () => {
    expect(inferEnvironmentLightingGobo({
      role: 'rim',
      purpose: 'Warm separation on herbs and glassware',
      mood: 'appetizing premium commercial',
      contextText: 'Pizza restaurant commercial with rustic trattoria styling and branded signage',
    })?.goboId).toBe('window');
    expect(inferEnvironmentLightingGobo({
      role: 'key',
      purpose: 'Warm hero light for the pizza and table texture',
      mood: 'appetizing premium commercial',
      contextText: 'Pizza restaurant commercial with rustic trattoria styling',
    })).toBeNull();
  });

  it('infers editorial breakup gobos for beauty support lights but keeps key lights clean', () => {
    expect(inferEnvironmentLightingGobo({
      role: 'accent',
      purpose: 'Glossy editorial accent sweep for product highlights',
      mood: 'luxury beauty editorial',
      contextText: 'fashion beauty close-up with premium glossy backdrop',
    })?.goboId).toBe('breakup');
    expect(inferEnvironmentLightingGobo({
      role: 'key',
      purpose: 'Soft beauty key with broad flattering coverage',
      mood: 'luxury beauty editorial',
      contextText: 'fashion beauty close-up with premium glossy backdrop',
    })).toBeNull();
  });

  it('infers noir and warehouse gobos with role-aware texture choices', () => {
    expect(inferEnvironmentLightingGobo({
      role: 'key',
      purpose: 'Hard venetian blind shadow across the subject',
      mood: 'dramatic low-key noir',
      contextText: 'detective portrait with venetian blinds',
    })?.goboId).toBe('blinds');
    expect(inferEnvironmentLightingGobo({
      role: 'accent',
      purpose: 'Dusty industrial breakup on the background wall',
      mood: 'industrial warehouse plate',
      contextText: 'warehouse scene with haze and metal texture',
    })?.goboId).toBe('breakup');
    expect(inferEnvironmentLightingGobo({
      role: 'key',
      purpose: 'Clean overhead industrial key',
      mood: 'industrial warehouse plate',
      contextText: 'warehouse scene with practical overheads',
    })).toBeNull();
  });

  it('can infer pattern intent from aliases', () => {
    const intent = inferLightingPatternIntent('Butterfly / Paramount portrait setup');
    expect(intent?.id).toBe('butterfly');
    expect(intent?.topViewGuideId).toBe('butterfly');
  });

  it('maps scene families to recommended lighting patterns', () => {
    expect(getRecommendedLightingPatternIdsForSceneFamily('noir')).toEqual(['low-key', 'split', 'motivated']);
    expect(getRecommendedLightingPatternIdsForSceneFamily('luxury_retail')).toEqual(['high-key', 'clamshell', 'product-hero']);
    expect(getRecommendedLightingPatternIdsForSceneFamily('unknown')).toEqual([]);
  });

  it('formats pattern labels and exposes family recommendation labels', () => {
    expect(formatLightingPatternLabel('low-key')).toBe('Low Key');
    expect(formatLightingPatternLabel('three-point')).toBe('Three-Point');
    expect(getRecommendedLightingPatternLabelsForSceneFamily('office')).toEqual(['Three-Point', 'Loop', 'High Key']);
  });

  it('can tell if a lighting pattern matches the active scene family', () => {
    expect(isLightingPatternRecommendedForSceneFamily('Low Key Lighting', 'noir')).toBe(true);
    expect(isLightingPatternRecommendedForSceneFamily({ id: 'three-point', name: 'Three-Point Lighting' }, 'office')).toBe(true);
    expect(isLightingPatternRecommendedForSceneFamily({ id: 'clamshell', name: 'Clamshell Lighting' }, 'warehouse')).toBe(false);
  });

  it('returns richer lighting recipes for food and nightclub scenes', () => {
    const foodRecipe = inferEnvironmentLightingRecipe({
      role: 'rim',
      purpose: 'Warm separation around the pizza hero',
      mood: 'appetizing premium commercial',
      contextText: 'Rustic pizzeria interior with window light and branded menu board',
    });
    expect(foodRecipe.intent).toBe('food');
    expect(foodRecipe.modifier).toBe('fresnel');
    expect(foodRecipe.gobo?.goboId).toBe('window');
    expect(foodRecipe.rationale.length).toBeGreaterThan(12);

    const nightclubRecipe = inferEnvironmentLightingRecipe({
      role: 'accent',
      purpose: 'Moving club texture in haze behind the dancer',
      mood: 'nightclub hero promo',
      contextText: 'LED dancefloor and DJ booth',
    });
    expect(nightclubRecipe.intent).toBe('nightclub');
    expect(nightclubRecipe.haze?.enabled).toBe(true);
    expect(nightclubRecipe.gobo?.goboId).toBe('dots');
  });

  it('returns cleaner office recipes for interview scenes', () => {
    const officeRecipe = inferEnvironmentLightingRecipe({
      role: 'key',
      purpose: 'Neutral flattering interview key',
      mood: 'corporate explainer',
      contextText: 'office meeting room with brand-safe daylight',
    });
    expect(officeRecipe.intent).toBe('office');
    expect(officeRecipe.modifier).toBe('softbox');
    expect(officeRecipe.gobo ?? null).toBeNull();
    expect(officeRecipe.beamAngle).toBeGreaterThan(40);
  });
});
