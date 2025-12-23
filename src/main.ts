import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App, TimelineApp, AssetLibraryApp, CharacterLoaderApp, LightsBrowserApp, CameraGearApp, HDRIPanelApp, EquipmentPanelApp } from './App';
import { useAppStore, useFocusStore, SceneNode } from './state/store';
import { focusController } from './core/FocusController';
import { virtualActorService } from './core/services/virtualActorService';
import { propRenderingService } from './core/services/propRenderingService';
import { getPropById } from './core/data/propDefinitions';

// Early initialization of Studio Library button - runs immediately
(function initStudioLibraryButton() {
  let isToggling = false;
  
  const togglePanel = () => {
    if (isToggling) return;
    isToggling = true;
    
    const panel = document.getElementById('actorBottomPanel');
    const trigger = document.getElementById('actorPanelTrigger');
    const actorTab = document.getElementById('actorTab');
    
    if (!panel || !trigger) {
      isToggling = false;
      return;
    }
    
    const isOpen = panel.classList.contains('open');
    
    if (isOpen) {
      panel.classList.remove('open');
      trigger.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
      const arrow = trigger.querySelector('.library-arrow');
      if (arrow) arrow.textContent = '+';
      if (actorTab) actorTab.classList.remove('panel-open');
    } else {
      panel.classList.add('open');
      trigger.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
      const arrow = trigger.querySelector('.library-arrow');
      if (arrow) arrow.textContent = '−';
      if (actorTab) actorTab.classList.add('panel-open');
    }
    
    // Debounce to prevent rapid toggling
    setTimeout(() => { isToggling = false; }, 100);
  };
  
  // Event delegation - catches clicks even before specific handlers are attached
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('#actorPanelTrigger');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    }
    
    // Handle equipment add buttons
    const equipBtn = target.closest('.equipment-add-btn') as HTMLElement;
    if (equipBtn) {
      e.preventDefault();
      e.stopPropagation();
      const equipId = equipBtn.getAttribute('data-equip');
      if (equipId) {
        window.dispatchEvent(new CustomEvent('ch-add-equipment', { detail: { id: equipId } }));
        console.log('Equipment added:', equipId);
      }
    }
  }, true); // Use capture phase for earliest possible handling
  
  // Also handle keyboard for accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const panel = document.getElementById('actorBottomPanel');
      if (panel && panel.classList.contains('open')) {
        togglePanel();
      }
    }
  });
})();

interface LightSpecs {
  power: number;
  powerUnit: 'Ws' | 'W';
  cri?: number;
  tlci?: number;
  lux1m?: number;
  beamAngle?: number;
  guideNumber?: number;
  lumens?: number;
}

interface LightData {
  light: BABYLON.Light;
  mesh: BABYLON.Mesh;
  type: string;
  name: string;
  cct: number;
  modifier: string;
  specs?: LightSpecs;
  intensity: number;
}

interface CameraSettings {
  aperture: number;
  shutter: string;
  iso: number;
  focalLength: number;
  nd: number;
}

interface Keyframe {
  time: number;
  value: { x: number; y: number; z: number };
}

interface AnimationTrack {
  id: string;
  nodeId: string;
  type: 'position' | 'rotation';
  keyframes: Keyframe[];
}

interface AnimationState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  tracks: AnimationTrack[];
}

class VirtualStudio {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.ArcRotateCamera;
  private lights: Map<string, LightData> = new Map();
  private selectedLightId: string | null = null;
  private lightCounter = 0;
  private selectedPosAxes: Set<string> = new Set(['x', 'y', 'z']);
  private selectedRotAxes: Set<string> = new Set(['x', 'y', 'z']);
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
  
  private lensData: { [key: number]: { maxAperture: number; minAperture: number; name: string } } = {
    24: { maxAperture: 1.4, minAperture: 22, name: '24mm f/1.4' },
    35: { maxAperture: 1.4, minAperture: 22, name: '35mm f/1.4' },
    50: { maxAperture: 1.2, minAperture: 16, name: '50mm f/1.2' },
    85: { maxAperture: 1.4, minAperture: 16, name: '85mm f/1.4' },
    135: { maxAperture: 2.0, minAperture: 22, name: '135mm f/2.0' }
  };
  
  private animationState: AnimationState = {
    isPlaying: false,
    currentTime: 0,
    duration: 5,
    tracks: []
  };
  
  private animationFrameId: number | null = null;

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
    propRenderingService.setScene(this.scene);
    
    this.setupStudio();
    this.setupUI();
    this.setup2DViews();
    this.setupAssetEventListeners();
    this.setupFocusEventListeners();

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
    this.setupTimelineListeners();
  }

  private currentScopeMode: 'histogram' | 'waveform' | 'vectorscope' | 'skin' | 'zebra' | 'falsecolor' = 'histogram';
  private scopeExpanded: boolean = false;

  private setupScopeControls(): void {
    // Right panel scope controls
    const scopeModeSelect = document.getElementById('scopeModeSelect') as HTMLSelectElement;

    scopeModeSelect?.addEventListener('change', () => {
      const mode = scopeModeSelect.value as typeof this.currentScopeMode;
      this.currentScopeMode = mode;
    });
  }

  private setupPropertyListeners(): void {
    // Position sliders and inputs
    const posAxes = ['X', 'Y', 'Z'];
    posAxes.forEach((axis, index) => {
      const slider = document.getElementById(`pos${axis}Slider`) as HTMLInputElement;
      const input = document.getElementById(`pos${axis}Input`) as HTMLInputElement;
      
      const updatePosition = (val: number) => {
        if (!this.selectedLightId) return;
        if (this.animationState.isPlaying) return; // Skip during playback
        const data = this.lights.get(this.selectedLightId);
        if (data) {
          if (index === 0) data.mesh.position.x = val;
          if (index === 1) data.mesh.position.y = val;
          if (index === 2) data.mesh.position.z = val;
        }
      };
      
      slider?.addEventListener('input', () => {
        if (this.animationState.isPlaying) return;
        const val = parseFloat(slider.value);
        if (input) input.value = val.toFixed(1);
        updatePosition(val);
      });
      
      input?.addEventListener('change', () => {
        if (this.animationState.isPlaying) return;
        const val = parseFloat(input.value);
        if (slider) slider.value = val.toString();
        updatePosition(val);
      });
    });
    
    // Rotation sliders and inputs
    const rotAxes = ['X', 'Y', 'Z'];
    rotAxes.forEach((axis, index) => {
      const slider = document.getElementById(`rot${axis}Slider`) as HTMLInputElement;
      const input = document.getElementById(`rot${axis}Input`) as HTMLInputElement;
      
      const updateRotation = (val: number) => {
        if (!this.selectedLightId) return;
        if (this.animationState.isPlaying) return; // Skip during playback
        const data = this.lights.get(this.selectedLightId);
        if (data) {
          const rad = val * Math.PI / 180;
          if (index === 0) data.mesh.rotation.x = rad;
          if (index === 1) data.mesh.rotation.y = rad;
          if (index === 2) data.mesh.rotation.z = rad;
        }
      };
      
      slider?.addEventListener('input', () => {
        if (this.animationState.isPlaying) return;
        const val = parseFloat(slider.value);
        if (input) input.value = val.toString();
        updateRotation(val);
      });
      
      input?.addEventListener('change', () => {
        if (this.animationState.isPlaying) return;
        const val = parseFloat(input.value);
        if (slider) slider.value = val.toString();
        updateRotation(val);
      });
    });
    
    // Increment/decrement buttons
    document.querySelectorAll('.inc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return;
        const slider = document.getElementById(targetId) as HTMLInputElement;
        if (!slider) return;
        
        const isInc = btn.classList.contains('inc');
        const step = parseFloat(slider.step) || 1;
        const currentVal = parseFloat(slider.value);
        const newVal = isInc ? currentVal + step : currentVal - step;
        const clampedVal = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), newVal));
        
        slider.value = clampedVal.toString();
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    
    // Reset position button - also centers camera on object
    document.getElementById('resetPosBtn')?.addEventListener('click', () => {
      if (!this.selectedLightId) return;
      const data = this.lights.get(this.selectedLightId);
      if (!data) return;
      
      data.mesh.position.set(0, 3, 0);
      
      ['X', 'Y', 'Z'].forEach((axis, i) => {
        const slider = document.getElementById(`pos${axis}Slider`) as HTMLInputElement;
        const input = document.getElementById(`pos${axis}Input`) as HTMLInputElement;
        const val = i === 1 ? 3 : 0;
        if (slider) slider.value = val.toString();
        if (input) input.value = val.toFixed(1);
      });
      
      // Center camera on object
      this.centerCameraOnObject(data.mesh);
    });
    
    // Reset rotation button - also centers camera on object
    document.getElementById('resetRotBtn')?.addEventListener('click', () => {
      if (!this.selectedLightId) return;
      const data = this.lights.get(this.selectedLightId);
      if (!data) return;
      
      data.mesh.rotation.set(0, 0, 0);
      
      ['X', 'Y', 'Z'].forEach(axis => {
        const slider = document.getElementById(`rot${axis}Slider`) as HTMLInputElement;
        const input = document.getElementById(`rot${axis}Input`) as HTMLInputElement;
        if (slider) slider.value = '0';
        if (input) input.value = '0';
      });
      
      // Center camera on object
      this.centerCameraOnObject(data.mesh);
    });
    
    // Axis select buttons - toggle selection
    document.querySelectorAll('.axis-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const type = target.dataset.type as 'position' | 'rotation';
        const axis = target.dataset.axis as 'x' | 'y' | 'z';
        const selectedAxes = type === 'position' ? this.selectedPosAxes : this.selectedRotAxes;
        
        if (selectedAxes.has(axis)) {
          selectedAxes.delete(axis);
          target.classList.remove('selected');
          target.setAttribute('aria-pressed', 'false');
        } else {
          selectedAxes.add(axis);
          target.classList.add('selected');
          target.setAttribute('aria-pressed', 'true');
        }
      });
    });
    
    // Axis keyframe buttons - add keyframe for clicked axis plus any other selected axes
    document.querySelectorAll('.axis-keyframe').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const type = target.dataset.type as 'position' | 'rotation';
        const clickedAxis = target.dataset.axis as 'x' | 'y' | 'z';
        const selectedAxes = type === 'position' ? this.selectedPosAxes : this.selectedRotAxes;
        
        // Build set of axes to keyframe: clicked axis plus any selected axes
        const axesToKeyframe = new Set<string>([clickedAxis]);
        selectedAxes.forEach(axis => axesToKeyframe.add(axis));
        
        if (axesToKeyframe.size === 3) {
          // All axes - use grouped keyframe for better animation interpolation
          this.addKeyframe(type);
        } else {
          // Add individual keyframes for each axis
          axesToKeyframe.forEach(axis => {
            this.addKeyframeForAxis(type, axis as 'x' | 'y' | 'z');
          });
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
    const apertureValues = [1.0, 1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22, 32];
    const shutterValues = ['1/8', '1/15', '1/30', '1/60', '1/125', '1/250', '1/500', '1/1000', '1/2000', '1/4000', '1/8000', '1/16000', '1/32000'];
    const isoValues = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1600];
    const ndValues = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
    
    const apertureSlider = document.getElementById('apertureSlider') as HTMLInputElement;
    const apertureDisplay = document.getElementById('apertureDisplay');
    // Initialize with default lens apertures
    (apertureSlider as any)._validApertures = apertureValues;
    
    apertureSlider?.addEventListener('input', () => {
      const validApertures = (apertureSlider as any)._validApertures || apertureValues;
      const idx = parseInt(apertureSlider.value);
      const aperture = validApertures[Math.min(idx, validApertures.length - 1)];
      this.cameraSettings.aperture = aperture;
      if (apertureDisplay) apertureDisplay.textContent = `f/${aperture}`;
      this.updateExposureDisplay();
    });

    const shutterSlider = document.getElementById('shutterSlider') as HTMLInputElement;
    const shutterDisplay = document.getElementById('shutterDisplay');
    shutterSlider?.addEventListener('input', () => {
      const idx = parseInt(shutterSlider.value);
      this.cameraSettings.shutter = shutterValues[idx];
      if (shutterDisplay) shutterDisplay.textContent = shutterValues[idx];
      this.updateExposureDisplay();
    });

    const isoSlider = document.getElementById('isoSlider') as HTMLInputElement;
    const isoDisplay = document.getElementById('isoDisplay');
    isoSlider?.addEventListener('input', () => {
      const idx = parseInt(isoSlider.value);
      this.cameraSettings.iso = isoValues[idx];
      if (isoDisplay) isoDisplay.textContent = isoValues[idx].toString();
      this.updateExposureDisplay();
    });

    const ndSlider = document.getElementById('ndSlider') as HTMLInputElement;
    const ndDisplay = document.getElementById('ndDisplay');
    ndSlider?.addEventListener('input', () => {
      const idx = parseInt(ndSlider.value);
      this.cameraSettings.nd = ndValues[idx];
      if (ndDisplay) ndDisplay.textContent = ndValues[idx] === 0 ? '0' : `ND${ndValues[idx]}`;
      this.updateExposureDisplay();
    });

    const lensPresetChips = document.querySelectorAll('.lens-preset-chip');
    lensPresetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const focal = parseInt(chip.getAttribute('data-focal') || '50');
        const aperture = parseFloat(chip.getAttribute('data-aperture') || '2.8');
        
        lensPresetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        const closestApertureIdx = apertureValues.reduce((prev, curr, idx) => 
          Math.abs(curr - aperture) < Math.abs(apertureValues[prev] - aperture) ? idx : prev, 0);
        
        this.cameraSettings.aperture = apertureValues[closestApertureIdx];
        if (apertureSlider) apertureSlider.value = closestApertureIdx.toString();
        if (apertureDisplay) apertureDisplay.textContent = `f/${apertureValues[closestApertureIdx]}`;
        
        this.updateExposureDisplay();
        
        window.dispatchEvent(new CustomEvent('ch-lens-preset', {
          detail: { focal, aperture: apertureValues[closestApertureIdx] }
        }));
      });
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
    
    const evDisplay = document.getElementById('evDisplay');
    if (evDisplay) evDisplay.textContent = `EV ${ev.toFixed(1)}`;

    this.updateSceneBrightness();
  }

  private updateSceneBrightness(): void {
    // Parse shutter speed to get exposure time
    const shutterMatch = this.cameraSettings.shutter.match(/1\/(\d+)/);
    const shutterSeconds = shutterMatch ? 1 / parseInt(shutterMatch[1]) : 1/125;
    
    // Calculate exposure value (EV)
    const isoFactor = this.cameraSettings.iso / 100;
    const apertureFactor = 1 / (this.cameraSettings.aperture * this.cameraSettings.aperture);
    const shutterFactor = shutterSeconds * 125; // Normalize to 1/125s baseline
    const ndFactor = 1 / Math.pow(2, this.cameraSettings.nd);
    
    const brightness = isoFactor * apertureFactor * shutterFactor * ndFactor * 2;
    
    // Update all studio lights
    for (const [, data] of this.lights) {
      const baseIntensity = data.type.includes('softbox') || data.type.includes('umbrella') ? 8 : 12;
      data.light.intensity = baseIntensity * brightness;
    }
    
    // Update ambient/hemisphere light if exists
    this.scene.lights.forEach(light => {
      if (light instanceof BABYLON.HemisphericLight) {
        light.intensity = 0.3 * brightness;
      }
    });
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

    // Use embedded scope canvas in right panel
    this.histogramCanvas = document.getElementById('scopeCanvasEmbed') as HTMLCanvasElement;
    if (this.histogramCanvas) {
      this.histogramCtx = this.histogramCanvas.getContext('2d');
    }

    this.resizeCanvases();
  }

  private setupAssetEventListeners(): void {
    window.addEventListener('ch-add-asset', ((e: CustomEvent) => {
      const { asset } = e.detail;
      console.log('Asset added:', asset.title);
      
      if (asset.type === 'light') {
        const position = new BABYLON.Vector3(
          Math.random() * 4 - 2,
          3 + Math.random() * 2,
          Math.random() * 4 - 2
        );
        this.addLight('godox-ad600', position);
      } else {
        this.loadAssetFromLibrary(asset.id, asset.title, asset.data);
      }
    }) as EventListener);

    window.addEventListener('ch-add-asset-at', ((e: CustomEvent) => {
      const { asset, position } = e.detail;
      console.log('Asset placed at:', position);
      
      const pos = new BABYLON.Vector3(position[0], position[1], position[2]);
      
      if (asset.type === 'light') {
        this.addLight('godox-ad600', pos);
      } else {
        this.loadAssetFromLibrary(asset.id, asset.title, asset.data, pos);
      }
    }) as EventListener);

    window.addEventListener('ch-load-character', ((e: CustomEvent) => {
      const { modelUrl, name, skinTone, height } = e.detail;
      console.log('Loading character:', name);
      this.loadCharacterModel(modelUrl, name, skinTone, height);
    }) as EventListener);

    window.addEventListener('ch-remove-character', (() => {
      console.log('Removing character');
      this.removeCharacterModel();
    }) as EventListener);

    window.addEventListener('ch-apply-pose', ((e: CustomEvent) => {
      const { poseId, poseName } = e.detail;
      console.log('Applying pose:', poseName);
    }) as EventListener);

    window.addEventListener('ch-actor-params-changed', ((e: CustomEvent) => {
      const { actorParams } = e.detail;
      console.log('Actor params changed:', actorParams);
      this.updateActorMesh(actorParams);
    }) as EventListener);

    window.addEventListener('ch-add-light', ((e: CustomEvent) => {
      const { id, brand, model, type, power, powerUnit, cct, cri, lux1m, beamAngle, guideNumber, lumens } = e.detail;
      console.log('Adding light from library:', brand, model);
      
      const position = new BABYLON.Vector3(
        Math.random() * 4 - 2,
        3 + Math.random() * 2,
        Math.random() * 4 - 2
      );
      
      this.addLightWithSpecs(id, `${brand} ${model}`, type, position, {
        power,
        powerUnit,
        cct,
        cri,
        lux1m,
        beamAngle,
        guideNumber,
        lumens
      });
    }) as EventListener);
  }

  private setupFocusEventListeners(): void {
    window.addEventListener('focus:dragend', ((e: CustomEvent) => {
      const { x, y } = e.detail;
      this.calculateFocusDistance(x, y);
    }) as EventListener);

    window.addEventListener('focus:drag', ((e: CustomEvent) => {
      const { x, y } = e.detail;
      this.calculateFocusDistance(x, y);
    }) as EventListener);

    useFocusStore.subscribe((state, prevState) => {
      if (state.mode !== prevState.mode || state.activePointId !== prevState.activePointId) {
        const pos = state.getActivePointPosition();
        this.calculateFocusDistance(pos.x, pos.y);
      }
    });

    const pos = useFocusStore.getState().getActivePointPosition();
    this.calculateFocusDistance(pos.x, pos.y);
  }

  private calculateFocusDistance(normalizedX: number, normalizedY: number): void {
    if (!this.camera || !this.scene) return;

    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;

    const screenX = normalizedX * canvas.width;
    const screenY = normalizedY * canvas.height;

    const ray = this.scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), this.camera);
    const pickResult = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.isPickable && mesh.isVisible && !mesh.name.startsWith('gizmo') && mesh.name !== 'ground';
    });

    let distance: number;
    let objectName: string | null = null;

    if (pickResult?.hit && pickResult.pickedMesh) {
      distance = pickResult.distance;
      objectName = pickResult.pickedMesh.name;
    } else {
      const focusPlaneDistance = 3.0;
      const direction = ray.direction.normalize();
      const cameraPos = this.camera.position;
      const focusPlaneY = 0;
      const t = (focusPlaneY - cameraPos.y) / direction.y;
      
      if (t > 0) {
        distance = t;
      } else {
        distance = focusPlaneDistance;
      }
    }

    useFocusStore.getState().setFocusDistance(distance, objectName);
    this.updateCameraFocus(distance);
  }

  private updateCameraFocus(distance: number): void {
    if (!this.camera) return;
    
    // Store focus distance for DOF effects (Babylon.js doesn't have focalLength on ArcRotateCamera)
    (this.camera as any)._focusDistance = distance;
  }

  private updateActorMesh(params: { height: number; weight: number; skinTone?: string }): void {
    const heightScale = 0.8 + params.height * 0.4;
    const weightScale = 0.8 + params.weight * 0.4;
    const mesh = this.characterMesh || this.scene.getMeshByName('mannequin');

    if (mesh) {
      mesh.scaling = new BABYLON.Vector3(weightScale, heightScale, weightScale);
      mesh.position.y = 0.875 * heightScale;

      if (params.skinTone) {
        this.applyMaterialColor(mesh, params.skinTone);
      }
    }
  }

  private applyMaterialColor(mesh: BABYLON.AbstractMesh, colorHex: string): void {
    const color = BABYLON.Color3.FromHexString(colorHex);
    const mat = mesh.material;
    
    if (!mat) return;

    if ((mat as BABYLON.PBRMaterial).albedoColor !== undefined) {
      (mat as BABYLON.PBRMaterial).albedoColor = color;
    } else if ((mat as BABYLON.StandardMaterial).diffuseColor !== undefined) {
      (mat as BABYLON.StandardMaterial).diffuseColor = color;
    }
  }

  private async loadAssetFromLibrary(
    assetId: string,
    name: string,
    data?: { modelUrl?: string; metadata?: Record<string, unknown> },
    position?: BABYLON.Vector3
  ): Promise<void> {
    const propDef = getPropById(assetId);
    const pos = position || new BABYLON.Vector3(0, 0, 0);

    if (propDef) {
      try {
        const mesh = await propRenderingService.loadProp(propDef, {
          position: pos,
          scale: propDef.defaultScale,
        });
        if (this.gizmoManager) {
          this.gizmoManager.attachToMesh(mesh as BABYLON.AbstractMesh);
        }
        console.log(`Loaded prop via service: ${propDef.name}`);
        return;
      } catch (error) {
        console.warn(`propRenderingService failed for ${assetId}, using fallback`);
      }
    }

    if (data?.modelUrl) {
      try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', data.modelUrl, this.scene);
        const mesh = result.meshes[0];
        mesh.name = name;
        mesh.position = pos;
        
        if (this.gizmoManager) {
          this.gizmoManager.attachToMesh(mesh as BABYLON.AbstractMesh);
        }
        console.log(`Loaded asset model: ${name}`);
        return;
      } catch (error) {
        console.warn(`Model not found: ${data.modelUrl}`);
      }
    }

    this.createPlaceholderAsset(name, data?.metadata, pos);
  }

  private createPlaceholderAsset(
    name: string,
    metadata?: Record<string, unknown>,
    position?: BABYLON.Vector3
  ): void {
    const pos = position || new BABYLON.Vector3(0, 0, 0);
    let mesh: BABYLON.Mesh;

    if (metadata?.width && metadata?.height) {
      mesh = BABYLON.MeshBuilder.CreatePlane(name, {
        width: metadata.width as number,
        height: metadata.height as number,
      }, this.scene);
      mesh.rotation.x = -Math.PI / 2;
      pos.y = (metadata.height as number) / 2;
    } else {
      mesh = BABYLON.MeshBuilder.CreateBox(name, { size: 0.5 }, this.scene);
      pos.y = 0.25;
    }

    mesh.position = pos;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, this.scene);
    if (metadata?.color) {
      mat.diffuseColor = BABYLON.Color3.FromHexString(metadata.color as string);
    } else {
      mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    }
    mesh.material = mat;

    if (this.gizmoManager) {
      this.gizmoManager.attachToMesh(mesh);
    }
    console.log(`Created placeholder asset: ${name}`);
  }

  private characterMesh: BABYLON.AbstractMesh | null = null;
  private characterModelId: string | null = null;

  private async loadCharacterModel(modelUrl: string, name: string, skinTone: string, height: number): Promise<void> {
    this.removeCharacterModel();
    
    let meshPosition = new BABYLON.Vector3(0, 0, 0);
    
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelUrl, this.scene);
      this.characterMesh = result.meshes[0];
      this.characterMesh.name = name;
      this.characterMesh.position = meshPosition;
      
      console.log(`Loaded character: ${name}`);
    } catch (error) {
      console.warn(`Character model not found: ${modelUrl}, creating placeholder`);
      const capsule = BABYLON.MeshBuilder.CreateCapsule(name, { height: 1.75, radius: 0.22 }, this.scene);
      meshPosition = new BABYLON.Vector3(0, 0.875, 0);
      capsule.position = meshPosition;
      
      const mat = new BABYLON.StandardMaterial(`${name}_mat`, this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.6, 0.55, 0.5);
      capsule.material = mat;
      
      this.characterMesh = capsule;
    }

    // Add to scene hierarchy store
    const store = useAppStore.getState();
    const modelId = `model_${Date.now()}`;
    const newNode: SceneNode = {
      id: modelId,
      name: name,
      type: 'model',
      visible: true,
      locked: false,
      transform: {
        position: [meshPosition.x, meshPosition.y, meshPosition.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      }
    };
    
    store.addNode(newNode);
    store.selectNode(modelId);
    this.characterModelId = modelId;
    
    // Attach gizmo for interaction
    if (this.gizmoManager && this.characterMesh) {
      this.gizmoManager.attachToMesh(this.characterMesh as BABYLON.Mesh);
    }

    this.applyCurrentActorParams();
    console.log(`Added model "${name}" to scene hierarchy`);
  }

  private applyCurrentActorParams(): void {
    const store = useAppStore.getState();
    this.updateActorMesh({
      height: store.actorParams.height,
      weight: store.actorParams.weight,
      skinTone: store.actorParams.skinTone,
    });
  }

  private removeCharacterModel(): void {
    if (this.characterMesh) {
      this.characterMesh.dispose();
      this.characterMesh = null;
    }
    if (this.characterModelId) {
      useAppStore.getState().removeNode(this.characterModelId);
      this.characterModelId = null;
    }
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

  private calculateLightIntensity(specs: LightSpecs): number {
    if (specs.lux1m) {
      return specs.lux1m / 5000;
    }
    
    if (specs.guideNumber) {
      return (specs.guideNumber * specs.guideNumber) / 400;
    }
    
    if (specs.lumens) {
      return specs.lumens / 2000;
    }
    
    if (specs.powerUnit === 'Ws') {
      const lumens = specs.power * 40;
      return lumens / 2000;
    }
    
    return specs.power / 50;
  }

  private calculateBeamAngle(specs: LightSpecs): number {
    if (specs.beamAngle) {
      return (specs.beamAngle * Math.PI) / 180;
    }
    return Math.PI / 4;
  }

  addLightWithSpecs(
    nodeId: string,
    name: string,
    type: string,
    position: BABYLON.Vector3,
    specs: { power: number; powerUnit: string; cct?: number; cri?: number; lux1m?: number; beamAngle?: number; guideNumber?: number; lumens?: number }
  ): void {
    const id = nodeId || `light_${this.lightCounter++}`;
    const cct = specs.cct || 5600;
    const color = this.cctToColor(cct);
    
    const lightSpecs: LightSpecs = {
      power: specs.power,
      powerUnit: specs.powerUnit as 'Ws' | 'W',
      cri: specs.cri,
      lux1m: specs.lux1m,
      beamAngle: specs.beamAngle,
      guideNumber: specs.guideNumber,
      lumens: specs.lumens
    };
    
    const intensity = this.calculateLightIntensity(lightSpecs);
    const beamAngle = this.calculateBeamAngle(lightSpecs);

    let light: BABYLON.Light;
    let mesh: BABYLON.Mesh;

    if (type === 'led' || type === 'continuous') {
      light = new BABYLON.SpotLight(
        id, position.clone(),
        new BABYLON.Vector3(0, -0.8, -0.2).normalize(),
        beamAngle, 2,
        this.scene
      );
      light.intensity = intensity;
      light.diffuse = color;

      mesh = BABYLON.MeshBuilder.CreateCylinder(`mesh_${id}`, { 
        height: 0.4, diameterTop: 0.15, diameterBottom: 0.3 
      }, this.scene);
      mesh.rotation.x = Math.PI;
    } else {
      light = new BABYLON.SpotLight(
        id, position.clone(),
        new BABYLON.Vector3(0, -0.8, -0.2).normalize(),
        beamAngle, 2,
        this.scene
      );
      light.intensity = intensity;
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
      modifier: 'Ingen',
      specs: lightSpecs,
      intensity: intensity
    };

    this.lights.set(id, lightData);
    this.gizmoManager?.attachableMeshes?.push(mesh);
    this.selectLight(id);
    this.updateSceneList();
    this.updateLightMeterReading();
  }

  addLight(type: string, position: BABYLON.Vector3): void {
    const id = `light_${this.lightCounter++}`;
    const cct = 5600;
    const color = this.cctToColor(cct);
    const name = this.getLightName(type);
    
    const defaultSpecs: LightSpecs = {
      power: 600,
      powerUnit: 'Ws',
      guideNumber: 87,
      lumens: 24000
    };
    
    const intensity = this.calculateLightIntensity(defaultSpecs);

    let light: BABYLON.Light;
    let mesh: BABYLON.Mesh;

    if (type.includes('softbox') || type.includes('umbrella')) {
      light = new BABYLON.PointLight(id, position.clone(), this.scene);
      light.intensity = intensity * 0.6;
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
      light.intensity = intensity;
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
      modifier: type.includes('softbox') ? 'Softbox' : 'Ingen',
      specs: defaultSpecs,
      intensity: intensity
    };

    this.lights.set(id, lightData);
    this.gizmoManager?.attachableMeshes?.push(mesh);
    this.selectLight(id);
    this.updateSceneList();
  }

  private updateLightMeterReading(): void {
    let totalLux = 0;
    const subjectPos = new BABYLON.Vector3(0, 1, 0);
    
    for (const [, data] of this.lights) {
      const lightPos = data.mesh.position;
      const distance = BABYLON.Vector3.Distance(lightPos, subjectPos);
      
      if (data.specs?.lux1m) {
        const luxAtSubject = data.specs.lux1m / (distance * distance);
        totalLux += luxAtSubject;
      } else if (data.specs?.guideNumber) {
        const luxEstimate = (data.specs.guideNumber * data.specs.guideNumber * 12.5) / (distance * distance);
        totalLux += luxEstimate;
      } else if (data.specs?.lumens) {
        const luxEstimate = data.specs.lumens / (4 * Math.PI * distance * distance);
        totalLux += luxEstimate;
      }
    }
    
    const ev = Math.log2(totalLux / 2.5);
    const evDisplay = document.getElementById('evValue');
    if (evDisplay) {
      evDisplay.textContent = `EV ${ev.toFixed(1)}`;
    }
    
    const luxDisplay = document.getElementById('luxValue');
    if (luxDisplay) {
      luxDisplay.textContent = `${Math.round(totalLux)} lux`;
    }
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
    
    // Update aperture based on lens
    const lens = this.lensData[mm];
    if (lens) {
      this.updateApertureForLens(lens.maxAperture, lens.minAperture);
    }
  }
  
  private centerCameraOnObject(mesh: BABYLON.Mesh): void {
    const targetPos = mesh.getAbsolutePosition();
    
    // Smoothly animate camera to target
    const currentTarget = this.camera.target.clone();
    const startRadius = this.camera.radius;
    const targetRadius = Math.max(5, startRadius); // Ensure good viewing distance
    
    // Animate camera target over 500ms
    const animationDuration = 500;
    const startTime = Date.now();
    
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / animationDuration);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      // Interpolate target position
      this.camera.target = BABYLON.Vector3.Lerp(currentTarget, targetPos, easeProgress);
      
      // Adjust radius if needed
      this.camera.radius = startRadius + (targetRadius - startRadius) * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    
    animateCamera();
  }
  
  private updateApertureForLens(maxAperture: number, minAperture: number): void {
    const allApertures = [1.0, 1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22, 32];
    const validApertures = allApertures.filter(a => a >= maxAperture && a <= minAperture);
    
    const apertureSlider = document.getElementById('apertureSlider') as HTMLInputElement;
    const apertureDisplay = document.getElementById('apertureDisplay');
    
    if (apertureSlider && validApertures.length > 0) {
      apertureSlider.min = '0';
      apertureSlider.max = (validApertures.length - 1).toString();
      
      // Find closest valid aperture to current setting
      let closestIdx = 0;
      let minDiff = Math.abs(validApertures[0] - this.cameraSettings.aperture);
      validApertures.forEach((a, i) => {
        const diff = Math.abs(a - this.cameraSettings.aperture);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      
      apertureSlider.value = closestIdx.toString();
      this.cameraSettings.aperture = validApertures[closestIdx];
      if (apertureDisplay) apertureDisplay.textContent = `f/${validApertures[closestIdx]}`;
      
      // Store current valid apertures for slider handler
      (apertureSlider as any)._validApertures = validApertures;
    }
    
    this.updateExposureDisplay();
  }

  // ============================================================================
  // Animation / Keyframe System
  // ============================================================================
  
  private setupTimelineListeners(): void {
    const timeline = document.getElementById('animationTimeline');
    const playBtn = document.getElementById('tlPlay');
    const stopBtn = document.getElementById('tlStop');
    const closeBtn = document.getElementById('tlClose');
    const scrubber = document.getElementById('tlScrubber') as HTMLInputElement;
    const prevBtn = document.getElementById('tlPrevKeyframe');
    const nextBtn = document.getElementById('tlNextKeyframe');
    
    playBtn?.addEventListener('click', () => this.togglePlayAnimation());
    stopBtn?.addEventListener('click', () => this.stopAnimation());
    closeBtn?.addEventListener('click', () => {
      timeline?.classList.remove('visible');
    });
    
    scrubber?.addEventListener('mousedown', () => {
      this.isScrubbing = true;
    });
    
    scrubber?.addEventListener('mouseup', () => {
      this.isScrubbing = false;
    });
    
    scrubber?.addEventListener('input', () => {
      const percent = parseFloat(scrubber.value) / 100;
      this.animationState.currentTime = percent * this.animationState.duration;
      this.updateTimelineUI(false);
      this.applyAnimationAtTime(this.animationState.currentTime);
    });
    
    prevBtn?.addEventListener('click', () => this.jumpToPreviousKeyframe());
    nextBtn?.addEventListener('click', () => this.jumpToNextKeyframe());
  }
  
  private addKeyframe(type: 'position' | 'rotation'): void {
    if (!this.selectedLightId) return;
    const data = this.lights.get(this.selectedLightId);
    if (!data) return;
    
    const trackId = `${this.selectedLightId}_${type}`;
    let track = this.animationState.tracks.find(t => t.id === trackId);
    
    if (!track) {
      track = {
        id: trackId,
        nodeId: this.selectedLightId,
        type: type,
        keyframes: []
      };
      this.animationState.tracks.push(track);
    }
    
    const value = type === 'position' 
      ? { x: data.mesh.position.x, y: data.mesh.position.y, z: data.mesh.position.z }
      : { x: data.mesh.rotation.x * 180 / Math.PI, y: data.mesh.rotation.y * 180 / Math.PI, z: data.mesh.rotation.z * 180 / Math.PI };
    
    // Check if keyframe exists at current time
    const existingIdx = track.keyframes.findIndex(kf => Math.abs(kf.time - this.animationState.currentTime) < 0.01);
    if (existingIdx >= 0) {
      track.keyframes[existingIdx].value = value;
    } else {
      track.keyframes.push({ time: this.animationState.currentTime, value });
      track.keyframes.sort((a, b) => a.time - b.time);
    }
    
    this.updateTimelineUI(false);
    this.renderTimelineTracks();
    
    // Show timeline if hidden
    const timeline = document.getElementById('animationTimeline');
    timeline?.classList.add('visible');
  }
  
  private addKeyframeForAxis(type: 'position' | 'rotation', axis: 'x' | 'y' | 'z'): void {
    if (!this.selectedLightId) return;
    const data = this.lights.get(this.selectedLightId);
    if (!data) return;
    
    const trackId = `${this.selectedLightId}_${type}_${axis}`;
    let track = this.animationState.tracks.find(t => t.id === trackId);
    
    if (!track) {
      track = {
        id: trackId,
        nodeId: this.selectedLightId,
        type: type,
        keyframes: []
      };
      this.animationState.tracks.push(track);
    }
    
    let value: { x: number; y: number; z: number };
    if (type === 'position') {
      const axisVal = axis === 'x' ? data.mesh.position.x : axis === 'y' ? data.mesh.position.y : data.mesh.position.z;
      value = { x: axis === 'x' ? axisVal : 0, y: axis === 'y' ? axisVal : 0, z: axis === 'z' ? axisVal : 0 };
    } else {
      const axisVal = axis === 'x' ? data.mesh.rotation.x * 180 / Math.PI : axis === 'y' ? data.mesh.rotation.y * 180 / Math.PI : data.mesh.rotation.z * 180 / Math.PI;
      value = { x: axis === 'x' ? axisVal : 0, y: axis === 'y' ? axisVal : 0, z: axis === 'z' ? axisVal : 0 };
    }
    
    const existingIdx = track.keyframes.findIndex(kf => Math.abs(kf.time - this.animationState.currentTime) < 0.01);
    if (existingIdx >= 0) {
      track.keyframes[existingIdx].value = value;
    } else {
      track.keyframes.push({ time: this.animationState.currentTime, value });
      track.keyframes.sort((a, b) => a.time - b.time);
    }
    
    this.updateTimelineUI(false);
    this.renderTimelineTracks();
    
    const timeline = document.getElementById('animationTimeline');
    timeline?.classList.add('visible');
  }
  
  private togglePlayAnimation(): void {
    if (this.animationState.isPlaying) {
      this.pauseAnimation();
    } else {
      this.playAnimation();
    }
  }
  
  private playAnimation(): void {
    if (this.animationState.tracks.length === 0) return;
    
    this.animationState.isPlaying = true;
    const playBtn = document.getElementById('tlPlay');
    if (playBtn) {
      playBtn.textContent = '⏸';
      playBtn.classList.add('active');
    }
    
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      this.animationState.currentTime += delta;
      
      if (this.animationState.currentTime >= this.animationState.duration) {
        this.animationState.currentTime = 0;
      }
      
      this.applyAnimationAtTime(this.animationState.currentTime);
      this.updateTimelineUI(true);
      
      if (this.animationState.isPlaying) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  private pauseAnimation(): void {
    this.animationState.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    const playBtn = document.getElementById('tlPlay');
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.classList.remove('active');
    }
  }
  
  private stopAnimation(): void {
    this.pauseAnimation();
    this.animationState.currentTime = 0;
    this.updateTimelineUI();
    this.applyAnimationAtTime(0);
  }
  
  private applyAnimationAtTime(time: number): void {
    for (const track of this.animationState.tracks) {
      const data = this.lights.get(track.nodeId);
      if (!data) continue;
      
      const value = this.interpolateKeyframes(track.keyframes, time);
      if (!value) continue;
      
      if (track.type === 'position') {
        data.mesh.position.set(value.x, value.y, value.z);
      } else {
        data.mesh.rotation.set(value.x * Math.PI / 180, value.y * Math.PI / 180, value.z * Math.PI / 180);
      }
    }
    
    // Update UI if this is the selected light
    if (this.selectedLightId) {
      this.updatePropertyPanel();
    }
  }
  
  private interpolateKeyframes(keyframes: Keyframe[], time: number): { x: number; y: number; z: number } | null {
    if (keyframes.length === 0) return null;
    if (keyframes.length === 1) return keyframes[0].value;
    
    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= prev.time) return prev.value;
    if (time >= next.time) return next.value;
    
    // Linear interpolation
    const t = (time - prev.time) / (next.time - prev.time);
    return {
      x: prev.value.x + (next.value.x - prev.value.x) * t,
      y: prev.value.y + (next.value.y - prev.value.y) * t,
      z: prev.value.z + (next.value.z - prev.value.z) * t
    };
  }
  
  private isScrubbing: boolean = false;
  
  private updateTimelineUI(fromPlayback: boolean = false): void {
    const currentTimeEl = document.getElementById('tlCurrentTime');
    const scrubber = document.getElementById('tlScrubber') as HTMLInputElement;
    
    if (currentTimeEl) {
      currentTimeEl.textContent = `${this.animationState.currentTime.toFixed(2)}s`;
    }
    
    // Only update scrubber if we're not actively scrubbing and update is from playback
    if (scrubber && fromPlayback && !this.isScrubbing) {
      scrubber.value = ((this.animationState.currentTime / this.animationState.duration) * 100).toString();
    }
    
    // Update playhead position
    this.updatePlayhead();
    
    // Update keyframe button states
    this.updateKeyframeButtonStates();
  }
  
  private updateKeyframeButtonStates(): void {
    if (!this.selectedLightId) return;
    
    const posTrack = this.animationState.tracks.find(t => t.id === `${this.selectedLightId}_position`);
    const rotTrack = this.animationState.tracks.find(t => t.id === `${this.selectedLightId}_rotation`);
    
    const hasGroupedPosKeyframe = posTrack?.keyframes.some(kf => Math.abs(kf.time - this.animationState.currentTime) < 0.05);
    const hasGroupedRotKeyframe = rotTrack?.keyframes.some(kf => Math.abs(kf.time - this.animationState.currentTime) < 0.05);
    
    // Update each position axis button independently
    document.querySelectorAll('.pos-keyframe').forEach(btn => {
      const axis = (btn as HTMLElement).dataset.axis;
      // Check both grouped track and individual axis track
      const axisTrack = this.animationState.tracks.find(t => t.id === `${this.selectedLightId}_position_${axis}`);
      const hasAxisKeyframe = axisTrack?.keyframes.some(kf => Math.abs(kf.time - this.animationState.currentTime) < 0.05);
      btn.classList.toggle('has-keyframe', !!hasGroupedPosKeyframe || !!hasAxisKeyframe);
    });
    
    // Update each rotation axis button independently
    document.querySelectorAll('.rot-keyframe').forEach(btn => {
      const axis = (btn as HTMLElement).dataset.axis;
      // Check both grouped track and individual axis track
      const axisTrack = this.animationState.tracks.find(t => t.id === `${this.selectedLightId}_rotation_${axis}`);
      const hasAxisKeyframe = axisTrack?.keyframes.some(kf => Math.abs(kf.time - this.animationState.currentTime) < 0.05);
      btn.classList.toggle('has-keyframe', !!hasGroupedRotKeyframe || !!hasAxisKeyframe);
    });
  }
  
  private updatePlayhead(): void {
    const tracks = document.getElementById('tlTracksContainer');
    if (!tracks) return;
    
    let playhead = document.getElementById('animationPlayhead');
    if (!playhead) {
      playhead = document.createElement('div');
      playhead.id = 'animationPlayhead';
      playhead.className = 'playhead';
      tracks.style.position = 'relative';
      tracks.appendChild(playhead);
    }
    
    const percent = (this.animationState.currentTime / this.animationState.duration) * 100;
    playhead.style.left = `calc(120px + ${percent}% * 0.85)`;
  }
  
  private renderTimelineTracks(): void {
    const container = document.getElementById('tlTracksContainer');
    if (!container) return;
    
    // Remove existing tracks (keep playhead)
    Array.from(container.children).forEach(child => {
      if (child.id !== 'animationPlayhead') {
        container.removeChild(child);
      }
    });
    
    for (const track of this.animationState.tracks) {
      const lightData = this.lights.get(track.nodeId);
      const trackEl = document.createElement('div');
      trackEl.className = 'timeline-track';
      
      const label = document.createElement('div');
      label.className = 'track-label';
      label.innerHTML = `<span>${lightData?.name || track.nodeId}</span><small>${track.type === 'position' ? 'Pos' : 'Rot'}</small>`;
      
      const lane = document.createElement('div');
      lane.className = 'track-lane';
      
      for (const kf of track.keyframes) {
        const diamond = document.createElement('div');
        diamond.className = 'keyframe-diamond';
        diamond.style.left = `${(kf.time / this.animationState.duration) * 100}%`;
        diamond.title = `${kf.time.toFixed(2)}s`;
        diamond.addEventListener('click', () => {
          this.animationState.currentTime = kf.time;
          this.updateTimelineUI();
          this.applyAnimationAtTime(kf.time);
        });
        lane.appendChild(diamond);
      }
      
      trackEl.appendChild(label);
      trackEl.appendChild(lane);
      container.appendChild(trackEl);
    }
  }
  
  private jumpToPreviousKeyframe(): void {
    const allTimes = this.getAllKeyframeTimes();
    const prev = allTimes.filter(t => t < this.animationState.currentTime - 0.01).pop();
    if (prev !== undefined) {
      this.animationState.currentTime = prev;
      this.updateTimelineUI();
      this.applyAnimationAtTime(prev);
    }
  }
  
  private jumpToNextKeyframe(): void {
    const allTimes = this.getAllKeyframeTimes();
    const next = allTimes.find(t => t > this.animationState.currentTime + 0.01);
    if (next !== undefined) {
      this.animationState.currentTime = next;
      this.updateTimelineUI();
      this.applyAnimationAtTime(next);
    }
  }
  
  private getAllKeyframeTimes(): number[] {
    const times = new Set<number>();
    for (const track of this.animationState.tracks) {
      for (const kf of track.keyframes) {
        times.add(kf.time);
      }
    }
    return Array.from(times).sort((a, b) => a - b);
  }
  
  private updatePropertyPanel(): void {
    if (!this.selectedLightId) return;
    const data = this.lights.get(this.selectedLightId);
    if (!data) return;
    
    ['X', 'Y', 'Z'].forEach((axis, i) => {
      const posSlider = document.getElementById(`pos${axis}Slider`) as HTMLInputElement;
      const posInput = document.getElementById(`pos${axis}Input`) as HTMLInputElement;
      const rotSlider = document.getElementById(`rot${axis}Slider`) as HTMLInputElement;
      const rotInput = document.getElementById(`rot${axis}Input`) as HTMLInputElement;
      
      const posVal = i === 0 ? data.mesh.position.x : i === 1 ? data.mesh.position.y : data.mesh.position.z;
      const rotVal = (i === 0 ? data.mesh.rotation.x : i === 1 ? data.mesh.rotation.y : data.mesh.rotation.z) * 180 / Math.PI;
      
      if (posSlider) posSlider.value = posVal.toFixed(1);
      if (posInput) posInput.value = posVal.toFixed(1);
      if (rotSlider) rotSlider.value = rotVal.toFixed(0);
      if (rotInput) rotInput.value = rotVal.toFixed(0);
    });
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
    
    focusController.init();
    
    const hierarchyToggle = document.getElementById('hierarchyToggle');
    const hierarchyContent = document.getElementById('hierarchyContent');
    if (hierarchyToggle && hierarchyContent) {
      const toggleHierarchy = () => {
        const isExpanded = hierarchyToggle.getAttribute('aria-expanded') === 'true';
        hierarchyToggle.setAttribute('aria-expanded', String(!isExpanded));
        hierarchyToggle.classList.toggle('collapsed', isExpanded);
        hierarchyContent.classList.toggle('collapsed', isExpanded);
      };
      
      hierarchyToggle.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.view-toggle')) return;
        toggleHierarchy();
      });
      
      hierarchyToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('.view-toggle')) return;
          e.preventDefault();
          toggleHierarchy();
        }
      });
    }
    
    const listViewBtn = document.getElementById('listViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const hierarchySection = document.getElementById('hierarchySection');
    
    if (listViewBtn && gridViewBtn && hierarchySection) {
      listViewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        listViewBtn.classList.add('active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        gridViewBtn.classList.remove('active');
        gridViewBtn.setAttribute('aria-pressed', 'false');
        hierarchySection.classList.remove('grid-view');
        hierarchySection.classList.add('list-view');
      });
      
      gridViewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        gridViewBtn.classList.add('active');
        gridViewBtn.setAttribute('aria-pressed', 'true');
        listViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'false');
        hierarchySection.classList.remove('list-view');
        hierarchySection.classList.add('grid-view');
      });
    }
    
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    let allExpanded = false;
    
    const toggleGroup = (header: HTMLElement, expand: boolean) => {
      const group = header.closest('.hierarchy-group');
      const arrow = header.querySelector('.hierarchy-arrow');
      const itemsId = header.getAttribute('aria-controls');
      const items = itemsId ? document.getElementById(itemsId) : null;
      
      if (group && arrow && items) {
        header.setAttribute('aria-expanded', String(expand));
        group.setAttribute('aria-expanded', String(expand));
        
        if (expand) {
          group.classList.remove('collapsed');
          arrow.textContent = '▾';
          items.style.display = '';
        } else {
          group.classList.add('collapsed');
          arrow.textContent = '▸';
          items.style.display = 'none';
        }
      }
    };
    
    document.querySelectorAll('.hierarchy-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.group-count')) return;
        
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        toggleGroup(header as HTMLElement, !isExpanded);
      });
      
      header.addEventListener('keydown', (e) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          const isExpanded = header.getAttribute('aria-expanded') === 'true';
          toggleGroup(header as HTMLElement, !isExpanded);
        }
      });
    });
    
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        allExpanded = !allExpanded;
        const icon = toggleAllBtn.querySelector('span');
        if (icon) {
          icon.textContent = allExpanded ? '⊟' : '⊞';
        }
        toggleAllBtn.setAttribute('aria-pressed', String(allExpanded));
        toggleAllBtn.title = allExpanded ? 'Kollaps alle' : 'Utvid alle';
        
        document.querySelectorAll('.hierarchy-header').forEach((header) => {
          toggleGroup(header as HTMLElement, allExpanded);
        });
      });
    }
    
    const actorPanelRoot = document.getElementById('actorPanelRoot');
    const actorBottomPanel = document.getElementById('actorBottomPanel');
    const actorPanelTrigger = document.getElementById('actorPanelTrigger');
    const actorTab = document.getElementById('actorTab');
    
    console.log('Studio Library elements:', { actorPanelRoot: !!actorPanelRoot, actorBottomPanel: !!actorBottomPanel, actorPanelTrigger: !!actorPanelTrigger });
    
    const keyframeTimelineRoot = document.getElementById('keyframeTimelineRoot');
    if (keyframeTimelineRoot) {
      const timelineRoot = createRoot(keyframeTimelineRoot);
      timelineRoot.render(React.createElement(TimelineApp, {}));
    }
    
    const assetLibraryRoot = document.getElementById('assetLibraryRoot');
    if (assetLibraryRoot) {
      const assetRoot = createRoot(assetLibraryRoot);
      assetRoot.render(React.createElement(AssetLibraryApp, {}));
    }
    
    const characterLoaderRoot = document.getElementById('characterLoaderRoot');
    if (characterLoaderRoot) {
      const characterRoot = createRoot(characterLoaderRoot);
      characterRoot.render(React.createElement(CharacterLoaderApp, {}));
    }
    
    const lightsBrowserRoot = document.getElementById('lightsBrowserRoot');
    if (lightsBrowserRoot) {
      const lightsRoot = createRoot(lightsBrowserRoot);
      lightsRoot.render(React.createElement(LightsBrowserApp, {}));
    }
    
    const cameraGearRoot = document.getElementById('cameraGearRoot');
    if (cameraGearRoot) {
      const cameraRoot = createRoot(cameraGearRoot);
      cameraRoot.render(React.createElement(CameraGearApp, {}));
    }
    
    const hdriPanelRoot = document.getElementById('hdriPanelRoot');
    if (hdriPanelRoot) {
      const hdriRoot = createRoot(hdriPanelRoot);
      hdriRoot.render(React.createElement(HDRIPanelApp, {}));
    }
    
    const equipmentPanelRoot = document.getElementById('equipmentPanelRoot');
    if (equipmentPanelRoot) {
      const equipRoot = createRoot(equipmentPanelRoot);
      equipRoot.render(React.createElement(EquipmentPanelApp, {}));
    }
    
    
    if (actorPanelRoot && actorBottomPanel && actorPanelTrigger) {
      const root = createRoot(actorPanelRoot);
      root.render(React.createElement(App, { 
        onActorGenerated: (actorId: string) => {
          console.log('Actor generated:', actorId);
          studio.addActorToScene(actorId);
        }
      }));
      
      const togglePanel = () => {
        console.log('togglePanel called');
        const isOpen = actorBottomPanel.classList.contains('open');
        console.log('isOpen:', isOpen);
        if (isOpen) {
          actorBottomPanel.classList.remove('open');
          actorPanelTrigger.classList.remove('active');
          actorPanelTrigger.setAttribute('aria-expanded', 'false');
          const arrow = actorPanelTrigger.querySelector('.library-arrow');
          if (arrow) arrow.textContent = '+';
          if (actorTab) actorTab.classList.remove('panel-open');
        } else {
          actorBottomPanel.classList.add('open');
          actorPanelTrigger.classList.add('active');
          actorPanelTrigger.setAttribute('aria-expanded', 'true');
          const arrow = actorPanelTrigger.querySelector('.library-arrow');
          if (arrow) arrow.textContent = '−';
          if (actorTab) actorTab.classList.add('panel-open');
        }
        console.log('Panel classes after toggle:', actorBottomPanel.className);
      };
      
      // Note: Primary click handler is set up via event delegation at top of file
      // This is a backup that runs after React components are mounted
      if (actorTab) {
        actorTab.addEventListener('click', togglePanel);
      }
      
      const panelFullscreenBtn = document.getElementById('panelFullscreenBtn');
      const panelCloseBtn = document.getElementById('panelCloseBtn');
      const panelResizeHandle = document.getElementById('panelResizeHandle');
      let savedPanelHeight = '200px';
      let isFullscreenMode = false;
      
      const closePanel = () => {
        actorBottomPanel.classList.remove('open');
        actorBottomPanel.classList.remove('fullscreen');
        isFullscreenMode = false;
        actorPanelTrigger.classList.remove('active');
        actorPanelTrigger.setAttribute('aria-expanded', 'false');
        const arrow = actorPanelTrigger.querySelector('.library-arrow');
        if (arrow) arrow.textContent = '+';
        if (actorTab) actorTab.classList.remove('panel-open');
        actorBottomPanel.style.height = '';
        if (panelFullscreenBtn) {
          const icon = panelFullscreenBtn.querySelector('span');
          if (icon) icon.textContent = '⛶';
          panelFullscreenBtn.setAttribute('aria-pressed', 'false');
        }
      };
      
      if (panelFullscreenBtn) {
        panelFullscreenBtn.addEventListener('click', () => {
          isFullscreenMode = !isFullscreenMode;
          if (isFullscreenMode) {
            savedPanelHeight = actorBottomPanel.style.height || '200px';
            actorBottomPanel.classList.add('fullscreen');
            actorBottomPanel.style.height = '';
          } else {
            actorBottomPanel.classList.remove('fullscreen');
            actorBottomPanel.style.height = savedPanelHeight;
          }
          const icon = panelFullscreenBtn.querySelector('span');
          if (icon) {
            icon.textContent = isFullscreenMode ? '⛶' : '⛶';
          }
          panelFullscreenBtn.title = isFullscreenMode ? 'Avslutt fullskjerm' : 'Fullskjerm';
          panelFullscreenBtn.setAttribute('aria-pressed', String(isFullscreenMode));
        });
      }
      
      if (panelCloseBtn) {
        panelCloseBtn.addEventListener('click', closePanel);
      }
      
      if (panelResizeHandle) {
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;
        
        const startResize = (clientY: number) => {
          if (isFullscreenMode) return;
          isResizing = true;
          startY = clientY;
          startHeight = actorBottomPanel.offsetHeight;
          document.body.style.cursor = 'ns-resize';
          document.body.style.userSelect = 'none';
        };
        
        const doResize = (clientY: number) => {
          if (!isResizing || isFullscreenMode) return;
          const diff = startY - clientY;
          const newHeight = Math.min(Math.max(startHeight + diff, 150), window.innerHeight * 0.8);
          actorBottomPanel.style.height = `${newHeight}px`;
          savedPanelHeight = `${newHeight}px`;
        };
        
        const stopResize = () => {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };
        
        panelResizeHandle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          startResize(e.clientY);
        });
        
        panelResizeHandle.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            startResize(e.touches[0].clientY);
          }
        }, { passive: true });
        
        document.addEventListener('mousemove', (e) => {
          doResize(e.clientY);
        });
        
        document.addEventListener('touchmove', (e) => {
          if (isResizing && e.touches.length === 1) {
            doResize(e.touches[0].clientY);
          }
        }, { passive: true });
        
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
      }
      
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
