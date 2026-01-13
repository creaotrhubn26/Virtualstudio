/**
 * Animation-Material Integration Demo
 * Shows how to use the new animation-driven material system
 */

import * as BABYLON from '@babylonjs/core';
import { useSkeletalAnimationStore } from './skeletalAnimationService';
import { AnimationMaterialController } from './animationMaterialController';

export class AnimationMaterialDemo {
  private store = useSkeletalAnimationStore;
  private scene: BABYLON.Scene;
  private updateLoop: () => void;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.setupUpdateLoop();
  }

  /**
   * Initialize animation-material integration
   */
  initialize(): void {
    // Initialize the material controller
    this.store.getState().initializeMaterialController(this.scene);
    console.log('✅ Animation-Material Integration Initialized');
  }

  /**
   * Example: Load an avatar and enable animation-driven materials
   */
  async loadAvatarWithMaterials(meshUrl: string, avatarId: string): Promise<string> {
    // Import mesh
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', meshUrl, '');
    const mesh = result.meshes[0];

    // Load as rig in animation store
    const rigId = await this.store.getState().loadRig(mesh, avatarId);

    // Register with material controller for animation-driven effects
    const materialController = this.store.getState().materialController;
    if (materialController && mesh.skeleton) {
      const rig = this.store.getState().rigs.get(rigId);
      if (rig) {
        materialController.registerRig(rig);
      }
    }

    console.log(`✅ Avatar loaded: ${rigId}`);
    return rigId;
  }

  /**
   * Example 1: Play animation with automatic exertion effects
   * Avatar skin becomes glossier and more flushed during intense animation
   */
  playAnimationWithExertion(rigId: string, animationName: string): void {
    console.log(`🎬 Playing: ${animationName}`);

    // Play the animation
    this.store.getState().playAnimation(rigId, animationName, true, 0.3);

    // Example animations and their expected effects:
    // - idle: No exertion (default materials)
    // - walk: Slight glow (roughness -0.08, SSS +0.05)
    // - run: Moderate sweat (roughness -0.2, SSS +0.15, clearcoat +0.3)
    // - dance: Heavy exertion (roughness -0.33, SSS +0.25, clearcoat +0.5)
    // - combat: Maximum (roughness -0.4, SSS +0.35, clearcoat +0.7)
  }

  /**
   * Example 2: Apply facial expression with material changes
   * Expression affects skin color, eye wetness, lip glossiness
   */
  applyFacialExpression(rigId: string, emotion: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral'): void {
    console.log(`😊 Applying expression: ${emotion}`);

    this.store.getState().applyFacialExpression(rigId, emotion, 0.8);

    // Material changes per emotion:
    // - happy: Warm glow, glossier lips
    // - sad: Cooler tone, wet eyes, increased tear appearance
    // - angry: Red flush, increased blood flow (high SSS)
    // - surprised: Sharp look, wide eyes, clear/wet appearance
    // - neutral: Baseline materials
  }

  /**
   * Example 3: Combine animation + expression for emotional performance
   * Avatar dances happily with appropriate material changes
   */
  emotionalPerformance(rigId: string): void {
    // Start with happy expression
    this.applyFacialExpression(rigId, 'happy');

    // Play upbeat animation (dance)
    this.playAnimationWithExertion(rigId, 'dance');

    console.log('🎭 Happy dance performance started!');
  }

  /**
   * Example 4: Transition between expressions
   * Smooth material interpolation between emotional states
   */
  transitionEmotion(
    rigId: string,
    fromEmotion: string,
    toEmotion: string,
    durationSeconds: number = 0.5
  ): void {
    const materialController = this.store.getState().materialController;
    if (!materialController) return;

    // Set interpolation duration for smooth blending
    materialController.setInterpolationDuration(durationSeconds);

    // Apply new emotion (blends from current state)
    this.store.getState().applyFacialExpression(rigId, toEmotion as any, 0.9);

    console.log(`😊➡️😢 Transitioning emotion: ${fromEmotion} → ${toEmotion}`);
  }

  /**
   * Example 5: Multiple avatars with different animations
   * Each avatar responds to their own animation with appropriate materials
   */
  async multiAvatarScene(avatarUrls: string[]): Promise<void> {
    const rigIds: string[] = [];

    // Load all avatars
    for (let i = 0; i < avatarUrls.length; i++) {
      const rigId = await this.loadAvatarWithMaterials(avatarUrls[i], `avatar_${i}`);
      rigIds.push(rigId);
    }

    // Play different animations on each
    const animations = ['idle', 'walk', 'run', 'dance'];
    rigIds.forEach((rigId, index) => {
      const animation = animations[index % animations.length];
      setTimeout(() => {
        this.playAnimationWithExertion(rigId, animation);
      }, index * 500);  // Stagger starts by 500ms
    });

    console.log(`🎬 Multi-avatar scene with ${rigIds.length} characters`);
  }

  /**
   * Example 6: Reset all material effects
   */
  resetAllEffects(rigId: string): void {
    this.store.getState().resetMaterialEffects(rigId);
    console.log('🔄 Material effects reset to baseline');
  }

  /**
   * Get current activity state of avatar
   */
  getActivityState(rigId: string): any {
    const materialController = this.store.getState().materialController;
    if (!materialController) return null;

    return materialController.getActivityState(rigId);
  }

  /**
   * Setup update loop to drive animation-material effects
   * This should be called every frame
   */
  private setupUpdateLoop(): void {
    const materialController = this.store.getState().materialController;
    if (!materialController) return;

    const rigs = this.store.getState().rigs;
    rigs.forEach((rig) => {
      materialController.update(rig.id, 1 / 60); // Assuming 60 FPS
    });
  }

  /**
   * Enable/disable animation-material integration
   */
  setIntegrationEnabled(enabled: boolean): void {
    if (enabled) {
      this.store.getState().initializeMaterialController(this.scene);
    }
  }

  /**
   * Get integration status
   */
  isIntegrationEnabled(): boolean {
    return this.store.getState().animationMaterialIntegration;
  }
}

/**
 * Usage Example:
 *
 * ```typescript
 * // Initialize
 * const demo = new AnimationMaterialDemo(scene);
 * demo.initialize();
 *
 * // Load avatar
 * const rigId = await demo.loadAvatarWithMaterials('avatar.glb', 'avatar_woman');
 *
 * // Play animation with exertion effects
 * demo.playAnimationWithExertion(rigId, 'run');  // Gets sweaty
 *
 * // Apply expression with material changes
 * demo.applyFacialExpression(rigId, 'happy');  // Warm glow, glossy lips
 *
 * // Combine for emotional performance
 * demo.emotionalPerformance(rigId);  // Happy dance!
 *
 * // Smooth transition between emotions
 * demo.transitionEmotion(rigId, 'happy', 'sad', 0.5);
 *
 * // Get current state
 * const activity = demo.getActivityState(rigId);
 * console.log(activity);  // { intensity: 0.5, type: 'run', ... }
 * ```
 */
