/**
 * Gobo Service - Manages gobo pattern projection and shadow maps
 */

import * as BABYLON from '@babylonjs/core';
import { GoboDefinition, GoboOptions, generateGoboTexture, getGoboById } from '../../data/goboDefinitions';

export interface GoboAttachment {
  goboId: string;
  lightId: string;
  options: GoboOptions;
  projectionTexture?: BABYLON.Texture;
  shadowGenerator?: BABYLON.ShadowGenerator;
}

class GoboService {
  private attachments: Map<string, GoboAttachment> = new Map(); // lightId -> attachment
  private standaloneGobos: Map<string, BABYLON.Mesh> = new Map(); // goboId -> mesh
  private scene: BABYLON.Scene | null = null;
  private textureCache: Map<string, BABYLON.Texture> = new Map();

  /**
   * Initialize service with scene
   */
  setScene(scene: BABYLON.Scene): void {
    this.scene = scene;
  }

  /**
   * Generate or get cached gobo texture
   */
  private getGoboTexture(pattern: string, size: number = 512): BABYLON.Texture {
    const cacheKey = `${pattern}_${size}`;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    if (!this.scene) {
      throw new Error('GoboService: Scene not initialized');
    }

    const texture = generateGoboTexture(pattern as any, size, this.scene);
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /**
   * Create projection texture for light
   */
  createProjectionTexture(
    goboTexture: BABYLON.Texture,
    light: BABYLON.Light,
    options: GoboOptions
  ): BABYLON.Texture {
    goboTexture.level = options.intensity !== undefined ? options.intensity : 1.0;

    if (light instanceof BABYLON.SpotLight) {
      light.projectionTexture = goboTexture;
    }

    return goboTexture;
  }

  /**
   * Apply gobo to light
   */
  applyGoboToLight(
    lightId: string,
    goboId: string,
    options: Partial<GoboOptions>,
    light: BABYLON.Light
  ): void {
    if (!this.scene) {
      throw new Error('GoboService: Scene not initialized');
    }

    const goboDef = getGoboById(goboId);
    if (!goboDef) {
      throw new Error(`GoboService: Gobo ${goboId} not found`);
    }

    // Remove existing gobo if any
    this.removeGoboFromLight(lightId);

    // Create full options
    const fullOptions: GoboOptions = {
      pattern: goboDef.pattern,
      size: options.size ?? goboDef.defaultSize,
      rotation: options.rotation ?? goboDef.defaultRotation,
      intensity: options.intensity ?? 1.0,
      customTextureUrl: options.customTextureUrl,
    };

    // Generate texture
    const texture = fullOptions.customTextureUrl
      ? new BABYLON.Texture(fullOptions.customTextureUrl, this.scene)
      : this.getGoboTexture(fullOptions.pattern, 512);

    // Create projection texture
    const projectionTexture = this.createProjectionTexture(texture, light, fullOptions);

    // Apply to light (only SpotLight supports projectionTexture in Babylon.js)
    if (light instanceof BABYLON.SpotLight) {
      light.projectionTexture = projectionTexture;
    }

    // Create shadow generator with gobo pattern if light supports shadows
    let shadowGenerator: BABYLON.ShadowGenerator | undefined;
    const shadowLight = light as BABYLON.IShadowLight;
    if (typeof shadowLight.getShadowGenerator === 'function') {
      shadowGenerator = (shadowLight.getShadowGenerator() as BABYLON.ShadowGenerator | null) ?? undefined;
      if (shadowGenerator) {
        this.applyGoboToShadowMap(shadowGenerator, texture, fullOptions);
      }
    }

    // Store attachment
    const attachment: GoboAttachment = {
      goboId,
      lightId,
      options: fullOptions,
      projectionTexture,
      shadowGenerator,
    };

    this.attachments.set(lightId, attachment);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('ch-gobo-attached', {
      detail: { lightId, goboId, options: fullOptions }
    }));
  }

  /**
   * Apply gobo pattern to shadow map
   */
  private applyGoboToShadowMap(
    shadowGenerator: BABYLON.ShadowGenerator,
    goboTexture: BABYLON.Texture,
    options: GoboOptions
  ): void {
    // Use custom shader or post-process to apply gobo pattern to shadows
    // This is a simplified approach - in production, you might want a custom shader
    
    // For now, we'll use the texture as a filter on the shadow map
    // This requires custom shader implementation which is complex
    // As an alternative, we can use a post-process or modify the shadow generator
    
    // Note: Full implementation would require custom shader code
    // This is a placeholder for the concept
  }

  /**
   * Remove gobo from light
   */
  removeGoboFromLight(lightId: string): void {
    const attachment = this.attachments.get(lightId);
    if (!attachment) return;

    // Remove projection texture from light
    if (attachment.projectionTexture) {
      attachment.projectionTexture.dispose();
    }

    // Get light and remove projection texture
    const light = attachment.projectionTexture?.getScene()?.lights.find(
      l => l.name === lightId || (l as any).id === lightId
    );
    
    if (light && light instanceof BABYLON.SpotLight) {
      light.projectionTexture = null;
    }

    // Remove attachment
    this.attachments.delete(lightId);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('ch-gobo-removed', {
      detail: { lightId }
    }));
  }

  /**
   * Get gobo attachment for light
   */
  getGoboAttachment(lightId: string): GoboAttachment | undefined {
    return this.attachments.get(lightId);
  }

  /**
   * Get all gobo attachments
   */
  getAllAttachments(): GoboAttachment[] {
    return Array.from(this.attachments.values());
  }

  /**
   * Add standalone gobo mesh
   */
  addStandaloneGobo(goboId: string, mesh: BABYLON.Mesh): void {
    this.standaloneGobos.set(goboId, mesh);
  }

  /**
   * Remove standalone gobo
   */
  removeStandaloneGobo(goboId: string): void {
    const mesh = this.standaloneGobos.get(goboId);
    if (mesh) {
      mesh.dispose();
      this.standaloneGobos.delete(goboId);
    }
  }

  /**
   * Get standalone gobo
   */
  getStandaloneGobo(goboId: string): BABYLON.Mesh | undefined {
    return this.standaloneGobos.get(goboId);
  }

  /**
   * Get all standalone gobos
   */
  getAllStandaloneGobos(): BABYLON.Mesh[] {
    return Array.from(this.standaloneGobos.values());
  }

  /**
   * Update gobo options
   */
  updateGoboOptions(lightId: string, options: Partial<GoboOptions>): void {
    const attachment = this.attachments.get(lightId);
    if (!attachment) return;

    const light = attachment.projectionTexture?.getScene()?.lights.find(
      l => l.name === lightId || (l as any).id === lightId
    );

    if (!light) return;

    // Merge options
    const newOptions: GoboOptions = {
      ...attachment.options,
      ...options,
    };

    // Reapply gobo with new options
    this.applyGoboToLight(lightId, attachment.goboId, newOptions, light);
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Remove all attachments
    for (const lightId of this.attachments.keys()) {
      this.removeGoboFromLight(lightId);
    }

    // Dispose standalone gobos
    for (const mesh of this.standaloneGobos.values()) {
      mesh.dispose();
    }
    this.standaloneGobos.clear();

    // Dispose cached textures
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}

export const goboService = new GoboService();





















