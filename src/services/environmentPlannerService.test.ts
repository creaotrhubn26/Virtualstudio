import { beforeEach, describe, expect, it, vi } from 'vitest';

const environmentServiceMock = {
  applyPreset: vi.fn(),
  applyRoomShell: vi.fn(),
  setFloorMaterial: vi.fn(),
  toggleFloor: vi.fn(),
  setWallMaterial: vi.fn(),
  toggleWall: vi.fn(),
  applyAtmosphere: vi.fn(),
  setAmbientSounds: vi.fn(),
};

const assetBrainServiceMock = {
  inferPlanContext: vi.fn(() => ({ roomTypes: ['storefront'], styles: ['warm'] })),
  recordUsage: vi.fn(),
};

const assembleEnvironmentScenegraphMock = vi.fn();
const buildShellMock = vi.fn();
const layoutGuidanceToHintsMock = vi.fn(() => null);
const backendAssembleMock = vi.fn();
const backendValidateEnvironmentMock = vi.fn();
const capturePreviewMock = vi.fn(async () => 'data:image/jpeg;base64,preview');
const getStoredBrandProfileMock = vi.fn(async () => null);
const buildBrandReferenceFromProfileMock = vi.fn(() => undefined);

vi.mock('../core/services/environmentService', () => ({
  environmentService: environmentServiceMock,
}));

vi.mock('../data/environmentPresets', () => ({
  getEnvironmentById: vi.fn(() => null),
}));

vi.mock('../data/floorDefinitions', () => ({
  getFloorById: vi.fn(() => ({ id: 'checkerboard' })),
}));

vi.mock('../data/wallDefinitions', () => ({
  getWallById: vi.fn(() => ({ id: 'brick-white' })),
}));

vi.mock('../core/services/assetBrain', () => ({
  assetBrainService: assetBrainServiceMock,
}));

vi.mock('./environmentScenegraphAssembly', () => ({
  assembleEnvironmentScenegraph: assembleEnvironmentScenegraphMock,
}));

vi.mock('./environmentShellBuilderService', () => ({
  environmentShellBuilderService: {
    buildShell: buildShellMock,
    layoutGuidanceToHints: layoutGuidanceToHintsMock,
  },
}));

vi.mock('./environmentAssemblyService', () => ({
  environmentAssemblyService: {
    assemble: backendAssembleMock,
  },
}));

vi.mock('./environmentValidationService', () => ({
  environmentValidationService: {
    validate: backendValidateEnvironmentMock,
  },
}));

vi.mock('./environmentPreviewCaptureService', () => ({
  environmentPreviewCaptureService: {
    capturePreview: capturePreviewMock,
  },
}));

vi.mock('./brandProfileService', () => ({
  getStoredBrandProfile: getStoredBrandProfileMock,
  buildBrandReferenceFromProfile: buildBrandReferenceFromProfileMock,
}));

function buildPlan() {
  return {
    planId: 'plan-1',
    prompt: 'pizza restaurant',
    summary: 'Warm pizza scene',
    concept: 'Pizza',
    source: 'ai',
    recommendedPresetId: null,
    roomShell: {
      type: 'storefront',
      width: 14,
      depth: 10,
      height: 4.6,
      openCeiling: false,
      notes: [],
      openings: [],
      zones: [],
    },
    surfaces: [],
    atmosphere: {},
    ambientSounds: [],
    props: [
      {
        name: 'Hero Pizza',
        category: 'hero',
        priority: 'high',
        placementHint: 'Centered on the counter',
      },
    ],
    characters: [],
    branding: null,
    camera: {},
    lighting: [],
    compatibility: {
      gaps: [],
    },
    layoutGuidance: null,
  } as any;
}

function buildLocalAssemblyResult() {
  return {
    assembly: {
      planId: 'plan-1',
      nodes: [
        { id: 'shell:plan-1', type: 'room_shell', label: 'Shell', role: 'shell' },
        { id: 'camera:primary', type: 'camera', label: 'Camera', role: 'shell' },
        { id: 'prop:0:pizza_hero_display', type: 'prop', label: 'Hero Pizza', role: 'hero', assetId: 'pizza_hero_display' },
      ],
      relationships: [
        { id: 'hero_focus:shell:plan-1:prop:0:pizza_hero_display', type: 'hero_focus', sourceNodeId: 'shell:plan-1', targetNodeId: 'prop:0:pizza_hero_display' },
      ],
      autoAddedAssetIds: [],
    },
    runtimeProps: [
      {
        assetId: 'pizza_hero_display',
        name: 'Hero Pizza',
        priority: 'high',
        placementHint: 'Centered on the counter',
        metadata: {
          placementMode: 'surface',
          surfaceHint: 'counter',
          preferredAnchorAssetId: 'counter_pizza_prep',
        },
      },
    ],
  };
}

describe('environmentPlannerService assembly validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturePreviewMock.mockResolvedValue('data:image/jpeg;base64,preview');
    buildShellMock.mockResolvedValue({
      shell: buildPlan().roomShell,
      runtimeSupported: true,
      typeAccessoryHints: ['storefront_awning'],
    });
    assembleEnvironmentScenegraphMock.mockReturnValue(buildLocalAssemblyResult());
    (window as any).virtualStudio = {
      applyEnvironmentBranding: vi.fn(() => ({
        applied: ['Luigi Pizza'],
        skipped: [],
      })),
      addEnvironmentProps: vi.fn().mockResolvedValue({
        applied: ['Hero Pizza'],
        skipped: [],
        appliedAssetIds: ['pizza_hero_display'],
      }),
    };
    delete (window as any).__virtualStudioLastEnvironmentAssemblyValidation;
    delete (window as any).__virtualStudioLastEnvironmentEvaluation;
    backendValidateEnvironmentMock.mockResolvedValue({
      success: true,
      provider: 'heuristic_environment_validation',
      evaluation: {
        provider: 'heuristic_environment_validation',
        verdict: 'approved',
        overallScore: 0.84,
        categories: {
          promptFidelity: { score: 0.9, notes: ['Prompt fidelity is strong.'] },
          compositionMatch: { score: 0.8, notes: ['Composition is clear.'] },
          lightingIntentMatch: { score: 0.86, notes: ['Lighting intent is coherent.'] },
          technicalIntegrity: { score: 0.82, notes: ['Assembly is clean.'] },
          roomRealism: { score: 0.81, notes: ['Room feels grounded.'] },
        },
        suggestedAdjustments: ['Scenen scorer godt. Neste steg er preview-render og VLM-sjekk for finjustering.'],
        validatedAt: new Date().toISOString(),
      },
    });
  });

  it('records backend validation when server-side assembly succeeds', async () => {
    const validationListener = vi.fn();
    window.addEventListener('vs-environment-assembly-validation-updated', validationListener as EventListener);
    backendAssembleMock.mockResolvedValue({
      success: true,
      provider: 'local_scenegraph',
      shell: buildPlan().roomShell,
      assembly: buildLocalAssemblyResult().assembly,
      runtimeProps: buildLocalAssemblyResult().runtimeProps,
    });

    const { environmentPlannerService } = await import('./environmentPlannerService');
    const result = await environmentPlannerService.applyPlanToCurrentStudio(buildPlan());

    expect(backendAssembleMock).toHaveBeenCalledTimes(1);
    expect(capturePreviewMock).toHaveBeenCalledTimes(1);
    expect(backendValidateEnvironmentMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      previewImage: 'data:image/jpeg;base64,preview',
      provider: 'auto',
      validationOptions: expect.objectContaining({
        referenceMode: 'runtime_preview',
        planId: 'plan-1',
      }),
    }));
    expect(result.applied).toContain('Scenegraph validert i backend');
    expect(result.applied).toContain('Miljøscore: 84%');
    expect(result.assemblyValidation?.backendValidated).toBe(true);
    expect(result.evaluation?.overallScore).toBe(0.84);
    expect(result.insights?.familyId).toBe('food');
    expect(result.insights?.summary).toContain('food/restaurant');
    expect(result.assemblyValidation?.differences).toEqual([]);
    expect((window as any).__virtualStudioLastEnvironmentAssemblyValidation?.backendValidated).toBe(true);
    expect((window as any).__virtualStudioLastEnvironmentEvaluation?.overallScore).toBe(0.84);
    expect((window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId).toBe('food');
    expect(validationListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('vs-environment-assembly-validation-updated', validationListener as EventListener);
  });

  it('falls back cleanly when backend validation is unavailable', async () => {
    backendAssembleMock.mockRejectedValue(new Error('backend down'));
    backendValidateEnvironmentMock.mockRejectedValue(new Error('validation down'));

    const { environmentPlannerService } = await import('./environmentPlannerService');
    const result = await environmentPlannerService.applyPlanToCurrentStudio(buildPlan());

    expect(result.applied).not.toContain('Scenegraph validert i backend');
    expect(result.assemblyValidation?.backendValidated).toBe(false);
    expect(result.evaluation ?? null).toBeNull();
    expect(result.skipped).not.toEqual(expect.arrayContaining([
      expect.stringContaining('Assembly-avvik'),
    ]));
  });

  it('fills missing plan branding from the stored brand profile during apply', async () => {
    getStoredBrandProfileMock.mockResolvedValue({
      version: '1.0',
      brandName: 'Luigi Pizza',
      brandNotes: 'Keep it warm and rustic.',
      logoName: 'luigi-logo.png',
      logoImage: 'data:image/png;base64,logo',
      paletteOptions: [],
      selectedPaletteId: 'logo-original',
      selectedPaletteColors: ['#c0392b', '#f4e7d3'],
      applicationTargets: ['signage', 'wardrobe', 'packaging', 'interior_details'],
      selectedDirectionId: 'trattoria-warm',
      uniformPolicy: 'match_palette',
      signageStyle: 'menu_board',
      packagingStyle: 'box_stamp',
      interiorStyle: 'accent_trim',
      lastUsedAt: new Date().toISOString(),
    });
    buildBrandReferenceFromProfileMock.mockReturnValue({
      brandName: 'Luigi Pizza',
      profileName: 'Varm trattoria',
      usageNotes: 'Apply this brand consistently to signage, wardrobe, packaging and interior details.',
      logoImage: 'data:image/png;base64,logo',
      palette: ['#c0392b', '#f4e7d3'],
      applicationTargets: ['signage', 'wardrobe', 'packaging', 'interior_details'],
      uniformPolicy: 'match_palette',
      signageStyle: 'menu_board',
      packagingStyle: 'box_stamp',
      interiorStyle: 'accent_trim',
    });

    const plan = buildPlan();
    plan.branding = null;

    const { environmentPlannerService } = await import('./environmentPlannerService');
    const result = await environmentPlannerService.applyPlanToCurrentStudio(plan);

    const brandingCall = (window as any).virtualStudio.applyEnvironmentBranding.mock.calls[0]?.[0];
    expect(result.applied).toContain('Brandprofil: Varm trattoria');
    expect(brandingCall?.branding?.enabled).toBe(true);
    expect(brandingCall?.branding?.brandName).toBe('Luigi Pizza');
    expect(brandingCall?.branding?.profileName).toBe('Varm trattoria');
    expect(brandingCall?.branding?.palette).toEqual(['#c0392b', '#f4e7d3']);
    expect(brandingCall?.branding?.applicationTargets).toEqual(['signage', 'wardrobe', 'packaging', 'interior_details']);
  });

  it('runs multiple auto-refine iterations until the preview score is strong enough', async () => {
    buildShellMock.mockImplementation(async ({ shell }: any) => ({
      shell,
      runtimeSupported: true,
      typeAccessoryHints: ['storefront_awning'],
    }));
    const plan = buildPlan();
    plan.branding = {
      enabled: true,
      brandName: 'Luigi Pizza',
      palette: ['#c0392b', '#f4e7d3'],
      applicationTargets: ['signage'],
    };
    plan.camera = {
      shotType: 'medium shot',
      mood: 'warm',
    };
    plan.lighting = [
      {
        role: 'rim',
        position: [2, 3, -1],
        intensity: 0.8,
        purpose: 'Backdrop separation',
      },
    ];
    plan.layoutGuidance = {
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
        },
      ],
      detectedOpenings: [],
      suggestedZones: {
        hero: { xBias: 0.1, depthZone: 'midground' },
        supporting: { side: 'left', depthZone: 'midground' },
        background: { wallTarget: 'backWall', depthZone: 'background' },
      },
    };

    backendValidateEnvironmentMock
      .mockResolvedValueOnce({
        success: true,
        provider: 'gemini_validation',
        evaluation: {
          provider: 'gemini_validation',
          verdict: 'needs_refinement',
          overallScore: 0.61,
          categories: {
            promptFidelity: { score: 0.86, notes: [] },
            compositionMatch: { score: 0.58, notes: [] },
            lightingIntentMatch: { score: 0.57, notes: [] },
            technicalIntegrity: { score: 0.71, notes: [] },
            roomRealism: { score: 0.59, notes: [] },
            brandConsistency: { score: 0.61, notes: [] },
          },
          suggestedAdjustments: [
            'Presiser lighting intent, modifier, beam angle og haze for flere lys.',
            'Legg til flere arkitektoniske signaler som pass-through, backroom eller nisjer.',
            'Juster kamera-shot, target og hero-zoner for tydeligere komposisjon.',
            'Bruk brandprofilen bredere på signage, wardrobe, packaging og interior details.',
          ],
          validatedAt: new Date().toISOString(),
        },
      })
      .mockResolvedValueOnce({
        success: true,
        provider: 'gemini_validation',
        evaluation: {
          provider: 'gemini_validation',
          verdict: 'needs_refinement',
          overallScore: 0.74,
          categories: {
            promptFidelity: { score: 0.89, notes: [] },
            compositionMatch: { score: 0.77, notes: [] },
            lightingIntentMatch: { score: 0.79, notes: [] },
            technicalIntegrity: { score: 0.8, notes: [] },
            roomRealism: { score: 0.71, notes: [] },
            brandConsistency: { score: 0.78, notes: [] },
          },
          suggestedAdjustments: [
            'Legg til flere arkitektoniske signaler som pass-through, backroom eller nisjer.',
            'Bruk sterkere image-layout-signaler fra openings og object anchors i props og blocking.',
          ],
          validatedAt: new Date().toISOString(),
        },
      })
      .mockResolvedValueOnce({
        success: true,
        provider: 'gemini_validation',
        evaluation: {
          provider: 'gemini_validation',
          verdict: 'approved',
          overallScore: 0.88,
          categories: {
            promptFidelity: { score: 0.9, notes: [] },
            compositionMatch: { score: 0.84, notes: [] },
            lightingIntentMatch: { score: 0.88, notes: [] },
            technicalIntegrity: { score: 0.85, notes: [] },
            roomRealism: { score: 0.84, notes: [] },
            brandConsistency: { score: 0.86, notes: [] },
          },
          suggestedAdjustments: ['Scenen scorer godt.'],
          validatedAt: new Date().toISOString(),
        },
      });

    const { environmentPlannerService } = await import('./environmentPlannerService');
    const result = await environmentPlannerService.applyPlanToCurrentStudio(plan);

    expect(capturePreviewMock).toHaveBeenCalledTimes(3);
    expect(backendValidateEnvironmentMock).toHaveBeenCalledTimes(3);
    const firstRefinedPlan = backendValidateEnvironmentMock.mock.calls[1]?.[0];
    const secondRefinedPlan = backendValidateEnvironmentMock.mock.calls[2]?.[0];
    expect(firstRefinedPlan?.camera?.shotType).toBe('hero shot');
    expect(firstRefinedPlan?.lighting?.[0]?.modifier).toBeTruthy();
    expect(firstRefinedPlan?.branding?.applyToWardrobe).toBe(true);
    expect(firstRefinedPlan?.roomShell?.openings?.some((opening: any) => opening.kind === 'service_window')).toBe(true);
    expect(secondRefinedPlan?.roomShell?.ceilingStyle).toBe('coffered');
    expect(result.refinement?.attempted).toBe(true);
    expect(result.refinement?.accepted).toBe(true);
    expect(result.refinement?.iterationCount).toBe(2);
    expect(result.refinement?.attemptedIterations).toBe(2);
    expect(result.refinement?.initialScore).toBe(0.61);
    expect(result.refinement?.finalScore).toBe(0.88);
    expect(result.applied).toEqual(expect.arrayContaining([
      'Score forbedret: 61% -> 88%',
      expect.stringContaining('Auto-justering:'),
    ]));
    expect(result.evaluation?.overallScore).toBe(0.88);
  });
});
