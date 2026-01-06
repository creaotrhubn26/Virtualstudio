/**
 * Version history utilities for Panel Creator
 */

import { PanelConfig } from '../types';

export interface PanelVersion {
  id: string;
  panelId: string;
  version: number;
  timestamp: number;
  data: PanelConfig;
  comment?: string;
}

const VERSION_HISTORY_KEY = 'panelVersionHistory';
const MAX_VERSIONS_PER_PANEL = 50; // Keep last 50 versions per panel

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

    localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(trimmedHistory));
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
  try {
    const stored = localStorage.getItem(VERSION_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PanelVersion[];
  } catch (error) {
    console.error('Error getting version history:', error);
    return [];
  }
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
    localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(filtered));
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














