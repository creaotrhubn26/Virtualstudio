import { SceneComposition } from '../core/models/sceneComposer';
import { sceneComposerService } from './sceneComposerService';

let autoSaveInterval: number | null = null;
let lastSavedScene: SceneComposition | null = null;
let autoSaveEnabled = false;
let autoSaveIntervalMs = 60000; // Default: 1 minute

export const sceneAutoSaveService = {
  /**
   * Enable auto-save
   */
  enable(intervalMs: number = 60000): void {
    if (autoSaveInterval) {
      this.disable();
    }

    autoSaveEnabled = true;
    autoSaveIntervalMs = intervalMs;

    autoSaveInterval = window.setInterval(() => {
      if (lastSavedScene) {
        try {
          sceneComposerService.saveScene(lastSavedScene);
          console.log('Auto-saved scene:', lastSavedScene.name);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, intervalMs);
  },

  /**
   * Disable auto-save
   */
  disable(): void {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
    autoSaveEnabled = false;
  },

  /**
   * Update the scene to be auto-saved
   */
  updateScene(scene: SceneComposition): void {
    lastSavedScene = scene;
  },

  /**
   * Get auto-save status
   */
  isEnabled(): boolean {
    return autoSaveEnabled;
  },

  /**
   * Get auto-save interval
   */
  getInterval(): number {
    return autoSaveIntervalMs;
  },

  /**
   * Set auto-save interval
   */
  setInterval(intervalMs: number): void {
    autoSaveIntervalMs = intervalMs;
    if (autoSaveEnabled) {
      this.disable();
      this.enable(intervalMs);
    }
  },
};

