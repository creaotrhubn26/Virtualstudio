import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

class VirtualStudio {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.ArcRotateCamera;
  private lights: Map<string, { light: BABYLON.Light; mesh: BABYLON.Mesh }> = new Map();
  private selectedLight: string | null = null;
  private lightCounter = 0;
  private gridMesh: BABYLON.Mesh | null = null;
  private gizmoManager: BABYLON.GizmoManager | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true,
      stencil: true
    });
    
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);

    this.camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      20,
      new BABYLON.Vector3(0, 2, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 60;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.minZ = 0.1;

    this.gizmoManager = new BABYLON.GizmoManager(this.scene);
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.attachableMeshes = [];

    this.setupStudio();
    this.setupEventListeners();
    this.setupUI();

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => this.engine.resize());
    this.engine.resize();
  }

  private setupStudio(): void {
    const hemi = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.4;
    hemi.groundColor = new BABYLON.Color3(0.2, 0.2, 0.25);

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene);
    const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.3);
    groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;
    ground.receiveShadows = true;

    this.gridMesh = BABYLON.MeshBuilder.CreateGround('grid', { width: 20, height: 20, subdivisions: 20 }, this.scene);
    const gridMat = new BABYLON.StandardMaterial('gridMat', this.scene);
    gridMat.wireframe = true;
    gridMat.emissiveColor = new BABYLON.Color3(0.3, 0.35, 0.5);
    this.gridMesh.material = gridMat;
    this.gridMesh.position.y = 0.01;

    const wallMat = new BABYLON.StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    wallMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const backWall = BABYLON.MeshBuilder.CreatePlane('backWall', { width: 20, height: 10 }, this.scene);
    backWall.position.set(0, 5, -10);
    backWall.material = wallMat;
    backWall.receiveShadows = true;

    const leftWall = BABYLON.MeshBuilder.CreatePlane('leftWall', { width: 20, height: 10 }, this.scene);
    leftWall.position.set(-10, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat;
    leftWall.receiveShadows = true;

    const rightWall = BABYLON.MeshBuilder.CreatePlane('rightWall', { width: 20, height: 10 }, this.scene);
    rightWall.position.set(10, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat;
    rightWall.receiveShadows = true;

    const mannequin = BABYLON.MeshBuilder.CreateCapsule('mannequin', { height: 1.8, radius: 0.25 }, this.scene);
    mannequin.position.set(0, 0.9, 0);
    const mannequinMat = new BABYLON.StandardMaterial('mannequinMat', this.scene);
    mannequinMat.diffuseColor = new BABYLON.Color3(0.7, 0.6, 0.5);
    mannequinMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    mannequin.material = mannequinMat;

    this.addSpotlight(new BABYLON.Vector3(-4, 6, 4));
  }

  private setupEventListeners(): void {
    this.scene.onPointerObservable.add((info) => {
      if (info.type === BABYLON.PointerEventTypes.POINTERPICK && info.pickInfo?.pickedMesh) {
        const meshName = info.pickInfo.pickedMesh.name;
        for (const [id, data] of this.lights) {
          if (data.mesh.name === meshName || data.mesh === info.pickInfo.pickedMesh) {
            this.selectLight(id);
            return;
          }
        }
        this.deselectLight();
      }
    });
  }

  private setupUI(): void {
    document.getElementById('addSpotlight')?.addEventListener('click', () => {
      this.addSpotlight(new BABYLON.Vector3(
        (Math.random() - 0.5) * 10,
        4 + Math.random() * 4,
        (Math.random() - 0.5) * 8
      ));
    });

    document.getElementById('addPointLight')?.addEventListener('click', () => {
      this.addPointLight(new BABYLON.Vector3(
        (Math.random() - 0.5) * 10,
        3 + Math.random() * 3,
        (Math.random() - 0.5) * 8
      ));
    });

    document.getElementById('addAreaLight')?.addEventListener('click', () => {
      this.addAreaLight(new BABYLON.Vector3(
        (Math.random() - 0.5) * 8,
        4 + Math.random() * 3,
        (Math.random() - 0.5) * 6
      ));
    });

    document.getElementById('modelInput')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.loadModel(file);
    });

    document.getElementById('lightIntensity')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (this.selectedLight) {
        const data = this.lights.get(this.selectedLight);
        if (data) data.light.intensity = val;
      }
    });

    document.getElementById('lightColor')?.addEventListener('input', (e) => {
      const hex = (e.target as HTMLInputElement).value;
      if (this.selectedLight) {
        const data = this.lights.get(this.selectedLight);
        if (data) {
          const color = BABYLON.Color3.FromHexString(hex);
          data.light.diffuse = color;
          (data.mesh.material as BABYLON.StandardMaterial).emissiveColor = color;
        }
      }
    });

    document.getElementById('deleteLight')?.addEventListener('click', () => {
      if (this.selectedLight) this.deleteLight(this.selectedLight);
    });

    document.getElementById('cameraFov')?.addEventListener('input', (e) => {
      const fov = parseFloat((e.target as HTMLInputElement).value);
      this.camera.fov = (fov * Math.PI) / 180;
    });

    document.getElementById('screenshot')?.addEventListener('click', () => this.takeScreenshot());

    document.getElementById('bgColor')?.addEventListener('input', (e) => {
      const color = BABYLON.Color3.FromHexString((e.target as HTMLInputElement).value);
      this.scene.clearColor = new BABYLON.Color4(color.r, color.g, color.b, 1);
    });

    document.getElementById('showGrid')?.addEventListener('change', (e) => {
      if (this.gridMesh) {
        this.gridMesh.isVisible = (e.target as HTMLInputElement).checked;
      }
    });
  }

  private createLightMesh(pos: BABYLON.Vector3, color: BABYLON.Color3, type: string): BABYLON.Mesh {
    let mesh: BABYLON.Mesh;
    const id = this.lightCounter;
    
    if (type === 'spot') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(`lightMesh_${id}`, { 
        height: 0.6, diameterTop: 0.15, diameterBottom: 0.5 
      }, this.scene);
      mesh.rotation.x = Math.PI;
    } else if (type === 'area') {
      mesh = BABYLON.MeshBuilder.CreateBox(`lightMesh_${id}`, { 
        width: 1.8, height: 0.15, depth: 1.2 
      }, this.scene);
    } else {
      mesh = BABYLON.MeshBuilder.CreateSphere(`lightMesh_${id}`, { diameter: 0.35 }, this.scene);
    }
    
    mesh.position = pos.clone();
    const mat = new BABYLON.StandardMaterial(`lightMat_${id}`, this.scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mesh.material = mat;
    
    return mesh;
  }

  private linkLightToMesh(light: BABYLON.Light, mesh: BABYLON.Mesh): void {
    this.scene.onBeforeRenderObservable.add(() => {
      if (light instanceof BABYLON.SpotLight || light instanceof BABYLON.PointLight) {
        light.position = mesh.position.clone();
      }
    });
  }

  addSpotlight(pos: BABYLON.Vector3): void {
    const id = `spot_${this.lightCounter++}`;
    const color = new BABYLON.Color3(1, 0.95, 0.9);
    
    const light = new BABYLON.SpotLight(
      id, pos.clone(), 
      new BABYLON.Vector3(0, -1, 0), 
      Math.PI / 3, 2, 
      this.scene
    );
    light.intensity = 8;
    light.diffuse = color;

    const mesh = this.createLightMesh(pos, color, 'spot');
    this.linkLightToMesh(light, mesh);
    
    this.lights.set(id, { light, mesh });
    if (this.gizmoManager) {
      this.gizmoManager.attachableMeshes?.push(mesh);
    }
    this.selectLight(id);
  }

  addPointLight(pos: BABYLON.Vector3): void {
    const id = `point_${this.lightCounter++}`;
    const color = new BABYLON.Color3(1, 0.9, 0.8);
    
    const light = new BABYLON.PointLight(id, pos.clone(), this.scene);
    light.intensity = 5;
    light.diffuse = color;

    const mesh = this.createLightMesh(pos, color, 'point');
    this.linkLightToMesh(light, mesh);
    
    this.lights.set(id, { light, mesh });
    if (this.gizmoManager) {
      this.gizmoManager.attachableMeshes?.push(mesh);
    }
    this.selectLight(id);
  }

  addAreaLight(pos: BABYLON.Vector3): void {
    const id = `area_${this.lightCounter++}`;
    const color = new BABYLON.Color3(1, 1, 1);
    
    const light = new BABYLON.PointLight(id, pos.clone(), this.scene);
    light.intensity = 12;
    light.diffuse = color;
    light.range = 15;

    const mesh = this.createLightMesh(pos, color, 'area');
    this.linkLightToMesh(light, mesh);
    
    this.lights.set(id, { light, mesh });
    if (this.gizmoManager) {
      this.gizmoManager.attachableMeshes?.push(mesh);
    }
    this.selectLight(id);
  }

  private selectLight(id: string): void {
    this.deselectLight();
    this.selectedLight = id;
    
    const data = this.lights.get(id);
    if (data) {
      const panel = document.getElementById('selectedLight');
      if (panel) panel.style.display = 'block';
      
      const intensitySlider = document.getElementById('lightIntensity') as HTMLInputElement;
      const colorPicker = document.getElementById('lightColor') as HTMLInputElement;
      
      if (intensitySlider) intensitySlider.value = data.light.intensity.toString();
      if (colorPicker) colorPicker.value = data.light.diffuse.toHexString();
      
      if (this.gizmoManager) {
        this.gizmoManager.attachToMesh(data.mesh);
      }
    }
  }

  private deselectLight(): void {
    this.selectedLight = null;
    const panel = document.getElementById('selectedLight');
    if (panel) panel.style.display = 'none';
    if (this.gizmoManager) {
      this.gizmoManager.attachToMesh(null);
    }
  }

  private deleteLight(id: string): void {
    const data = this.lights.get(id);
    if (data) {
      if (this.gizmoManager) {
        const meshes = this.gizmoManager.attachableMeshes;
        if (meshes) {
          const idx = meshes.indexOf(data.mesh);
          if (idx > -1) meshes.splice(idx, 1);
        }
      }
      data.light.dispose();
      data.mesh.dispose();
      this.lights.delete(id);
      this.deselectLight();
    }
  }

  private async loadModel(file: File): Promise<void> {
    const ext = file.name.toLowerCase().endsWith('.gltf') ? '.gltf' : '.glb';
    const url = URL.createObjectURL(file);
    
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', url, this.scene, undefined, ext);
      
      if (result.meshes.length > 0) {
        const root = result.meshes[0];
        const bounds = root.getHierarchyBoundingVectors(true);
        const center = bounds.min.add(bounds.max).scale(0.5);
        const size = bounds.max.subtract(bounds.min);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const scale = maxDim > 3 ? 3 / maxDim : 1;
        result.meshes.forEach(m => {
          m.position.subtractInPlace(new BABYLON.Vector3(center.x, bounds.min.y, center.z));
          m.scaling.scaleInPlace(scale);
        });
      }
    } catch (err) {
      console.error('Model load error:', err);
      alert('Kunne ikke laste 3D-modellen. Sjekk at filen er en gyldig GLB/GLTF-fil.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private takeScreenshot(): void {
    BABYLON.Tools.CreateScreenshot(
      this.engine, 
      this.camera, 
      { width: 1920, height: 1080 }, 
      (data: string) => {
        const link = document.createElement('a');
        link.download = `studio-screenshot-${Date.now()}.png`;
        link.href = data;
        link.click();
      }
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (canvas) {
    new VirtualStudio(canvas);
  }
});
