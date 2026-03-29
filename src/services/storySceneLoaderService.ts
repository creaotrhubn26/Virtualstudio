/**
 * StorySceneLoaderService
 *
 * Orchestrates loading of a complete story scene preset:
 * 1. Clears previous story characters
 * 2. Applies lighting via window.virtualStudio.applyScenarioPreset()
 * 3. Loads props via propRenderingService.loadStorySceneProps()
 * 4. Dispatches 'ch-load-story-character' for each manifest character
 *    (NEW multi-character path in main.ts — does NOT replace existing chars)
 * 5. Listens for 'ch-story-rig-ready' events to build storyRigId → rigId map
 * 6. Applies PoseLibrary presets deterministically by storyRigId
 * 7. Emits 'ch-story-scene-loaded' when fully done
 */

import { ScenarioPreset, scenarioPresets } from '../data/scenarioPresets';
import { propRenderingService } from '../core/services/propRenderingService';
import { useSkeletalAnimationStore } from './skeletalAnimationService';
import { ALL_POSES } from '../core/animation/PoseLibrary';
import { getAvatarModelUrl, getAvatarSkinHex, getAvatarDefinition } from '../core/data/avatarDefinitions';
import { logger } from '../core/services/logger';

const log = logger.module('StorySceneLoader');

// How long to wait for all story rigs to report ready (ms)
const RIG_WAIT_TIMEOUT_MS = 10000;
// Extra settle time after all rigs ready before applying poses
const RIG_SETTLE_MS = 400;

export interface StorySceneLoadProgress {
  phase: 'environment' | 'clear' | 'lights' | 'props' | 'characters' | 'poses' | 'done' | 'error';
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
  // storyRigId → actual Zustand rigId (populated as 'ch-story-rig-ready' fires)
  private storyRigIdToRigId: Map<string, string> = new Map();

  /**
   * Wait until all given storyRigIds have been mapped to actual rigIds,
   * or until timeout expires.
   */
  private waitForStoryRigs(
    storyRigIds: string[],
    timeoutMs: number,
    onProgress?: (ready: number, total: number) => void,
  ): Promise<Map<string, string>> {
    return new Promise(resolve => {
      const mapping = new Map<string, string>();
      const deadline = Date.now() + timeoutMs;

      const onReady = (e: Event) => {
        const { storyRigId, rigId } = (e as CustomEvent).detail;
        if (storyRigIds.includes(storyRigId)) {
          mapping.set(storyRigId, rigId);
          onProgress?.(mapping.size, storyRigIds.length);
          log.debug(`Rig ready: ${storyRigId} → ${rigId} (${mapping.size}/${storyRigIds.length})`);
        }
        if (mapping.size >= storyRigIds.length) {
          window.removeEventListener('ch-story-rig-ready', onReady);
          resolve(mapping);
        }
      };

      window.addEventListener('ch-story-rig-ready', onReady);

      // Timeout fallback
      const timer = setInterval(() => {
        if (mapping.size >= storyRigIds.length || Date.now() >= deadline) {
          clearInterval(timer);
          window.removeEventListener('ch-story-rig-ready', onReady);
          resolve(mapping);
        }
      }, 300);
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
    this.storyRigIdToRigId.clear();
    log.info(`Loading story scene: ${preset.navn}`);

    const report = (phase: StorySceneLoadProgress['phase'], progress: number, message: string) => {
      onProgress?.({ phase, progress, message });
      log.debug(`[${phase}] ${Math.round(progress * 100)}% — ${message}`);
    };

    const vs = window.virtualStudio;

    // ── PHASE 0a: Clear previous scene ───────────────────────────────
    report('clear', 0, 'Rydder forrige scene…');
    window.dispatchEvent(new CustomEvent('ch-clear-story-characters'));
    propRenderingService.clearEnvironment();
    await new Promise(r => setTimeout(r, 200));
    report('clear', 1, 'Forrige scene fjernet');

    // ── PHASE 0b: Environment GLB ─────────────────────────────────────
    if (preset.environmentUrl) {
      report('environment', 0, 'Laster miljø…');
      if (vs?.scene) {
        propRenderingService.setScene(vs.scene);
      }
      await propRenderingService.loadEnvironment(preset.environmentUrl, 10);
      report('environment', 1, 'Miljø lastet');
    }

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

      // Clear previously loaded story props before loading new ones
      propRenderingService.clearAllProps();

      const loadedProps = await propRenderingService.loadStorySceneProps(
        preset.props,
        (progress, label) => report('props', progress, `Laster prop: ${label}`),
      );

      propsLoaded = loadedProps.size;
      report('props', 1, `${propsLoaded} av ${preset.props.length} props lastet`);
    } else {
      report('props', 1, 'Ingen props i denne scenen');
    }

    // ── PHASE 3: Characters — dispatch load events ────────────────────
    const characters = preset.characters ?? [];
    let charactersLoaded = 0;
    let posesApplied = 0;

    if (characters.length > 0) {
      report('characters', 0, 'Laster karakterer…');

      const storyRigIds = characters.map(c => c.id);

      characters.forEach((charManifest, idx) => {
        const modelUrl = getAvatarModelUrl(charManifest.avatarType);
        log.info(`Dispatching story character: ${charManifest.label} (${charManifest.avatarType})`);

        const skinHex = getAvatarSkinHex(charManifest.avatarType);

        const avatarDef = getAvatarDefinition(charManifest.avatarType);
        const height = charManifest.height ?? avatarDef?.defaultHeight ?? 1.75;

        window.dispatchEvent(new CustomEvent('ch-load-story-character', {
          detail: {
            modelUrl,
            name: charManifest.label,
            skinTone: skinHex,
            height,
            position: charManifest.position,
            rotation: charManifest.rotation ?? [0, 0, 0],
            storyRigId: charManifest.id,
          },
        }));

        charactersLoaded++;
        report('characters', (idx + 1) / characters.length, `Laster: ${charManifest.label}`);
      });

      // ── PHASE 4: Wait for rigs, then apply poses ──────────────────
      report('poses', 0, 'Venter på karakterrigg…');

      const rigMapping = await this.waitForStoryRigs(
        storyRigIds,
        RIG_WAIT_TIMEOUT_MS,
        (ready, total) => report('poses', ready / total * 0.7, `${ready}/${total} rigger klare…`),
      );

      // Store mapping for live bone control
      rigMapping.forEach((rigId, storyRigId) => {
        this.storyRigIdToRigId.set(storyRigId, rigId);
      });

      // Runtime assertion: warn clearly if characters have no rig (skeleton/IK will not work)
      const unrigged = storyRigIds.filter(id => !rigMapping.has(id));
      if (unrigged.length > 0) {
        const msg = `[StoryScene] ${unrigged.length} karakter(er) mangler rigg etter lasting: ${unrigged.join(', ')} — skjelett/IK vil ikke fungere for disse`;
        log.warn(msg);
        console.error(msg);
        report('error', 0, `${unrigged.length} karakter(er) uten rigg — kontrollér konsollen`);
      }

      // Extra settle time
      await new Promise(r => setTimeout(r, RIG_SETTLE_MS));

      const { setBoneRotation } = useSkeletalAnimationStore.getState();

      characters.forEach((charManifest, idx) => {
        const rigId = rigMapping.get(charManifest.id);
        if (!rigId) {
          log.warn(`No rigId mapped for ${charManifest.id} — pose skipped`);
          return;
        }

        const posePreset = ALL_POSES.find(p => p.id === charManifest.poseId);
        if (!posePreset) {
          log.warn(`Pose not found: ${charManifest.poseId} for ${charManifest.label}`);
          return;
        }

        let applied = 0;
        Object.entries(posePreset.pose).forEach(([boneName, rotation]) => {
          if (rotation) {
            setBoneRotation(rigId, boneName, rotation);
            applied++;
          }
        });

        if (applied > 0) {
          posesApplied++;
          report('poses', 0.7 + (idx + 1) / characters.length * 0.3, `Pose brukt: ${charManifest.label}`);
          log.info(`Applied pose "${posePreset.name}" (${applied} bones) to rigId=${rigId}`);
        }
      });

      report('poses', 1, `${posesApplied} pose(r) brukt på ${characters.length} karakter(er)`);
    } else {
      report('characters', 1, 'Ingen karakterer i denne scenen');
    }

    // ── DONE ──────────────────────────────────────────────────────────
    report('done', 1, `Scene klar: ${preset.navn}`);

    const result: StorySceneLoadResult = { preset, propsLoaded, charactersLoaded, posesApplied };
    window.dispatchEvent(new CustomEvent('ch-story-scene-loaded', { detail: result }));
    log.info('Story scene loaded', result);

    return result;
  }

  /**
   * Returns the preset that was last loaded (or null if none).
   */
  getCurrentPreset(): ScenarioPreset | null {
    return this.currentPreset;
  }

  /**
   * Get the Zustand rigId for a given storyRigId.
   * Returns undefined if the rig hasn't been loaded yet.
   */
  getRigId(storyRigId: string): string | undefined {
    return this.storyRigIdToRigId.get(storyRigId);
  }

  /**
   * Apply specific bone overrides to a live Babylon rig by storyRigId or rigId.
   */
  applyBoneOverridesToRig(
    rigId: string,
    boneOverrides: Record<string, { x: number; y: number; z: number; pos_x?: number; pos_y?: number; pos_z?: number }>,
  ): void {
    const { setBoneRotation, setBonePosition } = useSkeletalAnimationStore.getState();
    Object.entries(boneOverrides).forEach(([boneName, override]) => {
      setBoneRotation(rigId, boneName, { x: override.x, y: override.y, z: override.z });
      if (override.pos_x !== undefined || override.pos_y !== undefined || override.pos_z !== undefined) {
        setBonePosition(rigId, boneName, {
          x: override.pos_x ?? 0,
          y: override.pos_y ?? 0,
          z: override.pos_z ?? 0,
        });
      }
    });
    log.debug(`Applied ${Object.keys(boneOverrides).length} bone override(s) to rig ${rigId}`);
  }

  /**
   * Apply a full pose preset to a rig, resetting previous bone overrides first.
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
      if (rotation) setBoneRotation(rigId, boneName, rotation);
    });

    log.info(`Applied pose "${posePreset.name}" to rig ${rigId}`);
  }
}

export const storySceneLoaderService = new StorySceneLoaderService();

// Test helper — expose service on window so Playwright can trigger scene loads
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).__storyLoader = {
    loadById: (presetId: string) => {
      const preset = scenarioPresets.find(p => p.id === presetId);
      if (!preset) {
        console.warn(`[StoryLoader] Preset not found: ${presetId}`);
        return Promise.resolve(null);
      }
      return storySceneLoaderService.load(preset);
    },
    listPresets: () => scenarioPresets.map(p => ({ id: p.id, navn: p.navn })),
  };
}
