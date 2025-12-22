import * as BABYLON from '@babylonjs/core';

export interface ActorParameters {
  age: number;
  gender: number;
  height: number;
  weight: number;
  muscle: number;
}

export interface ActorMeshData {
  vertices: Float32Array;
  faces: Uint32Array;
  normals: Float32Array;
  uvs?: Float32Array;
  num_vertices: number;
  num_faces: number;
  age: number;
  model: string;
}

export interface AnnyModelInfo {
  available: boolean;
  version?: string;
  license?: string;
  device?: string;
  features?: {
    age_range?: string;
    vertices?: string;
  };
}

export interface HealthStatus {
  status: string;
  services?: {
    anny?: boolean;
  };
}

export interface SkinMaterialOptions {
  skinTone: string;
  roughness: number;
  metalness?: number;
}

class VirtualActorService {
  private scene: BABYLON.Scene | null = null;
  private apiBase = '/api/ml';

  setScene(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.apiBase}/health`);
      if (response.ok) {
        return await response.json();
      }
      return { status: 'unavailable', services: { anny: false } };
    } catch {
      return { status: 'unavailable', services: { anny: false } };
    }
  }

  async getModelInfo(): Promise<AnnyModelInfo> {
    try {
      const response = await fetch(`${this.apiBase}/model-info`);
      if (response.ok) {
        return await response.json();
      }
      return { available: false };
    } catch {
      return { available: false };
    }
  }

  async generateActor(params: ActorParameters): Promise<ActorMeshData> {
    const response = await fetch(`${this.apiBase}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error('Failed to generate actor');
    }

    return await response.json();
  }

  createGeometry(meshData: ActorMeshData): BABYLON.Mesh | null {
    if (!this.scene) return null;

    const mesh = new BABYLON.Mesh('actor', this.scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = Array.from(meshData.vertices);
    vertexData.indices = Array.from(meshData.faces);
    vertexData.normals = Array.from(meshData.normals);
    
    if (meshData.uvs) {
      vertexData.uvs = Array.from(meshData.uvs);
    }

    vertexData.applyToMesh(mesh);
    return mesh;
  }

  createSkinMaterial(options: SkinMaterialOptions): BABYLON.StandardMaterial | null {
    if (!this.scene) return null;

    const material = new BABYLON.StandardMaterial('skinMat', this.scene);
    
    const color = BABYLON.Color3.FromHexString(options.skinTone);
    material.diffuseColor = color;
    material.specularColor = new BABYLON.Color3(0.1, 0.08, 0.08);
    material.specularPower = 32;
    
    return material;
  }

  createDefaultActor(scene: BABYLON.Scene, name: string = 'Actor'): BABYLON.Mesh {
    const capsule = BABYLON.MeshBuilder.CreateCapsule(name, {
      height: 1.75,
      radius: 0.22,
      tessellation: 16,
      subdivisions: 4
    }, scene);

    capsule.position.y = 0.875;

    const material = new BABYLON.StandardMaterial(`${name}_mat`, scene);
    material.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6);
    material.specularColor = new BABYLON.Color3(0.15, 0.12, 0.1);
    capsule.material = material;

    return capsule;
  }
}

export const virtualActorService = new VirtualActorService();
