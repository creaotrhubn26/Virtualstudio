/**
 * Story Logic Service
 * Handles persistence for story logic data (concept, logline, theme)
 * Uses settings API for persistence.
 */

import { settingsService } from './settingsService';

// Story Logic types (matching StoryLogicPanel)
export interface ConceptData {
  corePremise: string;
  genre: string;
  subGenre: string;
  tone: string[];
  targetAudience: string;
  audienceAge: string;
  whyNow: string;
  uniqueAngle: string;
  marketComparables: string;
}

export interface LoglineData {
  protagonist: string;
  protagonistTrait: string;
  goal: string;
  antagonisticForce: string;
  stakes: string;
  fullLogline: string;
  loglineScore: number;
}

export interface ThemeData {
  centralTheme: string;
  themeStatement: string;
  protagonistFlaw: string;
  flawOrigin: string;
  whatMustChange: string;
  transformationArc: string;
  emotionalJourney: string[];
  moralArgument: string;
}

export interface StoryLogicState {
  concept: ConceptData;
  logline: LoglineData;
  theme: ThemeData;
  currentPhase: number;
  phaseStatus: {
    concept: 'incomplete' | 'weak' | 'ready';
    logline: 'incomplete' | 'weak' | 'ready';
    theme: 'incomplete' | 'weak' | 'ready';
  };
  lastSaved: string | null;
  isLocked: boolean;
}

export interface StoryLogicRecord {
  id: string;
  projectId: string;
  data: StoryLogicState;
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_NAMESPACE = 'virtualStudio_storyLogic';

export const storyLogicService = {
  /**
   * Get story logic data for a project
   */
  async getStoryLogic(projectId: string): Promise<StoryLogicState | null> {
    try {
      const data = await settingsService.getSetting<StoryLogicState>(SETTINGS_NAMESPACE, { projectId });
      if (data) return data;
    } catch (error) {
      console.warn('Failed to fetch story logic from settings API:', error);
    }

    return null;
  },

  /**
   * Save story logic data for a project
   */
  async saveStoryLogic(projectId: string, data: StoryLogicState): Promise<void> {
    const now = new Date().toISOString();
    const dataToSave = { ...data, lastSaved: now };

    try {
      await settingsService.setSetting(SETTINGS_NAMESPACE, dataToSave, { projectId });
    } catch (error) {
      console.warn('Failed to save story logic to settings API:', error);
    }
  },

  /**
   * Delete story logic data for a project
   */
  async deleteStoryLogic(projectId: string): Promise<void> {
    try {
      await settingsService.deleteSetting(SETTINGS_NAMESPACE, { projectId });
    } catch (error) {
      console.warn('Failed to delete story logic from settings API:', error);
    }
  },

  /**
   * Check if story logic data exists for a project
   */
  async hasStoryLogic(projectId: string): Promise<boolean> {
    const data = await this.getStoryLogic(projectId);
    return data !== null;
  },

};
