import type {
  EnvironmentPlan,
  EnvironmentPlanBrandReference,
  EnvironmentPlanEvaluationSummary,
} from './environmentPlan';
import type { SceneEnvironmentAssemblyValidation } from './sceneComposer';

export interface MarketplaceEnvironmentPackValidationSummary {
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
  backendValidated: boolean;
  evaluationScore?: number | null;
  evaluationVerdict?: string | null;
  validatedAt?: string;
}

export interface MarketplaceEnvironmentPackQualityCheck {
  id: string;
  label: string;
  status: 'passed' | 'warning' | 'failed';
  details?: string | null;
}

export interface MarketplaceEnvironmentPackQualityReport {
  ready: boolean;
  score?: number | null;
  checkedAt?: string;
  blockingIssues: string[];
  warnings: string[];
  checks: MarketplaceEnvironmentPackQualityCheck[];
}

export interface MarketplaceEnvironmentPackSourceSnapshot {
  sceneName?: string;
  roomShellType?: string;
  propCount?: number;
  actorCount?: number;
  lightCount?: number;
}

export interface MarketplaceRegistryMetadata {
  visibility: 'shared' | 'private';
  ownerId: string;
  ownerName?: string;
  ownerRole?: string;
  adminManaged?: boolean;
  lineageId?: string;
  releaseStatus?: 'candidate' | 'stable';
  latestStableVersion?: string | null;
  latestCandidateVersion?: string | null;
  sourceProductId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  updatedById?: string;
  updatedByRole?: string;
  promotedAt?: string;
  promotedById?: string;
}

export interface MarketplaceRegistryPermissions {
  canUpdate: boolean;
  canSaveCopy: boolean;
  canPublishShared: boolean;
  canPromote?: boolean;
  reason?: string | null;
}

export interface MarketplaceReleaseHistoryEntry {
  id: string;
  action: 'publish_candidate' | 'update_candidate' | 'promote_stable' | 'rollback_stable' | string;
  lineageId: string;
  productId?: string | null;
  productName?: string | null;
  version?: string | null;
  previousVersion?: string | null;
  targetVersion?: string | null;
  releaseStatus?: 'candidate' | 'stable' | string | null;
  timestamp: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  summary?: string | null;
  qualityReport?: MarketplaceEnvironmentPackQualityReport | null;
}

export interface MarketplaceReleasePreviewTarget {
  version?: string | null;
  thumbnail?: string | null;
  summary?: string | null;
}

export interface MarketplaceReleaseDashboardEntry {
  lineageId: string;
  productName: string;
  currentStable?: MarketplaceProduct | null;
  currentCandidate?: MarketplaceProduct | null;
  rollbackTarget?: MarketplaceReleasePreviewTarget | null;
  qualityReport?: MarketplaceEnvironmentPackQualityReport | null;
  changelog?: string | null;
  history: MarketplaceReleaseHistoryEntry[];
  canRollback: boolean;
  rollbackTargetVersions: string[];
}

export interface MarketplaceReleaseDashboardSummary {
  sharedPackCount: number;
  candidateCount: number;
  stableCount: number;
  readyCandidateCount: number;
  blockedCandidateCount: number;
}

export interface MarketplaceReleaseDashboard {
  summary: MarketplaceReleaseDashboardSummary;
  entries: MarketplaceReleaseDashboardEntry[];
  recentHistory: MarketplaceReleaseHistoryEntry[];
}

export interface MarketplaceEnvironmentPackage {
  packageId: string;
  type: 'environment_plan';
  environmentCategory?: string;
  familyId?: string;
  summary?: string;
  plan: EnvironmentPlan;
  manifestVersion?: string;
  previewImage?: string;
  publishedAt?: string;
  brandProfile?: EnvironmentPlanBrandReference | null;
  evaluation?: EnvironmentPlanEvaluationSummary | null;
  assemblyValidation?: SceneEnvironmentAssemblyValidation | null;
  validation?: MarketplaceEnvironmentPackValidationSummary | null;
  qualityReport?: MarketplaceEnvironmentPackQualityReport | null;
  sourceSnapshot?: MarketplaceEnvironmentPackSourceSnapshot | null;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  category: 'feature' | 'asset' | 'template' | 'plugin';
  price: number; // 0 for gratis
  currency?: string;
  thumbnail: string;
  screenshots: string[];
  version: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  rating: number; // 0-5
  reviewCount: number;
  downloadCount: number;
  installCount: number;
  tags: string[];
  features: string[];
  requirements?: {
    minVersion?: string;
    dependencies?: string[];
  };
  releaseDate: string;
  lastUpdated: string;
  license: string;
  whatsNew?: string; // Hva er nytt i denne versjonen
  isInstalled: boolean;
  installedVersion?: string;
  hasUpdate: boolean;
  isFavorite: boolean;
  source?: 'builtin' | 'registry';
  registryMetadata?: MarketplaceRegistryMetadata;
  registryPermissions?: MarketplaceRegistryPermissions;
  toolConfig?: {
    panelComponent: string; // Navn på React-komponent
    icon: string; // SVG data URI
    order?: number; // Sorteringsrekkefølge
    openEvent?: string;
    closeEvent?: string;
    toggleEvent?: string;
  };
  environmentPackage?: MarketplaceEnvironmentPackage;
}

export interface MarketplaceReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceFilters {
  category?: 'feature' | 'asset' | 'template' | 'plugin' | 'all';
  price?: 'free' | 'paid' | 'all';
  minRating?: number;
  installationStatus?: 'installed' | 'not-installed' | 'has-update' | 'all';
  sortBy?: 'name' | 'price' | 'rating' | 'popularity' | 'newest';
  tags?: string[];
}
