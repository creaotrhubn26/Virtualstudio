import { describe, expect, it } from 'vitest';
import type { MarketplaceReleaseDashboardEntry } from '../core/models/marketplace';
import { buildMarketplaceReleaseAudit } from './marketplaceReleaseAuditService';

function buildEntry(): MarketplaceReleaseDashboardEntry {
  return {
    lineageId: 'environment-shared-noir-pack',
    productName: 'Shared Noir Pack',
    currentStable: {
      id: 'environment-shared-noir-pack',
      name: 'Shared Noir Pack',
      description: 'Stable noir pack',
      category: 'template',
      price: 0,
      thumbnail: 'data:image/svg+xml,test',
      screenshots: [],
      version: '1.2.0',
      author: { id: 'admin-1', name: 'Admin' },
      rating: 0,
      reviewCount: 0,
      downloadCount: 0,
      installCount: 0,
      tags: ['noir'],
      features: ['Noir scene'],
      releaseDate: '2026-03-27T00:00:00Z',
      lastUpdated: '2026-03-27T00:00:00Z',
      license: 'Marketplace Shared Pack',
      isInstalled: true,
      installedVersion: '1.2.0',
      hasUpdate: false,
      isFavorite: false,
      environmentPackage: {
        packageId: 'stable-pack',
        type: 'environment_plan',
        familyId: 'noir',
        qualityReport: {
          ready: true,
          score: 0.71,
          blockingIssues: [],
          warnings: [],
          checks: [],
        },
        sourceSnapshot: {
          roomShellType: 'storefront',
          propCount: 8,
          actorCount: 2,
          lightCount: 3,
        },
        plan: { planId: 'stable-plan' } as any,
      },
    },
    currentCandidate: {
      id: 'environment-shared-noir-pack--candidate',
      name: 'Shared Noir Pack',
      description: 'Candidate noir pack',
      category: 'template',
      price: 0,
      thumbnail: 'data:image/svg+xml,test',
      screenshots: [],
      version: '1.1.0',
      author: { id: 'admin-1', name: 'Admin' },
      rating: 0,
      reviewCount: 0,
      downloadCount: 0,
      installCount: 0,
      tags: ['noir'],
      features: ['Noir scene'],
      releaseDate: '2026-03-28T00:00:00Z',
      lastUpdated: '2026-03-28T00:00:00Z',
      license: 'Marketplace Shared Pack',
      isInstalled: false,
      hasUpdate: false,
      isFavorite: false,
      whatsNew: 'Nye skygger og bedre storefront.',
      environmentPackage: {
        packageId: 'candidate-pack',
        type: 'environment_plan',
        familyId: 'noir',
        qualityReport: {
          ready: true,
          score: 0.88,
          blockingIssues: [],
          warnings: ['Minor note'],
          checks: [],
        },
        sourceSnapshot: {
          roomShellType: 'storefront',
          propCount: 12,
          actorCount: 3,
          lightCount: 4,
        },
        plan: { planId: 'candidate-plan' } as any,
      },
    },
    rollbackTarget: {
      version: '1.0.0',
      thumbnail: 'data:image/svg+xml,rollback-target',
      summary: 'Tidligere stable med enklere storefront.',
    },
    qualityReport: {
      ready: true,
      score: 0.88,
      blockingIssues: [],
      warnings: ['Minor note'],
      checks: [],
    },
    changelog: 'Nye skygger og bedre storefront.',
    history: [],
    canRollback: true,
    rollbackTargetVersions: ['1.0.0'],
  };
}

describe('marketplaceReleaseAuditService', () => {
  it('builds a promote audit from stable to candidate', () => {
    const audit = buildMarketplaceReleaseAudit(buildEntry(), 'promote');

    expect(audit.title).toMatch(/Promoter Shared Noir Pack/);
    expect(audit.targetVersion).toBe('1.1.0');
    expect(audit.scoreBefore).toBe(0.71);
    expect(audit.scoreAfter).toBe(0.88);
    expect(audit.changes.map((change) => change.id)).toContain('propCount');
    expect(audit.previews.before.version).toBe('1.2.0');
    expect(audit.previews.after.version).toBe('1.1.0');
    expect(audit.heatmap.image).toContain('data:image/svg+xml');
  });

  it('builds a rollback audit toward a previous stable version', () => {
    const audit = buildMarketplaceReleaseAudit(buildEntry(), 'rollback', '1.0.0');

    expect(audit.title).toMatch(/Rollback Shared Noir Pack/);
    expect(audit.targetVersion).toBe('1.0.0');
    expect(audit.summary).toMatch(/fra stable 1.2.0 til 1.0.0/i);
    expect(audit.previews.after.image).toContain('rollback-target');
    expect(audit.heatmap.image).toContain('data:image/svg+xml');
  });

  it('creates placeholder previews when a promote audit has no current stable thumbnail', () => {
    const entry = buildEntry();
    entry.currentStable = null;

    const audit = buildMarketplaceReleaseAudit(entry, 'promote');

    expect(audit.previews.before.version).toBeNull();
    expect(audit.previews.before.image).toContain('data:image/svg+xml');
    expect(audit.previews.after.image).toContain('data:image/svg+xml');
    expect(audit.heatmap.image).toContain('data:image/svg+xml');
  });
});
