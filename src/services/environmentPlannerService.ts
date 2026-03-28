import type {
  EnvironmentPlan,
  EnvironmentPlanBrandReference,
  EnvironmentPlanEvaluationSummary,
  EnvironmentPlanRequest,
  EnvironmentPlanResponse,
  EnvironmentPlannerStatus,
  EnvironmentPlanSurface,
} from '../core/models/environmentPlan';
import { apiRequest } from '../lib/api';
import { environmentService } from '../core/services/environmentService';
import { getEnvironmentById } from '../data/environmentPresets';
import { getFloorById } from '../data/floorDefinitions';
import { getWallById } from '../data/wallDefinitions';
import type { EnvironmentScenegraphAssembly } from '../core/models/environmentScenegraph';
import { assetBrainService } from '../core/services/assetBrain';
import { buildEnvironmentRuntimeProps } from './environmentPropMapper';
import { assembleEnvironmentScenegraph } from './environmentScenegraphAssembly';
import { environmentShellBuilderService } from './environmentShellBuilderService';
import { environmentAssemblyService } from './environmentAssemblyService';
import { environmentValidationService } from './environmentValidationService';
import { environmentPreviewCaptureService } from './environmentPreviewCaptureService';
import {
  buildEnvironmentAssemblyValidationSummary,
  type EnvironmentAssemblyValidationSummary,
} from './environmentAssemblyValidation';
import {
  buildBrandReferenceFromProfile,
  getStoredBrandProfile,
} from './brandProfileService';
import { environmentAutoRefineService } from './environmentAutoRefineService';
import {
  getEnvironmentPlanInsightPresentation,
  type EnvironmentPlanInsightPresentation,
} from './environmentPlanInsightPresentation';

export interface EnvironmentPlanRefinementSummary {
  attempted: boolean;
  accepted: boolean;
  reverted: boolean;
  iterationCount: number;
  attemptedIterations?: number;
  reasons: string[];
  changes: string[];
  initialScore: number | null;
  finalScore: number | null;
}

export interface EnvironmentPlanApplyResult {
  applied: string[];
  skipped: string[];
  assembly?: EnvironmentScenegraphAssembly;
  assemblyValidation?: EnvironmentAssemblyValidationSummary;
  evaluation?: EnvironmentPlanEvaluationSummary;
  refinement?: EnvironmentPlanRefinementSummary;
  insights?: EnvironmentPlanInsightPresentation;
}

const WALL_TARGETS = new Set(['backWall', 'leftWall', 'rightWall', 'rearWall']);
const MAX_AUTO_REFINE_ITERATIONS = 3;
const AUTO_REFINE_WORSE_TOLERANCE = 0.015;
const GENERIC_NEUTRAL_SURFACES: Record<string, { materialId: string; visible: boolean }> = {
  backWall: { materialId: 'gray-medium', visible: true },
  leftWall: { materialId: 'gray-dark', visible: false },
  rightWall: { materialId: 'gray-dark', visible: false },
  rearWall: { materialId: 'gray-dark', visible: false },
  floor: { materialId: 'gray-dark', visible: true },
};

type PlannerStatusMock = EnvironmentPlannerStatus;
type PlannerResponseMock =
  | EnvironmentPlanResponse
  | ((request: EnvironmentPlanRequest) => EnvironmentPlanResponse | Promise<EnvironmentPlanResponse>);

type EnvironmentPlannerWindow = Window & {
  __virtualStudioEnvironmentPlannerStatusMock?: PlannerStatusMock;
  __virtualStudioEnvironmentPlannerMock?: PlannerResponseMock;
  __virtualStudioEnvironmentPlannerRequests?: EnvironmentPlanRequest[];
  __virtualStudioLastAppliedEnvironmentPlan?: EnvironmentPlan;
  __virtualStudioLastEnvironmentAssembly?: EnvironmentScenegraphAssembly;
  __virtualStudioLastEnvironmentAssemblyValidation?: EnvironmentAssemblyValidationSummary;
  __virtualStudioLastEnvironmentEvaluation?: EnvironmentPlanEvaluationSummary;
  __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
  __virtualStudioLastEnvironmentLearningContext?: {
    planId: string;
    prompt: string;
    roomTypes: string[];
    styles: string[];
    source: string;
  };
};

class EnvironmentPlannerService {
  async getStatus(): Promise<EnvironmentPlannerStatus> {
    const statusMock = this.getStatusMock();
    if (statusMock) {
      return this.cloneMock(statusMock);
    }

    return apiRequest<EnvironmentPlannerStatus>('/api/environment/planner/status');
  }

  async generatePlan(request: EnvironmentPlanRequest): Promise<EnvironmentPlanResponse> {
    const responseMock = this.getResponseMock();
    if (responseMock) {
      this.trackMockRequest(request);
      if (typeof responseMock === 'function') {
        return responseMock(request);
      }
      return this.cloneMock(responseMock);
    }

    return apiRequest<EnvironmentPlanResponse>('/api/environment/plan', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Kunne ikke lese bildefilen'));
      };
      reader.onerror = () => reject(new Error('Kunne ikke lese bildefilen'));
      reader.readAsDataURL(file);
    });
  }

  async filesToDataUrls(files: File[]): Promise<string[]> {
    return Promise.all(files.map(file => this.fileToDataUrl(file)));
  }

  async applyPlanToCurrentStudio(plan: EnvironmentPlan): Promise<EnvironmentPlanApplyResult> {
    const initialPass = await this.applyPlanPass(plan, {
      iterationLabel: 'initial_apply',
    });
    const initialEvaluation = initialPass.evaluation ?? null;

    if (!initialEvaluation || !environmentAutoRefineService.shouldAutoRefinePlan(initialPass.effectivePlan, initialEvaluation)) {
      return this.toPublicApplyResult(initialPass);
    }

    let currentPass = initialPass;
    let bestPass = initialPass;
    let currentEvaluation = initialEvaluation;
    let bestScore = initialEvaluation.overallScore ?? 0;
    let attemptedIterations = 0;
    let acceptedIterations = 0;
    let reverted = false;
    const refinementReasons = new Set<string>();
    const refinementChanges: string[] = [];

    while (
      currentEvaluation
      && environmentAutoRefineService.shouldAutoRefinePlan(currentPass.effectivePlan, currentEvaluation)
      && attemptedIterations < MAX_AUTO_REFINE_ITERATIONS
    ) {
      const nextIteration = attemptedIterations + 1;
      const refinement = environmentAutoRefineService.refinePlan(
        currentPass.effectivePlan,
        currentEvaluation,
        {
          iteration: nextIteration,
          previousReasons: Array.from(refinementReasons),
        },
      );

      attemptedIterations += 1;
      refinement.reasons.forEach((reason) => refinementReasons.add(reason));
      refinementChanges.push(...refinement.changes);

      if (!refinement.changed || refinement.changes.length === 0) {
        if (refinementChanges.length === 0) {
          refinementChanges.push('Auto-justering fant ingen nye trygge endringer å bruke.');
        }
        break;
      }

      const refinedPass = await this.applyPlanPass(refinement.plan, {
        iterationLabel: `auto_refine_${nextIteration}`,
        refinementContext: {
          iteration: nextIteration,
          reasons: refinement.reasons,
          changes: refinement.changes,
          accumulatedReasons: Array.from(refinementReasons),
        },
      });
      const refinedScore = refinedPass.evaluation?.overallScore ?? null;
      const currentScore = currentEvaluation.overallScore ?? null;
      const refinedWorseThanCurrent = (
        typeof refinedScore === 'number'
        && typeof currentScore === 'number'
        && refinedScore < (currentScore - AUTO_REFINE_WORSE_TOLERANCE)
      );

      if (refinedWorseThanCurrent) {
        reverted = true;
        refinementChanges.push('Auto-justeringen ble forkastet fordi preview-scoren gikk ned.');
        if (bestPass !== currentPass) {
          currentPass = await this.applyPlanPass(bestPass.effectivePlan, {
            iterationLabel: 'auto_refine_revert_best',
            refinementContext: {
              iteration: nextIteration,
              reverted: true,
              revertedToBest: true,
            },
          });
        }
        break;
      }

      currentPass = refinedPass;
      currentEvaluation = refinedPass.evaluation ?? currentEvaluation;
      acceptedIterations += 1;

      if (typeof refinedScore === 'number' && refinedScore >= bestScore) {
        bestPass = refinedPass;
        bestScore = refinedScore;
      }
    }

    const finalPass = bestPass;
    if (currentPass !== bestPass) {
      await this.applyPlanPass(bestPass.effectivePlan, {
        iterationLabel: 'auto_refine_restore_best',
        refinementContext: {
          reverted: true,
          restoredBest: true,
        },
      });
    }

    return this.toPublicApplyResult(finalPass, {
      attempted: attemptedIterations > 0,
      accepted: acceptedIterations > 0,
      reverted,
      iterationCount: acceptedIterations,
      attemptedIterations,
      reasons: Array.from(refinementReasons),
      changes: refinementChanges.length > 0
        ? refinementChanges
        : attemptedIterations > 0
          ? ['Auto-justering vurderte scenen, men gjorde ingen nye trygge endringer.']
          : [],
      initialScore: initialEvaluation.overallScore,
      finalScore: finalPass.evaluation?.overallScore ?? initialEvaluation.overallScore,
    });
  }

  private async applyPlanPass(
    plan: EnvironmentPlan,
    options: {
      iterationLabel: string;
      refinementContext?: Record<string, unknown>;
    },
  ): Promise<EnvironmentPlanApplyResult & { effectivePlan: EnvironmentPlan }> {
    const applied: string[] = [];
    const skipped: string[] = [];
    let effectivePlan = plan;
    if (plan.roomShell) {
      const shellBuild = await environmentShellBuilderService.buildShell({
        shell: plan.roomShell,
        prompt: plan.prompt,
        layoutHints: environmentShellBuilderService.layoutGuidanceToHints(plan.layoutGuidance),
      });
      effectivePlan = {
        ...plan,
        roomShell: shellBuild.shell,
      };
      applied.push(`Romskall: ${shellBuild.shell.type} ${shellBuild.shell.width}x${shellBuild.shell.depth}x${shellBuild.shell.height}m`);
      if (shellBuild.typeAccessoryHints.length > 0) {
        applied.push(`Shell-detaljer: ${shellBuild.typeAccessoryHints.join(', ')}`);
      }
    }

    const resolvedBranding = await this.resolveEffectiveBranding(effectivePlan.branding);
    if (resolvedBranding !== effectivePlan.branding) {
      effectivePlan = {
        ...effectivePlan,
        branding: resolvedBranding,
      };
      if (resolvedBranding?.enabled) {
        applied.push(`Brandprofil: ${resolvedBranding.profileName || resolvedBranding.brandName || 'Lagret profil'}`);
      }
    }

    const assemblyResult = assembleEnvironmentScenegraph(effectivePlan);
    const assemblyValidation = await this.validateAssembly(effectivePlan, assemblyResult);
    this.publishAppliedPlan(effectivePlan);
    this.publishAssemblySnapshot(assemblyResult.assembly);
    this.publishAssemblyValidation(assemblyValidation);
    if (assemblyValidation.backendValidated) {
      applied.push('Scenegraph validert i backend');
    }
    if (assemblyValidation.differences.length > 0) {
      skipped.push(...assemblyValidation.differences);
    }
    const recommendedPreset = effectivePlan.recommendedPresetId
      ? getEnvironmentById(effectivePlan.recommendedPresetId)
      : null;

    if (recommendedPreset) {
      environmentService.applyPreset(recommendedPreset.id);
      applied.push(`Preset: ${effectivePlan.recommendedPresetId}`);
    }

    if (effectivePlan.roomShell) {
      environmentService.applyRoomShell(effectivePlan.roomShell);
    }

    if (recommendedPreset && this.looksLikeNeutralFallbackSurfaces(effectivePlan.surfaces)) {
      applied.push('Beholdt template-overflater');
    } else {
      effectivePlan.surfaces.forEach((surface) => {
        this.applySurface(surface, applied, skipped);
      });
    }

    if (effectivePlan.atmosphere && Object.keys(effectivePlan.atmosphere).length > 0) {
      environmentService.applyAtmosphere(effectivePlan.atmosphere);
      applied.push('Atmosfære');
    }

    if (effectivePlan.ambientSounds.length > 0) {
      environmentService.setAmbientSounds(effectivePlan.ambientSounds);
      applied.push(`Ambient lyd (${effectivePlan.ambientSounds.length})`);
    }

    const runtimeProps = assemblyResult.runtimeProps;
    const studioRuntime = (window as any).virtualStudio as {
      addEnvironmentProps?: (
        props: ReturnType<typeof buildEnvironmentRuntimeProps>,
        options?: { clearExisting?: boolean; planId?: string },
      ) => Promise<{ applied: string[]; skipped: string[]; appliedAssetIds?: string[] }>;
      applyEnvironmentBranding?: (options: {
        planId?: string;
        branding?: EnvironmentPlan['branding'];
      }) => { applied: string[]; skipped: string[] };
      addEnvironmentCharacters?: (options: {
        planId?: string;
        characters: EnvironmentPlan['characters'];
        branding?: EnvironmentPlan['branding'];
        layoutGuidance?: EnvironmentPlan['layoutGuidance'];
        clearExisting?: boolean;
      }) => Promise<{ applied: string[]; skipped: string[]; characterIds: string[] }>;
      applyEnvironmentCameraRig?: (options: {
        planId?: string;
        shotType?: EnvironmentPlan['camera']['shotType'];
        mood?: EnvironmentPlan['camera']['mood'];
        target?: EnvironmentPlan['camera']['target'];
        positionHint?: EnvironmentPlan['camera']['positionHint'];
        fov?: EnvironmentPlan['camera']['fov'];
      }) => {
        position: [number, number, number];
        target: [number, number, number];
        focalLength: number;
        shotType: string;
      };
      applyEnvironmentLightingPlan?: (options: {
        planId?: string;
        lighting: EnvironmentPlan['lighting'];
        target?: EnvironmentPlan['camera']['target'];
        mood?: EnvironmentPlan['camera']['mood'];
        contextText?: string | null;
        layoutGuidance?: EnvironmentPlan['layoutGuidance'];
        clearExisting?: boolean;
      }) => Promise<{ applied: string[]; skipped: string[]; lightIds: string[] }>;
    } | undefined;

    if (effectivePlan.branding?.enabled) {
      if (studioRuntime?.applyEnvironmentBranding) {
        const brandingResult = studioRuntime.applyEnvironmentBranding({
          planId: effectivePlan.planId,
          branding: effectivePlan.branding,
        });
        if (brandingResult.applied.length > 0) {
          applied.push(...brandingResult.applied.map((name) => `Brand: ${name}`));
        }
        if (brandingResult.skipped.length > 0) {
          skipped.push(...brandingResult.skipped);
        }
      } else {
        window.dispatchEvent(new CustomEvent('ch-apply-environment-branding', {
          detail: {
            planId: effectivePlan.planId,
            branding: effectivePlan.branding,
          },
        }));
        applied.push('Branding');
      }
    }

    if (effectivePlan.characters.length > 0) {
      if (studioRuntime?.addEnvironmentCharacters) {
        const characterResult = await studioRuntime.addEnvironmentCharacters({
          planId: effectivePlan.planId,
          characters: effectivePlan.characters,
          branding: effectivePlan.branding,
          layoutGuidance: effectivePlan.layoutGuidance,
          clearExisting: true,
        });
        if (characterResult.applied.length > 0) {
          applied.push(...characterResult.applied.map((name) => `Karakter: ${name}`));
        }
        if (characterResult.skipped.length > 0) {
          skipped.push(...characterResult.skipped);
        }
      } else {
        skipped.push('Karakterbyggeren er ikke tilgjengelig i runtime enda');
      }
    }

    if (runtimeProps.length > 0) {
      if (studioRuntime?.addEnvironmentProps) {
        const propResult = await studioRuntime.addEnvironmentProps(runtimeProps, {
          clearExisting: true,
          planId: effectivePlan.planId,
        });

        if (propResult.applied.length > 0) {
          applied.push(...propResult.applied.map((name) => `Prop: ${name}`));
        }
        if (propResult.skipped.length > 0) {
          skipped.push(...propResult.skipped);
        }

        if (propResult.appliedAssetIds && propResult.appliedAssetIds.length > 0) {
          const context = assetBrainService.inferPlanContext(effectivePlan);
          assetBrainService.recordUsage({
            assetIds: propResult.appliedAssetIds,
            roomTypes: context.roomTypes,
            styles: context.styles,
            prompt: [effectivePlan.prompt, effectivePlan.summary, effectivePlan.concept].filter(Boolean).join(' '),
            planId: effectivePlan.planId,
            source: effectivePlan.source,
          });
        }
      } else {
        skipped.push('Prop-byggeren er ikke tilgjengelig i runtime enda');
      }
    } else if (effectivePlan.props.length > 0) {
      skipped.push('Fant ingen matchende prop-assets for planforslaget');
    }

    if (effectivePlan.camera.positionHint || effectivePlan.camera.target || effectivePlan.camera.fov || effectivePlan.camera.shotType) {
      if (studioRuntime?.applyEnvironmentCameraRig) {
        const cameraResult = studioRuntime.applyEnvironmentCameraRig({
          planId: effectivePlan.planId,
          shotType: effectivePlan.camera.shotType,
          mood: effectivePlan.camera.mood,
          target: effectivePlan.camera.target,
          positionHint: effectivePlan.camera.positionHint,
          fov: effectivePlan.camera.fov,
        });
        applied.push(`Kamera: ${cameraResult.shotType} (${cameraResult.focalLength}mm)`);
      } else {
        window.dispatchEvent(new CustomEvent('ch-auto-rig-environment-camera', {
          detail: {
            planId: effectivePlan.planId,
            shotType: effectivePlan.camera.shotType,
            mood: effectivePlan.camera.mood,
            target: effectivePlan.camera.target,
            positionHint: effectivePlan.camera.positionHint,
            fov: effectivePlan.camera.fov,
          },
        }));
        applied.push('Kameraforslag');
      }
    }

    if (effectivePlan.lighting.length > 0) {
      const lightingContextText = [
        effectivePlan.prompt,
        effectivePlan.concept,
        effectivePlan.summary,
        effectivePlan.recommendedPresetId,
        effectivePlan.branding?.brandName,
        effectivePlan.branding?.profileName,
        Array.isArray(effectivePlan.branding?.notes) ? effectivePlan.branding?.notes.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (studioRuntime?.applyEnvironmentLightingPlan) {
        const lightingResult = await studioRuntime.applyEnvironmentLightingPlan({
          planId: effectivePlan.planId,
          lighting: effectivePlan.lighting,
          target: effectivePlan.camera.target,
          mood: effectivePlan.camera.mood,
          contextText: lightingContextText,
          layoutGuidance: effectivePlan.layoutGuidance,
          clearExisting: true,
        });

        if (lightingResult.applied.length > 0) {
          applied.push(...lightingResult.applied.map((name) => `Lys: ${name}`));
        }
        if (lightingResult.skipped.length > 0) {
          skipped.push(...lightingResult.skipped);
        }
      } else {
        window.dispatchEvent(new CustomEvent('ch-auto-rig-environment-lighting', {
          detail: {
            planId: effectivePlan.planId,
            lighting: effectivePlan.lighting,
            target: effectivePlan.camera.target,
            mood: effectivePlan.camera.mood,
            contextText: lightingContextText,
            layoutGuidance: effectivePlan.layoutGuidance,
            clearExisting: true,
          },
        }));
        applied.push(`Lysrigg (${effectivePlan.lighting.length})`);
      }
    }

    if (effectivePlan.compatibility.gaps.length > 0) {
      skipped.push(...effectivePlan.compatibility.gaps);
    }

    const evaluation = await this.validateEnvironment(effectivePlan, {
      iterationLabel: options.iterationLabel,
      refinementContext: options.refinementContext,
    });
    this.publishEnvironmentEvaluation(evaluation);
    const insights = this.publishEnvironmentPlanInsights(effectivePlan, evaluation);
    this.publishLearningContext(effectivePlan);
    if (evaluation) {
      applied.push(`Miljøscore: ${Math.round(evaluation.overallScore * 100)}%`);
    }

    return {
      applied,
      skipped,
      assembly: assemblyResult.assembly,
      assemblyValidation,
      evaluation,
      insights: insights ?? undefined,
      effectivePlan,
    };
  }

  private toPublicApplyResult(
    result: EnvironmentPlanApplyResult,
    refinement?: EnvironmentPlanRefinementSummary,
  ): EnvironmentPlanApplyResult {
    const applied = [...result.applied];
    if (refinement?.attempted) {
      if (refinement.accepted) {
        applied.unshift(`Auto-justering: ${refinement.changes.join(', ')}`);
        if (typeof refinement.initialScore === 'number' && typeof refinement.finalScore === 'number') {
          applied.unshift(`Score forbedret: ${Math.round(refinement.initialScore * 100)}% -> ${Math.round(refinement.finalScore * 100)}%`);
        }
      } else if (refinement.reverted) {
        applied.unshift('Auto-justering ble testet, men originalscene ble beholdt');
      } else {
        applied.unshift('Auto-justering vurderte scenen, men gjorde ingen trygge endringer');
      }
    }

    return {
      applied,
      skipped: [...result.skipped],
      assembly: result.assembly,
      assemblyValidation: result.assemblyValidation,
      evaluation: result.evaluation,
      insights: result.insights,
      refinement,
    };
  }

  private applySurface(
    surface: EnvironmentPlanSurface,
    applied: string[],
    skipped: string[],
  ): void {
    if (surface.target === 'floor') {
      const floor = getFloorById(surface.materialId);
      if (!floor) {
        skipped.push(`Ukjent gulvmateriale: ${surface.materialId}`);
        return;
      }

      environmentService.setFloorMaterial(surface.materialId);
      environmentService.toggleFloor(surface.visible);
      applied.push(`Gulv: ${surface.materialId}`);
      return;
    }

    if (!WALL_TARGETS.has(surface.target)) {
      skipped.push(`Ukjent surface target: ${surface.target}`);
      return;
    }

    const wall = getWallById(surface.materialId);
    if (!wall) {
      skipped.push(`Ukjent veggmateriale: ${surface.materialId}`);
      return;
    }

    environmentService.setWallMaterial(surface.target, surface.materialId);
    environmentService.toggleWall(surface.target, surface.visible);
    applied.push(`${surface.target}: ${surface.materialId}`);
  }

  private looksLikeNeutralFallbackSurfaces(surfaces: EnvironmentPlanSurface[]): boolean {
    if (surfaces.length !== Object.keys(GENERIC_NEUTRAL_SURFACES).length) {
      return false;
    }

    return surfaces.every((surface) => {
      const expected = GENERIC_NEUTRAL_SURFACES[surface.target];
      return Boolean(
        expected
        && expected.materialId === surface.materialId
        && expected.visible === surface.visible,
      );
    });
  }

  private async resolveEffectiveBranding(
    branding: EnvironmentPlan['branding'],
  ): Promise<EnvironmentPlan['branding']> {
    if (branding?.enabled === false) {
      return branding;
    }

    try {
      const storedProfile = await getStoredBrandProfile();
      const storedReference = buildBrandReferenceFromProfile(storedProfile);
      if (!storedReference) {
        return branding;
      }
      return this.mergeBrandingWithReference(branding, storedReference);
    } catch {
      return branding;
    }
  }

  private mergeBrandingWithReference(
    branding: EnvironmentPlan['branding'],
    brandReference: EnvironmentPlanBrandReference,
  ): EnvironmentPlan['branding'] {
    const mergedTargets = Array.from(new Set([
      ...(Array.isArray(branding?.applicationTargets) ? branding.applicationTargets : []),
      ...(Array.isArray(brandReference.applicationTargets) ? brandReference.applicationTargets : []),
    ])) as NonNullable<NonNullable<EnvironmentPlan['branding']>['applicationTargets']>;
    const mergedNotes = Array.from(new Set([
      ...(Array.isArray(branding?.notes) ? branding.notes.filter(Boolean) : []),
      ...(brandReference.usageNotes ? [brandReference.usageNotes] : []),
    ]));
    const applyTargets = new Set(mergedTargets);

    const nextBranding = {
      enabled: branding?.enabled ?? true,
      brandName: branding?.brandName || brandReference.brandName,
      profileName: branding?.profileName || brandReference.profileName || brandReference.brandName,
      palette: Array.isArray(branding?.palette) && branding.palette.length > 0
        ? [...branding.palette]
        : [...(brandReference.palette || [])],
      signageText: branding?.signageText || brandReference.brandName || brandReference.profileName,
      logoImage: branding?.logoImage !== undefined ? branding.logoImage : (brandReference.logoImage || null),
      applyToEnvironment: branding?.applyToEnvironment ?? (applyTargets.has('environment') || applyTargets.has('interior_details')),
      applyToWardrobe: branding?.applyToWardrobe ?? applyTargets.has('wardrobe'),
      applyToSignage: branding?.applyToSignage ?? applyTargets.has('signage'),
      applicationTargets: mergedTargets.length > 0 ? mergedTargets : undefined,
      uniformPolicy: branding?.uniformPolicy || brandReference.uniformPolicy,
      signageStyle: branding?.signageStyle || brandReference.signageStyle,
      packagingStyle: branding?.packagingStyle || brandReference.packagingStyle,
      interiorStyle: branding?.interiorStyle || brandReference.interiorStyle,
      notes: mergedNotes.length > 0 ? mergedNotes : undefined,
    } satisfies NonNullable<EnvironmentPlan['branding']>;

    if (JSON.stringify(branding || null) === JSON.stringify(nextBranding)) {
      return branding;
    }

    return nextBranding;
  }

  private getPlannerWindow(): EnvironmentPlannerWindow | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window as EnvironmentPlannerWindow;
  }

  private publishAssemblySnapshot(assembly: EnvironmentScenegraphAssembly): void {
    const plannerWindow = this.getPlannerWindow();
    if (!plannerWindow) {
      return;
    }

    plannerWindow.__virtualStudioLastEnvironmentAssembly = assembly;
  }

  private publishAppliedPlan(plan: EnvironmentPlan): void {
    const plannerWindow = this.getPlannerWindow();
    if (!plannerWindow) {
      return;
    }

    plannerWindow.__virtualStudioLastAppliedEnvironmentPlan = JSON.parse(JSON.stringify(plan)) as EnvironmentPlan;
  }

  private publishAssemblyValidation(summary: EnvironmentAssemblyValidationSummary): void {
    const plannerWindow = this.getPlannerWindow();
    if (!plannerWindow) {
      return;
    }

    plannerWindow.__virtualStudioLastEnvironmentAssemblyValidation = summary;
    window.dispatchEvent(new CustomEvent('vs-environment-assembly-validation-updated', {
      detail: summary,
    }));
  }

  private publishEnvironmentEvaluation(summary: EnvironmentPlanEvaluationSummary | null): void {
    const plannerWindow = this.getPlannerWindow();
    if (!plannerWindow || !summary) {
      return;
    }

    plannerWindow.__virtualStudioLastEnvironmentEvaluation = summary;
    window.dispatchEvent(new CustomEvent('vs-environment-evaluation-updated', {
      detail: summary,
    }));
  }

  private publishEnvironmentPlanInsights(
    plan: EnvironmentPlan,
    evaluation: EnvironmentPlanEvaluationSummary | null,
  ): EnvironmentPlanInsightPresentation | null {
    const plannerWindow = this.getPlannerWindow();
    const summary = getEnvironmentPlanInsightPresentation(plan, evaluation);
    if (!plannerWindow || !summary) {
      return summary;
    }

    plannerWindow.__virtualStudioLastEnvironmentPlanInsights = summary;
    window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', {
      detail: summary,
    }));
    return summary;
  }

  private publishLearningContext(plan: EnvironmentPlan): void {
    const plannerWindow = this.getPlannerWindow();
    if (!plannerWindow) {
      return;
    }

    const context = assetBrainService.inferPlanContext(plan);
    plannerWindow.__virtualStudioLastEnvironmentLearningContext = {
      planId: plan.planId,
      prompt: [plan.prompt, plan.summary, plan.concept].filter(Boolean).join(' '),
      roomTypes: context.roomTypes,
      styles: context.styles,
      source: plan.source,
    };
  }

  private getStatusMock(): PlannerStatusMock | null {
    return this.getPlannerWindow()?.__virtualStudioEnvironmentPlannerStatusMock ?? null;
  }

  private getResponseMock(): PlannerResponseMock | null {
    return this.getPlannerWindow()?.__virtualStudioEnvironmentPlannerMock ?? null;
  }

  private cloneMock<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private trackMockRequest(request: EnvironmentPlanRequest): void {
    const plannerWindow = this.getPlannerWindow();
    if (!plannerWindow) {
      return;
    }

    if (!Array.isArray(plannerWindow.__virtualStudioEnvironmentPlannerRequests)) {
      plannerWindow.__virtualStudioEnvironmentPlannerRequests = [];
    }

    plannerWindow.__virtualStudioEnvironmentPlannerRequests.push(this.cloneMock(request));
  }

  private async validateAssembly(
    plan: EnvironmentPlan,
    localAssemblyResult: {
      assembly: EnvironmentScenegraphAssembly;
      runtimeProps: ReturnType<typeof buildEnvironmentRuntimeProps>;
    },
  ): Promise<EnvironmentAssemblyValidationSummary> {
    try {
      const backendResult = await environmentAssemblyService.assemble(plan as unknown as Record<string, unknown>);
      return buildEnvironmentAssemblyValidationSummary({
        localAssembly: localAssemblyResult.assembly,
        localRuntimeProps: localAssemblyResult.runtimeProps,
        localShell: plan.roomShell,
        backendResult,
      });
    } catch {
      return buildEnvironmentAssemblyValidationSummary({
        localAssembly: localAssemblyResult.assembly,
        localRuntimeProps: localAssemblyResult.runtimeProps,
        localShell: plan.roomShell,
      });
    }
  }

  private async validateEnvironment(
    plan: EnvironmentPlan,
    options: {
      iterationLabel?: string;
      refinementContext?: Record<string, unknown>;
    } = {},
  ): Promise<EnvironmentPlanEvaluationSummary | null> {
    try {
      const previewImage = await environmentPreviewCaptureService.capturePreview({
        maxWidth: 960,
        maxHeight: 540,
        quality: 0.82,
        mimeType: 'image/jpeg',
      });
      const result = await environmentValidationService.validate(plan, {
        previewImage,
        provider: 'auto',
        validationOptions: {
          referenceMode: 'runtime_preview',
          planId: plan.planId,
          source: plan.source,
          iterationLabel: options.iterationLabel || 'initial_apply',
          refinementContext: options.refinementContext || null,
        },
      });
      return result.evaluation;
    } catch {
      return null;
    }
  }
}

export const environmentPlannerService = new EnvironmentPlannerService();
