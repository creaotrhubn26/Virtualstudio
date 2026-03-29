/**
 * StorySceneLoaderService
 *
 * Orchestrates loading of a complete story scene preset:
 * 1. Applies lighting via window.virtualStudio.applyScenarioPreset()
 * 2. Loads props via propRenderingService.loadStorySceneProps()
 * 3. Applies poses to loaded character rigs via skeletalAnimationService
 * 4. Emits 'ch-story-scene-loaded' event when complete
 *
 * Exposes progress updates throughout loading via callbacks.
 */

import { ScenarioPreset, StoryCharacterManifest } from '../data/scenarioPresets';
import { propRenderingService } from '../core/services/propRenderingService';
import { useSkeletalAnimationStore } from './skeletalAnimationService';
import { ALL_POSES } from '../core/animation/PoseLibrary';
import { logger } from '../core/services/logger';

const log = logger.module('StorySceneLoader');

export interface StorySceneLoadProgress {
  phase: 'lights' | 'props' | 'characters' | 'done' | 'error';
  progress: number;
  message: string;
}

export type StorySceneProgressCallback = (p: StorySceneLoadProgress) => void;

export interface StorySceneLoadResult {
  preset: ScenarioPreset;
  propsLoaded: number;
  charactersApplied: number;
}

class StorySceneLoaderService {
  private currentPreset: ScenarioPreset | null = null;

  /**
   * Load a complete story scene preset into the live Babylon scene.
   */
  async load(
    preset: ScenarioPreset,
    onProgress?: StorySceneProgressCallback,
  ): Promise<StorySceneLoadResult> {
    this.currentPreset = preset;
    log.info(`Loading story scene: ${preset.navn}`);

    const report = (phase: StorySceneLoadProgress['phase'], progress: number, message: string) => {
      onProgress?.({ phase, progress, message });
      log.debug(`[${phase}] ${Math.round(progress * 100)}% — ${message}`);
    };

    // ── PHASE 1: Lights ───────────────────────────────────────────────
    report('lights', 0, 'Laster lys…');

    const vs = (window as any).virtualStudio;
    if (vs && typeof vs.applyScenarioPreset === 'function') {
      vs.applyScenarioPreset(preset);
      report('lights', 1, `${preset.sceneConfig.lights.length} lys lastet`);
    } else {
      log.warn('virtualStudio.applyScenarioPreset not available — lights skipped');
      report('lights', 1, 'Lys hoppet over (studio ikke tilgjengelig)');
    }

    // ── PHASE 2: Props ────────────────────────────────────────────────
    let propsLoaded = 0;
    if (preset.props && preset.props.length > 0) {
      report('props', 0, 'Laster props…');

      const scene = vs?.scene ?? null;
      if (scene) {
        propRenderingService.setScene(scene);
      }

      const loadedProps = await propRenderingService.loadStorySceneProps(
        preset.props,
        (progress, label) => {
          report('props', progress, `Laster prop: ${label}`);
        },
      );

      propsLoaded = loadedProps.size;
      report('props', 1, `${propsLoaded} av ${preset.props.length} props lastet`);
    } else {
      report('props', 1, 'Ingen props i denne scenen');
    }

    // ── PHASE 3: Characters / Poses ───────────────────────────────────
    let charactersApplied = 0;
    const characters = preset.characters ?? [];

    if (characters.length > 0) {
      report('characters', 0, 'Forbereder karakterer…');

      const { rigs, setBoneRotation } = useSkeletalAnimationStore.getState();

      // Try to match scene rigs to character manifests by order
      const rigEntries = Array.from(rigs.entries());

      characters.forEach((charManifest, idx) => {
        const posePreset = ALL_POSES.find(p => p.id === charManifest.poseId);
        if (!posePreset) {
          log.warn(`Pose not found: ${charManifest.poseId} for character ${charManifest.label}`);
          return;
        }

        if (rigEntries[idx]) {
          const [rigId] = rigEntries[idx];
          Object.entries(posePreset.pose).forEach(([boneName, rotation]) => {
            if (rotation) {
              setBoneRotation(rigId, boneName, rotation);
            }
          });
          charactersApplied++;
          report('characters', (idx + 1) / characters.length, `Pose brukt: ${charManifest.label}`);
        } else {
          log.debug(`No rig available for character index ${idx} (${charManifest.label}) — pose will apply when rig is loaded`);
        }
      });

      report('characters', 1, `${charactersApplied} karakterpose(r) brukt`);
    } else {
      report('characters', 1, 'Ingen karakterer i denne scenen');
    }

    // ── PHASE 4: Done ─────────────────────────────────────────────────
    report('done', 1, `Scene klar: ${preset.navn}`);

    const result: StorySceneLoadResult = { preset, propsLoaded, charactersApplied };

    window.dispatchEvent(new CustomEvent('ch-story-scene-loaded', { detail: result }));
    log.info('Story scene loaded — event dispatched', result);

    return result;
  }

  /**
   * Returns the preset that was last loaded (or null if none).
   */
  getCurrentPreset(): ScenarioPreset | null {
    return this.currentPreset;
  }

  /**
   * Apply a pose to a specific rig by ID (called from MultiviewSkeletonPanel
   * when the user adjusts bones via the inspector).
   */
  applyBoneOverridesToRig(
    rigId: string,
    boneOverrides: Record<string, { x: number; y: number; z: number }>,
  ): void {
    const { setBoneRotation } = useSkeletalAnimationStore.getState();
    Object.entries(boneOverrides).forEach(([boneName, rotation]) => {
      setBoneRotation(rigId, boneName, rotation);
    });
    log.debug(`Applied ${Object.keys(boneOverrides).length} bone override(s) to rig ${rigId}`);
  }

  /**
   * Apply a full pose preset to a rig, clearing previous bone overrides.
   */
  applyPoseToRig(rigId: string, poseId: string): void {
    const posePreset = ALL_POSES.find(p => p.id === poseId);
    if (!posePreset) {
      log.warn(`Pose not found: ${poseId}`);
      return;
    }

    const { setBoneRotation, resetAllBones } = useSkeletalAnimationStore.getState();
    resetAllBones(rigId);

    Object.entries(posePreset.pose).forEach(([boneName, rotation]) => {
      if (rotation) {
        setBoneRotation(rigId, boneName, rotation);
      }
    });

    log.info(`Applied pose "${posePreset.name}" to rig ${rigId}`);
  }
}

export const storySceneLoaderService = new StorySceneLoaderService();
