/**
 * Material LOD Manager - Phase 2B
 * 
 * Implements Level-of-Detail system for materials with:
 * - 4 quality levels: HIGH, MEDIUM, LOW, MINIMAL
 * - Distance-based auto-selection
 * - Intelligent effect disable/reduce for distant avatars
 * - Texture batching and caching
 * - Performance scaling for 20+ avatars
 */

import { Mesh, Camera, Vector3 } from '@babylonjs/core';
import { AnimationMaterialController } from './animationMaterialController';

/**
 * LOD quality levels
 */
export enum LODLevel {
  HIGH = 'HIGH',       // Full quality, all effects
  MEDIUM = 'MEDIUM',   // Standard quality, most effects
  LOW = 'LOW',         // Basic quality, reduced effects
  MINIMAL = 'MINIMAL'  // Minimal quality, flat shading only
}

/**
 * LOD configuration for material effects
 */
interface LODConfig {
  level: LODLevel;
  
  // Material property precision
  roughnessEnabled: boolean;
  metallicEnabled: boolean;
  normalMapIntensity: number;
  ssEnabled: boolean;
  clearcoatEnabled: boolean;
  
  // Animation material effects
  exertionEffectsEnabled: boolean;
  emotionEffectsEnabled: boolean;
  
  // Material interpolation
  interpolationEnabled: boolean;
  interpolationDuration: number;
  
  // Normal recalculation
  normalRecalcEnabled: boolean;
  normalRecalcFrequency: number; // Update every N frames
  
  // Texture quality
  textureResolutionScale: number; // 1.0 = full, 0.5 = half, 0.25 = quarter
  
  // Update frequency
  updateFrequencyMs: number; // How often to check distance-based LOD
}

/**
 * Avatar LOD state
 */
interface AvatarLODState {
  rigId: string;
  mesh: Mesh;
  currentLOD: LODLevel;
  distance: number;
  lastUpdateTime: number;
  lastLODChangeTime: number;
  activeConfig: LODConfig;
  cachedMaterials: Map<string, any>;
}

/**
 * LOD distance thresholds
 */
interface LODDistanceThresholds {
  highToMedium: number;  // Distance where LOD downgrades from HIGH to MEDIUM
  mediumToLow: number;   // Distance where LOD downgrades from MEDIUM to LOW
  lowToMinimal: number;  // Distance where LOD downgrades from LOW to MINIMAL
}

/**
 * Material LOD Manager
 * 
 * Example usage:
 * ```typescript
 * const lodManager = new MaterialLODManager();
 * lodManager.registerRig(rigId, mesh, camera, animationMaterialController);
 * 
 * // Each frame:
 * lodManager.update(deltaTime);
 * ```
 */
export class MaterialLODManager {
  private avatarStates: Map<string, AvatarLODState> = new Map();
  private camera: Camera | null = null;
  private materialController: AnimationMaterialController | null = null;
  
  private lodConfigs: Map<LODLevel, LODConfig> = new Map();
  private distanceThresholds: LODDistanceThresholds = {
    highToMedium: 5,
    mediumToLow: 15,
    lowToMinimal: 30
  };

  private enableAutoLOD: boolean = true;
  private updateFrequency: number = 250; // Check LOD every 250ms

  constructor() {
    this.initializeLODConfigs();
  }

  /**
   * Initialize LOD configuration presets
   */
  private initializeLODConfigs(): void {
    // HIGH: Full quality, all effects enabled
    this.lodConfigs.set(LODLevel.HIGH, {
      level: LODLevel.HIGH,
      roughnessEnabled: true,
      metallicEnabled: true,
      normalMapIntensity: 1.0,
      ssEnabled: true,
      clearcoatEnabled: true,
      exertionEffectsEnabled: true,
      emotionEffectsEnabled: true,
      interpolationEnabled: true,
      interpolationDuration: 0.3,
      normalRecalcEnabled: true,
      normalRecalcFrequency: 1, // Every frame
      textureResolutionScale: 1.0,
      updateFrequencyMs: 16 // ~60 FPS
    });

    // MEDIUM: Standard quality, full emotion but reduced exertion effects
    this.lodConfigs.set(LODLevel.MEDIUM, {
      level: LODLevel.MEDIUM,
      roughnessEnabled: true,
      metallicEnabled: true,
      normalMapIntensity: 0.8,
      ssEnabled: true,
      clearcoatEnabled: true,
      exertionEffectsEnabled: true,
      emotionEffectsEnabled: true,
      interpolationEnabled: true,
      interpolationDuration: 0.4,
      normalRecalcEnabled: true,
      normalRecalcFrequency: 2, // Every 2 frames
      textureResolutionScale: 1.0,
      updateFrequencyMs: 33 // ~30 FPS
    });

    // LOW: Basic quality, emotion only, no exertion
    this.lodConfigs.set(LODLevel.LOW, {
      level: LODLevel.LOW,
      roughnessEnabled: true,
      metallicEnabled: false,
      normalMapIntensity: 0.5,
      ssEnabled: false,
      clearcoatEnabled: false,
      exertionEffectsEnabled: false,
      emotionEffectsEnabled: true,
      interpolationEnabled: true,
      interpolationDuration: 0.5,
      normalRecalcEnabled: false,
      normalRecalcFrequency: 5, // Every 5 frames
      textureResolutionScale: 0.75,
      updateFrequencyMs: 100 // ~10 FPS
    });

    // MINIMAL: Extremely lightweight, baseline materials only
    this.lodConfigs.set(LODLevel.MINIMAL, {
      level: LODLevel.MINIMAL,
      roughnessEnabled: false,
      metallicEnabled: false,
      normalMapIntensity: 0.0,
      ssEnabled: false,
      clearcoatEnabled: false,
      exertionEffectsEnabled: false,
      emotionEffectsEnabled: false,
      interpolationEnabled: false,
      interpolationDuration: 0.0,
      normalRecalcEnabled: false,
      normalRecalcFrequency: 10, // Every 10 frames
      textureResolutionScale: 0.5,
      updateFrequencyMs: 200 // ~5 FPS
    });
  }

  /**
   * Register a character rig for LOD management
   */
  registerRig(
    rigId: string,
    mesh: Mesh,
    camera: Camera,
    materialController: AnimationMaterialController
  ): void {
    this.camera = camera;
    this.materialController = materialController;

    const initialConfig = this.lodConfigs.get(LODLevel.HIGH)!;

    this.avatarStates.set(rigId, {
      rigId,
      mesh,
      currentLOD: LODLevel.HIGH,
      distance: 0,
      lastUpdateTime: Date.now(),
      lastLODChangeTime: Date.now(),
      activeConfig: { ...initialConfig },
      cachedMaterials: new Map()
    });
  }

  /**
   * Unregister a character rig
   */
  unregisterRig(rigId: string): void {
    this.avatarStates.delete(rigId);
  }

  /**
   * Update LOD for all registered rigs
   */
  update(deltaTime: number): void {
    if (!this.camera || !this.enableAutoLOD) return;

    if (deltaTime > 0.05) {
      this.updateFrequency = Math.min(1000, this.updateFrequency + 50);
    } else if (deltaTime > 0 && deltaTime < 0.02) {
      this.updateFrequency = Math.max(100, this.updateFrequency - 25);
    }

    const now = Date.now();

    for (const state of this.avatarStates.values()) {
      // Check distance periodically
      if (now - state.lastUpdateTime >= this.updateFrequency) {
        this.updateRigLOD(state);
        state.lastUpdateTime = now;
      }
    }
  }

  /**
   * Update LOD for a single rig based on distance
   */
  private updateRigLOD(state: AvatarLODState): void {
    if (!this.camera) return;

    // Calculate distance from camera to mesh
    const distance = Vector3.Distance(this.camera.position, state.mesh.getAbsolutePosition());
    state.distance = distance;

    // Determine new LOD based on distance
    let newLOD: LODLevel;
    if (distance < this.distanceThresholds.highToMedium) {
      newLOD = LODLevel.HIGH;
    } else if (distance < this.distanceThresholds.mediumToLow) {
      newLOD = LODLevel.MEDIUM;
    } else if (distance < this.distanceThresholds.lowToMinimal) {
      newLOD = LODLevel.LOW;
    } else {
      newLOD = LODLevel.MINIMAL;
    }

    // Apply LOD change if needed
    if (newLOD !== state.currentLOD) {
      this.applyLODChange(state, newLOD);
    }
  }

  /**
   * Apply LOD change to a rig's materials
   */
  private applyLODChange(state: AvatarLODState, newLOD: LODLevel): void {
    const oldConfig = state.activeConfig;
    const newConfig = this.lodConfigs.get(newLOD)!;

    state.currentLOD = newLOD;
    state.activeConfig = { ...newConfig };
    state.lastLODChangeTime = Date.now();

    // Update material properties based on new LOD
    this.updateMaterialsForLOD(state, newConfig);

    console.log(`[LOD] ${state.rigId}: ${oldConfig.level} → ${newLOD} (distance: ${state.distance.toFixed(1)}m)`);
  }

  /**
   * Update material properties for new LOD level
   */
  private updateMaterialsForLOD(state: AvatarLODState, config: LODConfig): void {
    const materials = state.mesh.material ? [state.mesh.material] : [];

    for (const material of materials) {
      if (!material) continue;

      // Update PBR material properties based on LOD
      if ('roughness' in material && !config.roughnessEnabled) {
        material.roughness = 0.5; // Default mid-range
      }

      if ('metallic' in material && !config.metallicEnabled) {
        material.metallic = 0;
      }

      if ('bumpTexture' in material && config.normalMapIntensity < 1.0) {
        // Reduce normal map intensity by modifying material properties
        if ('normalMapIntensity' in material) {
          material.normalMapIntensity = config.normalMapIntensity;
        }
      }

      // Disable expensive effects for distant avatars
      if ('subSurface' in material) {
        (material as unknown as { subSurface: { isTranslucencyEnabled: boolean } }).subSurface.isTranslucencyEnabled = config.ssEnabled;
      }

      if ('clearCoat' in material) {
        (material as unknown as { clearCoat: { isEnabled: boolean } }).clearCoat.isEnabled = config.clearcoatEnabled;
      }
    }

    // Notify material controller of LOD change
    if (this.materialController) {
      this.materialController.setLODConfig(state.rigId, config);
    }
  }

  /**
   * Set distance thresholds for LOD transitions
   */
  setDistanceThresholds(thresholds: Partial<LODDistanceThresholds>): void {
    this.distanceThresholds = {
      ...this.distanceThresholds,
      ...thresholds
    };
  }

  /**
   * Force a specific LOD level for a rig
   */
  forceLOD(rigId: string, lodLevel: LODLevel): void {
    const state = this.avatarStates.get(rigId);
    if (!state) return;

    this.applyLODChange(state, lodLevel);
  }

  /**
   * Get current LOD for a rig
   */
  getCurrentLOD(rigId: string): LODLevel | null {
    return this.avatarStates.get(rigId)?.currentLOD ?? null;
  }

  /**
   * Get current distance for a rig
   */
  getDistance(rigId: string): number {
    return this.avatarStates.get(rigId)?.distance ?? -1;
  }

  /**
   * Enable/disable automatic LOD switching
   */
  setAutoLODEnabled(enabled: boolean): void {
    this.enableAutoLOD = enabled;
  }

  /**
   * Get LOD configuration for a level
   */
  getLODConfig(lodLevel: LODLevel): LODConfig | undefined {
    return this.lodConfigs.get(lodLevel);
  }

  /**
   * Update LOD configuration for a level
   */
  setLODConfig(lodLevel: LODLevel, config: Partial<LODConfig>): void {
    const existing = this.lodConfigs.get(lodLevel);
    if (existing) {
      this.lodConfigs.set(lodLevel, { ...existing, ...config });
    }
  }

  /**
   * Get performance metrics for current LOD state
   */
  getPerformanceMetrics(): {
    totalAvatars: number;
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
    minimalQuality: number;
    estimatedCPUMs: number;
  } {
    let high = 0, medium = 0, low = 0, minimal = 0;

    for (const state of this.avatarStates.values()) {
      switch (state.currentLOD) {
        case LODLevel.HIGH: high++; break;
        case LODLevel.MEDIUM: medium++; break;
        case LODLevel.LOW: low++; break;
        case LODLevel.MINIMAL: minimal++; break;
      }
    }

    // Estimate CPU impact: HIGH=3ms, MEDIUM=2ms, LOW=1ms, MINIMAL=0.3ms
    const estimatedCPUMs =
      high * 3 +
      medium * 2 +
      low * 1 +
      minimal * 0.3;

    return {
      totalAvatars: this.avatarStates.size,
      highQuality: high,
      mediumQuality: medium,
      lowQuality: low,
      minimalQuality: minimal,
      estimatedCPUMs: estimatedCPUMs
    };
  }

  /**
   * Log LOD status for all rigs
   */
  logStatus(): void {
    console.log('\n═══════════════════════════════════════');
    console.log('Material LOD Status');
    console.log('═══════════════════════════════════════');

    const metrics = this.getPerformanceMetrics();

    for (const state of this.avatarStates.values()) {
      console.log(
        `${state.rigId.padEnd(16)} | ${state.currentLOD.padEnd(8)} | ${state.distance.toFixed(1).padStart(6)}m`
      );
    }

    console.log('─────────────────────────────────────');
    console.log(`Total: ${metrics.totalAvatars} avatars`);
    console.log(`  HIGH: ${metrics.highQuality}  MEDIUM: ${metrics.mediumQuality}  LOW: ${metrics.lowQuality}  MINIMAL: ${metrics.minimalQuality}`);
    console.log(`Est. CPU: ${metrics.estimatedCPUMs.toFixed(1)}ms`);
    console.log('═══════════════════════════════════════\n');
  }
}

export type { LODConfig, AvatarLODState, LODDistanceThresholds };
