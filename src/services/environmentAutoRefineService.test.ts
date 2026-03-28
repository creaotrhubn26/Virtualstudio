import { describe, expect, it } from 'vitest';
import { environmentAutoRefineService } from './environmentAutoRefineService';

function buildPlan() {
  return {
    version: '1.0',
    planId: 'plan-auto-refine',
    prompt: 'Warm pizza restaurant with branded staff and hero pizza by the counter',
    source: 'prompt',
    summary: 'Pizza storefront',
    concept: 'Food hero',
    roomShell: {
      type: 'storefront',
      width: 14,
      depth: 10,
      height: 4.6,
      openCeiling: false,
      notes: [],
      openings: [],
      zones: [
        { id: 'prep-zone', label: 'Prep', purpose: 'prep', xBias: -0.2, zBias: 0.1, widthRatio: 0.24, depthRatio: 0.2 },
        { id: 'counter-zone', label: 'Counter', purpose: 'counter', xBias: 0, zBias: 0, widthRatio: 0.26, depthRatio: 0.22 },
        { id: 'dining-zone', label: 'Dining', purpose: 'dining', xBias: 0.22, zBias: -0.15, widthRatio: 0.34, depthRatio: 0.3 },
      ],
      fixtures: [],
    },
    surfaces: [],
    atmosphere: {},
    ambientSounds: [],
    props: [
      { name: 'Hero Pizza', category: 'hero', priority: 'high' },
      { name: 'Hero Pizza', category: 'hero', priority: 'high' },
      { name: 'Menu Board', category: 'supporting', priority: 'medium' },
    ],
    characters: [
      {
        name: 'Baker',
        role: 'baker',
        priority: 'high',
        behaviorPlan: {
          type: 'work_loop',
          routeZoneIds: ['missing-zone'],
          pace: 'subtle',
        },
      },
    ],
    branding: {
      enabled: true,
      brandName: 'Luigi Pizza',
      palette: ['#c0392b', '#f4e7d3'],
      applicationTargets: ['signage'],
    },
    lighting: [
      {
        role: 'rim',
        position: [2, 3, -1],
        intensity: 0.8,
        purpose: 'Backdrop separation',
      },
    ],
    camera: {
      shotType: 'medium shot',
      mood: 'warm',
    },
    layoutGuidance: {
      provider: 'gemini_layout',
      visiblePlanes: ['floor', 'backWall'],
      depthProfile: {
        quality: 'medium',
        cameraElevation: 'eye',
      },
      objectAnchors: [
        {
          id: 'counter-1',
          kind: 'counter',
          label: 'Pizza Counter',
          placementMode: 'ground',
          preferredZonePurpose: 'counter',
        },
        {
          id: 'oven-1',
          kind: 'oven',
          label: 'Stone Oven',
          placementMode: 'ground',
          preferredZonePurpose: 'prep',
        },
      ],
      detectedOpenings: [],
      suggestedZones: {
        hero: { xBias: 0.08, depthZone: 'midground' },
        supporting: { side: 'left', depthZone: 'midground' },
        background: { wallTarget: 'backWall', depthZone: 'background' },
      },
    },
    assemblySteps: [],
    compatibility: {
      currentStudioShellSupported: true,
      confidence: 0.82,
      gaps: [],
      nextBuildModules: [],
    },
  } as any;
}

function buildFamilyPlan(overrides: Record<string, unknown> = {}) {
  return {
    ...buildPlan(),
    ...overrides,
  } as any;
}

function buildEvaluation() {
  return {
    provider: 'gemini_validation',
    verdict: 'needs_refinement',
    overallScore: 0.61,
    categories: {
      promptFidelity: { score: 0.84, notes: [] },
      compositionMatch: { score: 0.59, notes: [] },
      lightingIntentMatch: { score: 0.58, notes: [] },
      technicalIntegrity: { score: 0.63, notes: [] },
      roomRealism: { score: 0.57, notes: [] },
      brandConsistency: { score: 0.6, notes: [] },
      imageLayoutMatch: { score: 0.64, notes: [] },
    },
    suggestedAdjustments: [
      'Presiser lighting intent, modifier, beam angle og haze for flere lys.',
      'Legg til flere arkitektoniske signaler som pass-through, backroom eller nisjer.',
      'Juster kamera-shot, target og hero-zoner for tydeligere komposisjon.',
      'Bruk brandprofilen bredere på signage, wardrobe, packaging og interior details.',
      'Bruk sterkere image-layout-signaler fra openings og object anchors i props og blocking.',
    ],
    validatedAt: new Date().toISOString(),
  } as any;
}

describe('environmentAutoRefineService', () => {
  it('refines lighting, camera, branding, room shell and blocking from low-scoring evaluation', () => {
    const result = environmentAutoRefineService.refinePlan(buildPlan(), buildEvaluation());

    expect(result.changed).toBe(true);
    expect(result.reasons).toEqual(expect.arrayContaining(['lighting', 'camera', 'roomShell', 'branding', 'blocking']));
    expect(result.plan.camera.shotType).toBe('hero shot');
    expect(result.plan.camera.fov).toBe(38);
    expect(result.plan.lighting[0].modifier).toBeTruthy();
    expect(result.plan.lighting[0].intent).toBe('food');
    expect(result.plan.branding?.applyToWardrobe).toBe(true);
    expect(result.plan.branding?.applyToEnvironment).toBe(true);
    expect(result.plan.roomShell.openings?.some((opening: any) => opening.kind === 'service_window')).toBe(true);
    expect(result.plan.roomShell.zones?.some((zone: any) => zone.purpose === 'backroom')).toBe(true);
    expect(result.plan.roomShell.wallSegments?.length).toBeGreaterThan(0);
    expect(result.plan.characters[0].behaviorPlan?.homeZoneId).toBe('prep-zone');
    expect(result.plan.characters[0].behaviorPlan?.routeZoneIds).toEqual(['prep-zone', 'counter-zone']);
    expect(result.plan.characters[0].behaviorPlan?.pace).toBe('subtle');
    expect(result.plan.characters[0].behaviorPlan?.lookAtTarget).toBe('oven');
    expect(result.plan.props).toHaveLength(2);
    expect(result.plan.props[0].placementHint).toContain('Pizza Counter');
  });

  it('adds stronger room realism and layout guidance on later iterations', () => {
    const plan = buildPlan();
    plan.props = [
      { name: 'Menu Board', category: 'set_dressing', priority: 'medium' },
      { name: 'Table Accent', category: 'supporting', priority: 'medium' },
    ] as any;
    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation(), {
      iteration: 2,
      previousReasons: ['roomShell', 'blocking'],
    });

    expect(result.plan.roomShell.ceilingStyle).toBe('coffered');
    expect(result.plan.props[0].placementHint).toContain('backWall');
    expect(result.plan.props[1].placementHint).toBeTruthy();
  });

  it('skips auto-refine for strong approved evaluations', () => {
    expect(environmentAutoRefineService.shouldAutoRefine({
      verdict: 'approved',
      overallScore: 0.91,
    } as any)).toBe(false);
  });

  it('auto-refines approved scenes when family-critical categories are still weak', () => {
    const plan = buildFamilyPlan({
      prompt: 'Luxury retail boutique showroom with premium display walls and polished product islands',
      summary: 'Luxury retail',
      concept: 'Showroom',
    });

    expect(environmentAutoRefineService.shouldAutoRefinePlan(plan, {
      verdict: 'approved',
      overallScore: 0.84,
      categories: {
        promptFidelity: { score: 0.9, notes: [] },
        compositionMatch: { score: 0.8, notes: [] },
        lightingIntentMatch: { score: 0.82, notes: [] },
        technicalIntegrity: { score: 0.81, notes: [] },
        roomRealism: { score: 0.8, notes: [] },
        brandConsistency: { score: 0.63, notes: [] },
      },
      suggestedAdjustments: [],
      validatedAt: new Date().toISOString(),
    } as any)).toBe(true);
  });

  it('applies scene-specific beauty refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Luxury beauty editorial close-up with cosmetic product and glossy backdrop',
      summary: 'Beauty set',
      concept: 'Beauty',
      lighting: [
        { role: 'key', position: [0, 2, -1], intensity: 1, purpose: 'Beauty key' },
        { role: 'accent', position: [1, 2, -1], intensity: 0.6, purpose: 'Glossy accent' },
      ],
      camera: { shotType: 'medium shot', mood: 'editorial' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.camera.shotType).toBe('close-up beauty');
    expect(result.plan.camera.fov).toBe(34);
    expect(result.plan.atmosphere.fogEnabled).toBe(false);
    expect(result.plan.lighting[0].gobo).toBeUndefined();
    expect(result.plan.lighting[1].gobo?.goboId).toBe('breakup');
  });

  it('applies scene-specific photo studio refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Clean photo studio with seamless paper backdrop and controlled portrait lighting',
      summary: 'Photo studio',
      concept: 'Studio portrait',
      roomShell: {
        ...buildPlan().roomShell,
        type: 'interior_room',
        openCeiling: false,
      },
      lighting: [
        { role: 'key', position: [0, 2, -1], intensity: 1, purpose: 'Portrait key', gobo: { goboId: 'lines', intensity: 0.4 } },
        { role: 'rim', position: [1, 2, -1], intensity: 0.5, purpose: 'Clean edge' },
      ],
      camera: { shotType: 'wide shot', mood: 'studio' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.roomShell.type).toBe('studio_shell');
    expect(result.plan.roomShell.openCeiling).toBe(true);
    expect(result.plan.camera.shotType).toBe('medium shot');
    expect(result.plan.atmosphere.fogEnabled).toBe(false);
    expect(result.plan.lighting[0].gobo).toBeUndefined();
    expect(result.plan.lighting[1].gobo).toBeUndefined();
  });

  it('applies scene-specific film studio refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Film studio soundstage with stage build and cinematic practicals',
      summary: 'Film studio',
      concept: 'Soundstage',
      roomShell: {
        ...buildPlan().roomShell,
        type: 'interior_room',
        openCeiling: false,
      },
      lighting: [
        { role: 'key', position: [0, 2, -1], intensity: 1, purpose: 'Stage key' },
        { role: 'background', position: [2, 3, -1], intensity: 0.7, purpose: 'Set separation' },
      ],
      camera: { shotType: 'medium shot', mood: 'cinematic' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.roomShell.type).toBe('studio_shell');
    expect(result.plan.roomShell.openCeiling).toBe(true);
    expect(result.plan.camera.shotType).toBe('medium wide');
    expect(result.plan.atmosphere.fogEnabled).toBe(true);
    expect(result.plan.lighting[0].modifier).toBe('fresnel');
  });

  it('applies scene-specific warehouse refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Industrial warehouse scene with metal racks and shafts through haze',
      summary: 'Warehouse',
      concept: 'Industrial',
      roomShell: {
        ...buildPlan().roomShell,
        type: 'warehouse',
        openCeiling: false,
      },
      lighting: [
        { role: 'accent', position: [0, 3, -1], intensity: 0.8, purpose: 'Dusty background texture' },
      ],
      camera: { shotType: 'medium shot', mood: 'industrial' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.roomShell.openCeiling).toBe(true);
    expect(result.plan.roomShell.ceilingStyle).toBe('open_truss');
    expect(result.plan.atmosphere.fogEnabled).toBe(true);
    expect(result.plan.camera.shotType).toBe('medium wide');
    expect(result.plan.lighting[0].gobo?.goboId).toBe('breakup');
  });

  it('applies scene-specific office refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Corporate office interview setup in a clean meeting room',
      summary: 'Office interview',
      concept: 'Office',
      lighting: [
        {
          role: 'key',
          position: [0, 2, -1],
          intensity: 1,
          purpose: 'Interview key',
          gobo: { goboId: 'lines', intensity: 0.5 },
          haze: { enabled: true, density: 0.02 },
        },
        {
          role: 'background',
          position: [1, 2, -1],
          intensity: 0.5,
          purpose: 'Back wall separation',
          gobo: { goboId: 'breakup', intensity: 0.4 },
        },
      ],
      camera: { shotType: 'wide shot', mood: 'corporate' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.camera.shotType).toBe('medium shot');
    expect(result.plan.atmosphere.fogEnabled).toBe(false);
    expect(result.plan.lighting[0].modifier).toBe('softbox');
    expect(result.plan.lighting[0].gobo).toBeUndefined();
    expect(result.plan.lighting[0].haze).toBeUndefined();
    expect(result.plan.lighting[1].gobo).toBeUndefined();
  });

  it('applies scene-specific noir refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Noir detective office with venetian blind shadows and cigarette haze',
      summary: 'Noir',
      concept: 'Detective noir',
      lighting: [
        { role: 'key', position: [0, 2, -1], intensity: 1, purpose: 'Hard noir key' },
      ],
      camera: { shotType: 'medium shot', mood: 'detective' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.camera.shotType).toBe('medium close-up');
    expect(result.plan.atmosphere.fogEnabled).toBe(true);
    expect(result.plan.lighting[0].modifier).toBe('fresnel');
    expect(result.plan.lighting[0].gobo?.goboId).toBe('blinds');
  });

  it('applies scene-specific luxury retail refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Luxury retail boutique showroom with premium display walls and polished product islands',
      summary: 'Luxury retail',
      concept: 'Showroom',
      roomShell: {
        ...buildPlan().roomShell,
        type: 'interior_room',
        ceilingStyle: undefined,
      },
      lighting: [
        { role: 'key', position: [0, 2, -1], intensity: 1, purpose: 'Product key' },
        { role: 'accent', position: [1, 2, -1], intensity: 0.6, purpose: 'Wall grazing accent' },
      ],
      camera: { shotType: 'medium shot', mood: 'showroom' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.camera.shotType).toBe('hero shot');
    expect(result.plan.roomShell.ceilingStyle).toBe('coffered');
    expect(result.plan.atmosphere.fogEnabled).toBe(false);
    expect(result.plan.lighting[0].gobo).toBeUndefined();
    expect(result.plan.lighting[1].gobo?.goboId).toBe('lines');
  });

  it('upgrades a flat luxury retail ceiling to coffered during refine', () => {
    const plan = buildFamilyPlan({
      prompt: 'Luxury retail boutique showroom with premium display walls and polished product islands',
      summary: 'Luxury retail',
      concept: 'Showroom',
      roomShell: {
        ...buildPlan().roomShell,
        type: 'interior_room',
        ceilingStyle: 'flat',
      },
      lighting: [
        { role: 'key', position: [0, 2, -1], intensity: 1, purpose: 'Product key' },
      ],
      camera: { shotType: 'medium shot', mood: 'showroom' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.roomShell.ceilingStyle).toBe('coffered');
  });

  it('applies scene-specific nightclub refinement', () => {
    const plan = buildFamilyPlan({
      prompt: 'Nightclub promo with DJ booth, haze and LED dancefloor',
      summary: 'Nightclub',
      concept: 'Club',
      lighting: [
        { role: 'accent', position: [0, 2, -1], intensity: 0.8, purpose: 'Dancefloor texture' },
        { role: 'rim', position: [1, 2, -1], intensity: 0.5, purpose: 'Performer edge', gobo: { goboId: 'dots', intensity: 0.3 } },
      ],
      camera: { shotType: 'medium shot', mood: 'club promo' },
    });

    const result = environmentAutoRefineService.refinePlan(plan, buildEvaluation());

    expect(result.plan.camera.shotType).toBe('medium wide');
    expect(result.plan.atmosphere.fogEnabled).toBe(true);
    expect(result.plan.lighting[0].modifier).toBe('gobo_projector');
    expect(result.plan.lighting[0].gobo?.goboId).toBe('dots');
    expect(result.plan.lighting[1].gobo?.goboId).toBe('lines');
  });
});
