/**
 * Gobo Model - 3D visual representation of gobo frames
 */

import * as BABYLON from '@babylonjs/core';
import { GoboOptions } from '../../data/goboDefinitions';
import { generateGoboTexture } from '../../data/goboDefinitions';

export interface GoboModel {
  frame: BABYLON.Mesh;
  pattern: BABYLON.Mesh;
  preview: BABYLON.Mesh;
  options: GoboOptions;
}

/**
 * Create 3D gobo model
 */
export function createGoboModel(
  scene: BABYLON.Scene,
  options: Partial<GoboOptions> = {}
): GoboModel {
  const fullOptions: GoboOptions = {
    pattern: options.pattern || 'window',
    size: options.size || 0.2, // 20cm diameter
    rotation: options.rotation || 0,
    intensity: options.intensity || 1.0,
    customTextureUrl: options.customTextureUrl,
  };

  const goboId = `gobo_${Date.now()}`;
  const radius = fullOptions.size / 2;

  // Create parent mesh
  const parent = new BABYLON.Mesh(`gobo_${goboId}`, scene);

  // Create frame (circular ring)
  const frame = BABYLON.MeshBuilder.CreateTorus(
    `${goboId}_frame`,
    {
      diameter: fullOptions.size,
      thickness: fullOptions.size * 0.05,
      tessellation: 32,
    },
    scene
  );

  const frameMaterial = new BABYLON.StandardMaterial(`${goboId}_frame_mat`, scene);
  frameMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  frameMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  frame.material = frameMaterial;
  frame.parent = parent;

  // Create pattern preview (flat disc showing the pattern)
  const pattern = BABYLON.MeshBuilder.CreateDisc(
    `${goboId}_pattern`,
    {
      radius: radius * 0.9,
      tessellation: 64,
    },
    scene
  );

  // Generate pattern texture
  const patternTexture = fullOptions.customTextureUrl
    ? new BABYLON.Texture(fullOptions.customTextureUrl, scene)
    : generateGoboTexture(fullOptions.pattern, 512, scene);

  const patternMaterial = new BABYLON.StandardMaterial(`${goboId}_pattern_mat`, scene);
  patternMaterial.diffuseTexture = patternTexture;
  patternMaterial.emissiveTexture = patternTexture;
  patternMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  patternMaterial.useEmissiveAsIllumination = true;
  pattern.material = patternMaterial;
  pattern.parent = parent;
  pattern.rotation.x = Math.PI / 2; // Rotate to face forward

  // Apply rotation
  if (fullOptions.rotation) {
    pattern.rotation.z = (fullOptions.rotation * Math.PI) / 180;
  }

  // Create preview mesh (smaller, for UI thumbnails)
  const preview = BABYLON.MeshBuilder.CreateDisc(
    `${goboId}_preview`,
    {
      radius: radius * 0.8,
      tessellation: 32,
    },
    scene
  );

  const previewMaterial = patternMaterial.clone(`${goboId}_preview_mat`);
  preview.material = previewMaterial;
  preview.parent = parent;
  preview.rotation.x = Math.PI / 2;
  preview.scaling.scaleInPlace(0.5);
  preview.position.y = 0.01; // Slight offset for preview

  // Set metadata
  parent.metadata = {
    type: 'gobo',
    goboId,
    options: fullOptions,
  };

  // Make pickable
  parent.isPickable = true;
  frame.isPickable = true;
  pattern.isPickable = true;

  return {
    frame,
    pattern,
    preview,
    options: fullOptions,
  };
}

/**
 * Update gobo model options
 */
export function updateGoboModel(
  model: GoboModel,
  options: Partial<GoboOptions>,
  scene: BABYLON.Scene
): void {
  const newOptions: GoboOptions = {
    ...model.options,
    ...options,
  };

  // Update size
  if (options.size !== undefined) {
    const radius = newOptions.size / 2;
    
    // Update frame
    model.frame.scaling.x = newOptions.size / model.options.size;
    model.frame.scaling.y = newOptions.size / model.options.size;
    model.frame.scaling.z = newOptions.size / model.options.size;

    // Update pattern
    model.pattern.scaling.x = newOptions.size / model.options.size;
    model.pattern.scaling.y = newOptions.size / model.options.size;
    model.pattern.scaling.z = newOptions.size / model.options.size;
  }

  // Update rotation
  if (options.rotation !== undefined) {
    model.pattern.rotation.z = (newOptions.rotation * Math.PI) / 180;
  }

  // Update pattern texture if pattern changed
  if (options.pattern !== undefined && options.pattern !== model.options.pattern) {
    const patternTexture = newOptions.customTextureUrl
      ? new BABYLON.Texture(newOptions.customTextureUrl, scene)
      : generateGoboTexture(newOptions.pattern, 512, scene);

    if (model.pattern.material instanceof BABYLON.StandardMaterial) {
      model.pattern.material.diffuseTexture = patternTexture;
      model.pattern.material.emissiveTexture = patternTexture;
    }
  }

  // Update metadata
  if (model.frame.parent) {
    model.frame.parent.metadata = {
      ...model.frame.parent.metadata,
      options: newOptions,
    };
  }

  model.options = newOptions;
}

/**
 * Dispose gobo model
 */
export function disposeGoboModel(model: GoboModel): void {
  if (model.frame.parent) {
    model.frame.parent.dispose();
  } else {
    model.frame.dispose();
    model.pattern.dispose();
    model.preview.dispose();
  }
}





















