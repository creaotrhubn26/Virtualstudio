import type {
  MarketplaceReleaseDashboard,
  MarketplaceEnvironmentPackQualityReport,
  MarketplaceProduct,
} from '../core/models/marketplace';
import { getMarketplaceActor } from './marketplaceActorService';

const MARKETPLACE_API_BASE = '/api/marketplace/environment-packs';

export type MarketplaceEnvironmentRegistryPublishMode = 'create_shared' | 'save_copy' | 'update_shared';

async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${MARKETPLACE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const marketplaceRegistryService = {
  async listEnvironmentPacks(): Promise<MarketplaceProduct[]> {
    const actor = getMarketplaceActor();
    const params = new URLSearchParams({
      actor_user_id: actor.userId,
      actor_name: actor.name,
      actor_role: actor.role,
    });
    const response = await fetch(`${MARKETPLACE_API_BASE}?${params.toString()}`, {
      method: 'GET',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    const payload = await response.json() as { products?: MarketplaceProduct[] };
    return Array.isArray(payload.products) ? payload.products : [];
  },

  async getReleaseDashboard(): Promise<MarketplaceReleaseDashboard> {
    const actor = getMarketplaceActor();
    const params = new URLSearchParams({
      actor_user_id: actor.userId,
      actor_name: actor.name,
      actor_role: actor.role,
    });
    const response = await fetch(`${MARKETPLACE_API_BASE}/release-dashboard?${params.toString()}`, {
      method: 'GET',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    const payload = await response.json() as { dashboard?: MarketplaceReleaseDashboard };
    return payload.dashboard || {
      summary: {
        sharedPackCount: 0,
        candidateCount: 0,
        stableCount: 0,
        readyCandidateCount: 0,
        blockedCandidateCount: 0,
      },
      entries: [],
      recentHistory: [],
    };
  },

  async publishEnvironmentPack(
    product: MarketplaceProduct,
    mode: MarketplaceEnvironmentRegistryPublishMode,
  ): Promise<MarketplaceProduct> {
    const actor = getMarketplaceActor();
    const result = await requestJson<{ product: MarketplaceProduct }>('/publish', {
      method: 'POST',
      body: JSON.stringify({
        product,
        mode,
        actor: {
          userId: actor.userId,
          name: actor.name,
          role: actor.role,
        },
      }),
    });
    return result.product;
  },

  async validateRelease(
    product: MarketplaceProduct,
    mode: MarketplaceEnvironmentRegistryPublishMode,
  ): Promise<MarketplaceEnvironmentPackQualityReport> {
    const result = await requestJson<{ qualityReport: MarketplaceEnvironmentPackQualityReport }>('/validate-release', {
      method: 'POST',
      body: JSON.stringify({
        product,
        mode,
      }),
    });
    return result.qualityReport;
  },

  async promoteEnvironmentPack(productId: string): Promise<MarketplaceProduct> {
    const actor = getMarketplaceActor();
    const result = await requestJson<{ product: MarketplaceProduct }>(`/${encodeURIComponent(productId)}/promote`, {
      method: 'POST',
      body: JSON.stringify({
        actor: {
          userId: actor.userId,
          name: actor.name,
          role: actor.role,
        },
      }),
    });
    return result.product;
  },

  async rollbackEnvironmentPack(lineageId: string, targetVersion?: string | null): Promise<MarketplaceProduct> {
    const actor = getMarketplaceActor();
    const result = await requestJson<{ product: MarketplaceProduct }>(`/${encodeURIComponent(lineageId)}/rollback`, {
      method: 'POST',
      body: JSON.stringify({
        actor: {
          userId: actor.userId,
          name: actor.name,
          role: actor.role,
        },
        targetVersion: targetVersion || undefined,
      }),
    });
    return result.product;
  },

  async recordInstall(productId: string): Promise<MarketplaceProduct | null> {
    const result = await requestJson<{ product: MarketplaceProduct | null }>(`/${encodeURIComponent(productId)}/record-install`, {
      method: 'POST',
    });
    return result.product || null;
  },
};
