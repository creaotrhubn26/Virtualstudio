import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

interface LightData {
  light: BABYLON.Light;
  mesh: BABYLON.Mesh;
  type: string;
  name: string;
  cct: number;
  modifier: string;
}

interface CameraSettings {
  aperture: number;
  shutter: string;
  iso: number;
  focalLength: number;
  nd: number;
}

class VirtualStudio {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.ArcRotateCamera;
  private lights: Map<string, LightData> = new Map();
  private selectedLightId: string | null = null;
  private lightCounter = 0;
  private gridMesh: BABYLON.Mesh | null = null;
  private gizmoManager: BABYLON.GizmoManager | null = null;
  private topViewCanvas: HTMLCanvasElement | null = null;
  private topViewCtx: CanvasRenderingContext2D | null = null;
  private histogramCanvas: HTMLCanvasElement | null = null;
  private histogramCtx: CanvasRenderingContext2D | null = null;
  
  private cameraSettings: CameraSettings = {
    aperture: 2.8,
    shutter: '1/125',
    iso: 100,
    focalLength: 35,
    nd: 0
  };

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true,
      stencil: true
    });
    
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.08, 0.09, 0.11, 1);

    this.camera = new BABYLON.ArcRotateCamera(
      'mainCamera',
      -Math.PI / 2,
      Math.PI / 3,
      18,
      new BABYLON.Vector3(0, 1.5, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 50;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.minZ = 0.1;
    this.camera.fov = (this.cameraSettings.focalLength / 50) * 0.8;

    this.gizmoManager = new BABYLON.GizmoManager(this.scene);
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.attachableMeshes = [];

    this.setupStudio();
    this.setupUI();
    this.setup2DViews();

    this.engine.runRenderLoop(() => {
      this.scene.render();
      this.updateTopView();
      this.updateHistogram();
      this.updateSelectedLightProperties();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
      this.resizeCanvases();
    });
    
    this.engine.resize();
    this.resizeCanvases();
  }

  private setupStudio(): void {
    const hemi = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.3;
    hemi.groundColor = new BABYLON.Color3(0.15, 0.15, 0.18);

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene);
    const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.18, 0.18, 0.22);
    groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    ground.material = groundMat;
    ground.receiveShadows = true;

    this.gridMesh = BABYLON.MeshBuilder.CreateGround('grid', { width: 20, height: 20, subdivisions: 20 }, this.scene);
    const gridMat = new BABYLON.StandardMaterial('gridMat', this.scene);
    gridMat.wireframe = true;
    gridMat.emissiveColor = new BABYLON.Color3(0.2, 0.25, 0.35);
    gridMat.alpha = 0.5;
    this.gridMesh.material = gridMat;
    this.gridMesh.position.y = 0.01;

    const wallMat = new BABYLON.StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
    wallMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);

    const backWall = BABYLON.MeshBuilder.CreatePlane('backWall', { width: 20, height: 8 }, this.scene);
    backWall.position.set(0, 4, -10);
    backWall.material = wallMat;

    const leftWall = BABYLON.MeshBuilder.CreatePlane('leftWall', { width: 20, height: 8 }, this.scene);
    leftWall.position.set(-10, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat;

    const rightWall = BABYLON.MeshBuilder.CreatePlane('rightWall', { width: 20, height: 8 }, this.scene);
    rightWall.position.set(10, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat;

    const model = BABYLON.MeshBuilder.CreateCapsule('mannequin', { height: 1.75, radius: 0.22 }, this.scene);
    model.position.set(0, 0.875, 0);
    const modelMat = new BABYLON.StandardMaterial('modelMat', this.scene);
    modelMat.diffuseColor = new BABYLON.Color3(0.6, 0.55, 0.5);
    modelMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    model.material = modelMat;

    this.addLight('godox-ad600', new BABYLON.Vector3(-3, 5, 3));
  }

  private setupUI(): void {
    this.scene.onPointerObservable.add((info) => {
      if (info.type === BABYLON.PointerEventTypes.POINTERPICK && info.pickInfo?.pickedMesh) {
        for (const [id, data] of this.lights) {
          if (data.mesh === info.pickInfo.pickedMesh) {
            this.selectLight(id);
            return;
          }
        }
      }
    });

    document.querySelectorAll('.equipment-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        if (type) {
          const pos = new BABYLON.Vector3(
            (Math.random() - 0.5) * 8,
            3 + Math.random() * 3,
            (Math.random() - 0.5) * 6
          );
          this.addLight(type, pos);
        }
      });
    });

    document.querySelectorAll('.focal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.focal-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const focal = parseInt(btn.getAttribute('data-focal') || '35');
        this.setFocalLength(focal);
      });
    });

    this.setupPropertyListeners();
    this.setupModalListeners();
    this.setupExportListeners();
  }

  private setupPropertyListeners(): void {
    ['posX', 'posY', 'posZ'].forEach((id, index) => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        if (!this.selectedLightId) return;
        const data = this.lights.get(this.selectedLightId);
        if (data) {
          const val = parseFloat((e.target as HTMLInputElement).value);
          if (index === 0) data.mesh.position.x = val;
          if (index === 1) data.mesh.position.y = val;
          if (index === 2) data.mesh.position.z = val;
        }
      });
    });

    ['rotX', 'rotY', 'rotZ'].forEach((id, index) => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        if (!this.selectedLightId) return;
        const data = this.lights.get(this.selectedLightId);
        if (data) {
          const val = parseFloat((e.target as HTMLInputElement).value) * Math.PI / 180;
          if (index === 0) data.mesh.rotation.x = val;
          if (index === 1) data.mesh.rotation.y = val;
          if (index === 2) data.mesh.rotation.z = val;
        }
      });
    });

    document.getElementById('cctSelect')?.addEventListener('change', (e) => {
      if (!this.selectedLightId) return;
      const data = this.lights.get(this.selectedLightId);
      if (data) {
        const cct = parseInt((e.target as HTMLSelectElement).value);
        data.cct = cct;
        const color = this.cctToColor(cct);
        data.light.diffuse = color;
        (data.mesh.material as BABYLON.StandardMaterial).emissiveColor = color;
      }
    });

    document.getElementById('sizeSlider')?.addEventListener('input', (e) => {
      if (!this.selectedLightId) return;
      const data = this.lights.get(this.selectedLightId);
      if (data) {
        const scale = parseFloat((e.target as HTMLInputElement).value) / 100;
        data.mesh.scaling.setAll(scale);
      }
    });

    document.getElementById('contrastSlider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      const display = document.getElementById('contrastValue');
      if (display) display.textContent = val.toFixed(1);
      if (this.selectedLightId) {
        const data = this.lights.get(this.selectedLightId);
        if (data && data.light instanceof BABYLON.SpotLight) {
          data.light.exponent = val;
        }
      }
    });

    document.getElementById('focusSlider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      const display = document.getElementById('focusValue');
      if (display) display.textContent = val.toFixed(1);
      if (this.selectedLightId) {
        const data = this.lights.get(this.selectedLightId);
        if (data && data.light instanceof BABYLON.SpotLight) {
          data.light.angle = (val / 20) * Math.PI / 2;
        }
      }
    });

    this.setupCameraControls();
  }

  private setupCameraControls(): void {
    document.getElementById('apertureSelect')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.cameraSettings.aperture = parseFloat(value) || 2.8;
      this.updateExposureDisplay();
    });

    document.getElementById('shutterSlider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      const shutters = ['1/30', '1/60', '1/125', '1/250', '1/500', '1/1000'];
      const idx = Math.floor(val / 100 * (shutters.length - 1));
      this.cameraSettings.shutter = shutters[idx];
      this.updateExposureDisplay();
    });

    ['isoFlat', 'isoHoj', 'isoHun'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        document.querySelectorAll('#isoFlat, #isoHoj, #isoHun').forEach(b => b.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        if (id === 'isoFlat') this.cameraSettings.iso = 100;
        if (id === 'isoHoj') this.cameraSettings.iso = 400;
        if (id === 'isoHun') this.cameraSettings.iso = 1600;
        this.updateExposureDisplay();
      });
    });

    document.getElementById('ndSlider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.cameraSettings.nd = Math.floor(val / 25) * 2;
      this.updateExposureDisplay();
    });
  }

  private updateExposureDisplay(): void {
    const exposureInfo = document.getElementById('exposureInfo');
    if (exposureInfo) {
      exposureInfo.textContent = `f/${this.cameraSettings.aperture} · ${this.cameraSettings.shutter}s · ISO ${this.cameraSettings.iso}`;
    }
    
    const quickISO = document.getElementById('quickISO');
    if (quickISO) quickISO.textContent = `ISO ${this.cameraSettings.iso}`;
    
    const ev = Math.log2(100 / this.cameraSettings.iso) + Math.log2(this.cameraSettings.aperture * this.cameraSettings.aperture) - this.cameraSettings.nd * 0.3;
    const quickEV = document.getElementById('quickEV');
    if (quickEV) quickEV.textContent = `${ev.toFixed(1)} EV`;

    this.updateSceneBrightness();
  }

  private updateSceneBrightness(): void {
    const isoFactor = this.cameraSettings.iso / 100;
    const apertureFactor = 1 / (this.cameraSettings.aperture * this.cameraSettings.aperture);
    const ndFactor = 1 / Math.pow(2, this.cameraSettings.nd);
    const brightness = isoFactor * apertureFactor * ndFactor * 2;
    
    for (const [, data] of this.lights) {
      const baseIntensity = data.type.includes('softbox') || data.type.includes('umbrella') ? 8 : 12;
      data.light.intensity = baseIntensity * brightness;
    }
  }

  private setupModalListeners(): void {
    document.getElementById('importModelBtn')?.addEventListener('click', () => {
      const modal = document.getElementById('modelModal');
      if (modal) modal.style.display = 'flex';
    });

    document.getElementById('closeModal')?.addEventListener('click', () => {
      const modal = document.getElementById('modelModal');
      if (modal) modal.style.display = 'none';
    });

    document.getElementById('modelInput')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadModel(file);
        const modal = document.getElementById('modelModal');
        if (modal) modal.style.display = 'none';
      }
    });
  }

  private setupExportListeners(): void {
    document.getElementById('snapshotBtn')?.addEventListener('click', () => this.takeScreenshot());
    document.getElementById('exportPng')?.addEventListener('click', () => this.takeScreenshot());
  }

  private setup2DViews(): void {
    this.topViewCanvas = document.getElementById('topViewCanvas') as HTMLCanvasElement;
    if (this.topViewCanvas) {
      this.topViewCtx = this.topViewCanvas.getContext('2d');
    }

    this.histogramCanvas = document.getElementById('histogramCanvas') as HTMLCanvasElement;
    if (this.histogramCanvas) {
      this.histogramCtx = this.histogramCanvas.getContext('2d');
    }

    this.resizeCanvases();
  }

  private resizeCanvases(): void {
    if (this.topViewCanvas) {
      const parent = this.topViewCanvas.parentElement;
      if (parent) {
        this.topViewCanvas.width = parent.clientWidth;
        this.topViewCanvas.height = parent.clientHeight;
      }
    }
  }

  private updateTopView(): void {
    if (!this.topViewCtx || !this.topViewCanvas) return;

    const ctx = this.topViewCtx;
    const w = this.topViewCanvas.width;
    const h = this.topViewCanvas.height;
    const scale = Math.min(w, h) / 24;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#1c2128';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + i * scale, 0);
      ctx.lineTo(cx + i * scale, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, cy + i * scale);
      ctx.lineTo(w, cy + i * scale);
      ctx.stroke();
    }

    ctx.strokeStyle = '#484f58';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 10 * scale, cy - 10 * scale, 20 * scale, 20 * scale);

    ctx.fillStyle = '#c9d1d9';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    for (const [id, data] of this.lights) {
      const x = cx + data.mesh.position.x * scale;
      const z = cy - data.mesh.position.z * scale;
      
      ctx.fillStyle = id === this.selectedLightId ? '#00d4ff' : '#58a6ff';
      ctx.beginPath();
      ctx.arc(x, z, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, z);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      if (data.type.includes('spot') || data.type.includes('godox') || data.type.includes('profoto')) {
        ctx.fillStyle = 'rgba(255, 255, 200, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x, z);
        ctx.arc(x, z, 40, Math.atan2(cy - z, cx - x) - 0.4, Math.atan2(cy - z, cx - x) + 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }

    const camX = cx + this.camera.position.x * scale * 0.5;
    const camZ = cy - this.camera.position.z * scale * 0.5;
    ctx.fillStyle = '#3fb950';
    ctx.beginPath();
    ctx.moveTo(camX, camZ - 8);
    ctx.lineTo(camX - 5, camZ + 5);
    ctx.lineTo(camX + 5, camZ + 5);
    ctx.closePath();
    ctx.fill();
  }

  private updateHistogram(): void {
    if (!this.histogramCtx || !this.histogramCanvas) return;

    const ctx = this.histogramCtx;
    const w = this.histogramCanvas.width;
    const h = this.histogramCanvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, h, w, 0);
    gradient.addColorStop(0, 'rgba(0, 100, 150, 0.6)');
    gradient.addColorStop(0.5, 'rgba(0, 150, 200, 0.8)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0.4)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, h);
    
    for (let x = 0; x < w; x++) {
      const noise = Math.random() * 0.3;
      const curve = Math.sin((x / w) * Math.PI) * 0.7 + noise;
      const y = h - (curve * h * 0.8);
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  private updateSelectedLightProperties(): void {
    if (!this.selectedLightId) return;
    
    const data = this.lights.get(this.selectedLightId);
    if (!data) return;

    const posX = document.getElementById('posX') as HTMLInputElement;
    const posY = document.getElementById('posY') as HTMLInputElement;
    const posZ = document.getElementById('posZ') as HTMLInputElement;

    if (posX && document.activeElement !== posX) {
      posX.value = data.mesh.position.x.toFixed(1);
    }
    if (posY && document.activeElement !== posY) {
      posY.value = data.mesh.position.y.toFixed(1);
    }
    if (posZ && document.activeElement !== posZ) {
      posZ.value = data.mesh.position.z.toFixed(1);
    }
  }

  private cctToColor(cct: number): BABYLON.Color3 {
    if (cct <= 2700) return new BABYLON.Color3(1, 0.76, 0.47);
    if (cct <= 3200) return new BABYLON.Color3(1, 0.82, 0.58);
    if (cct <= 4000) return new BABYLON.Color3(1, 0.89, 0.72);
    if (cct <= 5600) return new BABYLON.Color3(1, 0.96, 0.90);
    return new BABYLON.Color3(0.92, 0.95, 1);
  }

  private getLightName(type: string): string {
    const names: Record<string, string> = {
      'godox-ad600': 'Godox AD600Pro',
      'profoto-b10': 'Profoto B10',
      'aputure-120d': 'Aputure LS 120d II',
      'softbox': 'Softbox 90×120',
      'umbrella': 'Sølv Paraply',
      'reflector': 'Reflektor'
    };
    return names[type] || type;
  }

  addLight(type: string, position: BABYLON.Vector3): void {
    const id = `light_${this.lightCounter++}`;
    const cct = 5600;
    const color = this.cctToColor(cct);
    const name = this.getLightName(type);

    let light: BABYLON.Light;
    let mesh: BABYLON.Mesh;

    if (type.includes('softbox') || type.includes('umbrella')) {
      light = new BABYLON.PointLight(id, position.clone(), this.scene);
      light.intensity = 8;
      light.diffuse = color;
      (light as BABYLON.PointLight).range = 15;

      mesh = BABYLON.MeshBuilder.CreateBox(`mesh_${id}`, { width: 1.2, height: 0.1, depth: 0.9 }, this.scene);
    } else {
      light = new BABYLON.SpotLight(
        id, position.clone(),
        new BABYLON.Vector3(0, -0.8, -0.2).normalize(),
        Math.PI / 4, 2,
        this.scene
      );
      light.intensity = 12;
      light.diffuse = color;

      mesh = BABYLON.MeshBuilder.CreateCylinder(`mesh_${id}`, { 
        height: 0.5, diameterTop: 0.12, diameterBottom: 0.35 
      }, this.scene);
      mesh.rotation.x = Math.PI;
    }

    mesh.position = position.clone();
    const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mesh.material = mat;

    this.scene.onBeforeRenderObservable.add(() => {
      if (light instanceof BABYLON.SpotLight || light instanceof BABYLON.PointLight) {
        light.position = mesh.position.clone();
      }
    });

    const lightData: LightData = {
      light,
      mesh,
      type,
      name,
      cct,
      modifier: type.includes('softbox') ? 'Softbox' : 'Ingen'
    };

    this.lights.set(id, lightData);
    this.gizmoManager?.attachableMeshes?.push(mesh);
    this.selectLight(id);
    this.updateSceneList();
  }

  private selectLight(id: string): void {
    this.selectedLightId = id;
    const data = this.lights.get(id);
    
    if (data) {
      const propsPanel = document.getElementById('lightProperties');
      if (propsPanel) propsPanel.style.display = 'block';

      const nameEl = document.getElementById('selectedName');
      const typeEl = document.getElementById('selectedType');
      if (nameEl) nameEl.textContent = data.name;
      if (typeEl) typeEl.textContent = `(${data.type})`;

      const cctSelect = document.getElementById('cctSelect') as HTMLSelectElement;
      if (cctSelect) cctSelect.value = data.cct.toString();

      this.gizmoManager?.attachToMesh(data.mesh);
    }

    this.updateSceneList();
  }

  private updateSceneList(): void {
    const list = document.getElementById('sceneList');
    if (!list) return;

    list.innerHTML = '';
    for (const [id, data] of this.lights) {
      const item = document.createElement('div');
      item.className = `scene-item${id === this.selectedLightId ? ' selected' : ''}`;
      item.innerHTML = `<span class="equip-icon">●</span><span>${data.name}</span>`;
      item.addEventListener('click', () => this.selectLight(id));
      list.appendChild(item);
    }
  }

  private setFocalLength(mm: number): void {
    this.cameraSettings.focalLength = mm;
    this.camera.fov = (50 / mm) * 0.8;
    
    const quickFocal = document.getElementById('quickFocal');
    if (quickFocal) quickFocal.textContent = `${mm} mm`;
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
        
        const scale = maxDim > 2 ? 2 / maxDim : 1;
        result.meshes.forEach(m => {
          m.position.subtractInPlace(new BABYLON.Vector3(center.x, bounds.min.y, center.z));
          m.scaling.scaleInPlace(scale);
        });
      }
    } catch (err) {
      console.error('Model load error:', err);
      alert('Kunne ikke laste 3D-modellen.');
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
        link.download = `studio-${Date.now()}.png`;
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
