import { SceneComposition } from '../core/models/sceneComposer';
import settingsService, { getCurrentUserId } from './settingsService';

const VARIATIONS_KEY = 'virtualStudio_sceneVariations';
let cachedVariations: SceneVariation[] = [];

const hydrateVariationsFromDb = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const userId = getCurrentUserId();
    const remote = await settingsService.getSetting<SceneVariation[]>(VARIATIONS_KEY, { userId });
    if (remote) {
      cachedVariations = remote;
      return;
    }
  } catch {
    // Ignore hydration errors
  }
};

void hydrateVariationsFromDb();
import { sceneComposerService } from './sceneComposerService';

export interface SceneVariation {
  id: string;
  sceneId: string;
  name: string;
  variant: 'A' | 'B' | 'C' | 'D' | 'E';
  changes: {
    cameras?: boolean;
    lights?: boolean;
    actors?: boolean;
    props?: boolean;
    settings?: boolean;
  };
  data: Partial<SceneComposition>;
  createdAt: string;
}

export const sceneVariationService = {
  /**
   * Create a variation of a scene
   */
  createVariation(scene: SceneComposition, variant: 'A' | 'B' | 'C' | 'D' | 'E', changes: SceneVariation['changes']): SceneVariation {
    const variation: SceneVariation = {
      id: `variation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sceneId: scene.id,
      name: `${scene.name} - Variant ${variant}`,
      variant,
      changes,
      data: {},
      createdAt: new Date().toISOString(),
    };

    // Store only changed parts
    if (changes.cameras) {
      variation.data.cameras = scene.cameras;
    }
    if (changes.lights) {
      variation.data.lights = scene.lights;
    }
    if (changes.actors) {
      variation.data.actors = scene.actors;
    }
    if (changes.props) {
      variation.data.props = scene.props;
    }
    if (changes.settings) {
      variation.data.cameraSettings = scene.cameraSettings;
    }

    this.saveVariation(variation);
    return variation;
  },

  /**
   * Get all variations for a scene
   */
  getVariations(sceneId: string): SceneVariation[] {
    return cachedVariations.filter(v => v.sceneId === sceneId);
  },

  /**
   * Save a variation
   */
  saveVariation(variation: SceneVariation): void {
    try {
      const existingIndex = cachedVariations.findIndex(v => v.id === variation.id);
      
      if (existingIndex >= 0) {
        cachedVariations[existingIndex] = variation;
      } else {
        cachedVariations.push(variation);
      }
      
      void settingsService.setSetting(VARIATIONS_KEY, cachedVariations, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error saving variation:', error);
    }
  },

  /**
   * Apply variation to scene
   */
  applyVariation(scene: SceneComposition, variation: SceneVariation): SceneComposition {
    const updated: SceneComposition = { ...scene };
    
    if (variation.changes.cameras && variation.data.cameras) {
      updated.cameras = variation.data.cameras;
    }
    if (variation.changes.lights && variation.data.lights) {
      updated.lights = variation.data.lights;
    }
    if (variation.changes.actors && variation.data.actors) {
      updated.actors = variation.data.actors;
    }
    if (variation.changes.props && variation.data.props) {
      updated.props = variation.data.props;
    }
    if (variation.changes.settings && variation.data.cameraSettings) {
      updated.cameraSettings = variation.data.cameraSettings;
    }

    updated.updatedAt = new Date().toISOString();
    return updated;
  },
};

