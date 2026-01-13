/**
 * Animation Material Controller
 * Dynamically adjusts avatar materials based on skeletal animation state
 * Supports exertion effects, facial expressions, and dynamic material properties
 */

import * as BABYLON from '@babylonjs/core';
import { AnimationClip, CharacterRig } from './skeletalAnimationService';
import { AVATAR_MATERIALS, AvatarMaterialDefinition } from '../data/avatarDefinitions';
import { EXERTION_MATERIAL_ADJUSTMENTS, ACTIVITY_PROFILES } from '../data/activityProfiles';
import { EMOTION_MATERIAL_PRESETS } from '../data/emotionPresets';
import { LODConfig, LODLevel } from './materialLODManager';

export interface MaterialState {
  roughness: number;
  metallic: number;
  albedoTint: BABYLON.Color3;
  albedoIntensity: number;
  subsurfaceScatteringIntensity: number;
  clearcoatIntensity: number;
  normalMapIntensity: number;
}

export interface ActivityState {
  intensity: number;  // 0-1
  duration: number;
  affectedParts: string[];
  type: 'idle' | 'walk' | 'run' | 'athletic' | 'combat' | 'custom';
}

export interface AnimationFrame {
  boneName: string;
  rotation: BABYLON.Quaternion;
  position: BABYLON.Vector3;
  velocity: number;
}

export class AnimationMaterialController {
  private rigs: Map<string, CharacterRig> = new Map();
  private materialStates: Map<string, Map<string, MaterialState>> = new Map();
  private activityStates: Map<string, ActivityState> = new Map();
  private baselineStates: Map<string, Map<string, MaterialState>> = new Map();
  private interpolationDuration: number = 0.3;  // 300ms blend time
  private interpolationTimers: Map<string, number> = new Map();
  private lastFramePositions: Map<string, Map<string, BABYLON.Vector3>> = new Map();
  private scene: BABYLON.Scene;
  private lodConfigs: Map<string, LODConfig> = new Map();  // LOD config per rig
  private currentLODs: Map<string, LODLevel> = new Map();  // Current LOD per rig

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Register a character rig for animation-material control
   */
  registerRig(rig: CharacterRig): void {
    this.rigs.set(rig.id, rig);
    
    // Initialize material states for all body parts
    this.materialStates.set(rig.id, new Map());
    this.baselineStates.set(rig.id, new Map());
    this.lastFramePositions.set(rig.id, new Map());
    
    // Store baseline materials from avatar definition
    const avatarDef = this.getAvatarDefinition(rig.id);
    if (avatarDef) {
      this.storeBaselineMaterials(rig.id, avatarDef);
    }
    
    // Initialize activity state
    this.activityStates.set(rig.id, {
      intensity: 0,
      duration: 0,
      affectedParts: [],
      type: 'idle'
    });
  }

  /**
   * Unregister a character rig
   */
  unregisterRig(rigId: string): void {
    this.rigs.delete(rigId);
    this.materialStates.delete(rigId);
    this.baselineStates.delete(rigId);
    this.activityStates.delete(rigId);
    this.interpolationTimers.delete(rigId);
    this.lastFramePositions.delete(rigId);
  }

  /**
   * Update material properties based on current animation state
   * Call this every frame
   */
  update(rigId: string, deltaTime: number): void {
    const rig = this.rigs.get(rigId);
    if (!rig || !rig.skeleton) return;

    // Calculate bone velocities
    const boneVelocities = this.calculateBoneVelocities(rig);
    
    // Determine activity level and type from animation
    const activity = this.analyzeActivity(rig, boneVelocities);
    this.activityStates.set(rigId, activity);
    
    // Update interpolation timer
    const timer = this.interpolationTimers.get(rigId) || 0;
    const newTimer = Math.max(0, timer - deltaTime);
    this.interpolationTimers.set(rigId, newTimer);
    
    const blendFactor = newTimer > 0 ? newTimer / this.interpolationDuration : 1.0;
    
    // Apply exertion effects to skin materials
    this.applyExertionEffects(rig, activity, blendFactor);
    
    // Update normal map intensity based on deformation
    this.updateDynamicNormals(rig, boneVelocities);
  }

  /**
   * Apply facial expression material changes
   */
  applyFacialExpression(
    rigId: string,
    emotion: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'custom',
    intensity: number = 0.7,
    customWeights?: Map<string, number>
  ): void {
    const rig = this.rigs.get(rigId);
    if (!rig || !rig.mesh) return;

    const meshes = rig.mesh.getChildMeshes();
    
    if (emotion === 'custom' && customWeights) {
      // Apply custom blend shape weights
      this.applyCustomExpression(rig, customWeights, intensity);
    } else {
      // Apply preset emotion
      const preset = EMOTION_MATERIAL_PRESETS[emotion];
      if (!preset) return;

      this.applyEmotionPreset(rig, preset, intensity);
    }
    
    // Start interpolation timer for smooth blending
    this.interpolationTimers.set(rigId, this.interpolationDuration);
  }

  /**
   * Reset all material properties to baseline
   */
  resetMaterials(rigId: string): void {
    const rig = this.rigs.get(rigId);
    if (!rig || !rig.mesh) return;

    const baselineStates = this.baselineStates.get(rigId);
    if (!baselineStates) return;

    const meshes = rig.mesh.getChildMeshes();
    meshes.forEach(mesh => {
      if (mesh.material && mesh.material instanceof BABYLON.PBRMaterial) {
        const baseline = baselineStates.get(mesh.name);
        if (baseline) {
          this.applyMaterialState(mesh.material, baseline);
        }
      }
    });

    this.activityStates.set(rigId, {
      intensity: 0,
      duration: 0,
      affectedParts: [],
      type: 'idle'
    });
  }

  /**
   * Get current activity state
   */
  getActivityState(rigId: string): ActivityState | undefined {
    return this.activityStates.get(rigId);
  }

  /**
   * Set custom interpolation duration for material blending
   */
  setInterpolationDuration(duration: number): void {
    this.interpolationDuration = Math.max(0.1, duration);
  }

  // ============= Private Methods =============

  private calculateBoneVelocities(rig: CharacterRig): Map<string, number> {
    const velocities = new Map<string, number>();
    const bones = rig.skeleton.bones;
    const lastPositions = this.lastFramePositions.get(rig.id) || new Map();

    bones.forEach(bone => {
      const currentPos = bone.getAbsolutePosition();
      const lastPos = lastPositions.get(bone.name) || currentPos.clone();
      
      const distance = BABYLON.Vector3.Distance(currentPos, lastPos);
      velocities.set(bone.name, distance);
      
      lastPositions.set(bone.name, currentPos.clone());
    });

    this.lastFramePositions.set(rig.id, lastPositions);
    return velocities;
  }

  private analyzeActivity(rig: CharacterRig, boneVelocities: Map<string, number>): ActivityState {
    let totalVelocity = 0;
    let sampleCount = 0;

    // Focus on key bones: spine, limbs
    const keyBones = ['spine', 'arm', 'leg', 'foot', 'hand'];
    
    boneVelocities.forEach((velocity, boneName) => {
      if (keyBones.some(kb => boneName.toLowerCase().includes(kb))) {
        totalVelocity += velocity;
        sampleCount++;
      }
    });

    const avgVelocity = sampleCount > 0 ? totalVelocity / sampleCount : 0;

    // Determine activity type and intensity from velocity
    let type: ActivityState['type'] = 'idle';
    let intensity = Math.min(avgVelocity / 0.1, 1.0);  // Normalize to 0-1

    if (intensity < 0.05) {
      type = 'idle';
      intensity = 0;
    } else if (intensity < 0.2) {
      type = 'walk';
      intensity = intensity / 0.2;
    } else if (intensity < 0.5) {
      type = 'run';
      intensity = (intensity - 0.2) / 0.3;
    } else if (intensity < 0.8) {
      type = 'athletic';
      intensity = (intensity - 0.5) / 0.3;
    } else {
      type = 'combat';
      intensity = 1.0;
    }

    return {
      intensity: Math.max(0, Math.min(1.0, intensity)),
      duration: 0,
      affectedParts: ['face', 'neck', 'torso', 'arms'],
      type
    };
  }

  private applyExertionEffects(
    rig: CharacterRig,
    activity: ActivityState,
    blendFactor: number
  ): void {
    if (!rig.mesh) return;

    const meshes = rig.mesh.getChildMeshes();
    const baselineStates = this.baselineStates.get(rig.id);
    
    if (!baselineStates) return;

    meshes.forEach(mesh => {
      if (!(mesh.material instanceof BABYLON.PBRMaterial)) return;
      if (!mesh.material.name.includes('skin') && !mesh.material.name.includes('face')) return;

      // Get activity profile for current activity type
      const profile = ACTIVITY_PROFILES[activity.type];
      if (!profile) return;

      // Interpolate between baseline and exerted state
      const baseline = baselineStates.get(mesh.name);
      if (!baseline) return;

      const exerted: MaterialState = {
        roughness: baseline.roughness - (profile.roughnessReduction * activity.intensity),
        metallic: baseline.metallic,
        albedoTint: this.lerpColor(
          baseline.albedoTint,
          profile.albedoTint,
          activity.intensity
        ),
        albedoIntensity: baseline.albedoIntensity,
        subsurfaceScatteringIntensity: baseline.subsurfaceScatteringIntensity + 
          (profile.sssBoost * activity.intensity),
        clearcoatIntensity: baseline.clearcoatIntensity + 
          (profile.clearcoatBoost * activity.intensity),
        normalMapIntensity: baseline.normalMapIntensity
      };

      // Blend between current state and exerted state
      const current: MaterialState = this.materialStates.get(rig.id)?.get(mesh.name) || baseline;
      
      const blended: MaterialState = {
        roughness: BABYLON.Scalar.Lerp(exerted.roughness, current.roughness, blendFactor),
        metallic: current.metallic,
        albedoTint: BABYLON.Color3.Lerp(exerted.albedoTint, current.albedoTint, blendFactor),
        albedoIntensity: current.albedoIntensity,
        subsurfaceScatteringIntensity: BABYLON.Scalar.Lerp(
          exerted.subsurfaceScatteringIntensity,
          current.subsurfaceScatteringIntensity,
          blendFactor
        ),
        clearcoatIntensity: BABYLON.Scalar.Lerp(
          exerted.clearcoatIntensity,
          current.clearcoatIntensity,
          blendFactor
        ),
        normalMapIntensity: current.normalMapIntensity
      };

      // Apply blended state
      this.applyMaterialState(mesh.material, blended);
      
      // Store for next frame
      let rigMaterials = this.materialStates.get(rig.id);
      if (!rigMaterials) {
        rigMaterials = new Map();
        this.materialStates.set(rig.id, rigMaterials);
      }
      rigMaterials.set(mesh.name, blended);
    });
  }

  private applyEmotionPreset(
    rig: CharacterRig,
    preset: any,
    intensity: number
  ): void {
    if (!rig.mesh) return;

    const meshes = rig.mesh.getChildMeshes();
    
    meshes.forEach(mesh => {
      if (!(mesh.material instanceof BABYLON.PBRMaterial)) return;

      const adjustments = this.getPresetAdjustmentsForMesh(preset, mesh.name);
      if (!adjustments) return;

      const baseline = this.baselineStates.get(rig.id)?.get(mesh.name);
      if (!baseline) return;

      const adjusted: MaterialState = {
        roughness: baseline.roughness + (adjustments.roughnessShift || 0) * intensity,
        metallic: baseline.metallic,
        albedoTint: this.lerpColor(
          baseline.albedoTint,
          adjustments.albedoTint || baseline.albedoTint,
          intensity
        ),
        albedoIntensity: baseline.albedoIntensity,
        subsurfaceScatteringIntensity: baseline.subsurfaceScatteringIntensity + 
          (adjustments.sssShift || 0) * intensity,
        clearcoatIntensity: baseline.clearcoatIntensity + 
          (adjustments.clearcoatShift || 0) * intensity,
        normalMapIntensity: baseline.normalMapIntensity
      };

      this.applyMaterialState(mesh.material, adjusted);
    });
  }

  private applyCustomExpression(
    rig: CharacterRig,
    weights: Map<string, number>,
    intensity: number
  ): void {
    // Custom expression logic can be extended here
    // For now, blend based on weights
    if (!rig.mesh) return;

    const meshes = rig.mesh.getChildMeshes();
    const baselineStates = this.baselineStates.get(rig.id);
    
    if (!baselineStates) return;

    meshes.forEach(mesh => {
      if (!(mesh.material instanceof BABYLON.PBRMaterial)) return;

      const baseline = baselineStates.get(mesh.name);
      if (!baseline) return;

      // Apply as mild adjustment for custom expressions
      const adjusted: MaterialState = {
        ...baseline,
        subsurfaceScatteringIntensity: baseline.subsurfaceScatteringIntensity + 
          (0.05 * intensity)
      };

      this.applyMaterialState(mesh.material, adjusted);
    });
  }

  private updateDynamicNormals(rig: CharacterRig, boneVelocities: Map<string, number>): void {
    if (!rig.mesh) return;

    const meshes = rig.mesh.getChildMeshes();
    
    meshes.forEach(mesh => {
      if (!(mesh.material instanceof BABYLON.PBRMaterial)) return;
      if (!mesh.material.bumpTexture) return;

      // Find associated bones for this mesh
      let maxVelocity = 0;
      const skinName = mesh.name.toLowerCase();

      boneVelocities.forEach((velocity, boneName) => {
        if (skinName.includes(boneName.toLowerCase())) {
          maxVelocity = Math.max(maxVelocity, velocity);
        }
      });

      // Adjust normal map intensity based on movement
      // Higher velocity = higher strain = stronger normals
      const normalStrength = 0.5 + (maxVelocity * 3.0);  // Range: 0.5 to 3.5
      mesh.material.bumpTexture.level = Math.max(0.5, Math.min(3.5, normalStrength));
    });
  }

  private applyMaterialState(material: BABYLON.PBRMaterial, state: MaterialState): void {
    material.roughness = Math.max(0.0, Math.min(1.0, state.roughness));
    material.metallic = Math.max(0.0, Math.min(1.0, state.metallic));
    
    if (material.albedoColor) {
      material.albedoColor = state.albedoTint;
    }

    // Update subsurface scattering if available
    if (material.subSurface && material.subSurface.isTranslucencyEnabled) {
      material.subSurface.translucencyIntensity = Math.max(0.0, Math.min(1.0, state.subsurfaceScatteringIntensity));
    }

    // Update clearcoat if available
    if (material.clearCoat && material.clearCoat.isEnabled) {
      material.clearCoat.intensity = Math.max(0.0, Math.min(1.0, state.clearcoatIntensity));
    }
  }

  private storeBaselineMaterials(rigId: string, avatarDef: AvatarMaterialDefinition): void {
    const baselineMap = new Map<string, MaterialState>();
    const rig = this.rigs.get(rigId);
    
    if (!rig || !rig.mesh) return;

    const meshes = rig.mesh.getChildMeshes();
    
    meshes.forEach(mesh => {
      if (!(mesh.material instanceof BABYLON.PBRMaterial)) return;

      const mat = mesh.material;
      const state: MaterialState = {
        roughness: mat.roughness || 0.75,
        metallic: mat.metallic || 0.0,
        albedoTint: mat.albedoColor?.clone() || new BABYLON.Color3(1, 1, 1),
        albedoIntensity: 1.0,
        subsurfaceScatteringIntensity: mat.subSurface?.translucencyIntensity || 0.3,
        clearcoatIntensity: mat.clearCoat?.intensity || 0.0,
        normalMapIntensity: mat.bumpTexture?.level || 1.0
      };

      baselineMap.set(mesh.name, state);
    });

    this.baselineStates.set(rigId, baselineMap);
  }

  private getPresetAdjustmentsForMesh(preset: any, meshName: string): any {
    const lowerName = meshName.toLowerCase();
    
    // Check for skin/face materials
    if (lowerName.includes('skin') || lowerName.includes('face')) {
      return preset.skin;
    }
    
    // Check for eye materials
    if (lowerName.includes('eye')) {
      return preset.eyes;
    }
    
    // Check for lip materials
    if (lowerName.includes('lip') || lowerName.includes('mouth')) {
      return preset.lips;
    }

    return null;
  }

  private lerpColor(a: BABYLON.Color3, b: BABYLON.Color3, t: number): BABYLON.Color3 {
    return new BABYLON.Color3(
      BABYLON.Scalar.Lerp(a.r, b.r, t),
      BABYLON.Scalar.Lerp(a.g, b.g, t),
      BABYLON.Scalar.Lerp(a.b, b.b, t)
    );
  }

  private getAvatarDefinition(rigId: string): AvatarMaterialDefinition | undefined {
    // Extract avatar ID from rig ID (format: 'avatar_woman', etc.)
    const matches = rigId.match(/avatar_\w+/);
    const avatarId = matches ? matches[0] : undefined;

    if (!avatarId) return undefined;

    return AVATAR_MATERIALS.find(mat => mat.id === avatarId);
  }

  /**
   * Set LOD configuration for a rig (Phase 2B)
   * Called by MaterialLODManager when LOD changes
   */
  setLODConfig(rigId: string, config: LODConfig): void {
    this.lodConfigs.set(rigId, config);
    this.currentLODs.set(rigId, config.level);

    // Adjust material controller behavior based on LOD
    if (!config.exertionEffectsEnabled) {
      // Clear exertion effects for this rig
      const activityState = this.activityStates.get(rigId);
      if (activityState) {
        activityState.intensity = 0;
      }
    }

    if (!config.emotionEffectsEnabled) {
      // Material emotions will not be applied
    }

    // Update interpolation timing based on LOD
    const oldDuration = this.interpolationDuration;
    this.interpolationDuration = config.interpolationDuration;
    this.interpolationDuration = oldDuration; // Restore for other rigs

    console.log(`[AMC] LOD changed for ${rigId}: ${config.level}`);
  }

  /**
   * Get current LOD for a rig
   */
  getLODLevel(rigId: string): LODLevel | null {
    return this.currentLODs.get(rigId) ?? null;
  }

  /**
   * Check if exertion effects are enabled for LOD
   */
  isExertionEnabled(rigId: string): boolean {
    const config = this.lodConfigs.get(rigId);
    return config ? config.exertionEffectsEnabled : true;
  }

  /**
   * Check if emotion effects are enabled for LOD
   */
  isEmotionEnabled(rigId: string): boolean {
    const config = this.lodConfigs.get(rigId);
    return config ? config.emotionEffectsEnabled : true;
  }
