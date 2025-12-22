import { Scene, SceneLoader, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { PropDefinition } from '../data/propDefinitions';
import { logger } from './logger';

const log = logger.module('PropRendering');

export interface PropLoadOptions {
  scale?: number;
  position?: Vector3;
  rotation?: Vector3;
  castShadow?: boolean;
  receiveShadow?: boolean;
  enableLOD?: boolean;
  enableGPUInstancing?: boolean;
  maxInstances?: number;
  enableFrustumCulling?: boolean;
  enableOcclusionCulling?: boolean;
}

class PropRenderingService {
  private scene: Scene | null = null;
  private loadedProps: Map<string, AbstractMesh> = new Map();

  setScene(scene: Scene): void {
    this.scene = scene;
    log.info('Scene set for prop rendering');
  }

  async loadProp(prop: PropDefinition, options: PropLoadOptions = {}): Promise<AbstractMesh> {
    if (!this.scene) {
      throw new Error('Scene not set. Call setScene() first.');
    }

    const {
      scale = prop.defaultScale,
      position = Vector3.Zero(),
      castShadow = true,
      receiveShadow = true,
    } = options;

    let mesh: AbstractMesh;

    if (prop.modelUrl) {
      try {
        const result = await SceneLoader.ImportMeshAsync('', '', prop.modelUrl, this.scene);
        mesh = result.meshes[0];
        mesh.name = prop.id;

        result.meshes.forEach((m) => {
          if (m instanceof Mesh) {
            m.receiveShadows = receiveShadow;
          }
        });

        log.info(`Loaded prop model: ${prop.name}`);
      } catch (error) {
        log.warn(`Failed to load prop model: ${prop.modelUrl}, creating placeholder`);
        mesh = this.createPlaceholderProp(prop);
      }
    } else {
      mesh = this.createPlaceholderProp(prop);
    }

    mesh.position = position;
    mesh.scaling = new Vector3(scale, scale, scale);

    this.loadedProps.set(prop.id, mesh);
    return mesh;
  }

  private createPlaceholderProp(prop: PropDefinition): Mesh {
    if (!this.scene) {
      throw new Error('Scene not set');
    }

    let mesh: Mesh;

    switch (prop.category) {
      case 'furniture':
        mesh = MeshBuilder.CreateBox(prop.id, { width: 0.5, height: 0.8, depth: 0.5 }, this.scene);
        break;
      case 'backdrop':
        const metadata = prop.metadata as { width?: number; height?: number } | undefined;
        mesh = MeshBuilder.CreatePlane(prop.id, {
          width: metadata?.width || 3,
          height: metadata?.height || 3,
        }, this.scene);
        mesh.rotation.x = Math.PI / 2;
        break;
      case 'decoration':
        mesh = MeshBuilder.CreateCylinder(prop.id, { diameter: 0.2, height: 0.4 }, this.scene);
        break;
      default:
        mesh = MeshBuilder.CreateBox(prop.id, { size: 0.3 }, this.scene);
    }

    const material = new StandardMaterial(`${prop.id}_mat`, this.scene);
    material.diffuseColor = new Color3(0.6, 0.6, 0.6);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    mesh.material = material;

    log.debug(`Created placeholder prop: ${prop.name}`);
    return mesh;
  }

  removeProp(propId: string): void {
    const mesh = this.loadedProps.get(propId);
    if (mesh) {
      mesh.dispose();
      this.loadedProps.delete(propId);
      log.debug(`Removed prop: ${propId}`);
    }
  }

  clearAllProps(): void {
    this.loadedProps.forEach((mesh) => mesh.dispose());
    this.loadedProps.clear();
    log.info('Cleared all props');
  }
}

export const propRenderingService = new PropRenderingService();
