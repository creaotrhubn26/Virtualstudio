import { SceneComposition } from '../core/models/sceneComposer';
import settingsService, { getCurrentUserId } from './settingsService';

export interface SceneMetrics {
  sceneId: string;
  views: number;
  edits: number;
  exports: number;
  shares: number;
  averageEditTime: number; // minutes
  lastAccessed: string;
  environmentUsage?: {
    wallsAdded: number;
    floorsAdded: number;
    presetsApplied: number;
    atmosphereChanges: number;
  };
}

const METRICS_KEY = 'virtualStudio_sceneMetrics';
let cachedMetrics: Record<string, SceneMetrics> = {};

const hydrateMetrics = async (): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    const remote = await settingsService.getSetting<Record<string, SceneMetrics>>(METRICS_KEY, { userId });
    if (remote) {
      cachedMetrics = remote;
      return;
    }
  } catch {
    // Ignore hydration errors
  }
};

void hydrateMetrics();

export const sceneAnalyticsService = {
  /**
   * Track scene view
   */
  trackView(sceneId: string): void {
    const metrics = this.getMetrics(sceneId);
    metrics.views++;
    metrics.lastAccessed = new Date().toISOString();
    this.saveMetrics(metrics);
  },

  /**
   * Track scene edit
   */
  trackEdit(sceneId: string, editTime: number): void {
    const metrics = this.getMetrics(sceneId);
    metrics.edits++;
    metrics.averageEditTime = (metrics.averageEditTime + editTime) / 2;
    metrics.lastAccessed = new Date().toISOString();
    this.saveMetrics(metrics);
  },

  /**
   * Track scene export
   */
  trackExport(sceneId: string): void {
    const metrics = this.getMetrics(sceneId);
    metrics.exports++;
    this.saveMetrics(metrics);
  },

  /**
   * Track scene share
   */
  trackShare(sceneId: string): void {
    const metrics = this.getMetrics(sceneId);
    metrics.shares++;
    this.saveMetrics(metrics);
  },

  /**
   * Track environment usage
   */
  trackEnvironmentUsage(sceneId: string, type: 'wall' | 'floor' | 'preset' | 'atmosphere'): void {
    const metrics = this.getMetrics(sceneId);
    if (!metrics.environmentUsage) {
      metrics.environmentUsage = {
        wallsAdded: 0,
        floorsAdded: 0,
        presetsApplied: 0,
        atmosphereChanges: 0,
      };
    }
    
    switch (type) {
      case 'wall':
        metrics.environmentUsage.wallsAdded++;
        break;
      case 'floor':
        metrics.environmentUsage.floorsAdded++;
        break;
      case 'preset':
        metrics.environmentUsage.presetsApplied++;
        break;
      case 'atmosphere':
        metrics.environmentUsage.atmosphereChanges++;
        break;
    }
    
    this.saveMetrics(metrics);
  },

  /**
   * Get metrics for scene
   */
  getMetrics(sceneId: string): SceneMetrics {
    return cachedMetrics[sceneId] || {
      sceneId,
      views: 0,
      edits: 0,
      exports: 0,
      shares: 0,
      averageEditTime: 0,
      lastAccessed: new Date().toISOString(),
    };
  },

  /**
   * Save metrics
   */
  saveMetrics(metrics: SceneMetrics): void {
    try {
      cachedMetrics[metrics.sceneId] = metrics;
      void settingsService.setSetting(METRICS_KEY, cachedMetrics, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  },
};

