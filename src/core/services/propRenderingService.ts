import { Scene, SceneLoader, Mesh, MeshBuilder, StandardMaterial, PBRMaterial, Material, Color3, Vector3, AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { PropDefinition, PROP_DEFINITIONS } from '../data/propDefinitions';
import { StoryPropManifest } from '../../data/scenarioPresets';
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
  private environmentMeshes: AbstractMesh[] = [];

  setScene(scene: Scene): void {
    this.scene = scene;
    log.info('Scene set for prop rendering');
  }

  clearEnvironment(): void {
    this.environmentMeshes.forEach(m => {
      try { m.dispose(); } catch (err) { log.warn('Failed to dispose environment mesh:', err); }
    });
    this.environmentMeshes = [];
    log.info('Environment cleared');
  }

  async loadEnvironment(url: string, scale = 10): Promise<void> {
    if (!this.scene) {
      log.warn('loadEnvironment: scene not set');
      return;
    }
    this.clearEnvironment();
    try {
      const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);

      // Scale only the root mesh — children inherit the transform automatically.
      // Scaling every mesh individually causes double-scaling through the hierarchy.
      const root = result.meshes[0];
      if (root) {
        root.scaling.setAll(scale);
        root.position = Vector3.Zero();
      }

      result.meshes.forEach(m => {
        m.receiveShadows = true;
        m.isPickable = false;
        m.checkCollisions = false;

        if (m.material instanceof PBRMaterial) {
          m.material.unlit = false;
          m.material.backFaceCulling = false;
          m.material.twoSidedLighting = true;
        } else if (m.material instanceof StandardMaterial) {
          m.material.backFaceCulling = false;
        }

        this.environmentMeshes.push(m);
      });
      log.info(`Environment loaded: ${url} (${result.meshes.length} meshes, scale ${scale}×)`);
    } catch (err) {
      log.warn(`Failed to load environment GLB: ${url}`, err);
    }
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

        // Apply proper PBR shading to all meshes
        result.meshes.forEach((m) => {
          if (m instanceof Mesh) {
            m.receiveShadows = receiveShadow;
          }
          
          // Fix material shading
          if (m.material) {
            (m.material as Material).wireframe = false;
            
            if (m.material instanceof PBRMaterial) {
              m.material.unlit = false;
              m.material.transparencyMode = Material.MATERIAL_OPAQUE;
              m.material.alpha = 1.0;
              m.material.backFaceCulling = true;
              if (m.material.metallic === undefined || m.material.metallic === null) {
                m.material.metallic = 0.3;
              }
              if (m.material.roughness === undefined || m.material.roughness === null) {
                m.material.roughness = 0.5;
              }
              if (!m.material.albedoColor || 
                  (m.material.albedoColor.r < 0.05 && m.material.albedoColor.g < 0.05 && m.material.albedoColor.b < 0.05)) {
                m.material.albedoColor = new Color3(0.3, 0.3, 0.3);
              }
            } else if (m.material instanceof StandardMaterial) {
              m.material.disableLighting = false;
              m.material.backFaceCulling = true;
            }
          } else if (this.scene) {
            // No material - create PBR
            const pbrMat = new PBRMaterial(`pbrMat_${m.name}`, this.scene);
            pbrMat.albedoColor = new Color3(0.3, 0.3, 0.3);
            pbrMat.metallic = 0.3;
            pbrMat.roughness = 0.5;
            pbrMat.alpha = 1.0;
            pbrMat.transparencyMode = Material.MATERIAL_OPAQUE;
            pbrMat.backFaceCulling = true;
            m.material = pbrMat;
          }
        });

        log.info(`Loaded prop model with PBR shading: ${prop.name}`);
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

  /**
   * Load a prop and track it by an explicit instance key (e.g., manifest.id).
   * This allows multiple instances of the same PropDefinition in the same scene
   * (e.g., two chairs, two reflectors) without map-key collisions.
   */
  async loadPropInstance(instanceKey: string, prop: PropDefinition, options: PropLoadOptions = {}): Promise<AbstractMesh> {
    const mesh = await this.loadProp(prop, options);
    // Re-register under the instance key so clearAllProps() can dispose all instances
    this.loadedProps.delete(prop.id);
    this.loadedProps.set(instanceKey, mesh);
    return mesh;
  }

  private createPlaceholderProp(prop: PropDefinition): Mesh {
    if (!this.scene) {
      throw new Error('Scene not set');
    }

    const metadata = (prop.metadata || {}) as Record<string, unknown>;
    const primitive = typeof metadata.primitive === 'string' ? metadata.primitive : null;
    let mesh: Mesh;

    switch (primitive) {
      case 'stool':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameter: Number(metadata.diameter) || 0.42,
          height: Number(metadata.height) || 0.52,
          tessellation: 20,
        }, this.scene);
        break;
      case 'chair':
        mesh = MeshBuilder.CreateBox(prop.id, {
          width: Number(metadata.width) || 0.7,
          height: Number(metadata.height) || 0.95,
          depth: Number(metadata.depth) || 0.7,
        }, this.scene);
        break;
      case 'table-small':
      case 'rustic-table':
      case 'counter':
      case 'beauty-table':
        mesh = MeshBuilder.CreateBox(prop.id, {
          width: Number(metadata.width) || 1.8,
          height: Number(metadata.height) || 0.9,
          depth: Number(metadata.depth) || 0.7,
        }, this.scene);
        break;
      case 'oven-facade':
        mesh = MeshBuilder.CreateBox(prop.id, {
          width: Number(metadata.width) || 2.2,
          height: Number(metadata.height) || 2.0,
          depth: Number(metadata.depth) || 1.0,
        }, this.scene);
        break;
      case 'podium-round':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameter: Number(metadata.diameter) || 1.0,
          height: Number(metadata.height) || 1.0,
          tessellation: 40,
        }, this.scene);
        break;
      case 'pizza-display':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameter: Number(metadata.diameter) || 0.42,
          height: Number(metadata.height) || 0.04,
          tessellation: 28,
        }, this.scene);
        break;
      case 'wine-bottle':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameterTop: 0.06,
          diameterBottom: 0.1,
          height: Number(metadata.height) || 0.34,
          tessellation: 18,
        }, this.scene);
        break;
      case 'wine-glass':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameterTop: 0.12,
          diameterBottom: 0.05,
          height: Number(metadata.height) || 0.22,
          tessellation: 18,
        }, this.scene);
        break;
      case 'pizza-peel':
        mesh = MeshBuilder.CreateBox(prop.id, {
          width: Number(metadata.width) || 0.42,
          height: Number(metadata.height) || 1.25,
          depth: 0.04,
        }, this.scene);
        break;
      case 'menu-board':
      case 'neon-sign':
      case 'reflector-panel':
        mesh = MeshBuilder.CreatePlane(prop.id, {
          width: Number(metadata.width) || 1.2,
          height: Number(metadata.height) || 1.2,
        }, this.scene);
        break;
      case 'display-shelf':
        mesh = MeshBuilder.CreateBox(prop.id, {
          width: Number(metadata.width) || 1.4,
          height: Number(metadata.height) || 0.12,
          depth: Number(metadata.depth) || 0.25,
        }, this.scene);
        break;
      case 'table-round':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameter: Number(metadata.diameter) || 0.9,
          height: Number(metadata.height) || 0.76,
          tessellation: 32,
        }, this.scene);
        break;
      case 'disc':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameter: Number(metadata.diameter) || 0.35,
          height: Number(metadata.height) || 0.04,
          tessellation: 32,
        }, this.scene);
        break;
      case 'candle':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameter: Number(metadata.diameter) || 0.06,
          height: Number(metadata.height) || 0.22,
          tessellation: 12,
        }, this.scene);
        break;
      case 'sweep-table':
        mesh = MeshBuilder.CreateBox(prop.id, {
          width: Number(metadata.width) || 1.2,
          height: Number(metadata.height) || 0.75,
          depth: Number(metadata.depth) || 1.5,
        }, this.scene);
        break;
      case 'monitor-stand': {
        // Composite: vertical stand pole + screen panel parented to a root transform node
        const standH = Number(metadata.standHeight) || 1.1;
        const screenW = Number(metadata.width) || 0.62;
        const screenH = Number(metadata.height) || 0.48;
        const screenD = Number(metadata.depth) || 0.08;

        const root = MeshBuilder.CreateBox(`${prop.id}_root`, { size: 0.001 }, this.scene);
        root.isVisible = false;

        const pole = MeshBuilder.CreateCylinder(`${prop.id}_pole`, {
          diameter: 0.04,
          height: standH,
          tessellation: 10,
        }, this.scene);
        pole.parent = root;
        pole.position.y = standH / 2;

        const screen = MeshBuilder.CreateBox(`${prop.id}_screen`, {
          width: screenW,
          height: screenH,
          depth: screenD,
        }, this.scene);
        screen.parent = root;
        screen.position.y = standH + screenH / 2;

        mesh = root;
        break;
      }
      case 'props-cluster':
      case 'herb-pots':
      case 'vase':
      case 'plant':
        mesh = MeshBuilder.CreateCylinder(prop.id, {
          diameterTop: Number(metadata.width) || 0.6,
          diameterBottom: Number(metadata.depth) || 0.7,
          height: Number(metadata.height) || 0.4,
          tessellation: 6,
        }, this.scene);
        break;
      default:
        switch (prop.category) {
          case 'furniture':
            mesh = MeshBuilder.CreateBox(prop.id, { width: 0.5, height: 0.8, depth: 0.5 }, this.scene);
            break;
          case 'architecture':
            mesh = MeshBuilder.CreatePlane(prop.id, {
              width: Number(metadata.width) || 3,
              height: Number(metadata.height) || 3,
            }, this.scene);
            break;
          case 'decorations':
            mesh = MeshBuilder.CreateCylinder(prop.id, { diameter: 0.2, height: 0.4 }, this.scene);
            break;
          default:
            mesh = MeshBuilder.CreateBox(prop.id, { size: 0.3 }, this.scene);
        }
    }

    const material = new StandardMaterial(`${prop.id}_mat`, this.scene);
    material.diffuseColor = typeof metadata.color === 'string'
      ? Color3.FromHexString(metadata.color)
      : new Color3(0.6, 0.6, 0.6);
    material.specularColor = typeof metadata.accentColor === 'string'
      ? Color3.FromHexString(metadata.accentColor)
      : new Color3(0.2, 0.2, 0.2);
    material.backFaceCulling = primitive !== 'menu-board' && primitive !== 'neon-sign' && primitive !== 'reflector-panel';
    if (typeof metadata.emissiveColor === 'string') {
      material.emissiveColor = Color3.FromHexString(metadata.emissiveColor);
    }
    if (primitive === 'wine-glass') {
      material.alpha = 0.55;
    }
    mesh.material = material;

    log.debug(`Created placeholder prop: ${prop.name}`);
    return mesh;
  }

  /**
   * Load all props from a StoryPropManifest array into the scene.
   * Used by StorySceneLoaderService to populate story scenes.
   * @param manifests Array of prop manifests from the story preset
   * @param onProgress Optional progress callback (0-1)
   * @returns Array of loaded meshes keyed by manifest id
   */
  async loadStorySceneProps(
    manifests: StoryPropManifest[],
    onProgress?: (progress: number, label: string) => void,
  ): Promise<Map<string, AbstractMesh>> {
    const results = new Map<string, AbstractMesh>();
    if (!this.scene || manifests.length === 0) return results;

    for (let i = 0; i < manifests.length; i++) {
      const manifest = manifests[i];
      const propDef = PROP_DEFINITIONS.find(p => p.id === manifest.propId);

      onProgress?.(i / manifests.length, manifest.label);

      if (!propDef) {
        log.warn(`Story prop not found in definitions: ${manifest.propId}`);
        continue;
      }

      try {
        const [px, py, pz] = manifest.position;
        const [rx, ry, rz] = manifest.rotation ?? [0, 0, 0];
        const [sx, sy, sz] = manifest.scale ?? [1, 1, 1];

        // Manifest rotation values are in degrees — convert to radians for Babylon
        const DEG2RAD = Math.PI / 180;

        // Use manifest.id (instance key) not propDef.id to support multiple instances
        // of the same prop definition in the same scene (e.g. two chairs, two reflectors)
        const mesh = await this.loadPropInstance(manifest.id, propDef, {
          position: new Vector3(px, py, pz),
          scale: propDef.defaultScale * Math.max(sx, sy, sz),
        });

        mesh.name = `story_prop_${manifest.id}`;
        mesh.rotation = new Vector3(rx * DEG2RAD, ry * DEG2RAD, rz * DEG2RAD);
        if (manifest.scale) {
          mesh.scaling = new Vector3(
            propDef.defaultScale * sx,
            propDef.defaultScale * sy,
            propDef.defaultScale * sz,
          );
        }

        // Ground correction: shift Y so the prop's bottom face lands exactly
        // at the preset's target Y — regardless of whether the GLB pivot is at
        // the bottom or at the centre of the mesh.
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getHierarchyBoundingVectors(true);
        if (isFinite(bounds.min.y) && bounds.min.y !== bounds.max.y) {
          const bottomOffset = bounds.min.y - py;
          if (Math.abs(bottomOffset) > 0.001) {
            mesh.position.y -= bottomOffset;
            log.info(`[PropGround] ${manifest.id}: adjusted Y by ${(-bottomOffset).toFixed(3)}m (bottomY was ${bounds.min.y.toFixed(3)}, target ${py})`);
          }
        }

        results.set(manifest.id, mesh);
        log.info(`Story prop loaded: ${manifest.label} (${manifest.propId})`);
      } catch (err) {
        log.error(`Failed to load story prop ${manifest.propId}:`, err);
      }
    }

    onProgress?.(1, 'Props lastet');
    return results;
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
