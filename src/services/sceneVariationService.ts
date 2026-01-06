import { SceneComposition } from '../core/models/sceneComposer';
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
    try {
      const stored = localStorage.getItem('virtualStudio_sceneVariations');
      const allVariations: SceneVariation[] = stored ? JSON.parse(stored) : [];
      return allVariations.filter(v => v.sceneId === sceneId);
    } catch {
      return [];
    }
  },

  /**
   * Save a variation
   */
  saveVariation(variation: SceneVariation): void {
    try {
      const stored = localStorage.getItem('virtualStudio_sceneVariations');
      const allVariations: SceneVariation[] = stored ? JSON.parse(stored) : [];
      const existingIndex = allVariations.findIndex(v => v.id === variation.id);
      
      if (existingIndex >= 0) {
        allVariations[existingIndex] = variation;
      } else {
        allVariations.push(variation);
      }
      
      localStorage.setItem('virtualStudio_sceneVariations', JSON.stringify(allVariations));
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

