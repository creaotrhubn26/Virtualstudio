/**
 * StorySceneLoaderService
 *
 * Orchestrates loading of a complete story scene preset:
 * 1. Applies lighting via window.virtualStudio.applyScenarioPreset()
 * 2. Loads props via propRenderingService.loadStorySceneProps()
 * 3. Loads / positions characters by dispatching 'ch-load-character' events
 *    (same path as CharacterModelLoader — triggers loadCharacterModel in main.ts)
 * 4. Applies PoseLibrary presets to loaded rigs via useSkeletalAnimationStore.setBoneRotation()
 * 5. Emits 'ch-story-scene-loaded' event when complete
 *
 * Exposes progress updates throughout loading via callbacks.
 */

import { ScenarioPreset, StoryCharacterManifest } from '../data/scenarioPresets';
import { propRenderingService } from '../core/services/propRenderingService';
import { useSkeletalAnimationStore } from './skeletalAnimationService';
import { ALL_POSES } from '../core/animation/PoseLibrary';
import { logger } from '../core/services/logger';

const log = logger.module('StorySceneLoader');

// ─── Avatar type → model URL mapping (mirrors CharacterModelLoader registry) ─
const AVATAR_MODEL_URLS: Record<string, string> = {
  man:       '/models/avatars/avatar_man.glb',
  woman:     '/models/avatars/avatar_woman.glb',
  child:     '/models/avatars/avatar_child.glb',
  teenager:  '/models/avatars/avatar_teenager.glb',
  elderly:   '/models/avatars/avatar_elderly.glb',
  athlete:   '/models/avatars/avatar_athlete.glb',
  dancer:    '/models/avatars/avatar_dancer.glb',
  pregnant:  '/models/avatars/avatar_pregnant.glb',
  // fallback — public glb known to work
  generated: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
};

// ─── Pose apply delay — let the rig finish loading before applying joints ────
const RIG_LOAD_WAIT_MS = 1800;

// ─── How long we wait for a rig to appear after character load event ─────────
const RIG_WAIT_TIMEOUT_MS = 8000;

export interface StorySceneLoadProgress {
  phase: 'lights' | 'props' | 'characters' | 'poses' | 'done' | 'error';
  progress: number;
  message: string;
}

export type StorySceneProgressCallback = (p: StorySceneLoadProgress) => void;

export interface StorySceneLoadResult {
  preset: ScenarioPreset;
  propsLoaded: number;
  charactersLoaded: number;
  posesApplied: number;
}

class StorySceneLoaderService {
  private currentPreset: ScenarioPreset | null = null;

  /**
   * Wait until a specific number of rigs are loaded (or timeout).
   * The skeletal animation store is populated by main.ts when loadCharacterModel completes.
   */
  private waitForRigs(expectedCount: number, timeoutMs: number): Promise<void> {
    return new Promise(resolve => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        const { rigs } = useSkeletalAnimationStore.getState();
        if (rigs.size >= expectedCount || Date.now() >= deadline) {
          resolve();
        } else {
          setTimeout(check, 250);
        }
      };
      setTimeout(check, 250);
    });
  }

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

    const vs = (window as any).virtualStudio;

    // ── PHASE 1: Lights ───────────────────────────────────────────────
    report('lights', 0, 'Laster lys…');

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

      if (vs?.scene) {
        propRenderingService.setScene(vs.scene);
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

    // ── PHASE 3: Characters — load models ─────────────────────────────
    const characters = preset.characters ?? [];
    let charactersLoaded = 0;
    let posesApplied = 0;

    if (characters.length > 0) {
      report('characters', 0, 'Laster karakterer…');

      const rigCountBefore = useSkeletalAnimationStore.getState().rigs.size;

      characters.forEach((charManifest, idx) => {
        const modelUrl = AVATAR_MODEL_URLS[charManifest.avatarType] ?? AVATAR_MODEL_URLS['generated'];
        const [px, py, pz] = charManifest.position;

        log.info(`Loading character: ${charManifest.label} (${charManifest.avatarType}) → ${modelUrl}`);

        // Dispatch the same event that CharacterModelLoader fires
        window.dispatchEvent(new CustomEvent('ch-load-character', {
          detail: {
            modelUrl,
            name: charManifest.label,
            position: [px, py, pz],
            rotation: charManifest.rotation ?? [0, 0, 0],
            skinTone: 'medium',
            height: 1.75,
            storyRigId: charManifest.id,
          },
        }));

        charactersLoaded++;
        report('characters', (idx + 1) / characters.length, `Laster: ${charManifest.label}`);
      });

      // ── PHASE 4: Poses — wait for rigs then apply ─────────────────
      report('poses', 0, 'Venter på karakterrigg…');

      await this.waitForRigs(rigCountBefore + characters.length, RIG_WAIT_TIMEOUT_MS);

      // Short extra wait for rig initialisation
      await new Promise(r => setTimeout(r, RIG_LOAD_WAIT_MS));

      const { rigs, setBoneRotation } = useSkeletalAnimationStore.getState();
      const rigEntries = Array.from(rigs.entries());

      // Map new rigs (those added after rigCountBefore) to character manifests
      const newRigs = rigEntries.slice(rigCountBefore);

      characters.forEach((charManifest, idx) => {
        const posePreset = ALL_POSES.find(p => p.id === charManifest.poseId);
        if (!posePreset) {
          log.warn(`Pose not found: ${charManifest.poseId} for ${charManifest.label}`);
          return;
        }

        const rigEntry = newRigs[idx] ?? rigEntries[idx];
        if (!rigEntry) {
          log.warn(`No rig found for character index ${idx} (${charManifest.label})`);
          return;
        }

        const [rigId] = rigEntry;
        let applied = 0;
        Object.entries(posePreset.pose).forEach(([boneName, rotation]) => {
          if (rotation) {
            setBoneRotation(rigId, boneName, rotation);
            applied++;
          }
        });

        if (applied > 0) {
          posesApplied++;
          report('poses', (idx + 1) / characters.length, `Pose brukt: ${charManifest.label}`);
          log.info(`Applied pose "${posePreset.name}" (${applied} bones) to rig ${rigId}`);
        }
      });

      report('poses', 1, `${posesApplied} karakter-pose(r) brukt`);
    } else {
      report('characters', 1, 'Ingen karakterer i denne scenen');
    }

    // ── DONE ──────────────────────────────────────────────────────────
    report('done', 1, `Scene klar: ${preset.navn}`);

    const result: StorySceneLoadResult = { preset, propsLoaded, charactersLoaded, posesApplied };

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
   * Apply specific bone overrides to a live Babylon rig.
   * Called from MultiviewSkeletonPanel when the user adjusts bones via the inspector.
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
   * Apply a full pose preset to a rig, clearing previous bone overrides first.
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
