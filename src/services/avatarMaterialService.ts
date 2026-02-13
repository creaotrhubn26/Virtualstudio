/**
 * Avatar Material Service - PBR texture and material application system
 * 
 * Handles application of enhanced PBR materials to avatar meshes:
 * - Detects body parts (skin, fabric, hair, eyes)
 * - Applies appropriate material definitions
 * - Loads and configures textures (albedo, normal, ORM)
 * - Enables subsurface scattering for skin
 * - Supports both embedded and external textures
 */

import * as BABYLON from '@babylonjs/core';
import { MaterialProperties, getAvatarById } from '../data/avatarDefinitions';

type SkinMaterialProperties = MaterialProperties & {
  subsurfaceScattering?: {
    enabled: boolean;
    translucencyIntensity: number;
    tintColor?: string;
  };
};

export interface EmbeddedTextureInfo {
  meshName: string;
  hasAlbedo: boolean;
  hasNormal: boolean;
  hasORM: boolean;
  albedoPath?: string;
  normalPath?: string;
  ormPath?: string;
}

export class AvatarMaterialService {
  /**
   * Apply enhanced PBR materials to avatar meshes
   * Priority: Definition-based materials > Embedded textures > Fallback
   * 
   * @param meshes - Array of meshes from avatar model
   * @param avatarId - Avatar identifier (e.g., 'avatar_woman')
   * @param scene - Babylon.js scene
   */
  static applyEnhancedPBR(
    meshes: BABYLON.AbstractMesh[],
    avatarId: string,
    scene: BABYLON.Scene
  ): void {
    const materialDef = getAvatarById(avatarId);
    
    if (!materialDef) {
      console.warn(`[AvatarMaterial] No definition found for ${avatarId}, using fallback`);
      this.applyFallbackPBR(meshes, scene);
      return;
    }
    
    console.log(`[AvatarMaterial] ✅ Applying enhanced PBR for ${materialDef.name} to ${meshes.length} meshes`);
    console.log(`[AvatarMaterial] Available materials:`, {
      skin: `${materialDef.skin.albedoColor} (roughness=${materialDef.skin.roughness}, metallic=${materialDef.skin.metallic})`,
      fabric: `${materialDef.fabric.albedoColor} (roughness=${materialDef.fabric.roughness}, metallic=${materialDef.fabric.metallic})`,
      hair: materialDef.hair ? `${materialDef.hair.albedoColor}` : 'none',
      eyes: materialDef.eyes ? `roughness=${materialDef.eyes.roughness}` : 'none'
    });
    
    let appliedCount = 0;
    meshes.forEach(mesh => {
      if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) {
        console.log(`[AvatarMaterial] ⏭️ Skipping ${mesh.name} (no vertices)`);
        return;
      }
      
      mesh.receiveShadows = true;
      
      // Determine body part type
      const bodyPartType = this.detectBodyPartType(mesh);
      console.log(`[AvatarMaterial] 🔍 Mesh "${mesh.name}" detected as: ${bodyPartType}`);
      
      // Get appropriate material properties
      let matProps: MaterialProperties | undefined;
      let skinProps: SkinMaterialProperties | undefined;
      switch (bodyPartType) {
        case 'skin':
          skinProps = materialDef.skin as SkinMaterialProperties;
          matProps = skinProps;
          break;
        case 'fabric':
          matProps = materialDef.fabric;
          break;
        case 'hair':
          matProps = materialDef.hair;
          break;
        case 'eyes':
          // Eyes handled separately due to special clearcoat needs
          if (materialDef.eyes) {
            console.log(`[AvatarMaterial] 👁️ Applying eye material to ${mesh.name}`);
            this.applyEyeMaterial(mesh, materialDef.eyes, scene);
            appliedCount++;
          }
          return;
        default:
          // Default to skin for unmapped meshes
          matProps = materialDef.skin;
      }
      
      if (!matProps) {
        console.warn(`[AvatarMaterial] ⚠️ No material props for ${mesh.name}`);
        return;
      }
      
      // Create/configure PBR material
      const pbrMat = this.createOrUpdatePBRMaterial(
        mesh.name,
        matProps,
        scene
      );
      
      // Apply special skin properties
      if (bodyPartType === 'skin' && skinProps?.subsurfaceScattering?.enabled) {
        this.applySkinSubsurfaceScattering(pbrMat, skinProps as any);
      }
      
      mesh.material = pbrMat;
      appliedCount++;
      
      console.log(`[AvatarMaterial] ✅ Applied ${bodyPartType} to "${mesh.name}": albedo=${pbrMat.albedoColor.toHexString()}, roughness=${pbrMat.roughness}, metallic=${pbrMat.metallic}`);
    });
    
    console.log(`[AvatarMaterial] 🎉 COMPLETE: Applied materials to ${appliedCount}/${meshes.length} meshes`);
  }
  
  /**
   * Detect embedded textures in loaded GLB meshes
   * Used for inspection and fallback texture use
   * 
   * @param meshes - Array of meshes from imported GLB
   * @returns Array of detected texture info per mesh
   */
  static detectEmbeddedTextures(meshes: BABYLON.AbstractMesh[]): EmbeddedTextureInfo[] {
    return meshes
      .filter(m => m.material)
      .map(m => {
        const mat = m.material;
        let hasAlbedo = false;
        let hasNormal = false;
        let hasORM = false;
        
        if (mat instanceof BABYLON.PBRMaterial) {
          hasAlbedo = !!(mat.albedoTexture);
          hasNormal = !!(mat.bumpTexture);
          hasORM = !!(mat.metallicTexture);
        } else if (mat instanceof BABYLON.StandardMaterial) {
          hasAlbedo = !!(mat.diffuseTexture);
          hasNormal = !!(mat.bumpTexture);
        }
        
        return {
          meshName: m.name,
          hasAlbedo,
          hasNormal,
          hasORM,
          albedoPath: hasAlbedo ? mat?.name : undefined,
          normalPath: hasNormal ? mat?.name : undefined,
          ormPath: hasORM ? mat?.name : undefined
        };
      });
  }
  
  /**
   * Apply fallback PBR when no material definition exists
   * Generic gray with proper roughness for skin/fabric
   */
  private static applyFallbackPBR(
    meshes: BABYLON.AbstractMesh[],
    scene: BABYLON.Scene
  ): void {
    meshes.forEach(m => {
      if (!m.getTotalVertices || m.getTotalVertices() === 0) return;
      
      const mat = new BABYLON.PBRMaterial(`fallback_${m.name}`, scene);
      mat.albedoColor = new BABYLON.Color3(0.6, 0.6, 0.6);
      
      // Skin-like default: slightly rough but not matte
      mat.roughness = 0.75;
      mat.metallic = 0.0;
      mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      mat.backFaceCulling = true;
      
      m.material = mat;
    });
  }
  
  /**
   * Detect which body part a mesh is (skin, fabric, hair, eyes)
   * Based on mesh name patterns and vertical position
   */
  private static detectBodyPartType(mesh: BABYLON.AbstractMesh): 'skin' | 'fabric' | 'hair' | 'eyes' | 'unknown' {
    const nameLower = mesh.name.toLowerCase();
    
    // Eyes detection
    if (nameLower.includes('eye') || nameLower.includes('iris') || nameLower.includes('pupil')) {
      return 'eyes';
    }
    
    // Hair detection
    if (nameLower.includes('hair') || nameLower.includes('head') && nameLower.includes('hair')) {
      return 'hair';
    }
    
    // Fabric detection - clothing, garments
    if (
      nameLower.includes('shirt') ||
      nameLower.includes('pants') ||
      nameLower.includes('dress') ||
      nameLower.includes('cloth') ||
      nameLower.includes('fabric') ||
      nameLower.includes('jacket') ||
      nameLower.includes('coat')
    ) {
      return 'fabric';
    }
    
    // Skin detection - organic shapes
    if (
      nameLower.includes('face') ||
      nameLower.includes('head') ||
      nameLower.includes('skin') ||
      nameLower.includes('arm') ||
      nameLower.includes('leg') ||
      nameLower.includes('torso') ||
      nameLower.includes('body') ||
      nameLower.includes('hand') ||
      nameLower.includes('foot')
    ) {
      return 'skin';
    }
    
    // Fallback to skin for most unmapped meshes (likely body geometry)
    return 'skin';
  }
  
  /**
   * Create or update a PBR material with definition properties
   */
  private static createOrUpdatePBRMaterial(
    meshName: string,
    matProps: MaterialProperties,
    scene: BABYLON.Scene
  ): BABYLON.PBRMaterial {
    const mat = new BABYLON.PBRMaterial(`avatar_${meshName}`, scene);
    
    // Base color
    if (matProps.albedoColor) {
      try {
        mat.albedoColor = BABYLON.Color3.FromHexString(matProps.albedoColor);
      } catch {
        mat.albedoColor = new BABYLON.Color3(0.6, 0.6, 0.6);
      }
    } else {
      mat.albedoColor = new BABYLON.Color3(0.6, 0.6, 0.6);
    }
    
    // Albedo texture
    if (matProps.albedoTexture) {
      try {
        mat.albedoTexture = new BABYLON.Texture(matProps.albedoTexture, scene);
        mat.albedoTexture.gammaSpace = true;  // sRGB color space
      } catch (e) {
        console.warn(`[AvatarMaterial] Failed to load albedo texture: ${matProps.albedoTexture}`, e);
      }
    }
    
    // Normal map
    if (matProps.normalMapUrl) {
      try {
        const normalTex = new BABYLON.Texture(matProps.normalMapUrl, scene);
        normalTex.gammaSpace = false;  // Linear space for normals
        mat.bumpTexture = normalTex;
        mat.invertNormalMapX = false;
        mat.invertNormalMapY = false;
      } catch (e) {
        console.warn(`[AvatarMaterial] Failed to load normal map: ${matProps.normalMapUrl}`, e);
      }
    }
    
    // PBR properties
    mat.roughness = matProps.roughness;
    mat.metallic = matProps.metallic;
    
    // Standard material properties
    mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
    mat.alpha = 1.0;
    mat.backFaceCulling = true;
    
    return mat;
  }
  
  /**
   * Apply subsurface scattering to skin materials
   * Simulates light penetrating through thin skin tissue
   */
  private static applySkinSubsurfaceScattering(
    mat: BABYLON.PBRMaterial,
    skinProps: MaterialProperties & { subsurfaceScattering?: any }
  ): void {
    if (!skinProps.subsurfaceScattering) return;
    
    try {
      // Enable subsurface scattering
      mat.subSurface.isTranslucencyEnabled = true;
      mat.subSurface.translucencyIntensity = skinProps.subsurfaceScattering.translucencyIntensity || 0.3;
      
      // Optional: Set tint color for subsurface color
      if (skinProps.subsurfaceScattering.tintColor) {
        try {
          const tintRGB = BABYLON.Color3.FromHexString(skinProps.subsurfaceScattering.tintColor);
          mat.subSurface.tintColor = tintRGB;
        } catch {
          // Use default if hex parsing fails
        }
      }
      
      console.log(`[AvatarMaterial] SSS enabled: intensity=${mat.subSurface.translucencyIntensity}`);
    } catch (e) {
      console.warn(`[AvatarMaterial] Failed to apply subsurface scattering:`, e);
    }
  }
  
  /**
   * Apply eye material with glossy finish and clearcoat
   */
  private static applyEyeMaterial(
    mesh: BABYLON.AbstractMesh,
    eyeProps: any,
    scene: BABYLON.Scene
  ): void {
    const mat = new BABYLON.PBRMaterial(`eye_${mesh.name}`, scene);
    
    // Iris color
    if (eyeProps.albedoColor) {
      try {
        mat.albedoColor = BABYLON.Color3.FromHexString(eyeProps.albedoColor);
      } catch {
        mat.albedoColor = new BABYLON.Color3(0.5, 0.4, 0.35);
      }
    }
    
    // Very glossy
    mat.roughness = eyeProps.roughness || 0.15;
    mat.metallic = 0.0;
    
    // Clearcoat for wet cornea effect
    if (eyeProps.clearCoat?.enabled) {
      try {
        mat.clearCoat.isEnabled = true;
        mat.clearCoat.intensity = eyeProps.clearCoat.intensity || 0.8;
      } catch (e) {
        console.warn(`[AvatarMaterial] ClearCoat not available:`, e);
      }
    }
    
    mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
    mat.backFaceCulling = true;
    
    mesh.material = mat;
    console.log(`[AvatarMaterial] Applied eye material with glossy finish`);
  }
  
  /**
   * Export avatar as PBR-ready for use in scene composition
   * Used for getCurrentSceneAsPreset() serialization
   */
  static serializeAvatarMaterial(meshes: BABYLON.AbstractMesh[]): Record<string, any> {
    return {
      meshCount: meshes.length,
      pbrCount: meshes.filter(m => m.material instanceof BABYLON.PBRMaterial).length,
      standardCount: meshes.filter(m => m.material instanceof BABYLON.StandardMaterial).length,
      textureCount: meshes.reduce((sum, m) => {
        if (m.material instanceof BABYLON.PBRMaterial) {
          return sum + (m.material.albedoTexture ? 1 : 0) + (m.material.bumpTexture ? 1 : 0);
        }
        return sum;
      }, 0)
    };
  }
}
