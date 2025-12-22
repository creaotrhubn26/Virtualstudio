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

  constructor(canvas: HTMLCanvasElement) {
    console.log('Creating engine...');
    this.engine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false
    });
    
    console.log('Creating scene...');
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.15, 0.15, 0.2, 1);

    console.log('Creating camera...');
    this.camera = new BABYLON.ArcRotateCamera(
      'camera',
      0,
      Math.PI / 4,
      25,
      BABYLON.Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 100;
    this.camera.wheelDeltaPercentage = 0.01;

    console.log('Setting up studio...');
    this.setupStudio();
    this.setupEventListeners();
    this.setupUI();

    console.log('Starting render loop...');
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => this.engine.resize());
    
    this.engine.resize();
    console.log('Initialization complete. Canvas:', canvas.width, 'x', canvas.height);
  }

  private setupStudio(): void {
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.8;

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 30, height: 30 }, this.scene);
    const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
    ground.material = groundMat;

    this.gridMesh = BABYLON.MeshBuilder.CreateGround('grid', { width: 30, height: 30, subdivisions: 30 }, this.scene);
    const gridMat = new BABYLON.StandardMaterial('gridMat', this.scene);
    gridMat.wireframe = true;
    gridMat.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.6);
    this.gridMesh.material = gridMat;
    this.gridMesh.position.y = 0.02;

    const sphere = BABYLON.MeshBuilder.CreateSphere('testSphere', { diameter: 3 }, this.scene);
    sphere.position.y = 1.5;
    const sphereMat = new BABYLON.StandardMaterial('sphereMat', this.scene);
    sphereMat.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.4);
    sphere.material = sphereMat;

    const box = BABYLON.MeshBuilder.CreateBox('testBox', { size: 2 }, this.scene);
    box.position.set(-4, 1, 0);
    const boxMat = new BABYLON.StandardMaterial('boxMat', this.scene);
    boxMat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.9);
    box.material = boxMat;

    this.addSpotlight(new BABYLON.Vector3(-5, 8, 5));
    this.addSpotlight(new BABYLON.Vector3(5, 7, 3));
    
    console.log('Studio setup complete');
  }

  private setupEventListeners(): void {
    this.scene.onPointerObservable.add((info) => {
      if (info.type === BABYLON.PointerEventTypes.POINTERPICK && info.pickInfo?.pickedMesh) {
        for (const [id, data] of this.lights) {
          if (data.mesh === info.pickInfo.pickedMesh) {
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
      this.addSpotlight(new BABYLON.Vector3(Math.random() * 10 - 5, 5 + Math.random() * 4, Math.random() * 8 - 4));
    });

    document.getElementById('addPointLight')?.addEventListener('click', () => {
      this.addPointLight(new BABYLON.Vector3(Math.random() * 10 - 5, 3 + Math.random() * 4, Math.random() * 8 - 4));
    });

    document.getElementById('addAreaLight')?.addEventListener('click', () => {
      this.addAreaLight(new BABYLON.Vector3(Math.random() * 8 - 4, 5 + Math.random() * 3, Math.random() * 6 - 3));
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
          data.light.diffuse = BABYLON.Color3.FromHexString(hex);
          (data.mesh.material as BABYLON.StandardMaterial).emissiveColor = BABYLON.Color3.FromHexString(hex);
        }
      }
    });

    document.getElementById('deleteLight')?.addEventListener('click', () => {
      if (this.selectedLight) this.deleteLight(this.selectedLight);
    });

    document.getElementById('cameraFov')?.addEventListener('input', (e) => {
      this.camera.fov = (parseFloat((e.target as HTMLInputElement).value) * Math.PI) / 180;
    });

    document.getElementById('screenshot')?.addEventListener('click', () => this.takeScreenshot());

    document.getElementById('bgColor')?.addEventListener('input', (e) => {
      const c = BABYLON.Color3.FromHexString((e.target as HTMLInputElement).value);
      this.scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, 1);
    });

    document.getElementById('showGrid')?.addEventListener('change', (e) => {
      if (this.gridMesh) this.gridMesh.isVisible = (e.target as HTMLInputElement).checked;
    });
  }

  private createLightMesh(pos: BABYLON.Vector3, color: BABYLON.Color3, type: string): BABYLON.Mesh {
    let mesh: BABYLON.Mesh;
    if (type === 'spot') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(`lm_${this.lightCounter}`, { height: 0.5, diameterTop: 0.1, diameterBottom: 0.4 }, this.scene);
      mesh.rotation.x = Math.PI;
    } else if (type === 'area') {
      mesh = BABYLON.MeshBuilder.CreateBox(`lm_${this.lightCounter}`, { width: 1.5, height: 0.1, depth: 1 }, this.scene);
    } else {
      mesh = BABYLON.MeshBuilder.CreateSphere(`lm_${this.lightCounter}`, { diameter: 0.3 }, this.scene);
    }
    mesh.position = pos;
    const mat = new BABYLON.StandardMaterial(`lmat_${this.lightCounter}`, this.scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mesh.material = mat;
    return mesh;
  }

  addSpotlight(pos: BABYLON.Vector3): void {
    const id = `spot_${this.lightCounter++}`;
    const color = new BABYLON.Color3(1, 0.95, 0.85);
    const light = new BABYLON.SpotLight(id, pos, new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, this.scene);
    light.intensity = 5;
    light.diffuse = color;
    const mesh = this.createLightMesh(pos, color, 'spot');
    this.lights.set(id, { light, mesh });
    this.selectLight(id);
  }

  addPointLight(pos: BABYLON.Vector3): void {
    const id = `point_${this.lightCounter++}`;
    const color = new BABYLON.Color3(1, 0.9, 0.75);
    const light = new BABYLON.PointLight(id, pos, this.scene);
    light.intensity = 3;
    light.diffuse = color;
    const mesh = this.createLightMesh(pos, color, 'point');
    this.lights.set(id, { light, mesh });
    this.selectLight(id);
  }

  addAreaLight(pos: BABYLON.Vector3): void {
    const id = `area_${this.lightCounter++}`;
    const color = new BABYLON.Color3(1, 1, 1);
    const light = new BABYLON.PointLight(id, pos, this.scene);
    light.intensity = 6;
    light.diffuse = color;
    const mesh = this.createLightMesh(pos, color, 'area');
    this.lights.set(id, { light, mesh });
    this.selectLight(id);
  }

  private selectLight(id: string): void {
    this.deselectLight();
    this.selectedLight = id;
    const data = this.lights.get(id);
    if (data) {
      const panel = document.getElementById('selectedLight');
      if (panel) panel.style.display = 'block';
      (document.getElementById('lightIntensity') as HTMLInputElement).value = data.light.intensity.toString();
      (document.getElementById('lightColor') as HTMLInputElement).value = data.light.diffuse.toHexString();
    }
  }

  private deselectLight(): void {
    this.selectedLight = null;
    const panel = document.getElementById('selectedLight');
    if (panel) panel.style.display = 'none';
  }

  private deleteLight(id: string): void {
    const data = this.lights.get(id);
    if (data) {
      data.light.dispose();
      data.mesh.dispose();
      this.lights.delete(id);
      this.deselectLight();
    }
  }

  private async loadModel(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', url, this.scene, undefined, '.glb');
      const bounds = result.meshes[0].getHierarchyBoundingVectors();
      const center = bounds.min.add(bounds.max).scale(0.5);
      const size = bounds.max.subtract(bounds.min);
      const maxDim = Math.max(size.x, size.y, size.z);
      result.meshes.forEach(m => {
        m.position.subtractInPlace(center);
        m.position.y += size.y / 2;
        if (maxDim > 5) m.scaling.scaleInPlace(5 / maxDim);
      });
    } catch (err) {
      console.error('Model load error:', err);
      alert('Kunne ikke laste modellen.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private takeScreenshot(): void {
    BABYLON.Tools.CreateScreenshot(this.engine, this.camera, { width: 1920, height: 1080 }, (data: string) => {
      const a = document.createElement('a');
      a.download = `studio-${Date.now()}.png`;
      a.href = data;
      a.click();
    });
  }
}

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
if (canvas) {
  new VirtualStudio(canvas);
  console.log('VirtualStudio instance created');
} else {
  console.error('Canvas not found!');
}
