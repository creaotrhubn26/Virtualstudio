import type {
  EnvironmentPlan,
  EnvironmentPlanBrandReference,
  EnvironmentPlanEvaluationSummary,
} from '../core/models/environmentPlan';
import type {
  MarketplaceEnvironmentPackSourceSnapshot,
  MarketplaceEnvironmentPackQualityReport,
  MarketplaceProduct,
  MarketplaceEnvironmentPackValidationSummary,
} from '../core/models/marketplace';
import type { SceneEnvironmentAssemblyValidation } from '../core/models/sceneComposer';
import { environmentValidationService } from './environmentValidationService';
import { environmentPreviewCaptureService } from './environmentPreviewCaptureService';
import { sceneAssetStorageService } from './sceneAssetStorageService';
import { getMarketplaceActor } from './marketplaceActorService';
import { marketplaceRegistryService } from './marketplaceRegistryService';
import type { MarketplaceEnvironmentRegistryPublishMode } from './marketplaceRegistryService';
import { suggestMarketplaceEnvironmentPackMetadata } from './marketplaceEnvironmentPackSuggestions';
import type { EnvironmentPlanInsightPresentation } from './environmentPlanInsightPresentation';
import { buildBrandReferenceFromProfile, getStoredBrandProfile } from './brandProfileService';
import { marketplaceEnvironmentService } from './marketplaceEnvironmentService';

const PUBLISH_READY_SCORE = 0.72;
const BLOCKING_SCORE = 0.55;

type MarketplaceEnvironmentWindow = Window & {
  __virtualStudioLastAppliedEnvironmentPlan?: EnvironmentPlan;
  __virtualStudioLastEnvironmentEvaluation?: EnvironmentPlanEvaluationSummary;
  __virtualStudioLastEnvironmentAssemblyValidation?: SceneEnvironmentAssemblyValidation;
  __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
  __virtualStudioLastMarketplaceEnvironmentPackageId?: string;
  __virtualStudioDiagnostics?: {
    environment?: {
      sceneState?: {
        props?: unknown[];
        characters?: unknown[];
        lights?: unknown[];
        roomShell?: {
          type?: string;
        };
      };
    };
  };
};

export interface MarketplaceEnvironmentPackDraft {
  product: MarketplaceProduct;
  validation: MarketplaceEnvironmentPackValidationSummary;
  qualityReport: MarketplaceEnvironmentPackQualityReport;
  previewImage: string | null;
  publishMode: MarketplaceEnvironmentRegistryPublishMode;
  publishContext: {
    sourceProductId: string | null;
    sourceProductName: string | null;
    sourceVisibility: 'shared' | 'private' | null;
    canUpdateSource: boolean;
    canPublishShared: boolean;
    releaseStatus: 'candidate' | 'stable';
    notice: string | null;
  };
}

export interface BuildMarketplaceEnvironmentPackDraftInput {
  name?: string;
  description?: string;
  tags?: string[];
  mode?: MarketplaceEnvironmentRegistryPublishMode;
  targetProduct?: MarketplaceProduct | null;
}

function getWindowRef(): MarketplaceEnvironmentWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as MarketplaceEnvironmentWindow;
}

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'environment-pack';
}

function buildCopyName(input: string): string {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    return 'Miljøpakke (kopi)';
  }
  if (/\(kopi\)$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} (kopi)`;
}

function bumpPatchVersion(version?: string): string {
  const match = String(version || '1.0.0').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return '1.0.1';
  }
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

function dedupeTags(tags: string[] = []): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tag of tags) {
    const normalized = String(tag || '').trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function clonePlan(plan: EnvironmentPlan): EnvironmentPlan {
  return JSON.parse(JSON.stringify(plan)) as EnvironmentPlan;
}

function resolveAppliedSourceProduct(targetProduct?: MarketplaceProduct | null): MarketplaceProduct | null {
  if (targetProduct?.source === 'registry') {
    return targetProduct;
  }

  const win = getWindowRef();
  const appliedPackageId = win?.__virtualStudioLastMarketplaceEnvironmentPackageId;
  if (!appliedPackageId) {
    return null;
  }

  const installedPackage = marketplaceEnvironmentService.getInstalledPackage(appliedPackageId);
  if (!installedPackage) {
    return null;
  }

  return {
    id: installedPackage.productId,
    name: installedPackage.name,
    description: installedPackage.description,
    category: 'template',
    price: 0,
    thumbnail: installedPackage.thumbnail,
    screenshots: [installedPackage.thumbnail],
    version: installedPackage.version,
    author: {
      id: installedPackage.registryMetadata?.ownerId || 'unknown-user',
      name: installedPackage.registryMetadata?.ownerName || installedPackage.name,
    },
    rating: 0,
    reviewCount: 0,
    downloadCount: 0,
    installCount: 0,
    tags: [...installedPackage.tags],
    features: [],
    releaseDate: installedPackage.installedAt,
    lastUpdated: installedPackage.installedAt,
    license: 'Marketplace',
    isInstalled: true,
    installedVersion: installedPackage.version,
    hasUpdate: false,
    isFavorite: false,
    source: installedPackage.source,
    registryMetadata: installedPackage.registryMetadata,
    environmentPackage: {
      packageId: installedPackage.packageId,
      type: 'environment_plan',
      environmentCategory: installedPackage.environmentCategory,
      familyId: installedPackage.familyId,
      summary: installedPackage.summary,
      plan: clonePlan(installedPackage.plan),
    },
  };
}

function buildValidationSummary(input: {
  evaluation: EnvironmentPlanEvaluationSummary | null;
  assemblyValidation: SceneEnvironmentAssemblyValidation | null;
}): MarketplaceEnvironmentPackValidationSummary {
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const evaluationScore = input.evaluation?.overallScore ?? null;
  const backendValidated = Boolean(input.assemblyValidation?.backendValidated);

  if (typeof evaluationScore !== 'number') {
    warnings.push('Miljøpakken mangler en fersk evalueringsscore og ble vurdert med fallback-regler.');
  } else if (evaluationScore < BLOCKING_SCORE) {
    blockingIssues.push(`Evalueringsscore ${evaluationScore.toFixed(2)} er under minimumskravet for publisering.`);
  } else if (evaluationScore < PUBLISH_READY_SCORE) {
    warnings.push(`Evalueringsscore ${evaluationScore.toFixed(2)} tilsier at pakken fortsatt kan finjusteres.`);
  }

  if (input.evaluation?.verdict === 'needs_refinement') {
    warnings.push('Evalueringssløyfen anbefaler fortsatt finjustering før publisering.');
  }

  if (input.assemblyValidation?.differences?.length) {
    warnings.push(`Backend fant ${input.assemblyValidation.differences.length} assembly-avvik som bør gjennomgås.`);
  }

  if (!backendValidated) {
    warnings.push('Miljøpakken er ikke backend-validert ennå.');
  }

  return {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    backendValidated,
    evaluationScore,
    evaluationVerdict: input.evaluation?.verdict ?? null,
    validatedAt: input.evaluation?.validatedAt || input.assemblyValidation?.validatedAt,
  };
}

function buildSourceSnapshot(win: MarketplaceEnvironmentWindow | null): MarketplaceEnvironmentPackSourceSnapshot {
  const sceneState = win?.__virtualStudioDiagnostics?.environment?.sceneState;
  return {
    roomShellType: sceneState?.roomShell?.type,
    propCount: Array.isArray(sceneState?.props) ? sceneState.props.length : 0,
    actorCount: Array.isArray(sceneState?.characters) ? sceneState.characters.length : 0,
    lightCount: Array.isArray(sceneState?.lights) ? sceneState.lights.length : 0,
  };
}

async function resolveEvaluation(
  plan: EnvironmentPlan,
  previewImage: string | null,
  existingEvaluation: EnvironmentPlanEvaluationSummary | null,
): Promise<EnvironmentPlanEvaluationSummary | null> {
  if (existingEvaluation) {
    return existingEvaluation;
  }

  try {
    const response = await environmentValidationService.validate(plan, {
      previewImage,
      validationOptions: {
        scenePhase: 'marketplace_publish',
      },
    });
    return response.evaluation;
  } catch {
    return null;
  }
}

class MarketplaceEnvironmentPackService {
  async buildDraft(input: BuildMarketplaceEnvironmentPackDraftInput = {}): Promise<MarketplaceEnvironmentPackDraft> {
    const win = getWindowRef();
    const activePlan = win?.__virtualStudioLastAppliedEnvironmentPlan;
    if (!activePlan) {
      throw new Error('Fant ikke noe aktivt miljø å publisere. Bruk et AI-miljø eller en miljøpakke først.');
    }

    const previewImage = await environmentPreviewCaptureService.capturePreview({
      maxWidth: 1280,
      maxHeight: 720,
      mimeType: 'image/jpeg',
      quality: 0.9,
    });

    const evaluation = await resolveEvaluation(activePlan, previewImage, win?.__virtualStudioLastEnvironmentEvaluation ?? null);
    const assemblyValidation = win?.__virtualStudioLastEnvironmentAssemblyValidation ?? null;
    const insights = win?.__virtualStudioLastEnvironmentPlanInsights ?? null;
    const storedBrandProfile = getStoredBrandProfile();
    const brandProfile = storedBrandProfile ? buildBrandReferenceFromProfile(storedBrandProfile) : null;
    const actor = getMarketplaceActor();
    const sourceProduct = resolveAppliedSourceProduct(input.targetProduct);
    const sourceVisibility = sourceProduct?.registryMetadata?.visibility ?? null;
    const canUpdateSource = actor.isAdmin && sourceProduct?.source === 'registry' && sourceVisibility === 'shared';
    const canPublishShared = actor.isAdmin;
    let publishMode: MarketplaceEnvironmentRegistryPublishMode;
    if (input.mode === 'update_shared' && canUpdateSource) {
      publishMode = 'update_shared';
    } else if (input.mode === 'create_shared' && canPublishShared) {
      publishMode = 'create_shared';
    } else if (input.mode === 'save_copy') {
      publishMode = 'save_copy';
    } else {
      publishMode = canUpdateSource ? 'update_shared' : actor.isAdmin ? 'create_shared' : 'save_copy';
    }
    const suggested = suggestMarketplaceEnvironmentPackMetadata(activePlan, {
      insights,
    });
    const now = new Date().toISOString();
    const baseName = sourceProduct && publishMode === 'save_copy'
      ? buildCopyName(input.name || sourceProduct.name || suggested.name)
      : input.name?.trim() || sourceProduct?.name || suggested.name;
    const uniqueSuffix = Date.now().toString(36);
    const productId = publishMode === 'update_shared' && sourceProduct?.id
      ? sourceProduct.id
      : `environment-${publishMode === 'save_copy' ? 'user-copy' : 'shared'}-${slugify(baseName)}-${uniqueSuffix}`;
    const packageId = publishMode === 'update_shared' && sourceProduct?.environmentPackage?.packageId
      ? sourceProduct.environmentPackage.packageId
      : `marketplace-${publishMode === 'save_copy' ? 'user-copy' : 'shared'}-${slugify(baseName)}-${uniqueSuffix}`;
    const validation = buildValidationSummary({
      evaluation,
      assemblyValidation,
    });
    const thumbnail = previewImage
      ? await sceneAssetStorageService.maybeStoreThumbnail(productId, previewImage)
      : undefined;
    const version = publishMode === 'update_shared'
      ? bumpPatchVersion(sourceProduct?.version)
      : '1.0.0';
    const notice = canUpdateSource
      ? `Du lager en candidate-oppdatering for den delte Marketplace-pakken "${sourceProduct?.name}".`
      : actor.isAdmin
        ? 'Du kan lagre denne som privat kopi eller publisere den som shared candidate for admin-gjennomgang.'
        : sourceProduct?.source === 'registry' && sourceVisibility === 'shared'
          ? `Kun administrator kan oppdatere "${sourceProduct.name}". Du kan lagre en egen kopi.`
          : 'Denne lagres som din egen kopi i Marketplace.';

    const product: MarketplaceProduct = {
      id: productId,
      name: baseName,
      description: input.description?.trim() || sourceProduct?.description || suggested.description,
      category: 'template',
      price: 0,
      thumbnail: thumbnail || previewImage || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 120\'%3E%3Crect width=\'200\' height=\'120\' fill=\'%23111827\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' fill=\'white\' font-size=\'14\'%3EEnvironment Pack%3C/text%3E%3C/svg%3E',
      screenshots: thumbnail ? [thumbnail] : previewImage ? [previewImage] : [],
      version,
      author: {
        id: actor.userId,
        name: actor.name,
      },
      rating: 0,
      reviewCount: 0,
      downloadCount: 0,
      installCount: 0,
      tags: dedupeTags(input.tags && input.tags.length > 0 ? input.tags : sourceProduct?.tags || suggested.tags),
      features: suggested.features,
      releaseDate: publishMode === 'update_shared' ? sourceProduct?.releaseDate || now : now,
      lastUpdated: now,
      license: publishMode === 'save_copy' ? 'User Copy' : 'Marketplace Shared Pack',
      isInstalled: false,
      hasUpdate: false,
      isFavorite: false,
      source: 'registry',
      registryMetadata: {
        visibility: publishMode === 'save_copy' ? 'private' : 'shared',
        ownerId: actor.userId,
        ownerName: actor.name,
        ownerRole: actor.role,
        adminManaged: publishMode !== 'save_copy',
        lineageId: sourceProduct?.registryMetadata?.lineageId || sourceProduct?.id || productId,
        releaseStatus: publishMode === 'save_copy' ? 'stable' : 'candidate',
        sourceProductId: publishMode === 'save_copy'
          ? sourceProduct?.id ?? sourceProduct?.registryMetadata?.sourceProductId ?? null
          : sourceProduct?.id && sourceProduct.id !== productId ? sourceProduct.id : sourceProduct?.registryMetadata?.sourceProductId ?? null,
        createdAt: publishMode === 'update_shared' ? sourceProduct?.registryMetadata?.createdAt || sourceProduct?.releaseDate || now : now,
        updatedAt: now,
        updatedById: actor.userId,
        updatedByRole: actor.role,
      },
      registryPermissions: {
        canUpdate: actor.isAdmin,
        canSaveCopy: true,
        canPublishShared,
        reason: notice,
      },
      environmentPackage: {
        packageId,
        type: 'environment_plan',
        environmentCategory: suggested.environmentCategory,
        familyId: suggested.familyId,
        summary: activePlan.summary,
        plan: clonePlan(activePlan),
        manifestVersion: '2.0',
        previewImage: thumbnail || previewImage || undefined,
        publishedAt: now,
        brandProfile: activePlan.branding?.enabled ? {
          brandName: activePlan.branding.brandName,
          palette: activePlan.branding.palette,
          applicationTargets: activePlan.branding.applicationTargets,
          uniformPolicy: activePlan.branding.uniformPolicy,
          signageStyle: activePlan.branding.signageStyle,
          packagingStyle: activePlan.branding.packagingStyle,
          interiorStyle: activePlan.branding.interiorStyle,
          profileName: activePlan.branding.profileName,
        } as EnvironmentPlanBrandReference : brandProfile,
        evaluation,
        assemblyValidation,
        validation,
        qualityReport: null,
        sourceSnapshot: buildSourceSnapshot(win),
      },
    };

    const qualityReport = await marketplaceRegistryService.validateRelease(product, publishMode);
    product.environmentPackage = {
      ...product.environmentPackage,
      qualityReport,
    };

    return {
      product,
      validation,
      qualityReport,
      previewImage: previewImage || null,
      publishMode,
      publishContext: {
        sourceProductId: sourceProduct?.id ?? null,
        sourceProductName: sourceProduct?.name ?? null,
        sourceVisibility,
        canUpdateSource: Boolean(canUpdateSource),
        canPublishShared,
        releaseStatus: publishMode === 'save_copy' ? 'stable' : 'candidate',
        notice,
      },
    };
  }

  async publishCurrentEnvironmentPack(input: BuildMarketplaceEnvironmentPackDraftInput = {}): Promise<MarketplaceEnvironmentPackDraft> {
    const draft = await this.buildDraft(input);
    if (draft.qualityReport.blockingIssues.length > 0) {
      throw new Error(draft.qualityReport.blockingIssues.join(' '));
    }

    const publishedProduct = await marketplaceRegistryService.publishEnvironmentPack(draft.product, draft.publishMode);
    return {
      ...draft,
      product: publishedProduct,
    };
  }
}

export const marketplaceEnvironmentPackService = new MarketplaceEnvironmentPackService();
