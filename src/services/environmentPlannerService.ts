import type {
  EnvironmentPlan,
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

export interface EnvironmentPlanApplyResult {
  applied: string[];
  skipped: string[];
  assembly?: EnvironmentScenegraphAssembly;
}

const WALL_TARGETS = new Set(['backWall', 'leftWall', 'rightWall', 'rearWall']);
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
  __virtualStudioLastEnvironmentAssembly?: EnvironmentScenegraphAssembly;
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
    const applied: string[] = [];
    const skipped: string[] = [];
    const assemblyResult = assembleEnvironmentScenegraph(plan);
    this.publishAssemblySnapshot(assemblyResult.assembly);
    const recommendedPreset = plan.recommendedPresetId
      ? getEnvironmentById(plan.recommendedPresetId)
      : null;

    if (recommendedPreset) {
      environmentService.applyPreset(recommendedPreset.id);
      applied.push(`Preset: ${plan.recommendedPresetId}`);
    }

    if (recommendedPreset && this.looksLikeNeutralFallbackSurfaces(plan.surfaces)) {
      applied.push('Beholdt template-overflater');
    } else {
      plan.surfaces.forEach((surface) => {
        this.applySurface(surface, applied, skipped);
      });
    }

    if (plan.atmosphere && Object.keys(plan.atmosphere).length > 0) {
      environmentService.applyAtmosphere(plan.atmosphere);
      applied.push('Atmosfære');
    }

    if (plan.ambientSounds.length > 0) {
      environmentService.setAmbientSounds(plan.ambientSounds);
      applied.push(`Ambient lyd (${plan.ambientSounds.length})`);
    }

    if (plan.camera.positionHint || plan.camera.target || plan.camera.fov) {
      window.dispatchEvent(new CustomEvent('ch-set-camera-preset', {
        detail: {
          position: plan.camera.positionHint,
          target: plan.camera.target,
          fov: plan.camera.fov,
        },
      }));
      applied.push('Kameraforslag');
    }

    const runtimeProps = assemblyResult.runtimeProps;
    const studioRuntime = (window as any).virtualStudio as {
      addEnvironmentProps?: (
        props: ReturnType<typeof buildEnvironmentRuntimeProps>,
        options?: { clearExisting?: boolean; planId?: string },
      ) => Promise<{ applied: string[]; skipped: string[]; appliedAssetIds?: string[] }>;
    } | undefined;

    if (runtimeProps.length > 0) {
      if (studioRuntime?.addEnvironmentProps) {
        const propResult = await studioRuntime.addEnvironmentProps(runtimeProps, {
          clearExisting: true,
          planId: plan.planId,
        });

        if (propResult.applied.length > 0) {
          applied.push(...propResult.applied.map((name) => `Prop: ${name}`));
        }
        if (propResult.skipped.length > 0) {
          skipped.push(...propResult.skipped);
        }

        if (propResult.appliedAssetIds && propResult.appliedAssetIds.length > 0) {
          const context = assetBrainService.inferPlanContext(plan);
          assetBrainService.recordUsage({
            assetIds: propResult.appliedAssetIds,
            roomTypes: context.roomTypes,
            styles: context.styles,
            prompt: [plan.prompt, plan.summary, plan.concept].filter(Boolean).join(' '),
            planId: plan.planId,
            source: plan.source,
          });
        }
      } else {
        skipped.push('Prop-byggeren er ikke tilgjengelig i runtime enda');
      }
    } else if (plan.props.length > 0) {
      skipped.push('Fant ingen matchende prop-assets for planforslaget');
    }

    if (plan.lighting.length > 0) {
      skipped.push('Lysplan er generert, men automatisk rigging av lys er ikke koblet ferdig ennå');
    }

    if (plan.compatibility.gaps.length > 0) {
      skipped.push(...plan.compatibility.gaps);
    }

    return {
      applied,
      skipped,
      assembly: assemblyResult.assembly,
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
}

export const environmentPlannerService = new EnvironmentPlannerService();
