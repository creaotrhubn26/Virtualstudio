import type { EnvironmentPlanApplyResult } from './environmentPlannerService';
import settingsService, { getCurrentUserId } from './settingsService';
import type {
  MarketplaceEnvironmentPackQualityReport,
  MarketplaceProduct,
  MarketplaceEnvironmentPackage,
  MarketplaceRegistryMetadata,
} from '../core/models/marketplace';

const STORAGE_KEY = 'virtualStudio_marketplaceEnvironmentPackages';

export interface InstalledMarketplaceEnvironmentPackage {
  packageId: string;
  productId: string;
  name: string;
  description: string;
  thumbnail: string;
  version: string;
  tags: string[];
  environmentCategory?: string;
  familyId?: string;
  summary?: string;
  installedAt: string;
  source?: MarketplaceProduct['source'];
  registryMetadata?: MarketplaceRegistryMetadata;
  lineageId?: string;
  releaseStatus?: 'candidate' | 'stable';
  qualityReport?: MarketplaceEnvironmentPackQualityReport | null;
  plan: MarketplaceEnvironmentPackage['plan'];
}

type MarketplaceEnvironmentWindow = Window & {
  __virtualStudioLastMarketplaceEnvironmentPackageId?: string;
};

class MarketplaceEnvironmentService {
  private installedPackages: InstalledMarketplaceEnvironmentPackage[] = [];
  private listeners = new Set<(packages: InstalledMarketplaceEnvironmentPackage[]) => void>();

  constructor() {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const stored = await settingsService.getSetting<InstalledMarketplaceEnvironmentPackage[]>(STORAGE_KEY, {
        userId: getCurrentUserId(),
      });
      if (Array.isArray(stored)) {
        this.installedPackages = stored;
        this.notify();
      }
    } catch {
      // Ignore hydration errors in local/offline mode.
    }
  }

  private persist(): void {
    void settingsService.setSetting(STORAGE_KEY, this.installedPackages, {
      userId: getCurrentUserId(),
    });
  }

  private notify(): void {
    const snapshot = this.getInstalledPackages();
    this.listeners.forEach((listener) => listener(snapshot));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vs-marketplace-environments-changed', {
        detail: snapshot,
      }));
    }
  }

  subscribe(listener: (packages: InstalledMarketplaceEnvironmentPackage[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getInstalledPackages());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getInstalledPackages(): InstalledMarketplaceEnvironmentPackage[] {
    return this.installedPackages.map((entry) => ({
      ...entry,
      tags: [...entry.tags],
      plan: structuredClone(entry.plan),
    }));
  }

  getInstalledPackage(packageId: string): InstalledMarketplaceEnvironmentPackage | null {
    return this.getInstalledPackages().find((entry) => entry.packageId === packageId) ?? null;
  }

  getInstalledPackageByProductId(productId: string): InstalledMarketplaceEnvironmentPackage | null {
    return this.getInstalledPackages().find((entry) => entry.productId === productId) ?? null;
  }

  installFromProduct(product: MarketplaceProduct): boolean {
    if (!product.environmentPackage) {
      return false;
    }

    const existingIndex = this.installedPackages.findIndex((entry) => entry.packageId === product.environmentPackage?.packageId);
    const nextEntry: InstalledMarketplaceEnvironmentPackage = {
      packageId: product.environmentPackage.packageId,
      productId: product.id,
      name: product.name,
      description: product.description,
      thumbnail: product.thumbnail,
      version: product.version,
      tags: [...product.tags],
      environmentCategory: product.environmentPackage.environmentCategory,
      familyId: product.environmentPackage.familyId,
      summary: product.environmentPackage.summary || product.environmentPackage.plan.summary,
      installedAt: new Date().toISOString(),
      source: product.source,
      registryMetadata: product.registryMetadata ? structuredClone(product.registryMetadata) : undefined,
      lineageId: product.registryMetadata?.lineageId || product.id,
      releaseStatus: product.registryMetadata?.releaseStatus || 'stable',
      qualityReport: product.environmentPackage.qualityReport ? structuredClone(product.environmentPackage.qualityReport) : null,
      plan: structuredClone(product.environmentPackage.plan),
    };

    if (existingIndex >= 0) {
      this.installedPackages[existingIndex] = nextEntry;
    } else {
      this.installedPackages.push(nextEntry);
    }

    this.persist();
    this.notify();
    return true;
  }

  uninstallByProductId(productId: string): boolean {
    const nextPackages = this.installedPackages.filter((entry) => entry.productId !== productId);
    if (nextPackages.length === this.installedPackages.length) {
      return false;
    }
    this.installedPackages = nextPackages;
    this.persist();
    this.notify();
    return true;
  }

  async applyInstalledPackage(packageId: string): Promise<EnvironmentPlanApplyResult | null> {
    const entry = this.installedPackages.find((item) => item.packageId === packageId);
    if (!entry) {
      return null;
    }

    const { environmentPlannerService } = await import('./environmentPlannerService');
    const result = await environmentPlannerService.applyPlanToCurrentStudio(structuredClone(entry.plan));
    if (typeof window !== 'undefined') {
      (window as MarketplaceEnvironmentWindow).__virtualStudioLastMarketplaceEnvironmentPackageId = entry.packageId;
      window.dispatchEvent(new CustomEvent('vs-marketplace-environment-applied', {
        detail: {
          packageId: entry.packageId,
          productId: entry.productId,
          result,
        },
      }));
    }
    return result;
  }

  async applyInstalledPackageByProductId(productId: string): Promise<EnvironmentPlanApplyResult | null> {
    const entry = this.installedPackages.find((item) => item.productId === productId);
    if (!entry) {
      return null;
    }
    return this.applyInstalledPackage(entry.packageId);
  }

  resetForTests(): void {
    this.installedPackages = [];
    this.notify();
  }
}

export const marketplaceEnvironmentService = new MarketplaceEnvironmentService();
