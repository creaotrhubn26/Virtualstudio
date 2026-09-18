import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine, Scene, MeshBuilder, PBRMaterial, MultiMaterial, RawTexture } from '@babylonjs/core';
import { AvatarMaterialService } from './avatarMaterialService';

const engine = new NullEngine();
let scene: Scene;
afterEach(() => scene?.dispose());
describe('imported character materials', () => {
  it.each(['avatar_woman', 'unknown-import'])('preserves authored maps and hair alpha for %s', id => {
    scene = new Scene(engine);
    const mesh = MeshBuilder.CreateSphere('SkinAndClothing', {}, scene);
    const material = new PBRMaterial('authored', scene);
    const atlas = RawTexture.CreateRGBATexture(new Uint8Array([200, 120, 80, 255]), 1, 1, scene);
    material.albedoTexture = atlas;
    material.bumpTexture = atlas;
    material.ambientTexture = atlas;
    material.roughness = .73;
    material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;
    material.alphaCutOff = .45;
    material.backFaceCulling = false;
    mesh.material = material;
    AvatarMaterialService.applyEnhancedPBR([mesh], id, scene);
    expect(mesh.material === material).toBe(true);
    expect(material.albedoTexture === atlas).toBe(true);
    expect(material.bumpTexture === atlas).toBe(true);
    expect(material.ambientTexture === atlas).toBe(true);
    expect(material.roughness).toBe(.73);
    expect(material.transparencyMode).toBe(PBRMaterial.PBRMATERIAL_ALPHATEST);
    expect(material.alphaCutOff).toBe(.45);
    expect(material.backFaceCulling).toBe(false);
  });
  it('preserves separate skin and cloth submaterials on one mesh', () => {
    scene = new Scene(engine);
    const mesh = MeshBuilder.CreateBox('avatar', {}, scene);
    const multi = new MultiMaterial('surfaces', scene);
    const skin = new PBRMaterial('skin', scene), cloth = new PBRMaterial('cloth', scene);
    multi.subMaterials = [skin, cloth];
    mesh.material = multi;
    AvatarMaterialService.applyEnhancedPBR([mesh], 'avatar_man', scene);
    expect(mesh.material === multi).toBe(true);
    expect(multi.subMaterials[0] === skin).toBe(true);
    expect(multi.subMaterials[1] === cloth).toBe(true);
    expect(skin.maxSimultaneousLights).toBe(8);
  });
});
