/**
 * Version history utilities for Panel Creator
 */

import { PanelConfig } from '../types';
import settingsService, { getCurrentUserId } from '@/services/settingsService';

export interface PanelVersion {
  id: string;
  panelId: string;
  version: number;
  timestamp: number;
  data: PanelConfig;
  comment?: string;
}

const SETTINGS_NAMESPACE = 'virtualStudio_panelVersionHistory';
const MAX_VERSIONS_PER_PANEL = 50; // Keep last 50 versions per panel

let historyCache: PanelVersion[] = [];

const hydrateHistoryCache = async () => {
  try {
    const userId = getCurrentUserId();
    const cached = await settingsService.getSetting<PanelVersion[]>(SETTINGS_NAMESPACE, { userId });
    if (cached) {
      historyCache = cached;
      return;
    }
  } catch {
    // Ignore hydration errors
  }
};

void hydrateHistoryCache();

/**
 * Save a version of a panel
 */
export const savePanelVersion = (panel: PanelConfig, comment?: string): void => {
  try {
    const history = getVersionHistory();
    const panelVersions = history.filter(v => v.panelId === panel.id);
    const nextVersion = panelVersions.length > 0 
      ? Math.max(...panelVersions.map(v => v.version)) + 1
      : 1;

    const version: PanelVersion = {
      id: `version_${panel.id}_${Date.now()}`,
      panelId: panel.id,
      version: nextVersion,
      timestamp: Date.now(),
      data: { ...panel },
      comment,
    };

    history.push(version);

    // Keep only the last MAX_VERSIONS_PER_PANEL versions per panel
    const panels = new Set(history.map(v => v.panelId));
    const trimmedHistory: PanelVersion[] = [];
    
    panels.forEach(panelId => {
      const panelVersions = history
        .filter(v => v.panelId === panelId)
        .sort((a, b) => b.version - a.version)
        .slice(0, MAX_VERSIONS_PER_PANEL);
      trimmedHistory.push(...panelVersions);
    });

    historyCache = trimmedHistory;
    void settingsService.setSetting(SETTINGS_NAMESPACE, trimmedHistory, { userId: getCurrentUserId() });
  } catch (error) {
    console.error('Error saving panel version:', error);
  }
};

/**
 * Get version history for a panel
 */
export const getPanelVersions = (panelId: string): PanelVersion[] => {
  try {
    const history = getVersionHistory();
    return history
      .filter(v => v.panelId === panelId)
      .sort((a, b) => b.version - a.version);
  } catch (error) {
    console.error('Error getting panel versions:', error);
    return [];
  }
};

/**
 * Get all version history
 */
export const getVersionHistory = (): PanelVersion[] => {
  return historyCache;
};

/**
 * Restore a panel to a specific version
 */
export const restorePanelVersion = (version: PanelVersion): PanelConfig => {
  return { ...version.data };
};

/**
 * Delete version history for a panel
 */
export const deletePanelVersions = (panelId: string): void => {
  try {
    const history = getVersionHistory();
    const filtered = history.filter(v => v.panelId !== panelId);
    historyCache = filtered;
    void settingsService.setSetting(SETTINGS_NAMESPACE, filtered, { userId: getCurrentUserId() });
  } catch (error) {
    console.error('Error deleting panel versions:', error);
  }
};

/**
 * Get version count for a panel
 */
export const getPanelVersionCount = (panelId: string): number => {
  return getPanelVersions(panelId).length;
};














