import * as BABYLON from '@babylonjs/core';

export interface GlassesOptions {
  frameStyle: 'rectangular' | 'round' | 'aviator' | 'cat-eye' | 'rimless';
  lensType: 'clear' | 'tinted' | 'mirror' | 'gradient';
  frameMaterial: 'plastic' | 'metal' | 'titanium' | 'acetate';
  frameColor: string;
  lensColor?: string;
}

export interface GlassesModel {
  frame: BABYLON.Mesh | null;
  leftLens: BABYLON.Mesh | null;
  rightLens: BABYLON.Mesh | null;
  options: GlassesOptions;
}

export const createGlassesModel = (options: Partial<GlassesOptions>): GlassesModel => {
  const fullOptions: GlassesOptions = {
    frameStyle: options.frameStyle || 'rectangular',
    lensType: options.lensType || 'clear',
    frameMaterial: options.frameMaterial || 'plastic',
    frameColor: options.frameColor || '#1a1a1a',
    lensColor: options.lensColor
  };

  return {
    frame: null,
    leftLens: null,
    rightLens: null,
    options: fullOptions
  };
};

export const buildGlassesMesh = (
  scene: BABYLON.Scene,
  options: GlassesOptions
): BABYLON.Mesh => {
  const parent = new BABYLON.Mesh('glasses', scene);

  const frameWidth = options.frameStyle === 'aviator' ? 0.14 : 0.12;
  const lensHeight = options.frameStyle === 'round' ? 0.035 : 0.03;

  const frameMat = new BABYLON.StandardMaterial('frameMat', scene);
  frameMat.diffuseColor = BABYLON.Color3.FromHexString(options.frameColor);
  frameMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

  const bridge = BABYLON.MeshBuilder.CreateBox('bridge', {
    width: 0.02,
    height: 0.005,
    depth: 0.008
  }, scene);
  bridge.material = frameMat;
  bridge.parent = parent;

  const leftLens = BABYLON.MeshBuilder.CreateBox('leftLens', {
    width: frameWidth / 2.2,
    height: lensHeight,
    depth: 0.003
  }, scene);
  leftLens.position.x = -0.03;
  leftLens.parent = parent;

  const rightLens = BABYLON.MeshBuilder.CreateBox('rightLens', {
    width: frameWidth / 2.2,
    height: lensHeight,
    depth: 0.003
  }, scene);
  rightLens.position.x = 0.03;
  rightLens.parent = parent;

  const lensMat = new BABYLON.StandardMaterial('lensMat', scene);
  lensMat.diffuseColor = new BABYLON.Color3(0.9, 0.95, 1);
  lensMat.alpha = options.lensType === 'clear' ? 0.2 : 0.5;
  lensMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  leftLens.material = lensMat;
  rightLens.material = lensMat;

  const leftTemple = BABYLON.MeshBuilder.CreateBox('leftTemple', {
    width: 0.08,
    height: 0.004,
    depth: 0.004
  }, scene);
  leftTemple.position.set(-0.06, 0, -0.04);
  leftTemple.rotation.y = Math.PI / 2;
  leftTemple.material = frameMat;
  leftTemple.parent = parent;

  const rightTemple = BABYLON.MeshBuilder.CreateBox('rightTemple', {
    width: 0.08,
    height: 0.004,
    depth: 0.004
  }, scene);
  rightTemple.position.set(0.06, 0, -0.04);
  rightTemple.rotation.y = Math.PI / 2;
  rightTemple.material = frameMat;
  rightTemple.parent = parent;

  return parent;
};
