/**
 * AnimationComposerService - Bridge between Animation Composer UI and VirtualStudio
 * Connects the React-based composer panel to the Babylon.js scene
 */

import * as BABYLON from '@babylonjs/core';
import { sceneGraphAnimationEngine, AnimationClip, AnimationTrack, Keyframe } from '../core/animation/SceneGraphAnimationEngine';
import { useAnimationComposerStore, AnimationSequence, AnimationLayer, AnimationBehavior, TrackingConfig } from '../state/animationComposerStore';

// Type for VirtualStudio tracking config
interface LightTrackingConfig {
  mode: 'none' | 'lookAt' | 'follow' | 'followWithOffset' | 'orbit' | 'mirror' | 'inverse' | 'parallel' | 'elastic' | 'leadFollow';
  targetId: string | null;
  targetType: 'light' | 'mesh' | 'camera' | 'point' | 'actor';
  offset: { x: number; y: number; z: number };
  smoothing: number;
  orbitSpeed?: number;
  orbitRadius?: number;
}

class AnimationComposerService {
  private virtualStudio: any = null;
  private activeClipId: string | null = null;
  private activeBehaviorIds: Map<string, string[]> = new Map(); // layerId -> behaviorIds
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize the service with VirtualStudio reference
   */
  initialize(studio: any): void {
    this.virtualStudio = studio;
    this.setupStoreSubscription();
    this.syncAvailableTargets();
    console.log('[AnimationComposerService] Initialized');
  }

  /**
   * Subscribe to store changes and sync with VirtualStudio
   */
  private setupStoreSubscription(): void {
    this.unsubscribe = useAnimationComposerStore.subscribe((state, prevState) => {
      // Sync tracking changes
      if (state.activeSequence !== prevState.activeSequence) {
        this.syncTrackingConfigs(state.activeSequence);
        this.syncBehaviors(state.activeSequence);
      }

      // Sync playback state
      if (state.isPlaying !== prevState.isPlaying) {
        if (state.isPlaying) {
          this.startPlayback();
        } else {
          this.pausePlayback();
        }
      }
    });
  }

  /**
   * Sync available targets from VirtualStudio to store
   */
  syncAvailableTargets(): void {
    if (!this.virtualStudio) return;

    const targets = this.virtualStudio.getTrackableTargets?.() || [];
    useAnimationComposerStore.getState().setAvailableTargets(
      targets.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type,
      }))
    );
  }

  /**
   * Sync tracking configurations to VirtualStudio
   */
  private syncTrackingConfigs(sequence: AnimationSequence | null): void {
    if (!this.virtualStudio || !sequence) return;

    sequence.layers.forEach(layer => {
      if (layer.tracking && layer.tracking.mode !== 'none') {
        const config: LightTrackingConfig = {
          mode: layer.tracking.mode,
          targetId: layer.tracking.targetId,
          targetType: layer.tracking.targetType,
          offset: layer.tracking.offset || { x: 0, y: 0, z: 0 },
          smoothing: layer.tracking.smoothing,
        };
        this.virtualStudio.setLightTracking?.(layer.targetId, config);
      } else {
        this.virtualStudio.setLightTracking?.(layer.targetId, null);
      }
    });
  }

  /**
   * Sync behaviors to VirtualStudio
   */
  private syncBehaviors(sequence: AnimationSequence | null): void {
    if (!this.virtualStudio || !sequence) return;

    // Stop all previous behaviors
    this.activeBehaviorIds.forEach((ids, layerId) => {
      ids.forEach(id => this.virtualStudio.stopLightBehavior?.(id));
    });
    this.activeBehaviorIds.clear();

    // Start new behaviors
    sequence.layers.forEach(layer => {
      if (!layer.enabled) return;

      const behaviorIds: string[] = [];
      layer.behaviors.filter(b => b.enabled).forEach(behavior => {
        const id = this.virtualStudio.startLightBehavior?.(
          layer.targetId,
          behavior.type,
          {
            speed: behavior.speed,
            amplitude: behavior.amplitude,
            radius: behavior.radius,
            axis: behavior.axis === 'x' ? 0 : behavior.axis === 'y' ? 1 : behavior.axis === 'z' ? 2 : 1,
          }
        );
        if (id) behaviorIds.push(id);
      });
      this.activeBehaviorIds.set(layer.id, behaviorIds);
    });
  }

  /**
   * Start playback
   */
  private startPlayback(): void {
    const state = useAnimationComposerStore.getState();
    if (!state.activeSequence) return;

    // Create or get clip in SceneGraphAnimationEngine
    let clip = sceneGraphAnimationEngine.getClip(state.activeSequence.id);
    if (!clip) {
      clip = sceneGraphAnimationEngine.createClip(
        state.activeSequence.name,
        state.activeSequence.duration
      );
    }

    this.activeClipId = clip.id;
    sceneGraphAnimationEngine.play(clip.id);
  }

  /**
   * Pause playback
   */
  private pausePlayback(): void {
    if (this.activeClipId) {
      sceneGraphAnimationEngine.pause(this.activeClipId);
    }
  }

  /**
   * Apply animation value to wall
   */
  applyWallAnimation(wallId: string, property: string, value: number): void {
    if (!this.virtualStudio) return;
    
    const scene = this.virtualStudio.scene;
    if (!scene) return;
    
    const wall = scene.getMeshById(wallId);
    if (!wall) return;
    
    switch (property) {
      case 'material.emissiveIntensity':
        if (wall.material) {
          (wall.material as any).emissiveIntensity = value;
        }
        break;
      case 'material.roughness':
        if (wall.material) {
          (wall.material as any).roughness = value;
        }
        break;
      case 'material.metallic':
        if (wall.material) {
          (wall.material as any).metallic = value;
        }
        break;
      case 'material.color.r':
        if (wall.material && (wall.material as any).diffuseColor) {
          (wall.material as any).diffuseColor.r = value;
        }
        break;
      case 'material.color.g':
        if (wall.material && (wall.material as any).diffuseColor) {
          (wall.material as any).diffuseColor.g = value;
        }
        break;
      case 'material.color.b':
        if (wall.material && (wall.material as any).diffuseColor) {
          (wall.material as any).diffuseColor.b = value;
        }
        break;
      case 'position.x':
        wall.position.x = value;
        break;
      case 'position.y':
        wall.position.y = value;
        break;
      case 'position.z':
        wall.position.z = value;
        break;
      case 'rotation.x':
        wall.rotation.x = value;
        break;
      case 'rotation.y':
        wall.rotation.y = value;
        break;
      case 'rotation.z':
        wall.rotation.z = value;
        break;
      case 'scale.x':
        wall.scaling.x = value;
        break;
      case 'scale.y':
        wall.scaling.y = value;
        break;
      case 'scale.z':
        wall.scaling.z = value;
        break;
    }
  }

  /**
   * Apply animation value to floor
   */
  applyFloorAnimation(floorId: string, property: string, value: number): void {
    if (!this.virtualStudio) return;
    
    const scene = this.virtualStudio.scene;
    if (!scene) return;
    
    const floor = scene.getMeshById(floorId);
    if (!floor) return;
    
    switch (property) {
      case 'material.reflectivity':
        if (floor.material) {
          (floor.material as any).reflectivity = value;
        }
        break;
      case 'material.roughness':
        if (floor.material) {
          (floor.material as any).roughness = value;
        }
        break;
      case 'material.color.r':
        if (floor.material && (floor.material as any).diffuseColor) {
          (floor.material as any).diffuseColor.r = value;
        }
        break;
      case 'material.color.g':
        if (floor.material && (floor.material as any).diffuseColor) {
          (floor.material as any).diffuseColor.g = value;
        }
        break;
      case 'material.color.b':
        if (floor.material && (floor.material as any).diffuseColor) {
          (floor.material as any).diffuseColor.b = value;
        }
        break;
      case 'position.x':
        floor.position.x = value;
        break;
      case 'position.y':
        floor.position.y = value;
        break;
      case 'position.z':
        floor.position.z = value;
        break;
    }
  }

  /**
   * Apply animation value to atmosphere
   */
  applyAtmosphereAnimation(property: string, value: number): void {
    if (!this.virtualStudio) return;
    
    const scene = this.virtualStudio.scene;
    if (!scene) return;
    
    switch (property) {
      case 'fog.density':
        scene.fogDensity = value;
        break;
      case 'fog.color.r':
        if (scene.fogColor) {
          const current = scene.fogColor;
          scene.fogColor = new BABYLON.Color3(value, current.g, current.b);
        }
        break;
      case 'fog.color.g':
        if (scene.fogColor) {
          const current = scene.fogColor;
          scene.fogColor = new BABYLON.Color3(current.r, value, current.b);
        }
        break;
      case 'fog.color.b':
        if (scene.fogColor) {
          const current = scene.fogColor;
          scene.fogColor = new BABYLON.Color3(current.r, current.g, value);
        }
        break;
      case 'ambient.intensity':
        if (scene.ambientColor) {
          const baseColor = this.virtualStudio.getBaseAmbientColor?.() || new BABYLON.Color3(0.2, 0.2, 0.2);
          scene.ambientColor = new BABYLON.Color3(
            baseColor.r * value,
            baseColor.g * value,
            baseColor.b * value
          );
        }
        break;
      case 'ambient.color.r':
        if (scene.ambientColor) {
          const current = scene.ambientColor;
          scene.ambientColor = new BABYLON.Color3(value, current.g, current.b);
        }
        break;
      case 'ambient.color.g':
        if (scene.ambientColor) {
          const current = scene.ambientColor;
          scene.ambientColor = new BABYLON.Color3(current.r, value, current.b);
        }
        break;
      case 'ambient.color.b':
        if (scene.ambientColor) {
          const current = scene.ambientColor;
          scene.ambientColor = new BABYLON.Color3(current.r, current.g, value);
        }
        break;
    }
  }

  /**
   * Apply keyframe value to target based on type
   */
  applyKeyframeValue(layer: AnimationLayer, property: string, value: number): void {
    switch (layer.targetType) {
      case 'wall':
        this.applyWallAnimation(layer.targetId, property, value);
        break;
      case 'floor':
        this.applyFloorAnimation(layer.targetId, property, value);
        break;
      case 'atmosphere':
        this.applyAtmosphereAnimation(property, value);
        break;
      // Other types handled elsewhere
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.unsubscribe?.();
    this.activeBehaviorIds.forEach((ids) => {
      ids.forEach(id => this.virtualStudio?.stopLightBehavior?.(id));
    });
    this.activeBehaviorIds.clear();
  }
}

export const animationComposerService = new AnimationComposerService();
export default animationComposerService;

