import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useAppStore } from './state/store';
import { virtualActorService } from './core/services/virtualActorService';

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

    virtualActorService.setScene(this.scene);
    
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
    this.setupScopeControls();
  }

  private currentScopeMode: 'histogram' | 'waveform' | 'vectorscope' | 'skin' | 'zebra' | 'falsecolor' = 'histogram';
  private scopeExpanded: boolean = false;

  private setupScopeControls(): void {
    const menuBtn = document.getElementById('scopeMenuBtn');
    const expandBtn = document.getElementById('scopeExpandBtn');
    const menu = document.getElementById('scopeMenu');
    const container = document.getElementById('scopeContainer');
    const label = document.getElementById('scopeLabel');

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      menu?.classList.toggle('visible');
      menuBtn.setAttribute('aria-expanded', menu?.classList.contains('visible') ? 'true' : 'false');
    });

    expandBtn?.addEventListener('click', () => {
      this.scopeExpanded = !this.scopeExpanded;
      container?.classList.toggle('expanded', this.scopeExpanded);
      expandBtn.setAttribute('aria-pressed', this.scopeExpanded ? 'true' : 'false');
      
      const canvas = this.histogramCanvas;
      if (canvas) {
        if (this.scopeExpanded) {
          canvas.width = 300;
          canvas.height = 150;
        } else {
          canvas.width = 140;
          canvas.height = 70;
        }
      }
    });

    document.querySelectorAll('.scope-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const mode = item.getAttribute('data-scope') as typeof this.currentScopeMode;
        if (mode) {
          this.currentScopeMode = mode;
          
          document.querySelectorAll('.scope-menu-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          
          const modeLabels: Record<string, string> = {
            'histogram': 'Histogram',
            'waveform': 'Waveform',
            'vectorscope': 'Vectorscope',
            'skin': 'Hudtone',
            'zebra': 'Zebra',
            'falsecolor': 'False Color'
          };
          if (label) label.textContent = modeLabels[mode] || mode;
          
          menu?.classList.remove('visible');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!container?.contains(e.target as Node)) {
        menu?.classList.remove('visible');
      }
    });
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

  private histogramData: { r: number[], g: number[], b: number[], lum: number[] } = {
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    lum: new Array(256).fill(0)
  };
  private highlightClipping: number = 0;
  private histogramFrameCount: number = 0;

  private updateHistogram(): void {
    if (!this.histogramCtx || !this.histogramCanvas) return;

    // Only update histogram every 10 frames for performance
    this.histogramFrameCount++;
    if (this.histogramFrameCount % 10 === 0) {
      this.calculateHistogramFromScene();
    }

    switch (this.currentScopeMode) {
      case 'histogram':
        this.drawHistogram();
        break;
      case 'waveform':
        this.drawWaveform();
        break;
      case 'vectorscope':
        this.drawVectorscope();
        break;
      case 'skin':
        this.drawSkinIndicator();
        break;
      case 'zebra':
        this.drawZebra();
        break;
      case 'falsecolor':
        this.drawFalseColor();
        break;
      default:
        this.drawHistogram();
    }
  }

  private calculateHistogramFromScene(): void {
    // Read pixels from the render canvas
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    
    // Sample every Nth pixel for performance (sample ~10000 pixels)
    const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 10000)));
    
    // Reset histogram bins
    this.histogramData.r.fill(0);
    this.histogramData.g.fill(0);
    this.histogramData.b.fill(0);
    this.histogramData.lum.fill(0);
    
    let totalPixels = 0;
    let clippedPixels = 0;

    // Read pixels from engine
    this.engine.readPixels(0, 0, width, height).then((pixels) => {
      if (!pixels) return;
      
      const data = new Uint8Array(pixels.buffer);
      
      for (let y = 0; y < height; y += sampleStep) {
        for (let x = 0; x < width; x += sampleStep) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Calculate luminance (Rec. 709)
          const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
          
          this.histogramData.r[r]++;
          this.histogramData.g[g]++;
          this.histogramData.b[b]++;
          this.histogramData.lum[lum]++;
          
          totalPixels++;
          
          // Check for highlight clipping (values near 255)
          if (r >= 250 || g >= 250 || b >= 250) {
            clippedPixels++;
          }
        }
      }
      
      // Calculate highlight clipping percentage
      this.highlightClipping = totalPixels > 0 ? (clippedPixels / totalPixels) * 100 : 0;
      
      // Update highlight display
      const highlightEl = document.getElementById('highlightPercent');
      if (highlightEl) {
        highlightEl.textContent = `Høylys ${this.highlightClipping.toFixed(1)}%`;
      }
    });
  }

  private drawHistogram(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;

    // Clear with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Find max value for normalization
    const maxVal = Math.max(
      ...this.histogramData.lum.slice(5, 250), // Ignore extreme ends
      1
    );

    // Draw luminance histogram
    const binWidth = w / 256;
    
    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, h, w, 0);
    gradient.addColorStop(0, 'rgba(0, 80, 120, 0.7)');
    gradient.addColorStop(0.5, 'rgba(0, 150, 200, 0.8)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0.6)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, h);
    
    for (let i = 0; i < 256; i++) {
      const x = i * binWidth;
      const barHeight = (this.histogramData.lum[i] / maxVal) * (h - 4);
      const y = h - Math.min(barHeight, h - 2);
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        // Smooth curve
        const prevX = (i - 1) * binWidth;
        const prevY = h - Math.min((this.histogramData.lum[i - 1] / maxVal) * (h - 4), h - 2);
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }
    }
    
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Draw thin RGB lines on top
    this.drawChannelLine(ctx, this.histogramData.r, maxVal, 'rgba(255, 80, 80, 0.5)', w, h);
    this.drawChannelLine(ctx, this.histogramData.g, maxVal, 'rgba(80, 255, 80, 0.5)', w, h);
    this.drawChannelLine(ctx, this.histogramData.b, maxVal, 'rgba(80, 80, 255, 0.5)', w, h);

    // Draw highlight clipping warning if > 1%
    if (this.highlightClipping > 1) {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.fillRect(w - 20, 0, 20, h);
    }
  }

  private drawChannelLine(ctx: CanvasRenderingContext2D, data: number[], maxVal: number, color: string, w: number, h: number): void {
    const binWidth = w / 256;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < 256; i++) {
      const x = i * binWidth;
      const barHeight = (data[i] / maxVal) * (h - 4);
      const y = h - Math.min(barHeight, h - 2);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  private drawWaveform(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 100; y += 25) {
      const py = h - (y / 100) * h;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Draw waveform based on luminance distribution
    const maxVal = Math.max(...this.histogramData.lum.slice(5, 250), 1);
    
    for (let i = 0; i < 256; i++) {
      const x = (i / 256) * w;
      const intensity = this.histogramData.lum[i] / maxVal;
      
      if (intensity > 0.01) {
        const lumY = h - (i / 255) * h;
        const alpha = Math.min(intensity * 2, 1);
        ctx.fillStyle = `rgba(0, 255, 150, ${alpha * 0.5})`;
        ctx.fillRect(x, lumY - 1, w / 256 + 1, 3);
      }
    }
  }

  private drawVectorscope(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Draw circular grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Draw crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Draw color targets (skin tone line, etc)
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * 0.7, cy - radius * 0.4);
    ctx.stroke();

    // Plot color distribution
    const maxR = Math.max(...this.histogramData.r, 1);
    const maxG = Math.max(...this.histogramData.g, 1);
    const maxB = Math.max(...this.histogramData.b, 1);

    for (let i = 0; i < 256; i++) {
      const rVal = this.histogramData.r[i] / maxR;
      const gVal = this.histogramData.g[i] / maxG;
      const bVal = this.histogramData.b[i] / maxB;
      
      if (rVal > 0.05 || gVal > 0.05 || bVal > 0.05) {
        const u = (rVal - gVal) * radius * 0.5;
        const v = (bVal - (rVal + gVal) / 2) * radius * 0.5;
        const alpha = Math.max(rVal, gVal, bVal) * 0.8;
        ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
        ctx.fillRect(cx + u - 1, cy + v - 1, 2, 2);
      }
    }
  }

  private drawSkinIndicator(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Draw skin tone reference zones
    const skinZones = [
      { name: 'Lys', y: 0.15, color: 'rgba(255, 220, 200, 0.3)' },
      { name: 'Medium', y: 0.45, color: 'rgba(200, 150, 120, 0.3)' },
      { name: 'Mørk', y: 0.75, color: 'rgba(120, 80, 60, 0.3)' }
    ];

    skinZones.forEach(zone => {
      const y = zone.y * h;
      ctx.fillStyle = zone.color;
      ctx.fillRect(0, y, w, h * 0.25);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '9px sans-serif';
      ctx.fillText(zone.name, 4, y + 14);
    });

    // Draw optimal skin tone line
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 0);
    ctx.lineTo(w * 0.7, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 200, 150, 0.6)';
    ctx.font = '10px sans-serif';
    ctx.fillText('Hudtone-linje', w * 0.5, h - 6);
  }

  private drawZebra(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Draw exposure zones
    const zones = [
      { level: '100%+', y: 0, h: h * 0.15, color: 'rgba(255, 0, 0, 0.4)', text: 'Utbrent' },
      { level: '95-100%', y: h * 0.15, h: h * 0.15, color: 'rgba(255, 150, 0, 0.3)', text: 'Advarsel' },
      { level: '70-95%', y: h * 0.3, h: h * 0.25, color: 'rgba(255, 255, 100, 0.2)', text: 'Høylys' },
      { level: '30-70%', y: h * 0.55, h: h * 0.25, color: 'rgba(100, 200, 100, 0.2)', text: 'Mellomtoner' },
      { level: '0-30%', y: h * 0.8, h: h * 0.2, color: 'rgba(50, 100, 200, 0.2)', text: 'Skygger' }
    ];

    zones.forEach(zone => {
      ctx.fillStyle = zone.color;
      ctx.fillRect(0, zone.y, w, zone.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '9px sans-serif';
      ctx.fillText(zone.text, 4, zone.y + zone.h / 2 + 3);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(zone.level, w - 40, zone.y + zone.h / 2 + 3);
    });

    // Show clipping percentage
    ctx.fillStyle = this.highlightClipping > 1 ? 'rgba(255, 100, 100, 1)' : 'rgba(100, 255, 100, 1)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${this.highlightClipping.toFixed(1)}% klippet`, w / 2 - 30, 12);
  }

  private drawFalseColor(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // False color legend
    const colors = [
      { range: '0-10%', color: '#0000ff', label: 'Undereks.' },
      { range: '10-30%', color: '#00aa00', label: 'Skygger' },
      { range: '30-50%', color: '#00ff00', label: 'Mellom' },
      { range: '50-70%', color: '#ffff00', label: 'Høylys' },
      { range: '70-90%', color: '#ff8800', label: 'Varsel' },
      { range: '90-100%', color: '#ff0000', label: 'Overeks.' }
    ];

    const barHeight = h / colors.length;
    colors.forEach((c, i) => {
      const y = i * barHeight;
      ctx.fillStyle = c.color;
      ctx.fillRect(0, y, w * 0.15, barHeight - 1);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '9px sans-serif';
      ctx.fillText(c.label, w * 0.18, y + barHeight / 2 + 3);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(c.range, w * 0.6, y + barHeight / 2 + 3);
    });
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

    const actors = this.scene.meshes.filter(m => 
      m.name.startsWith('actor-') && !m.name.includes('gizmo')
    );
    
    for (const actor of actors) {
      const item = document.createElement('div');
      item.className = 'scene-item';
      item.innerHTML = `<span class="equip-icon" style="color: var(--accent-cyan);">◆</span><span>${actor.name}</span>`;
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

  public addActorToScene(actorId: string): void {
    const state = useAppStore.getState();
    const actorNode = state.getNode(actorId);
    
    if (!actorNode) {
      console.warn('Actor not found in state:', actorId);
      return;
    }

    const existingMesh = this.scene.getMeshByName(actorId);
    if (existingMesh) {
      existingMesh.dispose();
    }

    const userData = actorNode.userData as Record<string, unknown> | undefined;
    const skinTone = (userData?.skinTone as string) || '#EAC086';
    const height = (userData?.height as number) || 175;
    const scaledHeight = height / 100;

    const capsule = BABYLON.MeshBuilder.CreateCapsule(actorId, {
      height: scaledHeight,
      radius: scaledHeight * 0.125,
      tessellation: 16,
      subdivisions: 4
    }, this.scene);

    const pos = actorNode.transform.position;
    capsule.position = new BABYLON.Vector3(pos[0], pos[1] + scaledHeight / 2, pos[2]);

    const material = new BABYLON.StandardMaterial(`${actorId}_mat`, this.scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(skinTone);
    material.specularColor = new BABYLON.Color3(0.15, 0.12, 0.1);
    capsule.material = material;

    this.updateSceneList();
    console.log('Actor added to 3D scene:', actorId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (canvas) {
    const studio = new VirtualStudio(canvas);
    
    const actorPanelRoot = document.getElementById('actorPanelRoot');
    const actorBottomPanel = document.getElementById('actorBottomPanel');
    const actorPanelTrigger = document.getElementById('actorPanelTrigger');
    const actorTab = document.getElementById('actorTab');
    
    if (actorPanelRoot && actorBottomPanel && actorPanelTrigger) {
      const root = createRoot(actorPanelRoot);
      root.render(React.createElement(App, { 
        onActorGenerated: (actorId: string) => {
          console.log('Actor generated:', actorId);
          studio.addActorToScene(actorId);
        }
      }));
      
      const togglePanel = () => {
        const isOpen = actorBottomPanel.classList.contains('open');
        if (isOpen) {
          actorBottomPanel.classList.remove('open');
          actorPanelTrigger.classList.remove('active');
          const arrow = actorPanelTrigger.querySelector('.category-arrow');
          if (arrow) arrow.textContent = '▶';
          if (actorTab) actorTab.classList.remove('panel-open');
        } else {
          actorBottomPanel.classList.add('open');
          actorPanelTrigger.classList.add('active');
          const arrow = actorPanelTrigger.querySelector('.category-arrow');
          if (arrow) arrow.textContent = '▼';
          if (actorTab) actorTab.classList.add('panel-open');
        }
      };
      
      actorPanelTrigger.addEventListener('click', togglePanel);
      
      if (actorTab) {
        actorTab.addEventListener('click', togglePanel);
      }
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && actorBottomPanel.classList.contains('open')) {
          togglePanel();
        }
      });
      
      const addToHierarchy = (id: string, name: string, type: 'model' | 'light' | 'equipment') => {
        let groupId = '';
        let countId = '';
        let thumbClass = '';
        let itemType = '';
        
        switch (type) {
          case 'model':
            groupId = 'modelsGroup';
            countId = 'modelsCount';
            thumbClass = 'model-thumb';
            itemType = 'Karakter';
            break;
          case 'light':
            groupId = 'lightsGroup';
            countId = 'lightsCount';
            thumbClass = 'light-thumb';
            itemType = 'Lyskilde';
            break;
          case 'equipment':
            groupId = 'equipmentGroup';
            countId = 'equipmentCount';
            thumbClass = 'equip-thumb';
            itemType = 'Modifier';
            break;
        }
        
        const group = document.getElementById(groupId);
        const countEl = document.getElementById(countId);
        
        if (group) {
          const emptyMsg = group.querySelector('.hierarchy-empty');
          if (emptyMsg) emptyMsg.remove();
          
          const itemHtml = `
            <div class="hierarchy-item selected" data-id="${id}">
              <div class="item-thumbnail ${thumbClass}"></div>
              <div class="item-info">
                <span class="item-name">${name}</span>
                <span class="item-type">${itemType}</span>
              </div>
              <div class="item-actions">
                <button class="action-icon visibility-btn active" title="Synlig"></button>
                <button class="action-icon delete-btn" title="Slett"></button>
              </div>
            </div>
          `;
          
          if (countEl) {
            const currentCount = parseInt(countEl.textContent || '0');
            countEl.textContent = String(currentCount + 1);
          }
          group.insertAdjacentHTML('beforeend', itemHtml);
          
          document.querySelectorAll('.hierarchy-item').forEach(item => item.classList.remove('selected'));
          const newItem = group.querySelector(`[data-id="${id}"]`);
          if (newItem) {
            newItem.classList.add('selected');
            
            newItem.addEventListener('click', () => {
              document.querySelectorAll('.hierarchy-item').forEach(i => i.classList.remove('selected'));
              newItem.classList.add('selected');
            });
            
            const deleteBtn = newItem.querySelector('.delete-btn');
            if (deleteBtn) {
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                newItem.remove();
                
                if (countEl) {
                  const currentCount = parseInt(countEl.textContent || '1');
                  countEl.textContent = String(Math.max(0, currentCount - 1));
                }
                
                if (group.querySelectorAll('.hierarchy-item').length === 0) {
                  const emptyClass = type === 'model' ? 'model-empty' : type === 'light' ? 'light-empty' : 'equip-empty';
                  const emptyText = type === 'model' ? 'Ingen modeller' : 
                                   type === 'light' ? 'Ingen lys' : 'Ingen utstyr';
                  group.innerHTML = `
                    <div class="hierarchy-empty">
                      <div class="empty-icon ${emptyClass}"></div>
                      <span>${emptyText}</span>
                      <span class="empty-hint">Legg til fra Studio Library</span>
                    </div>
                  `;
                }
                const noSelection = document.getElementById('noSelection');
                const objectHeader = document.getElementById('objectHeader');
                const transformSection = document.getElementById('transformSection');
                const feetSection = document.getElementById('feetSection');
                const handsSection = document.getElementById('handsSection');
                const lightProperties = document.getElementById('lightProperties');
                if (noSelection) noSelection.style.display = 'block';
                if (objectHeader) objectHeader.style.display = 'none';
                if (transformSection) transformSection.style.display = 'none';
                if (feetSection) feetSection.style.display = 'none';
                if (handsSection) handsSection.style.display = 'none';
                if (lightProperties) lightProperties.style.display = 'none';
              });
            }
            
            const visibilityBtn = newItem.querySelector('.visibility-btn');
            if (visibilityBtn) {
              visibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                visibilityBtn.classList.toggle('active');
              });
            }
          }
        }
      };
      
      const showObjectProperties = (name: string, type: 'model' | 'light' | 'equipment', position = [0, 0, 0], rotation = [0, 0, 0]) => {
        const noSelection = document.getElementById('noSelection');
        const objectHeader = document.getElementById('objectHeader');
        const transformSection = document.getElementById('transformSection');
        const feetSection = document.getElementById('feetSection');
        const handsSection = document.getElementById('handsSection');
        const lightProperties = document.getElementById('lightProperties');
        const objectName = document.getElementById('objectName');
        
        if (noSelection) noSelection.style.display = 'none';
        if (objectHeader) objectHeader.style.display = 'block';
        if (transformSection) transformSection.style.display = 'block';
        if (objectName) objectName.textContent = name;
        
        const posXInput = document.getElementById('posX') as HTMLInputElement;
        const posYInput = document.getElementById('posY') as HTMLInputElement;
        const posZInput = document.getElementById('posZ') as HTMLInputElement;
        const rotXInput = document.getElementById('rotX') as HTMLInputElement;
        const rotYInput = document.getElementById('rotY') as HTMLInputElement;
        const rotZInput = document.getElementById('rotZ') as HTMLInputElement;
        
        if (posXInput) posXInput.value = `${position[0].toFixed(2)} m`;
        if (posYInput) posYInput.value = `${position[1].toFixed(2)} m`;
        if (posZInput) posZInput.value = `${position[2].toFixed(2)} m`;
        if (rotXInput) rotXInput.value = `${rotation[0].toFixed(0)} °`;
        if (rotYInput) rotYInput.value = `${rotation[1].toFixed(0)} °`;
        if (rotZInput) rotZInput.value = `${rotation[2].toFixed(0)} °`;
        
        if (type === 'model') {
          if (feetSection) feetSection.style.display = 'block';
          if (handsSection) handsSection.style.display = 'block';
          if (lightProperties) lightProperties.style.display = 'none';
        } else if (type === 'light') {
          if (feetSection) feetSection.style.display = 'none';
          if (handsSection) handsSection.style.display = 'none';
          if (lightProperties) lightProperties.style.display = 'block';
        } else {
          if (feetSection) feetSection.style.display = 'none';
          if (handsSection) handsSection.style.display = 'none';
          if (lightProperties) lightProperties.style.display = 'none';
        }
      };
      
      document.querySelectorAll('.actor-model-card').forEach(card => {
        card.addEventListener('click', () => {
          const actorName = card.getAttribute('data-actor') || 'Actor';
          const actorId = `actor-${Date.now()}`;
          const displayName = actorName.charAt(0).toUpperCase() + actorName.slice(1);
          
          useAppStore.getState().addNode({
            id: actorId,
            type: 'model',
            name: displayName,
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            visible: true,
            userData: { skinTone: '#D4A574', height: 170 }
          });
          
          studio.addActorToScene(actorId);
          addToHierarchy(actorId, displayName, 'model');
          showObjectProperties(displayName, 'model', [0, 0, 0], [0, 0, 0]);
          console.log('Added actor:', actorName);
        });
      });
      
      document.querySelectorAll('.equipment-card[data-light]').forEach(card => {
        card.addEventListener('click', () => {
          const lightName = card.querySelector('.equipment-name')?.textContent || 'Light';
          const lightId = `light-${Date.now()}`;
          
          useAppStore.getState().addNode({
            id: lightId,
            type: 'light',
            name: lightName,
            transform: { position: [2, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            visible: true,
            userData: { power: 100, cct: 5600 }
          });
          
          addToHierarchy(lightId, lightName, 'light');
          showObjectProperties(lightName, 'light', [2, 3, 0], [0, 0, 0]);
          console.log('Added light:', lightName);
        });
      });
      
      document.querySelectorAll('.equipment-card[data-equip]').forEach(card => {
        card.addEventListener('click', () => {
          const equipName = card.querySelector('.equipment-name')?.textContent?.split('<br>')[0] || 'Equipment';
          const equipId = `equip-${Date.now()}`;
          
          addToHierarchy(equipId, equipName, 'equipment');
          showObjectProperties(equipName, 'equipment', [0, 0, 0], [0, 0, 0]);
          console.log('Added equipment:', equipName);
        });
      });
      
      document.querySelectorAll('.actor-category').forEach(cat => {
        cat.addEventListener('click', () => {
          document.querySelectorAll('.actor-category').forEach(c => c.classList.remove('active'));
          cat.classList.add('active');
        });
      });
      
      // Panel resizing functionality
      const leftPanel = document.querySelector('.left-panel') as HTMLElement;
      const rightPanel = document.querySelector('.right-panel') as HTMLElement;
      const leftResizeHandle = document.getElementById('leftResizeHandle');
      const rightResizeHandle = document.getElementById('rightResizeHandle');
      
      let isResizing = false;
      let currentHandle: 'left' | 'right' | null = null;
      let startX = 0;
      let startWidth = 0;
      
      const startResize = (e: MouseEvent, handle: 'left' | 'right') => {
        isResizing = true;
        currentHandle = handle;
        startX = e.clientX;
        startWidth = handle === 'left' ? leftPanel.offsetWidth : rightPanel.offsetWidth;
        document.body.classList.add('resizing-panels');
        (handle === 'left' ? leftResizeHandle : rightResizeHandle)?.classList.add('resizing');
      };
      
      const doResize = (e: MouseEvent) => {
        if (!isResizing || !currentHandle) return;
        
        const diff = e.clientX - startX;
        const minWidth = 180;
        const maxWidth = 400;
        
        if (currentHandle === 'left') {
          const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + diff));
          leftPanel.style.width = `${newWidth}px`;
        } else {
          const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth - diff));
          rightPanel.style.width = `${newWidth}px`;
        }
      };
      
      const stopResize = () => {
        if (isResizing) {
          isResizing = false;
          document.body.classList.remove('resizing-panels');
          leftResizeHandle?.classList.remove('resizing');
          rightResizeHandle?.classList.remove('resizing');
          currentHandle = null;
        }
      };
      
      leftResizeHandle?.addEventListener('mousedown', (e) => startResize(e, 'left'));
      rightResizeHandle?.addEventListener('mousedown', (e) => startResize(e, 'right'));
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
      
      // Keyboard support for resize handles
      const handleKeyResize = (e: KeyboardEvent, panel: HTMLElement, direction: number) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const currentWidth = panel.offsetWidth;
          const step = e.shiftKey ? 50 : 10;
          const diff = (e.key === 'ArrowRight' ? 1 : -1) * step * direction;
          const newWidth = Math.min(400, Math.max(180, currentWidth + diff));
          panel.style.width = `${newWidth}px`;
        }
      };
      
      leftResizeHandle?.addEventListener('keydown', (e) => handleKeyResize(e, leftPanel, 1));
      rightResizeHandle?.addEventListener('keydown', (e) => handleKeyResize(e, rightPanel, -1));
      
      const categoryConfig: Record<string, string[]> = {
        models: ['All', 'Women', 'Men', 'Children', 'Animals'],
        lights: ['All', 'Flash', 'Continuous', 'Practical Light', 'Light Shapers'],
        camera: ['All', 'Kameraer', 'Objektiver', 'Tilbehør'],
        equipment: ['All', 'Diffusers', 'Reflectors', 'Blockers'],
        assets: ['All', 'Bakgrunner', 'Rekvisitter', 'Møbler'],
        timeline: []
      };
      
      document.querySelectorAll('.actor-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const tabName = tab.getAttribute('data-tab') || 'models';
          
          document.querySelectorAll('.actor-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.getAttribute('data-content') === tabName) {
              content.classList.add('active');
            }
          });
          
          const categoriesEl = document.getElementById('panelCategories');
          if (categoriesEl) {
            const cats = categoryConfig[tabName] || [];
            categoriesEl.innerHTML = cats.map((cat, i) => 
              `<div class="actor-category${i === 0 ? ' active' : ''}" data-category="${cat.toLowerCase().replace(' ', '-')}">${cat}</div>`
            ).join('');
            
            categoriesEl.querySelectorAll('.actor-category').forEach(catEl => {
              catEl.addEventListener('click', () => {
                categoriesEl.querySelectorAll('.actor-category').forEach(c => c.classList.remove('active'));
                catEl.classList.add('active');
              });
            });
          }
        });
      });
    }
  }
});
