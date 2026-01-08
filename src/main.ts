import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App, TimelineApp, AssetLibraryApp, CharacterLoaderApp, LightsBrowserApp, CameraGearApp, HDRIPanelApp, EquipmentPanelApp, ScenerPanelApp, NotesPanelApp, CinematographyPatternsApp, LightPatternLibraryApp, AvatarGeneratorApp, Accessible3DControlsApp, TidslinjeLibraryPanelApp, MarketplacePanelApp, AIAssistantApp, CastingPlannerApp, SceneComposerPanelApp, AnimationComposerApp } from './App';
import PanelCreator from './components/PanelCreator';
import { useAppStore, useFocusStore, SceneNode } from './state/store';
import { useLoadingStore } from './state/loadingStore';
import { LoadingOverlay } from './components/LoadingOverlay';
import { focusController } from './core/FocusController';
import { virtualActorService } from './core/services/virtualActorService';
import { propRenderingService } from './core/services/propRenderingService';
import { environmentService } from './core/services/environmentService';
import { getPropById } from './core/data/propDefinitions';
import { ScenarioPreset } from './data/scenarioPresets';
import { marketplaceService } from './services/marketplaceService';
import { mountHelpVideoPlayers } from './components/HelpVideoPlayer';
import { getLightById, LIGHT_DATABASE, LightSpec } from './data/lightFixtures';

declare global {
  interface Window {
    virtualStudio: VirtualStudio | undefined;
  }
}

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
      // Close other panels when opening Studio Library
      const marketplacePanel = document.getElementById('marketplacePanel');
      const aiAssistantPanel = document.getElementById('aiAssistantPanel');
      const castingPlannerPanel = document.getElementById('castingPlannerPanel');

      if (marketplacePanel && marketplacePanel.classList.contains('open')) {
        window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
      }
      if (aiAssistantPanel && aiAssistantPanel.classList.contains('open')) {
        window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
      }
      if (castingPlannerPanel && castingPlannerPanel.classList.contains('open')) {
        window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
      }

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
  colorTemp?: number;
}

// Undo/Redo action types
type UndoActionType = 
  | 'light-add' 
  | 'light-remove' 
  | 'light-move' 
  | 'light-rotate' 
  | 'light-property'
  | 'camera-change'
  | 'selection-change';

interface UndoAction {
  type: UndoActionType;
  timestamp: number;
  description: string;
  data: {
    lightId?: string;
    previousState?: any;
    newState?: any;
  };
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
  baseIntensity?: number; // Base intensity before power/brightness multipliers
  powerMultiplier?: number; // Power multiplier (0.1 to 1.0, from 10% to 100%)
  modelingLight?: BABYLON.Light; // Modeling light for strobes (continuous light)
  modelingLightEnabled?: boolean; // Whether modeling light is enabled
  modelingLightIntensity?: number; // Modeling light intensity (calculated from specs)
  shadowGenerator?: BABYLON.ShadowGenerator; // Shadow generator for this light
  beamVisualization?: BABYLON.Mesh; // Visual cone showing light direction
  enabled?: boolean; // Whether the light is enabled
  azimuth?: number; // Horizontal angle in degrees (-180 to 180)
  elevation?: number; // Vertical angle in degrees (-90 to 90)
  // Advanced light properties
  originalDiffuse?: BABYLON.Color3; // Original diffuse color for intensity adjustments
  useCustomColor?: boolean; // Whether using custom RGB color instead of CCT
  customColor?: string; // Custom color hex value
  shadowsEnabled?: boolean; // Whether shadows are enabled for this light
  directionHelper?: BABYLON.LinesMesh; // Helper line showing light direction
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
  public lights: Map<string, LightData> = new Map();
  public selectedLightId: string | null = null;
  private lightCounter = 0;
  private selectedPosAxes: Set<string> = new Set(['x', 'y', 'z']);
  private glowLayer: BABYLON.GlowLayer | null = null;
  private renderingPipeline: BABYLON.DefaultRenderingPipeline | null = null;
  private ssrPipeline: BABYLON.SSRRenderingPipeline | null = null;
  private renderMode: 'work' | 'final' = 'work';
  private finalRenderSamples: number = 0;
  private finalRenderMaxSamples: number = 128;
  private selectedRotAxes: Set<string> = new Set(['x', 'y', 'z']);
  private gridMesh: BABYLON.Mesh | null = null;
  private gizmoManager: BABYLON.GizmoManager | null = null;
  private wallsVisible: boolean = true;
  
  // Undo/Redo system
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxUndoSteps: number = 50;
  private isUndoRedoAction: boolean = false;
  
  // Ambient light control
  private ambientLight: BABYLON.HemisphericLight | null = null;
  private ambientLightBaseIntensity: number = 0.3;
  private ambientLightEnabled: boolean = true;
  private ambientLightTemperature: number = 6500;
  private ambientLightGroundIntensity: number = 0.5;
  private autoAmbientEnabled: boolean = true;
  private topViewCanvas: HTMLCanvasElement | null = null;
  private topViewCtx: CanvasRenderingContext2D | null = null;
  private histogramCanvas: HTMLCanvasElement | null = null;
  private histogramCtx: CanvasRenderingContext2D | null = null;
  
  // Monitor canvas rendering
  private monitorCameras: Map<string, BABYLON.ArcRotateCamera> = new Map();
  private monitorRenderTargets: Map<string, BABYLON.RenderTargetTexture> = new Map();
  private monitorFrameCount: number = 0;
  // Cache texture handles for WebGL2 optimization
  private monitorTextureHandles: Map<string, WebGLTexture | null> = new Map();
  
  // Casting candidates in scene
  private castingCandidates: Map<string, { mesh: BABYLON.Mesh; name: string; avatarUrl?: string }> = new Map();
  
  // Scene banner system
  private sceneBanner: {
    mesh: BABYLON.Mesh | null;
    spotlight: BABYLON.SpotLight | null;
    glowLayer: BABYLON.GlowLayer | null;
    animationObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> | null;
    originalPositions: Float32Array | null;
  } = {
    mesh: null,
    spotlight: null,
    glowLayer: null,
    animationObserver: null,
    originalPositions: null,
  };
  private monitorTempFramebuffers: Map<string, WebGLFramebuffer | null> = new Map();
  // Track if callbacks are already registered to avoid duplicates
  private monitorCallbacksRegistered: Map<string, boolean> = new Map();
  // Track if first render has completed
  private monitorFirstRenderComplete: Map<string, boolean> = new Map();
  // Track logged warnings to avoid spam (only log once per state change)
  private monitorLoggedWarnings: Map<string, Set<string>> = new Map();
  // Track if context was lost (to trigger RTT recreation on restore)
  private monitorContextLost: boolean = false;
  // Track last known renderList length per preset (for change detection)
  private monitorLastRenderListLength: Map<string, number> = new Map();
  
  // Cache for loaded 3D light models to enable cloning (faster than re-loading)
  // Structure: { masterMesh, allMeshes, materialTemplates }
  private lightModelCache: Map<string, {
    masterMesh: BABYLON.Mesh;
    allMeshes: BABYLON.AbstractMesh[];
    localForwardAxis: BABYLON.Vector3;
    initialWorldForward: BABYLON.Vector3;
  }> = new Map();
  
  public cameraSettings: CameraSettings & { whiteBalance?: number } = {
    aperture: 2.8,
    shutter: '1/125',
    iso: 100,
    focalLength: 35,
    nd: 0,
    whiteBalance: 5600
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

  // Camera presets (Cam A-E)
  private cameraPresets: Map<string, {
    position: BABYLON.Vector3;
    target: BABYLON.Vector3;
    fov: number;
    alpha: number;
    beta: number;
    radius: number;
  } | null> = new Map([
    ['camA', null],
    ['camB', null],
    ['camC', null],
    ['camD', null],
    ['camE', null]
  ]);

  // Studio Gizmo System - Realistic light manipulation controls
  private studioGizmoActive: boolean = false;
  private studioGizmoMeshes: {
    baseRing: BABYLON.Mesh | null;        // Floor ring for horizontal movement
    heightSlider: BABYLON.Mesh | null;    // Vertical slider for height
    yokeRing: BABYLON.Mesh | null;        // Arc for tilt/pan
    heightLabel: BABYLON.Mesh | null;     // Height indicator text
    angleLabel: BABYLON.Mesh | null;      // Angle indicator text
  } = {
    baseRing: null,
    heightSlider: null,
    yokeRing: null,
    heightLabel: null,
    angleLabel: null
  };
  private studioGizmoDragging: 'base' | 'height' | 'yoke' | null = null;
  private studioGizmoDragStart: BABYLON.Vector3 | null = null;
  private studioGizmoOriginalPos: BABYLON.Vector3 | null = null;
  private studioGizmoOriginalHeight: number = 0;
  private studioGizmoGridSnap: boolean = true;
  private studioGizmoGridSize: number = 0.5; // 50cm grid
  
  // Light POV (Point of View) mode
  private lightPOVActive: boolean = false;
  private lightPOVCamera: BABYLON.FreeCamera | null = null;
  private lightPOVLightId: string | null = null; // Track which light is in POV mode
  private lightPOVDragCount: number = 0; // Track concurrent drags
  private savedCameraState: {
    alpha: number;
    beta: number;
    radius: number;
    target: BABYLON.Vector3;
  } | null = null;

  // Video recording state
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private recordingTimerInterval: number | null = null;
  private activeRecordingCamera: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true,
      stencil: true,
      powerPreference: 'high-performance',
      doNotHandleContextLost: false,
      adaptToDeviceRatio: true
    });
    
    // Handle WebGL context loss - critical for RTT stability
    canvas.addEventListener('webglcontextlost', (event) => {
      console.warn('[Monitor] WebGL context lost! This will cause signals to disappear.');
      event.preventDefault(); // Prevent default behavior to allow recovery
      this.monitorContextLost = true;
    });
    
    canvas.addEventListener('webglcontextrestored', () => {
      console.warn('[Monitor] WebGL context restored. Recreating GPU resources (RTTs, cameras)...');
      // CRITICAL: On context restore, GPU resources (textures, FBOs) are gone and must be recreated
      // Dispose old RTTs and cameras (they reference invalid GPU resources)
      const gl = (this.engine as any)._gl;
      for (const [presetId, rtt] of this.monitorRenderTargets.entries()) {
        try {
          // Remove from customRenderTargets before disposing
          const index = this.scene.customRenderTargets.indexOf(rtt);
          if (index !== -1) {
            this.scene.customRenderTargets.splice(index, 1);
          }
          rtt.dispose();
        } catch (e) {
          // RTT might already be disposed
        }
      }
      for (const [presetId, camera] of this.monitorCameras.entries()) {
        try {
          camera.dispose();
        } catch (e) {
          // Camera might already be disposed
        }
      }
      
      // Dispose temporary framebuffers (if context is still valid)
      if (gl && !gl.isContextLost()) {
        for (const [presetId, tempFbo] of this.monitorTempFramebuffers.entries()) {
          if (tempFbo) {
            try {
              gl.deleteFramebuffer(tempFbo);
            } catch (e) {
              // Framebuffer might already be deleted
            }
          }
        }
      }
      
      // Clear all maps to force recreation
      this.monitorRenderTargets.clear();
      this.monitorCameras.clear();
      this.monitorCallbacksRegistered.clear();
      this.monitorFirstRenderComplete.clear();
      this.monitorTextureHandles.clear();
      this.monitorTempFramebuffers.clear();
      this.monitorLoggedWarnings.clear();
      
      // RTTs will be recreated by updateMonitorCanvases on next render
      this.monitorContextLost = false;
      console.log('[Monitor] GPU resource cleanup complete. RTTs will be recreated on next render.');
    });
    
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.08, 0.09, 0.11, 1);
    
    // Create environment texture for PBR materials to render correctly
    // PBR materials need an environment for reflections and proper lighting
    this.scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
      'https://assets.babylonjs.com/environments/environmentSpecular.env',
      this.scene
    );
    this.scene.environmentIntensity = 0.6; // Subtle environment lighting
    
    // Scene optimizations - only override non-defaults that improve performance
    // autoClear and autoClearDepthAndStencil already default to true
    // useRightHandedSystem defaults to false (standard Babylon left-handed)

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
    this.camera.minZ = 0.5;
    this.camera.maxZ = 200;
    this.camera.fov = (this.cameraSettings.focalLength / 50) * 0.8;
    
    // Smooth camera movement to reduce visual artifacts during motion
    this.camera.inertia = 0.9; // Higher inertia = smoother movement
    this.camera.panningSensibility = 50; // Lower = smoother panning
    this.camera.angularSensibilityX = 500; // Smoother horizontal rotation
    this.camera.angularSensibilityY = 500; // Smoother vertical rotation

    // Setup professional rendering pipeline (Work Mode)
    this.setupRenderingPipeline();

    this.gizmoManager = new BABYLON.GizmoManager(this.scene);
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.attachableMeshes = [];
    
    // Professional studio gizmo styling
    this.customizeGizmoAppearance();

    virtualActorService.setScene(this.scene);
    propRenderingService.setScene(this.scene);

    this.setupStudio();
    this.setup2DViews(); // Must be called before setupUI so canvas is available
    this.setupUI();
    this.setupAssetEventListeners();
    this.setupFocusEventListeners();
    
    // Add default mannequin for focus target testing
    this.addDefaultMannequin();

    this.engine.runRenderLoop(() => {
      this.scene.render();
      this.updateTopView();
      this.updateHistogram();
      this.updateMonitorCanvases();
      this.updateSelectedLightProperties();
      // Update info panel in fullscreen mode
      if (this.topViewIsFullscreen) {
        this.updateTopViewInfoPanel();
      }
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
      this.resizeCanvases();
    });
    
    // Use ResizeObserver to detect viewport-3d size changes
    const viewport3d = canvas.parentElement;
    if (viewport3d) {
      const resizeObserver = new ResizeObserver(() => {
        // Small delay to ensure CSS has applied
        setTimeout(() => {
          this.engine.resize();
        }, 0);
      });
      resizeObserver.observe(viewport3d);
    }
    
    this.engine.resize();
    this.resizeCanvases();
  }

  // Public camera accessors for 3D controls integration
  public getCamera(): BABYLON.ArcRotateCamera {
    return this.camera;
  }
  
  public getCameraPosition(): BABYLON.Vector3 {
    return this.camera.position.clone();
  }
  
  public getCameraTarget(): BABYLON.Vector3 {
    return this.camera.target.clone();
  }
  
  public getCameraFov(): number {
    return this.camera.fov;
  }
  
  public setCameraPosition(position: BABYLON.Vector3): void {
    this.camera.position = position;
  }
  
  public setCameraTarget(target: BABYLON.Vector3): void {
    this.camera.target = target;
  }
  
  public setCameraFov(fov: number): void {
    this.camera.fov = fov;
  }
  
  public resetCamera(): void {
    this.camera.position = new BABYLON.Vector3(0, 2.5, -8);
    this.camera.target = new BABYLON.Vector3(0, 1, 0);
    this.camera.fov = 0.8;
  }

  public toggleWalls(visible?: boolean): boolean {
    this.wallsVisible = visible !== undefined ? visible : !this.wallsVisible;

    const walls = ['backWall', 'leftWall', 'rightWall', 'rearWall'];
    walls.forEach(name => {
      const wall = this.scene.getMeshByName(name);
      if (wall) {
        wall.isVisible = this.wallsVisible;
      }
    });

    return this.wallsVisible;
  }

  public toggleWall(wallId: string, visible?: boolean): boolean {
    const wall = this.scene.getMeshByName(wallId);
    if (wall) {
      wall.isVisible = visible !== undefined ? visible : !wall.isVisible;
      return wall.isVisible;
    }
    return false;
  }

  private floorVisible = true;

  public toggleFloor(visible?: boolean): boolean {
    this.floorVisible = visible !== undefined ? visible : !this.floorVisible;

    const ground = this.scene.getMeshByName('ground');

    if (ground) ground.isVisible = this.floorVisible;

    return this.floorVisible;
  }

  public toggleGrid(visible?: boolean): boolean {
    const grid = this.scene.getMeshByName('grid');
    if (grid) {
      grid.isVisible = visible !== undefined ? visible : !grid.isVisible;
      return grid.isVisible;
    }
    return false;
  }

  public setWallColor(hexColor: string, wallId?: string): void {
    const color = BABYLON.Color3.FromHexString(hexColor);
    if (wallId) {
      // Set color for single wall
      const wall = this.scene.getMeshByName(wallId);
      if (wall && wall.material) {
        (wall.material as BABYLON.StandardMaterial).diffuseColor = color;
      }
    } else {
      // Set color for all walls
      const walls = ['backWall', 'leftWall', 'rightWall', 'rearWall'];
      walls.forEach(name => {
        const wall = this.scene.getMeshByName(name);
        if (wall && wall.material) {
          (wall.material as BABYLON.StandardMaterial).diffuseColor = color;
        }
      });
    }
  }

  public setFloorColor(hexColor: string): void {
    const color = BABYLON.Color3.FromHexString(hexColor);
    const ground = this.scene.getMeshByName('ground');
    if (ground && ground.material) {
      (ground.material as BABYLON.StandardMaterial).diffuseColor = color;
    }
  }

  // Current backdrop mesh reference
  private currentBackdropMesh: BABYLON.Mesh | null = null;

  public loadBackdrop(backdropId: string, options: {
    category?: string;
    scale?: number;
    applyEnvironmentMap?: boolean;
    applyAmbientLight?: boolean;
    receiveShadow?: boolean;
  } = {}): void {
    console.log('VirtualStudio.loadBackdrop:', backdropId, options);

    // Remove existing backdrop first
    this.removeBackdrop();

    const scale = options.scale || 1.0;
    const category = options.category || 'bakgrunn';

    // Create backdrop based on category/type
    if (category === 'bakgrunn' || backdropId.includes('seamless') || backdropId.includes('background')) {
      // Create a cyclorama/seamless paper backdrop
      this.createSeamlessBackdrop(backdropId, scale, options.receiveShadow !== false);
    } else if (backdropId.includes('cove') || backdropId.includes('cyclorama')) {
      // Create a full cyclorama (curved backdrop)
      this.createCycloramaBackdrop(backdropId, scale, options.receiveShadow !== false);
    } else {
      // Default to seamless backdrop
      this.createSeamlessBackdrop(backdropId, scale, options.receiveShadow !== false);
    }

    // Dispatch event to confirm backdrop loaded
    window.dispatchEvent(new CustomEvent('ch-backdrop-loaded', {
      detail: { backdropId, category, scale }
    }));
  }

  private createSeamlessBackdrop(backdropId: string, scale: number, receiveShadow: boolean): void {
    // Create a curved seamless paper backdrop (like Savage seamless)
    const width = 6 * scale;
    const height = 4 * scale;
    const depth = 3 * scale;

    // Create the backdrop shape using a path
    const backdropMesh = BABYLON.MeshBuilder.CreateBox('currentBackdrop', {
      width: width,
      height: height,
      depth: 0.02
    }, this.scene);

    // Position behind the subject area
    backdropMesh.position.set(0, height / 2, -5);
    
    // Create backdrop material
    const backdropMat = new BABYLON.StandardMaterial('backdropMat', this.scene);
    backdropMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85); // Light gray seamless paper
    backdropMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Matte finish
    backdropMat.backFaceCulling = false;
    backdropMesh.material = backdropMat;
    backdropMesh.receiveShadows = receiveShadow;

    // Create a curved floor extension for seamless paper look
    const floorExtension = BABYLON.MeshBuilder.CreateGround('backdropFloor', {
      width: width,
      height: depth
    }, this.scene);
    floorExtension.position.set(0, 0.01, -5 + depth / 2);
    floorExtension.material = backdropMat.clone('backdropFloorMat');
    floorExtension.receiveShadows = receiveShadow;
    floorExtension.parent = backdropMesh;

    this.currentBackdropMesh = backdropMesh;
    console.log('Seamless backdrop created:', backdropId);
  }

  private createCycloramaBackdrop(backdropId: string, scale: number, receiveShadow: boolean): void {
    // Create a professional cyclorama (infinity cove)
    const width = 10 * scale;
    const height = 5 * scale;
    const curveRadius = 2 * scale;

    // Create back wall
    const backWall = BABYLON.MeshBuilder.CreatePlane('cycloBackWall', {
      width: width,
      height: height - curveRadius,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, this.scene);
    backWall.position.set(0, (height - curveRadius) / 2 + curveRadius, -8);

    // Create curved transition using ribbon
    const pathPoints: BABYLON.Vector3[][] = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * (Math.PI / 2);
      const y = curveRadius * (1 - Math.cos(angle));
      const z = -8 + curveRadius * Math.sin(angle);
      pathPoints.push([
        new BABYLON.Vector3(-width / 2, y, z),
        new BABYLON.Vector3(width / 2, y, z)
      ]);
    }

    const paths: BABYLON.Vector3[][] = [];
    for (let i = 0; i < pathPoints.length; i++) {
      paths.push(pathPoints[i]);
    }

    const curve = BABYLON.MeshBuilder.CreateRibbon('cycloCurve', {
      pathArray: paths,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, this.scene);
    
    // Create floor
    const floor = BABYLON.MeshBuilder.CreateGround('cycloFloor', {
      width: width,
      height: 8 + curveRadius
    }, this.scene);
    floor.position.set(0, 0.01, -4);

    // Create material
    const cycloMat = new BABYLON.StandardMaterial('cycloMat', this.scene);
    cycloMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95); // White cove
    cycloMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    cycloMat.backFaceCulling = false;

    backWall.material = cycloMat;
    curve.material = cycloMat;
    floor.material = cycloMat.clone('cycloFloorMat');

    backWall.receiveShadows = receiveShadow;
    curve.receiveShadows = receiveShadow;
    floor.receiveShadows = receiveShadow;

    // Parent all parts to backWall for easy removal
    curve.parent = backWall;
    floor.parent = backWall;

    this.currentBackdropMesh = backWall;
    console.log('Cyclorama backdrop created:', backdropId);
  }

  public removeBackdrop(): void {
    if (this.currentBackdropMesh) {
      // Dispose children first
      this.currentBackdropMesh.getChildMeshes().forEach(child => {
        child.dispose();
      });
      this.currentBackdropMesh.dispose();
      this.currentBackdropMesh = null;
      console.log('Backdrop removed');
    }
  }

  /**
   * Customize gizmo appearance for professional studio look
   * Uses studio color scheme (amber/gold) with improved visibility
   */
  private customizeGizmoAppearance(): void {
    if (!this.gizmoManager) return;
    
    // Studio color palette
    const studioAmber = new BABYLON.Color3(1.0, 0.67, 0.0);      // #FFAA00 - primary accent
    const studioGold = new BABYLON.Color3(1.0, 0.84, 0.0);       // Gold highlight
    const studioRed = new BABYLON.Color3(0.95, 0.3, 0.3);        // Softer red
    const studioGreen = new BABYLON.Color3(0.3, 0.85, 0.4);      // Softer green  
    const studioBlue = new BABYLON.Color3(0.3, 0.6, 1.0);        // Softer blue
    const hoverWhite = new BABYLON.Color3(1.0, 1.0, 1.0);        // White on hover
    
    // Customize position gizmo (arrows)
    const posGizmo = (this.gizmoManager as any).gizmos?.positionGizmo;
    if (posGizmo) {
      // X axis (red) - more muted
      if (posGizmo.xGizmo) {
        posGizmo.xGizmo.coloredMaterial.diffuseColor = studioRed;
        posGizmo.xGizmo.coloredMaterial.emissiveColor = studioRed.scale(0.3);
        posGizmo.xGizmo.hoverMaterial.diffuseColor = hoverWhite;
        posGizmo.xGizmo.hoverMaterial.emissiveColor = studioAmber.scale(0.5);
      }
      // Y axis (green) - more muted
      if (posGizmo.yGizmo) {
        posGizmo.yGizmo.coloredMaterial.diffuseColor = studioGreen;
        posGizmo.yGizmo.coloredMaterial.emissiveColor = studioGreen.scale(0.3);
        posGizmo.yGizmo.hoverMaterial.diffuseColor = hoverWhite;
        posGizmo.yGizmo.hoverMaterial.emissiveColor = studioAmber.scale(0.5);
      }
      // Z axis (blue) - more muted
      if (posGizmo.zGizmo) {
        posGizmo.zGizmo.coloredMaterial.diffuseColor = studioBlue;
        posGizmo.zGizmo.coloredMaterial.emissiveColor = studioBlue.scale(0.3);
        posGizmo.zGizmo.hoverMaterial.diffuseColor = hoverWhite;
        posGizmo.zGizmo.hoverMaterial.emissiveColor = studioAmber.scale(0.5);
      }
      
      // Make arrows slightly thinner for cleaner look
      posGizmo.scaleRatio = 0.9;
    }
    
    // Customize rotation gizmo (rings)
    const rotGizmo = (this.gizmoManager as any).gizmos?.rotationGizmo;
    if (rotGizmo) {
      if (rotGizmo.xGizmo) {
        rotGizmo.xGizmo.coloredMaterial.diffuseColor = studioRed;
        rotGizmo.xGizmo.coloredMaterial.emissiveColor = studioRed.scale(0.3);
        rotGizmo.xGizmo.hoverMaterial.diffuseColor = hoverWhite;
        rotGizmo.xGizmo.hoverMaterial.emissiveColor = studioGold.scale(0.5);
      }
      if (rotGizmo.yGizmo) {
        rotGizmo.yGizmo.coloredMaterial.diffuseColor = studioGreen;
        rotGizmo.yGizmo.coloredMaterial.emissiveColor = studioGreen.scale(0.3);
        rotGizmo.yGizmo.hoverMaterial.diffuseColor = hoverWhite;
        rotGizmo.yGizmo.hoverMaterial.emissiveColor = studioGold.scale(0.5);
      }
      if (rotGizmo.zGizmo) {
        rotGizmo.zGizmo.coloredMaterial.diffuseColor = studioBlue;
        rotGizmo.zGizmo.coloredMaterial.emissiveColor = studioBlue.scale(0.3);
        rotGizmo.zGizmo.hoverMaterial.diffuseColor = hoverWhite;
        rotGizmo.zGizmo.hoverMaterial.emissiveColor = studioGold.scale(0.5);
      }
      
      rotGizmo.scaleRatio = 0.85;
    }
    
    // Set gizmo thickness for better visibility in studio environment
    this.gizmoManager.gizmos.positionGizmo?.xGizmo?.setCustomMesh;
    
    // Ensure gizmos are rendered on top
    this.gizmoManager.utilityLayer.utilityLayerScene.autoClearDepthAndStencil = false;
    
    console.log('Studio gizmo appearance customized');
  }

  /**
   * Setup professional rendering pipeline with:
   * - DefaultRenderingPipeline (ACES tone mapping, DOF, bloom, grain)
   * - SSR (Screen-Space Reflections) for realistic reflections
   * - High-quality anti-aliasing
   */
  private setupRenderingPipeline(): void {
    // Create DefaultRenderingPipeline for professional post-processing
    this.renderingPipeline = new BABYLON.DefaultRenderingPipeline(
      'defaultPipeline',
      true, // HDR
      this.scene,
      [this.camera]
    );

    // ACES Tone Mapping for cinematic look
    this.renderingPipeline.imageProcessing.toneMappingEnabled = true;
    this.renderingPipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    
    // Exposure and contrast
    this.renderingPipeline.imageProcessing.exposure = 1.0;
    this.renderingPipeline.imageProcessing.contrast = 1.1;
    
    // Enable high-quality anti-aliasing (FXAA + MSAA)
    this.renderingPipeline.fxaaEnabled = true;
    this.renderingPipeline.samples = 4; // MSAA samples
    
    // Subtle bloom for emissive materials (light bulbs, screens)
    this.renderingPipeline.bloomEnabled = true;
    this.renderingPipeline.bloomThreshold = 0.7;
    this.renderingPipeline.bloomWeight = 0.35;
    this.renderingPipeline.bloomKernel = 64;
    this.renderingPipeline.bloomScale = 0.6;
    
    // Depth of Field (disabled by default, enabled via camera settings)
    this.renderingPipeline.depthOfFieldEnabled = false;
    this.renderingPipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Medium;
    this.renderingPipeline.depthOfField.focalLength = 50;
    this.renderingPipeline.depthOfField.fStop = 2.8;
    this.renderingPipeline.depthOfField.focusDistance = 5000; // In mm
    
    // Film grain for cinematic look (subtle)
    this.renderingPipeline.grainEnabled = false;
    this.renderingPipeline.grain.intensity = 5;
    this.renderingPipeline.grain.animated = true;
    
    // Chromatic aberration (disabled by default)
    this.renderingPipeline.chromaticAberrationEnabled = false;
    this.renderingPipeline.chromaticAberration.aberrationAmount = 30;
    
    // Sharpen (subtle)
    this.renderingPipeline.sharpenEnabled = true;
    this.renderingPipeline.sharpen.edgeAmount = 0.2;
    
    // Setup SSR (Screen-Space Reflections) for realistic reflections
    try {
      this.ssrPipeline = new BABYLON.SSRRenderingPipeline(
        'ssrPipeline',
        this.scene,
        [this.camera],
        false, // forceGeometryBuffer
        BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE
      );
      
      // SSR settings for quality/performance balance
      this.ssrPipeline.strength = 1.0;
      this.ssrPipeline.reflectionSpecularFalloffExponent = 2;
      this.ssrPipeline.step = 1;
      this.ssrPipeline.maxSteps = 64;
      this.ssrPipeline.maxDistance = 50;
      this.ssrPipeline.thickness = 0.5;
      this.ssrPipeline.roughnessFactor = 0.1;
      this.ssrPipeline.selfCollisionNumSkip = 2;
      this.ssrPipeline.enableSmoothReflections = true;
      this.ssrPipeline.blurDispersionStrength = 0.03;
      this.ssrPipeline.enableAutomaticThicknessComputation = false;
      
      console.log('SSR pipeline enabled');
    } catch (e) {
      console.warn('SSR not available:', e);
    }
    
    // Dispatch event to notify UI about rendering pipeline
    window.dispatchEvent(new CustomEvent('vs-rendering-pipeline-ready', {
      detail: { pipeline: this.renderingPipeline, ssr: this.ssrPipeline }
    }));
    
    console.log('Professional rendering pipeline initialized (Work Mode)');
  }

  /**
   * Update DOF settings based on camera aperture and focus distance
   */
  public updateDOFSettings(fStop: number, focusDistance: number, enabled: boolean): void {
    if (!this.renderingPipeline) return;
    
    this.renderingPipeline.depthOfFieldEnabled = enabled;
    if (enabled) {
      this.renderingPipeline.depthOfField.fStop = fStop;
      this.renderingPipeline.depthOfField.focusDistance = focusDistance * 1000; // Convert to mm
      this.renderingPipeline.depthOfField.focalLength = this.cameraSettings.focalLength;
    }
  }

  /**
   * Toggle between Work Mode and Final Mode
   */
  public setRenderMode(mode: 'work' | 'final'): void {
    this.renderMode = mode;
    
    if (mode === 'final') {
      // Final Mode: Higher quality, progressive rendering
      if (this.renderingPipeline) {
        this.renderingPipeline.samples = 8;
        this.renderingPipeline.bloomEnabled = true;
        this.renderingPipeline.grainEnabled = true;
      }
      this.finalRenderSamples = 0;
      console.log('Switched to Final Mode - Progressive rendering enabled');
    } else {
      // Work Mode: Balanced quality/performance
      if (this.renderingPipeline) {
        this.renderingPipeline.samples = 4;
        this.renderingPipeline.grainEnabled = false;
      }
      console.log('Switched to Work Mode');
    }
    
    window.dispatchEvent(new CustomEvent('vs-render-mode-changed', {
      detail: { mode, samples: this.finalRenderSamples }
    }));
  }

  /**
   * Get current render mode
   */
  public getRenderMode(): 'work' | 'final' {
    return this.renderMode;
  }

  /**
   * Get rendering pipeline for external access
   */
  public getRenderingPipeline(): BABYLON.DefaultRenderingPipeline | null {
    return this.renderingPipeline;
  }

  // ===== STUDIO GIZMO SYSTEM =====
  
  /**
   * Create and show studio gizmos for the selected light
   * Provides realistic light stand controls instead of abstract XYZ arrows
   */
  private createStudioGizmos(lightId: string): void {
    const lightData = this.lights.get(lightId);
    if (!lightData) return;
    
    // Clean up existing studio gizmos
    this.disposeStudioGizmos();
    
    const lightPos = lightData.mesh.position.clone();
    const studioAmber = new BABYLON.Color3(1.0, 0.67, 0.0);
    const studioGreen = new BABYLON.Color3(0.3, 0.85, 0.4);
    const studioCyan = new BABYLON.Color3(0.3, 0.8, 1.0);
    
    // 1. BASE RING - Floor ring for horizontal movement (Stativgrep)
    const baseRing = BABYLON.MeshBuilder.CreateTorus('studioGizmo_baseRing', {
      diameter: 1.8,
      thickness: 0.08,
      tessellation: 48
    }, this.scene);
    baseRing.position = new BABYLON.Vector3(lightPos.x, 0.02, lightPos.z);
    baseRing.rotation.x = 0; // Flat on ground
    
    const baseRingMat = new BABYLON.StandardMaterial('baseRingMat', this.scene);
    baseRingMat.emissiveColor = studioAmber;
    baseRingMat.diffuseColor = studioAmber;
    baseRingMat.alpha = 0.8;
    baseRingMat.disableLighting = true;
    baseRing.material = baseRingMat;
    baseRing.isPickable = true;
    baseRing.renderingGroupId = 1;
    
    // Add grid markers on base ring - use RELATIVE positions since they are children
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const marker = BABYLON.MeshBuilder.CreateBox(`baseMarker_${i}`, { width: 0.12, height: 0.03, depth: 0.04 }, this.scene);
      // Relative position from parent (baseRing center)
      marker.position = new BABYLON.Vector3(
        Math.cos(angle) * 0.9,
        0.01, // Slightly above ring
        Math.sin(angle) * 0.9
      );
      marker.rotation.y = angle;
      marker.material = baseRingMat;
      marker.parent = baseRing;
      marker.isPickable = false;
    }
    
    // Add drag behavior for base ring
    const baseDragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 1, 0) });
    baseDragBehavior.useObjectOrientationForDragging = false;
    baseDragBehavior.onDragStartObservable.add(() => {
      this.studioGizmoDragging = 'base';
      this.studioGizmoDragStart = lightData.mesh.position.clone();
      // Activate POV mode when starting to drag
      this.activateLightPOV(lightId);
    });
    baseDragBehavior.onDragObservable.add((event) => {
      if (this.studioGizmoDragging === 'base') {
        let newX = baseRing.position.x;
        let newZ = baseRing.position.z;
        
        // Apply grid snapping if enabled
        if (this.studioGizmoGridSnap) {
          newX = Math.round(newX / this.studioGizmoGridSize) * this.studioGizmoGridSize;
          newZ = Math.round(newZ / this.studioGizmoGridSize) * this.studioGizmoGridSize;
        }
        
        // Update light position (keep Y)
        lightData.mesh.position.x = newX;
        lightData.mesh.position.z = newZ;
        if (lightData.light instanceof BABYLON.SpotLight || lightData.light instanceof BABYLON.PointLight) {
          lightData.light.position.x = newX;
          lightData.light.position.z = newZ;
        }
        
        // Update height slider position
        if (this.studioGizmoMeshes.heightSlider) {
          this.studioGizmoMeshes.heightSlider.position.x = newX;
          this.studioGizmoMeshes.heightSlider.position.z = newZ;
        }
        
        // Update yoke ring position to follow light
        if (this.studioGizmoMeshes.yokeRing) {
          this.studioGizmoMeshes.yokeRing.position.x = newX;
          this.studioGizmoMeshes.yokeRing.position.z = newZ;
        }
        
        // Update POV camera position
        this.updateLightPOVCamera(lightId);
      }
    });
    baseDragBehavior.onDragEndObservable.add(() => {
      this.studioGizmoDragging = null;
      // Deactivate POV mode when done dragging
      this.deactivateLightPOV();
    });
    baseRing.addBehavior(baseDragBehavior);
    
    this.studioGizmoMeshes.baseRing = baseRing;
    
    // 2. HEIGHT SLIDER - Vertical slider along light stand (Teleskopmast)
    const heightSlider = BABYLON.MeshBuilder.CreateCylinder('studioGizmo_heightSlider', {
      height: 0.3,
      diameter: 0.15,
      tessellation: 16
    }, this.scene);
    heightSlider.position = new BABYLON.Vector3(lightPos.x, lightPos.y, lightPos.z);
    
    const heightSliderMat = new BABYLON.StandardMaterial('heightSliderMat', this.scene);
    heightSliderMat.emissiveColor = studioGreen;
    heightSliderMat.diffuseColor = studioGreen;
    heightSliderMat.alpha = 0.9;
    heightSliderMat.disableLighting = true;
    heightSlider.material = heightSliderMat;
    heightSlider.isPickable = true;
    heightSlider.renderingGroupId = 1;
    
    // Add up/down arrows on height slider
    const arrowUp = BABYLON.MeshBuilder.CreateCylinder('arrowUp', { height: 0.15, diameterTop: 0, diameterBottom: 0.1 }, this.scene);
    arrowUp.position.y = 0.22;
    arrowUp.material = heightSliderMat;
    arrowUp.parent = heightSlider;
    
    const arrowDown = BABYLON.MeshBuilder.CreateCylinder('arrowDown', { height: 0.15, diameterTop: 0.1, diameterBottom: 0 }, this.scene);
    arrowDown.position.y = -0.22;
    arrowDown.material = heightSliderMat;
    arrowDown.parent = heightSlider;
    
    // Add stand pole visualization - use unit height (1m) for easy scaling
    const standPole = BABYLON.MeshBuilder.CreateCylinder('standPole', {
      height: 1.0, // Unit height for easy scaling
      diameter: 0.04,
      tessellation: 8
    }, this.scene);
    // Scale and position to match current light height
    standPole.scaling.y = lightPos.y;
    standPole.position = new BABYLON.Vector3(0, -lightPos.y / 2, 0);
    const poleMat = new BABYLON.StandardMaterial('poleMat', this.scene);
    poleMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    poleMat.alpha = 0.5;
    standPole.material = poleMat;
    standPole.parent = heightSlider;
    standPole.isPickable = false;
    
    // Add drag behavior for height slider (vertical only)
    const heightDragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: new BABYLON.Vector3(0, 1, 0) });
    heightDragBehavior.onDragStartObservable.add(() => {
      this.studioGizmoDragging = 'height';
      this.studioGizmoOriginalHeight = lightData.mesh.position.y;
      this.activateLightPOV(lightId);
    });
    heightDragBehavior.onDragObservable.add(() => {
      if (this.studioGizmoDragging === 'height') {
        // Clamp height between 0.5m and 6m
        const newY = Math.max(0.5, Math.min(6.0, heightSlider.position.y));
        heightSlider.position.y = newY;
        
        // Update light position
        lightData.mesh.position.y = newY;
        if (lightData.light instanceof BABYLON.SpotLight || lightData.light instanceof BABYLON.PointLight) {
          lightData.light.position.y = newY;
        }
        
        // Update stand pole - use absolute scaling since we used unit height
        const pole = heightSlider.getChildMeshes().find(m => m.name === 'standPole');
        if (pole) {
          (pole as BABYLON.Mesh).scaling.y = newY;
          pole.position.y = -newY / 2;
        }
        
        // Update yoke ring height to follow light
        if (this.studioGizmoMeshes.yokeRing) {
          this.studioGizmoMeshes.yokeRing.position.y = newY;
        }
        
        // Show height label
        this.updateHeightLabel(newY);
        this.updateLightPOVCamera(lightId);
      }
    });
    heightDragBehavior.onDragEndObservable.add(() => {
      this.studioGizmoDragging = null;
      this.hideHeightLabel();
      this.deactivateLightPOV();
    });
    heightSlider.addBehavior(heightDragBehavior);
    
    this.studioGizmoMeshes.heightSlider = heightSlider;
    
    // 3. YOKE RING - Arc for tilt/pan control (Lampehode Yoke)
    const yokeRing = BABYLON.MeshBuilder.CreateTorus('studioGizmo_yokeRing', {
      diameter: 0.8,
      thickness: 0.05,
      tessellation: 32,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, this.scene);
    yokeRing.position = lightData.mesh.position.clone();
    yokeRing.rotation.x = Math.PI / 2; // Vertical orientation
    
    const yokeRingMat = new BABYLON.StandardMaterial('yokeRingMat', this.scene);
    yokeRingMat.emissiveColor = studioCyan;
    yokeRingMat.diffuseColor = studioCyan;
    yokeRingMat.alpha = 0.8;
    yokeRingMat.disableLighting = true;
    yokeRing.material = yokeRingMat;
    yokeRing.isPickable = true;
    yokeRing.renderingGroupId = 1;
    
    // Add rotation drag behavior for yoke
    const yokeDragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 0, 1) });
    yokeDragBehavior.onDragStartObservable.add(() => {
      this.studioGizmoDragging = 'yoke';
      this.activateLightPOV(lightId);
    });
    yokeDragBehavior.onDragObservable.add((event) => {
      if (this.studioGizmoDragging === 'yoke' && lightData.light instanceof BABYLON.SpotLight) {
        // Calculate rotation from drag delta
        const sensitivity = 0.01;
        const deltaX = event.delta.x * sensitivity;
        const deltaY = event.delta.y * sensitivity;
        
        // Get current direction and modify
        const currentDir = lightData.light.direction.clone();
        
        // Rotate around Y axis (pan)
        const yRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, deltaX);
        currentDir.rotateByQuaternionToRef(yRotation, currentDir);
        
        // Rotate around X axis (tilt)
        const xRotation = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, deltaY);
        currentDir.rotateByQuaternionToRef(xRotation, currentDir);
        
        lightData.light.direction = currentDir.normalize();
        
        // Update mesh rotation to match
        if (lightData.mesh.rotationQuaternion) {
          const lookAt = lightData.mesh.position.add(currentDir.scale(5));
          lightData.mesh.lookAt(lookAt);
        }
        
        // Show angle in degrees
        const tiltDeg = Math.round(Math.asin(-currentDir.y) * 180 / Math.PI);
        const panDeg = Math.round(Math.atan2(currentDir.x, -currentDir.z) * 180 / Math.PI);
        this.updateAngleLabel(tiltDeg, panDeg);
        this.updateLightPOVCamera(lightId);
      }
    });
    yokeDragBehavior.onDragEndObservable.add(() => {
      this.studioGizmoDragging = null;
      this.hideAngleLabel();
      this.deactivateLightPOV();
    });
    yokeRing.addBehavior(yokeDragBehavior);
    
    this.studioGizmoMeshes.yokeRing = yokeRing;
    this.studioGizmoActive = true;
    
    // Add to glow layer for visibility
    if (this.glowLayer) {
      this.glowLayer.addIncludedOnlyMesh(baseRing);
      this.glowLayer.addIncludedOnlyMesh(heightSlider);
      this.glowLayer.addIncludedOnlyMesh(yokeRing);
    }
    
    console.log('Studio gizmos created for light:', lightId);
  }
  
  /**
   * Helper to dispose a mesh with all its behaviors and children
   */
  private disposeMeshWithBehaviors(mesh: BABYLON.Mesh | null): void {
    if (!mesh) return;
    
    // Remove all behaviors first to prevent observer leaks
    const behaviors = mesh.behaviors.slice(); // Copy array
    for (const behavior of behaviors) {
      mesh.removeBehavior(behavior);
    }
    
    // Dispose child meshes explicitly
    const children = mesh.getChildMeshes(false);
    for (const child of children) {
      if (child.material) {
        child.material.dispose();
      }
      child.dispose();
    }
    
    // Dispose material
    if (mesh.material) {
      mesh.material.dispose();
    }
    
    // Dispose the mesh itself
    mesh.dispose();
  }
  
  /**
   * Dispose all studio gizmo meshes
   */
  private disposeStudioGizmos(): void {
    // Remove from glow layer first to prevent memory leaks
    if (this.glowLayer) {
      if (this.studioGizmoMeshes.baseRing) {
        this.glowLayer.removeIncludedOnlyMesh(this.studioGizmoMeshes.baseRing);
      }
      if (this.studioGizmoMeshes.heightSlider) {
        this.glowLayer.removeIncludedOnlyMesh(this.studioGizmoMeshes.heightSlider);
      }
      if (this.studioGizmoMeshes.yokeRing) {
        this.glowLayer.removeIncludedOnlyMesh(this.studioGizmoMeshes.yokeRing);
      }
    }
    
    // Dispose meshes with all behaviors and children
    this.disposeMeshWithBehaviors(this.studioGizmoMeshes.baseRing);
    this.studioGizmoMeshes.baseRing = null;
    
    this.disposeMeshWithBehaviors(this.studioGizmoMeshes.heightSlider);
    this.studioGizmoMeshes.heightSlider = null;
    
    this.disposeMeshWithBehaviors(this.studioGizmoMeshes.yokeRing);
    this.studioGizmoMeshes.yokeRing = null;
    
    // Dispose labels with dynamic textures
    if (this.studioGizmoMeshes.heightLabel) {
      const mat = this.studioGizmoMeshes.heightLabel.material as BABYLON.StandardMaterial;
      if (mat?.diffuseTexture) {
        mat.diffuseTexture.dispose();
      }
      if (mat?.emissiveTexture && mat.emissiveTexture !== mat.diffuseTexture) {
        mat.emissiveTexture.dispose();
      }
      this.disposeMeshWithBehaviors(this.studioGizmoMeshes.heightLabel);
      this.studioGizmoMeshes.heightLabel = null;
    }
    if (this.studioGizmoMeshes.angleLabel) {
      const mat = this.studioGizmoMeshes.angleLabel.material as BABYLON.StandardMaterial;
      if (mat?.diffuseTexture) {
        mat.diffuseTexture.dispose();
      }
      if (mat?.emissiveTexture && mat.emissiveTexture !== mat.diffuseTexture) {
        mat.emissiveTexture.dispose();
      }
      this.disposeMeshWithBehaviors(this.studioGizmoMeshes.angleLabel);
      this.studioGizmoMeshes.angleLabel = null;
    }
    
    this.studioGizmoActive = false;
  }
  
  /**
   * Draw rounded rectangle (cross-browser compatible)
   */
  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  
  /**
   * Update height label during drag with actual text rendering
   */
  private updateHeightLabel(height: number): void {
    const heightCm = Math.round(height * 100);
    const labelText = `${heightCm} cm`;
    
    // Create label plane with dynamic texture for text rendering
    if (!this.studioGizmoMeshes.heightLabel) {
      const labelPlane = BABYLON.MeshBuilder.CreatePlane('heightLabel', { width: 0.5, height: 0.15 }, this.scene);
      labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      labelPlane.renderingGroupId = 2;
      
      // Create dynamic texture for text
      const dynamicTexture = new BABYLON.DynamicTexture('heightLabelTexture', { width: 256, height: 64 }, this.scene, true);
      
      const labelMat = new BABYLON.StandardMaterial('heightLabelMat', this.scene);
      labelMat.diffuseTexture = dynamicTexture;
      labelMat.emissiveTexture = dynamicTexture;
      labelMat.opacityTexture = dynamicTexture;
      labelMat.disableLighting = true;
      labelMat.backFaceCulling = false;
      labelPlane.material = labelMat;
      
      this.studioGizmoMeshes.heightLabel = labelPlane;
    }
    
    // Update text on dynamic texture
    const mat = this.studioGizmoMeshes.heightLabel.material as BABYLON.StandardMaterial;
    const texture = mat.diffuseTexture as BABYLON.DynamicTexture;
    if (texture) {
      const ctx = texture.getContext();
      ctx.clearRect(0, 0, 256, 64);
      
      // Draw background using cross-browser compatible rounded rect
      ctx.fillStyle = 'rgba(30, 30, 35, 0.9)';
      this.drawRoundedRect(ctx, 4, 4, 248, 56, 8);
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = '#4DD966'; // Green matching height slider
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, 4, 4, 248, 56, 8);
      ctx.stroke();
      
      // Draw text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 128, 32);
      
      texture.update();
    }
    
    const slider = this.studioGizmoMeshes.heightSlider;
    if (slider && this.studioGizmoMeshes.heightLabel) {
      this.studioGizmoMeshes.heightLabel.position = slider.position.add(new BABYLON.Vector3(0.5, 0.2, 0));
      this.studioGizmoMeshes.heightLabel.isVisible = true;
    }
  }
  
  /**
   * Hide height label
   */
  private hideHeightLabel(): void {
    if (this.studioGizmoMeshes.heightLabel) {
      this.studioGizmoMeshes.heightLabel.isVisible = false;
    }
  }
  
  /**
   * Update angle label during yoke drag with actual text rendering
   */
  private updateAngleLabel(tilt: number, pan: number): void {
    const labelText = `Tilt: ${tilt}° Pan: ${pan}°`;
    
    // Create label plane with dynamic texture for text rendering
    if (!this.studioGizmoMeshes.angleLabel) {
      const labelPlane = BABYLON.MeshBuilder.CreatePlane('angleLabel', { width: 0.7, height: 0.15 }, this.scene);
      labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      labelPlane.renderingGroupId = 2;
      
      // Create dynamic texture for text
      const dynamicTexture = new BABYLON.DynamicTexture('angleLabelTexture', { width: 320, height: 64 }, this.scene, true);
      
      const labelMat = new BABYLON.StandardMaterial('angleLabelMat', this.scene);
      labelMat.diffuseTexture = dynamicTexture;
      labelMat.emissiveTexture = dynamicTexture;
      labelMat.opacityTexture = dynamicTexture;
      labelMat.disableLighting = true;
      labelMat.backFaceCulling = false;
      labelPlane.material = labelMat;
      
      this.studioGizmoMeshes.angleLabel = labelPlane;
    }
    
    // Update text on dynamic texture
    const mat = this.studioGizmoMeshes.angleLabel.material as BABYLON.StandardMaterial;
    const texture = mat.diffuseTexture as BABYLON.DynamicTexture;
    if (texture) {
      const ctx = texture.getContext();
      ctx.clearRect(0, 0, 320, 64);
      
      // Draw background using cross-browser compatible rounded rect
      ctx.fillStyle = 'rgba(30, 30, 35, 0.9)';
      this.drawRoundedRect(ctx, 4, 4, 312, 56, 8);
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = '#4DCCFF'; // Cyan matching yoke ring
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, 4, 4, 312, 56, 8);
      ctx.stroke();
      
      // Draw text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 160, 32);
      
      texture.update();
    }
    
    const yoke = this.studioGizmoMeshes.yokeRing;
    if (yoke && this.studioGizmoMeshes.angleLabel) {
      this.studioGizmoMeshes.angleLabel.position = yoke.position.add(new BABYLON.Vector3(0.6, 0.4, 0));
      this.studioGizmoMeshes.angleLabel.isVisible = true;
    }
  }
  
  /**
   * Hide angle label
   */
  private hideAngleLabel(): void {
    if (this.studioGizmoMeshes.angleLabel) {
      this.studioGizmoMeshes.angleLabel.isVisible = false;
    }
  }
  
  // ===== GAME-STYLE LIGHT CONTROL HUD =====
  
  private hudLightId: string | null = null;
  private hudJoystickDragging: boolean = false;
  private hudHeightDragging: boolean = false;
  private hudInitialized: boolean = false;
  private hudJoystickStartPan: number = 0;
  private hudJoystickStartTilt: number = 0;
  private hudJoystickStartDir: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 1);
  private hudJoystickStartPointer: { x: number; y: number } = { x: 0, y: 0 };
  private hudJoystickCachedRect: DOMRect | null = null; // Cache bounding rect during drag
  private hudJoystickDevicePixelRatio: number = 1; // High-DPI support
  private hudJoystickStartEventPos: { x: number; y: number } | null = null; // Store actual event position at start
  
  // Focus Target System
  private focusMode: 'human' | 'product' = 'human';
  private focusTargetId: string | null = null;
  private focusTargetMesh: BABYLON.Mesh | null = null;
  private focusAnchor: BABYLON.Vector3 = new BABYLON.Vector3(0, 1.6, 0);
  private smoothedFocusAnchor: BABYLON.Vector3 = new BABYLON.Vector3(0, 1.6, 0);
  private focusSmoothingSpeed: number = 8.0;
  
  /**
   * Show the game-style HUD for controlling light rotation/position
   */
  private showLightControlHUD(lightId: string, lightData: LightData): void {
    const hud = document.getElementById('lightControlHUD');
    if (!hud) return;
    
    this.hudLightId = lightId;
    
    // Update HUD with light info
    const nameEl = document.getElementById('hudLightName');
    if (nameEl) nameEl.textContent = lightData.name;
    
    // Update current values
    this.updateHUDValues(lightData);
    
    // Show HUD
    hud.style.display = 'block';
    
    // Initialize event listeners (only once)
    if (!this.hudInitialized) {
      this.initHUDEventListeners();
      this.hudInitialized = true;
    }
  }
  
  /**
   * Hide the light control HUD
   */
  private hideLightControlHUD(): void {
    const hud = document.getElementById('lightControlHUD');
    if (hud) hud.style.display = 'none';
    this.hudLightId = null;
  }
  
  /**
   * Update HUD display values from light data
   */
  private updateHUDValues(lightData: LightData): void {
    const pos = lightData.mesh.position;
    
    // Update position values
    const posX = document.getElementById('hudPosX');
    const posZ = document.getElementById('hudPosZ');
    if (posX) posX.textContent = pos.x.toFixed(2);
    if (posZ) posZ.textContent = pos.z.toFixed(2);
    
    // Update height
    const heightVal = document.getElementById('hudHeightValue');
    const heightFill = document.getElementById('heightSliderFill');
    const heightThumb = document.getElementById('heightSliderThumb');
    if (heightVal) heightVal.textContent = `${pos.y.toFixed(1)}m`;
    
    // Height slider: 0.5m to 6m range, clamped
    const clampedHeight = Math.max(0.5, Math.min(6, pos.y));
    const heightPercent = ((clampedHeight - 0.5) / (6 - 0.5)) * 100;
    if (heightFill) heightFill.style.width = `${heightPercent}%`;
    if (heightThumb) heightThumb.style.left = `${heightPercent}%`;
    
    // Update rotation values if spotlight
    if (lightData.light instanceof BABYLON.SpotLight) {
      const dir = lightData.light.direction.normalize();
      
      // Clamp direction.y to avoid NaN from asin
      const clampedY = Math.max(-1, Math.min(1, -dir.y));
      const tiltAngle = Math.asin(clampedY) * (180 / Math.PI);
      const panAngle = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
      
      // Update main HUD values
      const tiltEl = document.getElementById('hudTiltValue');
      const panEl = document.getElementById('hudPanValue');
      if (tiltEl) tiltEl.textContent = `${tiltAngle.toFixed(0)}°`;
      if (panEl) panEl.textContent = `${panAngle.toFixed(0)}°`;
      
      // Store current angles for joystick reference
      this.hudJoystickStartPan = panAngle * (Math.PI / 180);
      this.hudJoystickStartTilt = tiltAngle * (Math.PI / 180);
    }
  }
  
  /**
   * Initialize HUD event listeners
   */
  private initHUDEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('hudCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideLightControlHUD());
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.hudLightId) {
        this.hideLightControlHUD();
      }
    });
    
    // Collapsible sections
    this.initHUDCollapsibleSections();
    
    // Rotation joystick
    this.initJoystickControl();
    
    // Height slider
    this.initHeightSliderControl();
    
    // D-Pad position controls
    this.initDPadControls();
    
    // Action buttons
    this.initHUDActionButtons();
    
    // Focus target system
    this.initFocusTargetControls();
  }
  
  /**
   * Initialize collapsible HUD sections
   */
  private initHUDCollapsibleSections(): void {
    const collapsibleSections = [
      { headerId: 'positionSectionHeader', sectionClass: 'position' },
      { headerId: 'focusSectionHeader', sectionClass: 'focus' }
    ];
    
    collapsibleSections.forEach(({ headerId }) => {
      const header = document.getElementById(headerId);
      if (header) {
        header.addEventListener('click', () => {
          const section = header.closest('.hud-section-collapsible');
          if (section) {
            section.classList.toggle('collapsed');
          }
        });
      }
    });
  }
  
  // Joystick sensitivity modes - expanded with finer granularity
  private joystickSensitivityMode: 'ultra-fine' | 'fine' | 'normal' | 'rapid' = 'normal';
  private readonly joystickSensitivities = {
    'ultra-fine': Math.PI / 180,  // 1° per full deflection - maximum precision
    fine: Math.PI / 72,           // 2.5° per full deflection - precise
    normal: Math.PI / 18,         // 10° per full deflection - balanced (reduced from 15°)
    rapid: Math.PI / 4            // 45° per full deflection - fast positioning
  };
  
  // Mode-specific dead zones (adaptive precision)
  // Based on game development best practices: smaller dead zones for fine control
  private readonly joystickDeadZones = {
    'ultra-fine': 0.005, // 0.5% dead zone - maximum precision (professional fine-tuning)
    fine: 0.01,          // 1% dead zone - precise control
    normal: 0.02,        // 2% dead zone - balanced (reduced from 3%)
    rapid: 0.05          // 5% dead zone - original value (stable)
  };
  
  // Mode-specific response curves
  // Based on game dev research: different curves for different control needs
  private readonly joystickResponseCurves = {
    'ultra-fine': 0.8,   // Slight sub-linear for fine control (predictable, less sensitive to small movements)
    fine: 1.0,           // Linear - predictable and precise
    normal: 1.3,         // Gentle exponential - smooth general use
    rapid: 1.8           // Aggressive exponential - fast movements but more controllable than 2.0
  };
  
  // Mode-specific smoothing factors (how many samples to average)
  // More smoothing for fine modes to reduce jitter
  private readonly joystickSmoothingSizes = {
    'ultra-fine': 5,     // More samples for ultra-smooth fine control
    fine: 4,             // More samples for smooth precision
    normal: 3,           // Balanced smoothing
    rapid: 2             // Less smoothing for fast response
  };
  
  // Input smoothing for precision
  private joystickInputHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  
  /**
   * Initialize the rotation joystick control
   * Professional multi-mode joystick with adaptive response curve
   */
  private initJoystickControl(): void {
    const joystick = document.getElementById('rotationJoystick');
    const knob = document.getElementById('rotationKnob');
    if (!joystick || !knob) return;
    
    const joystickBg = joystick.querySelector('.joystick-bg') as HTMLElement;
    if (!joystickBg) return;
    
    const maxOffset = 40; // Maximum knob offset from center in pixels
    const maxTiltRange = Math.PI / 2 - 0.1; // ±~85° tilt range
    
    // Add sensitivity mode indicator and controls
    this.initJoystickSensitivityControls(joystick);
    
    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.hudLightId) return;
      const lightData = this.lights.get(this.hudLightId);
      if (!lightData || !(lightData.light instanceof BABYLON.SpotLight)) return;
      
      this.hudJoystickDragging = true;
      knob.style.transition = 'none';
      
      // Cache bounding rect for consistent calculations during drag
      this.hudJoystickCachedRect = joystickBg.getBoundingClientRect();
      this.hudJoystickDevicePixelRatio = window.devicePixelRatio || 1;
      
      // Clear input history for fresh smoothing
      this.joystickInputHistory = [];
      
      // Store the pointer position at drag start (to calculate delta, not absolute)
      const pos = this.getEventPosition(e);
      
      // Store actual event position for comparison in handleMove
      this.hudJoystickStartEventPos = { x: pos.x, y: pos.y };
      
      const rect = this.hudJoystickCachedRect;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate raw offset from center
      const rawOffsetX = (pos.x - centerX) / maxOffset;
      const rawOffsetY = (pos.y - centerY) / maxOffset;
      
      // Clamp to circular constraint (same as in handleMove for consistency)
      let clampedX = rawOffsetX;
      let clampedY = rawOffsetY;
      const magnitude = Math.sqrt(rawOffsetX * rawOffsetX + rawOffsetY * rawOffsetY);
      if (magnitude > 1) {
        clampedX /= magnitude;
        clampedY /= magnitude;
      }
      
      // Store the clamped start position (this is the "neutral" point for delta calculations)
      // If user clicks in center, this will be (0, 0)
      // If user clicks elsewhere, this will be the normalized position within the circle
      this.hudJoystickStartPointer = {
        x: clampedX,
        y: clampedY
      };
      
      // Update knob visual position immediately to match where user clicked
      // This ensures the knob follows the cursor from the start position
      const knobCenterX = 50 + clampedX * 30;
      const knobCenterY = 50 + clampedY * 30;
      knob.style.left = `${knobCenterX}%`;
      knob.style.top = `${knobCenterY}%`;
      
      // DON'T add initial sample to history here - let first handleMove do it
      // This ensures that first handleMove will have zero delta if mouse hasn't moved
      
      // Store the actual light direction when drag begins (not recalculated)
      // This is the reference direction for rotation calculations
      this.hudJoystickStartDir = lightData.light.direction.clone().normalize();
      
      // Also store angles for display (high precision)
      const dir = this.hudJoystickStartDir;
      this.hudJoystickStartTilt = Math.asin(Math.max(-1, Math.min(1, -dir.y)));
      this.hudJoystickStartPan = Math.atan2(dir.x, dir.z);
    };
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.hudJoystickDragging || !this.hudLightId) return;
      e.preventDefault();
      
      const lightData = this.lights.get(this.hudLightId);
      if (!lightData || !(lightData.light instanceof BABYLON.SpotLight)) return;
      
      // Use cached bounding rect (only recalculate if invalid or after resize)
      let rect = this.hudJoystickCachedRect;
      if (!rect) {
        rect = joystickBg.getBoundingClientRect();
        this.hudJoystickCachedRect = rect;
      }
      
      const pos = this.getEventPosition(e);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Sub-pixel precision with high-DPI support
      const rawOffsetX = (pos.x - centerX) / maxOffset;
      const rawOffsetY = (pos.y - centerY) / maxOffset;
      
      // Clamp raw input to circular constraint first (same as in handleStart)
      let clampedRawX = rawOffsetX;
      let clampedRawY = rawOffsetY;
      const rawMagnitude = Math.sqrt(rawOffsetX * rawOffsetX + rawOffsetY * rawOffsetY);
      if (rawMagnitude > 1) {
        clampedRawX /= rawMagnitude;
        clampedRawY /= rawMagnitude;
      }
      
      // Input smoothing - average last N samples for smoother control
      const now = performance.now();
      
      // Check if this is the first frame after drag start
      const isFirstFrame = this.joystickInputHistory.length === 0;
      
      // Declare smoothed values
      let smoothedX: number;
      let smoothedY: number;
      
      // On first frame, check if position has actually changed significantly
      // If not, use start position to prevent unwanted movement
      if (isFirstFrame && this.hudJoystickStartEventPos) {
        const deltaX = Math.abs(pos.x - this.hudJoystickStartEventPos.x);
        const deltaY = Math.abs(pos.y - this.hudJoystickStartEventPos.y);
        const movementThreshold = 3; // pixels - minimum movement to register
        
        // If position hasn't changed significantly, use start position and skip adding to history
        if (deltaX < movementThreshold && deltaY < movementThreshold) {
          smoothedX = this.hudJoystickStartPointer.x;
          smoothedY = this.hudJoystickStartPointer.y;
        } else {
          // Significant movement detected - add start position first, then current
          this.joystickInputHistory.push({
            x: this.hudJoystickStartPointer.x,
            y: this.hudJoystickStartPointer.y,
            timestamp: now - 1 // Slightly earlier timestamp
          });
          this.joystickInputHistory.push({ x: clampedRawX, y: clampedRawY, timestamp: now });
          this.hudJoystickStartEventPos = null; // Clear after first significant movement
          
          // Calculate smoothed input using EMA
          const smoothingSize = this.joystickSmoothingSizes[this.joystickSensitivityMode];
          const smoothingFactor = this.joystickSensitivityMode === 'ultra-fine' ? 0.3 : 
                                  this.joystickSensitivityMode === 'fine' ? 0.4 :
                                  this.joystickSensitivityMode === 'normal' ? 0.5 : 0.6;
          
          let emaX = this.joystickInputHistory[0].x;
          let emaY = this.joystickInputHistory[0].y;
          
          for (let i = 1; i < this.joystickInputHistory.length; i++) {
            emaX = emaX * (1 - smoothingFactor) + this.joystickInputHistory[i].x * smoothingFactor;
            emaY = emaY * (1 - smoothingFactor) + this.joystickInputHistory[i].y * smoothingFactor;
          }
          
          smoothedX = emaX;
          smoothedY = emaY;
        }
        } else {
          // Subsequent frames - normal smoothing
          this.joystickInputHistory.push({ x: clampedRawX, y: clampedRawY, timestamp: now });
          
          // Keep only recent samples (within last 50ms, or 30ms for rapid for faster response)
          const timeWindow = this.joystickSensitivityMode === 'rapid' ? 30 : 50;
          this.joystickInputHistory = this.joystickInputHistory.filter(
            sample => now - sample.timestamp < timeWindow
          );
          
          // Limit history size based on mode-specific smoothing
          const smoothingSize = this.joystickSmoothingSizes[this.joystickSensitivityMode];
          if (this.joystickInputHistory.length > smoothingSize) {
            this.joystickInputHistory.shift();
          }
          
          // Calculate smoothed input using exponential moving average (EMA) for better responsiveness
          // For fine modes: more aggressive smoothing to reduce jitter
          // For rapid: minimal smoothing for fastest, most direct response
          const smoothingFactor = this.joystickSensitivityMode === 'ultra-fine' ? 0.3 : 
                                  this.joystickSensitivityMode === 'fine' ? 0.4 :
                                  this.joystickSensitivityMode === 'normal' ? 0.5 : 0.7; // Increased from 0.6 for rapid
        
        if (this.joystickInputHistory.length === 1) {
          // Only one sample - use it directly
          smoothedX = this.joystickInputHistory[0].x;
          smoothedY = this.joystickInputHistory[0].y;
        } else {
          // Apply exponential moving average for smooth, responsive control
          let emaX = this.joystickInputHistory[0].x;
          let emaY = this.joystickInputHistory[0].y;
          
          for (let i = 1; i < this.joystickInputHistory.length; i++) {
            emaX = emaX * (1 - smoothingFactor) + this.joystickInputHistory[i].x * smoothingFactor;
            emaY = emaY * (1 - smoothingFactor) + this.joystickInputHistory[i].y * smoothingFactor;
          }
          
          smoothedX = emaX;
          smoothedY = emaY;
        }
      }
      
      // Calculate DELTA from start position (not absolute offset)
      // This ensures zero movement at drag start
      let offsetX = smoothedX - this.hudJoystickStartPointer.x;
      let offsetY = smoothedY - this.hudJoystickStartPointer.y;
      
      // Clamp to circular constraint (prevents square corners)
      // Apply circular clamping BEFORE dead zone for better diagonal handling
      const magnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (magnitude > 1) {
        offsetX /= magnitude;
        offsetY /= magnitude;
      }
      
      // Get mode-specific dead zone and response curve
      const deadZone = this.joystickDeadZones[this.joystickSensitivityMode];
      const responseCurve = this.joystickResponseCurves[this.joystickSensitivityMode];
      
      // === PROFESSIONAL AXIAL DEAD ZONE WITH RESPONSE CURVE ===
      // Based on game development best practices for joystick control
      // Process each axis independently for better pan/tilt control
      const applyAxisDeadzone = (value: number): number => {
        const absVal = Math.abs(value);
        
        // Step 1: Apply dead zone (circular dead zone already applied, now apply axial)
        if (absVal < deadZone) {
          return 0;
        }
        
        // Step 2: Scale from [deadzone, 1] to [0, 1]
        // This ensures full range utilization after dead zone
        const scaled = (absVal - deadZone) / (1 - deadZone);
        
        // Step 3: Apply smooth transition at dead zone boundary
        // Use a gentler transition for fine modes, steeper for rapid
        let transitionFactor: number;
        if (this.joystickSensitivityMode === 'ultra-fine' || this.joystickSensitivityMode === 'fine') {
          // For fine modes: very smooth transition to avoid jumps
          const transitionZone = deadZone * 2; // Wider transition zone for fine modes
          const transition = Math.min(1, (absVal - deadZone) / transitionZone);
          transitionFactor = transition * transition * (3 - 2 * transition); // Smoothstep
        } else if (this.joystickSensitivityMode === 'rapid') {
          // For rapid: minimal transition for snappiest response
          const transitionZone = deadZone * 0.3; // Very tight transition zone
          const transition = Math.min(1, (absVal - deadZone) / transitionZone);
          // Use linear transition for rapid (faster, less smoothing)
          transitionFactor = transition;
        } else {
          // For normal: balanced transition
          const transitionZone = deadZone * 0.5;
          const transition = Math.min(1, (absVal - deadZone) / transitionZone);
          transitionFactor = transition * transition * (3 - 2 * transition); // Smoothstep
        }
        
        // Step 4: Apply mode-specific response curve
        // For ultra-fine and fine: use sub-linear/linear for predictable control
        // For normal/rapid: use exponential for acceleration feel
        let curved: number;
        if (responseCurve === 1.0) {
          // Linear response - most predictable
          curved = scaled;
        } else if (responseCurve < 1.0) {
          // Sub-linear (for ultra-fine) - reduces sensitivity to small movements
          // This gives more control at low deflections
          curved = Math.pow(scaled, responseCurve);
        } else {
          // Exponential (for normal/rapid) - increases sensitivity at high deflections
          curved = Math.pow(scaled, responseCurve);
        }
        
        // Step 5: Apply transition smoothly
        // For fine modes: full transition weight for smoothness
        // For rapid: minimal transition weight for snappiest response
        let transitionWeight: number;
        if (this.joystickSensitivityMode === 'ultra-fine' || this.joystickSensitivityMode === 'fine') {
          transitionWeight = 0.9; // Full smoothness for fine modes
        } else if (this.joystickSensitivityMode === 'rapid') {
          transitionWeight = 0.4; // Minimal transition for rapid (snappier)
        } else {
          transitionWeight = 0.7; // Balanced for normal
        }
        const finalValue = curved * ((1 - transitionWeight) + transitionWeight * transitionFactor);
        
        return Math.sign(value) * Math.max(0, Math.min(1, finalValue)); // Clamp to [0, 1]
      };
      
      const curvedOffsetX = applyAxisDeadzone(offsetX);
      const curvedOffsetY = applyAxisDeadzone(offsetY);
      
      // Update knob visual position based on delta movement (30% of container size)
      const knobCenterX = 50 + offsetX * 30;
      const knobCenterY = 50 + offsetY * 30;
      knob.style.left = `${knobCenterX}%`;
      knob.style.top = `${knobCenterY}%`;
      
      // Get current sensitivity based on mode (high precision)
      const sensitivity = this.joystickSensitivities[this.joystickSensitivityMode];
      
      // Calculate delta rotation from joystick input (in radians, high precision)
      const deltaPan = curvedOffsetX * sensitivity;
      const deltaTilt = -curvedOffsetY * sensitivity; // Inverted Y
      
      // For very small rotations, use incremental quaternion multiplication for better precision
      // This reduces numerical errors that accumulate with large quaternion multiplications
      const startDir = this.hudJoystickStartDir;
      
      // Build rotation quaternions for yaw (pan around Y) and pitch (tilt around X)
      // For small angles, this is more stable than Euler angle conversion
      const yawQuat = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), deltaPan);
      const pitchQuat = BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Right(), deltaTilt);
      
      // Improved rotation order: For pan/tilt control, apply pitch (tilt) first in local space
      // then yaw (pan) to reduce gimbal lock issues. However, for intuitive control,
      // we want yaw-first behavior. Use a hybrid approach for better precision.
      // 
      // Instead of simple multiplication, use incremental rotation from current direction
      // This is more stable for small deltas and reduces precision loss
      const combinedQuat = yawQuat.multiply(pitchQuat);
      const newDir = startDir.clone();
      
      // Rotate direction vector using quaternion (more stable than angle conversion)
      newDir.rotateByQuaternionToRef(combinedQuat, newDir);
      
      // Ensure normalization after rotation (critical for precision)
      newDir.normalize();
      
      // Clamp vertical angle to avoid gimbal lock
      // Use high-precision clamping with consistent coordinate system
      const clampedY = Math.max(-1, Math.min(1, -newDir.y)); // Clamp before asin
      const currentTilt = Math.asin(clampedY);
      if (Math.abs(currentTilt) > maxTiltRange) {
        // Recalculate with clamped tilt (high precision)
        const clampedTilt = Math.sign(currentTilt) * maxTiltRange;
        const currentPan = Math.atan2(newDir.x, newDir.z);
        const cosTilt = Math.cos(clampedTilt);
        const sinTilt = Math.sin(clampedTilt);
        
        // Reconstruct direction vector with clamped tilt (avoiding angle precision loss)
        newDir.set(
          Math.sin(currentPan) * cosTilt,
          -sinTilt,
          Math.cos(currentPan) * cosTilt
        );
        
        // Normalize to ensure precision (should be ~1.0, but normalization ensures consistency)
        newDir.normalize();
      }
      
      // Apply to light (high precision direction vector)
      lightData.light.direction.copyFrom(newDir);
      
      // Update mesh rotation to match light direction
      this.alignMeshToDirection(lightData.mesh, newDir);
      
      // Calculate current pan/tilt for display (high precision)
      // Minimize conversions - only convert for display, keep radians internally
      const newPan = Math.atan2(newDir.x, newDir.z);
      const newTilt = Math.asin(Math.max(-1, Math.min(1, -newDir.y)));
      
      // Update beam visualization
      this.updateBeamVisualization(this.hudLightId);
      
      // Update HUD values display with pan/tilt angles
      this.updateHUDValues(lightData);
      this.updateJoystickAngleDisplay(newPan, newTilt);
    };
    
    const handleEnd = () => {
      if (!this.hudJoystickDragging) return;
      this.hudJoystickDragging = false;
      
      // Clear cached rect
      this.hudJoystickCachedRect = null;
      
      // Clear input history
      this.joystickInputHistory = [];
      
      // Clear start event position
      this.hudJoystickStartEventPos = null;
      
      // Animate knob back to center
      knob.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
      knob.style.left = '50%';
      knob.style.top = '50%';
      
      // Update start direction to current position for next drag (high precision)
      if (this.hudLightId) {
        const lightData = this.lights.get(this.hudLightId);
        if (lightData && lightData.light instanceof BABYLON.SpotLight) {
          // Store normalized direction vector (not angles) for precision
          this.hudJoystickStartDir = lightData.light.direction.clone().normalize();
          const dir = this.hudJoystickStartDir;
          // Only calculate angles for display purposes
          this.hudJoystickStartTilt = Math.asin(Math.max(-1, Math.min(1, -dir.y)));
          this.hudJoystickStartPan = Math.atan2(dir.x, dir.z);
        }
      }
    };
    
    // Mouse events
    knob.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    // Touch events
    knob.addEventListener('touchstart', handleStart as any, { passive: false });
    document.addEventListener('touchmove', handleMove as any, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    // Keyboard shortcut for sensitivity toggle (hold Shift for fine, Ctrl for rapid, Shift+Ctrl for ultra-fine)
    document.addEventListener('keydown', (e) => {
      if (!this.hudJoystickDragging) return;
      if (e.shiftKey && e.ctrlKey) {
        this.setJoystickSensitivity('ultra-fine');
      } else if (e.shiftKey) {
        this.setJoystickSensitivity('fine');
      } else if (e.ctrlKey) {
        this.setJoystickSensitivity('rapid');
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (!e.shiftKey && !e.ctrlKey) {
        this.setJoystickSensitivity('normal');
      }
    });
  }
  
  /**
   * Initialize joystick sensitivity controls from static HTML
   */
  private initJoystickSensitivityControls(joystickContainer: HTMLElement): void {
    // Find the static sensitivity buttons in the HTML
    const sensitivityContainer = document.querySelector('.sensitivity-modes-static');
    if (!sensitivityContainer) return;
    
    // Sensitivity mode buttons (supports all modes including ultra-fine)
    sensitivityContainer.querySelectorAll('.sensitivity-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).dataset.mode as 'ultra-fine' | 'fine' | 'normal' | 'rapid';
        if (mode && this.joystickSensitivities[mode] !== undefined) {
          this.setJoystickSensitivity(mode);
          sensitivityContainer.querySelectorAll('.sensitivity-btn').forEach(b => b.classList.remove('active'));
          (e.target as HTMLElement).classList.add('active');
        }
      });
    });
  }
  
  /**
   * Set joystick sensitivity mode
   */
  private setJoystickSensitivity(mode: 'ultra-fine' | 'fine' | 'normal' | 'rapid'): void {
    this.joystickSensitivityMode = mode;
    
    // Update UI indicator
    const modeLabels = { 
      'ultra-fine': 'ULTRA-FIN', 
      fine: 'FIN', 
      normal: 'NORMAL', 
      rapid: 'RASK' 
    };
    const indicator = document.querySelector('.sensitivity-modes');
    if (indicator) {
      indicator.querySelectorAll('.sensitivity-btn').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode);
      });
    }
    
    // Also update static sensitivity controls
    const staticContainer = document.querySelector('.sensitivity-modes-static');
    if (staticContainer) {
      staticContainer.querySelectorAll('.sensitivity-btn').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode);
      });
    }
  }
  
  /**
   * Micro-jog light rotation by precise degrees
   */
  private microJogLight(axis: 'pan' | 'tilt', degrees: number): void {
    if (!this.hudLightId) return;
    const lightData = this.lights.get(this.hudLightId);
    if (!lightData || !(lightData.light instanceof BABYLON.SpotLight)) return;
    
    const radians = degrees * (Math.PI / 180);
    const dir = lightData.light.direction;
    
    // Get current angles
    let tilt = Math.asin(Math.max(-1, Math.min(1, -dir.y)));
    let pan = Math.atan2(dir.x, dir.z);
    
    // Apply micro-adjustment
    if (axis === 'pan') {
      pan += radians;
    } else {
      tilt += radians;
      tilt = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, tilt));
    }
    
    // Calculate new direction
    const cosTilt = Math.cos(tilt);
    const newDir = new BABYLON.Vector3(
      Math.sin(pan) * cosTilt,
      -Math.sin(tilt),
      Math.cos(pan) * cosTilt
    ).normalize();
    
    lightData.light.direction = newDir;
    
    // Update mesh rotation
    if (lightData.mesh.rotationQuaternion) {
      const forward = newDir.clone();
      const up = BABYLON.Vector3.Up();
      const right = BABYLON.Vector3.Cross(up, forward).normalize();
      const correctedUp = BABYLON.Vector3.Cross(forward, right).normalize();
      
      const rotMatrix = BABYLON.Matrix.Identity();
      rotMatrix.setRowFromFloats(0, right.x, right.y, right.z, 0);
      rotMatrix.setRowFromFloats(1, correctedUp.x, correctedUp.y, correctedUp.z, 0);
      rotMatrix.setRowFromFloats(2, forward.x, forward.y, forward.z, 0);
      
      lightData.mesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
    }
    
    this.updateBeamVisualization(this.hudLightId);
    this.updateHUDValues(lightData);
    this.updateJoystickAngleDisplay(pan, tilt);
    
    // Update start angles for next joystick drag
    this.hudJoystickStartPan = pan;
    this.hudJoystickStartTilt = tilt;
  }
  
  /**
   * Align mesh rotation to target direction, accounting for model's rest-pose forward axis
   * This is the professional solution: lookAt quaternion * restCorrection
   */
  private alignMeshToDirection(mesh: BABYLON.AbstractMesh, targetDirection: BABYLON.Vector3): void {
    if (!mesh.rotationQuaternion) {
      mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    }
    
    // Get the model's local forward axis (stored during import)
    // Beauty dish models have aperture along -Z in rest pose
    const localForward = ((mesh as any)._localForwardAxis as BABYLON.Vector3) || new BABYLON.Vector3(0, 0, -1);
    
    // Calculate the look-at quaternion (world-space rotation to face target direction)
    const forward = targetDirection.normalize();
    const up = BABYLON.Vector3.Up();
    
    // Handle edge case when forward is parallel to up
    let right: BABYLON.Vector3;
    if (Math.abs(BABYLON.Vector3.Dot(forward, up)) > 0.999) {
      right = BABYLON.Vector3.Right();
    } else {
      right = BABYLON.Vector3.Cross(up, forward).normalize();
    }
    const correctedUp = BABYLON.Vector3.Cross(forward, right).normalize();
    
    // Build world rotation matrix for target direction (Babylon uses +Z as forward)
    const worldRotMatrix = BABYLON.Matrix.Identity();
    worldRotMatrix.setRowFromFloats(0, right.x, right.y, right.z, 0);
    worldRotMatrix.setRowFromFloats(1, correctedUp.x, correctedUp.y, correctedUp.z, 0);
    worldRotMatrix.setRowFromFloats(2, forward.x, forward.y, forward.z, 0);
    const lookAtQuat = BABYLON.Quaternion.FromRotationMatrix(worldRotMatrix);
    
    // Calculate rest correction: rotation needed to align local forward to Babylon's +Z
    // This compensates for the model's baked orientation
    const babylonForward = new BABYLON.Vector3(0, 0, 1);
    const restCorrection = this.quaternionFromUnitVectors(localForward, babylonForward);
    
    // Final rotation = lookAt * restCorrection
    // This makes the model's aperture (-Z) point toward targetDirection
    mesh.rotationQuaternion = lookAtQuat.multiply(restCorrection);
  }
  
  /**
   * Calculate quaternion that rotates vector 'from' to vector 'to'
   * Based on "Quaternion Calculus and Fast Animation" by Ken Shoemake
   */
  private quaternionFromUnitVectors(from: BABYLON.Vector3, to: BABYLON.Vector3): BABYLON.Quaternion {
    const dot = BABYLON.Vector3.Dot(from, to);
    
    // Handle parallel vectors
    if (dot > 0.9999) {
      return BABYLON.Quaternion.Identity();
    }
    
    // Handle anti-parallel vectors
    if (dot < -0.9999) {
      // Find orthogonal axis
      let axis = BABYLON.Vector3.Cross(BABYLON.Vector3.Right(), from);
      if (axis.length() < 0.001) {
        axis = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), from);
      }
      axis.normalize();
      return BABYLON.Quaternion.RotationAxis(axis, Math.PI);
    }
    
    // General case
    const cross = BABYLON.Vector3.Cross(from, to);
    const w = Math.sqrt(from.lengthSquared() * to.lengthSquared()) + dot;
    
    return new BABYLON.Quaternion(cross.x, cross.y, cross.z, w).normalize();
  }

  /**
   * Update pan/tilt angle display in HUD with sub-degree precision
   */
  private updateJoystickAngleDisplay(pan: number, tilt: number): void {
    // Update the existing HUD elements
    const panEl = document.getElementById('hudPanValue');
    const tiltEl = document.getElementById('hudTiltValue');
    
    // Convert radians to degrees (high precision)
    const panDeg = pan * 180 / Math.PI;
    const tiltDeg = tilt * 180 / Math.PI;
    
    // Use sub-degree precision for fine/ultra-fine modes
    // Show 1 decimal place for fine modes, 0 decimal places for normal/rapid
    let panDisplay: string;
    let tiltDisplay: string;
    
    if (this.joystickSensitivityMode === 'ultra-fine' || this.joystickSensitivityMode === 'fine') {
      // Sub-degree precision for fine modes
      panDisplay = panDeg.toFixed(1);
      tiltDisplay = tiltDeg.toFixed(1);
    } else {
      // Whole degrees for normal/rapid modes
      panDisplay = Math.round(panDeg).toString();
      tiltDisplay = Math.round(tiltDeg).toString();
    }
    
    if (panEl) panEl.textContent = `${panDisplay}°`;
    if (tiltEl) tiltEl.textContent = `${tiltDisplay}°`;
  }
  
  /**
   * Update angle display when light is selected (initial values)
   */
  private updateAngleDisplayFromLight(lightData: any): void {
    if (lightData.light instanceof BABYLON.SpotLight) {
      const dir = lightData.light.direction;
      const tilt = Math.asin(Math.max(-1, Math.min(1, -dir.y)));
      const pan = Math.atan2(dir.x, dir.z);
      this.updateJoystickAngleDisplay(pan, tilt);
    }
  }
  
  /**
   * Initialize height slider control
   */
  private initHeightSliderControl(): void {
    const track = document.getElementById('heightSliderTrack');
    const thumb = document.getElementById('heightSliderThumb');
    if (!track || !thumb) return;
    
    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.hudHeightDragging = true;
      thumb.style.transition = 'none';
    };
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.hudHeightDragging || !this.hudLightId) return;
      e.preventDefault();
      
      const lightData = this.lights.get(this.hudLightId);
      if (!lightData) return;
      
      const rect = track.getBoundingClientRect();
      const pos = this.getEventPosition(e);
      
      // Calculate percentage (0-100)
      let percent = ((pos.x - rect.left) / rect.width) * 100;
      percent = Math.max(0, Math.min(100, percent));
      
      // Convert to height (0.5m - 6m)
      const newHeight = 0.5 + (percent / 100) * (6 - 0.5);
      
      // Update light position
      lightData.mesh.position.y = newHeight;
      if (lightData.light instanceof BABYLON.SpotLight || lightData.light instanceof BABYLON.PointLight) {
        lightData.light.position.y = newHeight;
      }
      
      // Update studio gizmos
      if (this.studioGizmoMeshes.heightSlider) {
        this.studioGizmoMeshes.heightSlider.position.y = newHeight;
      }
      if (this.studioGizmoMeshes.yokeRing) {
        this.studioGizmoMeshes.yokeRing.position.y = newHeight;
      }
      
      // Update HUD
      this.updateHUDValues(lightData);
    };
    
    const handleEnd = () => {
      this.hudHeightDragging = false;
      const thumb = document.getElementById('heightSliderThumb');
      if (thumb) thumb.style.transition = 'box-shadow 0.2s, transform 0.1s';
    };
    
    // Mouse events
    thumb.addEventListener('mousedown', handleStart);
    track.addEventListener('mousedown', (e) => {
      handleStart(e);
      handleMove(e);
    });
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    // Touch events
    thumb.addEventListener('touchstart', handleStart as any);
    document.addEventListener('touchmove', handleMove as any);
    document.addEventListener('touchend', handleEnd);
  }
  
  /**
   * Initialize D-Pad position controls
   */
  private initDPadControls(): void {
    const dpad = document.getElementById('positionDpad');
    if (!dpad) return;
    
    const moveStep = 0.25; // 25cm per press
    
    const moveLight = (direction: string) => {
      if (!this.hudLightId) return;
      
      const lightData = this.lights.get(this.hudLightId);
      if (!lightData) return;
      
      const pos = lightData.mesh.position;
      
      switch (direction) {
        case 'up':
          pos.z -= moveStep;
          break;
        case 'down':
          pos.z += moveStep;
          break;
        case 'left':
          pos.x -= moveStep;
          break;
        case 'right':
          pos.x += moveStep;
          break;
      }
      
      // Sync light position
      if (lightData.light instanceof BABYLON.SpotLight || lightData.light instanceof BABYLON.PointLight) {
        lightData.light.position.x = pos.x;
        lightData.light.position.z = pos.z;
      }
      
      // Update studio gizmos
      if (this.studioGizmoMeshes.baseRing) {
        this.studioGizmoMeshes.baseRing.position.x = pos.x;
        this.studioGizmoMeshes.baseRing.position.z = pos.z;
      }
      if (this.studioGizmoMeshes.heightSlider) {
        this.studioGizmoMeshes.heightSlider.position.x = pos.x;
        this.studioGizmoMeshes.heightSlider.position.z = pos.z;
      }
      if (this.studioGizmoMeshes.yokeRing) {
        this.studioGizmoMeshes.yokeRing.position.x = pos.x;
        this.studioGizmoMeshes.yokeRing.position.z = pos.z;
      }
      
      // Update HUD
      this.updateHUDValues(lightData);
    };
    
    // Add click listeners to D-pad buttons
    const buttons = dpad.querySelectorAll('.dpad-btn[data-dir]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-dir');
        if (dir) moveLight(dir);
      });
    });
    
    // Center button resets position
    const centerBtn = dpad.querySelector('.dpad-center');
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        if (!this.hudLightId) return;
        const lightData = this.lights.get(this.hudLightId);
        if (!lightData) return;
        
        lightData.mesh.position.x = 0;
        lightData.mesh.position.z = 2;
        
        if (lightData.light instanceof BABYLON.SpotLight || lightData.light instanceof BABYLON.PointLight) {
          lightData.light.position.x = 0;
          lightData.light.position.z = 2;
        }
        
        // Update gizmos
        this.createStudioGizmos(this.hudLightId);
        this.updateHUDValues(lightData);
      });
    }
  }
  
  /**
   * Initialize HUD action buttons
   */
  private initHUDActionButtons(): void {
    // Reset button - rotates light to point at focus target (keeps current position)
    const resetBtn = document.getElementById('hudResetLight');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!this.hudLightId) return;
        const lightData = this.lights.get(this.hudLightId);
        if (!lightData) return;
        
        // Get focus target position
        let targetPos = new BABYLON.Vector3(0, 1.0, 0); // Default target
        if (this.focusTargetMesh && this.focusTargetMesh.isEnabled()) {
          targetPos = this.calculateFocusPoint(this.focusTargetMesh, this.focusMode);
        }
        
        // Keep current position - only reset rotation to point at target
        // Get current light head position
        let lightHeadPos: BABYLON.Vector3;
        if (lightData.light instanceof BABYLON.SpotLight || lightData.light instanceof BABYLON.PointLight) {
          lightHeadPos = lightData.light.position.clone();
        } else {
          lightHeadPos = lightData.mesh.position.clone();
          lightHeadPos.y += 2.0; // Estimate light head height
        }
        
        // Calculate direction from current light position to target
        const direction = targetPos.subtract(lightHeadPos).normalize();
        
        // Apply direction to light
        if (lightData.light instanceof BABYLON.SpotLight) {
          lightData.light.direction = direction;
        }
        
        // Apply rotation to mesh using professional alignment (keeps position unchanged)
        this.alignMeshToDirection(lightData.mesh, direction);
        
        // Update visuals
        this.updateBeamVisualization(this.hudLightId);
        this.updateHUDValues(lightData);
        
        console.log(`Reset light rotation: pointing at ${targetPos.toString()}`);
      });
    }
    
    // Point at focus button - uses the Focus Target system
    const pointBtn = document.getElementById('hudPointAtFocus');
    if (pointBtn) {
      pointBtn.addEventListener('click', () => {
        this.pointLightAtFocusTarget();
      });
    }
  }
  
  /**
   * Initialize Focus Target controls
   */
  private initFocusTargetControls(): void {
    // Focus mode toggle buttons
    const modeToggle = document.getElementById('focusModeToggle');
    if (modeToggle) {
      const buttons = modeToggle.querySelectorAll('.focus-mode-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode') as 'human' | 'product';
          if (mode) {
            this.setFocusMode(mode);
            // Update button states
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        });
      });
    }
    
    // Initial population of focus objects
    this.updateFocusObjectsList();
  }
  
  /**
   * Set the focus mode (human or product)
   */
  private setFocusMode(mode: 'human' | 'product'): void {
    this.focusMode = mode;
    // Recalculate focus point for current target
    if (this.focusTargetMesh) {
      this.focusAnchor = this.calculateFocusPoint(this.focusTargetMesh, mode);
    }
    this.updateFocusObjectsList();
  }
  
  /**
   * Calculate the best focus point for a mesh based on mode
   * Handles parent meshes with children by computing combined bounds
   */
  private calculateFocusPoint(mesh: BABYLON.Mesh, mode: 'human' | 'product'): BABYLON.Vector3 {
    // Get combined bounding info including children
    const bounds = this.getCombinedBounds(mesh);
    
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const centerY = (bounds.min.y + bounds.max.y) / 2;
    const centerZ = (bounds.min.z + bounds.max.z) / 2;
    const height = bounds.max.y - bounds.min.y;
    
    if (mode === 'human') {
      // For humans: target upper third (face/chest area)
      // Move up 30% from center toward top
      return new BABYLON.Vector3(
        centerX,
        centerY + height * 0.3,
        centerZ
      );
    } else {
      // For products: target bounding box center
      return new BABYLON.Vector3(centerX, centerY, centerZ);
    }
  }
  
  /**
   * Get combined world-space bounds for a mesh including all children
   */
  private getCombinedBounds(mesh: BABYLON.Mesh): { min: BABYLON.Vector3; max: BABYLON.Vector3 } {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    const processNode = (node: BABYLON.AbstractMesh) => {
      if (node.getBoundingInfo) {
        const bounds = node.getBoundingInfo().boundingBox;
        const min = bounds.minimumWorld;
        const max = bounds.maximumWorld;
        
        // Only include valid bounds
        if (isFinite(min.x) && isFinite(max.x)) {
          minX = Math.min(minX, min.x);
          minY = Math.min(minY, min.y);
          minZ = Math.min(minZ, min.z);
          maxX = Math.max(maxX, max.x);
          maxY = Math.max(maxY, max.y);
          maxZ = Math.max(maxZ, max.z);
        }
      }
    };
    
    // Process this mesh
    processNode(mesh);
    
    // Process all descendants
    mesh.getDescendants(false).forEach(child => {
      if (child instanceof BABYLON.AbstractMesh) {
        processNode(child);
      }
    });
    
    // Fallback if no valid bounds found
    if (!isFinite(minX)) {
      const pos = mesh.position;
      return {
        min: new BABYLON.Vector3(pos.x - 0.5, pos.y, pos.z - 0.5),
        max: new BABYLON.Vector3(pos.x + 0.5, pos.y + 1.7, pos.z + 0.5)
      };
    }
    
    return {
      min: new BABYLON.Vector3(minX, minY, minZ),
      max: new BABYLON.Vector3(maxX, maxY, maxZ)
    };
  }
  
  /**
   * Set a specific object as the focus target
   */
  private setFocusTarget(targetId: string, mesh: BABYLON.Mesh, name: string): void {
    this.focusTargetId = targetId;
    this.focusTargetMesh = mesh;
    this.focusAnchor = this.calculateFocusPoint(mesh, this.focusMode);
    
    // Update UI
    const nameEl = document.getElementById('focusTargetName');
    if (nameEl) nameEl.textContent = name;
    
    // Update list selection
    this.updateFocusObjectsList();
  }
  
  /**
   * Update the list of focusable objects in the HUD
   */
  private updateFocusObjectsList(): void {
    const listEl = document.getElementById('focusObjectsList');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    interface FocusableObject {
      id: string;
      name: string;
      mesh: BABYLON.Mesh;
      type: 'human' | 'product';
      distance: number;
    }
    
    const objects: FocusableObject[] = [];
    const lightPos = this.hudLightId ? this.lights.get(this.hudLightId)?.mesh.position : this.camera.position;
    
    // Add casting candidates
    this.castingCandidates.forEach((candidate, id) => {
      if (candidate.mesh && candidate.mesh.isEnabled()) {
        // Use combined bounds for parent meshes with children
        const bounds = this.getCombinedBounds(candidate.mesh);
        const centerX = (bounds.min.x + bounds.max.x) / 2;
        const centerY = (bounds.min.y + bounds.max.y) / 2;
        const centerZ = (bounds.min.z + bounds.max.z) / 2;
        const center = new BABYLON.Vector3(centerX, centerY, centerZ);
        const distance = lightPos ? BABYLON.Vector3.Distance(lightPos, center) : 0;
        
        // Detect type based on bounding box proportions
        const height = bounds.max.y - bounds.min.y;
        const width = Math.max(
          bounds.max.x - bounds.min.x,
          bounds.max.z - bounds.min.z
        );
        const isHuman = height > width * 1.5 && height > 0.8; // Tall and upright = human
        
        objects.push({
          id,
          name: candidate.name,
          mesh: candidate.mesh,
          type: isHuman ? 'human' : 'product',
          distance
        });
      }
    });
    
    // Add scene props
    const store = (window as any).virtualStudioStore?.getState?.();
    if (store?.scene) {
      store.scene.forEach((node: any) => {
        if ((node.type === 'prop' || node.type === 'model') && node.visible) {
          // Try to find corresponding mesh
          const mesh = this.scene.getMeshByName(node.id) as BABYLON.Mesh;
          if (mesh) {
            const center = mesh.getBoundingInfo().boundingSphere.centerWorld;
            const distance = lightPos ? BABYLON.Vector3.Distance(lightPos, center) : 0;
            
            objects.push({
              id: node.id,
              name: node.name || 'Prop',
              mesh: mesh,
              type: 'product',
              distance
            });
          }
        }
      });
    }
    
    // Filter by current mode if desired (optional - show all but highlight matching)
    // Sort by distance
    objects.sort((a, b) => a.distance - b.distance);
    
    // Limit to 5 closest objects
    const displayObjects = objects.slice(0, 5);
    
    if (displayObjects.length === 0) {
      listEl.innerHTML = '<div class="focus-object-item" style="color: rgba(255,255,255,0.4); justify-content: center;">Ingen objekter i scenen</div>';
      return;
    }
    
    displayObjects.forEach(obj => {
      const item = document.createElement('div');
      item.className = `focus-object-item ${obj.id === this.focusTargetId ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="focus-object-icon ${obj.type}">${obj.type === 'human' ? '👤' : '📦'}</div>
        <span class="focus-object-name">${obj.name}</span>
        <span class="focus-object-distance">${obj.distance.toFixed(1)}m</span>
      `;
      item.addEventListener('click', () => {
        this.setFocusTarget(obj.id, obj.mesh, obj.name);
      });
      listEl.appendChild(item);
    });
    
    // Auto-select first if none selected
    if (!this.focusTargetId && displayObjects.length > 0) {
      const first = displayObjects[0];
      this.setFocusTarget(first.id, first.mesh, first.name);
    }
  }
  
  /**
   * Point the selected light at the current focus target
   */
  private pointLightAtFocusTarget(): void {
    if (!this.hudLightId) return;
    const lightData = this.lights.get(this.hudLightId);
    if (!lightData) return;
    
    // Update focus objects list first
    this.updateFocusObjectsList();
    
    // Get target position
    let targetPos: BABYLON.Vector3;
    
    if (this.focusTargetMesh && this.focusTargetMesh.isEnabled()) {
      // Use calculated focus anchor based on mode
      targetPos = this.calculateFocusPoint(this.focusTargetMesh, this.focusMode);
    } else {
      // Fallback to center stage
      targetPos = this.focusMode === 'human' 
        ? new BABYLON.Vector3(0, 1.6, 0)  // Face height for humans
        : new BABYLON.Vector3(0, 1.0, 0); // Table height for products
    }
    
    const lightPos = lightData.mesh.position;
    
    // Calculate direction from light to target
    const direction = targetPos.subtract(lightPos);
    
    // Ensure we have a valid direction
    if (direction.length() < 0.01) {
      direction.set(0, -1, 0);
    } else {
      direction.normalize();
    }
    
    // Apply direction to spotlight
    if (lightData.light instanceof BABYLON.SpotLight) {
      lightData.light.direction = direction.clone();
    }
    
    // Update mesh rotation
    this.setMeshRotationFromDirection(lightData.mesh, direction);
    
    // Update visuals
    this.updateBeamVisualization(this.hudLightId);
    this.updateHUDValues(lightData);
    
    console.log(`Light pointed at focus target: mode=${this.focusMode}, target=${targetPos.toString()}`);
  }
  
  /**
   * Set mesh rotation to point light head at target position
   * Uses lookAt calculation with model orientation correction
   */
  private setMeshRotationFromDirection(mesh: BABYLON.Mesh, direction: BABYLON.Vector3): void {
    const dir = direction.normalize();
    
    // Get the light type from the mesh name to look up cached orientation
    const meshName = mesh.name.toLowerCase();
    let modelForward = new BABYLON.Vector3(0, 0, -1); // Default: -Z forward
    
    // Check if we have cached orientation data for this model type
    for (const [type, cacheData] of this.lightModelCache.entries()) {
      if (meshName.includes(type.toLowerCase()) || cacheData.masterMesh.name === mesh.name) {
        modelForward = cacheData.localForwardAxis.clone();
        break;
      }
    }
    
    // Create target position relative to mesh position
    // We want the light head to point at a position along the direction vector
    const targetPoint = mesh.position.add(dir.scale(10));
    
    // Use Babylon's lookAt functionality
    // First, reset rotation
    mesh.rotationQuaternion = null;
    mesh.rotation = BABYLON.Vector3.Zero();
    
    // The beauty dish model has light head pointing in +Z direction (not -Z)
    // So we need to invert the direction for FromLookDirectionLH
    const invertedDir = dir.negate();
    
    let up = BABYLON.Vector3.Up();
    
    // Handle near-vertical directions
    const dotUp = Math.abs(BABYLON.Vector3.Dot(invertedDir, up));
    if (dotUp > 0.99) {
      up = new BABYLON.Vector3(0, 0, invertedDir.y > 0 ? -1 : 1);
    }
    
    // Create quaternion that makes the mesh look in the opposite direction
    // This effectively makes the light head point toward the target
    mesh.rotationQuaternion = BABYLON.Quaternion.FromLookDirectionLH(invertedDir, up);
  }
  
  /**
   * Get event position for both mouse and touch events
   */
  private getEventPosition(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }
  
  // ===== LIGHT POV (POINT OF VIEW) MODE =====
  
  /**
   * Activate POV mode - view scene from light's perspective
   * Uses drag counting to handle overlapping drags safely
   */
  private activateLightPOV(lightId: string): void {
    const lightData = this.lights.get(lightId);
    if (!lightData) return;
    
    // If already in POV mode for same light, just increment drag count
    if (this.lightPOVActive && this.lightPOVLightId === lightId) {
      this.lightPOVDragCount++;
      return;
    }
    
    // If already active for a different light, restore first then activate new
    if (this.lightPOVActive && this.lightPOVLightId !== lightId) {
      // Force restore previous camera state
      this.lightPOVDragCount = 0;
      this.forceDeactivateLightPOV();
    }
    
    // First activation - set drag count to 1
    this.lightPOVDragCount = 1;
    
    // Save current camera state only on first activation
    if (!this.savedCameraState) {
      this.savedCameraState = {
        alpha: this.camera.alpha,
        beta: this.camera.beta,
        radius: this.camera.radius,
        target: this.camera.target.clone()
      };
    }
    
    this.lightPOVLightId = lightId;
    
    // Smoothly transition to light's POV (use mesh position for consistency)
    const lightPos = lightData.mesh.position.clone();
    let lightDir: BABYLON.Vector3;
    
    if (lightData.light instanceof BABYLON.SpotLight) {
      lightDir = lightData.light.direction.clone();
    } else {
      lightDir = new BABYLON.Vector3(0, -1, 0); // Default down
    }
    
    // Calculate camera position slightly behind the light
    const povOffset = lightDir.scale(-0.5);
    const povPos = lightPos.add(povOffset);
    const povTarget = lightPos.add(lightDir.scale(5));
    
    // Stop any existing animations before starting new ones
    this.scene.stopAnimation(this.camera);
    
    // Animate camera to POV position
    BABYLON.Animation.CreateAndStartAnimation(
      'povAlpha',
      this.camera,
      'alpha',
      30,
      15,
      this.camera.alpha,
      Math.atan2(povPos.x - povTarget.x, povPos.z - povTarget.z) + Math.PI,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    BABYLON.Animation.CreateAndStartAnimation(
      'povBeta',
      this.camera,
      'beta',
      30,
      15,
      this.camera.beta,
      Math.acos((povPos.y - povTarget.y) / povPos.subtract(povTarget).length()),
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    BABYLON.Animation.CreateAndStartAnimation(
      'povRadius',
      this.camera,
      'radius',
      30,
      15,
      this.camera.radius,
      3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    BABYLON.Animation.CreateAndStartAnimation(
      'povTarget',
      this.camera,
      'target',
      30,
      15,
      this.camera.target,
      povTarget,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    this.lightPOVActive = true;
    
    // Show POV indicator in UI
    window.dispatchEvent(new CustomEvent('vs-pov-mode-changed', { 
      detail: { active: true, lightId } 
    }));
  }
  
  /**
   * Update POV camera position when light moves
   */
  private updateLightPOVCamera(lightId: string): void {
    if (!this.lightPOVActive) return;
    
    const lightData = this.lights.get(lightId);
    if (!lightData) return;
    
    // Use mesh position for consistency
    const lightPos = lightData.mesh.position.clone();
    let lightDir: BABYLON.Vector3;
    
    if (lightData.light instanceof BABYLON.SpotLight) {
      lightDir = lightData.light.direction.clone();
    } else {
      lightDir = new BABYLON.Vector3(0, -1, 0);
    }
    
    const povTarget = lightPos.add(lightDir.scale(5));
    this.camera.target = povTarget;
  }
  
  /**
   * Deactivate POV mode - return to saved camera position
   * Only restores when all concurrent drags have finished
   */
  private deactivateLightPOV(): void {
    // Decrement drag count
    this.lightPOVDragCount = Math.max(0, this.lightPOVDragCount - 1);
    
    // Only restore camera if all drags are complete
    if (this.lightPOVDragCount > 0) {
      return; // Still have active drags
    }
    
    if (!this.lightPOVActive || !this.savedCameraState) {
      // Clear state even if no animation needed
      this.lightPOVLightId = null;
      return;
    }
    
    // Stop any existing animations before starting new ones
    this.scene.stopAnimation(this.camera);
    
    // Animate back to saved camera position
    BABYLON.Animation.CreateAndStartAnimation(
      'povAlphaBack',
      this.camera,
      'alpha',
      30,
      20,
      this.camera.alpha,
      this.savedCameraState.alpha,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    BABYLON.Animation.CreateAndStartAnimation(
      'povBetaBack',
      this.camera,
      'beta',
      30,
      20,
      this.camera.beta,
      this.savedCameraState.beta,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    BABYLON.Animation.CreateAndStartAnimation(
      'povRadiusBack',
      this.camera,
      'radius',
      30,
      20,
      this.camera.radius,
      this.savedCameraState.radius,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    BABYLON.Animation.CreateAndStartAnimation(
      'povTargetBack',
      this.camera,
      'target',
      30,
      20,
      this.camera.target,
      this.savedCameraState.target,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    this.lightPOVActive = false;
    this.lightPOVLightId = null;
    this.savedCameraState = null;
    
    window.dispatchEvent(new CustomEvent('vs-pov-mode-changed', { 
      detail: { active: false } 
    }));
  }
  
  /**
   * Force deactivate POV mode immediately (used when switching lights)
   */
  private forceDeactivateLightPOV(): void {
    if (!this.savedCameraState) {
      this.lightPOVActive = false;
      this.lightPOVLightId = null;
      return;
    }
    
    // Stop any existing animations
    this.scene.stopAnimation(this.camera);
    
    // Instantly restore camera (no animation)
    this.camera.alpha = this.savedCameraState.alpha;
    this.camera.beta = this.savedCameraState.beta;
    this.camera.radius = this.savedCameraState.radius;
    this.camera.target = this.savedCameraState.target.clone();
    
    this.lightPOVActive = false;
    this.lightPOVLightId = null;
    this.savedCameraState = null;
    
    window.dispatchEvent(new CustomEvent('vs-pov-mode-changed', { 
      detail: { active: false } 
    }));
  }
  
  /**
   * Toggle studio gizmo mode (vs standard Babylon gizmos)
   */
  public toggleStudioGizmoMode(enabled: boolean): void {
    if (enabled && this.selectedLightId) {
      // Hide standard gizmos
      if (this.gizmoManager) {
        this.gizmoManager.attachToMesh(null);
      }
      // Show studio gizmos
      this.createStudioGizmos(this.selectedLightId);
    } else {
      // Hide studio gizmos
      this.disposeStudioGizmos();
      // Show standard gizmos if light is selected
      if (this.selectedLightId && this.gizmoManager) {
        const lightData = this.lights.get(this.selectedLightId);
        if (lightData) {
          this.gizmoManager.attachToMesh(lightData.mesh);
        }
      }
    }
  }

  private setupStudio(): void {
    // Create ambient hemispheric light and store reference for control
    this.ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    this.ambientLight.intensity = this.ambientLightBaseIntensity;
    this.ambientLight.groundColor = new BABYLON.Color3(0.15, 0.15, 0.18);

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
    gridMat.zOffset = -1; // Prevent z-fighting with ground
    this.gridMesh.material = gridMat;
    this.gridMesh.position.y = 0.01;

    const wallMat = new BABYLON.StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
    wallMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    wallMat.backFaceCulling = false;

    // Front wall (facing camera)
    const backWall = BABYLON.MeshBuilder.CreatePlane('backWall', { width: 20, height: 8, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene);
    backWall.position.set(0, 4, -10);
    backWall.material = wallMat;
    backWall.isVisible = false; // Hidden by default

    // Left wall
    const leftWall = BABYLON.MeshBuilder.CreatePlane('leftWall', { width: 20, height: 8, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene);
    leftWall.position.set(-10, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat.clone('leftWallMat');

    // Right wall
    const rightWall = BABYLON.MeshBuilder.CreatePlane('rightWall', { width: 20, height: 8, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene);
    rightWall.position.set(10, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat.clone('rightWallMat');

    // Rear wall (behind camera)
    const rearWall = BABYLON.MeshBuilder.CreatePlane('rearWall', { width: 20, height: 8, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene);
    rearWall.position.set(0, 4, 10);
    rearWall.rotation.y = Math.PI;
    rearWall.material = wallMat.clone('rearWallMat');

    // Add CreatorHub Virtual Studio logo on backside of walls
    this.addWallLogos();

    // Default 3-point lighting setup with Aputure 300D lights
    this.setupDefaultLighting();
  }
  
  // Helper: Aim light and mesh at a target position
  private aimLightAt(lightId: string, target: BABYLON.Vector3): void {
    const lightData = this.lights.get(lightId);
    if (!lightData) {
      console.warn(`[aimLightAt] No light data found for ${lightId}`);
      return;
    }
    
    const mesh = lightData.mesh;
    const light = lightData.light;
    
    if (!mesh) {
      console.warn(`[aimLightAt] No mesh for light ${lightId}`);
      return;
    }
    
    // Calculate direction from light position to target
    const direction = target.subtract(mesh.position).normalize();
    console.log(`[aimLightAt] ${lightId}: pos=${mesh.position}, target=${target}, dir=${direction}`);
    
    // Rotate mesh to face the target
    // The Aputure 300D model has +Z as forward (dish direction)
    // mesh.lookAt points -Z toward target, so we need to flip
    try {
      // Create a rotation that orients the mesh's +Z toward the target
      const upVector = BABYLON.Vector3.Up();
      
      // Use setDirection-style rotation
      // First, compute what quaternion would make +Z point toward direction
      const forward = direction;
      const right = BABYLON.Vector3.Cross(upVector, forward).normalize();
      const up = BABYLON.Vector3.Cross(forward, right);
      
      // Build rotation matrix from axes
      const rotMat = BABYLON.Matrix.Identity();
      rotMat.setRowFromFloats(0, right.x, right.y, right.z, 0);
      rotMat.setRowFromFloats(1, up.x, up.y, up.z, 0);
      rotMat.setRowFromFloats(2, forward.x, forward.y, forward.z, 0);
      
      mesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMat);
      mesh.computeWorldMatrix(true);
      
      console.log(`[aimLightAt] ${lightId}: rotation set`);
    } catch (e) {
      console.error(`[aimLightAt] Error rotating mesh:`, e);
    }
    
    // Update the SpotLight direction to point at target
    if (light instanceof BABYLON.SpotLight) {
      (light as BABYLON.ShadowLight).setDirectionToTarget(target);
      console.log(`[aimLightAt] ${lightId}: SpotLight direction set`);
    }
    
    // Store the aimed direction on mesh for reference
    (mesh as any)._initialWorldForward = direction.clone();
    
    // Clear azimuth/elevation to stay in automatic mode
    lightData.azimuth = undefined;
    lightData.elevation = undefined;
  }
  
  public async setupDefaultLighting(): Promise<void> {
    // Create target point in center of scene
    const subjectCenter = new BABYLON.Vector3(0, 1, 0); // Center of scene, 1m height
    
    // === KEY LIGHT ===
    // Position: From camera view (bottom, looking up): front-right side
    // Camera is at (0, 2.5, -8) looking at (0, 1, 0)
    // Key Light positioned more to the side and forward to avoid pointing at camera
    // Placed at 45° angle to subject, elevated, but further from camera line-of-sight
    const keyLightId = await this.addLight('aputure-300d', new BABYLON.Vector3(3.5, 2.5, -2));
    const keyLight = this.lights.get(keyLightId);
    if (keyLight) {
      keyLight.name = 'Key Light (Aputure 300D)';
      keyLight.powerMultiplier = 1.0; // Full power - main light source
      
      // Aim at scene center
      this.aimLightAt(keyLightId, new BABYLON.Vector3(0, 1, 0));
      
      if (keyLight.light instanceof BABYLON.SpotLight) {
        keyLight.light.angle = Math.PI / 5; // ~36° beam
        keyLight.light.exponent = 2;
      }
    }
    
    // === FILL LIGHT ===
    // Position: From camera view (bottom, looking up): front-left side
    // Opposite side of key, lower and further back
    // Softer, wider beam at reduced intensity
    const fillLightId = await this.addLight('aputure-300d', new BABYLON.Vector3(-3, 2, -3));
    const fillLight = this.lights.get(fillLightId);
    if (fillLight) {
      fillLight.name = 'Fill Light (Aputure 300D)';
      fillLight.powerMultiplier = 0.35; // 35% power - subtle fill
      fillLight.light.intensity = fillLight.light.intensity * 0.35;
      
      // Aim at scene center
      this.aimLightAt(fillLightId, subjectCenter);
      
      if (fillLight.light instanceof BABYLON.SpotLight) {
        fillLight.light.angle = Math.PI / 3; // ~60° wider beam for soft fill
        fillLight.light.exponent = 1; // Very soft falloff
      }
    }
    
    // === RIM LIGHT (BACK LIGHT) ===
    // Position: Behind and to the side of subject (not directly behind to avoid camera flare)
    // Camera is at (0, 2.5, -8) looking at (0, 1, 0)
    // Rim Light positioned well to the side and behind to avoid pointing at camera
    // Moved further to the side and back to minimize flare
    const rimLightId = await this.addLight('aputure-300d', new BABYLON.Vector3(-3.5, 4.5, 4));
    const rimLight = this.lights.get(rimLightId);
    if (rimLight) {
      rimLight.name = 'Rim Light (Aputure 300D)';
      rimLight.powerMultiplier = 0.25; // Reduced to 25% power to minimize flare and maintain subtle rim
      rimLight.light.intensity = rimLight.light.intensity * 0.25;
      
      // Aim at scene center
      this.aimLightAt(rimLightId, new BABYLON.Vector3(0, 1.5, 0));
      
      if (rimLight.light instanceof BABYLON.SpotLight) {
        // Very narrow beam for tight, defined rim/edge - reduced spread
        rimLight.light.angle = Math.PI / 18; // ~10° very narrow for crisp, focused edge
        rimLight.light.exponent = 5; // Sharper falloff for more defined edge lighting
        rimLight.light.innerAngle = Math.PI / 30; // ~6° inner cone for tighter hot spot
      }
      
      // Slightly warmer color for golden rim effect (optional - uncomment for warmer look)
      // rimLight.light.diffuse = new BABYLON.Color3(1.0, 0.95, 0.9);
      
      if (rimLight.shadowGenerator) {
        // Softer shadows from rim light
        rimLight.shadowGenerator.blurKernel = 64;
      }
    }
    
    // Update scene list to show all lights
    this.updateSceneList();
    
    // Deselect all lights so user starts fresh
    this.selectedLightId = null;
    this.gizmoManager?.attachToMesh(null);
    
    // Hide all beam visualizations and studio gizmos since no light is selected
    this.disposeStudioGizmos();
    for (const [, lightData] of this.lights) {
      if (lightData.beamVisualization) {
        lightData.beamVisualization.isVisible = false;
      }
      // Also remove any highlight
      this.removeLightHighlight(lightData.mesh);
    }
  }

  private addWallLogos(): void {
    // Create dynamic texture for logo
    const createLogoTexture = () => {
      const textureWidth = 512;
      const textureHeight = 128;
      const dynamicTexture = new BABYLON.DynamicTexture('logoTexture', { width: textureWidth, height: textureHeight }, this.scene, true);
      const ctx = dynamicTexture.getContext();

      // Clear with transparent background
      ctx.clearRect(0, 0, textureWidth, textureHeight);

      // Draw background with subtle gradient
      const bgGradient = ctx.createLinearGradient(0, 0, textureWidth, textureHeight);
      bgGradient.addColorStop(0, 'rgba(20, 20, 25, 0.8)');
      bgGradient.addColorStop(1, 'rgba(15, 15, 20, 0.8)');
      ctx.fillStyle = bgGradient;
      ctx.roundRect(10, 10, textureWidth - 20, textureHeight - 20, 8);
      ctx.fill();

      // Draw border
      const borderGradient = ctx.createLinearGradient(0, 0, textureWidth, 0);
      borderGradient.addColorStop(0, '#f59e0b');
      borderGradient.addColorStop(0.5, '#f97316');
      borderGradient.addColorStop(1, '#ea580c');
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 3;
      ctx.roundRect(10, 10, textureWidth - 20, textureHeight - 20, 8);
      ctx.stroke();

      // Draw "CREATORHUB" text
      ctx.font = 'bold 36px Arial, sans-serif';
      const textGradient = ctx.createLinearGradient(80, 0, 400, 0);
      textGradient.addColorStop(0, '#f59e0b');
      textGradient.addColorStop(0.5, '#f97316');
      textGradient.addColorStop(1, '#ea580c');
      ctx.fillStyle = textGradient;
      ctx.textAlign = 'center';
      ctx.fillText('CREATORHUB', textureWidth / 2, 55);

      // Draw "VIRTUAL STUDIO" subtitle
      ctx.font = 'bold 20px Arial, sans-serif';
      const subtitleGradient = ctx.createLinearGradient(100, 0, 400, 0);
      subtitleGradient.addColorStop(0, '#00d4ff');
      subtitleGradient.addColorStop(1, '#0891b2');
      ctx.fillStyle = subtitleGradient;
      ctx.fillText('VIRTUAL STUDIO', textureWidth / 2, 85);

      // Draw small tagline
      ctx.font = '12px Arial, sans-serif';
      ctx.fillStyle = 'rgba(180, 83, 9, 0.8)';
      ctx.fillText('3D Fotostudio Simulator', textureWidth / 2, 108);

      dynamicTexture.update();
      return dynamicTexture;
    };

    // Create logo material
    const logoMat = new BABYLON.StandardMaterial('logoMat', this.scene);
    logoMat.diffuseTexture = createLogoTexture();
    logoMat.diffuseTexture.hasAlpha = true;
    logoMat.useAlphaFromDiffuseTexture = true;
    logoMat.emissiveTexture = logoMat.diffuseTexture;
    logoMat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0.15);
    logoMat.specularColor = new BABYLON.Color3(0, 0, 0);
    logoMat.backFaceCulling = true;

    // Logo dimensions
    const logoWidth = 5;
    const logoHeight = 1.25;

    // Logo on backside of front wall (backWall) - visible from outside/behind
    const logoBackWall = BABYLON.MeshBuilder.CreatePlane('logoBackWall', { width: logoWidth, height: logoHeight }, this.scene);
    logoBackWall.position.set(0, 6.5, -9.99);
    logoBackWall.rotation.y = Math.PI;
    logoBackWall.material = logoMat;

    // Logo on backside of left wall - visible from outside
    const logoLeftWallMat = logoMat.clone('logoMatLeft');
    logoLeftWallMat.diffuseTexture = createLogoTexture();
    logoLeftWallMat.emissiveTexture = logoLeftWallMat.diffuseTexture;
    const logoLeftWall = BABYLON.MeshBuilder.CreatePlane('logoLeftWall', { width: logoWidth, height: logoHeight }, this.scene);
    logoLeftWall.position.set(-9.99, 6.5, 0);
    logoLeftWall.rotation.y = -Math.PI / 2;
    logoLeftWall.material = logoLeftWallMat;

    // Logo on backside of right wall - visible from outside
    const logoRightWallMat = logoMat.clone('logoMatRight');
    logoRightWallMat.diffuseTexture = createLogoTexture();
    logoRightWallMat.emissiveTexture = logoRightWallMat.diffuseTexture;
    const logoRightWall = BABYLON.MeshBuilder.CreatePlane('logoRightWall', { width: logoWidth, height: logoHeight }, this.scene);
    logoRightWall.position.set(9.99, 6.5, 0);
    logoRightWall.rotation.y = Math.PI / 2;
    logoRightWall.material = logoRightWallMat;

    // Logo on backside of rear wall - visible from inside studio
    const logoRearWallMat = logoMat.clone('logoMatRear');
    logoRearWallMat.diffuseTexture = createLogoTexture();
    logoRearWallMat.emissiveTexture = logoRearWallMat.diffuseTexture;
    const logoRearWall = BABYLON.MeshBuilder.CreatePlane('logoRearWall', { width: logoWidth, height: logoHeight }, this.scene);
    logoRearWall.position.set(0, 6.5, 9.99);
    logoRearWall.rotation.y = 0;
    logoRearWall.material = logoRearWallMat;
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
    this.setupTopViewInteractivity();
    this.setupTimelineListeners();
    this.setupMissingButtonHandlers();
    this.setupRenderModeToggle();
  }

  private finalRenderInterval: ReturnType<typeof setInterval> | null = null;
  
  /**
   * Setup render mode toggle (Work Mode / Final Mode)
   */
  private setupRenderModeToggle(): void {
    const workModeBtn = document.getElementById('workModeBtn');
    const finalModeBtn = document.getElementById('finalModeBtn');
    const renderProgress = document.getElementById('renderProgress');
    const renderProgressBar = document.getElementById('renderProgressBar');
    const renderProgressText = document.getElementById('renderProgressText');
    const cancelFinalRender = document.getElementById('cancelFinalRender');
    
    // Store original progress HTML for reset
    const originalProgressHTML = renderProgress?.innerHTML || '';
    
    const resetProgressUI = () => {
      if (renderProgress) {
        renderProgress.innerHTML = originalProgressHTML;
      }
      const newProgressBar = document.getElementById('renderProgressBar');
      const newProgressText = document.getElementById('renderProgressText');
      if (newProgressBar) newProgressBar.style.width = '0%';
      if (newProgressText) newProgressText.textContent = '0%';
    };
    
    const stopFinalRender = () => {
      if (this.finalRenderInterval) {
        clearInterval(this.finalRenderInterval);
        this.finalRenderInterval = null;
      }
    };
    
    const updateModeUI = (mode: 'work' | 'final') => {
      if (mode === 'work') {
        stopFinalRender();
        workModeBtn?.classList.add('active');
        finalModeBtn?.classList.remove('active');
        if (workModeBtn) {
          workModeBtn.style.background = 'rgba(0,212,255,0.3)';
          workModeBtn.style.color = '#00d4ff';
        }
        if (finalModeBtn) {
          finalModeBtn.style.background = 'transparent';
          finalModeBtn.style.color = 'rgba(255,255,255,0.6)';
        }
        if (renderProgress) renderProgress.style.display = 'none';
        resetProgressUI();
      } else {
        finalModeBtn?.classList.add('active');
        workModeBtn?.classList.remove('active');
        if (finalModeBtn) {
          finalModeBtn.style.background = 'rgba(16,185,129,0.3)';
          finalModeBtn.style.color = '#10b981';
        }
        if (workModeBtn) {
          workModeBtn.style.background = 'transparent';
          workModeBtn.style.color = 'rgba(255,255,255,0.6)';
        }
        if (renderProgress) renderProgress.style.display = 'block';
      }
    };
    
    const startFinalRender = () => {
      stopFinalRender();
      resetProgressUI();
      
      let progress = 0;
      const progressBar = document.getElementById('renderProgressBar');
      const progressText = document.getElementById('renderProgressText');
      
      this.finalRenderInterval = setInterval(() => {
        progress += 2;
        if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
        if (progressText) progressText.textContent = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
          stopFinalRender();
          setTimeout(() => {
            const rp = document.getElementById('renderProgress');
            if (rp && this.renderMode === 'final') {
              rp.innerHTML = `
                <div style="font-size:11px;color:#10b981;margin-bottom:4px;">Rendering fullført</div>
                <div style="display:flex;gap:8px;justify-content:center;">
                  <button id="exportFinalRender" style="padding:6px 16px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Eksporter Bilde</button>
                  <button id="rerunFinalRender" style="padding:6px 12px;border:none;background:rgba(255,255,255,0.1);color:#fff;border-radius:6px;cursor:pointer;font-size:11px;">Kjør igjen</button>
                </div>
              `;
              document.getElementById('exportFinalRender')?.addEventListener('click', () => {
                this.exportScreenshot();
              });
              document.getElementById('rerunFinalRender')?.addEventListener('click', () => {
                resetProgressUI();
                startFinalRender();
              });
            }
          }, 500);
        }
      }, 100);
    };
    
    workModeBtn?.addEventListener('click', () => {
      this.setRenderMode('work');
      updateModeUI('work');
    });
    
    finalModeBtn?.addEventListener('click', () => {
      this.setRenderMode('final');
      updateModeUI('final');
      startFinalRender();
    });
    
    cancelFinalRender?.addEventListener('click', () => {
      this.setRenderMode('work');
      updateModeUI('work');
    });
    
    // Listen for render mode changes from code
    window.addEventListener('vs-render-mode-changed', ((e: CustomEvent) => {
      updateModeUI(e.detail.mode);
    }) as EventListener);
  }
  
  /**
   * Export screenshot of the current viewport
   */
  private exportScreenshot(): void {
    BABYLON.Tools.CreateScreenshot(this.engine, this.camera, { width: 1920, height: 1080 }, (data) => {
      const link = document.createElement('a');
      link.download = `virtual-studio-render-${Date.now()}.png`;
      link.href = data;
      link.click();
    });
  }

  private currentScopeMode: 'histogram' | 'waveform' | 'vectorscope' | 'skin' | 'zebra' | 'falsecolor' = 'histogram';
  private scopeExpanded: boolean = false;

  private setupScopeControls(): void {
    // Right panel scope controls
    const scopeModeSelect = document.getElementById('scopeModeSelect') as HTMLSelectElement;
    const scopeModeSelectDropdown = document.getElementById('scopeModeSelectDropdown') as HTMLSelectElement;

    // Sync both selects
    const setScopeMode = (mode: typeof this.currentScopeMode) => {
      this.currentScopeMode = mode;
      // Update button text
      const scopeToggleBtn = document.getElementById('scopeToggleBtn');
      const btnText = scopeToggleBtn?.querySelector('.toolbar-btn-text');
      if (btnText) {
        const modeLabels: Record<string, string> = {
          'histogram': 'Histogram',
          'waveform': 'Waveform',
          'vectorscope': 'Vectorscope',
          'skin': 'Hudtone',
          'zebra': 'Zebra',
          'falsecolor': 'False Color'
        };
        btnText.textContent = modeLabels[mode] || 'Histogram';
      }
      // Sync both selects
      if (scopeModeSelect) scopeModeSelect.value = mode;
      if (scopeModeSelectDropdown) scopeModeSelectDropdown.value = mode;
    };

    scopeModeSelect?.addEventListener('change', () => {
      setScopeMode(scopeModeSelect.value as typeof this.currentScopeMode);
    });
    
    scopeModeSelectDropdown?.addEventListener('change', () => {
      setScopeMode(scopeModeSelectDropdown.value as typeof this.currentScopeMode);
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
          
          // Update light position if applicable
          if (data.light instanceof BABYLON.SpotLight || data.light instanceof BABYLON.DirectionalLight) {
            data.light.position = data.mesh.position.clone();
          }
          
          // Dispatch event for updates
          window.dispatchEvent(new CustomEvent('ch-light-position-changed', {
            detail: { lightId: this.selectedLightId }
          }));
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
    
    if (!(window as any).__cameraSettingsListenerAttached) {
      (window as any).__cameraSettingsListenerAttached = true;
      window.addEventListener('request-camera-settings', () => {
        window.dispatchEvent(new CustomEvent('camera-settings-changed', {
          detail: { ...this.cameraSettings }
        }));
        
        this.cameraPresets.forEach((preset, presetId) => {
          if (preset) {
            window.dispatchEvent(new CustomEvent('camera-preset-changed', {
              detail: { 
                presetId, 
                hasPreset: true, 
                preset: {
                  focalLength: (preset as any).focalLength ?? this.cameraSettings.focalLength,
                  distance: (preset as any).distance ?? preset.radius,
                  height: (preset as any).height ?? preset.target?.y ?? 1.6,
                  fov: preset.fov
                }
              }
            }));
          } else {
            window.dispatchEvent(new CustomEvent('camera-preset-changed', {
              detail: { presetId, hasPreset: false, preset: null }
            }));
          }
        });
      });
    }
    
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
      
      // Update DOF based on aperture (lower f-stop = shallower DOF)
      // Enable DOF for wide apertures (f/4 or lower)
      const enableDOF = aperture <= 4.0;
      const focusDistance = this.camera.radius; // Use camera distance as focus distance
      this.updateDOFSettings(aperture, focusDistance, enableDOF);
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

  public updateExposureDisplay(): void {
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
    
    window.dispatchEvent(new CustomEvent('camera-settings-changed', {
      detail: { ...this.cameraSettings }
    }));
  }

  public updateSceneBrightness(): void {
    // Parse shutter speed to get exposure time
    const shutterMatch = this.cameraSettings.shutter.match(/1\/(\d+)/);
    const shutterSeconds = shutterMatch ? 1 / parseInt(shutterMatch[1]) : 1/125;
    
    // Calculate exposure value (EV)
    const isoFactor = this.cameraSettings.iso / 100;
    const apertureFactor = 1 / (this.cameraSettings.aperture * this.cameraSettings.aperture);
    const shutterFactor = shutterSeconds * 125; // Normalize to 1/125s baseline
    const ndFactor = 1 / Math.pow(2, this.cameraSettings.nd);
    
    const brightness = isoFactor * apertureFactor * shutterFactor * ndFactor * 2;
    
    // Update all studio lights - preserve user's intensity settings
    for (const [, data] of this.lights) {
      // Initialize baseIntensity if not set
      if (!data.baseIntensity) {
        data.baseIntensity = data.type.includes('softbox') || data.type.includes('umbrella') ? 8 : 12;
      }
      // Initialize powerMultiplier if not set (default to 100% = 1.0)
      if (data.powerMultiplier === undefined) {
        data.powerMultiplier = 1.0;
      }
      // Apply: baseIntensity * powerMultiplier * brightness
      data.light.intensity = data.baseIntensity * data.powerMultiplier * brightness;
      data.intensity = data.light.intensity;
    }
    
    // Update ambient/hemisphere light if exists
    this.scene.lights.forEach(light => {
      if (light instanceof BABYLON.HemisphericLight) {
        light.intensity = 0.3 * brightness;
      }
    });
  }

  private setupModalListeners(): void {
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
    document.getElementById('exportPdfBtn2')?.addEventListener('click', () => this.exportPdf());

    document.getElementById('notesBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggle-notes-panel'));
    });

    // Setup overlay settings panel
    this.setupOverlaySettingsPanel();
  }

  private setupOverlaySettingsPanel(): void {
    const overlaySettingsBtn = document.getElementById('overlaySettingsBtn');
    const overlayPanel = document.getElementById('overlayPanel');
    const overlayPanelClose = document.getElementById('overlayPanelClose');

    if (!overlaySettingsBtn || !overlayPanel) {
      console.warn('Overlay settings elements not found');
      return;
    }

    // Toggle overlay panel on button click
    overlaySettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = overlayPanel.style.display !== 'none';
      overlayPanel.style.display = isOpen ? 'none' : 'block';
      overlaySettingsBtn.classList.toggle('active', !isOpen);
    });

    // Close button
    overlayPanelClose?.addEventListener('click', () => {
      overlayPanel.style.display = 'none';
      overlaySettingsBtn.classList.remove('active');
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlayPanel.style.display !== 'none') {
        overlayPanel.style.display = 'none';
        overlaySettingsBtn.classList.remove('active');
      }
    });

    // Make panel draggable via header
    const overlayPanelHeader = document.getElementById('overlayPanelHeader');
    if (overlayPanelHeader) {
      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      overlayPanelHeader.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        isDragging = true;
        const rect = overlayPanel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        overlayPanelHeader.style.cursor = 'grabbing';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        overlayPanel.style.left = `${x}px`;
        overlayPanel.style.top = `${y}px`;
        overlayPanel.style.right = 'auto';
        overlayPanel.style.bottom = 'auto';
        overlayPanel.style.transform = 'none';
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        overlayPanelHeader.style.cursor = 'grab';
      });
    }

    // Ensure content area is scrollable
    const overlayContent = document.getElementById('overlayPanelContent');
    if (overlayContent) {
      // Force scroll styles via JavaScript with setAttribute for priority
      overlayContent.setAttribute('style', 'overflow-y: scroll !important; max-height: 320px !important; height: 320px !important; display: block !important; -webkit-overflow-scrolling: touch;');
      
      // Add wheel event listener to ensure scroll works
      overlayContent.addEventListener('wheel', (e: WheelEvent) => {
        e.stopPropagation();
        const scrollAmount = e.deltaY;
        overlayContent.scrollTop += scrollAmount;
      }, { passive: true });
      
      // Also handle touch scroll for trackpad
      let touchStartY = 0;
      overlayContent.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      
      overlayContent.addEventListener('touchmove', (e: TouchEvent) => {
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;
        overlayContent.scrollTop += deltaY;
        touchStartY = touchY;
      }, { passive: true });
      
      console.log('[Overlay] Scroll enabled on content area, height:', overlayContent.style.height);
    }

    // Setup overlay toggle checkboxes
    this.setupOverlayToggles();
  }

  private setupOverlayToggles(): void {
    // Grid toggle
    const gridToggle = document.getElementById('overlayGridToggle') as HTMLInputElement;
    
    // Get overlay elements
    const getOverlayElements = () => ({
      grid: document.querySelector('#thirdGridOverlay') as HTMLElement,
      composition: document.querySelector('#compositionOverlay') as HTMLElement,
      helperGuide: document.querySelector('#helperGuideOverlay') as HTMLElement,
      safeArea: document.querySelector('#safeAreaOverlay') as HTMLElement,
      focusGrid: document.querySelector('#focusGrid') as HTMLElement,
    });

    // Update grid overlay visibility
    const updateGridVisibility = () => {
      const elements = getOverlayElements();
      const isEnabled = gridToggle?.checked ?? false;
      
      // Update store
      useFocusStore.getState().setShowGrid(isEnabled);
      
      if (elements.grid) {
        elements.grid.style.display = isEnabled ? 'block' : 'none';
      }
    };

    // Setup focus mode radio buttons
    const focusModeRadios = document.querySelectorAll('input[name="focusMode"]') as NodeListOf<HTMLInputElement>;
    focusModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          const value = target.value;
          // Update store directly
          useFocusStore.getState().setMode(value as any);
          console.log('Focus mode changed:', value);
        }
      });
    });

    // Setup composition guide radio buttons
    const compositionRadios = document.querySelectorAll('input[name="composition"]') as NodeListOf<HTMLInputElement>;
    compositionRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          const value = target.value;
          // Update store directly
          useFocusStore.getState().setCompositionGuide(value as any);
          console.log('Composition guide changed:', value);
        }
      });
    });

    // Setup safe area checkboxes
    const safeAreaCheckboxes = document.querySelectorAll('input[name="safeArea"]') as NodeListOf<HTMLInputElement>;
    safeAreaCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const checkedValues = Array.from(safeAreaCheckboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value);
        
        // Determine mode based on checked values
        let mode: 'none' | 'action' | 'title' | 'both' = 'none';
        if (checkedValues.includes('action') && checkedValues.includes('title')) {
          mode = 'both';
        } else if (checkedValues.includes('action')) {
          mode = 'action';
        } else if (checkedValues.includes('title')) {
          mode = 'title';
        }
        
        // Update store directly
        useFocusStore.getState().setSafeAreaMode(mode);
        console.log('Safe area changed:', mode);
      });
    });

    // Setup helper guide radio buttons
    const helperGuideRadios = document.querySelectorAll('input[name="helperGuide"]') as NodeListOf<HTMLInputElement>;
    helperGuideRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          const value = target.value;
          // Update store directly
          useFocusStore.getState().setHelperGuide(value as any);
          console.log('Helper guide changed:', value);
        }
      });
    });

    // Focus Grid toggle
    const focusGridToggle = document.getElementById('overlayFocusGridToggle') as HTMLInputElement;
    
    // Update focus grid overlay visibility
    const updateFocusGridVisibility = () => {
      const elements = getOverlayElements();
      const isEnabled = focusGridToggle?.checked ?? false;
      
      if (elements.focusGrid) {
        elements.focusGrid.style.display = isEnabled ? 'block' : 'none';
      }
    };

    // Add event listener for grid toggle
    gridToggle?.addEventListener('change', updateGridVisibility);
    
    // Add event listener for focus grid toggle
    focusGridToggle?.addEventListener('change', updateFocusGridVisibility);

    // Initial state
    updateGridVisibility();
    updateFocusGridVisibility();
  }

  private setupMissingButtonHandlers(): void {
    // Transform mode buttons
    const selectModeBtn = document.getElementById('selectModeBtn');
    const moveModeBtn = document.getElementById('moveModeBtn');
    const rotateModeBtn = document.getElementById('rotateModeBtn');
    const modeButtons = [selectModeBtn, moveModeBtn, rotateModeBtn].filter(Boolean);

    const setActiveMode = (activeBtn: HTMLElement | null) => {
      modeButtons.forEach(btn => {
        btn?.classList.remove('active');
        btn?.setAttribute('aria-pressed', 'false');
      });
      if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
      }
    };

    selectModeBtn?.addEventListener('click', () => {
      setActiveMode(selectModeBtn);
      this.currentTransformMode = 'select';
      console.log('Transform mode: select');
    });

    moveModeBtn?.addEventListener('click', () => {
      setActiveMode(moveModeBtn);
      this.currentTransformMode = 'move';
      console.log('Transform mode: move');
    });

    rotateModeBtn?.addEventListener('click', () => {
      setActiveMode(rotateModeBtn);
      this.currentTransformMode = 'rotate';
      console.log('Transform mode: rotate');
    });

    // Undo/Redo buttons
    document.getElementById('undoBtn')?.addEventListener('click', () => {
      this.performUndo();
    });

    document.getElementById('redoBtn')?.addEventListener('click', () => {
      this.performRedo();
    });
    
    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.performUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.performRedo();
        }
      }
    });

    // Play button - Toggle recording/preview mode
    const playBtn = document.getElementById('playBtn');
    playBtn?.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
        playBtn.classList.remove('recording');
        playBtn.innerHTML = '<span aria-hidden="true">▶</span>';
        playBtn.title = 'Spill av / Ta opp (Space)';
      } else {
        // Open recording dialog or start recording directly
        this.showRecordingDialog();
      }
    });
    
    // Space bar to toggle recording
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.showRecordingDialog();
        }
      }
    });

    // Monitor button - opens monitor panel
    const monitorBtn = document.getElementById('monitorBtn');
    const monitorPanel = document.getElementById('monitorPanel');
    const monitorCloseBtn = document.getElementById('monitorClose');

    monitorBtn?.addEventListener('click', () => {
      if (monitorPanel) {
        const isVisible = monitorPanel.style.display !== 'none';
        monitorPanel.style.display = isVisible ? 'none' : 'block';
        monitorBtn.classList.toggle('active', !isVisible);
      }
    });

    monitorCloseBtn?.addEventListener('click', () => {
      if (monitorPanel) {
        monitorPanel.style.display = 'none';
        monitorBtn?.classList.remove('active');
      }
    });

    // Scene Composer button
    const sceneComposerBtn = document.getElementById('sceneComposerBtn');
    const sceneComposerPanel = document.getElementById('sceneComposerPanel');
    const sceneComposerCloseBtn = document.getElementById('sceneComposerClose');

    sceneComposerBtn?.addEventListener('click', () => {
      if (sceneComposerPanel) {
        const isVisible = sceneComposerPanel.style.display !== 'none';
        sceneComposerPanel.style.display = isVisible ? 'none' : 'block';
        sceneComposerBtn.classList.toggle('active', !isVisible);
      }
    });

    sceneComposerCloseBtn?.addEventListener('click', () => {
      if (sceneComposerPanel) {
        sceneComposerPanel.style.display = 'none';
        sceneComposerBtn?.classList.remove('active');
      }
    });

    // Animation Composer button
    const animationComposerBtn = document.getElementById('animationComposerBtn');
    const animationComposerPanel = document.getElementById('animationComposerPanel');
    const animationComposerCloseBtn = document.getElementById('animationComposerClose');

    animationComposerBtn?.addEventListener('click', () => {
      if (animationComposerPanel) {
        const isVisible = animationComposerPanel.style.display !== 'none';
        animationComposerPanel.style.display = isVisible ? 'none' : 'block';
        animationComposerBtn.classList.toggle('active', !isVisible);
      }
    });

    animationComposerCloseBtn?.addEventListener('click', () => {
      if (animationComposerPanel) {
        animationComposerPanel.style.display = 'none';
        animationComposerBtn?.classList.remove('active');
      }
    });

    // Marketplace trigger
    const marketplaceTrigger = document.getElementById('marketplaceTrigger');
    console.log('Marketplace trigger element:', marketplaceTrigger);
    if (marketplaceTrigger) {
      marketplaceTrigger.addEventListener('click', (e) => {
        console.log('Marketplace trigger clicked!');
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
      });
    } else {
      console.error('Marketplace trigger element not found!');
    }

    // Video record button - toggle dropdown
    const videoRecordBtn = document.getElementById('videoRecordBtn');
    const videoRecordDropdown = document.getElementById('videoRecordDropdown');

    if (videoRecordBtn && videoRecordDropdown) {
      videoRecordBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = videoRecordDropdown.classList.contains('open');
        videoRecordDropdown.classList.toggle('open', !isOpen);
        videoRecordBtn.setAttribute('aria-expanded', String(!isOpen));
        console.log('Video dropdown toggled:', !isOpen);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!videoRecordBtn.contains(e.target as Node) && !videoRecordDropdown.contains(e.target as Node)) {
          videoRecordDropdown.classList.remove('open');
          videoRecordBtn.setAttribute('aria-expanded', 'false');
        }
      });
    } else {
      console.warn('Video record button or dropdown not found');
    }

    // Posing mode button
    document.getElementById('posingModeBtn')?.addEventListener('click', () => {
      const btn = document.getElementById('posingModeBtn');
      const isActive = btn?.classList.toggle('active');
      btn?.setAttribute('aria-pressed', String(isActive));
      window.dispatchEvent(new CustomEvent('ch-posing-mode', { detail: { enabled: isActive } }));
    });

    // Add new light button - handled in camera controls section (line ~11203)
    // Removed duplicate handler that was adding a 'point' light alongside the selected light type

    // Floor visibility button
    document.getElementById('floorVisibilityBtn')?.addEventListener('click', () => {
      const btn = document.getElementById('floorVisibilityBtn');
      const isActive = btn?.classList.toggle('active');
      window.dispatchEvent(new CustomEvent('ch-toggle-floor', { detail: { visible: isActive } }));
    });

    // Export PDF button (duplicate in toolbar)
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
      this.exportPdf();
    });

    // Scope toggle button - toggles scopeDropdownPanel
    const scopeToggleBtn = document.getElementById('scopeToggleBtn');
    const scopeDropdownPanel = document.getElementById('scopeDropdownPanel');

    scopeToggleBtn?.addEventListener('click', () => {
      if (scopeDropdownPanel && scopeToggleBtn) {
        const isVisible = scopeDropdownPanel.classList.contains('open');

        if (isVisible) {
          scopeDropdownPanel.classList.remove('open');
          scopeDropdownPanel.setAttribute('aria-hidden', 'true');
          scopeToggleBtn.classList.remove('active');
          scopeToggleBtn.setAttribute('aria-expanded', 'false');
        } else {
          // Calculate position relative to the button
          const buttonRect = scopeToggleBtn.getBoundingClientRect();
          const panelWidth = 420;
          const maxWidth = window.innerWidth - 32;
          const actualWidth = Math.min(panelWidth, maxWidth);
          
          // Position panel below the button, aligned to left edge of button
          const leftPosition = buttonRect.left;
          const topPosition = buttonRect.bottom;
          
          scopeDropdownPanel.style.left = `${leftPosition}px`;
          scopeDropdownPanel.style.top = `${topPosition}px`;
          scopeDropdownPanel.style.width = `${actualWidth}px`;
          
          scopeDropdownPanel.classList.add('open');
          scopeDropdownPanel.setAttribute('aria-hidden', 'false');
          scopeToggleBtn.classList.add('active');
          scopeToggleBtn.setAttribute('aria-expanded', 'true');
        }
      }
    });

    // Update panel position on window resize
    window.addEventListener('resize', () => {
      if (scopeDropdownPanel && scopeToggleBtn && scopeDropdownPanel.classList.contains('open')) {
        const buttonRect = scopeToggleBtn.getBoundingClientRect();
        const panelWidth = 420;
        const maxWidth = window.innerWidth - 32;
        const actualWidth = Math.min(panelWidth, maxWidth);
        
        scopeDropdownPanel.style.left = `${buttonRect.left}px`;
        scopeDropdownPanel.style.top = `${buttonRect.bottom}px`;
        scopeDropdownPanel.style.width = `${actualWidth}px`;
      }
    });

    // Recording buttons - direct connection to recording methods
    document.getElementById('startRecordingBtn')?.addEventListener('click', () => {
      console.log('Start recording clicked');
      this.startRecording();
    });

    document.getElementById('stopRecordingBtn')?.addEventListener('click', () => {
      console.log('Stop recording clicked');
      this.stopRecording();
    });

    // Camera preset buttons (Cam A-E)
    // Single click: If empty -> save, if saved -> load
    // Double click: Clear preset
    document.querySelectorAll('.camera-preset-btn').forEach(btn => {
      const presetId = btn.getAttribute('data-preset');
      if (!presetId) return;

      let clickTimer: number | null = null;

      // Single click - activate camera for perspective control
      btn.addEventListener('click', (e) => {
        // Wait to see if it's a double click
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
          return;
        }

        clickTimer = window.setTimeout(() => {
          clickTimer = null;
          // Activate this camera for perspective control
          this.setActiveCameraPreset(presetId);
        }, 250);
      });

      // Double click - clear preset
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        if (this.cameraPresets.get(presetId)) {
          this.clearCameraPreset(presetId);
          // Also deactivate if this was the active camera
          if (this.activeCameraPresetId === presetId) {
            this.setActiveCameraPreset(null);
          }
          console.log(`Cleared camera preset: ${presetId}`);
        }
      });
    });

    // Listen for recording events from other parts of the app
    window.addEventListener('ch-start-recording', () => this.startRecording());
    window.addEventListener('ch-stop-recording', () => this.stopRecording());

    // Auto buttons
    document.getElementById('autoAllBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-auto-all'));
    });

    document.getElementById('autoExposureBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-auto-exposure'));
    });

    document.getElementById('autoLightBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-auto-light'));
    });

    document.getElementById('autoWBBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-auto-wb'));
    });

    // Panel close/fullscreen buttons (for closeable panels)
    this.setupPanelButtons();

    // User profile buttons
    this.setupUserProfileButtons();

    // Overlay help button
    document.getElementById('overlayHelpBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('show-overlay-help'));
    });

    // Toolbar menu button
    document.getElementById('toolbarMenuBtn')?.addEventListener('click', () => {
      const menu = document.getElementById('toolbarMenu');
      if (menu) {
        const isVisible = menu.style.display !== 'none';
        menu.style.display = isVisible ? 'none' : 'block';
      }
    });

    // User menu button
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    
    userMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (userMenu) {
        const isVisible = userMenu.style.display !== 'none';
        userMenu.style.display = isVisible ? 'none' : 'block';
        userMenuBtn.setAttribute('aria-expanded', String(!isVisible));
      }
    });
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
      if (userMenu && userMenu.style.display !== 'none') {
        const target = e.target as HTMLElement;
        if (!userMenu.contains(target) && target !== userMenuBtn && !userMenuBtn?.contains(target)) {
          userMenu.style.display = 'none';
          userMenuBtn?.setAttribute('aria-expanded', 'false');
        }
      }
    });
    
    // Close user menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && userMenu && userMenu.style.display !== 'none') {
        userMenu.style.display = 'none';
        userMenuBtn?.setAttribute('aria-expanded', 'false');
        userMenuBtn?.focus();
      }
    });

    // Photographic angles toggle
    document.getElementById('photographicAnglesToggle')?.addEventListener('change', (e) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      window.dispatchEvent(new CustomEvent('ch-photographic-angles', { detail: { enabled: isChecked } }));
    });

    // Pin button
    document.getElementById('pinBtn')?.addEventListener('click', () => {
      const btn = document.getElementById('pinBtn');
      const isPinned = btn?.classList.toggle('active');
      btn?.setAttribute('aria-pressed', String(isPinned));
    });

    // Create/Import group buttons
    document.getElementById('createGroupBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-create-group'));
    });

    document.getElementById('importGroupBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-import-group'));
    });

    // Edit title button - Opens project type selector
    document.getElementById('editTitleBtn')?.addEventListener('click', () => {
      this.showProjectTypeSelector();
    });
    
    // Project name click - Opens project type selector
    document.getElementById('projectName')?.addEventListener('click', () => {
      this.showProjectTypeSelector();
    });
    
    // Monitor dialog buttons
    this.setupMonitorDialogHandlers();
  }
  
  private setupMonitorDialogHandlers(): void {
    // Fullscreen buttons for monitor viewports
    document.querySelectorAll('.monitor-fullscreen-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const presetId = (btn as HTMLElement).getAttribute('data-preset');
        if (presetId) {
          // Load the camera preset to view it fullscreen
          this.loadCameraPreset(presetId);
          // Could also implement actual fullscreen mode here if needed
          console.log(`[Monitor] Fullscreen requested for ${presetId}`);
        }
      });
    });
    
    // Screenshot buttons for monitor viewports
    document.querySelectorAll('.monitor-screenshot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const presetId = (btn as HTMLElement).getAttribute('data-preset');
        if (presetId) {
          const canvas = document.querySelector(`.monitor-canvas[data-preset="${presetId}"]`) as HTMLCanvasElement;
          if (canvas) {
            // Create download link
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `screenshot-${presetId}-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
                console.log(`[Monitor] Screenshot saved for ${presetId}`);
              }
            }, 'image/png');
          }
        }
      });
    });
    
    // Click on monitor viewport to load camera preset
    document.querySelectorAll('.monitor-viewport').forEach(viewport => {
      viewport.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons
        if ((e.target as HTMLElement).closest('.monitor-fullscreen-btn, .monitor-screenshot-btn')) {
          return;
        }
        const presetId = (viewport as HTMLElement).getAttribute('data-preset');
        if (presetId && this.cameraPresets.get(presetId)) {
          this.loadCameraPreset(presetId);
        }
      });
    });
  }

  private currentTransformMode: 'select' | 'move' | 'rotate' = 'select';

  private setupPanelButtons(): void {
    // AI Assistant panel
    document.getElementById('aiAssistantCloseBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
    });

    document.getElementById('aiAssistantFullscreenBtn')?.addEventListener('click', () => {
      const panel = document.getElementById('aiAssistantPanel');
      if (panel) {
        const newFullscreen = !panel.classList.contains('fullscreen');
        window.dispatchEvent(new CustomEvent('ai-assistant-toggle-fullscreen', { detail: newFullscreen }));
        if (newFullscreen) {
          panel.classList.add('fullscreen');
        } else {
          panel.classList.remove('fullscreen');
        }
      }
    });

    // Casting Planner panel
    document.getElementById('castingPlannerCloseBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
    });

    document.getElementById('castingPlannerFullscreenBtn')?.addEventListener('click', () => {
      const panel = document.getElementById('castingPlannerPanel');
      panel?.classList.toggle('fullscreen');
    });

    // Marketplace panel
    document.getElementById('marketplaceCloseBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
    });

    document.getElementById('marketplaceFullscreenBtn')?.addEventListener('click', () => {
      const panel = document.getElementById('marketplacePanel');
      const isFullscreen = panel?.classList.toggle('fullscreen');
      window.dispatchEvent(new CustomEvent('marketplace-toggle-fullscreen', { detail: isFullscreen }));
    });

    // Help panel
    this.setupHelpPanel();
  }

  private setupHelpPanel(): void {
    const helpTrigger = document.getElementById('helpPanelTrigger');
    const helpPanel = document.getElementById('helpPanel');
    const helpCloseBtn = document.getElementById('helpPanelCloseBtn');
    const helpFullscreenBtn = document.getElementById('helpPanelFullscreenBtn');
    const helpEditBtn = document.getElementById('helpEditModeBtn');
    const helpSections = document.querySelectorAll('.help-section');
    const helpNavHeaders = document.querySelectorAll('.help-nav-header');
    const helpNavLinks = document.querySelectorAll('.help-nav-link');
    const helpCardHeaders = document.querySelectorAll('.help-card-header');

    // Toggle help panel
    const toggleHelpPanel = () => {
      if (!helpPanel || !helpTrigger) return;

      const isOpen = helpPanel.classList.contains('open');

      if (isOpen) {
        helpPanel.style.display = 'none';
        helpPanel.classList.remove('open');
        helpTrigger.classList.remove('active');
        helpTrigger.setAttribute('aria-expanded', 'false');
        const arrow = helpTrigger.querySelector('.library-arrow');
        if (arrow) arrow.textContent = '+';
      } else {
        // Close other panels first
        const aiPanel = document.getElementById('aiAssistantPanel');
        const marketplacePanel = document.getElementById('marketplacePanel');
        const studioLibraryPanel = document.getElementById('actorBottomPanel');
        const castingPanel = document.getElementById('castingPlannerPanel');

        if (aiPanel?.classList.contains('open')) {
          window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
        }
        if (marketplacePanel?.classList.contains('open')) {
          window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
        }
        if (studioLibraryPanel?.classList.contains('open')) {
          const trigger = document.getElementById('actorPanelTrigger');
          studioLibraryPanel.classList.remove('open');
          trigger?.classList.remove('active');
          trigger?.setAttribute('aria-expanded', 'false');
          const arrow = trigger?.querySelector('.library-arrow');
          if (arrow) arrow.textContent = '+';
        }
        if (castingPanel?.classList.contains('open')) {
          window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
        }

        helpPanel.style.display = 'flex';
        helpPanel.classList.add('open');
        helpTrigger.classList.add('active');
        helpTrigger.setAttribute('aria-expanded', 'true');
        const arrow = helpTrigger.querySelector('.library-arrow');
        if (arrow) arrow.textContent = '−';
      }
    };

    // Trigger button
    helpTrigger?.addEventListener('click', toggleHelpPanel);

    // Close button
    helpCloseBtn?.addEventListener('click', () => {
      if (helpPanel?.classList.contains('open')) {
        toggleHelpPanel();
      }
    });

    // Fullscreen button
    helpFullscreenBtn?.addEventListener('click', () => {
      helpPanel?.classList.toggle('fullscreen');
    });

    // Edit mode toggle
    helpEditBtn?.addEventListener('click', () => {
      helpPanel?.classList.toggle('edit-mode');
      helpEditBtn.classList.toggle('active');
    });

    // Sidebar navigation - section headers (collapsible)
    helpNavHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const sectionName = (header as HTMLElement).dataset.section;
        const navItems = header.nextElementSibling as HTMLElement;
        const arrow = header.querySelector('.nav-arrow');

        // Toggle nav items visibility
        const isExpanded = navItems?.classList.contains('show');

        // Collapse all other sections
        helpNavHeaders.forEach(h => {
          const items = h.nextElementSibling as HTMLElement;
          const a = h.querySelector('.nav-arrow');
          if (h !== header) {
            items?.classList.remove('show');
            h.classList.remove('active');
            if (a) a.textContent = '▸';
          }
        });

        // Toggle current section
        if (!isExpanded) {
          navItems?.classList.add('show');
          header.classList.add('active');
          if (arrow) arrow.textContent = '▾';

          // Show corresponding content section
          helpSections.forEach(section => {
            const id = (section as HTMLElement).dataset.section;
            if (id === sectionName) {
              section.classList.add('active');
            } else {
              section.classList.remove('active');
            }
          });
        }
      });
    });

    // Sidebar navigation - links
    helpNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = (link as HTMLElement).dataset.target;

        // Update active state
        helpNavLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Scroll to target card and expand it
        if (target) {
          const targetCard = document.getElementById(target);
          if (targetCard) {
            // Expand the card
            const cardBody = targetCard.querySelector('.help-card-body');
            const cardArrow = targetCard.querySelector('.card-arrow');
            if (cardBody && !cardBody.classList.contains('show')) {
              cardBody.classList.add('show');
              if (cardArrow) cardArrow.textContent = '▾';
            }

            // Scroll into view
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    // Collapsible cards
    helpCardHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        // Ignore if clicking edit button
        if ((e.target as HTMLElement).classList.contains('help-card-edit-btn')) {
          return;
        }

        const card = header.closest('.help-card-collapsible');
        const cardBody = card?.querySelector('.help-card-body');
        const arrow = header.querySelector('.card-arrow');

        if (cardBody) {
          const isExpanded = cardBody.classList.contains('show');
          cardBody.classList.toggle('show');
          if (arrow) {
            arrow.textContent = isExpanded ? '▸' : '▾';
          }
        }
      });
    });

    // Quicklinks
    const quicklinks = document.querySelectorAll('.help-quicklink-card');
    quicklinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = (link as HTMLElement).dataset.scroll;
        if (target) {
          const targetCard = document.getElementById(target);
          if (targetCard) {
            // Expand the card
            const cardBody = targetCard.querySelector('.help-card-body');
            const cardArrow = targetCard.querySelector('.card-arrow');
            if (cardBody && !cardBody.classList.contains('show')) {
              cardBody.classList.add('show');
              if (cardArrow) cardArrow.textContent = '▾';
            }

            // Scroll into view
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    // Search functionality
    const searchInput = document.getElementById('helpSearchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.help-card-collapsible');

      if (query === '') {
        // Reset - collapse all cards
        cards.forEach(card => {
          (card as HTMLElement).style.display = '';
          const body = card.querySelector('.help-card-body');
          const arrow = card.querySelector('.card-arrow');
          body?.classList.remove('show');
          if (arrow) arrow.textContent = '▸';
        });
        return;
      }

      // Search and filter
      cards.forEach(card => {
        const title = card.querySelector('.card-title')?.textContent?.toLowerCase() || '';
        const body = card.querySelector('.help-card-body');
        const bodyText = body?.textContent?.toLowerCase() || '';
        const arrow = card.querySelector('.card-arrow');

        if (title.includes(query) || bodyText.includes(query)) {
          (card as HTMLElement).style.display = '';
          body?.classList.add('show');
          if (arrow) arrow.textContent = '▾';
        } else {
          (card as HTMLElement).style.display = 'none';
        }
      });
    });

    // Listen for toggle event
    window.addEventListener('toggle-help-panel', toggleHelpPanel);

    // Mount video players in help panel
    mountHelpVideoPlayers();

    // Setup help content editing
    this.setupHelpContentEditing();
  }

  private helpEditorBlocks: Array<{id: string; type: string; data: Record<string, unknown>}> = [];
  private helpEditorCurrentTarget: HTMLElement | null = null;
  private helpEditorEditType: 'card' | 'section' = 'card';
  private helpEditorActiveBlockCallback: ((data: Record<string, unknown>) => void) | null = null;

  private setupHelpContentEditing(): void {
    const modal = document.getElementById('helpEditModal');
    const modalTitle = document.getElementById('helpEditModalTitle');
    const titleInput = document.getElementById('helpEditTitle') as HTMLInputElement;
    const contentTextarea = document.getElementById('helpEditContent') as HTMLTextAreaElement;
    const preview = document.getElementById('helpEditPreview');
    const closeBtn = document.getElementById('helpEditModalClose');
    const cancelBtn = document.getElementById('helpEditCancel');
    const saveBtn = document.getElementById('helpEditSave');
    const backdrop = modal?.querySelector('.help-edit-modal-backdrop');
    const blockList = document.getElementById('helpBlockList');
    const emptyState = document.getElementById('helpBlockEmptyState');
    const blockCountEl = document.getElementById('helpBlockCount');

    // Tab switching
    document.querySelectorAll('.help-edit-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = (tab as HTMLElement).dataset.tab;
        document.querySelectorAll('.help-edit-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.help-edit-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(`.help-edit-tab-content[data-tab="${targetTab}"]`)?.classList.add('active');

        // Sync content between tabs
        if (targetTab === 'code') {
          if (contentTextarea) contentTextarea.value = this.blocksToMarkup();
        } else {
          this.markupToBlocks(contentTextarea?.value || '');
        }
      });
    });

    // Preview toggle
    const previewToggle = document.getElementById('helpPreviewToggle');
    previewToggle?.addEventListener('click', () => {
      previewToggle.closest('.help-edit-preview-panel')?.classList.toggle('collapsed');
    });

    // Block add buttons
    document.querySelectorAll('.help-block-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const blockType = (btn as HTMLElement).dataset.block;
        if (blockType) this.addBlock(blockType);
      });
    });

    // Open modal for card editing
    document.querySelectorAll('.help-card-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const card = (btn as HTMLElement).closest('.help-card-collapsible');
        if (!card) return;

        this.helpEditorCurrentTarget = card as HTMLElement;
        this.helpEditorEditType = 'card';

        const cardTitle = card.querySelector('.card-title')?.textContent || '';
        const cardBody = card.querySelector('.help-card-body');

        if (modalTitle) modalTitle.textContent = 'Rediger kort';
        if (titleInput) titleInput.value = cardTitle;

        // Convert HTML to blocks
        if (cardBody) {
          this.htmlToBlocks(cardBody.innerHTML);
        }
        if (contentTextarea) {
          contentTextarea.value = this.blocksToMarkup();
        }

        this.renderBlocks();
        this.updateHelpPreview();
        if (modal) modal.style.display = 'flex';
      });
    });

    // Open modal for section editing
    document.querySelectorAll('.help-section-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const section = (btn as HTMLElement).closest('.help-section');
        if (!section) return;

        this.helpEditorCurrentTarget = section as HTMLElement;
        this.helpEditorEditType = 'section';

        const sectionTitle = section.querySelector('h2')?.textContent || '';
        const sectionIntro = section.querySelector('.help-intro')?.textContent || '';

        if (modalTitle) modalTitle.textContent = 'Rediger seksjon';
        if (titleInput) titleInput.value = sectionTitle;

        this.helpEditorBlocks = [{
          id: this.generateBlockId(),
          type: 'text',
          data: { content: sectionIntro }
        }];

        if (contentTextarea) contentTextarea.value = sectionIntro;

        this.renderBlocks();
        this.updateHelpPreview();
        if (modal) modal.style.display = 'flex';
      });
    });

    // Close modal
    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      this.helpEditorCurrentTarget = null;
      this.helpEditorBlocks = [];
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Update preview on textarea input
    contentTextarea?.addEventListener('input', () => this.updateHelpPreview());

    // Code tab toolbar buttons
    document.querySelectorAll('.help-edit-toolbar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (!contentTextarea) return;

        const start = contentTextarea.selectionStart;
        const end = contentTextarea.selectionEnd;
        const selectedText = contentTextarea.value.substring(start, end);
        let insertText = '';

        switch (action) {
          case 'bold':
            insertText = `**${selectedText || 'fet tekst'}**`;
            break;
          case 'italic':
            insertText = `*${selectedText || 'kursiv tekst'}*`;
            break;
          case 'heading':
            insertText = `\n## ${selectedText || 'Overskrift'}\n`;
            break;
          case 'list':
            insertText = `\n- ${selectedText || 'Listepunkt'}\n- Punkt 2\n`;
            break;
          case 'badge':
            insertText = `[badge]${selectedText || 'Knapp'}[/badge]`;
            break;
          case 'kbd':
            insertText = `[kbd]${selectedText || 'Ctrl+S'}[/kbd]`;
            break;
          case 'link':
            insertText = `[link url="#"]${selectedText || 'Lenketekst'}[/link]`;
            break;
        }

        contentTextarea.value = contentTextarea.value.substring(0, start) + insertText + contentTextarea.value.substring(end);
        contentTextarea.focus();
        contentTextarea.selectionStart = start + insertText.length;
        contentTextarea.selectionEnd = start + insertText.length;
        this.updateHelpPreview();
      });
    });

    // Save changes
    saveBtn?.addEventListener('click', () => {
      if (!this.helpEditorCurrentTarget || !titleInput) return;

      const newTitle = titleInput.value.trim();
      const newContent = this.blocksToHtml();

      if (this.helpEditorEditType === 'card') {
        const cardTitleEl = this.helpEditorCurrentTarget.querySelector('.card-title');
        const cardBody = this.helpEditorCurrentTarget.querySelector('.help-card-body');

        if (cardTitleEl) cardTitleEl.textContent = newTitle;
        if (cardBody) cardBody.innerHTML = newContent;
      } else if (this.helpEditorEditType === 'section') {
        const sectionTitleEl = this.helpEditorCurrentTarget.querySelector('h2');
        const sectionIntro = this.helpEditorCurrentTarget.querySelector('.help-intro');

        if (sectionTitleEl) sectionTitleEl.textContent = newTitle;
        if (sectionIntro) sectionIntro.textContent = this.helpEditorBlocks[0]?.data?.content as string || '';
      }

      closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (modal?.style.display === 'flex') {
        if (e.key === 'Escape') {
          closeModal();
        } else if (e.ctrlKey || e.metaKey) {
          if (e.key === 's') {
            e.preventDefault();
            saveBtn?.click();
          }
        }
      }
    });

    // Setup button picker modal
    this.setupButtonPickerModal();

    // Setup image upload modal
    this.setupImageUploadModal();

    // Setup video embed modal
    this.setupVideoEmbedModal();
  }

  private updateHelpPreview(): void {
    const preview = document.getElementById('helpEditPreview');
    const activeTab = document.querySelector('.help-edit-tab.active')?.getAttribute('data-tab');

    if (preview) {
      if (activeTab === 'code') {
        const contentTextarea = document.getElementById('helpEditContent') as HTMLTextAreaElement;
        preview.innerHTML = this.markupToHtml(contentTextarea?.value || '');
      } else {
        preview.innerHTML = this.blocksToHtml();
      }
    }
  }

  private htmlToMarkup(html: string): string {
    // Convert HTML to simple markup format
    let markup = html;

    // Convert strong/bold
    markup = markup.replace(/<strong>([^<]*)<\/strong>/g, '**$1**');
    markup = markup.replace(/<b>([^<]*)<\/b>/g, '**$1**');

    // Convert em/italic
    markup = markup.replace(/<em>([^<]*)<\/em>/g, '*$1*');
    markup = markup.replace(/<i>([^<]*)<\/i>/g, '*$1*');

    // Convert headings
    markup = markup.replace(/<h4[^>]*>([^<]*)<\/h4>/g, '\n## $1\n');

    // Convert badges
    markup = markup.replace(/<span class="help-badge">([^<]*)<\/span>/g, '[badge]$1[/badge]');

    // Convert kbd
    markup = markup.replace(/<kbd>([^<]*)<\/kbd>/g, '[kbd]$1[/kbd]');

    // Convert lists
    markup = markup.replace(/<ul[^>]*>/g, '\n');
    markup = markup.replace(/<\/ul>/g, '\n');
    markup = markup.replace(/<li>([^<]*)<\/li>/g, '- $1\n');
    markup = markup.replace(/<li><strong>([^<]*)<\/strong>([^<]*)<\/li>/g, '- **$1**$2\n');

    // Convert paragraphs
    markup = markup.replace(/<p>/g, '');
    markup = markup.replace(/<\/p>/g, '\n\n');

    // Clean up remaining tags
    markup = markup.replace(/<[^>]*>/g, '');

    // Clean up whitespace
    markup = markup.replace(/\n{3,}/g, '\n\n');
    markup = markup.trim();

    return markup;
  }

  private markupToHtml(markup: string): string {
    // Convert simple markup to HTML
    let html = markup;

    // Escape HTML
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Convert bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert headings
    html = html.replace(/^## (.+)$/gm, '<h4 class="help-card-subtitle">$1</h4>');

    // Convert badges
    html = html.replace(/\[badge\]([^\[]+)\[\/badge\]/g, '<span class="help-badge">$1</span>');

    // Convert kbd
    html = html.replace(/\[kbd\]([^\[]+)\[\/kbd\]/g, '<kbd>$1</kbd>');

    // Convert feature grid
    html = html.replace(/\[grid\]([\s\S]*?)\[\/grid\]/g, (match, content) => {
      const items = content.match(/\[item\]([^\[]+)\[\/item\]/g) || [];
      const gridItems = items.map((item: string) => {
        const parts = item.replace(/\[item\]|\[\/item\]/g, '').split('|');
        return `<div class="help-feature-item"><strong>${parts[0] || ''}</strong><span>${parts[1] || ''}</span></div>`;
      }).join('');
      return `<div class="help-feature-grid">${gridItems}</div>`;
    });

    // Convert steps
    html = html.replace(/\[steg\]([\s\S]*?)\[\/steg\]/g, (match, content) => {
      const lines = content.trim().split('\n').filter((l: string) => l.trim());
      const steps = lines.map((line: string, idx: number) => {
        const text = line.replace(/^\d+\.\s*/, '');
        const parts = text.split(' - ');
        return `<div class="help-step"><span class="step-number">${idx + 1}</span><div class="step-content"><strong>${parts[0] || ''}</strong>${parts[1] ? `<p>${parts[1]}</p>` : ''}</div></div>`;
      }).join('');
      return `<div class="help-steps">${steps}</div>`;
    });

    // Convert lists
    const listMatches = html.match(/^- .+$/gm);
    if (listMatches) {
      let inList = false;
      const lines = html.split('\n');
      const newLines: string[] = [];

      lines.forEach(line => {
        if (line.startsWith('- ')) {
          if (!inList) {
            newLines.push('<ul class="help-list">');
            inList = true;
          }
          newLines.push(`<li>${line.substring(2)}</li>`);
        } else {
          if (inList) {
            newLines.push('</ul>');
            inList = false;
          }
          newLines.push(line);
        }
      });

      if (inList) newLines.push('</ul>');
      html = newLines.join('\n');
    }

    // Convert paragraphs (lines that aren't already wrapped)
    html = html.split('\n\n').map(paragraph => {
      paragraph = paragraph.trim();
      if (!paragraph) return '';
      if (paragraph.startsWith('<') || paragraph.startsWith('-')) return paragraph;
      return `<p>${paragraph}</p>`;
    }).join('\n');

    return html;
  }

  private generateBlockId(): string {
    return 'block-' + Math.random().toString(36).substr(2, 9);
  }

  private addBlock(type: string, data: Record<string, unknown> = {}): void {
    const block = {
      id: this.generateBlockId(),
      type,
      data: { ...this.getDefaultBlockData(type), ...data }
    };

    this.helpEditorBlocks.push(block);
    this.renderBlocks();
    this.updateHelpPreview();

    // Open modals for specific block types
    if (type === 'button') {
      this.helpEditorActiveBlockCallback = (selectedData) => {
        block.data = { ...block.data, ...selectedData };
        this.renderBlocks();
        this.updateHelpPreview();
      };
      document.getElementById('helpButtonPickerModal')!.style.display = 'flex';
    } else if (type === 'image') {
      this.helpEditorActiveBlockCallback = (imgData) => {
        block.data = { ...block.data, ...imgData };
        this.renderBlocks();
        this.updateHelpPreview();
      };
      document.getElementById('helpImageUploadModal')!.style.display = 'flex';
    } else if (type === 'video') {
      this.helpEditorActiveBlockCallback = (vidData) => {
        block.data = { ...block.data, ...vidData };
        this.renderBlocks();
        this.updateHelpPreview();
      };
      document.getElementById('helpVideoEmbedModal')!.style.display = 'flex';
    }
  }

  private getDefaultBlockData(type: string): Record<string, unknown> {
    switch (type) {
      case 'text': return { content: '' };
      case 'image': return { src: '', caption: '', size: 'full' };
      case 'video': return { url: '', embedId: '', platform: '' };
      case 'steps': return { steps: [{ title: '', description: '' }] };
      case 'button': return { buttonId: '', name: '', icon: '', location: '', shortcut: '' };
      case 'callout': return { type: 'info', content: '' };
      case 'code': return { language: '', code: '' };
      case 'grid': return { items: [{ title: '', description: '' }, { title: '', description: '' }] };
      default: return {};
    }
  }

  private removeBlock(blockId: string): void {
    this.helpEditorBlocks = this.helpEditorBlocks.filter(b => b.id !== blockId);
    this.renderBlocks();
    this.updateHelpPreview();
  }

  private moveBlock(blockId: string, direction: 'up' | 'down'): void {
    const index = this.helpEditorBlocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.helpEditorBlocks.length) return;

    const block = this.helpEditorBlocks.splice(index, 1)[0];
    this.helpEditorBlocks.splice(newIndex, 0, block);
    this.renderBlocks();
    this.updateHelpPreview();
  }

  private renderBlocks(): void {
    const blockList = document.getElementById('helpBlockList');
    const emptyState = document.getElementById('helpBlockEmptyState');
    const blockCountEl = document.getElementById('helpBlockCount');

    if (!blockList) return;

    if (this.helpEditorBlocks.length === 0) {
      blockList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (blockCountEl) blockCountEl.textContent = '0 blokker';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (blockCountEl) blockCountEl.textContent = `${this.helpEditorBlocks.length} blokk${this.helpEditorBlocks.length !== 1 ? 'er' : ''}`;

    blockList.innerHTML = this.helpEditorBlocks.map((block, index) => this.renderBlockItem(block, index)).join('');

    // Attach event listeners
    blockList.querySelectorAll('.help-block-item').forEach((el, idx) => {
      const blockId = this.helpEditorBlocks[idx].id;

      // Delete button
      el.querySelector('.help-block-action-btn.delete')?.addEventListener('click', () => this.removeBlock(blockId));

      // Move buttons
      el.querySelector('.help-block-action-btn.move-up')?.addEventListener('click', () => this.moveBlock(blockId, 'up'));
      el.querySelector('.help-block-action-btn.move-down')?.addEventListener('click', () => this.moveBlock(blockId, 'down'));

      // Block-specific interactions
      this.attachBlockInteractions(el, idx);
    });

    // Update textarea in code tab
    const contentTextarea = document.getElementById('helpEditContent') as HTMLTextAreaElement;
    if (contentTextarea) {
      contentTextarea.value = this.blocksToMarkup();
    }
  }

  private renderBlockItem(block: {id: string; type: string; data: Record<string, unknown>}, index: number): string {
    const typeLabels: Record<string, string> = {
      text: 'Tekst', image: 'Bilde', video: 'Video', steps: 'Steg',
      button: 'Knapp', callout: 'Callout', code: 'Kode', grid: 'Grid'
    };

    const typeIcons: Record<string, string> = {
      text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
      video: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3V9z"/>',
      steps: '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><path d="M12 7v3m0 4v3"/>',
      button: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M12 12h.01"/>',
      callout: '<path d="M12 9v4m0 4h.01"/><circle cx="12" cy="12" r="10"/>',
      code: '<polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>',
      grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'
    };

    return `
      <div class="help-block-item" data-block-id="${block.id}" draggable="true">
        <div class="help-block-header">
          <div class="help-block-drag-handle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
              <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
              <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
            </svg>
          </div>
          <div class="help-block-type-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${typeIcons[block.type] || ''}</svg>
          </div>
          <span class="help-block-type-label">${typeLabels[block.type] || block.type}</span>
          <div class="help-block-actions">
            <button class="help-block-action-btn move-up" title="Flytt opp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="help-block-action-btn move-down" title="Flytt ned">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="help-block-action-btn delete" title="Slett">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="help-block-content">
          ${this.renderBlockContent(block)}
        </div>
      </div>
    `;
  }

  private renderBlockContent(block: {id: string; type: string; data: Record<string, unknown>}): string {
    switch (block.type) {
      case 'text':
        return `
          <div class="help-block-text-toolbar">
            <button class="help-block-text-btn" data-format="bold"><strong>B</strong></button>
            <button class="help-block-text-btn" data-format="italic"><em>I</em></button>
            <button class="help-block-text-btn" data-format="badge">[b]</button>
            <button class="help-block-text-btn" data-format="kbd">⌘</button>
          </div>
          <textarea class="help-block-text-editor" placeholder="Skriv tekst her...">${block.data.content || ''}</textarea>
        `;

      case 'image':
        if (block.data.src) {
          return `
            <div class="help-block-image-preview">
              <img src="${block.data.src}" alt="">
              <input type="text" class="help-block-image-caption" value="${block.data.caption || ''}" placeholder="Bildetekst (valgfritt)">
            </div>
          `;
        }
        return `
          <div class="help-block-image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span>Klikk for å velge bilde</span>
          </div>
        `;

      case 'video':
        if (block.data.embedId) {
          const platform = block.data.platform as string;
          const embedId = block.data.embedId as string;
          const embedUrl = platform === 'youtube'
            ? `https://www.youtube.com/embed/${embedId}`
            : `https://player.vimeo.com/video/${embedId}`;
          return `
            <div class="help-block-video-embed">
              <iframe src="${embedUrl}" allowfullscreen></iframe>
            </div>
          `;
        }
        return `
          <div class="help-block-image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3V9z"/></svg>
            <span>Klikk for å legge til video</span>
          </div>
        `;

      case 'steps':
        const stepsData = block.data.steps as Array<{title: string; description: string}> || [];
        return `
          <div class="help-block-steps-list">
            ${stepsData.map((step, idx) => `
              <div class="help-block-step-item" data-step-index="${idx}">
                <div class="help-block-step-number">${idx + 1}</div>
                <div class="help-block-step-content">
                  <input type="text" class="help-block-step-title" value="${step.title || ''}" placeholder="Steg tittel...">
                  <textarea class="help-block-step-desc" placeholder="Beskrivelse (valgfritt)...">${step.description || ''}</textarea>
                </div>
              </div>
            `).join('')}
            <button class="help-block-add-step-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Legg til steg
            </button>
          </div>
        `;

      case 'button':
        if (block.data.name) {
          return `
            <div class="help-block-button-ref">
              <div class="help-block-button-icon">
                ${block.data.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="2"/></svg>'}
              </div>
              <div class="help-block-button-info">
                <div class="help-block-button-name">${block.data.name}</div>
                <div class="help-block-button-location">${block.data.location || 'UI-element'}</div>
              </div>
              ${block.data.shortcut ? `<span class="help-block-button-shortcut">${block.data.shortcut}</span>` : ''}
            </div>
          `;
        }
        return `
          <div class="help-block-button-ref" style="justify-content: center;">
            <span style="color: rgba(255,255,255,0.5);">Klikk for å velge knapp</span>
          </div>
        `;

      case 'callout':
        const calloutType = (block.data.type as string) || 'info';
        const calloutIcons: Record<string, string> = {
          info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚫'
        };
        return `
          <div class="help-block-callout-type-selector">
            <button class="help-block-callout-type-btn ${calloutType === 'info' ? 'active' : ''}" data-type="info">ℹ️ Info</button>
            <button class="help-block-callout-type-btn ${calloutType === 'tip' ? 'active' : ''}" data-type="tip">💡 Tips</button>
            <button class="help-block-callout-type-btn ${calloutType === 'warning' ? 'active' : ''}" data-type="warning">⚠️ Advarsel</button>
            <button class="help-block-callout-type-btn ${calloutType === 'danger' ? 'active' : ''}" data-type="danger">🚫 Fare</button>
          </div>
          <div class="help-block-callout ${calloutType}">
            <span class="help-block-callout-icon">${calloutIcons[calloutType]}</span>
            <div class="help-block-callout-content">
              <textarea class="help-block-callout-textarea" placeholder="Skriv melding...">${block.data.content || ''}</textarea>
            </div>
          </div>
        `;

      case 'code':
        return `
          <input type="text" class="help-block-code-lang" value="${block.data.language || ''}" placeholder="Språk (f.eks. javascript, python...)">
          <textarea class="help-block-code-editor" placeholder="// Skriv kode her...">${block.data.code || ''}</textarea>
        `;

      case 'grid':
        const gridItems = block.data.items as Array<{title: string; description: string}> || [];
        return `
          <div class="help-block-grid">
            ${gridItems.map((item, idx) => `
              <div class="help-block-grid-item" data-item-index="${idx}">
                <input type="text" class="help-block-grid-item-title" value="${item.title || ''}" placeholder="Tittel...">
                <textarea class="help-block-grid-item-desc" placeholder="Beskrivelse...">${item.description || ''}</textarea>
              </div>
            `).join('')}
            <button class="help-block-add-grid-item-btn">+ Legg til element</button>
          </div>
        `;

      default:
        return '<p>Ukjent blokk</p>';
    }
  }

  private attachBlockInteractions(blockEl: Element, index: number): void {
    const block = this.helpEditorBlocks[index];

    switch (block.type) {
      case 'text':
        const textEditor = blockEl.querySelector('.help-block-text-editor') as HTMLTextAreaElement;
        textEditor?.addEventListener('input', () => {
          block.data.content = textEditor.value;
          this.updateHelpPreview();
        });

        blockEl.querySelectorAll('.help-block-text-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const format = (btn as HTMLElement).dataset.format;
            if (!textEditor) return;
            const start = textEditor.selectionStart;
            const end = textEditor.selectionEnd;
            const selected = textEditor.value.substring(start, end) || 'tekst';
            let insert = '';
            switch (format) {
              case 'bold': insert = `**${selected}**`; break;
              case 'italic': insert = `*${selected}*`; break;
              case 'badge': insert = `[badge]${selected}[/badge]`; break;
              case 'kbd': insert = `[kbd]${selected}[/kbd]`; break;
            }
            textEditor.value = textEditor.value.substring(0, start) + insert + textEditor.value.substring(end);
            block.data.content = textEditor.value;
            this.updateHelpPreview();
          });
        });
        break;

      case 'image':
        const imgPlaceholder = blockEl.querySelector('.help-block-image-placeholder');
        imgPlaceholder?.addEventListener('click', () => {
          this.helpEditorActiveBlockCallback = (imgData) => {
            block.data = { ...block.data, ...imgData };
            this.renderBlocks();
            this.updateHelpPreview();
          };
          document.getElementById('helpImageUploadModal')!.style.display = 'flex';
        });

        const imgCaption = blockEl.querySelector('.help-block-image-caption') as HTMLInputElement;
        imgCaption?.addEventListener('input', () => {
          block.data.caption = imgCaption.value;
          this.updateHelpPreview();
        });
        break;

      case 'video':
        const vidPlaceholder = blockEl.querySelector('.help-block-image-placeholder');
        vidPlaceholder?.addEventListener('click', () => {
          this.helpEditorActiveBlockCallback = (vidData) => {
            block.data = { ...block.data, ...vidData };
            this.renderBlocks();
            this.updateHelpPreview();
          };
          document.getElementById('helpVideoEmbedModal')!.style.display = 'flex';
        });
        break;

      case 'steps':
        blockEl.querySelectorAll('.help-block-step-item').forEach((stepEl, stepIdx) => {
          const titleInput = stepEl.querySelector('.help-block-step-title') as HTMLInputElement;
          const descInput = stepEl.querySelector('.help-block-step-desc') as HTMLTextAreaElement;

          titleInput?.addEventListener('input', () => {
            (block.data.steps as Array<{title: string; description: string}>)[stepIdx].title = titleInput.value;
            this.updateHelpPreview();
          });
          descInput?.addEventListener('input', () => {
            (block.data.steps as Array<{title: string; description: string}>)[stepIdx].description = descInput.value;
            this.updateHelpPreview();
          });
        });

        blockEl.querySelector('.help-block-add-step-btn')?.addEventListener('click', () => {
          (block.data.steps as Array<{title: string; description: string}>).push({ title: '', description: '' });
          this.renderBlocks();
        });
        break;

      case 'button':
        const btnRef = blockEl.querySelector('.help-block-button-ref');
        btnRef?.addEventListener('click', () => {
          this.helpEditorActiveBlockCallback = (btnData) => {
            block.data = { ...block.data, ...btnData };
            this.renderBlocks();
            this.updateHelpPreview();
          };
          document.getElementById('helpButtonPickerModal')!.style.display = 'flex';
        });
        break;

      case 'callout':
        blockEl.querySelectorAll('.help-block-callout-type-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            block.data.type = (btn as HTMLElement).dataset.type || 'info';
            this.renderBlocks();
            this.updateHelpPreview();
          });
        });

        const calloutTextarea = blockEl.querySelector('.help-block-callout-textarea') as HTMLTextAreaElement;
        calloutTextarea?.addEventListener('input', () => {
          block.data.content = calloutTextarea.value;
          this.updateHelpPreview();
        });
        break;

      case 'code':
        const langInput = blockEl.querySelector('.help-block-code-lang') as HTMLInputElement;
        const codeEditor = blockEl.querySelector('.help-block-code-editor') as HTMLTextAreaElement;

        langInput?.addEventListener('input', () => {
          block.data.language = langInput.value;
          this.updateHelpPreview();
        });
        codeEditor?.addEventListener('input', () => {
          block.data.code = codeEditor.value;
          this.updateHelpPreview();
        });
        break;

      case 'grid':
        blockEl.querySelectorAll('.help-block-grid-item').forEach((itemEl, itemIdx) => {
          const titleInput = itemEl.querySelector('.help-block-grid-item-title') as HTMLInputElement;
          const descInput = itemEl.querySelector('.help-block-grid-item-desc') as HTMLTextAreaElement;

          titleInput?.addEventListener('input', () => {
            (block.data.items as Array<{title: string; description: string}>)[itemIdx].title = titleInput.value;
            this.updateHelpPreview();
          });
          descInput?.addEventListener('input', () => {
            (block.data.items as Array<{title: string; description: string}>)[itemIdx].description = descInput.value;
            this.updateHelpPreview();
          });
        });

        blockEl.querySelector('.help-block-add-grid-item-btn')?.addEventListener('click', () => {
          (block.data.items as Array<{title: string; description: string}>).push({ title: '', description: '' });
          this.renderBlocks();
        });
        break;
    }
  }

  private blocksToMarkup(): string {
    return this.helpEditorBlocks.map(block => {
      switch (block.type) {
        case 'text':
          return block.data.content as string || '';
        case 'image':
          if (block.data.src) {
            return `[bilde src="${block.data.src}"${block.data.caption ? ` caption="${block.data.caption}"` : ''}]`;
          }
          return '';
        case 'video':
          if (block.data.embedId) {
            return `[video platform="${block.data.platform}" id="${block.data.embedId}"]`;
          }
          return '';
        case 'steps':
          const steps = block.data.steps as Array<{title: string; description: string}> || [];
          const stepLines = steps.map((s, i) => `${i + 1}. ${s.title}${s.description ? ' - ' + s.description : ''}`);
          return `[steg]\n${stepLines.join('\n')}\n[/steg]`;
        case 'button':
          if (block.data.name) {
            return `[knapp id="${block.data.buttonId}" shortcut="${block.data.shortcut || ''}"]${block.data.name}[/knapp]`;
          }
          return '';
        case 'callout':
          return `[callout type="${block.data.type || 'info'}"]\n${block.data.content || ''}\n[/callout]`;
        case 'code':
          return `[kode lang="${block.data.language || ''}"]\n${block.data.code || ''}\n[/kode]`;
        case 'grid':
          const items = block.data.items as Array<{title: string; description: string}> || [];
          const itemLines = items.map(item => `[item]${item.title}|${item.description}[/item]`);
          return `[grid]\n${itemLines.join('\n')}\n[/grid]`;
        default:
          return '';
      }
    }).filter(Boolean).join('\n\n');
  }

  private blocksToHtml(): string {
    return this.helpEditorBlocks.map(block => {
      switch (block.type) {
        case 'text':
          return this.markupToHtml(block.data.content as string || '');
        case 'image':
          if (block.data.src) {
            const sizeClass = block.data.size === 'small' ? 'help-img-small' : block.data.size === 'medium' ? 'help-img-medium' : '';
            return `<figure class="help-image ${sizeClass}"><img src="${block.data.src}" alt="">${block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ''}</figure>`;
          }
          return '';
        case 'video':
          if (block.data.embedId) {
            const platform = block.data.platform as string;
            const embedId = block.data.embedId as string;
            const embedUrl = platform === 'youtube'
              ? `https://www.youtube.com/embed/${embedId}`
              : `https://player.vimeo.com/video/${embedId}`;
            return `<div class="help-video-embed"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`;
          }
          return '';
        case 'steps':
          const steps = block.data.steps as Array<{title: string; description: string}> || [];
          const stepsHtml = steps.map((s, i) => `<div class="help-step"><span class="step-number">${i + 1}</span><div class="step-content"><strong>${s.title}</strong>${s.description ? `<p>${s.description}</p>` : ''}</div></div>`);
          return `<div class="help-steps">${stepsHtml.join('')}</div>`;
        case 'button':
          if (block.data.name) {
            return `<div class="help-button-ref"><span class="help-badge">${block.data.name}</span>${block.data.shortcut ? `<kbd>${block.data.shortcut}</kbd>` : ''}</div>`;
          }
          return '';
        case 'callout':
          const calloutIcons: Record<string, string> = { info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚫' };
          const cType = (block.data.type as string) || 'info';
          return `<div class="help-callout help-callout-${cType}"><span class="help-callout-icon">${calloutIcons[cType]}</span><div>${block.data.content || ''}</div></div>`;
        case 'code':
          return `<pre class="help-code"><code class="language-${block.data.language || ''}">${block.data.code || ''}</code></pre>`;
        case 'grid':
          const items = block.data.items as Array<{title: string; description: string}> || [];
          const gridHtml = items.map(item => `<div class="help-feature-item"><strong>${item.title}</strong><span>${item.description}</span></div>`);
          return `<div class="help-feature-grid">${gridHtml.join('')}</div>`;
        default:
          return '';
      }
    }).filter(Boolean).join('\n');
  }

  private markupToBlocks(markup: string): void {
    this.helpEditorBlocks = [];
    if (!markup.trim()) return;

    // Simple parsing - just create text blocks for now
    const lines = markup.split('\n');
    let currentText = '';

    lines.forEach(line => {
      currentText += line + '\n';
    });

    if (currentText.trim()) {
      this.helpEditorBlocks.push({
        id: this.generateBlockId(),
        type: 'text',
        data: { content: currentText.trim() }
      });
    }
  }

  private htmlToBlocks(html: string): void {
    // Convert HTML to blocks - simplified version
    this.helpEditorBlocks = [];
    const markup = this.htmlToMarkup(html);

    if (markup.trim()) {
      this.helpEditorBlocks.push({
        id: this.generateBlockId(),
        type: 'text',
        data: { content: markup }
      });
    }
  }

  private setupButtonPickerModal(): void {
    const modal = document.getElementById('helpButtonPickerModal');
    const closeBtn = document.getElementById('helpButtonPickerClose');
    const searchInput = document.getElementById('helpButtonPickerSearch') as HTMLInputElement;
    const grid = document.getElementById('helpButtonPickerGrid');

    // UI Button database
    const uiButtons = [
      { id: 'importModel', name: 'Importer modell', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>', location: 'Verktøylinje', shortcut: 'Ctrl+I', category: 'toolbar' },
      { id: 'addLight', name: 'Legg til lys', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>', location: 'Verktøylinje', shortcut: '', category: 'toolbar' },
      { id: 'cameraA', name: 'Kamera A', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>', location: 'Kamera panel', shortcut: '1', category: 'panel' },
      { id: 'cameraB', name: 'Kamera B', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>', location: 'Kamera panel', shortcut: '2', category: 'panel' },
      { id: 'studioLibrary', name: 'Studio Library', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', location: 'Venstre panel', shortcut: 'L', category: 'panel' },
      { id: 'export', name: 'Eksporter', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', location: 'Meny', shortcut: 'Ctrl+E', category: 'menu' },
      { id: 'save', name: 'Lagre scene', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>', location: 'Meny', shortcut: 'Ctrl+S', category: 'menu' },
      { id: 'undo', name: 'Angre', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>', location: 'Snarvei', shortcut: 'Ctrl+Z', category: 'shortcut' },
      { id: 'redo', name: 'Gjør om', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', location: 'Snarvei', shortcut: 'Ctrl+Y', category: 'shortcut' },
      { id: 'delete', name: 'Slett', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', location: 'Snarvei', shortcut: 'Delete', category: 'shortcut' },
      { id: 'rotate', name: 'Roter', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', location: 'Transform', shortcut: 'R', category: 'toolbar' },
      { id: 'scale', name: 'Skaler', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>', location: 'Transform', shortcut: 'S', category: 'toolbar' },
      { id: 'move', name: 'Flytt', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>', location: 'Transform', shortcut: 'G', category: 'toolbar' },
    ];

    let filteredButtons = [...uiButtons];

    const renderButtons = () => {
      if (!grid) return;
      grid.innerHTML = filteredButtons.map(btn => `
        <div class="help-button-picker-item" data-button-id="${btn.id}">
          <div class="help-button-picker-item-icon">${btn.icon}</div>
          <div class="help-button-picker-item-name">${btn.name}</div>
          ${btn.shortcut ? `<div class="help-button-picker-item-shortcut">${btn.shortcut}</div>` : ''}
        </div>
      `).join('');

      grid.querySelectorAll('.help-button-picker-item').forEach(item => {
        item.addEventListener('click', () => {
          const btnId = (item as HTMLElement).dataset.buttonId;
          const btn = uiButtons.find(b => b.id === btnId);
          if (btn && this.helpEditorActiveBlockCallback) {
            this.helpEditorActiveBlockCallback({
              buttonId: btn.id,
              name: btn.name,
              icon: btn.icon,
              location: btn.location,
              shortcut: btn.shortcut
            });
            this.helpEditorActiveBlockCallback = null;
          }
          if (modal) modal.style.display = 'none';
        });
      });
    };

    // Category filters
    document.querySelectorAll('.help-button-picker-cat').forEach(cat => {
      cat.addEventListener('click', () => {
        document.querySelectorAll('.help-button-picker-cat').forEach(c => c.classList.remove('active'));
        cat.classList.add('active');
        const category = (cat as HTMLElement).dataset.category;
        filteredButtons = category === 'all' ? [...uiButtons] : uiButtons.filter(b => b.category === category);
        renderButtons();
      });
    });

    // Search
    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      const activeCategory = document.querySelector('.help-button-picker-cat.active')?.getAttribute('data-category') || 'all';
      filteredButtons = uiButtons.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(query) || b.shortcut.toLowerCase().includes(query);
        const matchesCategory = activeCategory === 'all' || b.category === activeCategory;
        return matchesSearch && matchesCategory;
      });
      renderButtons();
    });

    closeBtn?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      this.helpEditorActiveBlockCallback = null;
    });

    renderButtons();
  }

  private setupImageUploadModal(): void {
    const modal = document.getElementById('helpImageUploadModal');
    const closeBtn = document.getElementById('helpImageUploadClose');
    const cancelBtn = document.getElementById('helpImageUploadCancel');
    const insertBtn = document.getElementById('helpImageUploadInsert');
    const dropzone = document.getElementById('helpImageDropzone');
    const fileInput = document.getElementById('helpImageUploadInput') as HTMLInputElement;
    const uploadBtn = document.getElementById('helpImageUploadBtn');
    const urlInput = document.getElementById('helpImageUrlInput') as HTMLInputElement;
    const previewContainer = document.getElementById('helpImageUploadPreview');
    const previewImg = document.getElementById('helpImagePreviewImg') as HTMLImageElement;
    const captionInput = document.getElementById('helpImageCaption') as HTMLInputElement;
    const sizeSelect = document.getElementById('helpImageSize') as HTMLSelectElement;

    let currentImageSrc = '';

    const showPreview = (src: string) => {
      currentImageSrc = src;
      if (previewImg) previewImg.src = src;
      if (previewContainer) previewContainer.style.display = 'block';
      if (insertBtn) (insertBtn as HTMLButtonElement).disabled = false;
    };

    const resetModal = () => {
      currentImageSrc = '';
      if (previewContainer) previewContainer.style.display = 'none';
      if (urlInput) urlInput.value = '';
      if (captionInput) captionInput.value = '';
      if (sizeSelect) sizeSelect.value = 'full';
      if (insertBtn) (insertBtn as HTMLButtonElement).disabled = true;
    };

    // Drag and drop
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const files = (e as DragEvent).dataTransfer?.files;
      if (files && files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) showPreview(ev.target.result as string);
        };
        reader.readAsDataURL(files[0]);
      }
    });

    // File input
    uploadBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) showPreview(ev.target.result as string);
        };
        reader.readAsDataURL(fileInput.files[0]);
      }
    });

    // URL input
    urlInput?.addEventListener('input', () => {
      if (urlInput.value.trim()) {
        showPreview(urlInput.value.trim());
      }
    });

    // Insert
    insertBtn?.addEventListener('click', () => {
      if (currentImageSrc && this.helpEditorActiveBlockCallback) {
        this.helpEditorActiveBlockCallback({
          src: currentImageSrc,
          caption: captionInput?.value || '',
          size: sizeSelect?.value || 'full'
        });
        this.helpEditorActiveBlockCallback = null;
      }
      if (modal) modal.style.display = 'none';
      resetModal();
    });

    // Close
    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      this.helpEditorActiveBlockCallback = null;
      resetModal();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
  }

  private setupVideoEmbedModal(): void {
    const modal = document.getElementById('helpVideoEmbedModal');
    const closeBtn = document.getElementById('helpVideoEmbedClose');
    const cancelBtn = document.getElementById('helpVideoEmbedCancel');
    const insertBtn = document.getElementById('helpVideoEmbedInsert');
    const urlInput = document.getElementById('helpVideoUrlInput') as HTMLInputElement;
    const previewContainer = document.getElementById('helpVideoEmbedPreview');

    let currentVideoData: {platform: string; embedId: string} | null = null;

    const parseVideoUrl = (url: string): {platform: string; embedId: string} | null => {
      // YouTube
      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return { platform: 'youtube', embedId: ytMatch[1] };

      // Vimeo
      const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
      if (vimeoMatch) return { platform: 'vimeo', embedId: vimeoMatch[1] };

      return null;
    };

    const showPreview = (data: {platform: string; embedId: string}) => {
      currentVideoData = data;
      const embedUrl = data.platform === 'youtube'
        ? `https://www.youtube.com/embed/${data.embedId}`
        : `https://player.vimeo.com/video/${data.embedId}`;

      if (previewContainer) {
        previewContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
      }
      if (insertBtn) (insertBtn as HTMLButtonElement).disabled = false;
    };

    const resetModal = () => {
      currentVideoData = null;
      if (previewContainer) previewContainer.innerHTML = '';
      if (urlInput) urlInput.value = '';
      if (insertBtn) (insertBtn as HTMLButtonElement).disabled = true;
    };

    urlInput?.addEventListener('input', () => {
      const data = parseVideoUrl(urlInput.value);
      if (data) {
        showPreview(data);
      } else {
        currentVideoData = null;
        if (previewContainer) previewContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Lim inn en gyldig YouTube eller Vimeo URL</p>';
        if (insertBtn) (insertBtn as HTMLButtonElement).disabled = true;
      }
    });

    insertBtn?.addEventListener('click', () => {
      if (currentVideoData && this.helpEditorActiveBlockCallback) {
        this.helpEditorActiveBlockCallback(currentVideoData);
        this.helpEditorActiveBlockCallback = null;
      }
      if (modal) modal.style.display = 'none';
      resetModal();
    });

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      this.helpEditorActiveBlockCallback = null;
      resetModal();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
  }

  private setupUserProfileButtons(): void {
    document.getElementById('profileLoginBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-show-login'));
    });

    document.getElementById('profileLogoutBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-logout'));
    });

    document.getElementById('profileRegisterBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ch-show-register'));
    });
  }

  private exportPdf(): void {
    BABYLON.Tools.CreateScreenshot(
      this.engine,
      this.camera,
      { width: 1920, height: 1080 },
      (screenshotData: string) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('nb-NO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const lightsArray = Array.from(this.lights.values());
        const cameraSettings = {
          focalLength: 50,
          aperture: 2.8,
          iso: 100,
          shutter: '1/125'
        };

        const notes = JSON.parse(localStorage.getItem('virtualstudio_notes') || '[]');
        const notesHtml = notes.length > 0 
          ? notes.map((n: any) => `<div style="margin-bottom:8px;"><strong>${n.title}</strong><br/><span style="color:#666;">${n.content || ''}</span></div>`).join('')
          : '<p style="color:#888;">Ingen notater</p>';

        const lightsHtml = lightsArray.length > 0
          ? lightsArray.map((l: LightData) => `<div style="margin-bottom:4px;">• ${l.type || 'Lys'} - ${l.light?.intensity?.toFixed(1) || '1.0'} intensitet</div>`).join('')
          : '<p style="color:#888;">Ingen lys i scenen</p>';

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Virtual Studio - Lysoppsett</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', sans-serif; background: #1a1a1a; color: #fff; padding: 40px; }
              .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .title { font-size: 28px; font-weight: 700; color: #00a8ff; }
              .date { color: #888; font-size: 14px; }
              .screenshot { width: 100%; border-radius: 8px; margin-bottom: 30px; border: 2px solid #333; }
              .section { background: #252525; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
              .section-title { font-size: 16px; font-weight: 600; color: #fbbf24; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
              .section-title.camera { color: #00a8ff; }
              .section-title.notes { color: #10b981; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
              .param { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
              .param-label { color: #888; }
              .param-value { font-weight: 600; }
              .footer { text-align: center; color: #555; font-size: 12px; margin-top: 30px; }
              @media print {
                body { background: white; color: black; }
                .section { background: #f5f5f5; }
                .section-title { color: #333; }
                .param-label { color: #666; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Virtual Studio - Lysoppsett</div>
              <div class="date">${dateStr}</div>
            </div>
            
            <img class="screenshot" src="${screenshotData}" alt="Studio oppsett" />
            
            <div class="grid">
              <div class="section">
                <div class="section-title">🎥 Kamerainnstillinger</div>
                <div class="param"><span class="param-label">Brennvidde</span><span class="param-value">${cameraSettings.focalLength}mm</span></div>
                <div class="param"><span class="param-label">Blender</span><span class="param-value">f/${cameraSettings.aperture}</span></div>
                <div class="param"><span class="param-label">ISO</span><span class="param-value">${cameraSettings.iso}</span></div>
                <div class="param"><span class="param-label">Lukker</span><span class="param-value">${cameraSettings.shutter}s</span></div>
              </div>
              
              <div class="section">
                <div class="section-title" style="color:#fbbf24;">💡 Lys (${lightsArray.length})</div>
                ${lightsHtml}
              </div>
            </div>
            
            <div class="section">
              <div class="section-title notes">📝 Notater</div>
              ${notesHtml}
            </div>
            
            <div class="footer">
              Generert med Virtual Studio | ${dateStr}
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
      }
    );
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
        // Check if light type is specified in asset data
        const lightType = asset.data?.userData?.lightId || 
                         asset.data?.userData?.specifications?.lightId ||
                         asset.data?.lightId ||
                         'godox-ad600'; // Default fallback
        
        // Also check if we have light specs that match a known light ID
        if (asset.data?.userData?.specifications || asset.data?.userData) {
          const userData = asset.data?.userData || {};
          const specs = userData.specifications || {};
          
          // Try to find matching light ID from brand/model
          if (userData.brand && userData.model) {
            const searchKey = `${userData.brand} ${userData.model}`.toLowerCase();
            // Map common light models to their IDs
            if (searchKey.includes('aputure') && (searchKey.includes('300d') || searchKey.includes('ls 300'))) {
              this.addLight('aputure-300d', pos);
              return;
            } else if (searchKey.includes('aputure') && (searchKey.includes('120d') || searchKey.includes('ls 120'))) {
              this.addLight('aputure-120d', pos);
              return;
            } else if (searchKey.includes('aputure') && (searchKey.includes('600d') || searchKey.includes('ls 600'))) {
              this.addLight('aputure-600d', pos);
              return;
            } else if (searchKey.includes('godox') && searchKey.includes('ad200')) {
              this.addLight('godox-ad200pro', pos);
              return;
            } else if (searchKey.includes('godox') && searchKey.includes('ad400')) {
              this.addLight('godox-ad400pro', pos);
              return;
            } else if (searchKey.includes('godox') && searchKey.includes('ad600')) {
              this.addLight('godox-ad600pro', pos);
              return;
            } else if (searchKey.includes('profoto') && searchKey.includes('b10 plus')) {
              this.addLight('profoto-b10plus', pos);
              return;
            } else if (searchKey.includes('profoto') && searchKey.includes('b10')) {
              this.addLight('profoto-b10', pos);
              return;
            } else if (searchKey.includes('profoto') && searchKey.includes('d2')) {
              this.addLight('profoto-d2', pos);
              return;
            }
          }
        }
        
        this.addLight(lightType, pos);
      } else {
        this.loadAssetFromLibrary(asset.id, asset.title, asset.data, pos);
      }
    }) as EventListener);

    // Listen for scene node selection changes
    window.addEventListener('ch-scene-node-selected', ((e: CustomEvent) => {
      const { nodeId } = e.detail;
      if (nodeId) {
        const store = useAppStore.getState();
        const node = store.getNode(nodeId);
        if (node && (node.type === 'actor' || node.type === 'model')) {
          this.selectedActorId = nodeId;
          this.selectedLightId = null;
          this.updateTopViewInfoPanel();
        } else {
          // If selected node is not an actor, clear actor selection
          if (this.selectedActorId === nodeId) {
            this.selectedActorId = null;
            this.updateTopViewInfoPanel();
          }
        }
      } else {
        // No node selected
        this.selectedActorId = null;
        this.updateTopViewInfoPanel();
      }
    }) as EventListener);

    // Listen for scene node removal
    window.addEventListener('ch-scene-node-removed', ((e: CustomEvent) => {
      const { nodeId } = e.detail;
      if (this.selectedActorId === nodeId) {
        this.selectedActorId = null;
        this.updateTopViewInfoPanel();
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

    window.addEventListener('ch-add-light', (async (e: CustomEvent) => {
      const { id: nodeId, brand, model, type, power, powerUnit, cct, cri, lux1m, beamAngle, guideNumber, lumens } = e.detail;
      console.log('Adding light from library:', brand, model);
      
      const position = new BABYLON.Vector3(
        Math.random() * 4 - 2,
        3 + Math.random() * 2,
        Math.random() * 4 - 2
      );
      
      // Find light ID from brand and model
      let lightId: string | null = null;
      if (brand && model) {
        const searchKey = `${brand} ${model}`.toLowerCase();
        // Try to find matching light ID from LIGHT_DATABASE (it's an array)
        const foundLight = LIGHT_DATABASE.find(light => {
          const lightKey = `${light.brand} ${light.model}`.toLowerCase();
          return lightKey === searchKey;
        });
        if (foundLight) {
          lightId = foundLight.id;
        }
      }
      
      // Use light ID if found, otherwise fall back to extracting from id
      if (!lightId && nodeId && nodeId.startsWith('light-')) {
        // Extract light ID from nodeId format: 'light-aputure-300d-123456'
        const parts = nodeId.split('-');
        if (parts.length >= 3) {
          lightId = parts.slice(1, -1).join('-'); // Get 'aputure-300d' from 'light-aputure-300d-123456'
        }
      }
      
      // Fallback to default if still not found
      if (!lightId) {
        lightId = 'godox-ad600';
      }
      
      // Use addLight to ensure 3D models are loaded
      // This creates both the light and the 3D model, and they are automatically connected
      const lightDataId = await this.addLight(lightId, position);
      
      // Store the nodeId in the light data so we can link them
      if (lightDataId && nodeId) {
        const lightData = this.lights.get(lightDataId);
        if (lightData) {
          // Store the nodeId so we can link the store node to the actual light
          (lightData as any).nodeId = nodeId;
        }
      }
    }) as EventListener);

    window.addEventListener('applyScenarioPreset', ((e: CustomEvent) => {
      const preset = e.detail;
      console.log('Applying scenario preset:', preset.id, preset.title);
      this.applyScenarioPreset(preset);
    }) as EventListener);

    // Handler for applying lighting patterns from LightPatternLibrary and CinematographyPatternsPanel
    window.addEventListener('applyLightPattern', (async (e: CustomEvent) => {
      const pattern = e.detail;
      console.log('Applying light pattern:', pattern.name || pattern.id);
      await this.applyLightPattern(pattern);
    }) as EventListener);

    // Handler for applying cinematography patterns
    window.addEventListener('applyCinematographyPattern', (async (e: CustomEvent) => {
      const pattern = e.detail;
      console.log('Applying cinematography pattern:', pattern.name || pattern.id);
      await this.applyLightPattern(pattern);
    }) as EventListener);

    window.addEventListener('showRecommendedAssets', ((e: CustomEvent) => {
      const preset = e.detail;
      console.log('Showing recommended assets for:', preset.id);
    }) as EventListener);

    window.addEventListener('getSceneConfig', (() => {
      const config = this.getCurrentSceneConfig();
      window.dispatchEvent(new CustomEvent('sceneConfigResponse', { detail: config }));
    }) as EventListener);

    window.addEventListener('ch-apply-animation-preset', ((e: CustomEvent) => {
      const preset = e.detail;
      console.log('Applying animation preset:', preset.name, preset.category);
      this.applyAnimationPreset(preset);
    }) as EventListener);

    window.addEventListener('ch-apply-animation-combo', ((e: CustomEvent) => {
      const comboData = e.detail;
      console.log('Applying animation combo:', comboData.items.length, 'items,', comboData.mode);
      this.applyAnimationCombo(comboData);
    }) as EventListener);

    window.addEventListener('ch-toggle-walls', ((e: CustomEvent) => {
      const visible = e.detail?.visible;
      const isVisible = this.toggleWalls(visible);
      window.dispatchEvent(new CustomEvent('ch-walls-visibility-changed', { detail: { visible: isVisible } }));
    }) as EventListener);

    window.addEventListener('ch-toggle-wall', ((e: CustomEvent) => {
      const { wallId, visible } = e.detail || {};
      if (wallId) {
        const isVisible = this.toggleWall(wallId, visible);
        window.dispatchEvent(new CustomEvent('ch-wall-visibility-changed', { detail: { wallId, visible: isVisible } }));
      }
    }) as EventListener);

    window.addEventListener('ch-toggle-floor', ((e: CustomEvent) => {
      const visible = e.detail?.visible;
      const isVisible = this.toggleFloor(visible);
      window.dispatchEvent(new CustomEvent('ch-floor-visibility-changed', { detail: { visible: isVisible } }));
    }) as EventListener);

    window.addEventListener('ch-set-wall-color', ((e: CustomEvent) => {
      const { color, wallId } = e.detail || {};
      if (color) this.setWallColor(color, wallId);
    }) as EventListener);

    window.addEventListener('ch-set-floor-color', ((e: CustomEvent) => {
      const color = e.detail?.color;
      if (color) this.setFloorColor(color);
    }) as EventListener);

    window.addEventListener('ch-toggle-grid', ((e: CustomEvent) => {
      const visible = e.detail?.visible;
      this.toggleGrid(visible);
    }) as EventListener);

    // Backdrop loading event handlers
    window.addEventListener('ch-load-backdrop', ((e: CustomEvent) => {
      const { backdropId, category, scale, applyEnvironmentMap, applyAmbientLight, receiveShadow } = e.detail || {};
      console.log('Loading backdrop:', backdropId, category);
      this.loadBackdrop(backdropId, { category, scale, applyEnvironmentMap, applyAmbientLight, receiveShadow });
    }) as EventListener);

    window.addEventListener('ch-remove-backdrop', (() => {
      console.log('Removing backdrop');
      this.removeBackdrop();
    }) as EventListener);

    window.addEventListener('ch-add-casting-candidate', ((e: CustomEvent) => {
      const { candidate, generateAvatar } = e.detail;
      console.log('Adding casting candidate to scene:', candidate.name);
      
      const position = candidate.position 
        ? new BABYLON.Vector3(candidate.position.x, candidate.position.y, candidate.position.z)
        : new BABYLON.Vector3(0, 0, 0);
      
      if (candidate.avatarUrl) {
        this.loadCastingAvatarModel(candidate.candidateId, candidate.name, candidate.avatarUrl, position);
      } else if (generateAvatar && candidate.photo) {
        this.generateAndLoadCastingAvatar(candidate.candidateId, candidate.name, candidate.photo, position);
      } else {
        this.createPlaceholderActor(candidate.candidateId, candidate.name, position);
      }
    }) as EventListener);

    window.addEventListener('ch-generate-avatar-from-casting', (async (e: CustomEvent) => {
      const { candidateId, candidateName, photoUrl } = e.detail;
      console.log('Generating avatar from casting photo:', candidateName);
      await this.generateAvatarFromCastingPhoto(candidateId, candidateName, photoUrl);
    }) as EventListener);

    window.addEventListener('ch-update-candidate-avatar', ((e: CustomEvent) => {
      const { candidateId, avatarUrl } = e.detail;
      console.log('Updating candidate avatar:', candidateId);
      this.updateCandidateAvatarModel(candidateId, avatarUrl);
    }) as EventListener);

    window.addEventListener('ch-remove-casting-candidate', ((e: CustomEvent) => {
      const { candidateId } = e.detail;
      console.log('Removing casting candidate:', candidateId);
      this.removeCastingCandidate(candidateId);
    }) as EventListener);

    window.addEventListener('ch-clear-casting-candidates', (() => {
      console.log('Clearing all casting candidates from scene');
      this.clearAllCastingCandidates();
    }) as EventListener);

    window.addEventListener('ch-apply-shot-list-preset', ((e: CustomEvent) => {
      const preset = e.detail;
      console.log('Applying shot list preset:', preset.shotListId);
      this.applyShotListPreset(preset);
    }) as EventListener);

    window.addEventListener('ch-apply-lighting-preset', ((e: CustomEvent) => {
      const { presetId, presetName, lights } = e.detail;
      console.log(`[Lighting Preset] Applying "${presetName}" with ${lights.length} lights`);
      this.applyLightingPreset(presetId, presetName, lights);
    }) as EventListener);

    window.addEventListener('ch-create-scene-banner', ((e: CustomEvent) => {
      const { text, options } = e.detail;
      console.log(`[Scene Banner] Creating banner: "${text}"`);
      this.createSceneBanner(text, options);
    }) as EventListener);

    window.addEventListener('ch-remove-scene-banner', (() => {
      this.removeSceneBanner();
    }) as EventListener);
  }

  private defaultCameraPosition = {
    alpha: -Math.PI / 2,
    beta: Math.PI / 3,
    radius: 12,
    target: new BABYLON.Vector3(0, 1.5, 0)
  };

  private resetCameraToDefault(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.camera) {
        resolve();
        return;
      }

      const fps = 30;
      const resetDuration = 0.5;
      const resetFrames = resetDuration * fps;

      const alphaAnim = new BABYLON.Animation('resetAlpha', 'alpha', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      alphaAnim.setKeys([
        { frame: 0, value: this.camera.alpha },
        { frame: resetFrames, value: this.defaultCameraPosition.alpha }
      ]);

      const betaAnim = new BABYLON.Animation('resetBeta', 'beta', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      betaAnim.setKeys([
        { frame: 0, value: this.camera.beta },
        { frame: resetFrames, value: this.defaultCameraPosition.beta }
      ]);

      const radiusAnim = new BABYLON.Animation('resetRadius', 'radius', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      radiusAnim.setKeys([
        { frame: 0, value: this.camera.radius },
        { frame: resetFrames, value: this.defaultCameraPosition.radius }
      ]);

      const easing = new BABYLON.QuadraticEase();
      easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
      alphaAnim.setEasingFunction(easing);
      betaAnim.setEasingFunction(easing);
      radiusAnim.setEasingFunction(easing);

      this.camera.animations = [alphaAnim, betaAnim, radiusAnim];
      this.camera.setTarget(this.defaultCameraPosition.target);

      this.scene.beginAnimation(this.camera, 0, resetFrames, false, 1, () => {
        console.log('Camera reset to default position');
        resolve();
      });
    });
  }

  private applyAnimationPreset(preset: { id: string; name: string; category: string; duration: number; easing: string; keyframes: number; autoResetCamera?: boolean }): void {
    const fps = 30;
    const totalFrames = preset.duration * fps;
    const shouldResetCamera = preset.autoResetCamera !== false;
    
    const easingFunction = this.getEasingFunction(preset.easing);
    
    if (preset.category === 'kamera') {
      if (shouldResetCamera) {
        this.resetCameraToDefault().then(() => {
          this.animateCamera(preset.id, totalFrames, fps, easingFunction);
        });
      } else {
        this.animateCamera(preset.id, totalFrames, fps, easingFunction);
      }
    } else if (preset.category === 'lys') {
      this.animateLights(preset.id, totalFrames, fps, easingFunction);
    } else if (preset.category === 'overgang' || preset.category === 'effekt') {
      this.animateEffect(preset.id, totalFrames, fps, easingFunction);
    }
    
    console.log(`Animation "${preset.name}" started - ${preset.duration}s @ ${fps}fps`);
  }

  private async applyAnimationCombo(comboData: { 
    items: Array<{ id: string; name: string; category: string; duration: number; easing: string; keyframes: number; speedMultiplier?: number }>;
    mode: 'parallel' | 'sequential';
    totalDuration: number;
    autoResetCamera?: boolean;
  }): Promise<void> {
    const { items, mode, autoResetCamera = true } = comboData;
    const fps = 30;

    const hasCameraAnimation = items.some(item => item.category === 'kamera');
    if (hasCameraAnimation && autoResetCamera) {
      await this.resetCameraToDefault();
    }

    if (mode === 'parallel') {
      items.forEach(preset => {
        const totalFrames = preset.duration * fps;
        const easingFunction = this.getEasingFunction(preset.easing);
        
        if (preset.category === 'kamera') {
          this.animateCamera(preset.id, totalFrames, fps, easingFunction);
        } else if (preset.category === 'lys') {
          this.animateLights(preset.id, totalFrames, fps, easingFunction);
        } else if (preset.category === 'overgang' || preset.category === 'effekt') {
          this.animateEffect(preset.id, totalFrames, fps, easingFunction);
        }
      });
      console.log(`Combo (parallel) started - ${items.length} animations`);
    } else {
      let delay = 0;
      for (const preset of items) {
        await new Promise<void>(resolve => {
          setTimeout(() => {
            const totalFrames = preset.duration * fps;
            const easingFunction = this.getEasingFunction(preset.easing);
            
            if (preset.category === 'kamera') {
              this.animateCamera(preset.id, totalFrames, fps, easingFunction);
            } else if (preset.category === 'lys') {
              this.animateLights(preset.id, totalFrames, fps, easingFunction);
            } else if (preset.category === 'overgang' || preset.category === 'effekt') {
              this.animateEffect(preset.id, totalFrames, fps, easingFunction);
            }
            
            setTimeout(resolve, preset.duration * 1000);
          }, delay);
        });
        delay = 0;
      }
      console.log(`Combo (sequential) completed - ${items.length} animations`);
    }
  }

  private getEasingFunction(easing: string): BABYLON.EasingFunction | undefined {
    switch (easing) {
      case 'easeIn':
        const easeIn = new BABYLON.QuadraticEase();
        easeIn.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEIN);
        return easeIn;
      case 'easeOut':
        const easeOut = new BABYLON.QuadraticEase();
        easeOut.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        return easeOut;
      case 'easeInOut':
        const easeInOut = new BABYLON.QuadraticEase();
        easeInOut.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        return easeInOut;
      case 'sine':
        const sine = new BABYLON.SineEase();
        sine.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        return sine;
      default:
        return undefined;
    }
  }

  private animateCamera(presetId: string, totalFrames: number, fps: number, easing?: BABYLON.EasingFunction): void {
    if (!this.camera) return;
    
    const startRadius = this.camera.radius;
    const startAlpha = this.camera.alpha;
    const startBeta = this.camera.beta;
    
    let animation: BABYLON.Animation;
    let keys: { frame: number; value: number }[] = [];
    
    switch (presetId) {
      case 'dolly_in':
        animation = new BABYLON.Animation('dollyIn', 'radius', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        keys = [
          { frame: 0, value: startRadius },
          { frame: totalFrames, value: Math.max(startRadius * 0.5, 2) }
        ];
        break;
        
      case 'dolly_out':
        animation = new BABYLON.Animation('dollyOut', 'radius', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        keys = [
          { frame: 0, value: startRadius },
          { frame: totalFrames, value: startRadius * 2 }
        ];
        break;
        
      case 'orbit_360':
        animation = new BABYLON.Animation('orbit', 'alpha', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        keys = [
          { frame: 0, value: startAlpha },
          { frame: totalFrames * 0.25, value: startAlpha + Math.PI * 0.5 },
          { frame: totalFrames * 0.5, value: startAlpha + Math.PI },
          { frame: totalFrames * 0.75, value: startAlpha + Math.PI * 1.5 },
          { frame: totalFrames, value: startAlpha + Math.PI * 2 }
        ];
        break;
        
      case 'crane_up':
        animation = new BABYLON.Animation('craneUp', 'beta', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        keys = [
          { frame: 0, value: startBeta },
          { frame: totalFrames, value: Math.max(startBeta - 0.5, 0.3) }
        ];
        break;
        
      case 'slow_pan':
        animation = new BABYLON.Animation('slowPan', 'alpha', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        keys = [
          { frame: 0, value: startAlpha },
          { frame: totalFrames, value: startAlpha + Math.PI * 0.5 }
        ];
        break;
        
      case 'focus_pull':
        animation = new BABYLON.Animation('focusPull', 'radius', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        keys = [
          { frame: 0, value: startRadius },
          { frame: totalFrames * 0.5, value: startRadius * 0.8 },
          { frame: totalFrames, value: startRadius }
        ];
        break;
        
      default:
        return;
    }
    
    animation.setKeys(keys);
    if (easing) animation.setEasingFunction(easing);
    
    this.camera.animations = [animation];
    this.scene.beginAnimation(this.camera, 0, totalFrames, false, 1, () => {
      console.log(`Camera animation "${presetId}" completed`);
    });
  }

  private animateLights(presetId: string, totalFrames: number, fps: number, easing?: BABYLON.EasingFunction): void {
    if (this.lights.size === 0) {
      console.log('No lights in scene to animate');
      return;
    }
    
    this.lights.forEach((lightData) => {
      const light = lightData.light;
      const startIntensity = light.intensity;
      
      let animation: BABYLON.Animation;
      let keys: { frame: number; value: number }[] = [];
      
      switch (presetId) {
        case 'light_fade_in':
          animation = new BABYLON.Animation('fadeIn', 'intensity', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
          keys = [
            { frame: 0, value: 0 },
            { frame: totalFrames, value: startIntensity }
          ];
          break;
          
        case 'light_fade_out':
          animation = new BABYLON.Animation('fadeOut', 'intensity', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
          keys = [
            { frame: 0, value: startIntensity },
            { frame: totalFrames, value: 0 }
          ];
          break;
          
        case 'dramatic_reveal':
          animation = new BABYLON.Animation('dramaticReveal', 'intensity', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
          keys = [
            { frame: 0, value: 0 },
            { frame: totalFrames * 0.3, value: startIntensity * 0.2 },
            { frame: totalFrames * 0.6, value: startIntensity * 0.5 },
            { frame: totalFrames, value: startIntensity }
          ];
          break;
          
        case 'breathing_light':
          animation = new BABYLON.Animation('breathing', 'intensity', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
          keys = [
            { frame: 0, value: startIntensity },
            { frame: totalFrames * 0.5, value: startIntensity * 0.6 },
            { frame: totalFrames, value: startIntensity }
          ];
          break;
          
        case 'color_shift':
          return;
          
        default:
          return;
      }
      
      animation.setKeys(keys);
      if (easing) animation.setEasingFunction(easing);
      
      light.animations = [animation];
      this.scene.beginAnimation(light, 0, totalFrames, presetId === 'breathing_light', 1);
    });
    
    console.log(`Light animation "${presetId}" applied to ${this.lights.size} lights`);
  }

  private animateEffect(presetId: string, totalFrames: number, fps: number, easing?: BABYLON.EasingFunction): void {
    switch (presetId) {
      case 'strobe_effect':
        this.lights.forEach((lightData) => {
          const light = lightData.light;
          const startIntensity = light.intensity;
          
          const animation = new BABYLON.Animation('strobe', 'intensity', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
          const keys: { frame: number; value: number }[] = [];
          
          for (let i = 0; i <= 8; i++) {
            keys.push({ frame: (totalFrames / 8) * i, value: i % 2 === 0 ? startIntensity : 0 });
          }
          
          animation.setKeys(keys);
          light.animations = [animation];
          this.scene.beginAnimation(light, 0, totalFrames, false, 1);
        });
        break;
        
      case 'smooth_transition':
      case 'quick_cut':
        const fadeAnimation = new BABYLON.Animation('fade', 'intensity', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        this.lights.forEach((lightData) => {
          const light = lightData.light;
          const startIntensity = light.intensity;
          
          const keys = [
            { frame: 0, value: startIntensity },
            { frame: totalFrames * 0.5, value: 0 },
            { frame: totalFrames, value: startIntensity }
          ];
          
          fadeAnimation.setKeys(keys);
          if (easing) fadeAnimation.setEasingFunction(easing);
          
          light.animations = [fadeAnimation];
          this.scene.beginAnimation(light, 0, totalFrames, false, 1);
        });
        break;
    }
  }

  getCurrentSceneConfig(): ScenarioPreset['sceneConfig'] {
    const lightsArray: ScenarioPreset['sceneConfig']['lights'] = [];
    
    this.lights.forEach((lightData) => {
      const pos = lightData.mesh.position;
      const rot = lightData.mesh.rotation;
      lightsArray.push({
        type: lightData.type || 'key-light',
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: [
          (rot.x * 180) / Math.PI,
          (rot.y * 180) / Math.PI,
          (rot.z * 180) / Math.PI
        ] as [number, number, number],
        intensity: lightData.light.intensity,
        cct: lightData.cct || 5600,
        modifier: lightData.modifier
      });
    });

    const camera = this.camera;
    const cameraPos = camera.position;
    const cameraTarget = camera.target;
    
    const focalLength = this.cameraSettings?.focalLength || 50;
    
    let backdropColor = '#808080';
    const backWall = this.scene.getMeshByName('backWall');
    if (backWall && backWall.material) {
      const mat = backWall.material as BABYLON.StandardMaterial;
      if (mat.diffuseColor) {
        backdropColor = mat.diffuseColor.toHexString();
      }
    }

    return {
      lights: lightsArray,
      backdrop: {
        type: 'seamless',
        color: backdropColor
      },
      camera: {
        position: [cameraPos.x, cameraPos.y, cameraPos.z] as [number, number, number],
        target: [cameraTarget.x, cameraTarget.y, cameraTarget.z] as [number, number, number],
        focalLength: focalLength
      }
    };
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
      const currentPosition = mesh.position.clone();
      mesh.scaling = new BABYLON.Vector3(weightScale, heightScale, weightScale);
      
      // Reposition mesh on ground after scaling (preserve X and Z, recalculate Y)
      const newPosition = this.positionMeshOnGround(mesh, new BABYLON.Vector3(currentPosition.x, 0, currentPosition.z));
      mesh.position = newPosition;

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

  // Apply proper PBR shading to all loaded meshes - ensures models aren't wireframe/unlit
  private applyPBRShadingToMeshes(meshes: BABYLON.AbstractMesh[]): void {
    let pbrCount = 0;
    let standardCount = 0;
    let createdCount = 0;
    let shadowCasterCount = 0;
    
    meshes.forEach(m => {
      m.receiveShadows = true;
      
      // Add as shadow caster to existing lights
      this.lights.forEach(lightData => {
        if (lightData.shadowGenerator) {
          lightData.shadowGenerator.addShadowCaster(m);
          shadowCasterCount++;
        }
      });
      
      const meshName = m.name || 'unnamed';
      
      if (m.material) {
        (m.material as BABYLON.Material).wireframe = false;
        
        if (m.material instanceof BABYLON.PBRMaterial) {
          m.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
          m.material.alpha = 1.0;
          m.material.backFaceCulling = true;
          m.material.unlit = false;
          if (m.material.metallic === undefined || m.material.metallic === null) {
            m.material.metallic = 0.3;
          }
          if (m.material.roughness === undefined || m.material.roughness === null) {
            m.material.roughness = 0.5;
          }
          if (!m.material.albedoColor || 
              (m.material.albedoColor.r < 0.05 && m.material.albedoColor.g < 0.05 && m.material.albedoColor.b < 0.05)) {
            m.material.albedoColor = new BABYLON.Color3(0.3, 0.3, 0.3);
          }
          pbrCount++;
        } else if (m.material instanceof BABYLON.StandardMaterial) {
          m.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
          m.material.alpha = 1.0;
          m.material.disableLighting = false;
          m.material.backFaceCulling = true;
          standardCount++;
        } else {
          const pbrMat = new BABYLON.PBRMaterial(`pbrMat_${meshName}`, this.scene);
          pbrMat.albedoColor = new BABYLON.Color3(0.3, 0.3, 0.3);
          pbrMat.metallic = 0.3;
          pbrMat.roughness = 0.5;
          pbrMat.alpha = 1.0;
          pbrMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
          pbrMat.backFaceCulling = true;
          m.material = pbrMat;
          createdCount++;
        }
      } else {
        const pbrMat = new BABYLON.PBRMaterial(`pbrMat_${meshName}`, this.scene);
        pbrMat.albedoColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        pbrMat.metallic = 0.3;
        pbrMat.roughness = 0.5;
        pbrMat.alpha = 1.0;
        pbrMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
        pbrMat.backFaceCulling = true;
        m.material = pbrMat;
        createdCount++;
      }
      
      m.getChildMeshes(true).forEach(child => {
        child.receiveShadows = true;
        this.lights.forEach(lightData => {
          if (lightData.shadowGenerator) {
            lightData.shadowGenerator.addShadowCaster(child);
            shadowCasterCount++;
          }
        });
        
        if (child.material) {
          (child.material as BABYLON.Material).wireframe = false;
          if (child.material instanceof BABYLON.PBRMaterial) {
            child.material.unlit = false;
            child.material.backFaceCulling = true;
          } else if (child.material instanceof BABYLON.StandardMaterial) {
            child.material.disableLighting = false;
            child.material.backFaceCulling = true;
          }
        }
      });
    });
    
    console.log(`[GLB Shading] Applied PBR shading to ${meshes.length} meshes:`, {
      pbrMaterialsConfigured: pbrCount,
      standardMaterialsConfigured: standardCount,
      newPBRMaterialsCreated: createdCount,
      shadowCastersAdded: shadowCasterCount,
      confirmed: true
    });
  }

  private positionMeshOnGround(mesh: BABYLON.AbstractMesh, position: BABYLON.Vector3): BABYLON.Vector3 {
    try {
      // Store original position, rotation, and scale
      const originalPos = mesh.position.clone();
      const originalRot = mesh.rotation.clone();
      const originalScale = mesh.scaling.clone();
      
      // Use current position to calculate bounds (don't move to origin as it breaks child meshes like eyes)
      // Get bounding box in world space (true = world space) to account for rotations
      const worldBounds = mesh.getHierarchyBoundingVectors(true);
      const bottomY = worldBounds.min.y; // Lowest point of the model in world space
      
      console.log(`[positionMeshOnGround] bottomY=${bottomY.toFixed(3)}, worldBounds.min=(${worldBounds.min.x.toFixed(3)}, ${worldBounds.min.y.toFixed(3)}, ${worldBounds.min.z.toFixed(3)}), worldBounds.max=(${worldBounds.max.x.toFixed(3)}, ${worldBounds.max.y.toFixed(3)}, ${worldBounds.max.z.toFixed(3)})`);
      
      // Check if bounding box is valid
      if (isFinite(bottomY) && bottomY !== Number.MAX_VALUE && bottomY !== -Number.MAX_VALUE) {
        // Calculate the adjustment needed: current bottomY should become 0.001
        const yAdjustment = -bottomY + 0.001;
        
        // Adjust Y position so the bottom of the model is at ground level (y=0)
        const adjustedPosition = position.clone();
        adjustedPosition.y = mesh.position.y + yAdjustment;
        
        // Restore rotation and scale, then set the adjusted position
        mesh.rotation = originalRot;
        mesh.scaling = originalScale;
        mesh.position = adjustedPosition;
        mesh.computeWorldMatrix(true);
        
        // Verify the final position - recalculate bounds to ensure it's on the ground
        const finalBounds = mesh.getHierarchyBoundingVectors(true);
        const finalBottomY = finalBounds.min.y;
        console.log(`[positionMeshOnGround] Final position=(${adjustedPosition.x.toFixed(3)}, ${adjustedPosition.y.toFixed(3)}, ${adjustedPosition.z.toFixed(3)}), finalBounds.min.y=${finalBottomY.toFixed(3)}`);
        
        // If the final bottom Y is not close to 0, adjust again
        if (Math.abs(finalBottomY) > 0.01) {
          console.log(`[positionMeshOnGround] Adjusting position again, finalBottomY=${finalBottomY.toFixed(3)}`);
          const additionalAdjustment = -finalBottomY + 0.001;
          adjustedPosition.y += additionalAdjustment;
          mesh.position = adjustedPosition;
          mesh.computeWorldMatrix(true);
        }
        
        return adjustedPosition;
      } else {
        // Invalid bounding box - use original position with default height
        console.warn('Invalid bounding box detected, using default position');
        const adjustedPosition = position.clone();
        adjustedPosition.y = 0.001; // Small offset above ground
        mesh.position = originalPos;
        mesh.rotation = originalRot;
        mesh.scaling = originalScale;
        mesh.position = adjustedPosition;
        return adjustedPosition;
      }
    } catch (e) {
      console.warn('Could not calculate ground positioning, using original position:', e);
      const adjustedPosition = position.clone();
      adjustedPosition.y = 0.001; // Small offset above ground
      mesh.position = adjustedPosition;
      return adjustedPosition;
    }
  }

  private rotateMeshTowardCamera(mesh: BABYLON.AbstractMesh): void {
    try {
      // Get camera position and target
      const cameraPos = this.camera.position.clone();
      const cameraTarget = this.camera.target.clone();
      
      // Calculate direction from camera to target (where camera is looking)
      const cameraDirection = cameraTarget.subtract(cameraPos).normalize();
      
      // Calculate direction from mesh to camera (so mesh faces camera)
      const directionToCamera = cameraPos.subtract(mesh.position).normalize();
      
      // Project direction onto XZ plane (horizontal plane) to get rotation around Y axis
      const directionXZ = new BABYLON.Vector3(directionToCamera.x, 0, directionToCamera.z).normalize();
      
      // Calculate angle around Y axis (rotation.y)
      // Atan2 gives angle from positive X axis, but we want angle from positive Z axis (forward)
      // In Babylon.js, positive Z is typically forward, so we use atan2(x, z)
      const angleY = Math.atan2(directionXZ.x, directionXZ.z);
      
      // Set rotation (only Y rotation to face camera horizontally)
      mesh.rotation.y = angleY;
      mesh.computeWorldMatrix(true);
    } catch (e) {
      console.warn('Could not rotate mesh toward camera:', e);
    }
  }

  private async loadAssetFromLibrary(
    assetId: string,
    name: string,
    data?: { modelUrl?: string; metadata?: Record<string, unknown> },
    position?: BABYLON.Vector3
  ): Promise<void> {
    const propDef = getPropById(assetId);
    let pos = position || new BABYLON.Vector3(0, 0, 0);
    
    // Create a node ID for this asset
    const nodeId = `prop-${Date.now()}-${assetId}`;

    if (propDef) {
      try {
        const mesh = await propRenderingService.loadProp(propDef, {
          position: pos,
          scale: propDef.defaultScale,
        });
        
        // Find root mesh (in case mesh is a child)
        let rootMesh = mesh;
        while (rootMesh.parent) {
          rootMesh = rootMesh.parent as BABYLON.AbstractMesh;
        }
        
        // Position mesh on ground
        pos = this.positionMeshOnGround(rootMesh, pos);
        rootMesh.position = pos;
        
        // Rotate mesh toward camera
        this.rotateMeshTowardCamera(rootMesh);
        
        // Set mesh name to node ID so we can find it later
        rootMesh.name = nodeId;
        // Also set on the original mesh in case it's different
        if (mesh !== rootMesh) {
          mesh.name = nodeId;
        }
        
        // Add node to store so it can be moved in 2D top view
        useAppStore.getState().addNode({
          id: nodeId,
          type: 'prop',
          name: propDef.name || name,
          transform: {
            position: [pos.x, pos.y, pos.z],
            rotation: [0, 0, 0],
            scale: [propDef.defaultScale, propDef.defaultScale, propDef.defaultScale],
          },
          visible: true,
          userData: {
            propId: assetId,
            propDef: propDef,
            meshName: nodeId, // Store mesh name for reference
            ...data?.metadata,
          },
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
        mesh.name = nodeId;
        
        // Find root mesh (in case mesh is a child)
        let rootMesh = mesh;
        while (rootMesh.parent) {
          rootMesh = rootMesh.parent as BABYLON.AbstractMesh;
        }
        
        // Position mesh on ground
        pos = this.positionMeshOnGround(rootMesh, pos);
        rootMesh.position = pos;
        
        // Rotate mesh toward camera
        this.rotateMeshTowardCamera(rootMesh);
        
        // Apply proper PBR shading to all meshes
        this.applyPBRShadingToMeshes(result.meshes);
        
        // Add node to store so it can be moved in 2D top view
        useAppStore.getState().addNode({
          id: nodeId,
          type: 'prop',
          name: name,
          transform: {
            position: [pos.x, pos.y, pos.z],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          visible: true,
          userData: {
            assetId: assetId,
            modelUrl: data.modelUrl,
            ...data?.metadata,
          },
        });
        
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
    let pos = position || new BABYLON.Vector3(0, 0, 0);
    let mesh: BABYLON.Mesh;

    if (metadata?.width && metadata?.height) {
      mesh = BABYLON.MeshBuilder.CreatePlane(name, {
        width: metadata.width as number,
        height: metadata.height as number,
      }, this.scene);
      mesh.rotation.x = -Math.PI / 2;
    } else {
      mesh = BABYLON.MeshBuilder.CreateBox(name, { size: 0.5 }, this.scene);
    }

    // Position mesh on ground
    pos = this.positionMeshOnGround(mesh, pos);
    mesh.position = pos;
    
    // Rotate mesh toward camera
    this.rotateMeshTowardCamera(mesh);

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

  // Public method to load avatar from API URL
  public async loadAvatarModel(glbUrl: string, metadata?: { name?: string; category?: string }): Promise<void> {
    console.log('Loading avatar from API:', glbUrl, metadata);
    const avatarName = metadata?.name || `Avatar_${Date.now()}`;
    const skinTone = '#FFDAB9';
    // loadCharacterModel handles adding to store
    await this.loadCharacterModel(glbUrl, avatarName, skinTone, 1.0);
    console.log('Avatar loaded and added to Studio Library:', avatarName);
  }

  private loadCastingAvatarModel(candidateId: string, name: string, avatarUrl: string, position: BABYLON.Vector3): void {
    BABYLON.SceneLoader.ImportMeshAsync('', '', avatarUrl, this.scene).then(result => {
      const rootMesh = result.meshes[0] as BABYLON.Mesh;
      rootMesh.name = `casting_${candidateId}`;
      rootMesh.position = position;
      rootMesh.scaling = new BABYLON.Vector3(1, 1, 1);
      
      const boundingInfo = rootMesh.getHierarchyBoundingVectors(true);
      const modelHeight = boundingInfo.max.y - boundingInfo.min.y;
      if (modelHeight > 0.001) {
        const scale = 1.7 / modelHeight;
        rootMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
      }
      
      rootMesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
      
      this.applyPBRShadingToMeshes(result.meshes);
      
      this.castingCandidates.set(candidateId, { mesh: rootMesh, name, avatarUrl });
      console.log(`[Casting Avatar] Loaded ${name} with ${result.meshes.length} meshes, shading applied, position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }).catch(err => {
      console.error(`Failed to load casting avatar for ${name}:`, err);
      this.createPlaceholderActor(candidateId, name, position);
    });
  }

  private async generateAndLoadCastingAvatar(candidateId: string, name: string, photoUrl: string, position: BABYLON.Vector3): Promise<void> {
    this.createPlaceholderActor(candidateId, name, position);
    
    try {
      let blob: Blob;
      
      if (photoUrl.startsWith('data:')) {
        const response = await fetch(photoUrl);
        blob = await response.blob();
      } else {
        const response = await fetch(photoUrl);
        blob = await response.blob();
      }
      
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      
      const apiResponse = await fetch('/api/generate-avatar', {
        method: 'POST',
        body: formData
      });
      
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        if (result.success && result.glb_url) {
          this.updateCandidateAvatarModel(candidateId, result.glb_url);
        }
      }
    } catch (error) {
      console.error(`Failed to generate avatar for ${name}:`, error);
    }
  }

  private createPlaceholderActor(candidateId: string, name: string, position: BABYLON.Vector3): void {
    const capsule = BABYLON.MeshBuilder.CreateCapsule(`casting_${candidateId}`, {
      height: 1.7,
      radius: 0.25,
    }, this.scene);
    
    capsule.position = position.clone();
    capsule.position.y = 0.85;
    
    const material = new BABYLON.StandardMaterial(`casting_${candidateId}_mat`, this.scene);
    material.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.4);
    material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    capsule.material = material;
    
    this.castingCandidates.set(candidateId, { mesh: capsule, name });
    console.log(`Created placeholder actor for ${name}`);
  }
  
  /**
   * Add a default avatar model to the scene for focus target testing
   */
  private addDefaultMannequin(): void {
    this.loadDefaultAvatar();
  }
  
  /**
   * Load a default avatar from the library
   */
  private async loadDefaultAvatar(): Promise<void> {
    const avatarId = 'default_avatar';
    const avatarUrl = '/models/avatars/avatar_woman.glb';
    
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', avatarUrl, this.scene);
      
      if (result.meshes.length > 0) {
        const rootMesh = result.meshes[0] as BABYLON.Mesh;
        rootMesh.name = avatarId;
        
        // Position at center stage
        rootMesh.position = new BABYLON.Vector3(0, 0, 0);
        
        // Fix orientation - rotate 180° around X (upside down fix) and 180° around Y (facing direction)
        rootMesh.rotation = new BABYLON.Vector3(Math.PI, Math.PI, 0);
        
        // Scale if needed (avatars are usually in correct scale)
        rootMesh.scaling = new BABYLON.Vector3(1, 1, 1);
        
        // Add to casting candidates
        this.castingCandidates.set(avatarId, { 
          mesh: rootMesh, 
          name: 'Avatar (Woman)',
          avatarUrl 
        });
        
        console.log('Default avatar loaded:', avatarUrl);
        
        // Force bounding box recalculation
        rootMesh.refreshBoundingInfo(true);
        
        // Update focus objects list
        setTimeout(() => {
          this.updateFocusObjectsList();
        }, 200);
      }
    } catch (error) {
      console.error('Failed to load default avatar, using placeholder:', error);
      // Fallback to simple capsule
      this.createSimpleMannequin(avatarId);
    }
  }
  
  /**
   * Create a simple capsule mannequin as fallback
   */
  private createSimpleMannequin(id: string): void {
    const capsule = BABYLON.MeshBuilder.CreateCapsule(id, {
      height: 1.75,
      radius: 0.25,
    }, this.scene);
    
    capsule.position = new BABYLON.Vector3(0, 0.875, 0);
    
    const material = new BABYLON.StandardMaterial(`${id}_mat`, this.scene);
    material.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.45);
    capsule.material = material;
    
    this.castingCandidates.set(id, { mesh: capsule, name: 'Mannequin' });
    
    setTimeout(() => {
      this.updateFocusObjectsList();
    }, 200);
  }

  private async generateAvatarFromCastingPhoto(candidateId: string, candidateName: string, photoUrl: string): Promise<void> {
    try {
      let blob: Blob;
      
      if (photoUrl.startsWith('data:')) {
        const response = await fetch(photoUrl);
        blob = await response.blob();
      } else {
        const response = await fetch(photoUrl);
        blob = await response.blob();
      }
      
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      
      const apiResponse = await fetch('/api/generate-avatar', {
        method: 'POST',
        body: formData
      });
      
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        if (result.success && result.glb_url) {
          this.updateCandidateAvatarModel(candidateId, result.glb_url);
          window.dispatchEvent(new CustomEvent('casting-avatar-generated', {
            detail: { candidateId, candidateName, avatarUrl: result.glb_url }
          }));
        }
      }
    } catch (error) {
      console.error(`Failed to generate avatar for ${candidateName}:`, error);
      window.dispatchEvent(new CustomEvent('casting-avatar-error', {
        detail: { candidateId, candidateName, error: String(error) }
      }));
    }
  }

  private updateCandidateAvatarModel(candidateId: string, avatarUrl: string): void {
    const existing = this.castingCandidates.get(candidateId);
    if (!existing) return;
    
    const position = existing.mesh.position.clone();
    existing.mesh.dispose();
    
    this.loadCastingAvatarModel(candidateId, existing.name, avatarUrl, position);
  }

  private removeCastingCandidate(candidateId: string): void {
    const candidate = this.castingCandidates.get(candidateId);
    if (candidate) {
      candidate.mesh.dispose();
      this.castingCandidates.delete(candidateId);
      console.log(`Removed casting candidate: ${candidateId}`);
    }
  }

  private clearAllCastingCandidates(): void {
    this.castingCandidates.forEach((candidate) => {
      candidate.mesh.dispose();
    });
    this.castingCandidates.clear();
    console.log('Cleared all casting candidates from scene');
  }

  private applyShotListPreset(preset: { shotListId: string; sceneId: string; cameraSetup?: { focalLength?: number; aperture?: number; iso?: number; shutter?: number } }): void {
    if (preset.cameraSetup) {
      if (preset.cameraSetup.focalLength) {
        this.setFocalLength(preset.cameraSetup.focalLength);
      }
    }
    console.log(`Applied shot list preset: ${preset.shotListId}`);
  }

  private applyLightingPreset(
    presetId: string, 
    presetName: string, 
    lights: Array<{
      type: string;
      position: [number, number, number];
      rotation: [number, number, number];
      intensity: number;
      cct?: number;
    }>
  ): void {
    // Remove existing lights
    this.lights.forEach((lightData) => {
      if (lightData.spotlight) lightData.spotlight.dispose();
      if (lightData.mesh) lightData.mesh.dispose();
      if (lightData.shadowGenerator) lightData.shadowGenerator.dispose();
      if (lightData.beamVisualization) lightData.beamVisualization.dispose();
    });
    this.lights = [];

    // Create new lights from preset
    lights.forEach((lightConfig, index) => {
      const lightId = `preset_light_${index}`;
      const position = new BABYLON.Vector3(
        lightConfig.position[0],
        lightConfig.position[1],
        lightConfig.position[2]
      );
      
      // Create spotlight
      const spotlight = new BABYLON.SpotLight(
        lightId,
        position,
        new BABYLON.Vector3(0, -0.5, -1).normalize(),
        Math.PI / 4,
        2,
        this.scene
      );
      
      spotlight.intensity = lightConfig.intensity * 50;
      
      // Set color temperature
      if (lightConfig.cct) {
        const kelvin = lightConfig.cct;
        let r: number, g: number, b: number;
        if (kelvin <= 4000) {
          r = 1.0;
          g = 0.7 + (kelvin - 2700) * 0.0002;
          b = 0.5 + (kelvin - 2700) * 0.0004;
        } else if (kelvin <= 5600) {
          r = 1.0;
          g = 0.9 + (kelvin - 4000) * 0.0001;
          b = 0.8 + (kelvin - 4000) * 0.0001;
        } else {
          r = 0.9 - (kelvin - 5600) * 0.00005;
          g = 0.95;
          b = 1.0;
        }
        spotlight.diffuse = new BABYLON.Color3(r, g, b);
      }

      // Create shadow generator
      const shadowGenerator = new BABYLON.ShadowGenerator(1024, spotlight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 32;

      // Aim light at center
      const target = new BABYLON.Vector3(0, 1.2, 0);
      const direction = target.subtract(position).normalize();
      spotlight.direction = direction;

      // Store light data
      const lightData = {
        id: lightId,
        type: 'aputure-300d',
        spotlight,
        mesh: null as BABYLON.AbstractMesh | null,
        shadowGenerator,
        beamVisualization: null as BABYLON.Mesh | null,
        aimTarget: target,
        power: lightConfig.intensity * 100,
        cct: lightConfig.cct || 5600,
      };

      this.lights.push(lightData);

      // Load light model
      this.load3DLightModel(lightId, 'aputure-300d', position).then(() => {
        console.log(`[Lighting Preset] Light ${index + 1} created: ${lightConfig.type} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
      });
    });

    // Dispatch event to notify UI
    window.dispatchEvent(new CustomEvent('lighting-preset-applied', {
      detail: { presetId, presetName, lightCount: lights.length }
    }));

    console.log(`[Lighting Preset] Applied "${presetName}" with ${lights.length} lights`);
  }

  public createSceneBanner(
    text: string,
    options?: {
      position?: { x: number; y: number; z: number };
      width?: number;
      height?: number;
      color?: string;
      glowColor?: string;
      animationSpeed?: number;
      waveAmplitude?: number;
    }
  ): void {
    this.removeSceneBanner();

    const pos = options?.position || { x: 0, y: 4, z: -2 };
    const width = options?.width || 6;
    const height = options?.height || 1.5;
    const bgColor = options?.color || '#1a1a2e';
    const glowColor = options?.glowColor || '#ff6b35';
    const animSpeed = options?.animationSpeed || 1.5;
    const waveAmp = options?.waveAmplitude || 0.08;

    const subdivisions = { w: 40, h: 10 };
    const banner = BABYLON.MeshBuilder.CreateGround('sceneBanner', {
      width: width,
      height: height,
      subdivisions: subdivisions.w,
      subdivisionsY: subdivisions.h,
    }, this.scene);

    banner.rotation.x = Math.PI / 2;
    banner.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);

    const positions = banner.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (positions) {
      this.sceneBanner.originalPositions = new Float32Array(positions);
    }

    const bannerTexture = new BABYLON.DynamicTexture('bannerTexture', { width: 1024, height: 256 }, this.scene, true);
    const textureContext = bannerTexture.getContext();
    
    const gradient = textureContext.createLinearGradient(0, 0, 1024, 0);
    gradient.addColorStop(0, '#2d1f3d');
    gradient.addColorStop(0.5, bgColor);
    gradient.addColorStop(1, '#2d1f3d');
    textureContext.fillStyle = gradient;
    textureContext.fillRect(0, 0, 1024, 256);

    textureContext.fillStyle = '#3d2d5d';
    textureContext.fillRect(0, 0, 1024, 8);
    textureContext.fillRect(0, 248, 1024, 8);

    textureContext.font = 'bold 72px Arial';
    textureContext.textAlign = 'center';
    textureContext.textBaseline = 'middle';
    
    textureContext.shadowColor = glowColor;
    textureContext.shadowBlur = 20;
    textureContext.fillStyle = '#ffffff';
    textureContext.fillText(text, 512, 128);
    
    textureContext.shadowBlur = 40;
    textureContext.fillStyle = glowColor;
    textureContext.globalAlpha = 0.3;
    textureContext.fillText(text, 512, 128);
    textureContext.globalAlpha = 1.0;

    bannerTexture.update();

    const bannerMaterial = new BABYLON.StandardMaterial('bannerMaterial', this.scene);
    bannerMaterial.diffuseTexture = bannerTexture;
    bannerMaterial.emissiveTexture = bannerTexture;
    bannerMaterial.emissiveColor = BABYLON.Color3.FromHexString(glowColor).scale(0.3);
    bannerMaterial.backFaceCulling = false;
    bannerMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    banner.material = bannerMaterial;

    const spotlight = new BABYLON.SpotLight(
      'bannerSpotlight',
      new BABYLON.Vector3(pos.x, pos.y + 2, pos.z + 3),
      new BABYLON.Vector3(0, -0.3, -1).normalize(),
      Math.PI / 3,
      2,
      this.scene
    );
    spotlight.intensity = 30;
    spotlight.diffuse = BABYLON.Color3.FromHexString(glowColor);

    let glowLayer = this.scene.getGlowLayerByName('bannerGlow');
    if (!glowLayer) {
      glowLayer = new BABYLON.GlowLayer('bannerGlow', this.scene, {
        mainTextureFixedSize: 512,
        blurKernelSize: 64,
      });
    }
    glowLayer.intensity = 0.8;
    glowLayer.addIncludedOnlyMesh(banner);

    let time = 0;
    const animObserver = this.scene.onBeforeRenderObservable.add(() => {
      time += this.scene.getEngine().getDeltaTime() * 0.001 * animSpeed;
      
      if (this.sceneBanner.originalPositions && banner.isVerticesDataPresent(BABYLON.VertexBuffer.PositionKind)) {
        const positions = banner.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (positions) {
          const vertexCount = positions.length / 3;
          for (let i = 0; i < vertexCount; i++) {
            const origX = this.sceneBanner.originalPositions[i * 3];
            const origY = this.sceneBanner.originalPositions[i * 3 + 1];
            
            const wave1 = Math.sin(origX * 2 + time * 2) * waveAmp;
            const wave2 = Math.sin(origY * 3 + time * 1.5) * waveAmp * 0.5;
            const wave3 = Math.sin(origX * 4 + origY * 2 + time * 3) * waveAmp * 0.3;
            
            positions[i * 3 + 2] = wave1 + wave2 + wave3;
          }
          banner.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        }
      }

      const glowPulse = 0.6 + Math.sin(time * 2) * 0.2;
      bannerMaterial.emissiveColor = BABYLON.Color3.FromHexString(glowColor).scale(glowPulse * 0.4);
      
      const lightPulse = 25 + Math.sin(time * 1.5) * 10;
      spotlight.intensity = lightPulse;
    });

    this.sceneBanner.mesh = banner;
    this.sceneBanner.spotlight = spotlight;
    this.sceneBanner.glowLayer = glowLayer;
    this.sceneBanner.animationObserver = animObserver;

    console.log(`[Scene Banner] Created banner "${text}" at (${pos.x}, ${pos.y}, ${pos.z}) with animation and glow effects`);
    
    window.dispatchEvent(new CustomEvent('scene-banner-created', {
      detail: { text, position: pos }
    }));
  }

  public removeSceneBanner(): void {
    if (this.sceneBanner.animationObserver) {
      this.scene.onBeforeRenderObservable.remove(this.sceneBanner.animationObserver);
      this.sceneBanner.animationObserver = null;
    }
    if (this.sceneBanner.mesh) {
      this.sceneBanner.mesh.dispose();
      this.sceneBanner.mesh = null;
    }
    if (this.sceneBanner.spotlight) {
      this.sceneBanner.spotlight.dispose();
      this.sceneBanner.spotlight = null;
    }
    if (this.sceneBanner.glowLayer) {
      this.sceneBanner.glowLayer.dispose();
      this.sceneBanner.glowLayer = null;
    }
    this.sceneBanner.originalPositions = null;
    console.log('[Scene Banner] Removed');
  }

  private async loadCharacterModel(modelUrl: string, name: string, skinTone: string, height: number): Promise<void> {
    this.removeCharacterModel();
    
    let meshPosition = new BABYLON.Vector3(0, 0, 0);
    
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelUrl, this.scene);
      this.characterMesh = result.meshes[0];
      this.characterMesh.name = name;
      
      // Calculate bounding box to properly scale and position the model
      const boundingInfo = this.characterMesh.getHierarchyBoundingVectors(true);
      const modelHeight = boundingInfo.max.y - boundingInfo.min.y;
      const modelWidth = boundingInfo.max.x - boundingInfo.min.x;
      const modelDepth = boundingInfo.max.z - boundingInfo.min.z;
      
      console.log(`Model dimensions: H=${modelHeight.toFixed(3)}, W=${modelWidth.toFixed(3)}, D=${modelDepth.toFixed(3)}`);
      
      // Target human height (1.7m default, can be adjusted by height parameter)
      const targetHeight = 1.7 * (height || 1.0);
      
      // Scale model to target height if it's too small or too large
      if (modelHeight > 0.001) {
        const scale = targetHeight / modelHeight;
        this.characterMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
        console.log(`Scaling model by ${scale.toFixed(3)} to reach ${targetHeight}m height`);
      }
      
      // Fix rotation - SAM 3D Body models may be exported upside down or facing wrong direction
      // Rotate 180 degrees around X axis to flip right-side up
      this.characterMesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
      
      // Position mesh on ground using the helper function (after rotation so bounds are correct)
      meshPosition = this.positionMeshOnGround(this.characterMesh, new BABYLON.Vector3(0, 0, 0));
      this.characterMesh.position = meshPosition;
      this.characterMesh.computeWorldMatrix(true);
      console.log(`Positioned character on ground: position=(${meshPosition.x.toFixed(3)}, ${meshPosition.y.toFixed(3)}, ${meshPosition.z.toFixed(3)}), bounds.min.y=${this.characterMesh.getHierarchyBoundingVectors(true).min.y.toFixed(3)}`);
      
      // Rotate mesh toward camera (preserves X rotation, only adjusts Y rotation)
      const currentRotationX = this.characterMesh.rotation.x;
      this.rotateMeshTowardCamera(this.characterMesh);
      // Restore X rotation in case rotateMeshTowardCamera overwrote it
      this.characterMesh.rotation.x = currentRotationX;
      
      // Ensure position is still correct after rotation
      this.characterMesh.position = meshPosition;
      this.characterMesh.computeWorldMatrix(true);
      
      // Character Material Stack: PBRMaterial for skin, shirt, and pants
      const skinColor = BABYLON.Color3.FromHexString(skinTone || '#FFDAB9');
      const shirtColor = new BABYLON.Color3(0.2, 0.4, 0.7); // Blue shirt
      const pantsColor = new BABYLON.Color3(0.2, 0.2, 0.25); // Dark gray pants
      
      // Use original local bounds (before rotation/scaling) for material selection
      const localMinY = boundingInfo.min.y;
      const localMaxY = boundingInfo.max.y;
      const localModelHeight = localMaxY - localMinY;
      
      console.log(`Material bounds: localMinY=${localMinY.toFixed(3)}, localMaxY=${localMaxY.toFixed(3)}`);
      
      // Create PBR materials for different body parts
      // Skin material (PBR with subsurface scattering)
      const skinMaterial = new BABYLON.PBRMaterial(`${name}_skin_mat`, this.scene);
      skinMaterial.albedoColor = skinColor;
      skinMaterial.metallic = 0.0;
      skinMaterial.roughness = 0.75;
      skinMaterial.specularIntensity = 0.3;
      skinMaterial.subSurface.isTranslucencyEnabled = true;
      skinMaterial.subSurface.translucencyIntensity = 0.3;
      skinMaterial.subSurface.tintColor = new BABYLON.Color3(
        skinColor.r * 1.1,
        skinColor.g * 0.95,
        skinColor.b * 0.85
      );
      const emissiveIntensity = 0.08;
      skinMaterial.emissiveColor = new BABYLON.Color3(
        skinColor.r * emissiveIntensity,
        skinColor.g * emissiveIntensity * 0.7,
        skinColor.b * emissiveIntensity * 0.5
      );
      
      // Shirt material (PBR, fabric-like)
      const shirtMaterial = new BABYLON.PBRMaterial(`${name}_shirt_mat`, this.scene);
      shirtMaterial.albedoColor = shirtColor;
      shirtMaterial.metallic = 0.0;
      shirtMaterial.roughness = 0.8; // Fabric is rougher
      shirtMaterial.specularIntensity = 0.1; // Less specular for fabric
      
      // Pants material (PBR, fabric-like, darker)
      const pantsMaterial = new BABYLON.PBRMaterial(`${name}_pants_mat`, this.scene);
      pantsMaterial.albedoColor = pantsColor;
      pantsMaterial.metallic = 0.0;
      pantsMaterial.roughness = 0.85; // Fabric is rougher
      pantsMaterial.specularIntensity = 0.1; // Less specular for fabric
      
      // Get all meshes including root
      const allMeshes = this.characterMesh.getChildMeshes(true);
      allMeshes.push(this.characterMesh);
      
      let meshCount = 0;
      let skinMeshCount = 0;
      let shirtMeshCount = 0;
      let pantsMeshCount = 0;
      
      // Apply materials based on mesh position (simplified approach)
      // For now, apply skin material to all meshes - in a full implementation,
      // you would use submeshes or vertex colors to distinguish body parts
      allMeshes.forEach(mesh => {
        if (mesh instanceof BABYLON.Mesh) {
          // Get mesh center in local space
          const meshBounds = mesh.getBoundingInfo();
          const meshCenterY = (meshBounds.boundingBox.maximumWorld.y + meshBounds.boundingBox.minimumWorld.y) / 2;
          const normalizedY = (meshCenterY - this.characterMesh.getAbsolutePosition().y - localMinY) / localModelHeight;
          
          // Determine material based on Y position
          // Head/neck area (above 82%) = skin
          // Torso (38% to 82%) = shirt (except arms)
          // Legs (below 38%) = pants
          if (normalizedY > 0.82) {
            mesh.material = skinMaterial;
            skinMeshCount++;
          } else if (normalizedY > 0.38) {
            // Torso area - check if arms (far from center X)
            const meshCenterX = (meshBounds.boundingBox.maximumWorld.x + meshBounds.boundingBox.minimumWorld.x) / 2;
            const xDist = Math.abs(meshCenterX - this.characterMesh.getAbsolutePosition().x);
            if (xDist > 0.15 && normalizedY > 0.55) {
              mesh.material = skinMaterial; // Arms
              skinMeshCount++;
            } else {
              mesh.material = shirtMaterial; // Shirt
              shirtMeshCount++;
            }
          } else {
            mesh.material = pantsMaterial; // Pants
            pantsMeshCount++;
          }
          
          // Enable shadows
          mesh.receiveShadows = true;
          mesh.castShadows = true;
          
          // Add to shadow generators
          this.lights.forEach((lightData) => {
            if (lightData.shadowGenerator) {
              lightData.shadowGenerator.addShadowCaster(mesh);
            }
          });
          
          meshCount++;
        }
      });
      
      console.log(`Applied PBR material stack (skin: ${skinMeshCount}, shirt: ${shirtMeshCount}, pants: ${pantsMeshCount}) to ${meshCount} mesh(es)`);
      
      // Add eyes to the character model
      this.addEyesToMesh(this.characterMesh, name);
      
      // Reposition mesh on ground after adding eyes (eyes change the bounding box)
      // Use positionMeshOnGround to ensure correct positioning
      meshPosition = this.positionMeshOnGround(this.characterMesh, meshPosition.clone());
      this.characterMesh.position = meshPosition;
      this.characterMesh.computeWorldMatrix(true);
      
      // Final verification
      const finalBounds = this.characterMesh.getHierarchyBoundingVectors(true);
      if (Math.abs(finalBounds.min.y) > 0.01) {
        console.warn(`[loadCharacterModel] Final position still not on ground, bottomY=${finalBounds.min.y.toFixed(3)}`);
        // Force to ground
        const correction = finalBounds.min.y - 0.001;
        this.characterMesh.position.y -= correction;
        this.characterMesh.computeWorldMatrix(true);
        meshPosition.y = this.characterMesh.position.y;
      }
      
      console.log(`Loaded character: ${name} at position (${meshPosition.x}, ${meshPosition.y}, ${meshPosition.z})`);
    } catch (error) {
      console.warn(`Character model not found: ${modelUrl}, creating placeholder`, error);
      const capsule = BABYLON.MeshBuilder.CreateCapsule(name, { height: 1.75, radius: 0.22 }, this.scene);
      
      // Position capsule on ground
      meshPosition = this.positionMeshOnGround(capsule, new BABYLON.Vector3(0, 0, 0));
      capsule.position = meshPosition;
      
      // Rotate capsule toward camera
      this.rotateMeshTowardCamera(capsule);
      
      // Character Material Stack: PBRMaterial with subsurface scattering (same as addActorToScene)
      const pbrMaterial = new BABYLON.PBRMaterial(`${name}_pbr_mat`, this.scene);
      const skinColor = BABYLON.Color3.FromHexString(skinTone || '#EAC086');
      
      // Base skin properties (PBR workflow)
      pbrMaterial.albedoColor = skinColor;
      pbrMaterial.metallic = 0.0;
      pbrMaterial.roughness = 0.75; // Skin roughness: 0.6-0.9 range
      pbrMaterial.specularIntensity = 0.3;
      
      // Subsurface scattering (fake SSS for real-time)
      pbrMaterial.subSurface.isTranslucencyEnabled = true;
      pbrMaterial.subSurface.translucencyIntensity = 0.3;
      pbrMaterial.subSurface.tintColor = new BABYLON.Color3(
        skinColor.r * 1.1,
        skinColor.g * 0.95,
        skinColor.b * 0.85
      );
      
      // Wrap lighting (simulated via emissive for warm glow)
      const emissiveIntensity = 0.08;
      pbrMaterial.emissiveColor = new BABYLON.Color3(
        skinColor.r * emissiveIntensity,
        skinColor.g * emissiveIntensity * 0.7,
        skinColor.b * emissiveIntensity * 0.5
      );
      
      capsule.material = pbrMaterial;
      
      // Enable shadows
      capsule.receiveShadows = true;
      capsule.castShadows = true;
      
      // Add to shadow generators
      this.lights.forEach((lightData) => {
        if (lightData.shadowGenerator) {
          lightData.shadowGenerator.addShadowCaster(capsule);
        }
      });
      
      // Add eyes to placeholder capsule
      this.addEyesToActor(capsule, 1.75, skinTone || '#EAC086');
      
      this.characterMesh = capsule;
    }

    // Add to scene hierarchy store
    const store = useAppStore.getState();
    const modelId = `model_${Date.now()}`;
    
    // Set mesh name to node ID so we can find it when dragging
    if (this.characterMesh) {
      this.characterMesh.name = modelId;
    }
    
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
    
    // Update DOM hierarchy
    if ((window as any).addToHierarchy) {
      console.log('Calling addToHierarchy for:', name);
      (window as any).addToHierarchy(modelId, name, 'model');
    } else {
      console.warn('addToHierarchy not available yet');
    }
    
    // Add to Studio Library (Mine Avatarer section)
    if ((window as any).addToStudioLibrary) {
      (window as any).addToStudioLibrary(modelId, name, modelUrl);
    }
    
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

  // Top view configuration
  private topViewShowAngleGuides: boolean = true;
  private topViewShowLightCones: boolean = true;
  private topViewShowLabels: boolean = true;
  private topViewShowGrid: boolean = true;
  private topViewSnapToGrid: boolean = false;
  private topViewGridSize: number = 0.5; // Grid snap size in meters
  private topViewShowWalls: boolean = true;
  private topViewShowFloor: boolean = true;
  private topViewShowProps: boolean = true;
  private topViewShowCCTColors: boolean = false;
  private topViewShowLightFalloff: boolean = false;
  private topViewShowPatternGuides: boolean = false;
  private topViewSelectedPattern: 'rembrandt' | 'butterfly' | 'loop' | 'none' = 'none';
  private topViewShowShadows: boolean = false;
  private topViewZoom: number = 1.0;
  private topViewPan: { x: number; y: number } = { x: 0, y: 0 };
  private topViewHoveredLightId: string | null = null;
  private topViewDraggingLightId: string | null = null;
  private topViewHoveredPropId: string | null = null;
  private topViewDraggingPropId: string | null = null;
  private topViewHoveredActorId: string | null = null;
  private topViewDraggingActorId: string | null = null;
  private selectedActorId: string | null = null;
  private topViewHoveredCameraId: string | null = null;
  private topViewDraggingCameraId: string | null = null;
  private topViewLastMousePos: { x: number; y: number } | null = null;
  private topViewIsPanning: boolean = false;
  private topViewTouchStartDist: number = 0;
  private topViewTouchStartZoom: number = 1.0;
  private topViewIsFullscreen: boolean = false;
  private topViewMeasurementMode: boolean = false;
  private topViewMeasurements: Array<{ id: string; start: { x: number; z: number }; end: { x: number; z: number } }> = [];
  private topViewCurrentMeasurement: { start: { x: number; z: number } | null; end: { x: number; z: number } | null } = { start: null, end: null };
  private topViewContextMenuTarget: { type: 'light' | 'prop' | 'actor' | 'camera'; id: string } | null = null;

  private updateTopView(): void {
    if (!this.topViewCtx || !this.topViewCanvas) return;

    const ctx = this.topViewCtx;
    const w = this.topViewCanvas.width;
    const h = this.topViewCanvas.height;
    const scale = this.getTopViewScale();
    const { cx, cy } = this.getTopViewCenter();

    // Clear with dark background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Draw subtle radial gradient for depth
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) / 2);
    gradient.addColorStop(0, 'rgba(30, 40, 50, 0.5)');
    gradient.addColorStop(1, 'rgba(13, 17, 23, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw angle guides (45°, 90°, 135°, 180° etc.)
    if (this.topViewShowAngleGuides) {
      this.drawAngleGuides(ctx, cx, cy, Math.min(w, h) / 2 - 20);
    }

    // Draw lighting pattern guides
    if (this.topViewShowPatternGuides && this.topViewSelectedPattern !== 'none') {
      this.drawLightingPatternGuides(ctx, cx, cy, scale);
    }

    // Draw shadow visualization
    if (this.topViewShowShadows) {
      this.drawShadowVisualization(ctx, cx, cy, scale);
    }

    // Draw grid with better styling
    if (this.topViewShowGrid) {
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
      ctx.lineWidth = 1;

      // Calculate grid range based on zoom
      const gridRange = Math.ceil(12 / this.topViewZoom);
      const gridStep = this.topViewSnapToGrid ? this.topViewGridSize : 1;

      for (let i = -gridRange; i <= gridRange; i += gridStep) {
        const xPos = cx + i * scale;
        const yPos = cy + i * scale;

        // Vertical lines
        if (xPos >= 0 && xPos <= w) {
          ctx.beginPath();
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, h);
          ctx.stroke();
        }

        // Horizontal lines
        if (yPos >= 0 && yPos <= h) {
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(w, yPos);
          ctx.stroke();
        }
      }

      // Draw snap grid overlay if snap is enabled
      if (this.topViewSnapToGrid) {
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.lineWidth = 1.5;
        for (let i = -gridRange; i <= gridRange; i += this.topViewGridSize) {
          const xPos = cx + i * scale;
          const yPos = cy + i * scale;
          if (xPos >= 0 && xPos <= w) {
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, h);
            ctx.stroke();
          }
          if (yPos >= 0 && yPos <= h) {
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(w, yPos);
            ctx.stroke();
          }
        }
      }
    }

    // Draw studio boundary with glow
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(cx - 10 * scale, cy - 10 * scale, 20 * scale, 20 * scale);
    ctx.setLineDash([]);

    // Draw center reference circles
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.35)';
    ctx.lineWidth = 1.5;
    [3, 6, 9].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw floor (before other elements)
    if (this.topViewShowFloor) {
      this.drawFloorInTopView(ctx, cx, cy, scale);
    }

    // Draw walls (before props and actors)
    if (this.topViewShowWalls) {
      this.drawWallsInTopView(ctx, cx, cy, scale);
    }

    // Draw props (before actors)
    if (this.topViewShowProps) {
      this.drawPropsInTopView(ctx, cx, cy, scale);
    }

    // Draw actors/models in scene
    this.drawActorsInTopView(ctx, cx, cy, scale);

    // Draw light falloff zones first (behind lights)
    if (this.topViewShowLightFalloff) {
      for (const [id, data] of this.lights) {
        const x = cx + data.mesh.position.x * scale;
        const z = cy - data.mesh.position.z * scale;
        this.drawLightFalloff(ctx, x, z, data, scale);
      }
    }

    // Draw light cones first (behind lights)
    if (this.topViewShowLightCones) {
      for (const [id, data] of this.lights) {
        const x = cx + data.mesh.position.x * scale;
        const z = cy - data.mesh.position.z * scale;
        this.drawLightCone(ctx, x, z, cx, cy, data, id === this.selectedLightId);
      }
    }

    // Draw lights with improved icons
    for (const [id, data] of this.lights) {
      const x = cx + data.mesh.position.x * scale;
      const z = cy - data.mesh.position.z * scale;
      const isSelected = id === this.selectedLightId;
      const isHovered = id === this.topViewHoveredLightId;

      this.drawLightIcon(ctx, x, z, data, isSelected, isHovered);

      // Draw light name label for all lights when labels are enabled
      if (this.topViewShowLabels) {
        this.drawLightNameLabel(ctx, x, z, data.name, isSelected);
        // Draw CCT label if CCT visualization is enabled
        if (this.topViewShowCCTColors) {
          this.drawCCTLabel(ctx, x, z, data.cct || 5600, isSelected);
        }
      }

      // Draw angle label for selected light
      if (isSelected && this.topViewShowLabels) {
        const angle = this.calculateLightAngle(data.mesh.position.x, data.mesh.position.z);
        this.drawAngleLabel(ctx, x, z, angle);
      }
    }

    // Draw camera with improved icon
    this.drawCameraIcon(ctx, cx, cy, scale);

    // Draw camera presets (Cam A-E)
    this.drawCameraPresetsInTopView(ctx, cx, cy, scale);

    // Draw distance markers for selected light
    if (this.selectedLightId) {
      const selectedLight = this.lights.get(this.selectedLightId);
      if (selectedLight) {
        const distance = Math.sqrt(
          selectedLight.mesh.position.x ** 2 +
          selectedLight.mesh.position.z ** 2
        );
        this.drawDistanceMarker(ctx, cx, cy, distance, scale);
      }
    }

    // Draw measurements
    this.drawMeasurements(ctx, cx, cy, scale);
  }

  private drawMeasurements(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    // Draw saved measurements
    this.topViewMeasurements.forEach(measurement => {
      const startX = cx + measurement.start.x * scale;
      const startZ = cy - measurement.start.z * scale;
      const endX = cx + measurement.end.x * scale;
      const endZ = cy - measurement.end.z * scale;

      // Draw line
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(startX, startZ);
      ctx.lineTo(endX, endZ);
      ctx.stroke();
      ctx.setLineDash([]);

      // Calculate distance
      const distance = Math.sqrt(
        (measurement.end.x - measurement.start.x) ** 2 +
        (measurement.end.z - measurement.start.z) ** 2
      );

      // Draw distance label at midpoint
      const midX = (startX + endX) / 2;
      const midZ = (startZ + endZ) / 2;
      const labelText = `${distance.toFixed(2)}m`;

      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(midX - textWidth / 2 - 4, midZ - 8, textWidth + 8, 16, 3);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 0, 1)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, midX, midZ);

      // Draw start/end markers
      ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(startX, startZ, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, endZ, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw current measurement in progress
    if (this.topViewCurrentMeasurement.start && this.topViewCurrentMeasurement.end) {
      const startX = cx + this.topViewCurrentMeasurement.start.x * scale;
      const startZ = cy - this.topViewCurrentMeasurement.start.z * scale;
      const endX = cx + this.topViewCurrentMeasurement.end.x * scale;
      const endZ = cy - this.topViewCurrentMeasurement.end.z * scale;

      ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startZ);
      ctx.lineTo(endX, endZ);
      ctx.stroke();
      ctx.setLineDash([]);

      const distance = Math.sqrt(
        (this.topViewCurrentMeasurement.end.x - this.topViewCurrentMeasurement.start.x) ** 2 +
        (this.topViewCurrentMeasurement.end.z - this.topViewCurrentMeasurement.start.z) ** 2
      );

      const midX = (startX + endX) / 2;
      const midZ = (startZ + endZ) / 2;
      const labelText = `${distance.toFixed(2)}m`;

      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.beginPath();
      ctx.roundRect(midX - textWidth / 2 - 5, midZ - 9, textWidth + 10, 18, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 0, 1)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, midX, midZ);
    }
  }

  private drawCameraPresetsInTopView(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const colors: { [key: string]: string } = {
      'camA': '#ff4444',
      'camB': '#44ff44',
      'camC': '#4488ff',
      'camD': '#ffff44',
      'camE': '#ff44ff'
    };

    this.cameraPresets.forEach((preset, presetId) => {
      if (!preset) return;

      const x = cx + preset.position.x * scale * 0.5;
      const z = cy - preset.position.z * scale * 0.5;
      const color = colors[presetId] || '#ffffff';
      const isSelected = this.selectedCameraPresetId === presetId;
      const isHovered = this.topViewHoveredCameraId === presetId;

      // Draw camera view cone/frustum
      const direction = preset.target.subtract(preset.position).normalize();
      const angle = Math.atan2(-direction.x, -direction.z);
      const fovAngle = preset.fov * 0.5;
      const coneLength = 40;

      // Draw view cone
      ctx.save();
      ctx.translate(x, z);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-Math.sin(fovAngle) * coneLength, -Math.cos(fovAngle) * coneLength);
      ctx.lineTo(Math.sin(fovAngle) * coneLength, -Math.cos(fovAngle) * coneLength);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, -coneLength/2, coneLength);
      gradient.addColorStop(0, color.replace(')', ', 0.4)').replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) =>
        `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = `${color}33`;
      ctx.fill();

      ctx.restore();

      // Draw camera icon - increased size
      const size = isSelected ? 15 : 12;

      // Glow effect
      if (isSelected || isHovered) {
        const glow = ctx.createRadialGradient(x, z, 0, x, z, size * 2);
        glow.addColorStop(0, isSelected ? `${color}66` : `${color}33`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, z, size * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Camera body
      ctx.fillStyle = isSelected ? color : (isHovered ? color.replace('44', '66') : color);
      ctx.beginPath();
      ctx.roundRect(x - size * 0.8, z - size * 0.5, size * 1.6, size, 2);
      ctx.fill();

      // Lens
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(x, z, size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? '#fff' : color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x - size * 0.8, z - size * 0.5, size * 1.6, size, 2);
      ctx.stroke();

      // Label - improved visibility
      if (this.topViewShowLabels) {
        const label = presetId.replace('cam', 'Cam ');
        ctx.font = isSelected ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Background
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(x - textWidth/2 - 4, z + size + 2, textWidth + 8, 14, 3);
        ctx.fill();

        // Text
        ctx.fillStyle = color;
        ctx.fillText(label, x, z + size + 4);
      }
    });
  }

  private drawAngleGuides(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    const angles = [
      { deg: 0, label: '0° Front', color: 'rgba(63, 185, 80, 0.7)' },
      { deg: 45, label: '45° Key', color: 'rgba(255, 170, 0, 0.65)' },
      { deg: -45, label: '-45° Key', color: 'rgba(255, 170, 0, 0.65)' },
      { deg: 90, label: '90° Side', color: 'rgba(136, 87, 255, 0.65)' },
      { deg: -90, label: '-90° Side', color: 'rgba(136, 87, 255, 0.65)' },
      { deg: 135, label: '135° Rim', color: 'rgba(255, 107, 107, 0.65)' },
      { deg: -135, label: '-135° Rim', color: 'rgba(255, 107, 107, 0.65)' },
      { deg: 180, label: '180° Back', color: 'rgba(0, 212, 255, 0.65)' },
    ];

    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    angles.forEach(({ deg, label, color }) => {
      const rad = (deg - 90) * Math.PI / 180; // -90 to align 0° with front
      const x2 = cx + Math.cos(rad) * radius;
      const y2 = cy + Math.sin(rad) * radius;

      // Draw guide line - increased visibility
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw label at end of line - improved visibility
      const labelX = cx + Math.cos(rad) * (radius + 14);
      const labelY = cy + Math.sin(rad) * (radius + 14);
      ctx.fillStyle = color.replace('0.65', '0.9').replace('0.7', '0.95').replace('0.5', '0.85').replace('0.6', '0.9');
      // Add text shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(label.split(' ')[0], labelX, labelY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
  }

  private drawLightingPatternGuides(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const guideColor = 'rgba(255, 215, 0, 0.6)';
    const guideLineWidth = 2;
    const guideRadius = 3 * scale; // 3 meters radius for typical key light placement

    ctx.strokeStyle = guideColor;
    ctx.lineWidth = guideLineWidth;
    ctx.setLineDash([6, 4]);

    switch (this.topViewSelectedPattern) {
      case 'rembrandt':
        // Rembrandt lighting: Key light at 45° and elevated
        // Draw arc for key light position at 45°
        const rembrandtAngle = 45 * Math.PI / 180;
        const rembrandtRad = (rembrandtAngle - 90) * Math.PI / 180; // Convert to canvas coordinates
        const rembrandtX = cx + Math.cos(rembrandtRad) * guideRadius;
        const rembrandtZ = cy + Math.sin(rembrandtRad) * guideRadius;
        
        // Draw guide arc for key light
        ctx.beginPath();
        ctx.arc(cx, cy, guideRadius, rembrandtRad - 0.3, rembrandtRad + 0.3);
        ctx.stroke();
        
        // Draw line from subject to key position
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(rembrandtX, rembrandtZ);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = guideColor.replace('0.6', '0.9');
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Rembrandt Key (45°)', rembrandtX + Math.cos(rembrandtRad) * 20, rembrandtZ + Math.sin(rembrandtRad) * 20);
        break;

      case 'butterfly':
        // Butterfly lighting: Key light directly in front, above camera
        // Draw vertical line in front of subject
        ctx.beginPath();
        ctx.moveTo(cx, cy - guideRadius * 0.5);
        ctx.lineTo(cx, cy - guideRadius * 1.5);
        ctx.stroke();
        
        // Draw horizontal line to show it's directly in front
        ctx.beginPath();
        ctx.moveTo(cx - guideRadius * 0.3, cy - guideRadius);
        ctx.lineTo(cx + guideRadius * 0.3, cy - guideRadius);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = guideColor.replace('0.6', '0.9');
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Butterfly Key (Front)', cx, cy - guideRadius * 1.7);
        break;

      case 'loop':
        // Loop lighting: Key light at 30-45° slightly above eye level
        // Draw arc for loop light position at ~30-35°
        const loopAngle = 35 * Math.PI / 180;
        const loopRad = (loopAngle - 90) * Math.PI / 180;
        const loopX = cx + Math.cos(loopRad) * guideRadius;
        const loopZ = cy + Math.sin(loopRad) * guideRadius;
        
        // Draw guide arc
        ctx.beginPath();
        ctx.arc(cx, cy, guideRadius, loopRad - 0.25, loopRad + 0.25);
        ctx.stroke();
        
        // Draw line from subject
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(loopX, loopZ);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = guideColor.replace('0.6', '0.9');
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loop Key (30-45°)', loopX + Math.cos(loopRad) * 20, loopZ + Math.sin(loopRad) * 20);
        break;
    }

    ctx.setLineDash([]);
  }

  private drawShadowVisualization(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    // Draw shadow direction indicators from lights to subject
    const subjectPos = { x: cx, y: cy };
    
    for (const [id, data] of this.lights) {
      const lightX = cx + data.mesh.position.x * scale;
      const lightZ = cy - data.mesh.position.z * scale;
      
      // Calculate direction from light to subject
      const dirX = subjectPos.x - lightX;
      const dirZ = subjectPos.y - lightZ;
      const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);
      
      if (distance < 1) continue; // Skip if too close
      
      // Normalize direction
      const normX = dirX / distance;
      const normZ = dirZ / distance;
      
      // Draw shadow direction line (extended beyond subject)
      const shadowLength = distance * 1.5;
      const shadowEndX = subjectPos.x + normX * shadowLength * 0.5;
      const shadowEndZ = subjectPos.y + normZ * shadowLength * 0.5;
      
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(subjectPos.x, subjectPos.y);
      ctx.lineTo(shadowEndX, shadowEndZ);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw arrow head
      const arrowSize = 8;
      const angle = Math.atan2(normZ, normX);
      ctx.beginPath();
      ctx.moveTo(shadowEndX, shadowEndZ);
      ctx.lineTo(
        shadowEndX - arrowSize * Math.cos(angle - Math.PI / 6),
        shadowEndZ - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        shadowEndX - arrowSize * Math.cos(angle + Math.PI / 6),
        shadowEndZ - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
      ctx.fill();
      
      // Draw estimated shadow area (semi-transparent ellipse)
      const shadowWidth = 0.5 * scale; // Shadow width in meters
      const shadowAreaLength = shadowLength * 0.4;
      ctx.save();
      ctx.translate(subjectPos.x + normX * shadowAreaLength * 0.5, subjectPos.y + normZ * shadowAreaLength * 0.5);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 0, shadowAreaLength * 0.5, shadowWidth, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSubjectIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    // Draw person silhouette icon - increased size for better visibility
    ctx.fillStyle = '#c9d1d9';

    // Head - larger
    ctx.beginPath();
    ctx.arc(cx, cy - 7, 6, 0, Math.PI * 2);
    ctx.fill();

    // Body (shoulders) - larger
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect - more visible
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
    glow.addColorStop(0, 'rgba(201, 209, 217, 0.25)');
    glow.addColorStop(1, 'rgba(201, 209, 217, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawActorsInTopView(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const store = useAppStore.getState();
    // Draw actors/models from store nodes (type 'actor' or 'model')
    const actorNodes = store.scene.filter(n => (n.type === 'actor' || n.type === 'model') && n.visible);
    
    // Also draw any loaded actors/models from the scene meshes (for backwards compatibility)
    const actorMeshes = this.scene.meshes.filter(m =>
      m.name.startsWith('actor_') || m.name.startsWith('model_') || m.name.startsWith('character_')
    );

    // Draw actor nodes from store
    actorNodes.forEach(actorNode => {
      const [posX, , posZ] = actorNode.transform.position;
      const x = cx + posX * scale;
      const z = cy - posZ * scale;
      const isSelected = store.selectedNodeId === actorNode.id;
      const isHovered = actorNode.id === this.topViewHoveredActorId;
      const isDragging = actorNode.id === this.topViewDraggingActorId;

      // Glow effect for selected/hovered
      if (isSelected || isHovered || isDragging) {
        const glow = ctx.createRadialGradient(x, z, 0, x, z, 12);
        glow.addColorStop(0, isSelected ? 'rgba(236, 72, 153, 0.6)' : 'rgba(236, 72, 153, 0.3)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, z, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Actor circle - larger when selected/hovered
      const radius = isSelected || isDragging ? 7 : isHovered ? 6 : 5;
      ctx.fillStyle = isSelected || isDragging ? 'rgba(236, 72, 153, 1)' : 'rgba(236, 72, 153, 0.8)';
      ctx.beginPath();
      ctx.arc(x, z, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border for selected
      if (isSelected || isDragging) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, z, radius + 1, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw direction arrow (showing which way the actor is facing)
      const [rotX, rotY, rotZ] = actorNode.transform.rotation;
      const arrowLength = 15 * scale; // Arrow length in pixels
      const arrowAngle = rotY; // Y rotation is the horizontal rotation
      
      // Calculate arrow end point
      const arrowEndX = x + Math.sin(arrowAngle) * arrowLength;
      const arrowEndZ = z - Math.cos(arrowAngle) * arrowLength;
      
      // Draw direction line
      ctx.strokeStyle = isSelected || isDragging ? 'rgba(236, 72, 153, 0.8)' : 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = isSelected || isDragging ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x, z);
      ctx.lineTo(arrowEndX, arrowEndZ);
      ctx.stroke();
      
      // Draw arrowhead
      const arrowHeadSize = 4;
      const arrowHeadAngle = Math.atan2(arrowEndZ - z, arrowEndX - x);
      ctx.fillStyle = isSelected || isDragging ? 'rgba(236, 72, 153, 0.9)' : 'rgba(236, 72, 153, 0.7)';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndZ);
      ctx.lineTo(
        arrowEndX - arrowHeadSize * Math.cos(arrowHeadAngle - Math.PI / 6),
        arrowEndZ - arrowHeadSize * Math.sin(arrowHeadAngle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowEndX - arrowHeadSize * Math.cos(arrowHeadAngle + Math.PI / 6),
        arrowEndZ - arrowHeadSize * Math.sin(arrowHeadAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(236, 72, 153, 0.95)';
      ctx.textAlign = 'center';
      ctx.fillText(actorNode.name || 'Actor', x, z + 15);
    });

    // Draw actor meshes from scene (for backwards compatibility)
    actorMeshes.forEach(actor => {
      // Skip if already drawn as a node
      const alreadyDrawn = actorNodes.some(n => n.id === actor.name);
      if (alreadyDrawn) return;

      const x = cx + actor.position.x * scale;
      const z = cy - actor.position.z * scale;

      // Small circle for actor position
      ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
      ctx.beginPath();
      ctx.arc(x, z, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(236, 72, 153, 0.95)';
      ctx.textAlign = 'center';
      ctx.fillText(actor.name.replace(/^(actor_|model_|character_)/, ''), x, z + 12);
    });
  }

  private drawWallsInTopView(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const envState = environmentService.getState();
    const wallThickness = 0.2; // Wall thickness in meters (visual representation)
    const studioSize = 10; // Studio size is 20m x 20m, so half is 10m

    // Wall colors based on visibility and material
    const getWallColor = (wallId: keyof typeof envState.walls): string => {
      const wall = envState.walls[wallId];
      if (!wall.visible) return 'rgba(128, 128, 128, 0.15)'; // Hidden wall - very faint
      
      // Different colors for different walls for distinction
      switch (wallId) {
        case 'backWall': return 'rgba(100, 150, 255, 0.7)';
        case 'leftWall': return 'rgba(150, 100, 255, 0.7)';
        case 'rightWall': return 'rgba(255, 100, 150, 0.7)';
        case 'rearWall': return 'rgba(100, 255, 150, 0.7)';
        default: return 'rgba(128, 128, 128, 0.5)';
      }
    };

    // Draw all walls (toggle is checked in updateTopView)
    // Back wall (facing camera) - at z = -10
    {
      ctx.strokeStyle = getWallColor('backWall');
      ctx.fillStyle = getWallColor('backWall');
      ctx.lineWidth = 3;
      const z = cy - (-10) * scale;
      const wallThicknessScaled = wallThickness * scale;
      ctx.fillRect(
        cx - studioSize * scale - wallThicknessScaled / 2,
        z - wallThicknessScaled / 2,
        (studioSize * 2) * scale + wallThicknessScaled,
        wallThicknessScaled
      );
      
      // Wall label
      if (this.topViewShowLabels && envState.walls.backWall.visible) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Back Wall', cx, z);
      }
    }

    // Left wall - at x = -10
    {
      ctx.strokeStyle = getWallColor('leftWall');
      ctx.fillStyle = getWallColor('leftWall');
      ctx.lineWidth = 3;
      const x = cx + (-10) * scale;
      const wallThicknessScaled = wallThickness * scale;
      ctx.fillRect(
        x - wallThicknessScaled / 2,
        cy - studioSize * scale - wallThicknessScaled / 2,
        wallThicknessScaled,
        (studioSize * 2) * scale + wallThicknessScaled
      );
      
      // Wall label
      if (this.topViewShowLabels && envState.walls.leftWall.visible) {
        ctx.save();
        ctx.translate(x, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Left Wall', 0, 0);
        ctx.restore();
      }
    }

    // Right wall - at x = 10
    {
      ctx.strokeStyle = getWallColor('rightWall');
      ctx.fillStyle = getWallColor('rightWall');
      ctx.lineWidth = 3;
      const x = cx + 10 * scale;
      const wallThicknessScaled = wallThickness * scale;
      ctx.fillRect(
        x - wallThicknessScaled / 2,
        cy - studioSize * scale - wallThicknessScaled / 2,
        wallThicknessScaled,
        (studioSize * 2) * scale + wallThicknessScaled
      );
      
      // Wall label
      if (this.topViewShowLabels && envState.walls.rightWall.visible) {
        ctx.save();
        ctx.translate(x, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Right Wall', 0, 0);
        ctx.restore();
      }
    }

    // Rear wall (behind camera) - at z = 10
    {
      ctx.strokeStyle = getWallColor('rearWall');
      ctx.fillStyle = getWallColor('rearWall');
      ctx.lineWidth = 3;
      const z = cy - 10 * scale;
      const wallThicknessScaled = wallThickness * scale;
      ctx.fillRect(
        cx - studioSize * scale - wallThicknessScaled / 2,
        z - wallThicknessScaled / 2,
        (studioSize * 2) * scale + wallThicknessScaled,
        wallThicknessScaled
      );
      
      // Wall label
      if (this.topViewShowLabels && envState.walls.rearWall.visible) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Rear Wall', cx, z);
      }
    }
  }

  private drawFloorInTopView(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const envState = environmentService.getState();
    if (!envState.floor.visible) return;

    const studioSize = 10; // Studio size is 20m x 20m, so half is 10m

    // Draw floor as a rectangle
    ctx.fillStyle = 'rgba(60, 60, 70, 0.3)';
    ctx.fillRect(
      cx - studioSize * scale,
      cy - studioSize * scale,
      studioSize * 2 * scale,
      studioSize * 2 * scale
    );

    // Draw floor grid pattern if enabled
    if (envState.floor.gridVisible && this.topViewShowGrid) {
      ctx.strokeStyle = 'rgba(100, 100, 120, 0.2)';
      ctx.lineWidth = 1;
      const gridStep = 1; // 1 meter grid
      const gridRange = studioSize;

      for (let i = -gridRange; i <= gridRange; i += gridStep) {
        const xPos = cx + i * scale;
        const yPos = cy + i * scale;

        // Vertical lines
        if (xPos >= cx - studioSize * scale && xPos <= cx + studioSize * scale) {
          ctx.beginPath();
          ctx.moveTo(xPos, cy - studioSize * scale);
          ctx.lineTo(xPos, cy + studioSize * scale);
          ctx.stroke();
        }

        // Horizontal lines
        if (yPos >= cy - studioSize * scale && yPos <= cy + studioSize * scale) {
          ctx.beginPath();
          ctx.moveTo(cx - studioSize * scale, yPos);
          ctx.lineTo(cx + studioSize * scale, yPos);
          ctx.stroke();
        }
      }
    }

    // Floor label
    if (this.topViewShowLabels) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Floor', cx, cy + studioSize * scale - 5);
    }
  }

  private drawPropsInTopView(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const store = useAppStore.getState();
    const props = store.scene.filter(node => node.type === 'prop' && node.visible);
    const selectedNodeId = store.selectedNodeId;

    props.forEach(prop => {
      const [posX, posY, posZ] = prop.transform.position;
      const [rotX, rotY, rotZ] = prop.transform.rotation;
      const [scaleX, scaleY, scaleZ] = prop.transform.scale;

      const x = cx + posX * scale;
      const z = cy - posZ * scale;

      const isSelected = prop.id === selectedNodeId;
      const isHovered = prop.id === this.topViewHoveredPropId;

      // Get prop dimensions from userData if available, or use default
      const width = (prop.userData?.width as number) || 1;
      const depth = (prop.userData?.depth as number) || 1;
      const height = (prop.userData?.height as number) || 1;

      const widthScaled = width * scaleX * scale;
      const depthScaled = depth * scaleZ * scale;

      // Glow effect for selected/hovered
      if (isSelected || isHovered) {
        const glowRadius = Math.max(widthScaled, depthScaled) / 2 + 5;
        const glow = ctx.createRadialGradient(x, z, 0, x, z, glowRadius);
        glow.addColorStop(0, isSelected ? 'rgba(139, 195, 74, 0.4)' : 'rgba(139, 195, 74, 0.2)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, z, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw prop as rectangle with rotation
      ctx.save();
      ctx.translate(x, z);
      ctx.rotate(-rotY); // Negative because canvas Y is inverted

      // Prop fill
      ctx.fillStyle = isSelected ? 'rgba(139, 195, 74, 0.8)' : (isHovered ? 'rgba(139, 195, 74, 0.7)' : 'rgba(139, 195, 74, 0.6)');
      ctx.fillRect(-widthScaled / 2, -depthScaled / 2, widthScaled, depthScaled);

      // Prop border
      ctx.strokeStyle = isSelected ? 'rgba(139, 195, 74, 1)' : 'rgba(139, 195, 74, 0.9)';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(-widthScaled / 2, -depthScaled / 2, widthScaled, depthScaled);

      // Direction indicator (small line showing front)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -depthScaled / 2);
      ctx.lineTo(0, -depthScaled / 2 - 5);
      ctx.stroke();

      ctx.restore();

      // Prop label
      if (this.topViewShowLabels) {
        ctx.fillStyle = isSelected ? 'rgba(139, 195, 74, 1)' : 'rgba(139, 195, 74, 0.95)';
        ctx.font = isSelected ? 'bold 10px Inter, system-ui, sans-serif' : '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(prop.name, x, z + depthScaled / 2 + 3);
      }
    });
  }

  private drawLightCone(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cx: number,
    cy: number,
    data: LightData,
    isSelected: boolean
  ): void {
    const angleToCenter = Math.atan2(cy - y, cx - x);
    const coneAngle = this.getLightConeAngle(data.type);
    const coneLength = isSelected ? 60 : 45;

    // Create gradient for cone
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, coneLength);
    const baseColor = this.getLightColor(data);
    gradient.addColorStop(0, baseColor.replace(')', ', 0.4)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, baseColor.replace(')', ', 0)').replace('rgb', 'rgba'));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, coneLength, angleToCenter - coneAngle / 2, angleToCenter + coneAngle / 2);
    ctx.closePath();
    ctx.fill();
  }

  private getLightConeAngle(type: string): number {
    if (type.includes('spot') || type.includes('fresnel')) return 0.4;
    if (type.includes('softbox') || type.includes('beauty')) return 0.8;
    if (type.includes('led-panel') || type.includes('panel')) return 0.6;
    return 0.5;
  }

  private getLightColor(data: LightData): string {
    // Return color based on color temperature or type
    const temp = data.specs?.colorTemp || 5600;
    if (temp <= 3200) return 'rgb(255, 180, 100)'; // Warm
    if (temp >= 6500) return 'rgb(200, 220, 255)'; // Cool
    return 'rgb(255, 250, 230)'; // Daylight
  }

  private drawLightFalloff(ctx: CanvasRenderingContext2D, x: number, y: number, data: LightData, scale: number): void {
    // Calculate distance to subject (center) - approximate as distance to canvas center
    const canvasCenterX = ctx.canvas.width / 2;
    const canvasCenterY = ctx.canvas.height / 2;
    const distanceToSubject = Math.sqrt((x - canvasCenterX) ** 2 + (y - canvasCenterY) ** 2) / scale;
    
    // Use base distance of 1m for falloff rings if no subject distance
    const baseDistance = distanceToSubject > 0.1 ? distanceToSubject : 1.0;
    
    // Draw concentric circles at 1x, 1.5x, 2x, 3x base distance
    const multipliers = [1, 1.5, 2, 3];
    const lightColor = this.topViewShowCCTColors 
      ? this.cctToCanvasColor(data.cct || 5600, 1.0)
      : 'rgba(255, 255, 0, 1)';
    
    multipliers.forEach((multiplier, index) => {
      const radius = baseDistance * multiplier * scale;
      const intensity = 1 / (multiplier * multiplier); // Inverse square law
      
      // Calculate opacity based on intensity
      const opacity = Math.max(0.15, Math.min(0.6, intensity));
      
      // Extract RGB from color string
      const colorMatch = lightColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (colorMatch) {
        const r = parseInt(colorMatch[1]);
        const g = parseInt(colorMatch[2]);
        const b = parseInt(colorMatch[3]);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        ctx.strokeStyle = `rgba(255, 255, 0, ${opacity})`;
      }
      
      ctx.lineWidth = index === 0 ? 2 : 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw intensity label on first ring
      if (index === 0 && this.topViewShowLabels) {
        const labelText = `${Math.round(intensity * 100)}%`;
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.2})`;
        ctx.fillText(labelText, x, y + radius + 10);
      }
    });
  }

  private drawCCTLabel(ctx: CanvasRenderingContext2D, x: number, y: number, cct: number, isSelected: boolean): void {
    const labelText = `${cct}K`;
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Background
    const textWidth = ctx.measureText(labelText).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 3, y + 18, textWidth + 6, 12, 2);
    ctx.fill();
    
    // Text
    ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(labelText, x, y + 20);
  }

  private drawLightIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    data: LightData,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const size = isSelected ? 18 : (isHovered ? 16 : 14);

    // Get color based on CCT visualization setting
    let lightColor: string;
    if (this.topViewShowCCTColors) {
      lightColor = this.cctToCanvasColor(data.cct || 5600, 1.0);
    } else {
      lightColor = isSelected ? '#00d4ff' : '#58a6ff';
    }

    // Glow effect for selected/hovered
    if (isSelected || isHovered) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      const glowColor = this.topViewShowCCTColors && !isSelected 
        ? this.cctToCanvasColor(data.cct || 5600, 0.3)
        : (isSelected ? 'rgba(0, 212, 255, 0.4)' : 'rgba(88, 166, 255, 0.3)');
      glow.addColorStop(0, glowColor);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Determine icon based on light type
    const type = data.type.toLowerCase();

    if (type.includes('spot') || type.includes('fresnel')) {
      this.drawSpotLightIcon(ctx, x, y, size, isSelected, lightColor);
    } else if (type.includes('softbox')) {
      this.drawSoftboxIcon(ctx, x, y, size, isSelected, lightColor);
    } else if (type.includes('ring')) {
      this.drawRingLightIcon(ctx, x, y, size, isSelected, lightColor);
    } else if (type.includes('panel') || type.includes('led')) {
      this.drawPanelLightIcon(ctx, x, y, size, isSelected, lightColor);
    } else if (type.includes('beauty') || type.includes('dish')) {
      this.drawBeautyDishIcon(ctx, x, y, size, isSelected, lightColor);
    } else {
      // Default light icon
      this.drawDefaultLightIcon(ctx, x, y, size, isSelected, lightColor);
    }
  }

  private drawSpotLightIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, lightColor: string): void {
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * 0.7, y + size * 0.5);
    ctx.lineTo(x + size * 0.7, y + size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#fff' : '#8b949e';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawSoftboxIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, lightColor: string): void {
    ctx.fillStyle = lightColor;
    ctx.fillRect(x - size, y - size * 0.6, size * 2, size * 1.2);
    ctx.strokeStyle = isSelected ? '#fff' : '#8b949e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - size, y - size * 0.6, size * 2, size * 1.2);
    // Inner glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x - size * 0.7, y - size * 0.4, size * 1.4, size * 0.8);
  }

  private drawRingLightIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, lightColor: string): void {
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = size * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawPanelLightIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, lightColor: string): void {
    ctx.fillStyle = lightColor;
    ctx.fillRect(x - size, y - size * 0.5, size * 2, size);
    ctx.strokeStyle = isSelected ? '#fff' : '#8b949e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - size, y - size * 0.5, size * 2, size);
    // LED dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - size * 0.5 + i * size * 0.5, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBeautyDishIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, lightColor: string): void {
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#fff' : '#8b949e';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Center reflector
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDefaultLightIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isSelected: boolean, lightColor: string): void {
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#fff' : '#8b949e';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Light rays
    const rayColor = lightColor.replace('1)', '0.5)').replace('1.0)', '0.5)');
    ctx.strokeStyle = rayColor;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      ctx.lineTo(x + Math.cos(angle) * size * 1.5, y + Math.sin(angle) * size * 1.5);
      ctx.stroke();
    }
  }

  private calculateLightAngle(x: number, z: number): number {
    // Calculate angle from front (0°), positive = right, negative = left
    let angle = Math.atan2(x, -z) * 180 / Math.PI;
    return Math.round(angle);
  }

  private drawAngleLabel(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
    const labelText = `${angle}°`;
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    const textWidth = ctx.measureText(labelText).width;

    // Background pill
    ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
    const padding = 5;
    const pillWidth = textWidth + padding * 2;
    const pillHeight = 20;
    ctx.beginPath();
    ctx.roundRect(x - pillWidth / 2, y - 25, pillWidth, pillHeight, 4);
    ctx.fill();

    // Text
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, x, y - 17);
  }

  private drawLightNameLabel(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, isSelected: boolean): void {
    // Truncate long names
    const maxLength = 15;
    const displayName = name.length > maxLength ? name.substring(0, maxLength - 1) + '…' : name;

    ctx.font = isSelected ? 'bold 12px Inter, system-ui, sans-serif' : '11px Inter, system-ui, sans-serif';
    const textWidth = ctx.measureText(displayName).width;

    // Background pill - positioned below the light icon
    const padding = 4;
    const pillWidth = textWidth + padding * 2;
    const pillHeight = 18;
    const yOffset = 18; // Position below the light icon

    // Background
    ctx.fillStyle = isSelected ? 'rgba(0, 212, 255, 0.85)' : 'rgba(40, 50, 60, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - pillWidth / 2, y + yOffset, pillWidth, pillHeight, 3);
    ctx.fill();

    // Border for selected
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Text
    ctx.fillStyle = isSelected ? '#000' : '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, x, y + yOffset + pillHeight / 2);
  }

  private drawCameraIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    // Get camera position and target
    const camPos = this.camera.position;
    const camTarget = this.camera.target;
    
    // Convert to 2D coordinates
    const camX = cx + camPos.x * scale;
    const camZ = cy - camPos.z * scale;
    const targetX = cx + camTarget.x * scale;
    const targetZ = cy - camTarget.z * scale;

    // Draw camera-target line
    ctx.strokeStyle = 'rgba(63, 185, 80, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(camX, camZ);
    ctx.lineTo(targetX, targetZ);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw view frustum cone (FOV visualization)
    const fov = this.camera.fov || 0.8;
    const fovAngle = fov / 2; // Half FOV in radians
    
    // Calculate direction from camera to target
    const dirX = targetX - camX;
    const dirZ = targetZ - camZ;
    const dirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
    const normDirX = dirX / dirLength;
    const normDirZ = dirZ / dirLength;
    
    // Calculate angle of direction
    const baseAngle = Math.atan2(normDirZ, normDirX);
    
    // FOV cone length (projected on ground plane)
    const coneLength = Math.min(dirLength * 0.8, 80);
    const farWidth = Math.tan(fovAngle) * coneLength * 2;
    
    // Draw filled FOV cone
    const gradient = ctx.createLinearGradient(camX, camZ, targetX, targetZ);
    gradient.addColorStop(0, 'rgba(63, 185, 80, 0.15)');
    gradient.addColorStop(1, 'rgba(63, 185, 80, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(camX, camZ);
    // Left edge
    const leftAngle = baseAngle - fovAngle;
    const leftX = camX + Math.cos(leftAngle) * coneLength;
    const leftZ = camZ + Math.sin(leftAngle) * coneLength;
    ctx.lineTo(leftX, leftZ);
    // Right edge
    const rightAngle = baseAngle + fovAngle;
    const rightX = camX + Math.cos(rightAngle) * coneLength;
    const rightZ = camZ + Math.sin(rightAngle) * coneLength;
    ctx.lineTo(rightX, rightZ);
    ctx.closePath();
    ctx.fill();
    
    // Draw FOV edge lines
    ctx.strokeStyle = 'rgba(63, 185, 80, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(camX, camZ);
    ctx.lineTo(leftX, leftZ);
    ctx.moveTo(camX, camZ);
    ctx.lineTo(rightX, rightZ);
    ctx.stroke();
    ctx.setLineDash([]);

    // Camera body - increased size
    ctx.fillStyle = '#3fb950';
    ctx.beginPath();
    // Main body
    ctx.roundRect(camX - 10, camZ - 6, 20, 12, 3);
    ctx.fill();

    // Lens - increased size
    ctx.fillStyle = '#2ea043';
    ctx.beginPath();
    ctx.arc(camX, camZ, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1117';
    ctx.beginPath();
    ctx.arc(camX, camZ, 2, 0, Math.PI * 2);
    ctx.fill();

    // Viewfinder
    ctx.fillStyle = '#3fb950';
    ctx.fillRect(camX + 4, camZ - 8, 4, 3);

    // Camera label
    if (this.topViewShowLabels) {
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelText = 'Camera';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(camX - textWidth / 2 - 4, camZ - 25, textWidth + 8, 14, 2);
      ctx.fill();
      ctx.fillStyle = '#3fb950';
      ctx.fillText(labelText, camX, camZ - 23);
    }
  }


  private drawDistanceMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, distance: number, scale: number): void {
    const radius = distance * scale;

    // Distance circle
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance label
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(`${distance.toFixed(1)}m`, cx + radius + 5, cy);
  }

  // Helper to get current scale with zoom - improved for larger viewport
  private getTopViewScale(): number {
    if (!this.topViewCanvas) return 1;
    // Adjusted for better visibility with larger viewport
    return (Math.min(this.topViewCanvas.width, this.topViewCanvas.height) / 20) * this.topViewZoom;
  }

  // Helper to get center with pan offset
  private getTopViewCenter(): { cx: number; cy: number } {
    if (!this.topViewCanvas) return { cx: 0, cy: 0 };
    return {
      cx: this.topViewCanvas.width / 2 + this.topViewPan.x,
      cy: this.topViewCanvas.height / 2 + this.topViewPan.y
    };
  }

  private exportTopView(): void {
    if (!this.topViewCanvas) return;
    
    // Simply export the current canvas as-is
    this.topViewCanvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topview-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // Snap position to grid if enabled
  private snapToGrid(value: number): number {
    if (!this.topViewSnapToGrid) return value;
    return Math.round(value / this.topViewGridSize) * this.topViewGridSize;
  }

  // Setup top view interactivity
  public setupTopViewInteractivity(): void {
    if (!this.topViewCanvas) return;

    const canvas = this.topViewCanvas;

    // --- MOUSE EVENTS ---
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scale = this.getTopViewScale();
      const { cx, cy } = this.getTopViewCenter();

      if (this.topViewIsPanning && this.topViewLastMousePos) {
        // Pan the view
        const dx = mouseX - this.topViewLastMousePos.x;
        const dy = mouseY - this.topViewLastMousePos.y;
        this.topViewPan.x += dx;
        this.topViewPan.y += dy;
        this.topViewLastMousePos = { x: mouseX, y: mouseY };
        canvas.style.cursor = 'grabbing';
      } else if (this.topViewDraggingLightId) {
        // Drag light - IMPORTANT: Use topViewDraggingLightId, not selectedLightId
        const light = this.lights.get(this.topViewDraggingLightId);
        if (light) {
          
          let worldX = (mouseX - cx) / scale;
          let worldZ = -(mouseY - cy) / scale;

          // Apply snap to grid (also triggered by holding Ctrl)
          if (this.topViewSnapToGrid || e.ctrlKey || e.metaKey) {
            worldX = this.snapToGrid(worldX);
            worldZ = this.snapToGrid(worldZ);
          }

          // Update the light that was actually clicked, not selectedLightId
          light.mesh.position.x = worldX;
          light.mesh.position.z = worldZ;
          if (light.light instanceof BABYLON.SpotLight || light.light instanceof BABYLON.DirectionalLight) {
            light.light.position.x = worldX;
            light.light.position.z = worldZ;
          }
          
          // Dispatch event for real-time updates - use the dragging light ID
          window.dispatchEvent(new CustomEvent('ch-light-position-changed', {
            detail: { lightId: this.topViewDraggingLightId }
          }));
        } else {
          console.warn(`[2D TopView Drag] Light with ID ${this.topViewDraggingLightId} not found in lights Map!`);
          // Reset dragging state if light not found
          this.topViewDraggingLightId = null;
        }
      } else if (this.topViewDraggingPropId) {
        // Drag prop
        const store = useAppStore.getState();
        const prop = store.scene.find(n => n.id === this.topViewDraggingPropId && n.type === 'prop');
        if (prop) {
          let worldX = (mouseX - cx) / scale;
          let worldZ = -(mouseY - cy) / scale;

          // Apply snap to grid
          if (this.topViewSnapToGrid || e.ctrlKey || e.metaKey) {
            worldX = this.snapToGrid(worldX);
            worldZ = this.snapToGrid(worldZ);
          }

          // Update prop position
          const [_, posY, __] = prop.transform.position;
          useAppStore.getState().updateNode(this.topViewDraggingPropId, {
            transform: {
              ...prop.transform,
              position: [worldX, posY, worldZ]
            }
          });

          // Also update the mesh position if it exists
          // Try to find mesh by node ID first, then by prop ID
          let propMesh = this.scene.getMeshByName(prop.id);
          if (!propMesh) {
            // If not found by node ID, search all meshes for one with matching name
            propMesh = this.scene.meshes.find(m => m.name === prop.id || m.name.includes(prop.id));
          }
          
          if (propMesh) {
            // Find root mesh if this is a child mesh
            let rootMesh = propMesh;
            while (rootMesh.parent) {
              rootMesh = rootMesh.parent as BABYLON.AbstractMesh;
            }
            
            rootMesh.position.x = worldX;
            rootMesh.position.y = posY;
            rootMesh.position.z = worldZ;
            rootMesh.computeWorldMatrix(true);
          } else {
            console.warn('Prop mesh not found for:', prop.id, 'Available meshes:', this.scene.meshes.map(m => m.name).slice(0, 10));
          }

          // Dispatch event for updates
          window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
            detail: { nodeId: this.topViewDraggingPropId }
          }));
        }
      } else if (this.topViewDraggingActorId) {
        // Drag actor/model
        const store = useAppStore.getState();
        const actor = store.scene.find(n => n.id === this.topViewDraggingActorId && (n.type === 'actor' || n.type === 'model'));
        if (actor) {
          let worldX = (mouseX - cx) / scale;
          let worldZ = -(mouseY - cy) / scale;

          // Apply snap to grid
          if (this.topViewSnapToGrid || e.ctrlKey || e.metaKey) {
            worldX = this.snapToGrid(worldX);
            worldZ = this.snapToGrid(worldZ);
          }

          // Update actor position
          const [_, posY, __] = actor.transform.position;
          useAppStore.getState().updateNode(this.topViewDraggingActorId, {
            transform: {
              ...actor.transform,
              position: [worldX, posY, worldZ]
            }
          });

          // Also update the mesh position if it exists, or create it if it doesn't
          let actorMesh = this.scene.getMeshByName(actor.id);
          if (!actorMesh) {
            // Mesh doesn't exist, create it
            this.addActorToScene(actor.id);
            actorMesh = this.scene.getMeshByName(actor.id);
          }
          
          if (actorMesh) {
            // Set X and Z position first
            actorMesh.position.x = worldX;
            actorMesh.position.z = worldZ;
            
            // Use positionMeshOnGround to calculate correct Y position so object lands on floor
            const newPosition = this.positionMeshOnGround(actorMesh, new BABYLON.Vector3(worldX, 0, worldZ));
            actorMesh.position = newPosition;
            
            // Update the node's Y position in store to match the calculated position
            useAppStore.getState().updateNode(this.topViewDraggingActorId, {
              transform: {
                ...actor.transform,
                position: [worldX, newPosition.y, worldZ]
              }
            });
            
            // Force mesh update and ensure highlight is visible during drag
            actorMesh.computeWorldMatrix(true);
            this.addActorHighlight(actorMesh as BABYLON.Mesh);
          }

          // Dispatch event for updates
          window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
            detail: { nodeId: this.topViewDraggingActorId }
          }));
        }
      } else if (this.topViewDraggingCameraId) {
        // Drag camera preset
        const preset = this.cameraPresets.get(this.topViewDraggingCameraId);
        if (preset) {
          let worldX = (mouseX - cx) / scale;
          let worldZ = -(mouseY - cy) / scale;

          // Apply snap to grid
          if (this.topViewSnapToGrid || e.ctrlKey || e.metaKey) {
            worldX = this.snapToGrid(worldX);
            worldZ = this.snapToGrid(worldZ);
          }

          // Update camera preset position
          // Note: Drawing uses scale * 0.5, so positions are stored at half scale
          // We need to multiply by 2 to get the actual stored position
          preset.position.x = worldX * 2;
          preset.position.z = worldZ * 2;

          // Dispatch event for updates
          window.dispatchEvent(new CustomEvent('ch-camera-preset-updated', {
            detail: { presetId: this.topViewDraggingCameraId }
          }));
        }
      } else if (this.topViewMeasurementMode && this.topViewCurrentMeasurement.start) {
        // Update measurement end point while dragging in measurement mode
        const worldX = (mouseX - cx) / scale;
        const worldZ = -(mouseY - cy) / scale;
        this.topViewCurrentMeasurement.end = { x: worldX, z: worldZ };
      } else {
        // Check hover - find closest light/prop/actor/camera within threshold
        let hoveredLightId: string | null = null;
        let hoveredPropId: string | null = null;
        let hoveredActorId: string | null = null;
        let hoveredCameraId: string | null = null;
        let closestDist = Infinity;
        const threshold = 40;

        // Check lights
        for (const [id, data] of this.lights) {
          const x = cx + data.mesh.position.x * scale;
          const z = cy - data.mesh.position.z * scale;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          if (dist < threshold && dist < closestDist) {
            closestDist = dist;
            hoveredLightId = id;
          }
        }

        // Check props
        if (!hoveredLightId && this.topViewShowProps) {
          const store = useAppStore.getState();
          const props = store.scene.filter(n => n.type === 'prop' && n.visible);
          for (const prop of props) {
            const [posX, , posZ] = prop.transform.position;
            const x = cx + posX * scale;
            const z = cy - posZ * scale;
            const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
            // Props have larger hit area (default 1m = scale pixels, so threshold should be larger)
            const propThreshold = Math.max(threshold, 15 * scale);
            if (dist < propThreshold && dist < closestDist) {
              closestDist = dist;
              hoveredPropId = prop.id;
            }
          }
        }

        // Check actors/models
        if (!hoveredLightId && !hoveredPropId) {
          const store = useAppStore.getState();
          const actors = store.scene.filter(n => (n.type === 'actor' || n.type === 'model') && n.visible);
          for (const actor of actors) {
            const [posX, , posZ] = actor.transform.position;
            const x = cx + posX * scale;
            const z = cy - posZ * scale;
            const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
            // Actors have similar hit area to props
            const actorThreshold = Math.max(threshold, 12 * scale);
            if (dist < actorThreshold && dist < closestDist) {
              closestDist = dist;
              hoveredActorId = actor.id;
            }
          }
        }

        // Check camera presets
        if (!hoveredLightId && !hoveredPropId && !hoveredActorId) {
          for (const [presetId, preset] of this.cameraPresets) {
            if (!preset) continue;
            const x = cx + preset.position.x * scale * 0.5;
            const z = cy - preset.position.z * scale * 0.5;
            const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
            if (dist < threshold && dist < closestDist) {
              closestDist = dist;
              hoveredCameraId = presetId;
            }
          }
        }

        this.topViewHoveredLightId = hoveredLightId;
        this.topViewHoveredPropId = hoveredPropId;
        this.topViewHoveredActorId = hoveredActorId;
        this.topViewHoveredCameraId = hoveredCameraId;
        canvas.style.cursor = (hoveredLightId || hoveredPropId || hoveredActorId || hoveredCameraId) ? 'pointer' : 'default';
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scale = this.getTopViewScale();
      const { cx, cy } = this.getTopViewCenter();

      // Measurement mode - handle clicks for measurements (check before panning)
      if (this.topViewMeasurementMode && e.button === 0) {
        const worldX = (mouseX - cx) / scale;
        const worldZ = -(mouseY - cy) / scale;

        if (e.shiftKey) {
          // Shift+click: Delete measurement if clicked near a measurement line
          const threshold = 8 / scale; // 8 pixels threshold
          let deleted = false;
          this.topViewMeasurements = this.topViewMeasurements.filter(measurement => {
            if (deleted) return true;
            
            // Check if click is near the measurement line
            const startX = measurement.start.x;
            const startZ = measurement.start.z;
            const endX = measurement.end.x;
            const endZ = measurement.end.z;
            
            // Calculate distance from point to line segment
            const dx = endX - startX;
            const dz = endZ - startZ;
            const length2 = dx * dx + dz * dz;
            
            if (length2 === 0) {
              // Line is a point
              const dist = Math.sqrt((worldX - startX) ** 2 + (worldZ - startZ) ** 2);
              if (dist < threshold) {
                deleted = true;
                return false;
              }
            } else {
              const t = Math.max(0, Math.min(1, ((worldX - startX) * dx + (worldZ - startZ) * dz) / length2));
              const projX = startX + t * dx;
              const projZ = startZ + t * dz;
              const dist = Math.sqrt((worldX - projX) ** 2 + (worldZ - projZ) ** 2);
              
              if (dist < threshold) {
                deleted = true;
                return false;
              }
            }
            return true;
          });
          if (deleted) {
            this.updateTopView();
          }
          e.preventDefault();
          return;
        }

        if (!this.topViewCurrentMeasurement.start) {
          // Start new measurement
          this.topViewCurrentMeasurement.start = { x: worldX, z: worldZ };
          this.topViewCurrentMeasurement.end = { x: worldX, z: worldZ };
        } else {
          // Complete current measurement and save it
          if (this.topViewCurrentMeasurement.start) {
            this.topViewCurrentMeasurement.end = { x: worldX, z: worldZ };
            const measurementId = `measure_${Date.now()}`;
            this.topViewMeasurements.push({
              id: measurementId,
              start: this.topViewCurrentMeasurement.start,
              end: this.topViewCurrentMeasurement.end
            });
          }
          // Start new measurement
          this.topViewCurrentMeasurement.start = { x: worldX, z: worldZ };
          this.topViewCurrentMeasurement.end = { x: worldX, z: worldZ };
        }
        e.preventDefault();
        return;
      }

      // Middle mouse button or Space+click for panning (only if not in measurement mode)
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this.topViewIsPanning = true;
        this.topViewLastMousePos = { x: mouseX, y: mouseY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
        return;
      }

      // Left click - check for light/prop/actor/camera selection/drag
      // Priority: lights > props > actors > cameras
      const threshold = 40;
      let closestLightId: string | null = null;
      let closestPropId: string | null = null;
      let closestActorId: string | null = null;
      let closestCameraId: string | null = null;
      let closestDist = Infinity;
      
      // Check lights first
      const lightDistances: Array<{ id: string; dist: number }> = [];
      for (const [id, data] of this.lights) {
        const x = cx + data.mesh.position.x * scale;
        const z = cy - data.mesh.position.z * scale;
        const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
        if (dist < threshold) {
          lightDistances.push({ id, dist });
        }
      }
      if (lightDistances.length > 0) {
        lightDistances.sort((a, b) => a.dist - b.dist);
        closestLightId = lightDistances[0].id;
        closestDist = lightDistances[0].dist;
      }

      // Check props if no light was found
      if (!closestLightId && this.topViewShowProps) {
        const store = useAppStore.getState();
        const props = store.scene.filter(n => n.type === 'prop' && n.visible);
        const propDistances: Array<{ id: string; dist: number }> = [];
        for (const prop of props) {
          const [posX, , posZ] = prop.transform.position;
          const x = cx + posX * scale;
          const z = cy - posZ * scale;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          const propThreshold = Math.max(threshold, 15 * scale);
          if (dist < propThreshold && dist < closestDist) {
            propDistances.push({ id: prop.id, dist });
          }
        }
        if (propDistances.length > 0) {
          propDistances.sort((a, b) => a.dist - b.dist);
          closestPropId = propDistances[0].id;
          closestDist = propDistances[0].dist;
        }
      }

      // Check actors/models if no light/prop was found
      if (!closestLightId && !closestPropId) {
        const store = useAppStore.getState();
        const actors = store.scene.filter(n => (n.type === 'actor' || n.type === 'model') && n.visible);
        const actorDistances: Array<{ id: string; dist: number }> = [];
        for (const actor of actors) {
          const [posX, , posZ] = actor.transform.position;
          const x = cx + posX * scale;
          const z = cy - posZ * scale;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          const actorThreshold = Math.max(threshold, 12 * scale);
          if (dist < actorThreshold && dist < closestDist) {
            actorDistances.push({ id: actor.id, dist });
          }
        }
        if (actorDistances.length > 0) {
          actorDistances.sort((a, b) => a.dist - b.dist);
          closestActorId = actorDistances[0].id;
          closestDist = actorDistances[0].dist;
        }
      }

      // Check camera presets if no light/prop/actor was found
      if (!closestLightId && !closestPropId && !closestActorId) {
        const cameraDistances: Array<{ id: string; dist: number }> = [];
        for (const [presetId, preset] of this.cameraPresets) {
          if (!preset) continue;
          const x = cx + preset.position.x * scale * 0.5;
          const z = cy - preset.position.z * scale * 0.5;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          if (dist < threshold && dist < closestDist) {
            cameraDistances.push({ id: presetId, dist });
          }
        }
        if (cameraDistances.length > 0) {
          cameraDistances.sort((a, b) => a.dist - b.dist);
          closestCameraId = cameraDistances[0].id;
        }
      }

      // Handle selection/drag based on what was found
      if (closestLightId) {
        this.topViewDraggingLightId = closestLightId;
        this.selectLight(closestLightId);
        canvas.style.cursor = 'grabbing';
      } else if (closestPropId) {
        this.topViewDraggingPropId = closestPropId;
        const store = useAppStore.getState();
        store.selectNode(closestPropId);
        canvas.style.cursor = 'grabbing';
        // Dispatch event for selection
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
          detail: { nodeId: closestPropId }
        }));
      } else if (closestActorId) {
        this.topViewDraggingActorId = closestActorId;
        const store = useAppStore.getState();
        store.selectNode(closestActorId);
        this.selectedActorId = closestActorId;
        this.selectedLightId = null;
        canvas.style.cursor = 'grabbing';
        
        // Add visual highlight to actor mesh when dragging starts
        const actorMesh = this.scene.getMeshByName(closestActorId);
        if (actorMesh) {
          this.addActorHighlight(actorMesh as BABYLON.Mesh);
        }
        
        // Dispatch event for selection
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
          detail: { nodeId: closestActorId }
        }));
      } else if (closestCameraId) {
        this.topViewDraggingCameraId = closestCameraId;
        this.selectedCameraPresetId = closestCameraId;
        canvas.style.cursor = 'grabbing';
        // Dispatch event for camera preset selection
        window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', {
          detail: { presetId: closestCameraId }
        }));
      }
    });

    canvas.addEventListener('mouseup', () => {
      // Dispatch final update when drag ends
      if (this.topViewDraggingLightId) {
        window.dispatchEvent(new CustomEvent('ch-light-position-changed', {
          detail: { lightId: this.topViewDraggingLightId }
        }));
        window.dispatchEvent(new CustomEvent('ch-light-updated', {
          detail: { lightId: this.topViewDraggingLightId }
        }));
      }
      if (this.topViewDraggingPropId) {
        window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
          detail: { nodeId: this.topViewDraggingPropId }
        }));
      }
      if (this.topViewDraggingActorId) {
        // Remove highlight when drag ends
        const actorMesh = this.scene.getMeshByName(this.topViewDraggingActorId);
        if (actorMesh) {
          this.removeActorHighlight(actorMesh as BABYLON.Mesh);
        }
        window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
          detail: { nodeId: this.topViewDraggingActorId }
        }));
      }
      if (this.topViewDraggingCameraId) {
        window.dispatchEvent(new CustomEvent('ch-camera-preset-updated', {
          detail: { presetId: this.topViewDraggingCameraId }
        }));
      }
      this.topViewDraggingLightId = null;
      this.topViewDraggingPropId = null;
      this.topViewDraggingActorId = null;
      this.topViewDraggingCameraId = null;
      this.topViewIsPanning = false;
      this.topViewLastMousePos = null;
      const hasHover = this.topViewHoveredLightId || this.topViewHoveredPropId || this.topViewHoveredActorId || this.topViewHoveredCameraId;
      canvas.style.cursor = hasHover ? 'pointer' : 'default';
    });

    canvas.addEventListener('mouseleave', () => {
      this.topViewHoveredLightId = null;
      this.topViewHoveredPropId = null;
      this.topViewHoveredActorId = null;
      this.topViewHoveredCameraId = null;
      this.topViewDraggingLightId = null;
      this.topViewDraggingPropId = null;
      this.topViewDraggingActorId = null;
      this.topViewDraggingCameraId = null;
      this.topViewIsPanning = false;
      this.topViewLastMousePos = null;
    });

    canvas.addEventListener('click', (e) => {
      // Close context menu if clicking elsewhere
      this.hideTopViewContextMenu();
      
      // Only handle click if not dragging (click after drag ends)
      if (this.topViewHoveredLightId && !this.topViewDraggingLightId && !this.topViewDraggingPropId && !this.topViewDraggingActorId && !this.topViewDraggingCameraId) {
        this.selectedActorId = null; // Clear actor selection
        this.selectLight(this.topViewHoveredLightId);
      }
      if (this.topViewHoveredPropId && !this.topViewDraggingLightId && !this.topViewDraggingPropId && !this.topViewDraggingActorId && !this.topViewDraggingCameraId) {
        const store = useAppStore.getState();
        store.selectNode(this.topViewHoveredPropId);
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
          detail: { nodeId: this.topViewHoveredPropId }
        }));
      }
      if (this.topViewHoveredActorId && !this.topViewDraggingLightId && !this.topViewDraggingPropId && !this.topViewDraggingActorId && !this.topViewDraggingCameraId) {
        const store = useAppStore.getState();
        store.selectNode(this.topViewHoveredActorId);
        this.selectedActorId = this.topViewHoveredActorId;
        this.selectedLightId = null; // Clear light selection
        this.updateTopViewInfoPanel();
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
          detail: { nodeId: this.topViewHoveredActorId }
        }));
      }
      if (this.topViewHoveredCameraId && !this.topViewDraggingLightId && !this.topViewDraggingPropId && !this.topViewDraggingActorId && !this.topViewDraggingCameraId) {
        this.selectedCameraPresetId = this.topViewHoveredCameraId;
        window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', {
          detail: { presetId: this.topViewHoveredCameraId }
        }));
      }
    });

    // Right-click context menu
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scale = this.getTopViewScale();
      const { cx, cy } = this.getTopViewCenter();

      // Check what was right-clicked
      const threshold = 40;
      let targetType: 'light' | 'prop' | 'actor' | 'camera' | null = null;
      let targetId: string | null = null;

      // Check lights
      for (const [id, data] of this.lights) {
        const x = cx + data.mesh.position.x * scale;
        const z = cy - data.mesh.position.z * scale;
        const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
        if (dist < threshold) {
          targetType = 'light';
          targetId = id;
          break;
        }
      }

      // Check props
      if (!targetType) {
        const store = useAppStore.getState();
        const props = store.scene.filter(node => node.type === 'prop' && node.visible);
        for (const prop of props) {
          const [posX, , posZ] = prop.transform.position;
          const x = cx + posX * scale;
          const z = cy - posZ * scale;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          const propThreshold = Math.max(threshold, 15 * scale);
          if (dist < propThreshold) {
            targetType = 'prop';
            targetId = prop.id;
            break;
          }
        }
      }

      // Check actors/models
      if (!targetType) {
        const store = useAppStore.getState();
        const actors = store.scene.filter(node => (node.type === 'actor' || node.type === 'model') && node.visible);
        for (const actor of actors) {
          const [posX, , posZ] = actor.transform.position;
          const x = cx + posX * scale;
          const z = cy - posZ * scale;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          const actorThreshold = Math.max(threshold, 12 * scale);
          if (dist < actorThreshold) {
            targetType = 'actor';
            targetId = actor.id;
            break;
          }
        }
      }

      // Check cameras
      if (!targetType) {
        for (const [id, preset] of this.cameraPresets) {
          if (!preset) continue;
          const x = cx + preset.position.x * scale * 0.5;
          const z = cy - preset.position.z * scale * 0.5;
          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - z) ** 2);
          if (dist < threshold) {
            targetType = 'camera';
            targetId = id;
            break;
          }
        }
      }

      if (targetType && targetId) {
        this.showTopViewContextMenu(e.clientX, e.clientY, targetType, targetId);
      }
    });

    // --- WHEEL ZOOM ---
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.topViewZoom = Math.max(0.25, Math.min(4, this.topViewZoom * zoomFactor));
      this.updateTopViewScaleInfo();
    }, { passive: false });

    // --- TOUCH EVENTS ---
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Single touch - drag or select
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        const scale = this.getTopViewScale();
        const { cx, cy } = this.getTopViewCenter();

        // Check if touching a light/prop/actor/camera - priority: lights > props > actors > cameras
        const threshold = 25;
        let closestLightId: string | null = null;
        let closestPropId: string | null = null;
        let closestActorId: string | null = null;
        let closestCameraId: string | null = null;
        let closestDist = Infinity;
        
        // Check lights
        for (const [id, data] of this.lights) {
          const x = cx + data.mesh.position.x * scale;
          const z = cy - data.mesh.position.z * scale;
          const dist = Math.sqrt((touchX - x) ** 2 + (touchY - z) ** 2);
          if (dist < threshold && dist < closestDist) {
            closestDist = dist;
            closestLightId = id;
          }
        }

        // Check props if no light
        if (!closestLightId && this.topViewShowProps) {
          const store = useAppStore.getState();
          const props = store.scene.filter(n => n.type === 'prop' && n.visible);
          for (const prop of props) {
            const [posX, , posZ] = prop.transform.position;
            const x = cx + posX * scale;
            const z = cy - posZ * scale;
            const dist = Math.sqrt((touchX - x) ** 2 + (touchY - z) ** 2);
            const propThreshold = Math.max(threshold, 15 * scale);
            if (dist < propThreshold && dist < closestDist) {
              closestDist = dist;
              closestPropId = prop.id;
            }
          }
        }

        // Check actors/models if no light/prop
        if (!closestLightId && !closestPropId) {
          const store = useAppStore.getState();
          const actors = store.scene.filter(n => (n.type === 'actor' || n.type === 'model') && n.visible);
          for (const actor of actors) {
            const [posX, , posZ] = actor.transform.position;
            const x = cx + posX * scale;
            const z = cy - posZ * scale;
            const dist = Math.sqrt((touchX - x) ** 2 + (touchY - z) ** 2);
            const actorThreshold = Math.max(threshold, 12 * scale);
            if (dist < actorThreshold && dist < closestDist) {
              closestDist = dist;
              closestActorId = actor.id;
            }
          }
        }

        // Check camera presets if no light/prop/actor
        if (!closestLightId && !closestPropId && !closestActorId) {
          for (const [presetId, preset] of this.cameraPresets) {
            if (!preset) continue;
            const x = cx + preset.position.x * scale * 0.5;
            const z = cy - preset.position.z * scale * 0.5;
            const dist = Math.sqrt((touchX - x) ** 2 + (touchY - z) ** 2);
            if (dist < threshold && dist < closestDist) {
              closestDist = dist;
              closestCameraId = presetId;
            }
          }
        }
        
        if (closestLightId) {
          this.topViewDraggingLightId = closestLightId;
          this.selectLight(closestLightId);
        } else if (closestPropId) {
          this.topViewDraggingPropId = closestPropId;
          const store = useAppStore.getState();
          store.selectNode(closestPropId);
          window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
            detail: { nodeId: closestPropId }
          }));
        } else if (closestActorId) {
          this.topViewDraggingActorId = closestActorId;
          const store = useAppStore.getState();
          store.selectNode(closestActorId);
          this.selectedActorId = closestActorId;
          this.selectedLightId = null;
          
          // Add visual highlight to actor mesh when touch dragging starts
          const actorMesh = this.scene.getMeshByName(closestActorId);
          if (actorMesh) {
            this.addActorHighlight(actorMesh as BABYLON.Mesh);
          }
          
          window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
            detail: { nodeId: closestActorId }
          }));
        } else if (closestCameraId) {
          this.topViewDraggingCameraId = closestCameraId;
          this.selectedCameraPresetId = closestCameraId;
          window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', {
            detail: { presetId: closestCameraId }
          }));
        }

        if (!this.topViewDraggingLightId && !this.topViewDraggingPropId && !this.topViewDraggingActorId && !this.topViewDraggingCameraId) {
          // Start panning
          this.topViewIsPanning = true;
          this.topViewLastMousePos = { x: touchX, y: touchY };
        }
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.topViewTouchStartDist = Math.sqrt(dx * dx + dy * dy);
        this.topViewTouchStartZoom = this.topViewZoom;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      const rect = canvas.getBoundingClientRect();

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        const scale = this.getTopViewScale();
        const { cx, cy } = this.getTopViewCenter();

        if (this.topViewDraggingLightId) {
          // Drag light
          const light = this.lights.get(this.topViewDraggingLightId);
          if (light) {
            let worldX = (touchX - cx) / scale;
            let worldZ = -(touchY - cy) / scale;

            if (this.topViewSnapToGrid) {
              worldX = this.snapToGrid(worldX);
              worldZ = this.snapToGrid(worldZ);
            }

            light.mesh.position.x = worldX;
            light.mesh.position.z = worldZ;
            if (light.light instanceof BABYLON.SpotLight || light.light instanceof BABYLON.DirectionalLight) {
              light.light.position.x = worldX;
              light.light.position.z = worldZ;
            }
            
            window.dispatchEvent(new CustomEvent('ch-light-position-changed', {
              detail: { lightId: this.topViewDraggingLightId }
            }));
          }
        } else if (this.topViewDraggingPropId) {
          // Drag prop
          const store = useAppStore.getState();
          const prop = store.scene.find(n => n.id === this.topViewDraggingPropId && n.type === 'prop');
          if (prop) {
            let worldX = (touchX - cx) / scale;
            let worldZ = -(touchY - cy) / scale;

            if (this.topViewSnapToGrid) {
              worldX = this.snapToGrid(worldX);
              worldZ = this.snapToGrid(worldZ);
            }

            const [_, posY, __] = prop.transform.position;
            store.updateNode(this.topViewDraggingPropId, {
              transform: {
                ...prop.transform,
                position: [worldX, posY, worldZ]
              }
            });

            window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
              detail: { nodeId: this.topViewDraggingPropId }
            }));
          }
        } else if (this.topViewDraggingActorId) {
          // Drag actor/model
          const store = useAppStore.getState();
          const actor = store.scene.find(n => n.id === this.topViewDraggingActorId && (n.type === 'actor' || n.type === 'model'));
          if (actor) {
            let worldX = (touchX - cx) / scale;
            let worldZ = -(touchY - cy) / scale;

            if (this.topViewSnapToGrid) {
              worldX = this.snapToGrid(worldX);
              worldZ = this.snapToGrid(worldZ);
            }

            // Also update the mesh position if it exists, or create it if it doesn't
            let actorMesh = this.scene.getMeshByName(actor.id);
            if (!actorMesh) {
              // Mesh doesn't exist, create it
              this.addActorToScene(actor.id);
              actorMesh = this.scene.getMeshByName(actor.id);
            }
            
            if (actorMesh) {
              // Set X and Z position first
              actorMesh.position.x = worldX;
              actorMesh.position.z = worldZ;
              
              // Use positionMeshOnGround to calculate correct Y position so object lands on floor
              const newPosition = this.positionMeshOnGround(actorMesh, new BABYLON.Vector3(worldX, 0, worldZ));
              actorMesh.position = newPosition;
              
              // Update the node's Y position in store to match the calculated position
              store.updateNode(this.topViewDraggingActorId, {
                transform: {
                  ...actor.transform,
                  position: [worldX, newPosition.y, worldZ]
                }
              });
              
              // Force mesh update and ensure highlight is visible during drag
              actorMesh.computeWorldMatrix(true);
              this.addActorHighlight(actorMesh as BABYLON.Mesh);
            }

            window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
              detail: { nodeId: this.topViewDraggingActorId }
            }));
          }
        } else if (this.topViewDraggingCameraId) {
          // Drag camera preset
          const preset = this.cameraPresets.get(this.topViewDraggingCameraId);
          if (preset) {
            let worldX = (touchX - cx) / scale;
            let worldZ = -(touchY - cy) / scale;

            if (this.topViewSnapToGrid) {
              worldX = this.snapToGrid(worldX);
              worldZ = this.snapToGrid(worldZ);
            }

            preset.position.x = worldX * 2;
            preset.position.z = worldZ * 2;

            window.dispatchEvent(new CustomEvent('ch-camera-preset-updated', {
              detail: { presetId: this.topViewDraggingCameraId }
            }));
          }
        } else if (this.topViewIsPanning && this.topViewLastMousePos) {
          // Pan
          const dx = touchX - this.topViewLastMousePos.x;
          const dy = touchY - this.topViewLastMousePos.y;
          this.topViewPan.x += dx;
          this.topViewPan.y += dy;
          this.topViewLastMousePos = { x: touchX, y: touchY };
        }
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const zoomChange = dist / this.topViewTouchStartDist;
        this.topViewZoom = Math.max(0.25, Math.min(4, this.topViewTouchStartZoom * zoomChange));
        this.updateTopViewScaleInfo();
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      // Dispatch final update when touch drag ends
      if (this.topViewDraggingLightId) {
        window.dispatchEvent(new CustomEvent('ch-light-position-changed', {
          detail: { lightId: this.topViewDraggingLightId }
        }));
        window.dispatchEvent(new CustomEvent('ch-light-updated', {
          detail: { lightId: this.topViewDraggingLightId }
        }));
      }
      if (this.topViewDraggingPropId) {
        window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
          detail: { nodeId: this.topViewDraggingPropId }
        }));
      }
      if (this.topViewDraggingActorId) {
        // Remove highlight when touch drag ends
        const actorMesh = this.scene.getMeshByName(this.topViewDraggingActorId);
        if (actorMesh) {
          this.removeActorHighlight(actorMesh as BABYLON.Mesh);
        }
        window.dispatchEvent(new CustomEvent('ch-scene-node-updated', {
          detail: { nodeId: this.topViewDraggingActorId }
        }));
      }
      if (this.topViewDraggingCameraId) {
        window.dispatchEvent(new CustomEvent('ch-camera-preset-updated', {
          detail: { presetId: this.topViewDraggingCameraId }
        }));
      }
      this.topViewDraggingLightId = null;
      this.topViewDraggingPropId = null;
      this.topViewDraggingActorId = null;
      this.topViewDraggingCameraId = null;
      this.topViewIsPanning = false;
      this.topViewLastMousePos = null;
    });

    // --- KEYBOARD SHORTCUTS ---
    canvas.setAttribute('tabindex', '0');
    canvas.addEventListener('keydown', (e) => {
      switch (e.key) {
        case '+':
        case '=':
          this.topViewZoom = Math.min(4, this.topViewZoom * 1.2);
          this.updateTopViewScaleInfo();
          break;
        case '-':
        case '_':
          this.topViewZoom = Math.max(0.25, this.topViewZoom / 1.2);
          this.updateTopViewScaleInfo();
          break;
        case 'r':
        case 'R':
          this.resetTopView();
          break;
        case 'g':
        case 'G':
          this.topViewShowGrid = !this.topViewShowGrid;
          document.getElementById('topviewGrid')?.classList.toggle('active', this.topViewShowGrid);
          break;
        case 'a':
        case 'A':
          this.topViewShowAngleGuides = !this.topViewShowAngleGuides;
          document.getElementById('topviewAngles')?.classList.toggle('active', this.topViewShowAngleGuides);
          break;
        case 'c':
        case 'C':
          this.topViewShowLightCones = !this.topViewShowLightCones;
          document.getElementById('topviewCones')?.classList.toggle('active', this.topViewShowLightCones);
          break;
        case 'l':
        case 'L':
          this.topViewShowLabels = !this.topViewShowLabels;
          document.getElementById('topviewLabels')?.classList.toggle('active', this.topViewShowLabels);
          break;
        case 'm':
        case 'M':
          this.topViewMeasurementMode = !this.topViewMeasurementMode;
          document.getElementById('topviewMeasure')?.classList.toggle('active', this.topViewMeasurementMode);
          if (!this.topViewMeasurementMode) {
            this.topViewCurrentMeasurement = { start: null, end: null };
          }
          break;
        case 't':
        case 'T':
          this.topViewShowCCTColors = !this.topViewShowCCTColors;
          document.getElementById('topviewCCT')?.classList.toggle('active', this.topViewShowCCTColors);
          break;
        case 'f':
        case 'F':
          this.topViewShowLightFalloff = !this.topViewShowLightFalloff;
          document.getElementById('topviewFalloff')?.classList.toggle('active', this.topViewShowLightFalloff);
          break;
      }
    });

    // --- TOOLBAR BUTTONS ---
    this.setupTopViewToolbarButtons();

    // Setup context menu
    this.setupTopViewContextMenu();
  }

  private setupTopViewContextMenu(): void {
    const contextMenu = document.getElementById('topviewContextMenu');
    if (!contextMenu) return;

    // Select in 3D view
    document.getElementById('topviewContextSelect')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'light') {
        this.selectLight(id);
      } else if (type === 'prop') {
        const store = useAppStore.getState();
        store.selectNode(id);
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', { detail: { nodeId: id } }));
      } else if (type === 'actor') {
        const store = useAppStore.getState();
        store.selectNode(id);
        this.selectedActorId = id;
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', { detail: { nodeId: id } }));
        this.updateTopViewInfoPanel();
      } else if (type === 'camera') {
        this.selectedCameraPresetId = id;
        window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', { detail: { presetId: id } }));
      }
      
      this.hideTopViewContextMenu();
    });

    // Delete
    document.getElementById('topviewContextDelete')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'light') {
        this.removeLight(id);
      } else if (type === 'prop' || type === 'actor') {
        const store = useAppStore.getState();
        store.removeNode(id);
        // Also remove from 3D scene if it's a mesh
        const mesh = this.scene.getMeshByName(id);
        if (mesh) {
          mesh.dispose();
        }
        // Clear actor selection if this was the selected actor
        if (type === 'actor' && this.selectedActorId === id) {
          this.selectedActorId = null;
          this.updateTopViewInfoPanel();
        }
        window.dispatchEvent(new CustomEvent('ch-scene-node-removed', { detail: { nodeId: id } }));
      } else if (type === 'camera') {
        this.cameraPresets.delete(id);
        window.dispatchEvent(new CustomEvent('ch-camera-preset-removed', { detail: { presetId: id } }));
      }
      
      this.hideTopViewContextMenu();
      this.updateTopView();
    });

    // Properties (focus on properties panel - already selected via select action)
    document.getElementById('topviewContextProperties')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      // Select first, which will show properties
      if (type === 'light') {
        this.selectLight(id);
      } else if (type === 'prop' || type === 'actor') {
        const store = useAppStore.getState();
        store.selectNode(id);
        if (type === 'actor') {
          this.selectedActorId = id;
          this.updateTopViewInfoPanel();
        }
        window.dispatchEvent(new CustomEvent('ch-scene-node-selected', { detail: { nodeId: id } }));
      } else if (type === 'camera') {
        this.selectedCameraPresetId = id;
        window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', { detail: { presetId: id } }));
      }
      
      this.hideTopViewContextMenu();
    });

    // Duplicate
    document.getElementById('topviewContextDuplicate')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'actor' || type === 'prop') {
        const store = useAppStore.getState();
        const node = store.getNode(id);
        if (node) {
          const newNode: typeof node = {
            ...node,
            id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${node.name} (kopi)`,
            transform: {
              position: [
                node.transform.position[0] + 0.5,
                node.transform.position[1],
                node.transform.position[2] + 0.5
              ],
              rotation: [...node.transform.rotation] as [number, number, number],
              scale: [...node.transform.scale] as [number, number, number],
            },
          };
          store.addNode(newNode);
          
          // If it's an actor, also create the mesh in 3D scene
          if (type === 'actor') {
            this.addActorToScene(newNode.id);
          }
          
          window.dispatchEvent(new CustomEvent('ch-scene-node-selected', { detail: { nodeId: newNode.id } }));
        }
      }
      
      this.hideTopViewContextMenu();
      this.updateTopView();
    });

    // Rename
    document.getElementById('topviewContextRename')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'actor' || type === 'prop') {
        const store = useAppStore.getState();
        const node = store.getNode(id);
        if (node) {
          const newName = window.prompt('Gi nytt navn:', node.name);
          if (newName && newName.trim()) {
            store.updateNode(id, { name: newName.trim() });
            this.updateTopView();
            this.updateTopViewInfoPanel();
          }
        }
      }
      
      this.hideTopViewContextMenu();
    });

    // Lock
    document.getElementById('topviewContextLock')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'actor' || type === 'prop') {
        const store = useAppStore.getState();
        store.updateNode(id, { locked: true });
      }
      
      this.hideTopViewContextMenu();
    });

    // Unlock
    document.getElementById('topviewContextUnlock')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'actor' || type === 'prop') {
        const store = useAppStore.getState();
        store.updateNode(id, { locked: false });
      }
      
      this.hideTopViewContextMenu();
    });

    // Hide
    document.getElementById('topviewContextHide')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'actor' || type === 'prop') {
        const store = useAppStore.getState();
        store.updateNode(id, { visible: false });
        const mesh = this.scene.getMeshByName(id);
        if (mesh) {
          mesh.setEnabled(false);
        }
        this.updateTopView();
      }
      
      this.hideTopViewContextMenu();
    });

    // Show
    document.getElementById('topviewContextShow')?.addEventListener('click', () => {
      if (!this.topViewContextMenuTarget) return;
      const { type, id } = this.topViewContextMenuTarget;
      
      if (type === 'actor' || type === 'prop') {
        const store = useAppStore.getState();
        store.updateNode(id, { visible: true });
        const mesh = this.scene.getMeshByName(id);
        if (mesh) {
          mesh.setEnabled(true);
        }
        this.updateTopView();
      }
      
      this.hideTopViewContextMenu();
    });

    // Hide context menu when clicking outside
    document.addEventListener('click', () => {
      this.hideTopViewContextMenu();
    });
  }

  private showTopViewContextMenu(x: number, y: number, type: 'light' | 'prop' | 'actor' | 'camera', id: string): void {
    const contextMenu = document.getElementById('topviewContextMenu');
    if (!contextMenu) return;

    this.topViewContextMenuTarget = { type, id };
    
    // Show/hide context menu items based on type
    const duplicateBtn = document.getElementById('topviewContextDuplicate');
    const renameBtn = document.getElementById('topviewContextRename');
    const lockBtn = document.getElementById('topviewContextLock');
    const unlockBtn = document.getElementById('topviewContextUnlock');
    const hideBtn = document.getElementById('topviewContextHide');
    const showBtn = document.getElementById('topviewContextShow');
    
    if (type === 'actor' || type === 'prop') {
      const store = useAppStore.getState();
      const node = store.getNode(id);
      
      if (duplicateBtn) duplicateBtn.style.display = 'block';
      if (renameBtn) renameBtn.style.display = 'block';
      
      if (node) {
        if (node.locked) {
          if (lockBtn) lockBtn.style.display = 'none';
          if (unlockBtn) unlockBtn.style.display = 'block';
        } else {
          if (lockBtn) lockBtn.style.display = 'block';
          if (unlockBtn) unlockBtn.style.display = 'none';
        }
        
        if (node.visible) {
          if (hideBtn) hideBtn.style.display = 'block';
          if (showBtn) showBtn.style.display = 'none';
        } else {
          if (hideBtn) hideBtn.style.display = 'none';
          if (showBtn) showBtn.style.display = 'block';
        }
      }
    } else {
      if (duplicateBtn) duplicateBtn.style.display = 'none';
      if (renameBtn) renameBtn.style.display = 'none';
      if (lockBtn) lockBtn.style.display = 'none';
      if (unlockBtn) unlockBtn.style.display = 'none';
      if (hideBtn) hideBtn.style.display = 'none';
      if (showBtn) showBtn.style.display = 'none';
    }
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    
    // Adjust position if menu goes off screen
    setTimeout(() => {
      const rect = contextMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${y - rect.height}px`;
      }
    }, 0);
  }

  private hideTopViewContextMenu(): void {
    const contextMenu = document.getElementById('topviewContextMenu');
    if (contextMenu) {
      contextMenu.style.display = 'none';
    }
    this.topViewContextMenuTarget = null;
  }

  private setupTopViewToolbarButtons(): void {
    // Zoom In
    document.getElementById('topviewZoomIn')?.addEventListener('click', () => {
      this.topViewZoom = Math.min(4, this.topViewZoom * 1.2);
      this.updateTopViewScaleInfo();
    });

    // Zoom Out
    document.getElementById('topviewZoomOut')?.addEventListener('click', () => {
      this.topViewZoom = Math.max(0.25, this.topViewZoom / 1.2);
      this.updateTopViewScaleInfo();
    });

    // Reset View
    document.getElementById('topviewReset')?.addEventListener('click', () => {
      this.resetTopView();
    });

    // Toggle Grid
    document.getElementById('topviewGrid')?.addEventListener('click', () => {
      this.topViewShowGrid = !this.topViewShowGrid;
      document.getElementById('topviewGrid')?.classList.toggle('active', this.topViewShowGrid);
    });

    // Toggle Angle Guides
    document.getElementById('topviewAngles')?.addEventListener('click', () => {
      this.topViewShowAngleGuides = !this.topViewShowAngleGuides;
      document.getElementById('topviewAngles')?.classList.toggle('active', this.topViewShowAngleGuides);
    });

    // Toggle Snap to Grid
    document.getElementById('topviewSnap')?.addEventListener('click', () => {
      this.topViewSnapToGrid = !this.topViewSnapToGrid;
      document.getElementById('topviewSnap')?.classList.toggle('active', this.topViewSnapToGrid);
    });

    // Toggle Light Cones
    document.getElementById('topviewCones')?.addEventListener('click', () => {
      this.topViewShowLightCones = !this.topViewShowLightCones;
      document.getElementById('topviewCones')?.classList.toggle('active', this.topViewShowLightCones);
    });

    // Toggle Labels
    document.getElementById('topviewLabels')?.addEventListener('click', () => {
      this.topViewShowLabels = !this.topViewShowLabels;
      document.getElementById('topviewLabels')?.classList.toggle('active', this.topViewShowLabels);
    });

    // Toggle Walls
    document.getElementById('topviewWalls')?.addEventListener('click', () => {
      this.topViewShowWalls = !this.topViewShowWalls;
      document.getElementById('topviewWalls')?.classList.toggle('active', this.topViewShowWalls);
    });

    // Toggle Floor
    document.getElementById('topviewFloor')?.addEventListener('click', () => {
      this.topViewShowFloor = !this.topViewShowFloor;
      document.getElementById('topviewFloor')?.classList.toggle('active', this.topViewShowFloor);
    });

    // Toggle Props
    document.getElementById('topviewProps')?.addEventListener('click', () => {
      this.topViewShowProps = !this.topViewShowProps;
      document.getElementById('topviewProps')?.classList.toggle('active', this.topViewShowProps);
    });

    // Toggle Measurement Mode
    document.getElementById('topviewMeasure')?.addEventListener('click', () => {
      this.topViewMeasurementMode = !this.topViewMeasurementMode;
      document.getElementById('topviewMeasure')?.classList.toggle('active', this.topViewMeasurementMode);
      // Reset current measurement when toggling off
      if (!this.topViewMeasurementMode) {
        this.topViewCurrentMeasurement = { start: null, end: null };
      }
    });

    // Toggle CCT Colors
    document.getElementById('topviewCCT')?.addEventListener('click', () => {
      this.topViewShowCCTColors = !this.topViewShowCCTColors;
      document.getElementById('topviewCCT')?.classList.toggle('active', this.topViewShowCCTColors);
    });

    // Toggle Light Falloff
    document.getElementById('topviewFalloff')?.addEventListener('click', () => {
      this.topViewShowLightFalloff = !this.topViewShowLightFalloff;
      document.getElementById('topviewFalloff')?.classList.toggle('active', this.topViewShowLightFalloff);
    });

    // Toggle Pattern Guides
    document.getElementById('topviewPatterns')?.addEventListener('click', () => {
      this.topViewShowPatternGuides = !this.topViewShowPatternGuides;
      document.getElementById('topviewPatterns')?.classList.toggle('active', this.topViewShowPatternGuides);
      if (!this.topViewShowPatternGuides) {
        this.topViewSelectedPattern = 'none';
      }
    });

    // Pattern selection (right-click or long-press on pattern button)
    const patternBtn = document.getElementById('topviewPatterns');
    if (patternBtn) {
      let patternCycleTimeout: number | null = null;
      patternBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const patterns: Array<'rembrandt' | 'butterfly' | 'loop' | 'none'> = ['rembrandt', 'butterfly', 'loop', 'none'];
        const currentIndex = patterns.indexOf(this.topViewSelectedPattern);
        const nextIndex = (currentIndex + 1) % patterns.length;
        this.topViewSelectedPattern = patterns[nextIndex];
        this.topViewShowPatternGuides = this.topViewSelectedPattern !== 'none';
        patternBtn.classList.toggle('active', this.topViewShowPatternGuides);
      });
      
      // Single click cycles through patterns
      patternBtn.addEventListener('click', (e) => {
        if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
          const patterns: Array<'rembrandt' | 'butterfly' | 'loop' | 'none'> = ['rembrandt', 'butterfly', 'loop', 'none'];
          const currentIndex = patterns.indexOf(this.topViewSelectedPattern);
          const nextIndex = (currentIndex + 1) % patterns.length;
          this.topViewSelectedPattern = patterns[nextIndex];
          this.topViewShowPatternGuides = this.topViewSelectedPattern !== 'none';
          patternBtn.classList.toggle('active', this.topViewShowPatternGuides);
        }
      });
    }

    // Toggle Shadow Visualization
    document.getElementById('topviewShadows')?.addEventListener('click', () => {
      this.topViewShowShadows = !this.topViewShowShadows;
      document.getElementById('topviewShadows')?.classList.toggle('active', this.topViewShowShadows);
    });

    // Export Top View
    document.getElementById('topviewExport')?.addEventListener('click', () => {
      this.exportTopView();
    });

    // Clear measurements (double-click on measure button or add separate button)
    document.getElementById('topviewMeasure')?.addEventListener('dblclick', () => {
      this.topViewMeasurements = [];
      this.topViewCurrentMeasurement = { start: null, end: null };
    });

    // Fullscreen
    document.getElementById('topviewFullscreen')?.addEventListener('click', () => {
      this.toggleTopViewFullscreen();
    });

    // Exit fullscreen button
    document.getElementById('topviewExitFullscreen')?.addEventListener('click', () => {
      this.toggleTopViewFullscreen(false);
    });

    // Listen for Escape key in fullscreen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.topViewIsFullscreen) {
        this.toggleTopViewFullscreen(false);
      }
    });
    
    // Delete/Backspace to remove selected light
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedLightId) {
          e.preventDefault();
          const lightName = this.lights.get(this.selectedLightId)?.name || this.selectedLightId;
          this.removeLight(this.selectedLightId);
          console.log(`Deleted light: ${lightName}`);
          
          // Dispatch event to update UI
          window.dispatchEvent(new CustomEvent('light-deleted'));
        }
      }
    });
  }

  private toggleTopViewFullscreen(force?: boolean): void {
    const container = this.topViewCanvas?.parentElement;
    if (!container) return;

    this.topViewIsFullscreen = force !== undefined ? force : !this.topViewIsFullscreen;
    container.classList.toggle('fullscreen', this.topViewIsFullscreen);

    // Update fullscreen button icon
    const btn = document.getElementById('topviewFullscreen');
    if (btn) {
      btn.classList.toggle('active', this.topViewIsFullscreen);
      btn.title = this.topViewIsFullscreen ? 'Avslutt fullskjerm (Esc)' : 'Fullskjerm';
    }

    // Resize canvas for fullscreen
    if (this.topViewIsFullscreen) {
      this.resizeCanvases();
    } else {
      this.resizeCanvases();
    }
  }

  private resetTopView(): void {
    this.topViewZoom = 1.0;
    this.topViewPan = { x: 0, y: 0 };
    this.updateTopViewScaleInfo();
  }

  private updateTopViewScaleInfo(): void {
    const scaleH = document.querySelector('.scale-info .scale-h');
    const scaleV = document.querySelector('.scale-info .scale-v');
    if (scaleH && scaleV) {
      const metersVisible = 12 / this.topViewZoom;
      scaleH.textContent = `${metersVisible.toFixed(1)} m`;
      scaleV.textContent = `${metersVisible.toFixed(1)} m`;
    }

    // Update zoom indicator
    const zoomLevel = document.getElementById('topviewZoomLevel');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.topViewZoom * 100)}%`;
    }
  }

  private updateTopViewInfoPanel(): void {
    const posYRow = document.getElementById('topviewInfoPosYRow');
    const rotationRow = document.getElementById('topviewInfoRotationRow');
    const heightRow = document.getElementById('topviewInfoHeightRow');
    const intensityRow = document.getElementById('topviewInfoIntensity')?.parentElement;
    const keyFillRow = document.getElementById('topviewInfoKeyFill')?.parentElement;
    
    // Check if actor is selected
    if (this.selectedActorId) {
      const store = useAppStore.getState();
      const actorNode = store.getNode(this.selectedActorId);
      
      if (actorNode && (actorNode.type === 'actor' || actorNode.type === 'model')) {
        const [posX, posY, posZ] = actorNode.transform.position;
        const [rotX, rotY, rotZ] = actorNode.transform.rotation;
        const distance = Math.sqrt(posX * posX + posZ * posZ);
        
        // Calculate distance to camera
        const cameraPos = this.camera.position;
        const cameraDist = Math.sqrt(
          (posX - cameraPos.x) ** 2 + 
          (posY - cameraPos.y) ** 2 + 
          (posZ - cameraPos.z) ** 2
        );
        
        // Get height from userData or calculate from scale
        const userData = actorNode.userData as Record<string, unknown> | undefined;
        const height = (userData?.height as number) || 175;
        const heightInMeters = height / 100;
        
        document.getElementById('topviewInfoTitle')!.textContent = actorNode.name || 'Actor';
        document.getElementById('topviewInfoPosX')!.textContent = `${posX.toFixed(2)} m`;
        document.getElementById('topviewInfoPosZ')!.textContent = `${posZ.toFixed(2)} m`;
        document.getElementById('topviewInfoDist')!.textContent = `${cameraDist.toFixed(2)} m`;
        document.getElementById('topviewInfoAngle')!.textContent = `${(rotY * 180 / Math.PI).toFixed(1)}°`;
        
        // Show actor-specific fields
        if (posYRow) posYRow.style.display = 'flex';
        if (rotationRow) rotationRow.style.display = 'flex';
        if (heightRow) heightRow.style.display = 'flex';
        if (intensityRow) intensityRow.style.display = 'none';
        if (keyFillRow) keyFillRow.style.display = 'none';
        
        const posYEl = document.getElementById('topviewInfoPosY');
        const rotationEl = document.getElementById('topviewInfoRotation');
        const heightEl = document.getElementById('topviewInfoHeight');
        
        if (posYEl) posYEl.textContent = `${posY.toFixed(2)} m`;
        if (rotationEl) rotationEl.textContent = `${(rotY * 180 / Math.PI).toFixed(1)}°`;
        if (heightEl) heightEl.textContent = `${heightInMeters.toFixed(2)} m`;
        
        return;
      }
    }
    
    // Default to light info panel
    if (!this.selectedLightId) {
      document.getElementById('topviewInfoTitle')!.textContent = 'Ingen lys valgt';
      document.getElementById('topviewInfoPosX')!.textContent = '-';
      document.getElementById('topviewInfoPosZ')!.textContent = '-';
      document.getElementById('topviewInfoDist')!.textContent = '-';
      document.getElementById('topviewInfoAngle')!.textContent = '-';
      document.getElementById('topviewInfoIntensity')!.textContent = '-';
      document.getElementById('topviewInfoKeyFill')!.textContent = '-';
      
      // Hide actor-specific fields
      if (posYRow) posYRow.style.display = 'none';
      if (rotationRow) rotationRow.style.display = 'none';
      if (heightRow) heightRow.style.display = 'none';
      if (intensityRow) intensityRow.style.display = 'flex';
      if (keyFillRow) keyFillRow.style.display = 'flex';
      
      return;
    }

    const light = this.lights.get(this.selectedLightId);
    if (!light) return;

    const posX = light.mesh.position.x;
    const posZ = light.mesh.position.z;
    const distance = Math.sqrt(posX * posX + posZ * posZ);
    const angle = this.calculateLightAngle(posX, posZ);
    const intensity = light.light.intensity;

    document.getElementById('topviewInfoTitle')!.textContent = light.name || this.selectedLightId;
    document.getElementById('topviewInfoPosX')!.textContent = `${posX.toFixed(2)} m`;
    document.getElementById('topviewInfoPosZ')!.textContent = `${posZ.toFixed(2)} m`;
    document.getElementById('topviewInfoDist')!.textContent = `${distance.toFixed(2)} m`;
    document.getElementById('topviewInfoAngle')!.textContent = `${angle.toFixed(1)}°`;
    document.getElementById('topviewInfoIntensity')!.textContent = `${(intensity * 100).toFixed(0)}%`;
    
    // Hide actor-specific fields
    if (posYRow) posYRow.style.display = 'none';
    if (rotationRow) rotationRow.style.display = 'none';
    if (heightRow) heightRow.style.display = 'none';
    if (intensityRow) intensityRow.style.display = 'flex';
    if (keyFillRow) keyFillRow.style.display = 'flex';
    
    // Calculate Key:Fill ratio
    const keyFillRatio = this.calculateKeyFillRatio();
    const keyFillElement = document.getElementById('topviewInfoKeyFill');
    if (keyFillElement) {
      if (keyFillRatio !== null) {
        keyFillElement.textContent = `${keyFillRatio.toFixed(2)}:1`;
      } else {
        keyFillElement.textContent = 'N/A';
      }
    }
  }

  private calculateKeyFillRatio(): number | null {
    // Find key light (brightest light, typically at 30-60° angle)
    let keyLight: { id: string; intensity: number } | null = null;
    let fillLight: { id: string; intensity: number } | null = null;
    
    const lights: Array<{ id: string; data: LightData; intensity: number; angle: number }> = [];
    
    for (const [id, data] of this.lights) {
      if (!data.enabled) continue;
      const posX = data.mesh.position.x;
      const posZ = data.mesh.position.z;
      const angle = this.calculateLightAngle(posX, posZ);
      const effectiveIntensity = data.light.intensity * (data.powerMultiplier || 1.0);
      lights.push({ id, data, intensity: effectiveIntensity, angle });
    }
    
    if (lights.length < 2) return null;
    
    // Sort by intensity (descending)
    lights.sort((a, b) => b.intensity - a.intensity);
    
    // Key light is typically the brightest, or one positioned at ~45° (key angle)
    // Look for lights in the key light position range (30-60°)
    const keyCandidates = lights.filter(l => Math.abs(l.angle) >= 30 && Math.abs(l.angle) <= 60);
    if (keyCandidates.length > 0) {
      keyLight = { id: keyCandidates[0].id, intensity: keyCandidates[0].intensity };
    } else {
      // Fallback: brightest light is key
      keyLight = { id: lights[0].id, intensity: lights[0].intensity };
    }
    
    // Fill light is typically on the opposite side or second brightest
    // Look for lights on opposite side or second brightest
    if (keyLight) {
      const keyAngle = lights.find(l => l.id === keyLight!.id)?.angle || 0;
      const oppositeAngle = -keyAngle;
      const fillCandidates = lights.filter(l => 
        l.id !== keyLight!.id && 
        (Math.abs(l.angle - oppositeAngle) < 45 || Math.abs(l.angle + oppositeAngle) < 45)
      );
      
      if (fillCandidates.length > 0) {
        fillLight = { id: fillCandidates[0].id, intensity: fillCandidates[0].intensity };
      } else {
        // Fallback: second brightest light
        const secondBrightest = lights.find(l => l.id !== keyLight!.id);
        if (secondBrightest) {
          fillLight = { id: secondBrightest.id, intensity: secondBrightest.intensity };
        }
      }
    }
    
    if (!keyLight || !fillLight || fillLight.intensity === 0) {
      return null;
    }
    
    return keyLight.intensity / fillLight.intensity;
  }

  private histogramData: { r: number[], g: number[], b: number[], lum: number[] } = {
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    lum: new Array(256).fill(0)
  };
  private highlightClipping: number = 0;
  private shadowClipping: number = 0;
  private histogramFrameCount: number = 0;
  private lastHistogramUpdate: number = 0;
  private histogramUpdateInterval: number = 100; // ms between updates
  private pixelReadBuffer: Uint8Array | null = null;
  private isReadingPixels: boolean = false;

  private updateHistogram(): void {
    if (!this.histogramCtx || !this.histogramCanvas) return;

    const now = performance.now();
    
    // Throttle histogram calculation for performance (every 100ms)
    if (now - this.lastHistogramUpdate >= this.histogramUpdateInterval && !this.isReadingPixels) {
      this.lastHistogramUpdate = now;
      this.calculateHistogramFromScene();
    }

    // Always draw current mode (uses cached data)
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
    if (this.isReadingPixels) return;
    this.isReadingPixels = true;
    
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    
    // Adaptive sampling: more pixels for smaller resolutions, fewer for larger
    const targetSamples = 15000;
    const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / targetSamples)));
    
    // Read pixels from engine
    this.engine.readPixels(0, 0, width, height).then((pixels) => {
      if (!pixels) {
        this.isReadingPixels = false;
        return;
      }
      
      // Reset histogram bins using typed arrays for performance
      const rHist = new Uint32Array(256);
      const gHist = new Uint32Array(256);
      const bHist = new Uint32Array(256);
      const lumHist = new Uint32Array(256);
      
      const data = new Uint8Array(pixels.buffer);
      let totalPixels = 0;
      let highlightClipped = 0;
      let shadowClipped = 0;
      
      // Optimized sampling with staggered pattern for better coverage
      for (let y = 0; y < height; y += sampleStep) {
        const rowOffset = (y % 2) * Math.floor(sampleStep / 2); // Stagger odd rows
        for (let x = rowOffset; x < width; x += sampleStep) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Calculate luminance (Rec. 709 standard)
          const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
          
          rHist[r]++;
          gHist[g]++;
          bHist[b]++;
          lumHist[lum]++;
          
          totalPixels++;
          
          // Highlight clipping detection (any channel >= 250)
          if (r >= 250 || g >= 250 || b >= 250) {
            highlightClipped++;
          }
          
          // Shadow clipping detection (all channels <= 5)
          if (r <= 5 && g <= 5 && b <= 5) {
            shadowClipped++;
          }
        }
      }
      
      // Copy to class histogram data
      for (let i = 0; i < 256; i++) {
        this.histogramData.r[i] = rHist[i];
        this.histogramData.g[i] = gHist[i];
        this.histogramData.b[i] = bHist[i];
        this.histogramData.lum[i] = lumHist[i];
      }
      
      // Calculate clipping percentages
      this.highlightClipping = totalPixels > 0 ? (highlightClipped / totalPixels) * 100 : 0;
      this.shadowClipping = totalPixels > 0 ? (shadowClipped / totalPixels) * 100 : 0;
      
      // Update UI displays
      const highlightEl = document.getElementById('highlightPercent');
      if (highlightEl) {
        const status = this.highlightClipping > 3 ? '⚠️' : this.highlightClipping > 1 ? '!' : '';
        highlightEl.textContent = `${status} Høylys ${this.highlightClipping.toFixed(1)}%`;
        highlightEl.style.color = this.highlightClipping > 3 ? '#ff6b6b' : 
                                   this.highlightClipping > 1 ? '#ffaa00' : '#00d4ff';
      }
      
      const shadowEl = document.getElementById('shadowPercent');
      if (shadowEl) {
        const status = this.shadowClipping > 5 ? '⚠️' : '';
        shadowEl.textContent = `${status} Skygge ${this.shadowClipping.toFixed(1)}%`;
        shadowEl.style.color = this.shadowClipping > 5 ? '#ff6b6b' : '#00d4ff';
      }
      
      this.isReadingPixels = false;
    }).catch(() => {
      this.isReadingPixels = false;
    });
  }

  private drawHistogram(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;

    // Clear with dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(10, 15, 20, 0.98)');
    bgGrad.addColorStop(1, 'rgba(5, 8, 12, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Draw zone indicators (shadows, midtones, highlights)
    ctx.fillStyle = 'rgba(0, 100, 200, 0.08)';
    ctx.fillRect(0, 0, w * 0.25, h);
    ctx.fillStyle = 'rgba(0, 200, 100, 0.05)';
    ctx.fillRect(w * 0.25, 0, w * 0.5, h);
    ctx.fillStyle = 'rgba(255, 200, 0, 0.08)';
    ctx.fillRect(w * 0.75, 0, w * 0.25, h);

    // Find max value for normalization (ignore extreme edges)
    const maxVal = Math.max(
      ...this.histogramData.lum.slice(3, 252),
      1
    );

    const binWidth = w / 256;
    
    // Draw luminance histogram with gradient fill
    const lumGrad = ctx.createLinearGradient(0, h, 0, 0);
    lumGrad.addColorStop(0, 'rgba(0, 80, 140, 0.9)');
    lumGrad.addColorStop(0.4, 'rgba(0, 160, 220, 0.85)');
    lumGrad.addColorStop(0.8, 'rgba(80, 200, 255, 0.75)');
    lumGrad.addColorStop(1, 'rgba(150, 230, 255, 0.6)');
    
    ctx.fillStyle = lumGrad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    
    // Smoothed curve using moving average
    for (let i = 0; i < 256; i++) {
      const x = i * binWidth + binWidth / 2;
      // 3-point moving average for smoother curve
      const avg = i === 0 ? this.histogramData.lum[0] :
                  i === 255 ? this.histogramData.lum[255] :
                  (this.histogramData.lum[i-1] + this.histogramData.lum[i] * 2 + this.histogramData.lum[i+1]) / 4;
      const barHeight = (avg / maxVal) * (h - 6);
      const y = h - Math.min(barHeight, h - 4);
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Draw RGB channel lines with better visibility
    this.drawChannelLine(ctx, this.histogramData.r, maxVal, 'rgba(255, 90, 90, 0.65)', w, h);
    this.drawChannelLine(ctx, this.histogramData.g, maxVal, 'rgba(90, 255, 90, 0.55)', w, h);
    this.drawChannelLine(ctx, this.histogramData.b, maxVal, 'rgba(90, 130, 255, 0.65)', w, h);

    // Draw shadow clipping warning zone
    if (this.shadowClipping > 2) {
      const shadowGrad = ctx.createLinearGradient(0, 0, 25, 0);
      shadowGrad.addColorStop(0, 'rgba(80, 80, 255, 0.4)');
      shadowGrad.addColorStop(1, 'rgba(80, 80, 255, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, 25, h);
    }

    // Draw highlight clipping warning zone
    if (this.highlightClipping > 1) {
      const hlGrad = ctx.createLinearGradient(w - 25, 0, w, 0);
      hlGrad.addColorStop(0, 'rgba(255, 100, 100, 0)');
      hlGrad.addColorStop(1, 'rgba(255, 100, 100, 0.5)');
      ctx.fillStyle = hlGrad;
      ctx.fillRect(w - 25, 0, 25, h);
    }
    
    // Draw clipping indicators text
    ctx.font = '9px monospace';
    if (this.shadowClipping > 2) {
      ctx.fillStyle = '#6688ff';
      ctx.fillText(`${this.shadowClipping.toFixed(0)}%`, 3, 12);
    }
    if (this.highlightClipping > 1) {
      ctx.fillStyle = '#ff6666';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.highlightClipping.toFixed(0)}%`, w - 3, 12);
      ctx.textAlign = 'left';
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

    // Dark background with subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(8, 12, 16, 0.98)');
    bgGrad.addColorStop(1, 'rgba(4, 6, 10, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw IRE scale labels and grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    const ireValues = [0, 25, 50, 75, 100];
    ireValues.forEach(ire => {
      const py = h - (ire / 100) * h;
      ctx.beginPath();
      ctx.moveTo(20, py);
      ctx.lineTo(w, py);
      ctx.stroke();
      ctx.fillText(`${ire}`, 2, py + 3);
    });
    
    // Draw warning zones
    // Superwhite zone (>100 IRE)
    ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
    ctx.fillRect(20, 0, w - 20, h * 0.05);
    // Below black zone (<0 IRE)
    ctx.fillStyle = 'rgba(50, 50, 255, 0.15)';
    ctx.fillRect(20, h * 0.95, w - 20, h * 0.05);

    // Draw waveform trace - plot luminance at each horizontal position
    const maxVal = Math.max(...this.histogramData.lum.slice(2, 253), 1);
    const colWidth = (w - 20) / 256;
    
    for (let i = 0; i < 256; i++) {
      const x = 20 + i * colWidth;
      const count = this.histogramData.lum[i];
      
      if (count > 0) {
        // Map bin index (0-255) to IRE (0-100)
        const ire = (i / 255) * 100;
        const y = h - (ire / 100) * h;
        
        // Intensity based on count
        const intensity = Math.min(count / maxVal, 1);
        const alpha = 0.3 + intensity * 0.6;
        
        // Color based on IRE level
        let color: string;
        if (ire > 95) {
          color = `rgba(255, 100, 100, ${alpha})`; // Overexposed - red
        } else if (ire < 5) {
          color = `rgba(100, 100, 255, ${alpha})`; // Underexposed - blue
        } else {
          color = `rgba(0, 255, 160, ${alpha})`; // Normal - green
        }
        
        ctx.fillStyle = color;
        const dotSize = 2 + intensity * 2;
        ctx.fillRect(x, y - dotSize/2, colWidth + 0.5, dotSize);
      }
    }
    
    // Draw 70 IRE reference line (typical skin tone target)
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const skinY = h - (70 / 100) * h;
    ctx.moveTo(20, skinY);
    ctx.lineTo(w, skinY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = 'rgba(255, 200, 150, 0.5)';
    ctx.font = '8px monospace';
    ctx.fillText('Hud', w - 22, skinY - 2);
  }

  private drawVectorscope(): void {
    const ctx = this.histogramCtx!;
    const w = this.histogramCanvas!.width;
    const h = this.histogramCanvas!.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 8;

    // Dark background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.2);
    bgGrad.addColorStop(0, 'rgba(12, 16, 20, 0.98)');
    bgGrad.addColorStop(1, 'rgba(4, 6, 10, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw graticule rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach(scale => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Draw color target boxes (SMPTE color bar positions)
    const colorTargets = [
      { name: 'R', angle: 103, color: 'rgba(255, 0, 0, 0.4)' },
      { name: 'Mg', angle: 61, color: 'rgba(255, 0, 255, 0.4)' },
      { name: 'B', angle: -13, color: 'rgba(0, 0, 255, 0.4)' },
      { name: 'Cy', angle: -77, color: 'rgba(0, 255, 255, 0.4)' },
      { name: 'G', angle: -167, color: 'rgba(0, 255, 0, 0.4)' },
      { name: 'Yl', angle: 167, color: 'rgba(255, 255, 0, 0.4)' }
    ];
    
    colorTargets.forEach(target => {
      const rad = (target.angle * Math.PI) / 180;
      const tx = cx + Math.cos(rad) * radius * 0.75;
      const ty = cy - Math.sin(rad) * radius * 0.75;
      ctx.fillStyle = target.color;
      ctx.fillRect(tx - 6, ty - 6, 12, 12);
      ctx.strokeStyle = target.color.replace('0.4', '0.8');
      ctx.strokeRect(tx - 6, ty - 6, 12, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '7px monospace';
      ctx.fillText(target.name, tx - 4, ty + 2);
    });

    // Draw skin tone line (I-line)
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    const skinAngle = (123 * Math.PI) / 180; // Skin tone angle
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(skinAngle) * radius * 0.9, cy - Math.sin(skinAngle) * radius * 0.9);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255, 200, 150, 0.6)';
    ctx.font = '8px monospace';
    ctx.fillText('I', cx + Math.cos(skinAngle) * radius * 0.95, cy - Math.sin(skinAngle) * radius * 0.95);

    // Plot color distribution based on RGB histogram data
    // Convert RGB values to YUV-like coordinates
    const maxCount = Math.max(
      ...this.histogramData.r.slice(5, 250),
      ...this.histogramData.g.slice(5, 250),
      ...this.histogramData.b.slice(5, 250),
      1
    );

    for (let i = 5; i < 250; i++) {
      const rCount = this.histogramData.r[i];
      const gCount = this.histogramData.g[i];
      const bCount = this.histogramData.b[i];
      
      // Plot based on relative channel strengths
      if (rCount > maxCount * 0.02 || gCount > maxCount * 0.02 || bCount > maxCount * 0.02) {
        // Calculate chrominance from normalized values
        const rNorm = i / 255;
        const gNorm = i / 255;
        const bNorm = i / 255;
        
        // Approximate Cb/Cr (simplified YCbCr)
        const intensity = Math.max(rCount, gCount, bCount) / maxCount;
        
        // Plot R channel contribution
        if (rCount > maxCount * 0.02) {
          const cb = 0.5 - rNorm * 0.169 - 0.331 * 0.5 + 0.5 * rNorm;
          const cr = 0.5 + rNorm * 0.5 - 0.419 * 0.5 - 0.081 * 0.5;
          const u = (cb - 0.5) * 2 * radius * 0.8;
          const v = (cr - 0.5) * 2 * radius * 0.8;
          const alpha = Math.min(rCount / maxCount * 1.5, 0.9);
          ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
          ctx.fillRect(cx + u - 1, cy - v - 1, 2, 2);
        }
        
        // Plot G channel contribution
        if (gCount > maxCount * 0.02) {
          const cb = 0.5 - 0.169 * 0.5 - gNorm * 0.331 + 0.5 * 0.5;
          const cr = 0.5 + 0.5 * 0.5 - gNorm * 0.419 - 0.081 * 0.5;
          const u = (cb - 0.5) * 2 * radius * 0.8;
          const v = (cr - 0.5) * 2 * radius * 0.8;
          const alpha = Math.min(gCount / maxCount * 1.5, 0.9);
          ctx.fillStyle = `rgba(100, 255, 100, ${alpha})`;
          ctx.fillRect(cx + u - 1, cy - v - 1, 2, 2);
        }
        
        // Plot B channel contribution
        if (bCount > maxCount * 0.02) {
          const cb = 0.5 - 0.169 * 0.5 - 0.331 * 0.5 + bNorm * 0.5;
          const cr = 0.5 + 0.5 * 0.5 - 0.419 * 0.5 - bNorm * 0.081;
          const u = (cb - 0.5) * 2 * radius * 0.8;
          const v = (cr - 0.5) * 2 * radius * 0.8;
          const alpha = Math.min(bCount / maxCount * 1.5, 0.9);
          ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
          ctx.fillRect(cx + u - 1, cy - v - 1, 2, 2);
        }
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

  /**
   * Re-assign RTT settings (activeCamera, renderList, refreshRate) after preset changes.
   * This is called explicitly when presets are changed, NOT continuously every frame.
   * CRITICAL: This ensures RTT continues rendering after preset-switch/equipment changes.
   * 
   * Note: This method is idempotent - calling it multiple times with the same state is safe.
   */
  private reassignMonitorRTTSettings(presetId: string): void {
    const preset = this.cameraPresets.get(presetId);
    if (!preset) return;
    
    // Get current visible meshes
    const visibleMeshes = this.scene.meshes.filter(mesh => 
      mesh.isVisible && 
      mesh.isEnabled() && 
      !mesh.name.startsWith('gizmo') &&
      !mesh.name.startsWith('__')
    );
    
    // Create RTT if it doesn't exist yet - this fixes the "no signal" issue
    // when activating a camera before updateMonitorCanvases has run
    let renderTarget = this.monitorRenderTargets.get(presetId);
    let monitorCamera = this.monitorCameras.get(presetId);
    
    if (!monitorCamera) {
      // Create monitor camera from preset
      monitorCamera = new BABYLON.ArcRotateCamera(
        `monitor-camera-${presetId}`,
        preset.alpha,
        preset.beta,
        preset.radius,
        preset.target.clone(),
        this.scene
      );
      monitorCamera.position = preset.position.clone();
      monitorCamera.fov = preset.fov;
      monitorCamera.minZ = 0.1;
      monitorCamera.maxZ = 1000;
      this.monitorCameras.set(presetId, monitorCamera);
      console.log(`[Monitor] Created camera for ${presetId} during reassign`);
    }
    
    if (!renderTarget) {
      // Create RTT for this preset
      renderTarget = new BABYLON.RenderTargetTexture(
        `monitor-${presetId}`,
        { width: 640, height: 360 },
        this.scene,
        false, // noMipmap
        true,  // generateDepthBuffer
        BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT
      );
      this.monitorRenderTargets.set(presetId, renderTarget);
      
      // Add to scene's custom render targets
      if (this.scene.customRenderTargets.indexOf(renderTarget) === -1) {
        this.scene.customRenderTargets.push(renderTarget);
        console.log(`[Monitor] Added RTT ${presetId} to customRenderTargets during reassign`);
      }
      
      // Monitor if RTT gets disposed
      renderTarget.onDisposeObservable.addOnce(() => {
        console.warn(`[Monitor] WARNING: RTT ${presetId} was disposed!`);
        this.monitorRenderTargets.delete(presetId);
        this.monitorCallbacksRegistered.delete(presetId);
        this.monitorFirstRenderComplete.delete(presetId);
        this.monitorTextureHandles.delete(presetId);
        this.monitorTempFramebuffers.delete(presetId);
        this.monitorLoggedWarnings.delete(presetId);
      });
      
      console.log(`[Monitor] Created RTT for ${presetId} during reassign`);
    }
    
    // HARD RE-ASSIGN: Force these settings back to correct values
    // These assignments are idempotent - safe to call multiple times
    renderTarget.activeCamera = monitorCamera;
    renderTarget.renderList = visibleMeshes;
    renderTarget.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
    
    // Update tracked renderList length (for change detection in updateMonitorCanvases)
    this.monitorLastRenderListLength.set(presetId, visibleMeshes.length);
    
    // Hide "no signal" overlay since we now have a valid setup
    const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
    if (noSignal) {
      noSignal.style.display = 'none';
    }
  }
  
  private updateMonitorCanvases(): void {
    // Update monitor canvases less frequently for performance (every 3 frames)
    this.monitorFrameCount++;
    if (this.monitorFrameCount % 3 !== 0) return;

    const presetIds = ['camA', 'camB', 'camC', 'camD', 'camE'];
    
    // Filter visible meshes - critical for RTT to work!
    // According to checklist: "Hvis renderList er tom og du ikke har aktiv renderParticles/renderSprites-oppsett, blir resultatet typisk 'ingenting'."
    const visibleMeshes = this.scene.meshes.filter(mesh => 
      mesh.isVisible && 
      mesh.isEnabled() && 
      !mesh.name.startsWith('gizmo') &&
      !mesh.name.startsWith('__')
    );
    
    if (visibleMeshes.length === 0) {
      // No visible meshes to render - show "no signal" for all
      for (const presetId of presetIds) {
        const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
        if (noSignal) noSignal.style.display = 'flex';
      }
      return;
    }
    
    for (const presetId of presetIds) {
      const preset = this.cameraPresets.get(presetId);
      if (!preset) {
        const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
        if (noSignal) noSignal.style.display = 'flex';
        continue;
      }

      const monitorCanvas = document.querySelector(`.monitor-canvas[data-preset="${presetId}"]`) as HTMLCanvasElement;
      if (!monitorCanvas) continue;

      const ctx = monitorCanvas.getContext('2d');
      if (!ctx) continue;

      // Get or create render target for this camera preset
      let renderTarget = this.monitorRenderTargets.get(presetId);
      if (!renderTarget) {
        console.log(`[Monitor] Creating RTT for ${presetId}`);
        
        renderTarget = new BABYLON.RenderTargetTexture(
          `monitor-${presetId}`,
          { width: 640, height: 360 },
          this.scene,
          false, // noMipmap
          true,  // generateDepthBuffer
          BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT
        );
        this.monitorRenderTargets.set(presetId, renderTarget);
        
        // Create or get camera for this preset
        let monitorCamera = this.monitorCameras.get(presetId);
        if (!monitorCamera) {
          monitorCamera = new BABYLON.ArcRotateCamera(
            `monitor-camera-${presetId}`,
            preset.alpha,
            preset.beta,
            preset.radius,
            preset.target.clone(),
            this.scene
          );
          monitorCamera.position = preset.position.clone();
          monitorCamera.fov = preset.fov;
          monitorCamera.minZ = 0.1;
          monitorCamera.maxZ = 1000;
          this.monitorCameras.set(presetId, monitorCamera);
        }
        
        // CRITICAL: HARD LOCK activeCamera, renderList, and refreshRate at creation
        // These settings MUST remain correct for RTT to render continuously
        renderTarget.activeCamera = monitorCamera;
        renderTarget.renderList = visibleMeshes;
        // HARD LOCK: Force refreshRate to render every frame - DO NOT ALLOW THIS TO CHANGE
        renderTarget.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
        
        // Track initial renderList length for change detection
        this.monitorLastRenderListLength.set(presetId, visibleMeshes.length);
        
        // Add to scene's custom render targets so it gets rendered
        // CRITICAL: RTT must stay in customRenderTargets or signals will disappear
        // This is REQUIRED according to checklist: "scene.customRenderTargets.push(rtt)"
        if (this.scene.customRenderTargets.indexOf(renderTarget) === -1) {
          this.scene.customRenderTargets.push(renderTarget);
          console.log(`[Monitor] Added RTT ${presetId} to customRenderTargets`);
        }
        
        // Monitor if RTT gets disposed (shouldn't happen)
        // This is diagnostic - helps identify lifecycle/cleanup issues
        renderTarget.onDisposeObservable.addOnce(() => {
          console.warn(`[Monitor] WARNING: RTT ${presetId} was disposed! This will cause signals to disappear.`);
          console.trace(`[Monitor] Stack trace for ${presetId} disposal:`);
          // Clean up tracking maps
          this.monitorRenderTargets.delete(presetId);
          this.monitorCallbacksRegistered.delete(presetId);
          this.monitorFirstRenderComplete.delete(presetId);
          this.monitorTextureHandles.delete(presetId);
          this.monitorTempFramebuffers.delete(presetId);
          this.monitorLoggedWarnings.delete(presetId);
        });
        
        // Set up pixel reading callback AFTER render completes
        // CRITICAL: Only register callbacks once to avoid duplicates
        // Duplicate callbacks can cause signals to flicker or disappear
        if (!this.monitorCallbacksRegistered.get(presetId)) {
          const targetRenderTarget = renderTarget; // Capture for closure
          const targetPresetId = presetId; // Capture for closure
          
          // Wait for first render to ensure framebuffer is created
          // CRITICAL: If this never fires, RTT is not rendering (check renderList, customRenderTargets, refreshRate)
          const firstRenderTimeout = setTimeout(() => {
            if (!this.monitorFirstRenderComplete.get(targetPresetId)) {
              console.error(`[Monitor] ${targetPresetId}: onAfterRenderObservable never fired! This indicates RTT is not rendering. Check: renderList=${targetRenderTarget.renderList?.length || 0} meshes, in customRenderTargets=${this.scene.customRenderTargets.indexOf(targetRenderTarget) !== -1}, refreshRate=${targetRenderTarget.refreshRate}`);
            }
          }, 5000); // 5 second timeout
          
          targetRenderTarget.onAfterRenderObservable.addOnce(() => {
            clearTimeout(firstRenderTimeout);
            this.monitorFirstRenderComplete.set(targetPresetId, true);
            console.log(`[Monitor] ${targetPresetId}: First render complete, framebuffer should be ready`);
          });
          
        // Set up ongoing pixel reading after each render
        // CRITICAL: Read pixels immediately in callback - onAfterRenderObservable fires after render is complete
        const pixelReadCallback = () => {
          // Only read pixels after first render (when framebuffer exists)
          if (!this.monitorFirstRenderComplete.get(targetPresetId)) {
            return;
          }
          
          // Skip if context was lost (will be handled by context restore handler)
          if (this.monitorContextLost) {
            return;
          }
          
          const canvas = document.querySelector(`.monitor-canvas[data-preset="${targetPresetId}"]`) as HTMLCanvasElement;
          if (!canvas) {
            // Canvas removed - skip this frame, it might come back
            return;
          }
          
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            // 2D context lost - skip this frame, it might recover
            return;
          }
          
          const size = targetRenderTarget.getSize();
          const width = size.width;
          const height = size.height;
          
          // Only update canvas size if it changed (performance optimization)
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          
          // Read pixels from the render target's framebuffer
          // NOTE: This is called after RTT has rendered, so framebuffer should be ready
          this.readPixelsFromRenderTarget(targetRenderTarget, ctx, width, height, targetPresetId);
        };
          
          targetRenderTarget.onAfterRenderObservable.add(pixelReadCallback);
          this.monitorCallbacksRegistered.set(presetId, true);
          console.log(`[Monitor] ${presetId}: Callbacks registered (one-time setup)`);
        }
        
        console.log(`[Monitor] RTT ${presetId} setup complete: ${visibleMeshes.length} meshes, camera=${monitorCamera.name}`);
      }
      
      // Ensure renderTarget is defined (could be created here or by reassignMonitorRTTSettings)
      if (!renderTarget) continue;
      
      // CRITICAL FIX: Register callbacks even if RTT was created by reassignMonitorRTTSettings
      // This fixes the issue where RTT exists but callbacks were never registered
      if (!this.monitorCallbacksRegistered.get(presetId)) {
        const targetRenderTarget = renderTarget; // Capture for closure
        const targetPresetId = presetId; // Capture for closure
        
        // Wait for first render to ensure framebuffer is created
        const firstRenderTimeout = setTimeout(() => {
          if (!this.monitorFirstRenderComplete.get(targetPresetId)) {
            console.error(`[Monitor] ${targetPresetId}: onAfterRenderObservable never fired! RTT not rendering. renderList=${targetRenderTarget.renderList?.length || 0}, inCustomRTTs=${this.scene.customRenderTargets.indexOf(targetRenderTarget) !== -1}`);
          }
        }, 5000);
        
        targetRenderTarget.onAfterRenderObservable.addOnce(() => {
          clearTimeout(firstRenderTimeout);
          this.monitorFirstRenderComplete.set(targetPresetId, true);
          console.log(`[Monitor] ${targetPresetId}: First render complete, framebuffer ready`);
        });
        
        // Set up ongoing pixel reading after each render
        const pixelReadCallback = () => {
          if (!this.monitorFirstRenderComplete.get(targetPresetId)) return;
          if (this.monitorContextLost) return;
          
          const canvas = document.querySelector(`.monitor-canvas[data-preset="${targetPresetId}"]`) as HTMLCanvasElement;
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          
          const size = targetRenderTarget.getSize();
          const width = size.width;
          const height = size.height;
          
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          
          this.readPixelsFromRenderTarget(targetRenderTarget, ctx, width, height, targetPresetId);
        };
        
        targetRenderTarget.onAfterRenderObservable.add(pixelReadCallback);
        this.monitorCallbacksRegistered.set(presetId, true);
        console.log(`[Monitor] ${presetId}: Callbacks registered for existing RTT`);
      }

      // Update monitor camera parameters if preset has changed
      // CRITICAL: Only update camera PARAMETERS, not the camera object itself
      // The camera object reference must remain stable for activeCamera to work
      const monitorCamera = this.monitorCameras.get(presetId);
      if (monitorCamera) {
        // Update camera parameters to match preset
        monitorCamera.alpha = preset.alpha;
        monitorCamera.beta = preset.beta;
        monitorCamera.radius = preset.radius;
        monitorCamera.setTarget(preset.target);
        monitorCamera.position = preset.position.clone();
        monitorCamera.fov = preset.fov;
        
        // CRITICAL: Ensure activeCamera still points to the same camera object
        // If it doesn't, this indicates the camera was recreated (shouldn't happen)
        if (renderTarget.activeCamera !== monitorCamera) {
          const warnings = this.monitorLoggedWarnings.get(presetId) || new Set();
          if (!warnings.has('active_camera_mismatch')) {
            console.error(`[Monitor] ${presetId}: activeCamera mismatch detected! Camera object was recreated. This will break RTT rendering.`);
            warnings.add('active_camera_mismatch');
            this.monitorLoggedWarnings.set(presetId, warnings);
          }
          renderTarget.activeCamera = monitorCamera;
        }
      }

      // CRITICAL: Verify RTT is still in customRenderTargets (must stay there!)
      // If RTT is removed from customRenderTargets, signals will disappear
      // Log only on state change (not every frame) to reduce noise
      const wasInCustomTargets = this.scene.customRenderTargets.indexOf(renderTarget) !== -1;
      if (!wasInCustomTargets) {
        const warnings = this.monitorLoggedWarnings.get(presetId) || new Set();
        if (!warnings.has('removed_from_custom')) {
          console.warn(`[Monitor] RTT ${presetId} was removed from customRenderTargets! This indicates something is disposing/clearing scene.customRenderTargets. Re-adding...`);
          warnings.add('removed_from_custom');
          this.monitorLoggedWarnings.set(presetId, warnings);
          
          // Log stack trace to help identify who removed it
          console.trace(`[Monitor] Stack trace for ${presetId} removal:`);
        }
        this.scene.customRenderTargets.push(renderTarget);
      }
      
      // CRITICAL FIX: Always keep renderList up-to-date with current visible meshes
      // If meshes are added/removed from scene, we need to update the RTT's renderList
      // Otherwise the RTT will render an empty/stale list and show "no signal"
      // NOTE: Use splice to modify in-place so Babylon retains its reference to the array
      const currentRenderList = renderTarget.renderList || [];
      const currentRenderListLength = currentRenderList.length;
      
      // Check if we need to update: length mismatch OR mesh identity change
      // Mesh identity change: a mesh was swapped (removed + added same frame, count stays equal)
      let needsUpdate = false;
      if (currentRenderListLength !== visibleMeshes.length) {
        needsUpdate = true;
      } else if (currentRenderListLength > 0) {
        // Quick identity check: compare first/last mesh references
        // This catches most mesh swap cases without O(n) comparison
        const firstMismatch = currentRenderList[0] !== visibleMeshes[0];
        const lastMismatch = currentRenderList[currentRenderListLength - 1] !== visibleMeshes[visibleMeshes.length - 1];
        if (firstMismatch || lastMismatch) {
          needsUpdate = true;
        }
      }
      
      if (needsUpdate && visibleMeshes.length > 0) {
        // Use splice to modify array in-place, preserving Babylon's internal reference
        if (renderTarget.renderList) {
          renderTarget.renderList.splice(0, renderTarget.renderList.length, ...visibleMeshes);
        } else {
          // Initialize renderList if it doesn't exist
          renderTarget.renderList = [...visibleMeshes];
        }
        
        // Log the update
        const lastLength = this.monitorLastRenderListLength.get(presetId);
        if (lastLength !== undefined && lastLength !== visibleMeshes.length) {
          console.log(`[Monitor] ${presetId}: Updated renderList from ${lastLength} to ${visibleMeshes.length} meshes`);
        }
        
        this.monitorLastRenderListLength.set(presetId, visibleMeshes.length);
      } else if (visibleMeshes.length === 0 && currentRenderListLength === 0) {
        // Scene is confirmed empty, track this state
        this.monitorLastRenderListLength.set(presetId, 0);
      }
      // Note: If visibleMeshes is empty but renderList has meshes, we keep the existing
      // renderList to prevent flickering during transient empty states
      
      // NOTE: Do NOT call renderTarget.render() manually!
      // When renderTarget is in scene.customRenderTargets (which it is),
      // it is automatically rendered by scene.render() in the render loop.
      // The onAfterRenderObservable callback will fire automatically after each render.
    }
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

  // ============================================
  // UNDO/REDO SYSTEM
  // ============================================
  
  private getLightState(lightId: string): any {
    const data = this.lights.get(lightId);
    if (!data) return null;
    
    return {
      position: data.mesh.position.clone(),
      rotation: data.mesh.rotation.clone(),
      intensity: data.light.intensity,
      baseIntensity: data.baseIntensity,
      powerMultiplier: data.powerMultiplier,
      cct: data.cct,
      enabled: data.enabled !== false,
      name: data.name
    };
  }
  
  private restoreLightState(lightId: string, state: any): void {
    const data = this.lights.get(lightId);
    if (!data || !state) return;
    
    // Restore position
    data.mesh.position.copyFrom(state.position);
    if (data.light instanceof BABYLON.SpotLight || data.light instanceof BABYLON.DirectionalLight) {
      data.light.position = data.mesh.position.clone();
    }
    
    // Restore rotation
    data.mesh.rotation.copyFrom(state.rotation);
    
    // Restore intensity
    data.light.intensity = state.intensity;
    data.baseIntensity = state.baseIntensity;
    data.powerMultiplier = state.powerMultiplier;
    
    // Restore other properties
    data.cct = state.cct;
    data.enabled = state.enabled;
    data.name = state.name;
    
    // Update UI if this light is selected
    if (this.selectedLightId === lightId) {
      this.updateSelectedLightProperties();
    }
  }
  
  public pushUndoAction(type: UndoActionType, description: string, lightId?: string, previousState?: any, newState?: any): void {
    if (this.isUndoRedoAction) return; // Don't record undo/redo actions
    
    const action: UndoAction = {
      type,
      timestamp: Date.now(),
      description,
      data: {
        lightId,
        previousState,
        newState
      }
    };
    
    this.undoStack.push(action);
    
    // Limit stack size
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    
    // Clear redo stack on new action
    this.redoStack = [];
    
    // Update button states
    this.updateUndoRedoButtons();
  }
  
  private performUndo(): void {
    if (this.undoStack.length === 0) {
      this.showNotification('Ingen handlinger å angre', 'info');
      return;
    }
    
    const action = this.undoStack.pop()!;
    this.isUndoRedoAction = true;
    
    try {
      switch (action.type) {
        case 'light-move':
        case 'light-rotate':
        case 'light-property':
          if (action.data.lightId && action.data.previousState) {
            this.restoreLightState(action.data.lightId, action.data.previousState);
          }
          break;
          
        case 'light-add':
          // Remove the light that was added
          if (action.data.lightId) {
            this.removeLight(action.data.lightId);
          }
          break;
          
        case 'light-remove':
          // Re-add the light that was removed (complex - would need to store full light data)
          // For now, show message
          this.showNotification('Kan ikke gjenopprette slettet lys', 'warning');
          break;
          
        case 'camera-change':
          if (action.data.previousState) {
            this.camera.alpha = action.data.previousState.alpha;
            this.camera.beta = action.data.previousState.beta;
            this.camera.radius = action.data.previousState.radius;
            this.camera.target = action.data.previousState.target.clone();
          }
          break;
          
        case 'selection-change':
          if (action.data.previousState?.lightId) {
            this.selectLight(action.data.previousState.lightId);
          } else {
            this.deselectLight();
          }
          break;
      }
      
      // Push to redo stack
      this.redoStack.push(action);
      this.showNotification(`Angret: ${action.description}`, 'success');
      
    } catch (error) {
      console.error('Undo failed:', error);
      this.showNotification('Kunne ikke angre handling', 'error');
    }
    
    this.isUndoRedoAction = false;
    this.updateUndoRedoButtons();
  }
  
  private performRedo(): void {
    if (this.redoStack.length === 0) {
      this.showNotification('Ingen handlinger å gjøre om', 'info');
      return;
    }
    
    const action = this.redoStack.pop()!;
    this.isUndoRedoAction = true;
    
    try {
      switch (action.type) {
        case 'light-move':
        case 'light-rotate':
        case 'light-property':
          if (action.data.lightId && action.data.newState) {
            this.restoreLightState(action.data.lightId, action.data.newState);
          }
          break;
          
        case 'light-add':
          // Would need to re-add the light - complex
          this.showNotification('Kan ikke gjenta lyslegging', 'warning');
          break;
          
        case 'light-remove':
          // Remove the light again
          if (action.data.lightId) {
            this.removeLight(action.data.lightId);
          }
          break;
          
        case 'camera-change':
          if (action.data.newState) {
            this.camera.alpha = action.data.newState.alpha;
            this.camera.beta = action.data.newState.beta;
            this.camera.radius = action.data.newState.radius;
            this.camera.target = action.data.newState.target.clone();
          }
          break;
          
        case 'selection-change':
          if (action.data.newState?.lightId) {
            this.selectLight(action.data.newState.lightId);
          } else {
            this.deselectLight();
          }
          break;
      }
      
      // Push back to undo stack
      this.undoStack.push(action);
      this.showNotification(`Gjort om: ${action.description}`, 'success');
      
    } catch (error) {
      console.error('Redo failed:', error);
      this.showNotification('Kunne ikke gjøre om handling', 'error');
    }
    
    this.isUndoRedoAction = false;
    this.updateUndoRedoButtons();
  }
  
  private updateUndoRedoButtons(): void {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
      undoBtn.classList.toggle('disabled', this.undoStack.length === 0);
      undoBtn.setAttribute('aria-disabled', String(this.undoStack.length === 0));
      const lastUndo = this.undoStack[this.undoStack.length - 1];
      undoBtn.title = lastUndo ? `Angre: ${lastUndo.description} (Ctrl+Z)` : 'Angre (Ctrl+Z)';
    }
    
    if (redoBtn) {
      redoBtn.classList.toggle('disabled', this.redoStack.length === 0);
      redoBtn.setAttribute('aria-disabled', String(this.redoStack.length === 0));
      const lastRedo = this.redoStack[this.redoStack.length - 1];
      redoBtn.title = lastRedo ? `Gjør om: ${lastRedo.description} (Ctrl+Y)` : 'Gjør om (Ctrl+Y)';
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    // Dispatch event for notification system
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type }
    }));
  }
  
  private deselectLight(): void {
    this.selectedLightId = null;
    window.dispatchEvent(new CustomEvent('ch-light-deselected'));
  }

  private readPixelsFromRenderTarget(
    renderTarget: BABYLON.RenderTargetTexture,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    presetId: string
  ): void {
    // Read pixels from RenderTargetTexture's framebuffer
    // This is called AFTER the texture has been rendered (via onAfterRenderObservable)
    const internalTexture = renderTarget.getInternalTexture();
    if (!internalTexture) {
      console.warn(`[Monitor] ${presetId}: No internal texture`);
      const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
      if (noSignal) noSignal.style.display = 'flex';
      return;
    }

    try {
      const gl = (this.engine as any)._gl;
      if (!gl) {
        console.warn(`[Monitor] ${presetId}: No WebGL context`);
        const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
        if (noSignal) noSignal.style.display = 'flex';
        return;
      }
      
      // Try to find the framebuffer in various possible locations
      // In Babylon.js/WebGL2, framebuffers are often stored in RenderTargetWrapper, not directly on InternalTexture
      // CRITICAL: In newer Babylon versions, framebuffer lookup must check wrapper objects first
      let framebuffer: WebGLFramebuffer | null = null;
      const rttAny = renderTarget as any;
      
      // Method 1: Check RenderTargetWrapper (WebGL2 path - most common in newer Babylon versions)
      // This is where framebuffers are typically stored when using WebGL2
      const wrapper = rttAny._renderTargetWrapper ||
                     rttAny._renderTarget ||
                     rttAny._renderTargetTexture?.renderTarget ||
                     (internalTexture as any)._renderTargetWrapper;
      
      if (wrapper) {
        framebuffer = wrapper._framebuffer ||
                     wrapper._MSAAFramebuffer ||
                     wrapper._framebufferObject?.framebuffer ||
                     wrapper._framebufferObject?._framebuffer ||
                     wrapper.framebuffer;
      }
      
      // Method 2: Direct property access on internal texture (older path)
      if (!framebuffer && (internalTexture as any)._framebuffer) {
        framebuffer = (internalTexture as any)._framebuffer;
      }
      
      // Method 3: MSAA framebuffer on internal texture
      if (!framebuffer && (internalTexture as any)._MSAAFramebuffer) {
        framebuffer = (internalTexture as any)._MSAAFramebuffer;
      }
      
      // Method 4: Through framebufferObject on internal texture
      if (!framebuffer && (internalTexture as any)._framebufferObject) {
        const fbo = (internalTexture as any)._framebufferObject;
        framebuffer = fbo.framebuffer || fbo._framebuffer || fbo.framebufferObject;
      }
      
      // Method 5: Through hardwareTexture
      if (!framebuffer && internalTexture._hardwareTexture) {
        const hwTexture = internalTexture._hardwareTexture as any;
        framebuffer = hwTexture._framebuffer || 
                     hwTexture._MSAAFramebuffer ||
                     hwTexture._framebufferObject?.framebuffer ||
                     hwTexture.framebuffer;
      }
      
      // Method 6: Try render target's internal framebuffer reference (legacy)
      if (!framebuffer) {
        framebuffer = rttAny._framebuffer || 
                     rttAny._MSAAFramebuffer ||
                     rttAny._framebufferObject?.framebuffer;
      }
      
      // If still no framebuffer found, fallback to alternative method
      // This can happen if framebuffer is stored in a location we haven't checked yet
      // The alternative method creates a temporary framebuffer and attaches the texture to it
      if (!framebuffer) {
        // Log only once per preset to reduce noise
        const warnings = this.monitorLoggedWarnings.get(presetId) || new Set();
        if (!warnings.has('no_framebuffer')) {
          // Note: This warning no longer means "RTT hasn't rendered" - it means framebuffer lookup failed
          // RTT is likely rendering correctly, but framebuffer structure is different than expected
          console.warn(`[Monitor] ${presetId}: No framebuffer found in expected locations. RTT is likely rendering correctly but framebuffer is stored elsewhere. Using alternative method.`);
          console.warn(`[Monitor] ${presetId}: RTT state: renderList=${renderTarget.renderList?.length || 0}, refreshRate=${renderTarget.refreshRate}, in customRenderTargets=${this.scene.customRenderTargets.indexOf(renderTarget) !== -1}, firstRenderComplete=${this.monitorFirstRenderComplete.get(presetId)}`);
          warnings.add('no_framebuffer');
          this.monitorLoggedWarnings.set(presetId, warnings);
        }
        
        // Alternative: Create a temporary framebuffer and attach the texture to it
        // This works around the issue where RenderTargetTexture's framebuffer isn't directly accessible
        this.readPixelsAlternative(renderTarget, internalTexture, ctx, width, height, presetId, gl);
        return;
      }
      
      // Save current WebGL state
      const currentFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const currentViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
      
      // Bind the render target's framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      
      // Set viewport to match render target size
      gl.viewport(0, 0, width, height);
      
      // Check framebuffer status
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        const statusNames: { [key: number]: string } = {
          [gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT]: 'INCOMPLETE_ATTACHMENT',
          [gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT]: 'INCOMPLETE_MISSING_ATTACHMENT',
          [gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS]: 'INCOMPLETE_DIMENSIONS',
          [gl.FRAMEBUFFER_UNSUPPORTED]: 'UNSUPPORTED'
        };
        console.warn(`[Monitor] ${presetId}: Framebuffer not complete, status: ${statusNames[status] || status}`);
        gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
        gl.viewport(currentViewport[0], currentViewport[1], currentViewport[2], currentViewport[3]);
        const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
        if (noSignal) noSignal.style.display = 'flex';
        return;
      }
      
      // Read pixels from the framebuffer
      const pixelData = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
      
      // Restore previous WebGL state
      gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
      gl.viewport(currentViewport[0], currentViewport[1], currentViewport[2], currentViewport[3]);
      
      // Check if we got valid pixel data (not all zeros/black)
      let hasNonZeroPixels = false;
      for (let i = 0; i < pixelData.length; i += 4) {
        if (pixelData[i] > 0 || pixelData[i + 1] > 0 || pixelData[i + 2] > 0) {
          hasNonZeroPixels = true;
          break;
        }
      }
      
      if (!hasNonZeroPixels) {
        console.warn(`[Monitor] ${presetId}: All pixels are black/zero - RTT may not be rendering`);
        const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
        if (noSignal) noSignal.style.display = 'flex';
        return;
      }
      
      // Convert to Uint8ClampedArray and draw to canvas
      const clampedData = new Uint8ClampedArray(pixelData.buffer);
      this.drawPixelsToCanvas(ctx, clampedData, width, height, presetId);
    } catch (error: any) {
      console.error(`[Monitor] ${presetId}: Error reading pixels:`, error);
      const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
      if (noSignal) noSignal.style.display = 'flex';
    }
  }
  
  private readPixelsAlternative(
    renderTarget: BABYLON.RenderTargetTexture,
    internalTexture: BABYLON.InternalTexture,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    presetId: string,
    gl: WebGLRenderingContext
  ): void {
    // Alternative method: Try to read pixels by creating a temporary texture read
    // This is a fallback if we can't access the framebuffer directly
    // CRITICAL: Based on research, WebGL context loss can cause signals to disappear
    try {
      // Ensure WebGL context is still valid
      if (gl.isContextLost && gl.isContextLost()) {
        console.warn(`[Monitor] ${presetId}: WebGL context is lost, cannot read pixels`);
        const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
        if (noSignal) noSignal.style.display = 'flex';
        return;
      }
      
      // WebGL2 optimization: Cache texture handles and framebuffers
      // Get or find cached texture handle (only lookup once per preset)
      let textureHandle = this.monitorTextureHandles.get(presetId);
      if (textureHandle === undefined) {
        // First time - find texture handle
        if (internalTexture._hardwareTexture) {
          const hwTex = internalTexture._hardwareTexture as any;
          textureHandle = hwTex.underlyingResource || 
                         hwTex._webGLTexture || 
                         hwTex.nativeTexture ||
                         hwTex._nativeTexture ||
                         (hwTex as any).texture;
        }
        
        if (!textureHandle) {
          textureHandle = (internalTexture as any)._webGLTexture || 
                         (internalTexture as any).webGLTexture ||
                         (internalTexture as any).nativeTexture ||
                         (internalTexture as any)._nativeTexture;
        }
        
        // Cache result (even if null)
        this.monitorTextureHandles.set(presetId, textureHandle || null);
        
        if (!textureHandle) {
          // Log only once per preset to reduce noise
          const warnings = this.monitorLoggedWarnings.get(presetId) || new Set();
          if (!warnings.has('no_texture_handle')) {
            console.warn(`[Monitor] ${presetId}: Could not find WebGL texture handle in hardwareTexture`);
            warnings.add('no_texture_handle');
            this.monitorLoggedWarnings.set(presetId, warnings);
          }
          const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
          if (noSignal) noSignal.style.display = 'flex';
          return;
        }
      }
      
      if (!textureHandle) {
        return; // Already cached as null
      }
      
      // Get or create cached framebuffer (reuse instead of creating new each frame)
      let tempFramebuffer = this.monitorTempFramebuffers.get(presetId);
      if (!tempFramebuffer) {
        tempFramebuffer = gl.createFramebuffer();
        if (!tempFramebuffer) {
          console.warn(`[Monitor] ${presetId}: Could not create temp framebuffer`);
          const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
          if (noSignal) noSignal.style.display = 'flex';
          return;
        }
        this.monitorTempFramebuffers.set(presetId, tempFramebuffer);
      }
      
      const currentFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const currentViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, tempFramebuffer);
      
      // Save current texture binding (minimal state changes)
      const currentActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
      const currentTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
      
      // Check if texture is already attached (WebGL2 optimization)
      let needsAttachment = true;
      if (gl instanceof WebGL2RenderingContext && textureHandle) {
        try {
          const currentAttachment = gl.getFramebufferAttachmentParameter(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME
          );
          needsAttachment = currentAttachment !== textureHandle;
        } catch (e) {
          // Fallback if WebGL2 query fails
        }
      }
      
      if (needsAttachment) {
        // Only bind texture if not already bound
        if (currentTextureBinding !== textureHandle) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        }
        
        // Attach texture to framebuffer
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          textureHandle,
          0
        );
        
        // Check framebuffer status (only when attaching)
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
          if (currentTextureBinding !== textureHandle) {
            gl.activeTexture(currentActiveTexture);
            gl.bindTexture(gl.TEXTURE_2D, currentTextureBinding);
          }
          const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
          if (noSignal) noSignal.style.display = 'flex';
          return;
        }
      }
      
      // Set viewport only if changed (optimization)
      if (currentViewport[0] !== 0 || currentViewport[1] !== 0 || 
          currentViewport[2] !== width || currentViewport[3] !== height) {
        gl.viewport(0, 0, width, height);
      }
      
      // Read pixels from the texture
      const pixelData = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
      
      // Restore WebGL state (only if changed)
      gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
      if (currentViewport[0] !== 0 || currentViewport[1] !== 0 || 
          currentViewport[2] !== width || currentViewport[3] !== height) {
        gl.viewport(currentViewport[0], currentViewport[1], currentViewport[2], currentViewport[3]);
      }
      if (currentTextureBinding !== textureHandle) {
        gl.activeTexture(currentActiveTexture);
        gl.bindTexture(gl.TEXTURE_2D, currentTextureBinding);
      }
      
      // Fast pixel validation (sample fewer pixels for WebGL2 performance)
      let hasNonZeroPixels = false;
      const sampleCount = 100; // Reduced from 1000 for better performance
      const sampleStep = Math.max(1, Math.floor(pixelData.length / (sampleCount * 4)));
      for (let i = 0; i < pixelData.length; i += sampleStep * 4) {
        if (pixelData[i] > 5 || pixelData[i + 1] > 5 || pixelData[i + 2] > 5) {
          hasNonZeroPixels = true;
          break;
        }
      }
      
      if (!hasNonZeroPixels) {
        // All pixels are black - RTT might not have rendered content yet
        // This can happen if RTT hasn't rendered or scene is empty
        // Don't draw anything, but don't show "no signal" either (to avoid flickering)
        // Signal will come back when RTT renders again
        return;
      }
      
      // We have valid pixel data - draw to canvas
      const clampedData = new Uint8ClampedArray(pixelData.buffer);
      this.drawPixelsToCanvas(ctx, clampedData, width, height, presetId);
    } catch (error: any) {
      console.error(`[Monitor] ${presetId}: Error in alternative read method:`, error);
      const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
      if (noSignal) noSignal.style.display = 'flex';
    }
  }

  private drawPixelsToCanvas(
    ctx: CanvasRenderingContext2D,
    pixelData: Uint8ClampedArray,
    width: number,
    height: number,
    presetId: string
  ): void {
    try {
      // Create ImageData from pixels
      const imageData = ctx.createImageData(width, height);
      
      // Copy pixels (RGBA format) - flip vertically because WebGL uses bottom-up coordinates
      for (let y = 0; y < height; y++) {
        const srcY = height - 1 - y; // Flip vertically
        for (let x = 0; x < width; x++) {
          const srcIdx = (srcY * width + x) * 4;
          const dstIdx = (y * width + x) * 4;
          imageData.data[dstIdx] = pixelData[srcIdx];         // R
          imageData.data[dstIdx + 1] = pixelData[srcIdx + 1]; // G
          imageData.data[dstIdx + 2] = pixelData[srcIdx + 2]; // B
          imageData.data[dstIdx + 3] = pixelData[srcIdx + 3]; // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Hide "no signal" overlay
      const noSignal = document.querySelector(`.monitor-no-signal[data-preset="${presetId}"]`) as HTMLElement;
      if (noSignal) {
        noSignal.style.display = 'none';
      }
    } catch (error: any) {
      console.error(`[Monitor] ${presetId}: Error drawing pixels to canvas:`, error);
    }
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

  public cctToColor(cct: number): BABYLON.Color3 {
    if (cct <= 2700) return new BABYLON.Color3(1, 0.76, 0.47);
    if (cct <= 3200) return new BABYLON.Color3(1, 0.82, 0.58);
    if (cct <= 4000) return new BABYLON.Color3(1, 0.89, 0.72);
    if (cct <= 5600) return new BABYLON.Color3(1, 0.96, 0.90);
    return new BABYLON.Color3(0.92, 0.95, 1);
  }

  private cctToCanvasColor(cct: number, opacity: number = 1.0): string {
    const color = this.cctToColor(cct);
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
    // Priority 1: Use lux at 1m (most accurate for continuous/LED lights)
    // Realistic conversion: lux at 1m = candela, and candela relates to intensity
    // For Babylon.js: Intensity is approximately lux/10000 for reasonable scaling
    if (specs.lux1m) {
      return specs.lux1m / 10000;
    }
    
    // Priority 2: Use lumens (total luminous flux)
    // Realistic conversion: For a spotlight, lumens ≈ intensity * area factor
    // Scale factor adjusted for realistic scene lighting (typically 20000-40000 lumens = strong studio light)
    if (specs.lumens) {
      return specs.lumens / 15000;
    }
    
    // Priority 3: Use guide number (for strobes)
    // Guide number relates to flash power at ISO 100
    // Conversion: GN² ≈ effective power, scale appropriately for scene
    if (specs.guideNumber) {
      return (specs.guideNumber * specs.guideNumber) / 800;
    }
    
    // Priority 4: Estimate from power
    if (specs.powerUnit === 'Ws') {
      // Strobe power: approximately 40 lumens per Ws is a reasonable estimate
      const estimatedLumens = specs.power * 40;
      return estimatedLumens / 15000;
    } else {
      // Continuous LED/Watt: varies widely, but ~100 lumens per watt is typical for good LEDs
      const estimatedLumens = specs.power * 100;
      return estimatedLumens / 15000;
    }
  }

  private getLightModelUrl(type: string): string | null {
    // Map light types to their 3D model URLs
    // Uses available GLB models, with 300D_Light as default for LED panels
    // and Profoto_B10 for strobes, softbox for modifiers
    const modelMap: Record<string, string> = {
      // Aputure LED lights - use 300D model
      'aputure-300d': '/api/models/300D_Light.glb',
      'aputure-120d': '/api/models/300D_Light.glb',
      'aputure-600d': '/api/models/300D_Light.glb',
      'aputure-300x': '/api/models/300D_Light.glb',
      'aputure-nova': '/api/models/300D_Light.glb',
      
      // Godox strobes - use Profoto B10 model (similar form factor)
      'godox-ad200': '/api/models/Profoto_B10.glb',
      'godox-ad200pro': '/api/models/Profoto_B10.glb',
      'godox-ad400pro': '/api/models/Profoto_B10.glb',
      'godox-ad600': '/api/models/Profoto_B10.glb',
      'godox-ad600pro': '/api/models/Profoto_B10.glb',
      
      // Profoto strobes
      'profoto-b10': '/api/models/Profoto_B10.glb',
      'profoto-b10plus': '/api/models/Profoto_B10.glb',
      'profoto-b1x': '/api/models/Profoto_B10.glb',
      'profoto-d2': '/api/models/Profoto_B10.glb',
      'profoto-a1': '/api/models/Profoto_B10.glb',
      
      // Softbox modifiers
      'softbox': '/api/models/softbox.glb',
      'softbox-rect': '/api/models/softbox.glb',
      'softbox-octa': '/api/models/softbox.glb',
      'profoto-softbox': '/api/models/profoto_softbox.glb',
      
      // Generic/default mappings
      'led-panel': '/api/models/300D_Light.glb',
      'strobe': '/api/models/Profoto_B10.glb',
    };
    
    // Return mapped model or fall back to 300D for any unrecognized LED/continuous lights
    if (modelMap[type]) {
      return modelMap[type];
    }
    
    // Fallback: LEDs/continuous use 300D, strobes use Profoto
    if (type.includes('strobe') || type.includes('flash')) {
      return '/api/models/Profoto_B10.glb';
    }
    
    // Default to 300D for any light type
    return '/api/models/300D_Light.glb';
  }
  
  /**
   * Setup materials for a cloned light mesh
   * Dark metal fixture - glow is added as separate disc mesh
   */
  private setupClonedLightMaterials(mesh: BABYLON.Mesh, color: BABYLON.Color3, intensity: number): void {
    if (mesh.material) {
      // Clone the material so each light instance has its own
      const originalMat = mesh.material;
      const clonedMat = originalMat.clone(`${originalMat.name}_cloned_${Date.now()}`);
      
      if (clonedMat) {
        clonedMat.alpha = 1.0;
        
        if (clonedMat instanceof BABYLON.PBRMaterial) {
          clonedMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
          clonedMat.emissiveTexture = null;
          clonedMat.albedoTexture = null;
          // Dark metal fixture - no glow on body
          clonedMat.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.18);
          clonedMat.metallic = 0.7;
          clonedMat.roughness = 0.3;
          clonedMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
        } else if (clonedMat instanceof BABYLON.StandardMaterial) {
          clonedMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
          clonedMat.emissiveTexture = null;
          clonedMat.diffuseTexture = null;
          clonedMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
          clonedMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
        }
        
        mesh.material = clonedMat;
      }
    }
  }
  
  private createDefaultLightMesh(id: string, type: string, beamAngle: number): BABYLON.Mesh {
    if (type.includes('softbox') || type.includes('umbrella')) {
      const mesh = BABYLON.MeshBuilder.CreateBox(`mesh_${id}`, { width: 1.5, height: 0.3, depth: 1.2 }, this.scene);
      mesh.isVisible = true;
      mesh.setEnabled(true);
      mesh.isPickable = true;
      return mesh;
    } else {
      const mesh = BABYLON.MeshBuilder.CreateCylinder(`mesh_${id}`, { 
        height: 0.8, diameterTop: 0.2, diameterBottom: 0.4 
      }, this.scene);
      mesh.rotation.x = Math.PI;
      mesh.isVisible = true;
      mesh.setEnabled(true);
      mesh.isPickable = true;
      return mesh;
    }
  }

  private calculateBeamAngle(specs: LightSpecs): number {
    if (specs.beamAngle) {
      return (specs.beamAngle * Math.PI) / 180;
    }
    return Math.PI / 4;
  }

  // Helper functions for brand-specific power controls
  public getPowerStepsForLight(lightType: string, brand?: string): { values: number[], labels: string[], isFlash: boolean } {
    const lightSpec = getLightById(lightType);
    const isStrobe = lightSpec?.type === 'strobe' || lightType.includes('strobe');
    
    // For strobes/flashes, use brand-specific controls
    if (isStrobe && brand) {
      const brandLower = brand.toLowerCase();
      if (brandLower === 'godox' || brandLower === 'profoto') {
        // Godox and Profoto use 01-10 steps (1/1, 1/2, 1/4, 1/8, 1/16, etc.)
        // Mapping: 10=1/1, 9=1/1.4, 8=1/2, 7=1/2.8, 6=1/4, 5=1/5.6, 4=1/8, 3=1/11, 2=1/16, 1=1/22
        const flashSteps = [
          { level: 1, fraction: 1/22, percent: 4.5 },   // 01
          { level: 2, fraction: 1/16, percent: 6.25 },  // 02
          { level: 3, fraction: 1/11, percent: 9.1 },   // 03
          { level: 4, fraction: 1/8, percent: 12.5 },   // 04
          { level: 5, fraction: 1/5.6, percent: 17.9 }, // 05
          { level: 6, fraction: 1/4, percent: 25 },     // 06
          { level: 7, fraction: 1/2.8, percent: 35.7 }, // 07
          { level: 8, fraction: 1/2, percent: 50 },     // 08
          { level: 9, fraction: 1/1.4, percent: 71.4 }, // 09
          { level: 10, fraction: 1/1, percent: 100 }    // 10 (full power)
        ];
        return {
          values: flashSteps.map(s => s.fraction),
          labels: flashSteps.map(s => `${String(s.level).padStart(2, '0')}`),
          isFlash: true
        };
      }
    }
    
    // For continuous/LED lights, use percentage steps
    const continuousSteps = [10, 25, 50, 75, 100];
    return {
      values: continuousSteps.map(p => p / 100),
      labels: continuousSteps.map(p => `${p}%`),
      isFlash: false
    };
  }

  // Apply CRI visual effect by adjusting color rendering quality
  public applyCRIEffect(color: BABYLON.Color3, cri?: number): BABYLON.Color3 {
    if (!cri || cri >= 95) {
      // High CRI (95+): Minimal adjustment - natural color rendering
      return color;
    } else if (cri >= 90) {
      // Good CRI (90-94): Slight desaturation
      return new BABYLON.Color3(
        color.r * 0.98,
        color.g * 0.99,
        color.b * 0.97
      );
    } else if (cri >= 80) {
      // Moderate CRI (80-89): More desaturation, slight color shift
      return new BABYLON.Color3(
        color.r * 0.95,
        color.g * 0.97,
        color.b * 0.93
      );
    } else {
      // Low CRI (<80): Significant desaturation and color shift
      return new BABYLON.Color3(
        color.r * 0.90,
        color.g * 0.92,
        color.b * 0.88
      );
    }
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
    let color = this.cctToColor(cct);
    // Apply CRI effect if specified
    if (specs.cri) {
      color = this.applyCRIEffect(color, specs.cri);
    }
    
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
    // Enhanced emissive color with better intensity
    const emissiveIntensity = Math.min(2.5, 0.3 + intensity / 3);
    const emissiveColor = new BABYLON.Color3(
      Math.min(2.5, color.r * emissiveIntensity),
      Math.min(2.5, color.g * emissiveIntensity),
      Math.min(2.5, color.b * emissiveIntensity)
    );
    mat.emissiveColor = emissiveColor;
    mat.useEmissiveAsIllumination = true; // Make it self-illuminating
    mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Fallback for visibility
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

  addLightWithSpecsAndRotation(
    nodeId: string,
    name: string,
    type: string,
    position: BABYLON.Vector3,
    rotation: BABYLON.Vector3,
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

    const direction = new BABYLON.Vector3(0, -1, 0);
    const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);
    const rotatedDirection = BABYLON.Vector3.TransformNormal(direction, rotationMatrix);

    let light: BABYLON.Light;
    let mesh: BABYLON.Mesh;

    if (type === 'led' || type === 'continuous') {
      light = new BABYLON.SpotLight(
        id, position.clone(),
        rotatedDirection.normalize(),
        beamAngle, 2,
        this.scene
      );
      light.intensity = intensity;
      light.diffuse = color;

      mesh = BABYLON.MeshBuilder.CreateCylinder(`mesh_${id}`, { 
        height: 0.4, diameterTop: 0.15, diameterBottom: 0.3 
      }, this.scene);
      mesh.rotation.x = Math.PI + rotation.x;
      mesh.rotation.y = rotation.y;
      mesh.rotation.z = rotation.z;
    } else {
      light = new BABYLON.SpotLight(
        id, position.clone(),
        rotatedDirection.normalize(),
        beamAngle, 2,
        this.scene
      );
      light.intensity = intensity;
      light.diffuse = color;

      mesh = BABYLON.MeshBuilder.CreateCylinder(`mesh_${id}`, { 
        height: 0.5, diameterTop: 0.12, diameterBottom: 0.35 
      }, this.scene);
      mesh.rotation.x = Math.PI + rotation.x;
      mesh.rotation.y = rotation.y;
      mesh.rotation.z = rotation.z;
    }

    mesh.position = position.clone();
    const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
    // Enhanced emissive color with better intensity
    const emissiveIntensity = Math.min(2.5, 0.3 + intensity / 3);
    const emissiveColor = new BABYLON.Color3(
      Math.min(2.5, color.r * emissiveIntensity),
      Math.min(2.5, color.g * emissiveIntensity),
      Math.min(2.5, color.b * emissiveIntensity)
    );
    mat.emissiveColor = emissiveColor;
    mat.useEmissiveAsIllumination = true; // Make it self-illuminating
    mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Fallback for visibility
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
    this.updateSceneList();
    this.updateLightMeterReading();
  }

  applyScenarioPreset(preset: ScenarioPreset): void {
    console.log('Applying scenario preset:', preset.navn);
    
    this.lights.forEach((lightData, id) => {
      lightData.light.dispose();
      lightData.mesh.dispose();
    });
    this.lights.clear();
    this.lightCounter = 0;
    
    preset.sceneConfig.lights.forEach((lightConfig, index) => {
      const position = new BABYLON.Vector3(
        lightConfig.position[0],
        lightConfig.position[1],
        lightConfig.position[2]
      );
      
      const rotationDeg = lightConfig.rotation || [0, 0, 0];
      const rotationRad = new BABYLON.Vector3(
        (rotationDeg[0] * Math.PI) / 180,
        (rotationDeg[1] * Math.PI) / 180,
        (rotationDeg[2] * Math.PI) / 180
      );
      
      const cct = lightConfig.cct || 5600;
      const intensity = lightConfig.intensity || 1.0;
      const type = lightConfig.type.includes('soft') || lightConfig.type.includes('fill') ? 'led' : 'strobe';
      
      const specs = {
        power: intensity * 600,
        powerUnit: 'Ws' as const,
        cct: cct,
        cri: 95,
        lux1m: intensity * 10000,
        beamAngle: 45
      };
      
      const id = `preset_light_${index}`;
      const name = `${preset.navn} - Lys ${index + 1}`;
      
      this.addLightWithSpecsAndRotation(id, name, type, position, rotationRad, specs);
    });
    
    if (preset.sceneConfig.camera) {
      const camConfig = preset.sceneConfig.camera;
      const position = new BABYLON.Vector3(
        camConfig.position[0],
        camConfig.position[1],
        camConfig.position[2]
      );
      const target = new BABYLON.Vector3(
        camConfig.target[0],
        camConfig.target[1],
        camConfig.target[2]
      );
      
      this.camera.position = position;
      this.camera.setTarget(target);
      
      if (camConfig.focalLength) {
        const fov = 2 * Math.atan(18 / camConfig.focalLength);
        this.camera.fov = fov;
      }
    }
    
    if (preset.sceneConfig.backdrop?.color) {
      const color = BABYLON.Color3.FromHexString(preset.sceneConfig.backdrop.color);
      const backWall = this.scene.getMeshByName('backWall');
      if (backWall && backWall.material) {
        const mat = backWall.material as BABYLON.StandardMaterial;
        mat.diffuseColor = color;
        mat.emissiveColor = color.scale(0.1);
      }
    }
    
    this.updateSceneList();
    this.updateLightMeterReading();
    console.log(`Scenario "${preset.navn}" applied with ${preset.sceneConfig.lights.length} lights`);
  }

  /**
   * Apply a lighting pattern from LightPatternLibrary or CinematographyPatternsPanel
   * Supports both formats: LightPattern (with lightSetup) and CinematographyPattern (with lights)
   */
  async applyLightPattern(pattern: any): Promise<void> {
    console.log('Applying light pattern:', pattern.name || pattern.id);
    
    // Clear existing lights first (optional - could be configurable)
    this.lights.forEach((lightData, id) => {
      lightData.light.dispose();
      lightData.mesh.dispose();
    });
    this.lights.clear();
    this.lightCounter = 0;
    
    // Determine which format the pattern uses
    const lightsConfig = pattern.lights || pattern.lightSetup || [];
    
    if (lightsConfig.length === 0) {
      console.warn('No lights defined in pattern:', pattern.name);
      return;
    }
    
    // Apply each light from the pattern
    for (let index = 0; index < lightsConfig.length; index++) {
      const lightConfig = lightsConfig[index];
      
      // Handle different position formats
      let position: BABYLON.Vector3;
      if (lightConfig.position) {
        if (typeof lightConfig.position === 'object' && 'x' in lightConfig.position) {
          // CinematographyPattern format: { x, y, z }
          position = new BABYLON.Vector3(
            lightConfig.position.x,
            lightConfig.position.y,
            lightConfig.position.z
          );
        } else if (Array.isArray(lightConfig.position)) {
          // Array format: [x, y, z]
          position = new BABYLON.Vector3(
            lightConfig.position[0],
            lightConfig.position[1],
            lightConfig.position[2]
          );
        } else {
          position = new BABYLON.Vector3(-2, 2, 2);
        }
      } else {
        // LightPatternLibrary format: angle, height, distance
        const angle = ((lightConfig.angle || 0) * Math.PI) / 180;
        const height = lightConfig.height || 2;
        const distance = lightConfig.distance || 2;
        position = new BABYLON.Vector3(
          Math.sin(angle) * distance,
          height,
          Math.cos(angle) * distance
        );
      }
      
      // Determine light type based on role/type
      const role = lightConfig.type || lightConfig.role || 'key';
      let lightType = 'aputure-300d'; // Default light
      
      // Choose light type based on role
      switch (role) {
        case 'key':
          lightType = 'aputure-600d'; // Stronger key light
          break;
        case 'fill':
          lightType = 'aputure-120d'; // Softer fill light
          break;
        case 'rim':
        case 'back':
        case 'hair':
          lightType = 'godox-ad200pro'; // Rim/back light
          break;
        case 'kicker':
        case 'accent':
          lightType = 'godox-ad400pro';
          break;
        case 'background':
          lightType = 'aputure-300d';
          break;
        default:
          lightType = 'aputure-300d';
      }
      
      // Create the light
      const lightId = await this.addLight(lightType, position);
      
      // Apply additional settings if available
      if (lightId) {
        const lightData = this.lights.get(lightId);
        if (lightData) {
          // Set color temperature
          const cct = lightConfig.colorTemp || lightConfig.cct || 5600;
          lightData.cct = cct;
          const color = this.cctToColor(cct);
          if (lightData.light instanceof BABYLON.SpotLight || 
              lightData.light instanceof BABYLON.PointLight ||
              lightData.light instanceof BABYLON.HemisphericLight) {
            lightData.light.diffuse = color;
          }
          
          // Set intensity
          const intensityPercent = lightConfig.intensity || lightConfig.power || 100;
          const intensity = (intensityPercent / 100) * this.calculateLightIntensity(lightData.specs);
          lightData.light.intensity = intensity;
          lightData.intensity = intensityPercent / 100;
          
          // Set modifier if specified
          if (lightConfig.modifier) {
            lightData.modifier = lightConfig.modifier;
          }
          
          // Set light name based on role
          const roleName = role.charAt(0).toUpperCase() + role.slice(1);
          lightData.name = `${pattern.name} - ${roleName} Light`;
          
          // Point light toward center (actor position)
          if (lightData.light instanceof BABYLON.SpotLight) {
            lightData.light.setDirectionToTarget(new BABYLON.Vector3(0, 1.5, 0));
          }
        }
      }
    }
    
    // Notify light panel that lights have changed
    window.dispatchEvent(new CustomEvent('lights-updated', { 
      detail: { 
        patternName: pattern.name,
        lightCount: lightsConfig.length 
      } 
    }));
    
    this.updateSceneList();
    this.updateLightMeterReading();
    console.log(`Light pattern "${pattern.name}" applied with ${lightsConfig.length} lights`);
  }

  async addLight(type: string, position: BABYLON.Vector3): Promise<string> {
    const id = `light_${this.lightCounter++}`;
    
    // Try to get light specs from database
    const lightSpec = getLightById(type);
    let specs: LightSpecs;
    let cct: number;
    let name: string;
    
    if (lightSpec) {
      // Use real specifications from database
      specs = {
        power: lightSpec.power,
        powerUnit: lightSpec.powerUnit,
        cri: lightSpec.cri,
        tlci: lightSpec.tlci,
        lux1m: lightSpec.lux1m,
        beamAngle: lightSpec.beamAngle,
        guideNumber: lightSpec.guideNumber,
        lumens: lightSpec.lumens,
        colorTemp: lightSpec.cct
      };
      cct = lightSpec.cct || 5600;
      name = `${lightSpec.brand} ${lightSpec.model}`;
    } else {
      // Fallback to defaults for unknown light types
      specs = {
        power: 600,
        powerUnit: 'Ws',
        guideNumber: 87,
        lumens: 24000
      };
      cct = 5600;
      name = this.getLightName(type);
    }
    
    let color = this.cctToColor(cct);
    // Apply CRI effect if specified
    if (lightSpec && lightSpec.cri) {
      color = this.applyCRIEffect(color, lightSpec.cri);
    }
    const intensity = this.calculateLightIntensity(specs);

    let light: BABYLON.Light;
    
    // Calculate beam angle from specs
    const beamAngle = this.calculateBeamAngle(specs);
    
    // Check if we should load a 3D model for this light
    const modelUrl = this.getLightModelUrl(type);
    let lightMesh: BABYLON.Mesh;
    let loadedFromModel = false;
    
    if (modelUrl) {
      // Check if we have a cached version of this light type
      const cachedModel = this.lightModelCache.get(type);
      
      if (cachedModel) {
        // CLONE from cache - much faster than re-loading GLB
        console.log(`[Mesh Instancing] Cloning cached model for ${type} (avoiding GLB reload)`);
        
        try {
          // Clone the master mesh hierarchy
          const clonedMesh = cachedModel.masterMesh.clone(`mesh_${id}`, null, true);
          if (!clonedMesh) {
            throw new Error('Clone returned null');
          }
          
          lightMesh = clonedMesh;
          lightMesh.position = position.clone();
          
          // Copy forward axis data
          (lightMesh as any)._localForwardAxis = cachedModel.localForwardAxis.clone();
          (lightMesh as any)._initialWorldForward = cachedModel.initialWorldForward.clone();
          
          // Initialize rotationQuaternion for gizmo support
          if (!lightMesh.rotationQuaternion) {
            lightMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
          }
          
          // Position on ground
          try {
            lightMesh.computeWorldMatrix(true);
            const localBounds = lightMesh.getHierarchyBoundingVectors(false);
            const bottomY = localBounds.min.y;
            if (isFinite(bottomY) && bottomY !== Number.MAX_VALUE) {
              lightMesh.position.y = position.y - bottomY + 0.001;
            }
          } catch (e) {
            lightMesh.position.y = 0.5;
          }
          
          // Make visible and pickable
          lightMesh.isPickable = true;
          lightMesh.isVisible = true;
          lightMesh.setEnabled(true);
          lightMesh.alwaysSelectAsActiveMesh = true;
          
          // Setup materials for cloned mesh with this light's color
          this.setupClonedLightMaterials(lightMesh, color, intensity);
          
          // Add to shadow casters
          lightMesh.receiveShadows = true;
          this.lights.forEach(lightData => {
            if (lightData.shadowGenerator) {
              lightData.shadowGenerator.addShadowCaster(lightMesh);
            }
          });
          
          // Also setup child meshes
          const children = lightMesh.getChildMeshes(true);
          children.forEach(child => {
            child.isPickable = true;
            child.isVisible = true;
            child.setEnabled(true);
            child.receiveShadows = true;
            this.lights.forEach(lightData => {
              if (lightData.shadowGenerator) {
                lightData.shadowGenerator.addShadowCaster(child);
              }
            });
            // Setup materials for children
            if (child instanceof BABYLON.Mesh) {
              this.setupClonedLightMaterials(child, color, intensity);
            }
          });
          
          loadedFromModel = true;
          console.log(`[Mesh Instancing] Clone successful for ${type}: ${lightMesh.name}`);
        } catch (cloneError) {
          console.warn(`[Mesh Instancing] Clone failed for ${type}, falling back to reload:`, cloneError);
          // Fall through to normal loading
        }
      }
      
      // Load 3D model if not cloned from cache
      if (!loadedFromModel) {
      try {
        console.log(`Loading light 3D model from: ${modelUrl} for light type: ${type}`);
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelUrl, this.scene);
        console.log(`Loaded ${result.meshes.length} meshes from light model ${modelUrl}`);
        
        // Verify that meshes were actually loaded
        if (!result.meshes || result.meshes.length === 0) {
          throw new Error(`No meshes returned from model loader for ${modelUrl}`);
        }
        
        if (result.meshes && result.meshes.length > 0) {
          // Find root mesh (mesh without parent)
          let rootMesh: BABYLON.AbstractMesh | null = null;
          for (const mesh of result.meshes) {
            if (!mesh.parent) {
              rootMesh = mesh;
              break;
            }
          }
          
          // If no root mesh found, use the first mesh
          if (!rootMesh) {
            rootMesh = result.meshes[0];
            console.warn('No root mesh found, using first mesh');
          }
          
          // Check if root mesh has geometry, if not, find a mesh that does
          let meshWithGeometry = rootMesh as BABYLON.Mesh;
          if (meshWithGeometry instanceof BABYLON.Mesh) {
            const rootVertices = meshWithGeometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            if (!rootVertices || rootVertices.length === 0) {
              console.warn(`Root mesh ${meshWithGeometry.name} has no geometry, searching for mesh with geometry...`);
              // Find first mesh with geometry
              for (const mesh of result.meshes) {
                if (mesh instanceof BABYLON.Mesh) {
                  const vertices = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                  if (vertices && vertices.length > 0) {
                    meshWithGeometry = mesh;
                    console.log(`Found mesh with geometry: ${mesh.name} (${vertices.length / 3} vertices)`);
                    break;
                  }
                }
              }
              // If still no geometry, check child meshes
              if (!meshWithGeometry.getVerticesData(BABYLON.VertexBuffer.PositionKind) || 
                  meshWithGeometry.getVerticesData(BABYLON.VertexBuffer.PositionKind)!.length === 0) {
                const children = meshWithGeometry.getChildMeshes(true);
                for (const child of children) {
                  if (child instanceof BABYLON.Mesh) {
                    const childVertices = child.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    if (childVertices && childVertices.length > 0) {
                      // Use the child mesh as the main mesh
                      meshWithGeometry = child;
                      console.log(`Using child mesh with geometry: ${child.name} (${childVertices.length / 3} vertices)`);
                      break;
                    }
                  }
                }
              }
            }
          }
          
          lightMesh = meshWithGeometry;
          lightMesh.name = `mesh_${id}`;
          
          // Ensure mesh is in the scene
          if (!lightMesh.getScene()) {
            console.warn('Mesh not in scene, adding it...');
            this.scene.addMesh(lightMesh);
          }
          
          // Reset transforms to ensure proper positioning
          // Don't reset rotation - let the model keep its original orientation
          // The light direction will be calculated from the mesh's actual rotation
          lightMesh.scaling.setAll(1);
          
          console.log(`Root mesh selected: ${lightMesh.name}, visible: ${lightMesh.isVisible}, enabled: ${lightMesh.isEnabled}, in scene: ${!!lightMesh.getScene()}`);
          
          // If the model appears to be pointing down (common for light models),
          // we might need to adjust it. But first, let's see what the model's natural orientation is.
          // We'll calculate the light direction based on the mesh's actual rotation.
          
          // Check if model needs scaling (some models are very large/small)
          try {
            const bounds = lightMesh.getHierarchyBoundingVectors(true);
            const size = bounds.max.subtract(bounds.min);
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // If model is very large (> 10 units) or very small (< 0.1 units), scale it
            if (maxDim > 10) {
              const scale = 2 / maxDim;
              lightMesh.scaling.setAll(scale);
              console.log(`Scaled down large model: ${maxDim.toFixed(2)} units -> scale ${scale.toFixed(3)}`);
            } else if (maxDim < 0.1 && maxDim > 0) {
              const scale = 1 / maxDim;
              lightMesh.scaling.setAll(scale);
              console.log(`Scaled up small model: ${maxDim.toFixed(2)} units -> scale ${scale.toFixed(3)}`);
            }
          } catch (e) {
            console.warn('Could not calculate bounds for scaling:', e);
          }
          
          // Position the model so it sits on the ground (y=0)
          // Calculate the bottom of the model's bounding box in local space
          let adjustedPosition = position.clone();
          try {
            // First set a temporary position to calculate bounds
            lightMesh.position = position.clone();
            
            // Get bounding box in local space (false = local space)
            // This gives us the model's dimensions relative to its origin
            const localBounds = lightMesh.getHierarchyBoundingVectors(false);
            const bottomY = localBounds.min.y; // Lowest point of the model in local space
            
            // Check if bounding box is valid (not infinity or max value)
            if (isFinite(bottomY) && bottomY !== Number.MAX_VALUE && bottomY !== -Number.MAX_VALUE) {
              // Adjust Y position so the bottom of the model is at ground level (y=0)
              // Add a small offset (0.001) to prevent z-fighting with the ground
              adjustedPosition.y = position.y - bottomY + 0.001;
              console.log('Positioned model on ground: bottomY=' + bottomY.toFixed(3) + ', adjustedY=' + adjustedPosition.y.toFixed(3));
            } else {
              // Invalid bounding box - use original position with default height
              console.warn('Invalid bounding box detected, using default position');
              adjustedPosition = position.clone();
              adjustedPosition.y = 0.5; // Default height above ground
            }
          } catch (e) {
            console.warn('Could not calculate ground positioning, using original position:', e);
            // If we can't calculate bounds, use the original position with default height
            adjustedPosition = position.clone();
            adjustedPosition.y = 0.5; // Default height above ground
          }
          
          lightMesh.position = adjustedPosition;
          
          // Visibility and interaction - ensure everything is visible
          lightMesh.isPickable = true;
          lightMesh.isVisible = true;
          lightMesh.setEnabled(true);
          
          // Force mesh to be in scene
          if (!lightMesh.getScene()) {
            this.scene.addMesh(lightMesh);
            console.log('Added lightMesh to scene');
          }
          
          // Ensure mesh is not culled
          lightMesh.alwaysSelectAsActiveMesh = true;
          
          // Log mesh visibility status
          console.log(`Mesh visibility check: name=${lightMesh.name}, visible=${lightMesh.isVisible}, enabled=${lightMesh.isEnabled}, inScene=${!!lightMesh.getScene()}, hasMaterial=${!!lightMesh.material}`);
          
          // Force material visibility - some GLB models might have invisible materials
          // Also add emissive glow based on CCT and intensity
          if (lightMesh.material) {
            (lightMesh.material as BABYLON.Material).alpha = 1.0;
            if (lightMesh.material instanceof BABYLON.StandardMaterial || lightMesh.material instanceof BABYLON.PBRMaterial) {
              lightMesh.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
              
              // Add emissive glow based on CCT color and intensity
              // Improved formula: minimum 0.3 for visibility, scales up to 2.5 for strong lights
              const emissiveIntensity = Math.min(2.5, 0.3 + intensity / 3);
              const emissiveColor = new BABYLON.Color3(
                Math.min(2.5, color.r * emissiveIntensity),
                Math.min(2.5, color.g * emissiveIntensity),
                Math.min(2.5, color.b * emissiveIntensity)
              );
              
              if (lightMesh.material instanceof BABYLON.StandardMaterial) {
                lightMesh.material.emissiveColor = emissiveColor;
                lightMesh.material.useEmissiveAsIllumination = true; // Make it self-illuminating
                // Ensure diffuse color is visible as fallback
                if (!lightMesh.material.diffuseColor || (lightMesh.material.diffuseColor.r === 0 && lightMesh.material.diffuseColor.g === 0 && lightMesh.material.diffuseColor.b === 0)) {
                  lightMesh.material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
              } else if (lightMesh.material instanceof BABYLON.PBRMaterial) {
                lightMesh.material.emissiveColor = emissiveColor;
                lightMesh.material.emissiveTexture = null; // Clear any existing emissive texture
                // PBR materials handle emissive differently - increase emissive intensity
                // Note: useEmissiveAsIllumination is not available on PBRMaterial
                // Instead, we rely on high emissiveColor values for visibility
                // Ensure PBR material has visible base color
                if (!lightMesh.material.albedoColor || (lightMesh.material.albedoColor.r === 0 && lightMesh.material.albedoColor.g === 0 && lightMesh.material.albedoColor.b === 0)) {
                  lightMesh.material.albedoColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
              }
            }
          } else {
            // If no material exists, create one with emissive glow
            console.log(`Creating default material for light mesh ${lightMesh.name} (no material found)`);
            const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Light gray base color
            // Improved formula: minimum 0.3 for visibility, scales up to 2.5 for strong lights
            const emissiveIntensity = Math.min(2.5, 0.3 + intensity / 3);
            const emissiveColor = new BABYLON.Color3(
              Math.min(2.5, color.r * emissiveIntensity),
              Math.min(2.5, color.g * emissiveIntensity),
              Math.min(2.5, color.b * emissiveIntensity)
            );
            mat.emissiveColor = emissiveColor;
            mat.useEmissiveAsIllumination = true; // Make it self-illuminating
            mat.disableLighting = false; // Allow some lighting for depth
            mat.alpha = 1.0;
            mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
            lightMesh.material = mat;
            console.log(`Default material created and assigned to ${lightMesh.name}`);
          }
          
          // Ensure parent visibility if it exists
          let parent = lightMesh.parent;
          while (parent) {
            parent.isVisible = true;
            parent.setEnabled(true);
            parent = parent.parent;
          }
          
          loadedFromModel = true;
          
          // Calculate rotation offset to align model's forward direction with the light beam
          // Different 3D models may have different default orientations
          // This offset ensures the SpotLight direction matches the model's visual appearance
          try {
            // Auto-detect forward axis from mesh geometry if not specified
            let detectedAxis: string | null = null;
            
            // Analyze mesh bounding box to detect dominant axis (likely beam direction)
            try {
              const boundingInfo = lightMesh.getBoundingInfo();
              const extents = boundingInfo.boundingBox.extendSizeWorld;
              
              // Find the axis with maximum extent (usually the beam/body direction)
              const absX = Math.abs(extents.x);
              const absY = Math.abs(extents.y);
              const absZ = Math.abs(extents.z);
              
              // Determine dominant axis
              let dominantAxis: string;
              let maxExtent: number;
              
              if (absY >= absX && absY >= absZ) {
                dominantAxis = 'y';
                maxExtent = absY;
                // For lights, if Y is dominant, beam usually points -Y (downward in local space)
                detectedAxis = '-y';
              } else if (absZ >= absX && absZ >= absY) {
                dominantAxis = 'z';
                maxExtent = absZ;
                // If Z is dominant, beam usually points -Z or +Z
                detectedAxis = '-z';
              } else {
                dominantAxis = 'x';
                maxExtent = absX;
                // If X is dominant, beam usually points +X or -X
                detectedAxis = '+x';
              }
              
              console.log(`[Light Direction] Detected mesh extents: X=${absX.toFixed(3)}, Y=${absY.toFixed(3)}, Z=${absZ.toFixed(3)}`);
              console.log(`[Light Direction] Auto-detected dominant axis: ${dominantAxis} (extent=${maxExtent.toFixed(3)}), suggested forwardAxis: ${detectedAxis}`);
            } catch (e) {
              console.warn('[Light Direction] Could not auto-detect forward axis from geometry:', e);
            }
            
            // Get local forward axis from lightSpec metadata, or use auto-detected, or default to -Z
            let localForward: BABYLON.Vector3;
            const forwardAxisSpec = lightSpec?.forwardAxis || detectedAxis || '-z';
            
            // Log warning if forwardAxis is not specified in metadata
            if (!lightSpec?.forwardAxis) {
              console.warn(`[Light Direction] No forwardAxis specified for '${type}'. ` +
                `Using ${detectedAxis ? 'auto-detected' : 'default'} '${forwardAxisSpec}'. ` +
                `If light direction is incorrect, add forwardAxis to lightFixtures.ts for this model.`);
            }
            
            switch (forwardAxisSpec) {
              case '+x': localForward = new BABYLON.Vector3(1, 0, 0); break;
              case '-x': localForward = new BABYLON.Vector3(-1, 0, 0); break;
              case '+y': localForward = new BABYLON.Vector3(0, 1, 0); break;
              case '-y': localForward = new BABYLON.Vector3(0, -1, 0); break;
              case '+z': localForward = new BABYLON.Vector3(0, 0, 1); break;
              case '-z': 
              default: localForward = new BABYLON.Vector3(0, 0, -1); break;
            }
            console.log(`[Light Direction] Using forwardAxis '${forwardAxisSpec}' for ${type}: (${localForward.x}, ${localForward.y}, ${localForward.z})`);
            
            // Store the local forward for use in updateLightPosition
            (lightMesh as any)._localForwardAxis = localForward.clone();
            
            // Get the model's absolute world orientation
            // Use absoluteRotationQuaternion if available (handles parent transforms and quaternion-authored rotations)
            // Otherwise fall back to rotationQuaternion, then Euler angles
            let worldForward: BABYLON.Vector3;
            
            // Force compute world matrix to ensure absoluteRotationQuaternion is up to date
            lightMesh.computeWorldMatrix(true);
            
            if (lightMesh.absoluteRotationQuaternion) {
              // Use absolute rotation quaternion (includes parent transforms)
              const rotationMatrix = new BABYLON.Matrix();
              BABYLON.Matrix.FromQuaternionToRef(lightMesh.absoluteRotationQuaternion, rotationMatrix);
              worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
              console.log('Using absoluteRotationQuaternion for light orientation');
            } else if (lightMesh.rotationQuaternion) {
              // Use rotation quaternion
              const rotationMatrix = new BABYLON.Matrix();
              BABYLON.Matrix.FromQuaternionToRef(lightMesh.rotationQuaternion, rotationMatrix);
              worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
              console.log('Using rotationQuaternion for light orientation');
            } else {
              // Fall back to Euler rotation
              const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
                lightMesh.rotation.y,
                lightMesh.rotation.x,
                lightMesh.rotation.z
              );
              worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
              console.log('Using Euler rotation for light orientation');
            }
            
            worldForward.normalize();
            
            // Store the initial forward direction for reference
            (lightMesh as any)._initialWorldForward = worldForward.clone();
            console.log(`Calculated world forward for light model: (${worldForward.x.toFixed(3)}, ${worldForward.y.toFixed(3)}, ${worldForward.z.toFixed(3)})`);
            
            // Initialize rotationQuaternion if not already set
            // This is required for gizmo rotation to work properly
            if (!lightMesh.rotationQuaternion) {
              lightMesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
                lightMesh.rotation.x,
                lightMesh.rotation.y,
                lightMesh.rotation.z
              );
              console.log('Initialized rotationQuaternion for gizmo support');
            }
          } catch (e) {
            console.warn('Could not calculate orientation, using default:', e);
            (lightMesh as any)._localForwardAxis = new BABYLON.Vector3(0, 0, -1);
          }
          
          // Make all meshes visible, pickable, and enable shadows
          // PRESERVE original GLB materials/textures - only add emissive glow
          result.meshes.forEach(m => {
            m.isPickable = true;
            m.isVisible = true;
            m.setEnabled(true);
            
            // Enable shadows for this mesh
            m.receiveShadows = true;
            
            // Add mesh as shadow caster to all existing lights with shadow generators
            this.lights.forEach(lightData => {
              if (lightData.shadowGenerator) {
                lightData.shadowGenerator.addShadowCaster(m);
              }
            });
            
            // Ensure mesh is in scene
            if (!m.getScene()) {
              this.scene.addMesh(m);
            }
            
            // Fix Rodin-generated models - make fixture dark metal (no glow on body)
            // Light glow will be added as a separate mesh
            if (m.material) {
              m.material.alpha = 1.0;
              if (m.material instanceof BABYLON.PBRMaterial) {
                m.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                m.material.emissiveTexture = null;
                m.material.albedoTexture = null;
                // Dark metal fixture body - no glow
                m.material.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.18);
                m.material.metallic = 0.7;
                m.material.roughness = 0.3;
                m.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
              } else if (m.material instanceof BABYLON.StandardMaterial) {
                m.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                m.material.emissiveTexture = null;
                m.material.diffuseTexture = null;
                m.material.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
                m.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
              }
            }
            
            // Check if mesh has geometry
            if (m instanceof BABYLON.Mesh) {
              const vertices = m.getVerticesData(BABYLON.VertexBuffer.PositionKind);
              if (!vertices || vertices.length === 0) {
                console.warn(`Mesh ${m.name} has no vertices/geometry!`);
              } else {
                console.log(`Mesh ${m.name} has ${vertices.length / 3} vertices`);
              }
            }
            
            // Recursively enable all children and preserve their materials
            const children = m.getChildMeshes(true);
            children.forEach(child => {
              child.isPickable = true;
              child.isVisible = true;
              child.setEnabled(true);
              
              // Enable shadows for child mesh
              child.receiveShadows = true;
              this.lights.forEach(lightData => {
                if (lightData.shadowGenerator) {
                  lightData.shadowGenerator.addShadowCaster(child);
                }
              });
              
              // Ensure child is in scene
              if (!child.getScene()) {
                this.scene.addMesh(child);
              }
              
              // Fix Rodin-generated models for children too
              if (child.material) {
                child.material.alpha = 1.0;
                if (child.material instanceof BABYLON.PBRMaterial) {
                  child.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                  child.material.emissiveTexture = null;
                  child.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                  child.material.albedoColor = new BABYLON.Color3(0.12, 0.12, 0.14);
                  child.material.albedoTexture = null;
                  child.material.metallic = 0.8;
                  child.material.roughness = 0.25;
                } else if (child.material instanceof BABYLON.StandardMaterial) {
                  child.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                  child.material.emissiveTexture = null;
                  child.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                  child.material.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.14);
                  child.material.diffuseTexture = null;
                }
              }
            });
          });
          
          // Also ensure all skeletons and animations are enabled
          if (result.skeletons && result.skeletons.length > 0) {
            result.skeletons.forEach(skeleton => {
              skeleton.getBones().forEach(bone => {
                // Ensure bones don't hide meshes
              });
            });
          }
          
          // Force a render update to ensure model is visible
          this.scene.render();
          
          // Get bounding info for debugging
          try {
            const boundingInfo = lightMesh.getBoundingInfo();
            const center = boundingInfo.boundingBox.centerWorld;
            const size = boundingInfo.boundingBox.extendSizeWorld.scale(2);
            console.log(`Light model loaded successfully:`, {
              name: lightMesh.name,
              position: `${lightMesh.position.x.toFixed(2)}, ${lightMesh.position.y.toFixed(2)}, ${lightMesh.position.z.toFixed(2)}`,
              center: `${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`,
              size: `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`,
              meshCount: result.meshes.length,
              visible: lightMesh.isVisible,
              enabled: lightMesh.isEnabled,
              hasMaterial: !!lightMesh.material
            });
            
            // Double-check visibility
            if (!lightMesh.isVisible) {
              console.warn('WARNING: Light mesh is not visible after loading! Forcing visibility...');
              lightMesh.isVisible = true;
            }
          } catch (e) {
            console.warn('Could not get bounding info:', e);
          }
          
          // CACHE the loaded model for future cloning
          const localForward = ((lightMesh as any)._localForwardAxis as BABYLON.Vector3) || new BABYLON.Vector3(0, 0, -1);
          const initialForward = ((lightMesh as any)._initialWorldForward as BABYLON.Vector3) || new BABYLON.Vector3(0, -0.3, -1).normalize();
          
          this.lightModelCache.set(type, {
            masterMesh: lightMesh,
            allMeshes: result.meshes,
            localForwardAxis: localForward.clone(),
            initialWorldForward: initialForward.clone()
          });
          console.log(`[Mesh Instancing] Cached model for ${type} - future lights will clone instead of reload`);
          
        } else {
          throw new Error('No meshes found in model');
        }
      } catch (error) {
        console.error(`Failed to load light model ${modelUrl}:`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        // Fall through to create default mesh
        lightMesh = this.createDefaultLightMesh(id, type, beamAngle);
        loadedFromModel = false;
      }
      } // Close the if (!loadedFromModel) block
    } else {
      // Create default procedural mesh
      lightMesh = this.createDefaultLightMesh(id, type, beamAngle);
    }
    
    // Calculate initial light direction based on model orientation
    // For loaded models, use the stored initial forward direction
    // For procedural meshes, use default forward direction
    let initialDirection = new BABYLON.Vector3(0, -0.3, -1).normalize(); // Default: slightly down, pointing forward (-Z)
    
    if (loadedFromModel && lightMesh) {
      try {
        // Use the stored initial world forward direction if available
        const storedForward = (lightMesh as any)._initialWorldForward as BABYLON.Vector3 | undefined;
        if (storedForward) {
          initialDirection = storedForward.clone();
          console.log(`Using stored initial forward for ${id}: (${initialDirection.x.toFixed(3)}, ${initialDirection.y.toFixed(3)}, ${initialDirection.z.toFixed(3)})`);
        } else {
          // Fall back to calculating from current orientation using stored local forward axis
          const localForward = ((lightMesh as any)._localForwardAxis as BABYLON.Vector3) || new BABYLON.Vector3(0, 0, -1);
          lightMesh.computeWorldMatrix(true);
          
          if (lightMesh.absoluteRotationQuaternion) {
            const rotationMatrix = new BABYLON.Matrix();
            BABYLON.Matrix.FromQuaternionToRef(lightMesh.absoluteRotationQuaternion, rotationMatrix);
            initialDirection = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix).normalize();
          } else if (lightMesh.rotationQuaternion) {
            const rotationMatrix = new BABYLON.Matrix();
            BABYLON.Matrix.FromQuaternionToRef(lightMesh.rotationQuaternion, rotationMatrix);
            initialDirection = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix).normalize();
          } else {
            const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
              lightMesh.rotation.y,
              lightMesh.rotation.x,
              lightMesh.rotation.z
            );
            initialDirection = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix).normalize();
          }
          console.log(`Calculated initial direction for ${id}: (${initialDirection.x.toFixed(3)}, ${initialDirection.y.toFixed(3)}, ${initialDirection.z.toFixed(3)})`);
        }
        
        // If the direction points mostly up, adjust it to point forward
        if (initialDirection.y > 0.7) {
          initialDirection = new BABYLON.Vector3(0, -0.3, -1).normalize();
          console.log(`Adjusted initial direction (was pointing up)`);
        }
      } catch (e) {
        console.warn('Could not calculate initial direction from model, using default:', e);
        initialDirection = new BABYLON.Vector3(0, -0.3, -1).normalize();
      }
    }
    
    // Create light source
    if (type.includes('softbox') || type.includes('umbrella')) {
      // Soft modifiers use PointLight for soft, diffused lighting
      light = new BABYLON.PointLight(id, position.clone(), this.scene);
      light.intensity = intensity * 0.6;
      light.diffuse = color;
      (light as BABYLON.PointLight).range = 15;
    } else {
      // Use SpotLight with proper beam angle from specs
      // Use calculated initial direction based on model orientation
      light = new BABYLON.SpotLight(
        id, position.clone(),
        initialDirection,
        beamAngle, 2,
        this.scene
      );
      light.intensity = intensity;
      light.diffuse = color;
    }
    
    // Ensure light is enabled and will cast light
    light.setEnabled(true);
    
    // Enable shadows for the light
    let shadowGenerator: BABYLON.ShadowGenerator | undefined;
    if (light instanceof BABYLON.SpotLight || light instanceof BABYLON.PointLight) {
      try {
        shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
        
        // Use PCF (Percentage Closer Filtering) for soft, realistic shadows
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
        
        // Shadow quality settings - softer, more subtle shadows
        shadowGenerator.setDarkness(0.35); // More subtle shadows
        shadowGenerator.bias = 0.00005;
        shadowGenerator.normalBias = 0.02;
        
        // Enable contact hardening for distance-based shadow softness (more realistic)
        shadowGenerator.useContactHardeningShadow = true;
        shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
        
        // Add all meshes in the scene as shadow casters (except ground and light meshes)
        this.scene.meshes.forEach(mesh => {
          if (mesh.name !== 'ground' && 
              mesh.name !== 'grid' && 
              !mesh.name.startsWith('light_') &&
              !mesh.name.startsWith('mesh_light_') &&
              mesh !== lightMesh) {
            shadowGenerator!.addShadowCaster(mesh);
          }
        });
        
        console.log(`Shadow generator created for light ${id}`);
      } catch (e) {
        console.warn('Could not create shadow generator:', e);
      }
    }
    
    // If we didn't load a model, apply material to default mesh
    if (!loadedFromModel) {
      lightMesh.position = position.clone();
      const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
      // Make emissive color brighter by scaling it
      const brightColor = new BABYLON.Color3(
        Math.min(1, color.r * 1.5),
        Math.min(1, color.g * 1.5),
        Math.min(1, color.b * 1.5)
      );
      mat.emissiveColor = brightColor;
      mat.disableLighting = true;
      mat.alpha = 1.0;
      lightMesh.material = mat;
    }

    // Update light position and direction to follow mesh
    // This ensures the light is always connected to the model, even when moved/rotated with gizmo
    const updateLightPosition = () => {
      if (light instanceof BABYLON.SpotLight || light instanceof BABYLON.PointLight) {
        // Always ensure light follows mesh position and rotation
        if (loadedFromModel) {
          // For loaded models, calculate light position and direction based on mesh orientation
          try {
            // Check if manual direction override is set (azimuth/elevation)
            const lightData = this.lights.get(id);
            if (lightData && (lightData.azimuth !== undefined || lightData.elevation !== undefined)) {
              // Use manual azimuth/elevation control (spherical coordinates)
              // Apply offset to compensate for model's default orientation
              // When model points correctly, azimuth=-180° and elevation=-10°
              // So when user sets -180°/-10°, we want the direction that corresponds to 0°/0° in world space
              const azimuthOffset = -180; // Offset to compensate for model orientation
              const elevationOffset = -10; // Offset to compensate for model orientation
              
              // Subtract offset: when user sets -180°/-10°, we calculate direction from 0°/0°
              const azimuth = ((lightData.azimuth || 0) - azimuthOffset) * Math.PI / 180; // Convert to radians and apply offset
              const elevation = ((lightData.elevation || 0) - elevationOffset) * Math.PI / 180; // Convert to radians and apply offset
              
              // Calculate direction from azimuth and elevation (spherical to Cartesian)
              // Use precise trigonometric calculations
              const cosElevation = Math.cos(elevation);
              const sinElevation = Math.sin(elevation);
              const cosAzimuth = Math.cos(azimuth);
              const sinAzimuth = Math.sin(azimuth);
              
              // Spherical to Cartesian conversion:
              // x = sin(azimuth) * cos(elevation)
              // y = -sin(elevation)  (negative because elevation positive = down in our convention)
              // z = -cos(azimuth) * cos(elevation)  (negative Z is forward in Babylon.js)
              const worldForward = new BABYLON.Vector3(
                sinAzimuth * cosElevation,
                -sinElevation,
                -cosAzimuth * cosElevation
              );
              
              // Normalize to ensure unit vector (handle floating point errors)
              const length = worldForward.length();
              if (length > 0.0001) {
                worldForward.scaleInPlace(1.0 / length);
              } else {
                // Fallback if calculation results in zero vector
                worldForward.set(0, 0, -1);
                worldForward.normalize();
              }
              
              // Calculate light position: at mesh center or slightly forward
              let lightOffset = new BABYLON.Vector3(0, 0, 0);
              try {
                const boundingInfo = lightMesh.getBoundingInfo();
                const size = boundingInfo.boundingBox.extendSizeWorld;
                const offsetDistance = Math.max(Math.min(size.x, size.y, size.z) * 0.2, 0.03);
                lightOffset = worldForward.scale(offsetDistance);
              } catch (e) {
                lightOffset = worldForward.scale(0.03);
              }
              
              // Update light position to follow mesh (always relative to mesh position)
              light.position = lightMesh.position.add(lightOffset);
              
              if (light instanceof BABYLON.SpotLight) {
                // Update light direction to follow mesh rotation
                light.direction = worldForward;
              }
              return; // Skip automatic calculation
            }
            
            // Automatic direction calculation based on mesh rotation
            // Use quaternion-based calculation with per-model forward axis
            
            light.position = lightMesh.position.clone();
            
            // For SpotLight, calculate direction from mesh orientation
            if (light instanceof BABYLON.SpotLight) {
              // Use stored local forward axis from model metadata, or default to -Z
              const localForward = ((lightMesh as any)._localForwardAxis as BABYLON.Vector3) || new BABYLON.Vector3(0, 0, -1);
              let worldForward: BABYLON.Vector3;
              
              // Force compute world matrix for accurate orientation
              lightMesh.computeWorldMatrix(true);
              
              // Use the most accurate rotation representation available
              if (lightMesh.absoluteRotationQuaternion) {
                // Best option: includes parent transforms
                const rotationMatrix = new BABYLON.Matrix();
                BABYLON.Matrix.FromQuaternionToRef(lightMesh.absoluteRotationQuaternion, rotationMatrix);
                worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
              } else if (lightMesh.rotationQuaternion) {
                // Second best: quaternion rotation
                const rotationMatrix = new BABYLON.Matrix();
                BABYLON.Matrix.FromQuaternionToRef(lightMesh.rotationQuaternion, rotationMatrix);
                worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
              } else {
                // Fall back to Euler angles
                const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
                  lightMesh.rotation.y,
                  lightMesh.rotation.x,
                  lightMesh.rotation.z
                );
                worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
              }
              
              light.direction = worldForward.normalize();
            }
          } catch (e) {
            // Fallback to simple position if calculation fails
            console.warn('Could not calculate light position from model, using mesh position:', e);
            light.position = lightMesh.position.clone();
            if (light instanceof BABYLON.SpotLight) {
              light.direction = new BABYLON.Vector3(0, -0.3, -1).normalize();
            }
          }
        } else {
          // For procedural meshes, calculate direction from rotation (always use -Z)
          light.position = lightMesh.position.clone();
          if (light instanceof BABYLON.SpotLight) {
            const localForward = new BABYLON.Vector3(0, 0, -1);
            let worldForward: BABYLON.Vector3;
            
            lightMesh.computeWorldMatrix(true);
            
            if (lightMesh.absoluteRotationQuaternion) {
              const rotationMatrix = new BABYLON.Matrix();
              BABYLON.Matrix.FromQuaternionToRef(lightMesh.absoluteRotationQuaternion, rotationMatrix);
              worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
            } else if (lightMesh.rotationQuaternion) {
              const rotationMatrix = new BABYLON.Matrix();
              BABYLON.Matrix.FromQuaternionToRef(lightMesh.rotationQuaternion, rotationMatrix);
              worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
            } else {
              const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
                lightMesh.rotation.y,
                lightMesh.rotation.x,
                lightMesh.rotation.z
              );
              worldForward = BABYLON.Vector3.TransformNormal(localForward, rotationMatrix);
            }
            
            light.direction = worldForward.normalize();
          }
        }
        
        // Ensure light is enabled
        light.setEnabled(true);
      }
    };
    
    // Create visual beam/cone for SpotLights to show direction
    let beamVisualization: BABYLON.Mesh | undefined;
    if (light instanceof BABYLON.SpotLight) {
      try {
        // Create a cone mesh to visualize the light beam
        const beamLength = 5; // Length of the visualization
        const beamAngle = (light as BABYLON.SpotLight).angle;
        const beamRadius = Math.tan(beamAngle) * beamLength;
        
        beamVisualization = BABYLON.MeshBuilder.CreateCylinder(
          `beam_${id}`,
          {
            height: beamLength,
            diameterTop: 0,
            diameterBottom: beamRadius * 2,
            tessellation: 16
          },
          this.scene
        );
        
        // Make it semi-transparent and emissive
        const beamMat = new BABYLON.StandardMaterial(`beamMat_${id}`, this.scene);
        beamMat.emissiveColor = color;
        beamMat.diffuseColor = color;
        beamMat.alpha = 0.2; // Semi-transparent
        beamMat.disableLighting = true;
        beamMat.sideOrientation = BABYLON.Mesh.DOUBLESIDE;
        beamVisualization.material = beamMat;
        
        // Parent to lightMesh so it follows model position and rotation
        // Position will be relative to mesh (we'll update it in the update function)
        beamVisualization.position = new BABYLON.Vector3(0, 0, 0); // Start at mesh origin
        beamVisualization.parent = lightMesh;
        
        // Initial rotation will be set by updateBeamVisualization
        
        // Only show when light is selected (we'll toggle this in selectLight)
        beamVisualization.isVisible = false;
        beamVisualization.isPickable = false;
        
        console.log(`Beam visualization created for light ${id}`);
      } catch (e) {
        console.warn('Could not create beam visualization:', e);
      }
    }
    
    // Create a small glowing bulb at the SpotLight position
    // The SpotLight position is already calculated to be at the light source
    try {
      // Create a small sphere as the "light bulb"
      const bulbSphere = BABYLON.MeshBuilder.CreateSphere(
        `bulb_${id}`,
        { diameter: 0.15, segments: 16 },
        this.scene
      );
      
      // Create emissive material for the bulb
      const bulbMat = new BABYLON.PBRMaterial(`bulbMat_${id}`, this.scene);
      bulbMat.emissiveColor = color.clone();
      bulbMat.emissiveIntensity = Math.min(6.0, 2.5 + intensity);
      bulbMat.albedoColor = new BABYLON.Color3(1, 1, 1);
      bulbMat.metallic = 0;
      bulbMat.roughness = 1;
      bulbMat.unlit = true; // Make it always bright
      bulbSphere.material = bulbMat;
      
      // Parent to lightMesh so it moves with the fixture
      bulbSphere.parent = lightMesh;
      bulbSphere.isPickable = false;
      
      // Position bulb at the light source opening (inside reflector)
      // Use stored localForwardAxis from the mesh, or default to forward direction
      const storedForwardAxis = (lightMesh as any)._localForwardAxis as BABYLON.Vector3 | undefined;
      const forwardDir = storedForwardAxis ? storedForwardAxis.clone() : new BABYLON.Vector3(0, 0, -1);
      const bulbOffset = forwardDir.scale(0.4); // Moved back (was 0.55)
      bulbSphere.position = new BABYLON.Vector3(0, 1.35, 0).add(bulbOffset); // Lowered Y (was 1.5)
      
      // Add to GlowLayer with improved settings
      if (!this.glowLayer) {
        this.glowLayer = new BABYLON.GlowLayer("studioGlow", this.scene, {
          mainTextureFixedSize: 512,
          blurKernelSize: 64
        });
        this.glowLayer.intensity = 0.85;
      }
      
      this.glowLayer.addIncludedOnlyMesh(bulbSphere as BABYLON.Mesh);
      
      // Store reference for later updates
      (lightMesh as any)._glowBulb = bulbSphere;
      
      console.log(`Light bulb created for ${id}`);
    } catch (e) {
      console.warn('Could not create light bulb:', e);
    }
    
    // Update immediately
    updateLightPosition();
    
    // Also update on each frame
    this.scene.onBeforeRenderObservable.add(updateLightPosition);
    
    // Update beam visualization position and rotation to follow model
    if (beamVisualization && light instanceof BABYLON.SpotLight) {
      const updateBeamVisualization = () => {
        if (beamVisualization && light instanceof BABYLON.SpotLight) {
          // Since beamVisualization is parented to lightMesh, it will automatically follow position
          // We just need to update its rotation to match the light direction
          
          // Get the light direction (which follows the model's rotation)
          const direction = light.direction;
          
          // Calculate rotation matrix from direction vector
          // The beam should point in the same direction as the light
          const up = new BABYLON.Vector3(0, 1, 0);
          let right = BABYLON.Vector3.Cross(up, direction);
          
          // Handle case where direction is parallel to up vector
          if (right.length() < 0.001) {
            right = new BABYLON.Vector3(1, 0, 0);
          }
          right.normalize();
          
          const newUp = BABYLON.Vector3.Cross(direction, right);
          newUp.normalize();
          
          // Create rotation matrix from direction
          const rotationMatrix = BABYLON.Matrix.FromValues(
            right.x, right.y, right.z, 0,
            newUp.x, newUp.y, newUp.z, 0,
            direction.x, direction.y, direction.z, 0,
            0, 0, 0, 1
          );
          
          // Convert to quaternion and apply
          const quaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
          beamVisualization.rotationQuaternion = quaternion;
          
          // Position beam at light position (relative to mesh since it's parented)
          // Calculate offset from mesh to light position
          const lightOffset = light.position.subtract(lightMesh.position);
          beamVisualization.position = lightOffset;
        }
      };
      this.scene.onBeforeRenderObservable.add(updateBeamVisualization);
    }
    
    // Create modeling light for strobes/flashes
    let modelingLight: BABYLON.Light | undefined;
    let modelingLightIntensity = 0;
    let modelingLightEnabled = false;
    
    if (lightSpec && (lightSpec.type === 'strobe' || lightSpec.type === 'flash') && lightSpec.modelingLightPower) {
      // Calculate modeling light intensity
      if (lightSpec.modelingLightLux1m) {
        // Use lux at 1m if available (most accurate)
        modelingLightIntensity = lightSpec.modelingLightLux1m / 5000; // Convert to Babylon.js intensity scale
      } else if (lightSpec.modelingLightPower) {
        // Estimate from power: ~200 lumens per watt for LED modeling lights
        const estimatedLumens = lightSpec.modelingLightPower * 200;
        modelingLightIntensity = estimatedLumens / 2000; // Scale to Babylon.js intensity
      }
      
      // Create PointLight for modeling light (softer, continuous light)
      modelingLight = new BABYLON.PointLight(`${id}_modeling`, position.clone(), this.scene);
      modelingLight.intensity = 0; // Start disabled
      modelingLight.diffuse = color; // Same color as flash
      (modelingLight as BABYLON.PointLight).range = 10; // Shorter range than flash
      modelingLight.setEnabled(false); // Explicitly disable to hide from scene
      
      // Update modeling light position to follow mesh
      const updateModelingLightPosition = () => {
        if (modelingLight instanceof BABYLON.PointLight) {
          modelingLight.position = lightMesh.position.clone();
        }
      };
      this.scene.onBeforeRenderObservable.add(updateModelingLightPosition);
      
      modelingLightEnabled = false; // Start with modeling light off
    }

    const lightData: LightData = {
      light,
      mesh: lightMesh,
      type,
      name,
      cct,
      modifier: type.includes('softbox') ? 'Softbox' : 'Ingen',
      specs: specs,
      intensity: intensity,
      baseIntensity: intensity, // Store base intensity
      powerMultiplier: 1.0, // Default to 100% power
      modelingLight: modelingLight,
      modelingLightEnabled: modelingLightEnabled,
      modelingLightIntensity: modelingLightIntensity,
      shadowGenerator: shadowGenerator,
      beamVisualization: beamVisualization,
      enabled: true
    };

    this.lights.set(id, lightData);
    this.gizmoManager?.attachableMeshes?.push(lightMesh);
    this.selectLight(id);
    this.updateSceneList();
    this.updateAmbientLightIntensity(); // Auto-dim ambient based on studio lights
    
    // Return the light ID so caller can link it to store nodes if needed
    return id;
  }

  public updateLightMeterReading(): void {
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
    
    // Check if lights are too weak and recommend stronger lights
    // Target EV for well-lit studio is typically EV 10-12
    const targetEV = 10;
    if (ev < targetEV - 1 && this.lights.size > 0) {
      // Lights are too weak - check if we should show recommendation
      const lastRecommendationTime = (window as any).lastLightRecommendationTime || 0;
      const now = Date.now();
      // Only show recommendation once per minute to avoid spam
      if (now - lastRecommendationTime > 60000) {
        (window as any).lastLightRecommendationTime = now;
        this.checkAndRecommendStrongerLights(ev, targetEV);
      }
    }
  }

  // Check if lights need to be upgraded and show recommendation dialog
  private checkAndRecommendStrongerLights(currentEV: number, targetEV: number): void {
    // Find the weakest light(s) in the scene
    const weakLights: Array<{ id: string; data: LightData; currentStrength: number }> = [];
    
    for (const [id, data] of this.lights) {
      // Calculate current light strength
      let strength = 0;
      if (data.specs?.lux1m) {
        strength = data.specs.lux1m;
      } else if (data.specs?.guideNumber) {
        strength = data.specs.guideNumber * 10; // Rough conversion
      } else if (data.specs?.lumens) {
        strength = data.specs.lumens;
      } else if (data.specs?.power) {
        strength = data.specs.power * (data.specs.powerUnit === 'Ws' ? 40 : 100); // Rough conversion
      }
      
      weakLights.push({ id, data, currentStrength: strength });
    }
    
    // Sort by strength (weakest first)
    weakLights.sort((a, b) => a.currentStrength - b.currentStrength);
    
    // Get recommended stronger lights from database
    const recommendedLights = this.getRecommendedLights(weakLights[0]?.data.type || 'strobe', weakLights[0]?.currentStrength || 0);
    
    if (recommendedLights.length > 0) {
      // Show recommendation dialog
      this.showLightRecommendationDialog(weakLights[0]?.id || '', recommendedLights, currentEV, targetEV);
    }
  }

  // Get recommended lights that are stronger than current
  private getRecommendedLights(currentType: string, minStrength: number): LightSpec[] {
    const isStrobe = currentType.includes('strobe') || currentType.includes('flash');
    const targetType = isStrobe ? 'strobe' : 'led';
    
    // Filter lights by type and strength
    return LIGHT_DATABASE.filter(light => {
      if (light.type !== targetType && light.type !== 'continuous') return false;
      
      // Calculate strength for comparison
      let strength = 0;
      if (light.lux1m) {
        strength = light.lux1m;
      } else if (light.guideNumber) {
        strength = light.guideNumber * 10;
      } else if (light.lumens) {
        strength = light.lumens;
      } else if (light.power) {
        strength = light.power * (light.powerUnit === 'Ws' ? 40 : 100);
      }
      
      // Return lights that are at least 50% stronger
      return strength > minStrength * 1.5;
    })
    .sort((a, b) => {
      // Sort by strength (strongest first)
      const aStrength = a.lux1m || (a.guideNumber ? a.guideNumber * 10 : 0) || a.lumens || a.power * (a.powerUnit === 'Ws' ? 40 : 100);
      const bStrength = b.lux1m || (b.guideNumber ? b.guideNumber * 10 : 0) || b.lumens || b.power * (b.powerUnit === 'Ws' ? 40 : 100);
      return bStrength - aStrength;
    })
    .slice(0, 6); // Top 6 recommendations
  }

  // Show light recommendation dialog
  private showLightRecommendationDialog(weakLightId: string, recommendedLights: LightSpec[], currentEV: number, targetEV: number): void {
    // Create dialog HTML
    const dialogId = 'lightRecommendationDialog';
    let dialog = document.getElementById(dialogId);
    
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = dialogId;
      dialog.className = 'light-recommendation-dialog';
      document.body.appendChild(dialog);
    }
    
    const evDiff = targetEV - currentEV;
    const evDiffText = evDiff > 0 ? `${evDiff.toFixed(1)} EV` : '';
    
    dialog.innerHTML = `
      <div class="light-recommendation-overlay"></div>
      <div class="light-recommendation-content">
        <div class="light-recommendation-header">
          <h2>💡 Anbefaling: Sterkere lys</h2>
          <button class="light-recommendation-close" aria-label="Lukk">×</button>
        </div>
        <div class="light-recommendation-body">
          <p class="light-recommendation-message">
            Scenariet krever sterkere lys. Nåværende belysning er <strong>${evDiffText}</strong> under anbefalt nivå (EV ${targetEV}).
          </p>
          <p class="light-recommendation-subtitle">Velg et anbefalt lys for å bytte:</p>
          <div class="light-recommendation-grid">
            ${recommendedLights.map(light => `
              <div class="light-recommendation-card" data-light-id="${light.id}">
                <div class="light-recommendation-card-header">
                  <h3>${light.brand} ${light.model}</h3>
                  <span class="light-recommendation-type">${light.type === 'strobe' ? '📸 Blits' : '💡 Videolys'}</span>
                </div>
                <div class="light-recommendation-specs">
                  <div class="light-spec-row">
                    <span class="light-spec-label">Effekt:</span>
                    <span class="light-spec-value">${light.power} ${light.powerUnit}</span>
                  </div>
                  ${light.lux1m ? `
                    <div class="light-spec-row">
                      <span class="light-spec-label">Lux @ 1m:</span>
                      <span class="light-spec-value">${light.lux1m.toLocaleString()} lx</span>
                    </div>
                  ` : ''}
                  ${light.guideNumber ? `
                    <div class="light-spec-row">
                      <span class="light-spec-label">Guide Number:</span>
                      <span class="light-spec-value">${light.guideNumber}</span>
                    </div>
                  ` : ''}
                  ${light.lumens ? `
                    <div class="light-spec-row">
                      <span class="light-spec-label">Lumens:</span>
                      <span class="light-spec-value">${light.lumens.toLocaleString()} lm</span>
                    </div>
                  ` : ''}
                  ${light.cri ? `
                    <div class="light-spec-row">
                      <span class="light-spec-label">CRI:</span>
                      <span class="light-spec-value">${light.cri}</span>
                    </div>
                  ` : ''}
                  ${light.cct ? `
                    <div class="light-spec-row">
                      <span class="light-spec-label">Fargetemperatur:</span>
                      <span class="light-spec-value">${light.cct}K</span>
                    </div>
                  ` : ''}
                  ${light.beamAngle ? `
                    <div class="light-spec-row">
                      <span class="light-spec-label">Beam Angle:</span>
                      <span class="light-spec-value">${light.beamAngle}°</span>
                    </div>
                  ` : ''}
                </div>
                <button class="light-recommendation-select-btn" data-light-id="${light.id}" data-weak-light-id="${weakLightId}">
                  Velg dette lyset
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="light-recommendation-footer">
          <button class="light-recommendation-dismiss">Ikke nå</button>
        </div>
      </div>
    `;
    
    dialog.style.display = 'block';
    
    // Add event listeners
    const closeBtn = dialog.querySelector('.light-recommendation-close');
    const dismissBtn = dialog.querySelector('.light-recommendation-dismiss');
    const overlay = dialog.querySelector('.light-recommendation-overlay');
    const selectBtns = dialog.querySelectorAll('.light-recommendation-select-btn');
    
    const closeDialog = () => {
      dialog!.style.display = 'none';
    };
    
    closeBtn?.addEventListener('click', closeDialog);
    dismissBtn?.addEventListener('click', closeDialog);
    overlay?.addEventListener('click', closeDialog);
    
    selectBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lightId = (e.target as HTMLElement).dataset.lightId;
        const weakLightId = (e.target as HTMLElement).dataset.weakLightId;
        if (lightId && weakLightId) {
          this.replaceLightWithRecommended(weakLightId, lightId);
          closeDialog();
        }
      });
    });
  }

  // Replace a weak light with a recommended stronger light
  private replaceLightWithRecommended(weakLightId: string, recommendedLightId: string): void {
    const weakLight = this.lights.get(weakLightId);
    if (!weakLight) return;
    
    const recommendedLight = getLightById(recommendedLightId);
    if (!recommendedLight) return;
    
    // Get position and settings from weak light
    const position = weakLight.mesh.position.clone();
    const cct = weakLight.cct;
    const powerMultiplier = weakLight.powerMultiplier || 1.0;
    
    // Remove weak light
    this.removeLight(weakLightId);
    
    // Add recommended light at same position
    this.addLight(recommendedLightId, position);
    
    // Update settings to match previous light
    const newLightId = Array.from(this.lights.keys()).pop(); // Get the last added light
    if (newLightId) {
      const newLight = this.lights.get(newLightId);
      if (newLight) {
        newLight.cct = cct;
        newLight.powerMultiplier = powerMultiplier;
        
        // Update color temperature
        let color = this.cctToColor(cct);
        if (recommendedLight.cri) {
          color = this.applyCRIEffect(color, recommendedLight.cri);
        }
        newLight.light.diffuse = color;
        (newLight.mesh.material as BABYLON.StandardMaterial).emissiveColor = color;
        
        // Update scene brightness to apply power multiplier
        this.updateSceneBrightness();
        this.updateLightMeterReading();
      }
    }
    
    console.log(`Replaced weak light with ${recommendedLight.brand} ${recommendedLight.model}`);
  }

  public selectLight(id: string): void {
    const data = this.lights.get(id);
    if (!data) {
      console.warn(`[selectLight] Light with ID ${id} not found in lights Map!`);
      return; // Don't proceed if light not found
    }
    
    // Deselect previous light (hide beam visualization and remove highlight)
    if (this.selectedLightId && this.selectedLightId !== id) {
      const prevData = this.lights.get(this.selectedLightId);
      if (prevData) {
        // Hide beam visualization
        if (prevData.beamVisualization) {
          prevData.beamVisualization.isVisible = false;
        }
        // Remove highlight (restore original material)
        this.removeLightHighlight(prevData.mesh);
      }
    }
    
    this.selectedLightId = id;
    this.selectedActorId = null; // Clear actor selection when selecting light

    if (data) {
      // Removed automatic opening of "Kamera & Lys" panel when selecting lights
      // Users can manually open the panel if needed
      
      const propsPanel = document.getElementById('lightProperties');
      if (propsPanel) propsPanel.style.display = 'block';

      const nameEl = document.getElementById('selectedName');
      const typeEl = document.getElementById('selectedType');
      if (nameEl) nameEl.textContent = data.name;
      if (typeEl) typeEl.textContent = `(${data.type})`;

      const cctSelect = document.getElementById('cctSelect') as HTMLSelectElement;
      if (cctSelect) cctSelect.value = data.cct.toString();

      // Ensure mesh uses rotationQuaternion for proper gizmo handling
      if (!data.mesh.rotationQuaternion) {
        data.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
          data.mesh.rotation.x,
          data.mesh.rotation.y,
          data.mesh.rotation.z
        );
      }
      
      // Use studio gizmos by default - they replace standard gizmos for better UX
      // Standard gizmos are hidden when studio gizmos are active
      if (this.gizmoManager) {
        // Disable standard gizmos - studio gizmos will handle manipulation
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.attachToMesh(null);
        
        // Note: Standard gizmo observers removed - studio gizmos handle all manipulation
        // Studio gizmos provide their own drag handlers for position/rotation updates
      }
      
      // Show beam visualization for selected light
      if (data.beamVisualization) {
        data.beamVisualization.isVisible = true;
      }
      
      // Add visual highlight to selected light
      this.addLightHighlight(data.mesh);
      
      // Enable snapping to ground when moving
      this.enableGroundSnapping(data.mesh);
      
      // Create studio gizmos for realistic light manipulation
      this.createStudioGizmos(id);
      
      // Show game-style HUD for light control
      this.showLightControlHUD(id, data);
    }

    this.updateSceneList();
    window.dispatchEvent(new CustomEvent('light-selected', { detail: { id } }));
  }
  
  private addLightHighlight(mesh: BABYLON.Mesh): void {
    const highlightColor = new BABYLON.Color3(0.3, 0.7, 1.0); // Cyan highlight
    const outlineWidth = 0.02;
    
    // Apply to main mesh
    if (!(mesh as any)._originalOutlineWidth) {
      (mesh as any)._originalOutlineWidth = mesh.outlineWidth;
      (mesh as any)._originalOutlineColor = mesh.outlineColor?.clone();
    }
    mesh.renderOutline = true;
    mesh.outlineWidth = outlineWidth;
    mesh.outlineColor = highlightColor;
    
    // Apply to all child meshes as well
    const children = mesh.getChildMeshes(false);
    children.forEach(child => {
      if (child instanceof BABYLON.Mesh) {
        if (!(child as any)._originalOutlineWidth) {
          (child as any)._originalOutlineWidth = child.outlineWidth;
          (child as any)._originalOutlineColor = child.outlineColor?.clone();
        }
        child.renderOutline = true;
        child.outlineWidth = outlineWidth;
        child.outlineColor = highlightColor;
      }
    });
  }
  
  private removeLightHighlight(mesh: BABYLON.Mesh): void {
    // Restore original outline or remove it from main mesh
    if ((mesh as any)._originalOutlineWidth !== undefined) {
      mesh.outlineWidth = (mesh as any)._originalOutlineWidth;
      if ((mesh as any)._originalOutlineColor) {
        mesh.outlineColor = (mesh as any)._originalOutlineColor;
      }
    }
    mesh.renderOutline = false;
    
    // Also remove from all child meshes
    const children = mesh.getChildMeshes(false);
    children.forEach(child => {
      if (child instanceof BABYLON.Mesh) {
        if ((child as any)._originalOutlineWidth !== undefined) {
          child.outlineWidth = (child as any)._originalOutlineWidth;
          if ((child as any)._originalOutlineColor) {
            child.outlineColor = (child as any)._originalOutlineColor;
          }
        }
        child.renderOutline = false;
      }
    });
  }
  
  private addActorHighlight(mesh: BABYLON.Mesh): void {
    // Store original outline width
    if (!(mesh as any)._originalOutlineWidth) {
      (mesh as any)._originalOutlineWidth = mesh.outlineWidth;
      (mesh as any)._originalOutlineColor = mesh.outlineColor;
    }
    
    // Add outline highlight with pink/magenta color to match actor color scheme
    mesh.renderOutline = true;
    mesh.outlineWidth = 0.03; // Slightly thicker for better visibility
    mesh.outlineColor = new BABYLON.Color3(0.93, 0.28, 0.60); // Pink/magenta highlight (matches actor color #ec4899)
  }
  
  private removeActorHighlight(mesh: BABYLON.Mesh): void {
    // Restore original outline or remove it
    if ((mesh as any)._originalOutlineWidth !== undefined) {
      mesh.outlineWidth = (mesh as any)._originalOutlineWidth;
      if ((mesh as any)._originalOutlineColor) {
        mesh.outlineColor = (mesh as any)._originalOutlineColor;
      } else {
        mesh.renderOutline = false;
      }
    }
  }
  
  private enableGroundSnapping(mesh: BABYLON.Mesh): void {
    // Store original position update handler
    if ((mesh as any)._groundSnappingEnabled) return;
    (mesh as any)._groundSnappingEnabled = true;
    
    // Add observer to snap to ground when position changes
    const snapToGround = () => {
      try {
        const bounds = mesh.getHierarchyBoundingVectors(false);
        const bottomY = bounds.min.y;
        if (mesh.position.y - bottomY < 0.01) {
          // Snap to ground
          mesh.position.y = -bottomY + 0.001;
        }
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Store the observer for cleanup
    (mesh as any)._groundSnapObserver = this.scene.onBeforeRenderObservable.add(snapToGround);
  }
  
  private updateLightVisualState(data: LightData, enabled: boolean): void {
    // Update emissive material based on enabled state
    // Note: We don't modify the fixture mesh emissive here - it should stay dark (it's the fixture body)
    // Only the glowBulb should emit light
    
    // Update beam visualization visibility
    if (data.beamVisualization) {
      // Only show beam if light is enabled and selected
      data.beamVisualization.isVisible = enabled && this.selectedLightId === data.mesh.name.replace('mesh_', 'light_');
    }
    
    // Update glow bulb visibility - hide when light is off
    const glowBulb = (data.mesh as any)._glowBulb as BABYLON.Mesh | undefined;
    if (glowBulb) {
      glowBulb.setEnabled(enabled);
      // Also update the bulb material emissive intensity
      if (glowBulb.material) {
        const bulbMat = glowBulb.material as BABYLON.PBRMaterial;
        if (enabled) {
          const color = this.cctToColor(data.cct);
          bulbMat.emissiveColor = color.clone();
          bulbMat.emissiveIntensity = Math.min(6.0, 2.5 + (data.intensity || 1));
        } else {
          bulbMat.emissiveIntensity = 0;
        }
      }
    }
  }

  public toggleLight(id: string, enabled?: boolean): void {
    const data = this.lights.get(id);
    if (!data) return;

    // Toggle if enabled parameter is not provided
    const newEnabled = enabled !== undefined ? enabled : !(data.enabled !== false);
    data.enabled = newEnabled;

    // Enable/disable the actual light
    data.light.setEnabled(newEnabled);

    // Update visual state (emissive material, beam visualization)
    this.updateLightVisualState(data, newEnabled);

    // Update light meter reading
    this.updateLightMeterReading();

    // Update ambient light if auto-dimming is enabled
    this.updateAmbientLightIntensity();
  }

  public removeLight(id: string): void {
    const data = this.lights.get(id);
    if (!data) return;

    // Dispose light and mesh
    data.light.dispose();
    data.mesh.dispose();
    
    // Dispose beam visualization if exists
    if (data.beamVisualization) {
      data.beamVisualization.dispose();
    }

    // Remove from map
    this.lights.delete(id);

    // Clear selection if this was selected
    if (this.selectedLightId === id) {
      this.selectedLightId = null;
      this.gizmoManager?.attachToMesh(null);
      this.disposeStudioGizmos();
    }

    this.updateSceneList();
    this.updateLightMeterReading();
    this.updateAmbientLightIntensity(); // Auto-dim ambient based on studio lights
  }
  
  public clearAllLights(): void {
    // Get all light IDs first to avoid modifying map while iterating
    const lightIds = Array.from(this.lights.keys());
    
    // Remove each light
    lightIds.forEach(id => {
      const data = this.lights.get(id);
      if (data) {
        data.light.dispose();
        data.mesh.dispose();
        if (data.beamVisualization) {
          data.beamVisualization.dispose();
        }
      }
    });
    
    // Clear the map
    this.lights.clear();
    
    // Clear selection and studio gizmos
    this.selectedLightId = null;
    this.gizmoManager?.attachToMesh(null);
    this.disposeStudioGizmos();
    
    // Reset light counter for new IDs
    this.lightCounter = 0;
    
    // Update UI
    this.updateSceneList();
    this.updateLightMeterReading();
    this.updateAmbientLightIntensity();
    
    console.log('All lights cleared');
  }
  
  // Update ambient light intensity based on studio lights and settings
  public updateAmbientLightIntensity(): void {
    if (!this.ambientLight) return;
    
    const sliderEl = document.getElementById('ambientLightSlider') as HTMLInputElement;
    const valueEl = document.getElementById('ambientLightValue');
    
    if (this.autoAmbientEnabled && this.lights.size > 0) {
      // Auto-dim: reduce ambient based on number and intensity of ENABLED studio lights only
      let totalStudioIntensity = 0;
      let enabledLightCount = 0;
      this.lights.forEach(light => {
        // Only count lights that are enabled (power on)
        if (light.enabled !== false) {
          totalStudioIntensity += light.light.intensity * (light.powerMultiplier || 1.0);
          enabledLightCount++;
        }
      });
      
      // If all lights are turned off (power off), dim ambient significantly
      if (enabledLightCount === 0) {
        // All studio lights are off - reduce ambient to near zero for realistic darkness
        this.ambientLight.intensity = this.ambientLightBaseIntensity * 0.02;
        const effectivePercent = Math.round((this.ambientLight.intensity / 0.3) * 30);
        if (sliderEl) sliderEl.value = String(effectivePercent);
        if (valueEl) valueEl.textContent = `${effectivePercent}% (lys av)`;
      } else {
        // Calculate dimming factor: more studio light = less ambient
        // Use a logarithmic curve for natural falloff
        const dimmingFactor = Math.max(0.05, 1 / (1 + totalStudioIntensity * 0.15));
        this.ambientLight.intensity = this.ambientLightBaseIntensity * dimmingFactor;
        
        // Update slider to show current effective value
        const effectivePercent = Math.round((this.ambientLight.intensity / 0.3) * 30);
        if (sliderEl) sliderEl.value = String(effectivePercent);
        if (valueEl) valueEl.textContent = `${effectivePercent}% (auto)`;
      }
    } else {
      // Manual mode or no studio lights: use base intensity
      this.ambientLight.intensity = this.ambientLightBaseIntensity;
      
      const percent = Math.round((this.ambientLightBaseIntensity / 0.3) * 30);
      if (valueEl) valueEl.textContent = `${percent}%`;
    }
    
    // Update scene list to reflect new ambient intensity percentage
    this.updateSceneList();
  }
  
  // Set ambient light base intensity from slider
  public setAmbientLightIntensity(percent: number): void {
    // Map 0-100% to 0-0.5 intensity range
    this.ambientLightBaseIntensity = (percent / 100) * 0.5;
    this.updateAmbientLightIntensity();
  }
  
  // Toggle auto-ambient mode
  public setAutoAmbient(enabled: boolean): void {
    this.autoAmbientEnabled = enabled;
    this.updateAmbientLightIntensity();
  }
  
  // Toggle ambient light on/off
  public setAmbientLightEnabled(enabled: boolean): void {
    this.ambientLightEnabled = enabled;
    if (this.ambientLight) {
      this.ambientLight.setEnabled(enabled);
      if (enabled) {
        this.updateAmbientLightIntensity();
      }
    }
    this.updateSceneList();
  }
  
  // Set ambient light color temperature (Kelvin)
  public setAmbientLightTemperature(kelvin: number): void {
    this.ambientLightTemperature = kelvin;
    if (this.ambientLight) {
      const color = this.cctToColor(kelvin);
      this.ambientLight.diffuse = color;
    }
  }
  
  // Set ambient light ground color intensity (0-100%)
  public setAmbientLightGroundIntensity(percent: number): void {
    this.ambientLightGroundIntensity = percent / 100;
    if (this.ambientLight) {
      const groundFactor = this.ambientLightGroundIntensity;
      // Ground color reflects light bouncing from floor - use warmer tones
      // Scale from 0 (no ground reflection) to full diffuse match at 100%
      const baseR = 0.4;
      const baseG = 0.35;
      const baseB = 0.3;
      this.ambientLight.groundColor = new BABYLON.Color3(
        baseR * groundFactor * this.ambientLight.intensity,
        baseG * groundFactor * this.ambientLight.intensity,
        baseB * groundFactor * this.ambientLight.intensity
      );
    }
  }
  
  // Apply ambient light preset
  public setAmbientPreset(preset: 'day' | 'evening' | 'night' | 'studio'): void {
    const sliderEl = document.getElementById('ambientLightSlider') as HTMLInputElement;
    const valueEl = document.getElementById('ambientLightValue');
    const tempSlider = document.getElementById('ambientTempSlider') as HTMLInputElement;
    const tempValue = document.getElementById('ambientTempValue');
    const groundSlider = document.getElementById('ambientGroundSlider') as HTMLInputElement;
    const groundValue = document.getElementById('ambientGroundValue');
    const toggleSwitch = document.getElementById('ambientToggleSwitch') as HTMLInputElement;
    const toggleStatus = document.getElementById('ambientToggleStatus');
    
    let intensity: number, temperature: number, ground: number;
    
    switch (preset) {
      case 'day':
        intensity = 60;
        temperature = 5600;
        ground = 70;
        break;
      case 'evening':
        intensity = 40;
        temperature = 3200;
        ground = 40;
        break;
      case 'night':
        intensity = 15;
        temperature = 8000;
        ground = 20;
        break;
      case 'studio':
      default:
        intensity = 30;
        temperature = 6500;
        ground = 50;
        break;
    }
    
    // Enable ambient light
    this.setAmbientLightEnabled(true);
    if (toggleSwitch) toggleSwitch.checked = true;
    if (toggleStatus) toggleStatus.textContent = 'PÅ';
    
    // Apply settings
    this.setAmbientLightIntensity(intensity);
    this.setAmbientLightTemperature(temperature);
    this.setAmbientLightGroundIntensity(ground);
    
    // Update UI sliders
    if (sliderEl) sliderEl.value = String(intensity);
    if (valueEl) valueEl.textContent = `${intensity}%`;
    if (tempSlider) tempSlider.value = String(temperature);
    if (tempValue) tempValue.textContent = `${temperature}K`;
    if (groundSlider) groundSlider.value = String(ground);
    if (groundValue) groundValue.textContent = `${ground}%`;
  }

  private updateSceneList(): void {
    // Update the actual scene hierarchy lightsGroup
    const lightsGroup = document.getElementById('lightsGroup');
    if (lightsGroup) {
      lightsGroup.innerHTML = '';
      
      // Add ambient light to scene hierarchy
      if (this.ambientLight) {
        const ambientItem = document.createElement('li');
        ambientItem.className = 'hierarchy-item';
        ambientItem.setAttribute('role', 'treeitem');
        ambientItem.setAttribute('tabindex', '0');
        const intensityPercent = Math.round((this.ambientLight.intensity / 0.5) * 100);
        ambientItem.innerHTML = `
          <span class="hierarchy-icon" style="color: #64b4ff;">☀</span>
          <span class="hierarchy-name">Omgivelseslys (${intensityPercent}%)</span>
        `;
        ambientItem.style.cursor = 'pointer';
        ambientItem.addEventListener('click', () => {
          // Open camera controls panel and switch to light tab
          const cameraControlsPanel = document.getElementById('cameraControlsPanel') as HTMLElement;
          const tabLight = document.getElementById('tabLight') as HTMLElement;
          const tabCamera = document.getElementById('tabCamera') as HTMLElement;
          const cameraTabContent = document.getElementById('cameraTabContent') as HTMLElement;
          const lightTabContent = document.getElementById('lightTabContent') as HTMLElement;
          
          // Show the panel if hidden
          if (cameraControlsPanel && cameraControlsPanel.style.display === 'none') {
            cameraControlsPanel.style.display = 'block';
          }
          
          // Switch to light tab
          if (tabLight && tabCamera && cameraTabContent && lightTabContent) {
            // Update tab styles
            tabCamera.classList.remove('active');
            tabCamera.style.background = 'transparent';
            tabCamera.style.borderBottom = '2px solid transparent';
            tabCamera.style.color = 'rgba(255,255,255,0.6)';
            
            tabLight.classList.add('active');
            tabLight.style.background = 'rgba(255,170,0,0.15)';
            tabLight.style.borderBottom = '2px solid #ffaa00';
            tabLight.style.color = '#ffaa00';
            
            // Show/hide content
            cameraTabContent.style.display = 'none';
            lightTabContent.style.display = 'flex';
            
            // Setup collapse functionality
            setTimeout(() => {
              if ((window as any).setupLightSectionCollapse) {
                (window as any).setupLightSectionCollapse();
              }
            }, 50);
            
            // Increase panel width and remove height restriction when light tab is active (responsive based on screen size)
            const screenWidth = window.innerWidth;
            const lightTabWidth = screenWidth >= 1440 ? '1100px' : '900px';
            if (cameraControlsPanel) {
              cameraControlsPanel.style.width = lightTabWidth;
              // Remove max-height restriction to show all content
              cameraControlsPanel.style.maxHeight = 'none';
            }
            const cameraControlsScrollable = document.getElementById('cameraControlsScrollable') as HTMLElement;
            if (cameraControlsScrollable) {
              cameraControlsScrollable.style.maxHeight = 'calc(100vh - 280px)';
              cameraControlsScrollable.style.overflowY = 'auto';
            }
          }
        });
        lightsGroup.appendChild(ambientItem);
      }
      
      // Add studio lights
      for (const [id, data] of this.lights) {
        const item = document.createElement('li');
        item.className = `hierarchy-item${id === this.selectedLightId ? ' selected' : ''}`;
        item.setAttribute('data-id', id);
        item.setAttribute('role', 'treeitem');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-selected', id === this.selectedLightId ? 'true' : 'false');
        
        // Determine light icon color based on CCT
        const cctColor = this.cctToColor(data.cct);
        const iconColor = `rgb(${Math.round(cctColor.r * 255)}, ${Math.round(cctColor.g * 255)}, ${Math.round(cctColor.b * 255)})`;
        
        item.innerHTML = `
          <span class="hierarchy-icon" style="color: ${iconColor};">●</span>
          <span class="hierarchy-name">${data.name}</span>
          <span class="hierarchy-info" style="font-size:10px;color:rgba(255,255,255,0.5);margin-left:auto;">${data.cct}K</span>
        `;
        item.addEventListener('click', () => this.selectLight(id));
        lightsGroup.appendChild(item);
      }
      
      // Show empty message if no lights
      if (this.lights.size === 0 && !this.ambientLight) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'hierarchy-empty';
        emptyItem.setAttribute('role', 'status');
        emptyItem.innerHTML = '<span class="hierarchy-empty-text">Ingen lys lagt til</span>';
        lightsGroup.appendChild(emptyItem);
      }
      
      // Update the lights count badge
      const lightsHeader = document.querySelector('[data-group="lights"]');
      if (lightsHeader) {
        let badge = lightsHeader.querySelector('.hierarchy-count') as HTMLElement;
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'hierarchy-count';
          badge.style.cssText = 'margin-left:auto;font-size:11px;color:rgba(255,255,255,0.5);padding:2px 6px;background:rgba(255,255,255,0.1);border-radius:8px;';
          lightsHeader.appendChild(badge);
        }
        const totalLights = this.lights.size + (this.ambientLight ? 1 : 0);
        badge.textContent = String(totalLights);
      }
    }

    // Also update the legacy sceneList if it exists (for compatibility)
    const list = document.getElementById('sceneList');
    if (list) {
      list.innerHTML = '';
      
      // Add ambient light
      if (this.ambientLight) {
        const ambientItem = document.createElement('div');
        ambientItem.className = 'scene-item';
        const intensityPercent = Math.round((this.ambientLight.intensity / 0.5) * 100);
        ambientItem.innerHTML = `<span class="equip-icon" style="color: #64b4ff;">☀</span><span>Omgivelseslys (${intensityPercent}%)</span>`;
        ambientItem.style.cursor = 'pointer';
        ambientItem.addEventListener('click', () => {
          const lightTab = document.querySelector('[data-tab="light"]') as HTMLElement;
          if (lightTab) lightTab.click();
        });
        list.appendChild(ambientItem);
      }
      
      // Add studio lights
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
    
    window.dispatchEvent(new CustomEvent('camera-settings-changed', {
      detail: { ...this.cameraSettings }
    }));
  }

  // Camera Preset Methods (Cam A-E)
  private cameraPresetMeshes: Map<string, BABYLON.Mesh> = new Map();

  public saveCameraPreset(presetId: string): void {
    // Get current slider values
    const distanceSlider = document.getElementById('cameraDistanceSlider') as HTMLInputElement;
    const heightSlider = document.getElementById('cameraHeightSlider') as HTMLInputElement;
    const focalSlider = document.getElementById('focalLengthSlider') as HTMLInputElement;

    const preset = {
      position: this.camera.position.clone(),
      target: this.camera.target.clone(),
      fov: this.camera.fov,
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
      // Additional settings from sliders
      distance: distanceSlider ? parseFloat(distanceSlider.value) : this.camera.radius,
      height: heightSlider ? parseFloat(heightSlider.value) : this.camera.target.y,
      focalLength: focalSlider ? parseFloat(focalSlider.value) : this.cameraSettings.focalLength
    };
    this.cameraPresets.set(presetId, preset);
    this.createCameraMesh(presetId, preset);
    this.updateCameraPresetUI(presetId, true);
    console.log(`Camera preset ${presetId} saved with focal=${preset.focalLength}mm, distance=${preset.distance}m, height=${preset.height}m`);
    
    // CRITICAL: Re-assign RTT settings after preset is saved
    // This ensures monitor camera follows the updated preset position
    this.reassignMonitorRTTSettings(presetId);
  }

  private createCameraMesh(presetId: string, preset: { position: BABYLON.Vector3; target: BABYLON.Vector3; fov: number; alpha: number; beta: number; radius: number }): void {
    // Remove existing mesh if any
    const existing = this.cameraPresetMeshes.get(presetId);
    if (existing) {
      existing.dispose();
    }

    // Create camera body (box)
    const cameraBody = BABYLON.MeshBuilder.CreateBox(`camera-${presetId}-body`, { width: 0.4, height: 0.3, depth: 0.5 }, this.scene);

    // Create lens cylinder
    const lens = BABYLON.MeshBuilder.CreateCylinder(`camera-${presetId}-lens`, { height: 0.25, diameter: 0.2, tessellation: 16 }, this.scene);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.35;
    lens.parent = cameraBody;

    // Create viewfinder (small box on top)
    const viewfinder = BABYLON.MeshBuilder.CreateBox(`camera-${presetId}-vf`, { width: 0.15, height: 0.1, depth: 0.15 }, this.scene);
    viewfinder.position.y = 0.2;
    viewfinder.position.z = -0.1;
    viewfinder.parent = cameraBody;

    // Color based on preset ID
    const colors: { [key: string]: string } = {
      'camA': '#ff4444',
      'camB': '#44ff44',
      'camC': '#4444ff',
      'camD': '#ffff44',
      'camE': '#ff44ff'
    };
    const color = BABYLON.Color3.FromHexString(colors[presetId] || '#ffffff');

    // Create material
    const mat = new BABYLON.StandardMaterial(`camera-${presetId}-mat`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
    mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    mat.emissiveColor = color.scale(0.15);
    cameraBody.material = mat;

    const lensMat = new BABYLON.StandardMaterial(`camera-${presetId}-lens-mat`, this.scene);
    lensMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.12);
    lensMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    lens.material = lensMat;
    viewfinder.material = mat;

    // Add color indicator ring around lens
    const ring = BABYLON.MeshBuilder.CreateTorus(`camera-${presetId}-ring`, { diameter: 0.25, thickness: 0.03, tessellation: 24 }, this.scene);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.48;
    ring.parent = cameraBody;
    const ringMat = new BABYLON.StandardMaterial(`camera-${presetId}-ring-mat`, this.scene);
    ringMat.diffuseColor = color;
    ringMat.emissiveColor = color.scale(0.5);
    ring.material = ringMat;

    // Add label
    const labelPlane = BABYLON.MeshBuilder.CreatePlane(`camera-${presetId}-label`, { width: 0.5, height: 0.15 }, this.scene);
    labelPlane.position.y = 0.4;
    labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    labelPlane.parent = cameraBody;

    const labelTexture = new BABYLON.DynamicTexture(`camera-${presetId}-label-tex`, { width: 128, height: 32 }, this.scene, true);
    const ctx = labelTexture.getContext();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = colors[presetId] || '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(presetId.replace('cam', 'Cam '), 64, 22);
    labelTexture.update();

    const labelMat = new BABYLON.StandardMaterial(`camera-${presetId}-label-mat`, this.scene);
    labelMat.diffuseTexture = labelTexture;
    labelMat.diffuseTexture.hasAlpha = true;
    labelMat.useAlphaFromDiffuseTexture = true;
    labelMat.emissiveTexture = labelTexture;
    labelMat.backFaceCulling = false;
    labelPlane.material = labelMat;

    // Position camera mesh at the camera's position
    cameraBody.position = preset.position.clone();

    // Point camera towards target
    const direction = preset.target.subtract(preset.position).normalize();
    const yaw = Math.atan2(direction.x, direction.z);
    const pitch = -Math.asin(direction.y);
    cameraBody.rotation = new BABYLON.Vector3(pitch, yaw, 0);

    // Store mesh
    this.cameraPresetMeshes.set(presetId, cameraBody);

    // Add to gizmo attachable meshes
    if (this.gizmoManager) {
      const attachables = this.gizmoManager.attachableMeshes || [];
      attachables.push(cameraBody);
      this.gizmoManager.attachableMeshes = attachables;
    }

    // Make camera clickable - single click to select, double click to view
    cameraBody.actionManager = new BABYLON.ActionManager(this.scene);

    // Single click - select camera for editing
    cameraBody.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger,
        () => this.selectCameraPreset(presetId)
      )
    );

    // Double click - switch to camera view
    cameraBody.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnDoublePickTrigger,
        () => this.loadCameraPreset(presetId)
      )
    );
  }

  private selectedCameraPresetId: string | null = null;
  private activeCameraPresetId: string | null = null; // Currently active camera for perspective control

  // Get/Set active camera for perspective controls
  public getActiveCameraPresetId(): string | null {
    return this.activeCameraPresetId;
  }

  public setActiveCameraPreset(presetId: string | null): void {
    // Deactivate previous
    if (this.activeCameraPresetId) {
      const prevBtn = document.querySelector(`.camera-preset-btn[data-preset="${this.activeCameraPresetId}"]`);
      prevBtn?.classList.remove('active-camera');
    }

    this.activeCameraPresetId = presetId;

    // Activate new
    if (presetId) {
      const btn = document.querySelector(`.camera-preset-btn[data-preset="${presetId}"]`);
      btn?.classList.add('active-camera');

      // If camera doesn't have a preset yet, save current position
      if (!this.cameraPresets.get(presetId)) {
        this.saveCameraPreset(presetId);
      }

      // Load the camera preset to view
      this.loadCameraPreset(presetId);
      
      // Ensure RTT is created and configured for this camera
      // This fixes "no signal" issue when opening monitor dialog
      this.reassignMonitorRTTSettings(presetId);

      console.log(`Camera ${presetId} activated for perspective control`);
      
      // Update active indicator in monitor viewports
      document.querySelectorAll('.monitor-active-indicator').forEach(indicator => {
        const indicatorPresetId = (indicator as HTMLElement).getAttribute('data-preset');
        if (indicatorPresetId === presetId) {
          (indicator as HTMLElement).style.display = 'block';
        } else {
          (indicator as HTMLElement).style.display = 'none';
        }
      });
    } else {
      console.log('No camera active for perspective control');
      
      // Hide all active indicators
      document.querySelectorAll('.monitor-active-indicator').forEach(indicator => {
        (indicator as HTMLElement).style.display = 'none';
      });
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('active-camera-changed', {
      detail: { activeCameraId: presetId }
    }));
  }

  public selectCameraPreset(presetId: string): void {
    this.selectedCameraPresetId = presetId;
    const mesh = this.cameraPresetMeshes.get(presetId);

    if (mesh && this.gizmoManager) {
      // Enable position and rotation gizmos
      this.gizmoManager.positionGizmoEnabled = true;
      this.gizmoManager.rotationGizmoEnabled = true;
      this.gizmoManager.attachToMesh(mesh);

      // Show camera control panel
      this.showCameraControlPanel(presetId);
    }

    // Highlight selected camera
    this.cameraPresetMeshes.forEach((m, id) => {
      const ring = this.scene.getMeshByName(`camera-${id}-ring`);
      if (ring && ring.material) {
        const mat = ring.material as BABYLON.StandardMaterial;
        mat.emissiveColor = id === presetId ? mat.diffuseColor : mat.diffuseColor.scale(0.3);
      }
    });

    console.log(`Camera ${presetId} selected for editing`);
  }

  public deselectCameraPreset(): void {
    this.selectedCameraPresetId = null;
    if (this.gizmoManager) {
      this.gizmoManager.attachToMesh(null);
    }
    this.hideCameraControlPanel();
  }

  public updateCameraPresetFromMesh(presetId: string): void {
    const mesh = this.cameraPresetMeshes.get(presetId);
    if (!mesh) return;

    // Calculate target from mesh rotation
    const forward = new BABYLON.Vector3(0, 0, 1);
    const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(mesh.rotation.y, mesh.rotation.x, mesh.rotation.z);
    const direction = BABYLON.Vector3.TransformCoordinates(forward, rotationMatrix);
    const target = mesh.position.add(direction.scale(5)); // Target 5 units in front

    // Update preset
    const preset = {
      position: mesh.position.clone(),
      target: target,
      fov: this.camera.fov,
      alpha: Math.atan2(mesh.position.x - target.x, mesh.position.z - target.z) + Math.PI,
      beta: Math.acos((mesh.position.y - target.y) / mesh.position.subtract(target).length()),
      radius: mesh.position.subtract(target).length()
    };

    this.cameraPresets.set(presetId, preset);
    console.log(`Camera preset ${presetId} updated from mesh position`);
  }

  private showCameraControlPanel(presetId: string): void {
    // Remove existing panel
    this.hideCameraControlPanel();

    const panel = document.createElement('div');
    panel.id = 'cameraControlPanel';
    panel.className = 'camera-control-panel';
    panel.innerHTML = `
      <div class="camera-control-header">
        <span class="camera-control-title">📷 ${presetId.replace('cam', 'Kamera ')}</span>
        <button class="camera-control-close" id="closeCameraControl">✕</button>
      </div>
      <div class="camera-control-body">
        <p class="camera-control-hint">Dra gizmo for å flytte/rotere kameraet</p>
        <div class="camera-control-buttons">
          <button class="camera-control-btn primary" id="updateCameraPresetBtn">
            💾 Lagre posisjon
          </button>
          <button class="camera-control-btn" id="viewFromCameraBtn">
            👁️ Se fra kamera
          </button>
          <button class="camera-control-btn danger" id="deleteCameraPresetBtn">
            🗑️ Slett
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('closeCameraControl')?.addEventListener('click', () => this.deselectCameraPreset());
    document.getElementById('updateCameraPresetBtn')?.addEventListener('click', () => {
      this.updateCameraPresetFromMesh(presetId);
      this.deselectCameraPreset();
    });
    document.getElementById('viewFromCameraBtn')?.addEventListener('click', () => {
      this.loadCameraPreset(presetId);
    });
    document.getElementById('deleteCameraPresetBtn')?.addEventListener('click', () => {
      this.clearCameraPreset(presetId);
      this.deselectCameraPreset();
    });
  }

  private hideCameraControlPanel(): void {
    const existing = document.getElementById('cameraControlPanel');
    if (existing) {
      existing.remove();
    }
  }

  public loadCameraPreset(presetId: string): boolean {
    const preset = this.cameraPresets.get(presetId) as {
      position: BABYLON.Vector3;
      target: BABYLON.Vector3;
      fov: number;
      alpha: number;
      beta: number;
      radius: number;
      distance?: number;
      height?: number;
      focalLength?: number;
    } | null;

    if (!preset) {
      console.log(`Camera preset ${presetId} is empty`);
      return false;
    }

    // Animate to preset position
    const animationDuration = 30; // frames
    const fps = 30;

    // Alpha animation
    const alphaAnim = new BABYLON.Animation('alphaAnim', 'alpha', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    alphaAnim.setKeys([
      { frame: 0, value: this.camera.alpha },
      { frame: animationDuration, value: preset.alpha }
    ]);

    // Beta animation
    const betaAnim = new BABYLON.Animation('betaAnim', 'beta', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    betaAnim.setKeys([
      { frame: 0, value: this.camera.beta },
      { frame: animationDuration, value: preset.beta }
    ]);

    // Radius animation
    const radiusAnim = new BABYLON.Animation('radiusAnim', 'radius', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    radiusAnim.setKeys([
      { frame: 0, value: this.camera.radius },
      { frame: animationDuration, value: preset.radius }
    ]);

    // FOV animation
    const fovAnim = new BABYLON.Animation('fovAnim', 'fov', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    fovAnim.setKeys([
      { frame: 0, value: this.camera.fov },
      { frame: animationDuration, value: preset.fov }
    ]);

    // Add easing
    const easing = new BABYLON.QuadraticEase();
    easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    [alphaAnim, betaAnim, radiusAnim, fovAnim].forEach(a => a.setEasingFunction(easing));

    this.camera.animations = [alphaAnim, betaAnim, radiusAnim, fovAnim];
    this.scene.beginAnimation(this.camera, 0, animationDuration, false, 1, () => {
      this.camera.setTarget(preset.target);
      console.log(`Camera preset ${presetId} loaded`);
    });

    // Update sliders to match preset values
    this.updateSlidersFromPreset(preset);

    // Set this preset as selected (for top view highlighting)
    this.selectedCameraPresetId = presetId;
    
    // CRITICAL: Re-assign RTT settings after preset change to ensure continuous rendering
    // This prevents RTT from becoming stale after preset-switch
    this.reassignMonitorRTTSettings(presetId);

    return true;
  }

  private updateSlidersFromPreset(preset: { distance?: number; height?: number; focalLength?: number }): void {
    // Update distance slider
    const distanceSlider = document.getElementById('cameraDistanceSlider') as HTMLInputElement;
    const distanceValue = document.getElementById('cameraDistanceValue');
    if (distanceSlider && preset.distance !== undefined) {
      distanceSlider.value = preset.distance.toString();
      if (distanceValue) distanceValue.textContent = `${preset.distance.toFixed(1)}m`;
    }

    // Update height slider
    const heightSlider = document.getElementById('cameraHeightSlider') as HTMLInputElement;
    const heightValue = document.getElementById('cameraHeightValue');
    if (heightSlider && preset.height !== undefined) {
      heightSlider.value = preset.height.toString();
      if (heightValue) heightValue.textContent = `${preset.height.toFixed(1)}m`;
    }

    // Update focal length slider
    const focalSlider = document.getElementById('focalLengthSlider') as HTMLInputElement;
    const focalValue = document.getElementById('focalLengthValue');
    if (focalSlider && preset.focalLength !== undefined) {
      focalSlider.value = preset.focalLength.toString();
      if (focalValue) focalValue.textContent = `${preset.focalLength}mm`;

      // Also update internal camera settings
      this.cameraSettings.focalLength = preset.focalLength;

      // Update quick focal display
      const quickFocal = document.getElementById('quickFocal');
      if (quickFocal) quickFocal.textContent = `${preset.focalLength} mm`;

      // Update focal value in camera settings panel
      const focalValueTop = document.getElementById('focalValue');
      if (focalValueTop) focalValueTop.textContent = `${preset.focalLength}mm`;
    }
  }

  public clearCameraPreset(presetId: string): void {
    this.cameraPresets.set(presetId, null);

    // Remove camera mesh from scene
    const mesh = this.cameraPresetMeshes.get(presetId);
    if (mesh) {
      mesh.dispose();
      this.cameraPresetMeshes.delete(presetId);
    }

    this.updateCameraPresetUI(presetId, false);
    console.log(`Camera preset ${presetId} cleared`);
    
    // Note: RTT will continue to exist but will show "no signal" since preset is cleared
    // RTT settings are not cleared here - they remain for when preset is restored
  }

  // Camera angle in degrees (0° = front, 90° = side left, -90° = side right, 180° = back)
  public setCameraAngle(degrees: number, animate: boolean = true): void {
    // Convert degrees to radians
    // In our coordinate system: 0° = looking from front (negative Z), 90° = left (positive X)
    const radians = (degrees * Math.PI) / 180;

    // Calculate new alpha (horizontal rotation)
    // Alpha 0 = camera at positive Z looking at origin
    // We want 0° to be front view (camera at negative Z)
    const newAlpha = radians + Math.PI;

    if (animate) {
      const animDuration = 30; // frames
      const fps = 30;

      const alphaAnim = new BABYLON.Animation('alphaAnim', 'alpha', fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      alphaAnim.setKeys([
        { frame: 0, value: this.camera.alpha },
        { frame: animDuration, value: newAlpha }
      ]);

      const easing = new BABYLON.QuadraticEase();
      easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
      alphaAnim.setEasingFunction(easing);

      this.camera.animations = [alphaAnim];
      this.scene.beginAnimation(this.camera, 0, animDuration, false);
    } else {
      this.camera.alpha = newAlpha;
    }

    console.log(`Camera angle set to ${degrees}°`);
    this.updateCameraAngleDisplay(degrees);
  }

  // Get current camera angle in degrees
  public getCameraAngle(): number {
    // Convert alpha back to degrees (0° = front)
    let degrees = ((this.camera.alpha - Math.PI) * 180) / Math.PI;
    // Normalize to -180 to 180
    while (degrees > 180) degrees -= 360;
    while (degrees < -180) degrees += 360;
    return Math.round(degrees);
  }

  // Set camera height/elevation angle
  public setCameraElevation(degrees: number, animate: boolean = true): void {
    // Beta is the vertical angle: 0 = looking straight down, PI/2 = horizontal, PI = looking up
    // Eye level (0°) = PI/2, high angle (+45°) = lower beta, low angle (-45°) = higher beta
    const radians = (90 - degrees) * Math.PI / 180;
    const newBeta = Math.max(0.1, Math.min(Math.PI - 0.1, radians));

    if (animate) {
      const animDuration = 30;
      const fps = 30;

      const betaAnim = new BABYLON.Animation('betaAnim', 'beta', fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      betaAnim.setKeys([
        { frame: 0, value: this.camera.beta },
        { frame: animDuration, value: newBeta }
      ]);

      const easing = new BABYLON.QuadraticEase();
      easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
      betaAnim.setEasingFunction(easing);

      this.camera.animations = [betaAnim];
      this.scene.beginAnimation(this.camera, 0, animDuration, false);
    } else {
      this.camera.beta = newBeta;
    }

    console.log(`Camera elevation set to ${degrees}°`);
    this.updateCameraElevationDisplay(degrees);
  }

  // Get current camera elevation in degrees
  public getCameraElevation(): number {
    const degrees = 90 - (this.camera.beta * 180 / Math.PI);
    return Math.round(degrees);
  }

  // Predefined camera perspectives - requires active camera
  public setCameraPerspective(perspective: string): boolean {
    // Check if a camera is active
    if (!this.activeCameraPresetId) {
      console.warn('No camera active. Please activate a camera (Cam A-E) first.');
      this.showNoCameraWarning();
      return false;
    }

    const perspectives: { [key: string]: { angle: number; elevation: number; radius?: number } } = {
      'front': { angle: 0, elevation: 0 },
      'side': { angle: 90, elevation: 0 },
      'left': { angle: 90, elevation: 0 },
      'right': { angle: -90, elevation: 0 },
      'back': { angle: 180, elevation: 0 },
      'top': { angle: 0, elevation: 85 },
      'bottom': { angle: 0, elevation: -45 },
      'eyeLevel': { angle: 0, elevation: 0 },
      'highAngle': { angle: 0, elevation: 35 },
      'lowAngle': { angle: 0, elevation: -20 },
      'birdsEye': { angle: 0, elevation: 80 },
      'wormsEye': { angle: 0, elevation: -60 },
      'dutchAngle': { angle: 25, elevation: 5 },
      'overhead': { angle: 0, elevation: 89 },
      '45keyLeft': { angle: 45, elevation: 15 },
      '45keyRight': { angle: -45, elevation: 15 },
      'rimLeft': { angle: 135, elevation: 10 },
      'rimRight': { angle: -135, elevation: 10 }
    };

    const preset = perspectives[perspective];
    if (preset) {
      this.setCameraAngle(preset.angle, true);
      setTimeout(() => {
        this.setCameraElevation(preset.elevation, true);
        // Save the new position to the active camera preset after animation
        setTimeout(() => {
          if (this.activeCameraPresetId) {
            this.saveCameraPreset(this.activeCameraPresetId);
            console.log(`Saved perspective "${perspective}" to ${this.activeCameraPresetId}`);
          }
        }, 1100); // Wait for animation to complete
      }, 100);
      console.log(`Camera perspective: ${perspective} for ${this.activeCameraPresetId}`);
      return true;
    }
    return false;
  }

  private showNoCameraWarning(): void {
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'camera-warning-toast';
    toast.innerHTML = `
      <span style="color:#fbbf24;">⚠️</span>
      <span>Velg et kamera først (Cam A-E)</span>
    `;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(30, 30, 40, 0.95);
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 12px 20px;
      color: white;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 10000;
      animation: fadeInOut 2.5s ease-in-out;
    `;
    document.body.appendChild(toast);

    // Add animation keyframes if not exists
    if (!document.getElementById('camera-warning-style')) {
      const style = document.createElement('style');
      style.id = 'camera-warning-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => toast.remove(), 2500);
  }

  private updateCameraAngleDisplay(degrees: number): void {
    const angleDisplay = document.getElementById('cameraAngleValue');
    if (angleDisplay) {
      angleDisplay.textContent = `${degrees}°`;
    }

    // Update angle slider if exists
    const angleSlider = document.getElementById('cameraAngleSlider') as HTMLInputElement;
    if (angleSlider) {
      angleSlider.value = String(degrees);
    }
  }

  private updateCameraElevationDisplay(degrees: number): void {
    const elevationDisplay = document.getElementById('cameraElevationValue');
    if (elevationDisplay) {
      elevationDisplay.textContent = `${degrees}°`;
    }

    // Update elevation slider if exists
    const elevationSlider = document.getElementById('cameraElevationSlider') as HTMLInputElement;
    if (elevationSlider) {
      elevationSlider.value = String(degrees);
    }
  }

  private updateCameraPresetUI(presetId: string, hasPreset: boolean): void {
    // Update button in Camera & Light panel
    const btn = document.querySelector(`.camera-preset-btn[data-preset="${presetId}"]`);
    if (btn) {
      const statusSpan = btn.querySelector('.camera-preset-status');
      if (statusSpan) {
        statusSpan.textContent = hasPreset ? 'Lagret' : 'Tom';
      }
      btn.classList.toggle('has-preset', hasPreset);
    }

    // Update monitor viewport visibility
    const monitorId = `monitor${presetId.charAt(0).toUpperCase() + presetId.slice(1)}`;
    const monitorViewport = document.getElementById(monitorId);
    if (monitorViewport) {
      monitorViewport.style.display = hasPreset ? 'block' : 'none';
    }
    
    // Update active indicator in monitor viewport
    const activeIndicator = monitorViewport?.querySelector(`.monitor-active-indicator[data-preset="${presetId}"]`) as HTMLElement;
    if (activeIndicator) {
      activeIndicator.style.display = (this.activeCameraPresetId === presetId) ? 'block' : 'none';
    }

    // Update "no cameras saved" empty state in monitor panel
    const monitorEmpty = document.getElementById('monitorEmpty');
    if (monitorEmpty) {
      // Check if any camera presets are saved
      const hasSavedCameras = this.cameraPresets.size > 0;
      monitorEmpty.style.display = hasSavedCameras ? 'none' : 'flex';
    }

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('camera-preset-changed', {
      detail: { presetId, hasPreset, preset: this.cameraPresets.get(presetId) }
    }));
  }


  // Video Recording Methods
  public async startRecording(cameraPresetId?: string): Promise<boolean> {
    if (this.isRecording) {
      console.log('Already recording');
      return false;
    }

    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) {
      console.error('No canvas found');
      return false;
    }

    // If a camera preset is specified, switch to it first
    if (cameraPresetId && this.cameraPresets.get(cameraPresetId)) {
      this.loadCameraPreset(cameraPresetId);
      this.activeRecordingCamera = cameraPresetId;
    }

    try {
      const stream = canvas.captureStream(30); // 30 fps

      // Try to use VP9 codec for better quality, fallback to VP8
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8';

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveRecording();
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // Update UI
      this.updateRecordingUI(true);
      this.startRecordingTimer();

      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  public stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      console.log('Not recording');
      return;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.activeRecordingCamera = null;

    // Update UI
    this.updateRecordingUI(false);
    this.stopRecordingTimer();

    console.log('Recording stopped');
  }

  private saveRecording(): void {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const cameraName = this.activeRecordingCamera || 'main';
    a.download = `creatorhub-studio-${cameraName}-${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Cleanup
    URL.revokeObjectURL(url);
    this.recordedChunks = [];

    console.log('Recording saved');
  }

  private updateRecordingUI(isRecording: boolean): void {
    const startBtn = document.getElementById('startRecordingBtn');
    const stopBtn = document.getElementById('stopRecordingBtn');
    const timerEl = document.getElementById('videoRecordTimer');
    const statusEl = document.getElementById('videoRecordStatus');
    const videoBtn = document.getElementById('videoRecordBtn');

    if (startBtn) startBtn.style.display = isRecording ? 'none' : 'flex';
    if (stopBtn) stopBtn.style.display = isRecording ? 'flex' : 'none';
    if (timerEl) timerEl.style.display = isRecording ? 'flex' : 'none';

    if (statusEl) {
      const indicator = statusEl.querySelector('.record-indicator');
      const text = statusEl.querySelector('.record-status-text');
      if (indicator) indicator.classList.toggle('recording', isRecording);
      if (text) text.textContent = isRecording ? 'Tar opp...' : 'Klar til opptak';
    }

    if (videoBtn) {
      videoBtn.classList.toggle('recording', isRecording);
      const icon = videoBtn.querySelector('.mode-icon');
      if (icon) icon.classList.toggle('recording', isRecording);
    }
  }

  private startRecordingTimer(): void {
    const timerValue = document.getElementById('recordTimerValue');

    this.recordingTimerInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');

      if (timerValue) timerValue.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
  }

  private stopRecordingTimer(): void {
    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;
    }

    const timerValue = document.getElementById('recordTimerValue');
    if (timerValue) timerValue.textContent = '00:00:00';
  }

  public getRecordingState(): { isRecording: boolean; elapsed: number; camera: string | null } {
    return {
      isRecording: this.isRecording,
      elapsed: this.isRecording ? Math.floor((Date.now() - this.recordingStartTime) / 1000) : 0,
      camera: this.activeRecordingCamera
    };
  }

  private recordingArcVisible: boolean = false;
  private selectedRecordingCamera: string = 'main';
  private currentProjectId: string | null = null;
  private currentProjectType: 'casting' | 'studio' | null = null;
  
  private showProjectTypeSelector(): void {
    let dialog = document.getElementById('projectTypeDialog') as HTMLDialogElement;
    
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'projectTypeDialog';
      dialog.className = 'project-type-dialog';
      dialog.innerHTML = `
        <div class="project-type-dialog-content">
          <div class="project-type-dialog-header">
            <h2>Prosjekttype</h2>
            <button class="dialog-close-btn" id="projectTypeDialogClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="project-type-tabs">
            <button class="project-type-tab active" data-tab="new">Nytt prosjekt</button>
            <button class="project-type-tab" data-tab="drafts">Utkast</button>
            <button class="project-type-tab" data-tab="recent">Siste prosjekter</button>
          </div>
          
          <div class="project-type-content" data-content="new">
            <div class="project-type-options">
              <button class="project-type-option" data-type="casting">
                <div class="project-type-icon casting" style="background: transparent; padding: 0;">
                  <img src="/casting-planner-logo.png" alt="Casting Planner" style="width: 56px; height: 56px; object-fit: contain; border-radius: 12px;">
                </div>
                <div class="project-type-info">
                  <h3>Casting Planner</h3>
                  <p>Film- og TV-produksjon med roller, skuespillere, lokasjoner og tidsplaner</p>
                </div>
                <div class="project-type-arrow">→</div>
              </button>
              
              <button class="project-type-option" data-type="studio">
                <div class="project-type-icon studio">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 7l-7 5 7 5V7z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2"/>
                    <circle cx="8" cy="12" r="2"/>
                  </svg>
                </div>
                <div class="project-type-info">
                  <h3>Virtual Studio</h3>
                  <p>3D lyssetting og fotostudio-simulering med profesjonelle verktøy</p>
                </div>
                <div class="project-type-arrow">→</div>
              </button>
            </div>
          </div>
          
          <div class="project-type-content" data-content="drafts" style="display:none;">
            <div class="project-drafts-list" id="projectDraftsList">
              <div class="project-drafts-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p>Ingen utkast funnet</p>
              </div>
            </div>
          </div>
          
          <div class="project-type-content" data-content="recent" style="display:none;">
            <div class="project-recent-list" id="projectRecentList">
              <div class="project-recent-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p>Ingen nylige prosjekter</p>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
      
      this.setupProjectTypeDialogEvents(dialog);
    }
    
    // Load drafts and recent projects
    this.loadProjectDrafts();
    this.loadRecentProjects();
    
    dialog.showModal();
  }
  
  private setupProjectTypeDialogEvents(dialog: HTMLDialogElement): void {
    const closeBtn = dialog.querySelector('#projectTypeDialogClose');
    const tabs = dialog.querySelectorAll('.project-type-tab');
    const typeOptions = dialog.querySelectorAll('.project-type-option');
    
    closeBtn?.addEventListener('click', () => dialog.close());
    
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    
    // Tab switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabName = tab.getAttribute('data-tab');
        dialog.querySelectorAll('.project-type-content').forEach(content => {
          (content as HTMLElement).style.display = 
            content.getAttribute('data-content') === tabName ? 'block' : 'none';
        });
      });
    });
    
    // Project type selection
    typeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const type = option.getAttribute('data-type');
        dialog.close();
        
        if (type === 'casting') {
          // Open Casting Planner with new project
          window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
          window.dispatchEvent(new CustomEvent('casting-new-project'));
          this.currentProjectType = 'casting';
        } else if (type === 'studio') {
          // Create new Virtual Studio project
          this.createNewStudioProject();
          this.currentProjectType = 'studio';
        }
      });
    });
  }
  
  private async loadProjectDrafts(): Promise<void> {
    const listEl = document.getElementById('projectDraftsList');
    if (!listEl) return;
    
    try {
      const response = await fetch('/api/casting/projects');
      const projects = await response.json();
      
      const drafts = projects.filter((p: any) => p.status === 'draft' || !p.status);
      
      if (drafts.length === 0) {
        listEl.innerHTML = `
          <div class="project-drafts-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>Ingen utkast funnet</p>
          </div>
        `;
        return;
      }
      
      listEl.innerHTML = drafts.map((project: any) => `
        <button class="project-draft-item" data-project-id="${project.id}" data-project-type="casting">
          <div class="project-draft-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="project-draft-info">
            <span class="project-draft-name">${project.name || 'Uten navn'}</span>
            <span class="project-draft-date">${new Date(project.updatedAt || project.createdAt).toLocaleDateString('nb-NO')}</span>
          </div>
          <div class="project-draft-type">Casting</div>
        </button>
      `).join('');
      
      // Add click handlers for drafts
      listEl.querySelectorAll('.project-draft-item').forEach(item => {
        item.addEventListener('click', () => {
          const projectId = item.getAttribute('data-project-id');
          const projectType = item.getAttribute('data-project-type');
          
          if (projectId) {
            this.openProject(projectId, projectType as 'casting' | 'studio');
            (document.getElementById('projectTypeDialog') as HTMLDialogElement)?.close();
          }
        });
      });
    } catch (error) {
      console.error('Failed to load project drafts:', error);
    }
  }
  
  private async loadRecentProjects(): Promise<void> {
    const listEl = document.getElementById('projectRecentList');
    if (!listEl) return;
    
    try {
      const response = await fetch('/api/casting/projects');
      const projects = await response.json();
      
      // Sort by updatedAt, most recent first
      const recent = projects
        .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 10);
      
      if (recent.length === 0) {
        listEl.innerHTML = `
          <div class="project-recent-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p>Ingen nylige prosjekter</p>
          </div>
        `;
        return;
      }
      
      listEl.innerHTML = recent.map((project: any) => `
        <button class="project-recent-item" data-project-id="${project.id}" data-project-type="casting">
          <div class="project-recent-icon ${project.status === 'active' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="project-recent-info">
            <span class="project-recent-name">${project.name || 'Uten navn'}</span>
            <span class="project-recent-meta">${project.roles?.length || 0} roller • ${project.candidates?.length || 0} kandidater</span>
          </div>
          <span class="project-recent-date">${new Date(project.updatedAt || project.createdAt).toLocaleDateString('nb-NO')}</span>
        </button>
      `).join('');
      
      // Add click handlers for recent projects
      listEl.querySelectorAll('.project-recent-item').forEach(item => {
        item.addEventListener('click', () => {
          const projectId = item.getAttribute('data-project-id');
          const projectType = item.getAttribute('data-project-type');
          
          if (projectId) {
            this.openProject(projectId, projectType as 'casting' | 'studio');
            (document.getElementById('projectTypeDialog') as HTMLDialogElement)?.close();
          }
        });
      });
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  }
  
  private openProject(projectId: string, type: 'casting' | 'studio'): void {
    this.currentProjectId = projectId;
    this.currentProjectType = type;
    
    if (type === 'casting') {
      // Open Casting Planner and load project
      window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
      window.dispatchEvent(new CustomEvent('casting-load-project', { detail: { projectId } }));
    } else {
      // Load Virtual Studio project
      this.loadStudioProject(projectId);
    }
    
    // Update project name in header
    this.updateProjectNameDisplay(projectId);
  }
  
  private async updateProjectNameDisplay(projectId: string): Promise<void> {
    try {
      const response = await fetch(`/api/casting/projects/${projectId}`);
      if (response.ok) {
        const project = await response.json();
        const nameInput = document.getElementById('projectName') as HTMLInputElement;
        if (nameInput && project.name) {
          nameInput.value = project.name;
        }
      }
    } catch (error) {
      console.error('Failed to update project name:', error);
    }
  }
  
  private createNewStudioProject(): void {
    const projectId = `studio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentProjectId = projectId;
    
    // Reset project name
    const nameInput = document.getElementById('projectName') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = 'NYTT PROSJEKT';
    }
    
    // Clear scene and reset
    this.clearStudio();
    
    this.showNotification('Nytt Virtual Studio prosjekt opprettet', 'success');
  }
  
  private loadStudioProject(projectId: string): void {
    // For now, just set the project ID
    // Future: Load saved scene state from backend
    this.currentProjectId = projectId;
    this.showNotification('Laster prosjekt...', 'info');
  }
  
  private clearStudio(): void {
    // Clear all lights and objects
    this.lights.forEach((_, id) => this.removeLight(id));
    
    // Reset camera
    this.camera.alpha = Math.PI / 4;
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 15;
    this.camera.target = BABYLON.Vector3.Zero();
  }
  
  public getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
  
  public getCurrentProjectType(): 'casting' | 'studio' | null {
    return this.currentProjectType;
  }

  private showRecordingDialog(): void {
    // Check if arc already exists
    let arc = document.getElementById('recordingArc');
    
    if (!arc) {
      // Create the recording arc overlay
      arc = document.createElement('div');
      arc.id = 'recordingArc';
      arc.className = 'recording-arc';
      arc.innerHTML = `
        <div class="recording-arc-content">
          <div class="recording-arc-header">
            <div class="recording-arc-title">
              <div class="rec-indicator"></div>
              <span>Opptak</span>
            </div>
            <div class="recording-arc-timer" id="arcRecordTimer">00:00:00</div>
          </div>
          
          <div class="recording-arc-cameras">
            <button class="arc-camera-btn active" data-camera="main" title="Hovedkamera">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </button>
            <button class="arc-camera-btn" data-camera="camA" title="Kamera A" disabled>A</button>
            <button class="arc-camera-btn" data-camera="camB" title="Kamera B" disabled>B</button>
            <button class="arc-camera-btn" data-camera="camC" title="Kamera C" disabled>C</button>
            <button class="arc-camera-btn" data-camera="camD" title="Kamera D" disabled>D</button>
            <button class="arc-camera-btn" data-camera="all" title="Alle kameraer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
          
          <div class="recording-arc-controls">
            <button class="arc-record-btn" id="arcRecordBtn" title="Start opptak">
              <div class="arc-record-icon"></div>
            </button>
            <button class="arc-close-btn" id="arcCloseBtn" title="Lukk">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      
      // Insert into viewport-container
      const viewport = document.querySelector('.viewport-container') || document.querySelector('.main-viewport') || document.getElementById('renderCanvas')?.parentElement;
      if (viewport) {
        viewport.appendChild(arc);
      } else {
        document.body.appendChild(arc);
      }
      
      // Setup arc event listeners
      this.setupRecordingArcEvents(arc);
    }
    
    // Update camera button states based on saved presets
    this.updateRecordingArcCameras(arc);
    
    // Toggle visibility
    if (this.recordingArcVisible) {
      arc.classList.remove('visible');
      this.recordingArcVisible = false;
    } else {
      arc.classList.add('visible');
      this.recordingArcVisible = true;
    }
  }
  
  private setupRecordingArcEvents(arc: HTMLElement): void {
    const closeBtn = arc.querySelector('#arcCloseBtn');
    const recordBtn = arc.querySelector('#arcRecordBtn');
    const cameraBtns = arc.querySelectorAll('.arc-camera-btn');
    
    // Close handler
    closeBtn?.addEventListener('click', () => {
      arc.classList.remove('visible');
      this.recordingArcVisible = false;
    });
    
    // Camera selection
    cameraBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if ((btn as HTMLButtonElement).disabled) return;
        cameraBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRecordingCamera = btn.getAttribute('data-camera') || 'main';
        
        // If a specific camera is selected, switch view to it
        if (this.selectedRecordingCamera !== 'main' && this.selectedRecordingCamera !== 'all') {
          this.loadCameraPreset(this.selectedRecordingCamera);
        }
      });
    });
    
    // Record button - toggle recording
    recordBtn?.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
        recordBtn.classList.remove('recording');
        arc.classList.remove('is-recording');
        
        // Reset play button
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
          playBtn.classList.remove('recording');
          playBtn.innerHTML = '<span aria-hidden="true">▶</span>';
        }
      } else {
        // Start recording
        recordBtn.classList.add('recording');
        arc.classList.add('is-recording');
        
        // Update play button
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
          playBtn.classList.add('recording');
          playBtn.innerHTML = '<span aria-hidden="true">⏹</span>';
        }
        
        // Start recording with selected camera
        if (this.selectedRecordingCamera === 'all') {
          this.startMultiCameraRecording();
        } else if (this.selectedRecordingCamera === 'main') {
          this.startRecording();
        } else {
          this.startRecording(this.selectedRecordingCamera);
        }
        
        // Start updating arc timer
        this.startArcRecordingTimer();
      }
    });
  }
  
  private updateRecordingArcCameras(arc: HTMLElement): void {
    const cameraBtns = arc.querySelectorAll('.arc-camera-btn[data-camera^="cam"]');
    
    cameraBtns.forEach(btn => {
      const cameraId = btn.getAttribute('data-camera');
      if (cameraId && this.cameraPresets.has(cameraId)) {
        (btn as HTMLButtonElement).disabled = false;
        btn.classList.add('available');
      } else {
        (btn as HTMLButtonElement).disabled = true;
        btn.classList.remove('available');
      }
    });
  }
  
  private arcTimerInterval: number | null = null;
  
  private startArcRecordingTimer(): void {
    const timerEl = document.getElementById('arcRecordTimer');
    
    this.arcTimerInterval = window.setInterval(() => {
      if (!this.isRecording) {
        this.stopArcRecordingTimer();
        return;
      }
      
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      
      if (timerEl) timerEl.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
  }
  
  private stopArcRecordingTimer(): void {
    if (this.arcTimerInterval) {
      clearInterval(this.arcTimerInterval);
      this.arcTimerInterval = null;
    }
    
    const timerEl = document.getElementById('arcRecordTimer');
    if (timerEl) timerEl.textContent = '00:00:00';
    
    // Reset arc UI
    const arc = document.getElementById('recordingArc');
    const recordBtn = arc?.querySelector('#arcRecordBtn');
    if (recordBtn) recordBtn.classList.remove('recording');
    if (arc) arc.classList.remove('is-recording');
  }
  
  private async startMultiCameraRecording(): Promise<void> {
    // Record from all saved camera presets simultaneously
    const savedPresets = Array.from(this.cameraPresets.keys());
    
    if (savedPresets.length === 0) {
      // Just record main view
      this.startRecording();
      return;
    }
    
    // Start recording from main camera
    this.startRecording();
    
    // Show notification about multi-camera recording
    this.showNotification(`Tar opp fra ${savedPresets.length + 1} kameraer`, 'info');
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
        
        // Apply proper PBR shading to all meshes
        this.applyPBRShadingToMeshes(result.meshes);
        
        console.log(`Loaded model "${file.name}" with PBR shading enabled`);
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

  /**
   * Helper function to apply texture maps to PBR material if available
   * Supports: albedo, normal, roughness, metallic, AO, and ORM (packed) textures
   */
  private applyTextureMapsToPBRMaterial(
    material: BABYLON.PBRMaterial,
    textureBasePath: string | null,
    options: {
      albedoTexture?: string;
      normalTexture?: string;
      roughnessTexture?: string;
      metallicTexture?: string;
      aoTexture?: string;
      ormTexture?: string; // ORM = Occlusion (R), Roughness (G), Metallic (B)
    } = {}
  ): void {
    if (!textureBasePath) return;
    
    try {
      // Albedo/BaseColor texture (sRGB)
      if (options.albedoTexture) {
        const albedoTexture = new BABYLON.Texture(`${textureBasePath}/${options.albedoTexture}`, this.scene);
        albedoTexture.gammaSpace = true; // sRGB
        material.albedoTexture = albedoTexture;
      }
      
      // Normal map (linear, non-color)
      if (options.normalTexture) {
        const normalTexture = new BABYLON.Texture(`${textureBasePath}/${options.normalTexture}`, this.scene);
        normalTexture.gammaSpace = false; // Linear
        material.bumpTexture = normalTexture;
        material.normalTexture = normalTexture;
        material.invertNormalMapX = false;
        material.invertNormalMapY = false;
        // Normal strength: 0.6-1.2 range
        material.bumpTexture.level = 1.0;
      }
      
      // ORM texture (packed: R=AO, G=Roughness, B=Metallic)
      if (options.ormTexture) {
        const ormTexture = new BABYLON.Texture(`${textureBasePath}/${options.ormTexture}`, this.scene);
        ormTexture.gammaSpace = false; // Linear
        
        // Use ORM texture for AO, Roughness, and Metallic
        material.ambientTexture = ormTexture;
        material.ambientTexture.hasAlpha = false;
        material.useAmbientInGrayScale = true;
        
        // Roughness from ORM (green channel)
        material.roughnessTexture = ormTexture;
        material.roughnessTexture.getAlphaFromRGB = false;
        
        // Metallic from ORM (blue channel)
        material.metallicTexture = ormTexture;
        material.metallicTexture.getAlphaFromRGB = false;
      } else {
        // Individual textures if ORM is not available
        if (options.roughnessTexture) {
          const roughnessTexture = new BABYLON.Texture(`${textureBasePath}/${options.roughnessTexture}`, this.scene);
          roughnessTexture.gammaSpace = false; // Linear
          material.roughnessTexture = roughnessTexture;
        }
        
        if (options.metallicTexture) {
          const metallicTexture = new BABYLON.Texture(`${textureBasePath}/${options.metallicTexture}`, this.scene);
          metallicTexture.gammaSpace = false; // Linear
          material.metallicTexture = metallicTexture;
        }
        
        if (options.aoTexture) {
          const aoTexture = new BABYLON.Texture(`${textureBasePath}/${options.aoTexture}`, this.scene);
          aoTexture.gammaSpace = false; // Linear
          material.ambientTexture = aoTexture;
          material.useAmbientInGrayScale = true;
        }
      }
      
      // Thickness/SSS mask (optional, for subsurface scattering)
      // Can be added if available: material.subSurface.thicknessTexture
      
    } catch (error) {
      console.warn('Failed to load texture maps:', error);
      // Continue without textures - material will use procedural values
    }
  }

  private createSkinPbrMaterial(materialId: string, skinTone: string): BABYLON.PBRMaterial {
    const pbrMaterial = new BABYLON.PBRMaterial(`${materialId}_pbr_mat`, this.scene);
    const skinColor = BABYLON.Color3.FromHexString(skinTone);
    
    // Base skin properties (PBR workflow)
    pbrMaterial.albedoColor = skinColor;
    pbrMaterial.metallic = 0.0; // Skin is not metallic
    pbrMaterial.roughness = 0.75; // Skin roughness: 0.6-0.9 range, start at 0.75
    pbrMaterial.specularIntensity = 0.3; // Subtle specular highlights
    
    // Subsurface scattering (fake SSS for real-time)
    pbrMaterial.subSurface.isTranslucencyEnabled = true;
    pbrMaterial.subSurface.translucencyIntensity = 0.3; // Moderate translucency
    // Subsurface color - slightly warmer than base skin
    pbrMaterial.subSurface.tintColor = new BABYLON.Color3(
      skinColor.r * 1.1,
      skinColor.g * 0.95,
      skinColor.b * 0.85
    );
    
    // Additional skin properties for realism
    // Wrap lighting (simulated via emissive for warm glow)
    const emissiveIntensity = 0.08; // Reduced for more realistic look
    pbrMaterial.emissiveColor = new BABYLON.Color3(
      skinColor.r * emissiveIntensity,
      skinColor.g * emissiveIntensity * 0.7,
      skinColor.b * emissiveIntensity * 0.5
    );
    
    // Normal map strength (if texture is available, will be set later)
    // For procedural materials, we can use a subtle normal effect
    pbrMaterial.bumpTexture = null; // Will be set if texture available
    
    // AO (Ambient Occlusion) - will be set if texture available
    // For now, use a subtle ambient occlusion effect
    pbrMaterial.ambientTexture = null; // Will be set if texture available
    
    // Enable clearcoat for skin sheen (optional, can be enabled if needed)
    // pbrMaterial.clearCoat.isEnabled = true;
    // pbrMaterial.clearCoat.intensity = 0.1;
    
    return pbrMaterial;
  }

  public addActorToScene(actorId: string): void {
    const state = useAppStore.getState();
    const actorNode = state.getNode(actorId);
    
    if (!actorNode) {
      console.warn('Actor not found in state:', actorId);
      return;
    }

    const userData = actorNode.userData as Record<string, unknown> | undefined;
    const skinTone = (userData?.skinTone as string) || '#EAC086';
    const height = (userData?.height as number) || 175;
    const scaledHeight = height / 100;
    const storedGeometry = userData?.geometry as BABYLON.AbstractMesh | undefined;
    
    const existingMesh = this.scene.getMeshByName(actorId);
    if (existingMesh && existingMesh !== storedGeometry) {
      existingMesh.dispose();
    }

    if (storedGeometry instanceof BABYLON.AbstractMesh && !storedGeometry.isDisposed()) {
      let rootMesh: BABYLON.AbstractMesh = storedGeometry;
      while (rootMesh.parent) {
        rootMesh = rootMesh.parent as BABYLON.AbstractMesh;
      }

      rootMesh.name = actorId;

      const pos = actorNode.transform.position;
      rootMesh.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
      rootMesh.rotation = new BABYLON.Vector3(
        actorNode.transform.rotation[0],
        actorNode.transform.rotation[1],
        actorNode.transform.rotation[2]
      );
      rootMesh.scaling = new BABYLON.Vector3(
        actorNode.transform.scale[0],
        actorNode.transform.scale[1],
        actorNode.transform.scale[2]
      );

      const storedMaterial = userData?.material as BABYLON.Material | undefined;
      const bodyMaterial = storedMaterial instanceof BABYLON.Material
        ? storedMaterial
        : this.createSkinPbrMaterial(actorId, skinTone);

      const meshes = rootMesh.getChildMeshes(true);
      if (rootMesh instanceof BABYLON.Mesh) {
        meshes.push(rootMesh);
      }

      meshes.forEach(mesh => {
        if (!mesh.material) {
          mesh.material = bodyMaterial;
        }
        mesh.receiveShadows = true;
        mesh.castShadows = true;
        
        this.lights.forEach((lightData) => {
          if (lightData.shadowGenerator) {
            lightData.shadowGenerator.addShadowCaster(mesh);
          }
        });
      });

      const groundedPosition = this.positionMeshOnGround(rootMesh, rootMesh.position.clone());
      rootMesh.position = groundedPosition;
      rootMesh.computeWorldMatrix(true);

      this.addEyesToMesh(rootMesh, actorId);

      const groundedAfterEyes = this.positionMeshOnGround(rootMesh, groundedPosition.clone());
      rootMesh.position = groundedAfterEyes;
      rootMesh.computeWorldMatrix(true);

      this.updateSceneList();
      console.log('Actor added to 3D scene with cached geometry:', actorId);
      return;
    }

    const capsule = BABYLON.MeshBuilder.CreateCapsule(actorId, {
      height: scaledHeight,
      radius: scaledHeight * 0.125,
      tessellation: 16,
      subdivisions: 4
    }, this.scene);

    const pos = actorNode.transform.position;
    capsule.position = new BABYLON.Vector3(pos[0], pos[1] + scaledHeight / 2, pos[2]);

    // Character Material Stack: PBRMaterial with subsurface scattering for realistic skin
    const pbrMaterial = this.createSkinPbrMaterial(actorId, skinTone);
    
    // Enable shadows
    capsule.receiveShadows = true;
    capsule.castShadows = true;
    
    capsule.material = pbrMaterial;
    
    // Add to all existing shadow generators
    this.lights.forEach((lightData) => {
      if (lightData.shadowGenerator) {
        lightData.shadowGenerator.addShadowCaster(capsule);
      }
    });
    
    // Add eyes to the actor
    this.addEyesToActor(capsule, scaledHeight, skinTone);

    this.updateSceneList();
    console.log('Actor added to 3D scene with PBR skin material:', actorId);
  }
  
  private addEyesToMesh(targetMesh: BABYLON.AbstractMesh, name: string): void {
    const existingEyes = targetMesh.getChildMeshes(true).some(mesh =>
      mesh.name.includes('_leftEye') || mesh.name.includes('_rightEye')
    );
    if (existingEyes || (targetMesh.metadata as { hasGeneratedEyes?: boolean } | undefined)?.hasGeneratedEyes) {
      return;
    }

    const safeName = name || targetMesh.name || 'actor';
    targetMesh.computeWorldMatrix(true);

    // Find the head area (top ~22% of the model) and add eyes there.
    const worldBoundingInfo = targetMesh.getHierarchyBoundingVectors(true); // World space before eyes
    const worldModelHeight = worldBoundingInfo.max.y - worldBoundingInfo.min.y;
    if (!isFinite(worldModelHeight) || worldModelHeight <= 0) {
      console.warn(`Invalid model height for ${safeName}, skipping eye generation.`);
      return;
    }
    
    const worldBoundsMin = worldBoundingInfo.min;
    const worldBoundsMax = worldBoundingInfo.max;
    const worldBoundsCenter = worldBoundsMin.add(worldBoundsMax).scale(0.5);
    const basisOrigin = worldBoundsCenter.clone();
    
    const worldMatrix = targetMesh.getWorldMatrix();
    const invWorld = worldMatrix.clone().invert();
    
    let upWorld = BABYLON.Vector3.TransformNormal(BABYLON.Axis.Y, worldMatrix);
    if (!isFinite(upWorld.length()) || upWorld.lengthSquared() < 1e-6) {
      upWorld = new BABYLON.Vector3(0, 1, 0);
    }
    upWorld.normalize();
    if (BABYLON.Vector3.Dot(upWorld, BABYLON.Axis.Y) < 0) {
      upWorld.scaleInPlace(-1);
    }
    
    let forwardWorld = BABYLON.Vector3.TransformNormal(BABYLON.Axis.Z, worldMatrix);
    if (!isFinite(forwardWorld.length()) || forwardWorld.lengthSquared() < 1e-6) {
      forwardWorld = new BABYLON.Vector3(0, 0, 1);
    }
    forwardWorld.normalize();
    
    let rightWorld = BABYLON.Vector3.Cross(upWorld, forwardWorld);
    if (rightWorld.lengthSquared() < 1e-6 || !isFinite(rightWorld.length())) {
      rightWorld = BABYLON.Vector3.TransformNormal(BABYLON.Axis.X, worldMatrix);
      if (!isFinite(rightWorld.length()) || rightWorld.lengthSquared() < 1e-6) {
        rightWorld = new BABYLON.Vector3(1, 0, 0);
      }
    }
    rightWorld.normalize();
    
    const boundsCorners = [
      new BABYLON.Vector3(worldBoundsMin.x, worldBoundsMin.y, worldBoundsMin.z),
      new BABYLON.Vector3(worldBoundsMin.x, worldBoundsMin.y, worldBoundsMax.z),
      new BABYLON.Vector3(worldBoundsMin.x, worldBoundsMax.y, worldBoundsMin.z),
      new BABYLON.Vector3(worldBoundsMin.x, worldBoundsMax.y, worldBoundsMax.z),
      new BABYLON.Vector3(worldBoundsMax.x, worldBoundsMin.y, worldBoundsMin.z),
      new BABYLON.Vector3(worldBoundsMax.x, worldBoundsMin.y, worldBoundsMax.z),
      new BABYLON.Vector3(worldBoundsMax.x, worldBoundsMax.y, worldBoundsMin.z),
      new BABYLON.Vector3(worldBoundsMax.x, worldBoundsMax.y, worldBoundsMax.z),
    ];
    
    let modelUpMin = Number.POSITIVE_INFINITY;
    let modelUpMax = Number.NEGATIVE_INFINITY;
    boundsCorners.forEach(corner => {
      const relX = corner.x - basisOrigin.x;
      const relY = corner.y - basisOrigin.y;
      const relZ = corner.z - basisOrigin.z;
      const upDot = relX * upWorld.x + relY * upWorld.y + relZ * upWorld.z;
      modelUpMin = Math.min(modelUpMin, upDot);
      modelUpMax = Math.max(modelUpMax, upDot);
    });
    const modelUpHeight = Math.max(modelUpMax - modelUpMin, 0.001);
    const headSampleMinUp = modelUpMax - modelUpHeight * 0.22;
    const torsoSampleMinUp = modelUpMin + modelUpHeight * 0.35;
    const torsoSampleMaxUp = modelUpMin + modelUpHeight * 0.75;
    
    const headBoundsMin = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const headBoundsMax = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    const headSamplePositions: BABYLON.Vector3[] = [];
    let headSamples = 0;
    let torsoSamples = 0;
    let torsoMeanU = 0;
    let torsoMeanV = 0;
    let torsoCovUU = 0;
    let torsoCovUV = 0;
    let torsoCovVV = 0;
    
    const upAxisDot = Math.abs(BABYLON.Vector3.Dot(upWorld, BABYLON.Axis.Y));
    let planeSeed = upAxisDot > 0.8 ? BABYLON.Axis.X : BABYLON.Axis.Y;
    let planeU = BABYLON.Vector3.Cross(upWorld, planeSeed);
    if (planeU.lengthSquared() < 1e-6 || !isFinite(planeU.length())) {
      planeSeed = BABYLON.Axis.Z;
      planeU = BABYLON.Vector3.Cross(upWorld, planeSeed);
    }
    if (planeU.lengthSquared() < 1e-6 || !isFinite(planeU.length())) {
      planeU = rightWorld.clone();
    }
    planeU.normalize();
    
    let planeV = BABYLON.Vector3.Cross(upWorld, planeU);
    if (planeV.lengthSquared() < 1e-6 || !isFinite(planeV.length())) {
      planeV = BABYLON.Vector3.Cross(upWorld, rightWorld);
    }
    if (planeV.lengthSquared() < 1e-6 || !isFinite(planeV.length())) {
      planeV = new BABYLON.Vector3(0, 0, 1);
    }
    planeV.normalize();
    
    const headSampleMeshes = targetMesh.getChildMeshes(true);
    if (targetMesh instanceof BABYLON.Mesh) {
      headSampleMeshes.push(targetMesh);
    }
    
    const tempWorld = new BABYLON.Vector3();
    headSampleMeshes.forEach(mesh => {
      if (!(mesh instanceof BABYLON.Mesh)) return;
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      if (!positions || positions.length < 3) return;
      
      const vertexCount = positions.length / 3;
      const step = Math.max(1, Math.floor(vertexCount / 5000));
      const meshWorld = mesh.getWorldMatrix();
      
      for (let v = 0; v < vertexCount; v += step) {
        const idx = v * 3;
        const x = positions[idx];
        const y = positions[idx + 1];
        const z = positions[idx + 2];
        if (x === undefined || y === undefined || z === undefined) continue;
        
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, meshWorld, tempWorld);
        const relX = tempWorld.x - basisOrigin.x;
        const relY = tempWorld.y - basisOrigin.y;
        const relZ = tempWorld.z - basisOrigin.z;
        const upDot = relX * upWorld.x + relY * upWorld.y + relZ * upWorld.z;
        if (!isFinite(upDot)) continue;
        
        if (upDot >= torsoSampleMinUp && upDot <= torsoSampleMaxUp) {
          const u = relX * planeU.x + relY * planeU.y + relZ * planeU.z;
          const v = relX * planeV.x + relY * planeV.y + relZ * planeV.z;
          torsoSamples++;
          const du = u - torsoMeanU;
          const dv = v - torsoMeanV;
          torsoMeanU += du / torsoSamples;
          torsoMeanV += dv / torsoSamples;
          torsoCovUU += du * (u - torsoMeanU);
          torsoCovUV += du * (v - torsoMeanV);
          torsoCovVV += dv * (v - torsoMeanV);
        }
        
        if (upDot < headSampleMinUp) continue;
        
        headBoundsMin.x = Math.min(headBoundsMin.x, tempWorld.x);
        headBoundsMin.y = Math.min(headBoundsMin.y, tempWorld.y);
        headBoundsMin.z = Math.min(headBoundsMin.z, tempWorld.z);
        headBoundsMax.x = Math.max(headBoundsMax.x, tempWorld.x);
        headBoundsMax.y = Math.max(headBoundsMax.y, tempWorld.y);
        headBoundsMax.z = Math.max(headBoundsMax.z, tempWorld.z);
        headSamples++;
        headSamplePositions.push(new BABYLON.Vector3(relX, relY, relZ));
      }
    });
    
    if (torsoSamples > 20) {
      const a = torsoCovUU / torsoSamples;
      const b = torsoCovUV / torsoSamples;
      const c = torsoCovVV / torsoSamples;
      const trace = a + c;
      const det = a * c - b * b;
      const disc = Math.sqrt(Math.max(trace * trace * 0.25 - det, 0));
      const lambda1 = trace * 0.5 + disc;
      let evU = 1;
      let evV = 0;
      
      if (Math.abs(b) > 1e-6 || Math.abs(a - c) > 1e-6) {
        const x = b;
        const y = lambda1 - a;
        if (Math.abs(x) + Math.abs(y) > 1e-6) {
          const len = Math.hypot(x, y);
          evU = x / len;
          evV = y / len;
        } else if (a < c) {
          evU = 0;
          evV = 1;
        }
      } else if (a < c) {
        evU = 0;
        evV = 1;
      }
      
      const candidateRight = planeU.scale(evU).add(planeV.scale(evV));
      if (candidateRight.lengthSquared() > 1e-6 && isFinite(candidateRight.length())) {
        rightWorld = candidateRight.normalize();
        forwardWorld = BABYLON.Vector3.Cross(rightWorld, upWorld);
        if (!isFinite(forwardWorld.length()) || forwardWorld.lengthSquared() < 1e-6) {
          forwardWorld = BABYLON.Vector3.TransformNormal(BABYLON.Axis.Z, worldMatrix);
        }
        if (!isFinite(forwardWorld.length()) || forwardWorld.lengthSquared() < 1e-6) {
          forwardWorld = new BABYLON.Vector3(0, 0, 1);
        }
        forwardWorld.normalize();
      }
    }
    
    const headCenterWorld = headSamples > 0
      ? headBoundsMin.add(headBoundsMax).scale(0.5)
      : worldBoundsCenter;
    if (this.camera) {
      const toCamera = this.camera.position.subtract(headCenterWorld);
      const planarDir = toCamera.subtract(upWorld.scale(BABYLON.Vector3.Dot(toCamera, upWorld)));
      if (planarDir.lengthSquared() > 1e-6) {
        planarDir.normalize();
        if (BABYLON.Vector3.Dot(forwardWorld, planarDir) < 0) {
          forwardWorld.scaleInPlace(-1);
        }
      }
    }
    
    rightWorld = BABYLON.Vector3.Cross(upWorld, forwardWorld);
    if (rightWorld.lengthSquared() < 1e-6 || !isFinite(rightWorld.length())) {
      rightWorld = planeU.clone();
    }
    rightWorld.normalize();
    forwardWorld = BABYLON.Vector3.Cross(rightWorld, upWorld);
    if (forwardWorld.lengthSquared() < 1e-6 || !isFinite(forwardWorld.length())) {
      forwardWorld = BABYLON.Vector3.TransformNormal(BABYLON.Axis.Z, worldMatrix);
    }
    if (!isFinite(forwardWorld.length()) || forwardWorld.lengthSquared() < 1e-6) {
      forwardWorld = new BABYLON.Vector3(0, 0, 1);
    }
    forwardWorld.normalize();
    
    let headRightMin = Number.POSITIVE_INFINITY;
    let headRightMax = Number.NEGATIVE_INFINITY;
    let headUpMin = Number.POSITIVE_INFINITY;
    let headUpMax = Number.NEGATIVE_INFINITY;
    let headForwardMin = Number.POSITIVE_INFINITY;
    let headForwardMax = Number.NEGATIVE_INFINITY;
    
    headSamplePositions.forEach(sample => {
      const rightDot = BABYLON.Vector3.Dot(sample, rightWorld);
      const upDot = BABYLON.Vector3.Dot(sample, upWorld);
      const forwardDot = BABYLON.Vector3.Dot(sample, forwardWorld);
      headRightMin = Math.min(headRightMin, rightDot);
      headRightMax = Math.max(headRightMax, rightDot);
      headUpMin = Math.min(headUpMin, upDot);
      headUpMax = Math.max(headUpMax, upDot);
      headForwardMin = Math.min(headForwardMin, forwardDot);
      headForwardMax = Math.max(headForwardMax, forwardDot);
    });
    
    const useHeadBounds = headSamples > 20 &&
      isFinite(headRightMin) && isFinite(headRightMax) &&
      isFinite(headUpMin) && isFinite(headUpMax) &&
      isFinite(headForwardMin) && isFinite(headForwardMax);
    
    let fallbackRightMin = Number.POSITIVE_INFINITY;
    let fallbackRightMax = Number.NEGATIVE_INFINITY;
    let fallbackUpMin = Number.POSITIVE_INFINITY;
    let fallbackUpMax = Number.NEGATIVE_INFINITY;
    let fallbackForwardMin = Number.POSITIVE_INFINITY;
    let fallbackForwardMax = Number.NEGATIVE_INFINITY;
    
    boundsCorners.forEach(corner => {
      const relX = corner.x - basisOrigin.x;
      const relY = corner.y - basisOrigin.y;
      const relZ = corner.z - basisOrigin.z;
      const rightDot = relX * rightWorld.x + relY * rightWorld.y + relZ * rightWorld.z;
      const upDot = relX * upWorld.x + relY * upWorld.y + relZ * upWorld.z;
      const forwardDot = relX * forwardWorld.x + relY * forwardWorld.y + relZ * forwardWorld.z;
      fallbackRightMin = Math.min(fallbackRightMin, rightDot);
      fallbackRightMax = Math.max(fallbackRightMax, rightDot);
      fallbackUpMin = Math.min(fallbackUpMin, upDot);
      fallbackUpMax = Math.max(fallbackUpMax, upDot);
      fallbackForwardMin = Math.min(fallbackForwardMin, forwardDot);
      fallbackForwardMax = Math.max(fallbackForwardMax, forwardDot);
    });
    
    let rightMin = useHeadBounds ? headRightMin : fallbackRightMin;
    let rightMax = useHeadBounds ? headRightMax : fallbackRightMax;
    const upMin = useHeadBounds ? headUpMin : fallbackUpMin;
    const upMax = useHeadBounds ? headUpMax : fallbackUpMax;
    let forwardMin = useHeadBounds ? headForwardMin : fallbackForwardMin;
    let forwardMax = useHeadBounds ? headForwardMax : fallbackForwardMax;
    
    if (Math.abs(forwardMin) > Math.abs(forwardMax)) {
      forwardWorld.scaleInPlace(-1);
      const oldMin = forwardMin;
      forwardMin = -forwardMax;
      forwardMax = -oldMin;
    }
    
    const rawHeadHeight = Math.max(upMax - upMin, 0.001);
    const minHeadHeight = modelUpHeight * 0.12;
    const maxHeadHeight = modelUpHeight * 0.28;
    const headHeight = Math.min(Math.max(rawHeadHeight, minHeadHeight), maxHeadHeight);
    const eyeUp = upMax - headHeight * 0.35;
    
    const rawHeadWidth = Math.max(rightMax - rightMin, 0.001);
    const rawHeadDepth = Math.max(forwardMax - forwardMin, 0.001);
    const minHeadWidth = modelUpHeight * 0.1;
    const maxHeadWidth = modelUpHeight * 0.25;
    const minHeadDepth = modelUpHeight * 0.08;
    const maxHeadDepth = modelUpHeight * 0.22;
    const headWidth = Math.min(Math.max(rawHeadWidth, minHeadWidth), maxHeadWidth);
    const headDepth = Math.min(Math.max(rawHeadDepth, minHeadDepth), maxHeadDepth);
    
    // Size/space eyes relative to head bounds
    const eyeRadius = Math.max(headHeight * 0.06, headWidth * 0.04, 0.01);
    let eyeSpacing = Math.max(headWidth * 0.32, eyeRadius * 2.6, 0.055);
    if (headWidth > 0.1) {
      eyeSpacing = Math.min(eyeSpacing, headWidth * 0.6);
    }
    
    const depthInset = Math.max(eyeRadius * 0.8, headDepth * 0.1);
    const eyeCenterForward = forwardMax - depthInset;
    const eyeCenterRight = (rightMin + rightMax) / 2;
    const worldEyeCenter = basisOrigin.add(rightWorld.scale(eyeCenterRight))
      .add(upWorld.scale(eyeUp))
      .add(forwardWorld.scale(eyeCenterForward));
    const worldLeftEye = worldEyeCenter.add(rightWorld.scale(-eyeSpacing / 2));
    const worldRightEye = worldEyeCenter.add(rightWorld.scale(eyeSpacing / 2));
    
    let leftLocal = BABYLON.Vector3.TransformCoordinates(worldLeftEye, invWorld);
    let rightLocal = BABYLON.Vector3.TransformCoordinates(worldRightEye, invWorld);
    
    if (!isFinite(leftLocal.x) || !isFinite(leftLocal.y) || !isFinite(leftLocal.z) ||
        !isFinite(rightLocal.x) || !isFinite(rightLocal.y) || !isFinite(rightLocal.z)) {
      console.warn(`Invalid eye parameters for ${safeName}, using fallback values.`);
      leftLocal = new BABYLON.Vector3(-eyeSpacing / 2, worldModelHeight * 0.85, eyeRadius * 2);
      rightLocal = new BABYLON.Vector3(eyeSpacing / 2, worldModelHeight * 0.85, eyeRadius * 2);
    }
    
    let forwardLocal = BABYLON.Vector3.TransformNormal(forwardWorld, invWorld);
    forwardLocal.y = 0;
    if (forwardLocal.lengthSquared() < 1e-6 || !isFinite(forwardLocal.length())) {
      forwardLocal = new BABYLON.Vector3(0, 0, 1);
    }
    forwardLocal.normalize();
    
    // Create left eye - make it more visible
    const leftEye = BABYLON.MeshBuilder.CreateSphere(`${safeName}_leftEye`, {
      diameter: eyeRadius * 2,
      segments: 16
    }, this.scene);
    leftEye.position = leftLocal;
    leftEye.parent = targetMesh;
    leftEye.isVisible = true;
    leftEye.setEnabled(true);
    
    // Create right eye - make it more visible
    const rightEye = BABYLON.MeshBuilder.CreateSphere(`${safeName}_rightEye`, {
      diameter: eyeRadius * 2,
      segments: 16
    }, this.scene);
    rightEye.position = rightLocal;
    rightEye.parent = targetMesh;
    rightEye.isVisible = true;
    rightEye.setEnabled(true);
    
    // Eye Material Stack: PBRMaterial for sclera/iris (opaque)
    const scleraIrisMaterial = new BABYLON.PBRMaterial(`${safeName}_sclera_iris_mat`, this.scene);
    scleraIrisMaterial.albedoColor = new BABYLON.Color3(0.98, 0.96, 0.94); // Warm white, not chalk white
    scleraIrisMaterial.metallic = 0.0;
    scleraIrisMaterial.roughness = 0.4; // Eyes have moderate roughness (0.2-0.6 range)
    scleraIrisMaterial.specularIntensity = 0.2;
    
    const irisMaterial = new BABYLON.PBRMaterial(`${safeName}_iris_mat`, this.scene);
    irisMaterial.albedoColor = new BABYLON.Color3(0.5, 0.3, 0.2); // Brown iris
    irisMaterial.metallic = 0.0;
    irisMaterial.roughness = 0.5;
    irisMaterial.specularIntensity = 0.15;
    
    const pupilMaterial = new BABYLON.PBRMaterial(`${safeName}_pupil_mat`, this.scene);
    pupilMaterial.albedoColor = new BABYLON.Color3(0.0, 0.0, 0.0); // Pure black
    pupilMaterial.metallic = 0.0;
    pupilMaterial.roughness = 0.1; // Very low roughness for depth
    pupilMaterial.specularIntensity = 0.0;
    
    leftEye.material = scleraIrisMaterial;
    rightEye.material = scleraIrisMaterial;
    
    // Add iris and pupil - make them visible
    const irisOffset = forwardLocal.scale(eyeRadius * 0.7);
    const pupilOffset = forwardLocal.scale(eyeRadius * 0.75);
    const corneaOffset = forwardLocal.scale(eyeRadius * 0.1);
    
    const leftIris = BABYLON.MeshBuilder.CreateSphere(`${safeName}_leftIris`, {
      diameter: eyeRadius * 1.6,
      segments: 16
    }, this.scene);
    leftIris.position = irisOffset.clone();
    leftIris.parent = leftEye;
    leftIris.material = irisMaterial;
    leftIris.isVisible = true;
    leftIris.setEnabled(true);
    
    const leftPupil = BABYLON.MeshBuilder.CreateSphere(`${safeName}_leftPupil`, {
      diameter: eyeRadius * 0.6,
      segments: 12
    }, this.scene);
    leftPupil.position = pupilOffset.clone();
    leftPupil.parent = leftEye;
    leftPupil.material = pupilMaterial;
    leftPupil.isVisible = true;
    leftPupil.setEnabled(true);
    
    const rightIris = BABYLON.MeshBuilder.CreateSphere(`${safeName}_rightIris`, {
      diameter: eyeRadius * 1.6,
      segments: 16
    }, this.scene);
    rightIris.position = irisOffset.clone();
    rightIris.parent = rightEye;
    rightIris.material = irisMaterial;
    rightIris.isVisible = true;
    rightIris.setEnabled(true);
    
    const rightPupil = BABYLON.MeshBuilder.CreateSphere(`${safeName}_rightPupil`, {
      diameter: eyeRadius * 0.6,
      segments: 12
    }, this.scene);
    rightPupil.position = pupilOffset.clone();
    rightPupil.parent = rightEye;
    rightPupil.material = pupilMaterial;
    rightPupil.isVisible = true;
    rightPupil.setEnabled(true);
    
    // Cornea Material Stack: Transparent PBRMaterial with IOR
    // Left cornea
    const leftCornea = BABYLON.MeshBuilder.CreateSphere(`${safeName}_leftCornea`, {
      diameter: eyeRadius * 2.1,
      segments: 24
    }, this.scene);
    leftCornea.position = corneaOffset.clone();
    leftCornea.parent = leftEye;
    
    const leftCorneaMaterial = new BABYLON.PBRMaterial(`${safeName}_leftCornea_mat`, this.scene);
    leftCorneaMaterial.albedoColor = new BABYLON.Color3(1.0, 1.0, 1.0);
    leftCorneaMaterial.metallic = 0.0;
    leftCorneaMaterial.roughness = 0.05; // Very low roughness for glossy cornea
    leftCorneaMaterial.specularIntensity = 1.0;
    leftCorneaMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    leftCorneaMaterial.alpha = 0.15;
    leftCorneaMaterial.indexOfRefraction = 1.376; // Cornea IOR
    leftCorneaMaterial.useRefraction = true;
    leftCorneaMaterial.refractionIntensity = 0.1;
    leftCorneaMaterial.environmentIntensity = 1.0;
    
    leftCornea.material = leftCorneaMaterial;
    leftCornea.isVisible = true;
    leftCornea.setEnabled(true);
    leftCornea.castShadows = false; // Cornea doesn't cast shadows (transparent)
    
    // Right cornea
    const rightCornea = BABYLON.MeshBuilder.CreateSphere(`${safeName}_rightCornea`, {
      diameter: eyeRadius * 2.1,
      segments: 24
    }, this.scene);
    rightCornea.position = corneaOffset.clone();
    rightCornea.parent = rightEye;
    
    const rightCorneaMaterial = new BABYLON.PBRMaterial(`${safeName}_rightCornea_mat`, this.scene);
    rightCorneaMaterial.albedoColor = new BABYLON.Color3(1.0, 1.0, 1.0);
    rightCorneaMaterial.metallic = 0.0;
    rightCorneaMaterial.roughness = 0.05;
    rightCorneaMaterial.specularIntensity = 1.0;
    rightCorneaMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    rightCorneaMaterial.alpha = 0.15;
    rightCorneaMaterial.indexOfRefraction = 1.376;
    rightCorneaMaterial.useRefraction = true;
    rightCorneaMaterial.refractionIntensity = 0.1;
    rightCorneaMaterial.environmentIntensity = 1.0;
    
    rightCornea.material = rightCorneaMaterial;
    rightCornea.isVisible = true;
    rightCornea.setEnabled(true);
    rightCornea.castShadows = false; // Cornea doesn't cast shadows (transparent)
    
    // Enable shadows for eyes (but not cornea)
    leftEye.receiveShadows = true;
    leftEye.castShadows = true;
    rightEye.receiveShadows = true;
    rightEye.castShadows = true;
    
    // Add to shadow generators
    this.lights.forEach((lightData) => {
      if (lightData.shadowGenerator) {
        lightData.shadowGenerator.addShadowCaster(leftEye);
        lightData.shadowGenerator.addShadowCaster(rightEye);
      }
    });
    
    // Force compute world matrix to ensure eyes are positioned correctly
    targetMesh.computeWorldMatrix(true);
    leftEye.computeWorldMatrix(true);
    rightEye.computeWorldMatrix(true);
    
    console.log(`Added eyes to character model: ${safeName}`, {
      eyeRadius: eyeRadius.toFixed(4),
      eyeSpacing: eyeSpacing.toFixed(4),
      eyeYLocal: leftLocal.y.toFixed(4),
      eyeZLocal: leftLocal.z.toFixed(4),
      leftEyePos: leftEye.position,
      rightEyePos: rightEye.position,
      worldBoundingInfo: worldBoundingInfo,
      meshWorldPos: targetMesh.getAbsolutePosition()
    });

    if (!targetMesh.metadata) {
      targetMesh.metadata = {};
    }
    (targetMesh.metadata as { hasGeneratedEyes?: boolean }).hasGeneratedEyes = true;
  }

  private addEyesToActor(capsule: BABYLON.Mesh, height: number, skinTone: string): void {
    // Eye dimensions - make them more visible
    // Capsule radius is height * 0.125
    const capsuleRadius = height * 0.125;
    const eyeRadius = capsuleRadius * 0.15; // Eye radius ~15% of capsule radius (more visible)
    const eyeSpacing = capsuleRadius * 0.6; // Distance between eyes
    // Eyes are at top of capsule - capsule center is at height/2, so top is at height
    // But we need to account for capsule's position offset
    const eyeHeight = height * 0.85; // Eyes at ~85% of height (upper face area)
    // Position eyes on the surface of the capsule (at capsule radius)
    const eyeDepth = capsuleRadius * 1.05; // Slightly forward from capsule surface
    
    // Create left eye (sclera/iris ball)
    const leftEye = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_leftEye`, {
      diameter: eyeRadius * 2,
      segments: 24 // Higher quality for better appearance
    }, this.scene);
    leftEye.position = new BABYLON.Vector3(-eyeSpacing / 2, eyeHeight, eyeDepth);
    leftEye.parent = capsule;
    
    // Create right eye (sclera/iris ball)
    const rightEye = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_rightEye`, {
      diameter: eyeRadius * 2,
      segments: 24 // Higher quality for better appearance
    }, this.scene);
    rightEye.position = new BABYLON.Vector3(eyeSpacing / 2, eyeHeight, eyeDepth);
    rightEye.parent = capsule;
    
    // Eye Material Stack: PBRMaterial for sclera/iris (opaque)
    // Sclera/Iris material (PBR opaque)
    const scleraIrisMaterial = new BABYLON.PBRMaterial(`${capsule.name}_sclera_iris_mat`, this.scene);
    // Sclera color - not pure white, slightly warm/grey tones look more realistic
    scleraIrisMaterial.albedoColor = new BABYLON.Color3(0.98, 0.96, 0.94); // Warm white, not chalk white
    scleraIrisMaterial.metallic = 0.0; // Eyes are not metallic
    scleraIrisMaterial.roughness = 0.4; // Eyes have moderate roughness (0.2-0.6 range)
    scleraIrisMaterial.specularIntensity = 0.2; // Subtle specular
    // Normal map (if available) - very subtle for eyes
    scleraIrisMaterial.bumpTexture = null;
    
    // Iris material (will be applied to iris submesh)
    const irisMaterial = new BABYLON.PBRMaterial(`${capsule.name}_iris_mat`, this.scene);
    irisMaterial.albedoColor = new BABYLON.Color3(0.5, 0.3, 0.2); // Brown iris (can be customized)
    irisMaterial.metallic = 0.0;
    irisMaterial.roughness = 0.5; // Iris has slightly more roughness than sclera
    irisMaterial.specularIntensity = 0.15;
    
    // Pupil material (black, very low roughness for depth)
    const pupilMaterial = new BABYLON.PBRMaterial(`${capsule.name}_pupil_mat`, this.scene);
    pupilMaterial.albedoColor = new BABYLON.Color3(0.0, 0.0, 0.0); // Pure black
    pupilMaterial.metallic = 0.0;
    pupilMaterial.roughness = 0.1; // Very low roughness for depth
    pupilMaterial.specularIntensity = 0.0;
    
    // Apply sclera material to eyes
    leftEye.material = scleraIrisMaterial;
    rightEye.material = scleraIrisMaterial;
    
    // Create iris and pupil as child meshes on the eye surface
    // Left iris - use a sphere that's slightly smaller and positioned forward
    const leftIris = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_leftIris`, {
      diameter: eyeRadius * 1.6,
      segments: 16
    }, this.scene);
    leftIris.position = new BABYLON.Vector3(0, 0, eyeRadius * 0.7);
    leftIris.parent = leftEye;
    leftIris.material = irisMaterial;
    leftIris.isVisible = true;
    leftIris.setEnabled(true);
    
    // Left pupil - smaller sphere in center
    const leftPupil = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_leftPupil`, {
      diameter: eyeRadius * 0.6,
      segments: 12
    }, this.scene);
    leftPupil.position = new BABYLON.Vector3(0, 0, eyeRadius * 0.75);
    leftPupil.parent = leftEye;
    leftPupil.material = pupilMaterial;
    leftPupil.isVisible = true;
    leftPupil.setEnabled(true);
    
    // Right iris
    const rightIris = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_rightIris`, {
      diameter: eyeRadius * 1.6,
      segments: 16
    }, this.scene);
    rightIris.position = new BABYLON.Vector3(0, 0, eyeRadius * 0.7);
    rightIris.parent = rightEye;
    rightIris.material = irisMaterial;
    rightIris.isVisible = true;
    rightIris.setEnabled(true);
    
    // Right pupil
    const rightPupil = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_rightPupil`, {
      diameter: eyeRadius * 0.6,
      segments: 12
    }, this.scene);
    rightPupil.position = new BABYLON.Vector3(0, 0, eyeRadius * 0.75);
    rightPupil.parent = rightEye;
    rightPupil.material = pupilMaterial;
    rightPupil.isVisible = true;
    rightPupil.setEnabled(true);
    
    // Cornea Material Stack: Transparent PBRMaterial with IOR (Index of Refraction)
    // Cornea is a separate "shell" mesh that sits on top of the eye
    // Left cornea - transparent dome over the eye
    const leftCornea = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_leftCornea`, {
      diameter: eyeRadius * 2.1, // Slightly larger than eye ball
      segments: 24
    }, this.scene);
    leftCornea.position = new BABYLON.Vector3(0, 0, eyeRadius * 0.1); // Slightly forward
    leftCornea.parent = leftEye;
    
    const leftCorneaMaterial = new BABYLON.PBRMaterial(`${capsule.name}_leftCornea_mat`, this.scene);
    leftCorneaMaterial.albedoColor = new BABYLON.Color3(1.0, 1.0, 1.0); // White base
    leftCorneaMaterial.metallic = 0.0;
    leftCorneaMaterial.roughness = 0.05; // Very low roughness (0.02-0.08 range) for glossy cornea
    leftCorneaMaterial.specularIntensity = 1.0; // High specular for highlights
    
    // Transparency and IOR (Index of Refraction) for cornea
    leftCorneaMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    leftCorneaMaterial.alpha = 0.15; // Mostly transparent (0.15 opacity)
    leftCorneaMaterial.indexOfRefraction = 1.376; // Cornea IOR ≈ 1.376
    
    // Enable refraction if supported
    leftCorneaMaterial.useRefraction = true;
    leftCorneaMaterial.refractionIntensity = 0.1; // Subtle refraction
    
    // Environment reflection for cornea highlights
    leftCorneaMaterial.environmentIntensity = 1.0;
    
    leftCornea.material = leftCorneaMaterial;
    leftCornea.isVisible = true;
    leftCornea.setEnabled(true);
    
    // Right cornea
    const rightCornea = BABYLON.MeshBuilder.CreateSphere(`${capsule.name}_rightCornea`, {
      diameter: eyeRadius * 2.1,
      segments: 24
    }, this.scene);
    rightCornea.position = new BABYLON.Vector3(0, 0, eyeRadius * 0.1);
    rightCornea.parent = rightEye;
    
    const rightCorneaMaterial = new BABYLON.PBRMaterial(`${capsule.name}_rightCornea_mat`, this.scene);
    rightCorneaMaterial.albedoColor = new BABYLON.Color3(1.0, 1.0, 1.0);
    rightCorneaMaterial.metallic = 0.0;
    rightCorneaMaterial.roughness = 0.05;
    rightCorneaMaterial.specularIntensity = 1.0;
    rightCorneaMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    rightCorneaMaterial.alpha = 0.15;
    rightCorneaMaterial.indexOfRefraction = 1.376;
    rightCorneaMaterial.useRefraction = true;
    rightCorneaMaterial.refractionIntensity = 0.1;
    rightCorneaMaterial.environmentIntensity = 1.0;
    
    rightCornea.material = rightCorneaMaterial;
    rightCornea.isVisible = true;
    rightCornea.setEnabled(true);
    rightCornea.castShadows = false; // Cornea doesn't cast shadows (transparent)
    
    // Enable shadows for eyes (but not cornea)
    leftEye.receiveShadows = true;
    leftEye.castShadows = true;
    rightEye.receiveShadows = true;
    rightEye.castShadows = true;
    
    // Add eyes to shadow generators
    this.lights.forEach((lightData) => {
      if (lightData.shadowGenerator) {
        lightData.shadowGenerator.addShadowCaster(leftEye);
        lightData.shadowGenerator.addShadowCaster(rightEye);
      }
    });
    
    // Debug logging
    console.log(`Added eyes to actor ${capsule.name}:`, {
      eyeRadius,
      eyeSpacing,
      eyeHeight,
      eyeDepth,
      leftEyePos: leftEye.position,
      rightEyePos: rightEye.position,
      capsulePos: capsule.position,
      capsuleHeight: height
    });
  }
}



window.addEventListener('DOMContentLoaded', () => {
  // Mount Loading Overlay first
  const loadingRoot = document.getElementById('loading-overlay-root');
  if (loadingRoot) {
    const loadingReactRoot = createRoot(loadingRoot);
    loadingReactRoot.render(React.createElement(LoadingOverlay));
  }

  // Start loading state
  const { startLoading, updateProgress, setSceneInitialized, stopLoading } = useLoadingStore.getState();
  startLoading('initializing', 'Initialiserer Virtual Studio...', 0);

  // Safety timeout - ensure loading never gets stuck (10 seconds max)
  const safetyTimeout = setTimeout(() => {
    console.warn('Loading safety timeout triggered - forcing initialization complete');
    setSceneInitialized(true);
    stopLoading();
  }, 10000);

  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (canvas) {
    updateProgress(30, 'Laster 3D-motor...');
    const studio = new VirtualStudio(canvas);
    window.virtualStudio = studio;
    updateProgress(70, 'Konfigurerer scene...');

    focusController.init();

    // ========================================
    // DRAG & DROP PREVIEW SYSTEM
    // ========================================
    const viewport3d = document.getElementById('viewport3d');
    const dropZone = document.getElementById('viewportDropZone');
    const dragPreview = document.getElementById('dragPreview');
    const dragPreviewThumb = document.getElementById('dragPreviewThumb') as HTMLImageElement;
    const dragPreviewTitle = document.getElementById('dragPreviewTitle');
    
    let currentDragAsset: any = null;
    let ghostMesh: BABYLON.Mesh | null = null;
    
    // Create ghost mesh for placement preview
    const createGhostMesh = () => {
      if (ghostMesh) {
        ghostMesh.dispose();
      }
      ghostMesh = BABYLON.MeshBuilder.CreateBox('ghostMesh', { size: 0.5 }, studio.scene);
      const ghostMaterial = new BABYLON.StandardMaterial('ghostMaterial', studio.scene);
      ghostMaterial.diffuseColor = new BABYLON.Color3(0.18, 0.91, 1); // Cyan
      ghostMaterial.alpha = 0.5;
      ghostMaterial.emissiveColor = new BABYLON.Color3(0.18, 0.91, 1);
      ghostMesh.material = ghostMaterial;
      ghostMesh.isPickable = false;
      ghostMesh.visibility = 0.6;
      return ghostMesh;
    };
    
    // Update ghost mesh position based on raycast
    const updateGhostPosition = (e: DragEvent) => {
      if (!ghostMesh || !studio.scene) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      
      // Create pick ray
      const pickResult = studio.scene.pick(x, y, (mesh) => {
        return mesh.name === 'floor' || mesh.name === 'ground' || mesh.name.includes('floor');
      });
      
      if (pickResult?.hit && pickResult.pickedPoint) {
        ghostMesh.position = pickResult.pickedPoint.clone();
        ghostMesh.position.y = 0.25; // Slight offset above floor
        ghostMesh.setEnabled(true);
      } else {
        // Fallback: place at camera target with raycast to ground plane
        const ray = studio.scene.createPickingRay(x, y, BABYLON.Matrix.Identity(), studio.camera);
        const groundPlane = BABYLON.Plane.FromPositionAndNormal(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up());
        const distance = ray.intersectsPlane(groundPlane);
        
        if (distance !== null && distance > 0) {
          const hitPoint = ray.origin.add(ray.direction.scale(distance));
          ghostMesh.position = hitPoint;
          ghostMesh.position.y = 0.25;
          ghostMesh.setEnabled(true);
        }
      }
    };
    
    // Handle drag start anywhere in document (capture asset data)
    document.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      if (!target || !e.dataTransfer) return;
      
      // Check if drag contains asset data
      setTimeout(() => {
        try {
          const data = e.dataTransfer?.getData('application/json');
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.asset) {
              currentDragAsset = parsed.asset;
              
              // Show drag preview
              if (dragPreview && dragPreviewThumb && dragPreviewTitle) {
                dragPreviewThumb.src = parsed.asset.thumbUrl || '/library/generic.png';
                dragPreviewTitle.textContent = parsed.asset.title || 'Asset';
              }
            }
          }
        } catch (err) {
          // Not a valid asset drag
        }
      }, 0);
    });
    
    // Update preview position on drag
    document.addEventListener('drag', (e) => {
      if (!currentDragAsset || !dragPreview) return;
      
      if (e.clientX > 0 && e.clientY > 0) {
        dragPreview.style.left = `${e.clientX + 20}px`;
        dragPreview.style.top = `${e.clientY + 20}px`;
        dragPreview.classList.add('active');
      }
    });
    
    // Handle drag over viewport
    if (viewport3d && dropZone) {
      viewport3d.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (currentDragAsset) {
          dropZone.classList.add('active');
          
          // Create and update ghost mesh
          if (!ghostMesh) {
            createGhostMesh();
          }
          updateGhostPosition(e);
        }
      });
      
      viewport3d.addEventListener('dragleave', (e) => {
        // Only hide if leaving viewport entirely
        const rect = viewport3d.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
          dropZone.classList.remove('active');
          if (ghostMesh) {
            ghostMesh.setEnabled(false);
          }
        }
      });
      
      viewport3d.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        dropZone.classList.remove('active');
        
        if (currentDragAsset && ghostMesh) {
          const position = ghostMesh.position.clone();
          
          // Dispatch event to add asset at position
          const event = new CustomEvent('ch-add-asset-at', {
            detail: {
              asset: currentDragAsset,
              position: [position.x, position.y, position.z]
            }
          });
          window.dispatchEvent(event);
          
          console.log('Asset dropped at position:', position.x, position.y, position.z);
        }
        
        // Clean up
        if (ghostMesh) {
          ghostMesh.dispose();
          ghostMesh = null;
        }
        currentDragAsset = null;
        if (dragPreview) {
          dragPreview.classList.remove('active');
        }
      });
    }
    
    // Clean up on drag end
    document.addEventListener('dragend', () => {
      currentDragAsset = null;
      if (dragPreview) {
        dragPreview.classList.remove('active');
      }
      if (dropZone) {
        dropZone.classList.remove('active');
      }
      if (ghostMesh) {
        ghostMesh.dispose();
        ghostMesh = null;
      }
    });

    // Mark scene as initialized after short delay
    updateProgress(100, 'Klar!');
    setTimeout(() => {
      clearTimeout(safetyTimeout);
      setSceneInitialized(true);
      stopLoading();
    }, 300);

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
    
    // Hook up visibility toggle and color picker for individual walls
    const wallIds = ['backWall', 'leftWall', 'rightWall', 'rearWall'];
    wallIds.forEach(wallId => {
      const wallItem = document.querySelector(`.hierarchy-item[data-id="${wallId}"]`);
      if (wallItem) {
        // Visibility toggle
        const visibilityBtn = wallItem.querySelector('.wall-visibility') as HTMLElement;
        if (visibilityBtn) {
          visibilityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = visibilityBtn.classList.toggle('active');
            visibilityBtn.setAttribute('aria-pressed', String(isActive));
            visibilityBtn.setAttribute('title', isActive ? 'Synlig' : 'Skjult');
            window.dispatchEvent(new CustomEvent('ch-toggle-wall', { detail: { wallId, visible: isActive } }));
          });
        }

        // Color picker
        const colorPicker = wallItem.querySelector('.wall-color') as HTMLInputElement;
        if (colorPicker) {
          colorPicker.addEventListener('input', (e) => {
            e.stopPropagation();
            const color = (e.target as HTMLInputElement).value;
            window.dispatchEvent(new CustomEvent('ch-set-wall-color', { detail: { wallId, color } }));
          });
        }
      }
    });
    
    // Hook up visibility toggle for Gulv (floor)
    const studioFloorItem = document.querySelector('.hierarchy-item[data-id="studio-floor"]');
    if (studioFloorItem) {
      const visibilityBtn = studioFloorItem.querySelector('.visibility-btn');
      if (visibilityBtn) {
        visibilityBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isActive = visibilityBtn.classList.toggle('active');
          visibilityBtn.setAttribute('aria-pressed', String(isActive));
          visibilityBtn.setAttribute('title', isActive ? 'Synlig' : 'Skjult');
          window.dispatchEvent(new CustomEvent('ch-toggle-floor', { detail: { visible: isActive } }));
        });
      }
      
      // Floor color picker
      const floorColorPicker = document.getElementById('floorColorPicker') as HTMLInputElement;
      if (floorColorPicker) {
        floorColorPicker.addEventListener('input', (e) => {
          e.stopPropagation();
          const color = (e.target as HTMLInputElement).value;
          window.dispatchEvent(new CustomEvent('ch-set-floor-color', { detail: { color } }));
        });
      }
    }
    
    const actorPanelRoot = document.getElementById('actorPanelRoot');
    const actorBottomPanel = document.getElementById('actorBottomPanel');
    const actorPanelTrigger = document.getElementById('actorPanelTrigger');
    const actorTab = document.getElementById('actorTab');
    
    console.log('Studio Library elements:', { actorPanelRoot: !!actorPanelRoot, actorBottomPanel: !!actorBottomPanel, actorPanelTrigger: !!actorPanelTrigger });
    
    const keyframeTimelineRoot = document.getElementById('keyframeTimelineRoot');
    if (keyframeTimelineRoot) {
      const timelineRoot = createRoot(keyframeTimelineRoot);
      timelineRoot.render(React.createElement(TidslinjeLibraryPanelApp, {}));
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
    
    const scenerPanelRoot = document.getElementById('scenerPanelRoot');
    if (scenerPanelRoot) {
      const scenerRoot = createRoot(scenerPanelRoot);
      scenerRoot.render(React.createElement(ScenerPanelApp, {}));
    }
    
    const notesPanelRoot = document.getElementById('notesPanelRoot');
    if (notesPanelRoot) {
      const notesRoot = createRoot(notesPanelRoot);
      notesRoot.render(React.createElement(NotesPanelApp, {}));
    }
    
    // Mount Cinematography Patterns App
    const cinematographyRoot = document.getElementById('cinematographyPatternsRoot');
    if (cinematographyRoot) {
      const cineRoot = createRoot(cinematographyRoot);
      cineRoot.render(React.createElement(CinematographyPatternsApp, {}));
    }
    
    // Mount Light Pattern Library App
    const lightPatternRoot = document.getElementById('lightPatternLibraryRoot');
    if (lightPatternRoot) {
      const lpRoot = createRoot(lightPatternRoot);
      lpRoot.render(React.createElement(LightPatternLibraryApp, {}));
    }
    
    // Mount Avatar Generator App
    const avatarGenRoot = document.getElementById('avatarGeneratorRoot');
    if (avatarGenRoot) {
      const avRoot = createRoot(avatarGenRoot);
      avRoot.render(React.createElement(AvatarGeneratorApp, {}));
    }

    // Mount Marketplace Panel App
    const marketplacePanelRoot = document.getElementById('marketplacePanelRoot');
    if (marketplacePanelRoot) {
      const marketplaceRoot = createRoot(marketplacePanelRoot);
      marketplaceRoot.render(React.createElement(MarketplacePanelApp, {}));
      console.log('MarketplacePanelApp mounted');
    } else {
      console.error('marketplacePanelRoot element not found!');
    }

    // Mount AI Assistant Panel App
    const aiAssistantPanelRoot = document.getElementById('aiAssistantPanelRoot');
    if (aiAssistantPanelRoot) {
      const aiRoot = createRoot(aiAssistantPanelRoot);
      aiRoot.render(React.createElement(AIAssistantApp, {}));
      console.log('AIAssistantApp mounted');
    } else {
      console.error('aiAssistantPanelRoot element not found!');
    }

    // Mount Casting Planner Panel App
    const castingPlannerPanelRoot = document.getElementById('castingPlannerPanelRoot');
    if (castingPlannerPanelRoot) {
      const castingRoot = createRoot(castingPlannerPanelRoot);
      castingRoot.render(React.createElement(CastingPlannerApp, {}));
      console.log('CastingPlannerApp mounted');
    } else {
      console.error('castingPlannerPanelRoot element not found!');
    }

    // Mount Scene Composer Panel App
    const sceneComposerRoot = document.getElementById('sceneComposerRoot');
    if (sceneComposerRoot) {
      const sceneComposerReactRoot = createRoot(sceneComposerRoot);
      sceneComposerReactRoot.render(React.createElement(SceneComposerPanelApp, {}));
      console.log('SceneComposerPanelApp mounted');
    } else {
      console.error('sceneComposerRoot element not found!');
    }

    // Mount Animation Composer Panel App
    const animationComposerRoot = document.getElementById('animationComposerRoot');
    if (animationComposerRoot) {
      const animationComposerReactRoot = createRoot(animationComposerRoot);
      animationComposerReactRoot.render(React.createElement(AnimationComposerApp, {}));
      console.log('AnimationComposerApp mounted');
    } else {
      console.error('animationComposerRoot element not found!');
    }

    // Mount Panel Creator App
    const panelCreatorRoot = document.getElementById('panelCreatorRoot');
    if (panelCreatorRoot) {
      const panelCreatorReactRoot = createRoot(panelCreatorRoot);
      panelCreatorReactRoot.render(React.createElement(PanelCreator));
      console.log('PanelCreator mounted');
    } else {
      console.error('panelCreatorRoot element not found!');
    }

    // Render installed tools in the left panel
    const renderInstalledTools = () => {
      const container = document.getElementById('installedToolsContainer');
      if (!container) {
        console.error('installedToolsContainer not found');
        return;
      }

      const tools = marketplaceService.getInstalledTools();
      console.log('Rendering installed tools:', tools.length);

      container.innerHTML = '';

      tools.forEach(tool => {
        if (!tool.toolConfig) return;

        const button = document.createElement('button');
        button.className = 'actor-panel-trigger installed-tool-trigger';
        button.id = `tool-trigger-${tool.id}`;
        button.setAttribute('aria-expanded', 'false');
        button.style.marginBottom = '4px';

        const content = document.createElement('div');
        content.className = 'library-trigger-content';
        content.style.padding = '12px 18px';

        const icon = document.createElement('div');
        icon.className = 'library-icon';
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.backgroundImage = `url("${tool.toolConfig.icon}")`;
        icon.style.backgroundSize = 'contain';
        icon.style.backgroundRepeat = 'no-repeat';
        icon.setAttribute('aria-hidden', 'true');

        const name = document.createElement('span');
        name.textContent = tool.name;
        name.style.fontSize = '14px';

        const arrow = document.createElement('span');
        arrow.className = 'library-arrow';
        arrow.textContent = '+';
        arrow.setAttribute('aria-hidden', 'true');

        content.appendChild(icon);
        content.appendChild(name);
        content.appendChild(arrow);
        button.appendChild(content);
        container.appendChild(button);

        // Add click handler based on panel component
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const panelComponent = tool.toolConfig?.panelComponent;
          console.log('Tool clicked:', tool.name, 'Panel:', panelComponent);

          if (panelComponent === 'AIAssistantPanel') {
            window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
          } else if (panelComponent === 'CastingPlannerPanel') {
            window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
          } else {
            // Generic toggle for other panels
            window.dispatchEvent(new CustomEvent(`toggle-plugin-${tool.id}-panel`));
          }
        });
      });
    };

    // Initial render of installed tools
    renderInstalledTools();

    // Listen for changes to installed tools
    window.addEventListener('installed-tools-changed', () => {
      console.log('Installed tools changed, re-rendering...');
      renderInstalledTools();
    });

    // Setup Camera Controls (Touch-friendly overlay)
    const cameraControlBtn = document.getElementById('cameraControlBtn');
    const cameraControlsPanel = document.getElementById('cameraControlsPanel');
    const cameraControlsClose = document.getElementById('cameraControlsClose');

    // Toggle function for camera controls panel (panels stay visible)
    const toggleCameraControls = () => {
      if (!cameraControlsPanel) return;
      const isVisible = cameraControlsPanel.style.display !== 'none';
      // #region agent log
      fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15357',message:'toggleCameraControls called',data:{isVisible,currentDisplay:cameraControlsPanel.style.display},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (isVisible) {
        cameraControlsPanel.style.display = 'none';
        cameraControlBtn?.classList.remove('active');
        // #region agent log
        fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15362',message:'Panel hidden via toggle',data:{displayAfter:cameraControlsPanel.style.display},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } else {
        cameraControlsPanel.style.display = 'block';
        cameraControlBtn?.classList.add('active');
        // #region agent log
        fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15366',message:'Panel shown via toggle',data:{displayAfter:cameraControlsPanel.style.display},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    };

    // Bind camera button
    cameraControlBtn?.addEventListener('click', toggleCameraControls);

    // Direct click handler for close button (most reliable)
    if (cameraControlsClose) {
      // #region agent log
      fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15374',message:'Close button found, attaching handler',data:{buttonExists:!!cameraControlsClose,panelExists:!!cameraControlsPanel},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      cameraControlsClose.addEventListener('click', (e) => {
        // #region agent log
        fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15376',message:'Close button clicked',data:{targetId:(e.target as HTMLElement)?.id,currentTargetId:(e.currentTarget as HTMLElement)?.id,panelDisplayBefore:cameraControlsPanel?.style.display},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent any other handlers from running
        if (cameraControlsPanel) {
          // Use setProperty with important to ensure it takes precedence
          cameraControlsPanel.style.setProperty('display', 'none', 'important');
          // #region agent log
          fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15380',message:'Panel hidden after close click',data:{panelDisplayAfter:cameraControlsPanel.style.display,computedDisplay:window.getComputedStyle(cameraControlsPanel).display},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
        cameraControlBtn?.classList.remove('active');
        return false; // Additional safeguard
      });
    } else {
      // #region agent log
      fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15374',message:'Close button NOT found',data:{buttonExists:false},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // Also use event delegation as fallback for close button (with lower priority)
    if (cameraControlsPanel) {
      cameraControlsPanel.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#cameraControlsClose') || target.id === 'cameraControlsClose') {
          // Only handle if direct handler didn't already process it
          if (cameraControlsPanel.style.display !== 'none') {
            e.preventDefault();
            e.stopPropagation();
            cameraControlsPanel.style.setProperty('display', 'none', 'important');
            cameraControlBtn?.classList.remove('active');
          }
        }
      }, { capture: false }); // Use bubbling phase, not capture
    }
    
    if (cameraControlsPanel) {
      // Speed multiplier state
      let speedMultiplier = 1;
      const baseOrbitStep = 0.02;
      const baseZoomStep = 0.1;
      const basePanStep = 0.05;
      const updateInterval = 30; // ms between updates when holding
      
      // Active interval for continuous movement
      let activeInterval: number | null = null;
      
      // Speed button handlers
      const speedButtons = document.querySelectorAll('.speed-btn');
      speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          speedButtons.forEach(b => {
            (b as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
            (b as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
            b.classList.remove('active');
          });
          (btn as HTMLElement).style.background = 'rgba(0,212,255,0.3)';
          (btn as HTMLElement).style.borderColor = '#00d4ff';
          btn.classList.add('active');
          speedMultiplier = parseFloat((btn as HTMLElement).dataset.speed || '1');
        });
      });
      
      // Camera action functions
      const cameraActions: { [key: string]: () => void } = {
        orbitUp: () => {
          const camera = studio.getCamera();
          if (camera) camera.beta = Math.max(0.1, camera.beta - baseOrbitStep * speedMultiplier);
        },
        orbitDown: () => {
          const camera = studio.getCamera();
          if (camera) camera.beta = Math.min(Math.PI - 0.1, camera.beta + baseOrbitStep * speedMultiplier);
        },
        orbitLeft: () => {
          const camera = studio.getCamera();
          if (camera) camera.alpha -= baseOrbitStep * speedMultiplier;
        },
        orbitRight: () => {
          const camera = studio.getCamera();
          if (camera) camera.alpha += baseOrbitStep * speedMultiplier;
        },
        zoomIn: () => {
          const camera = studio.getCamera();
          if (camera) camera.radius = Math.max(1, camera.radius - baseZoomStep * speedMultiplier);
        },
        zoomOut: () => {
          const camera = studio.getCamera();
          if (camera) camera.radius = Math.min(30, camera.radius + baseZoomStep * speedMultiplier);
        },
        panUp: () => {
          const target = studio.getCameraTarget();
          studio.setCameraTarget(new BABYLON.Vector3(target.x, target.y + basePanStep * speedMultiplier, target.z));
        },
        panDown: () => {
          const target = studio.getCameraTarget();
          studio.setCameraTarget(new BABYLON.Vector3(target.x, target.y - basePanStep * speedMultiplier, target.z));
        },
        panLeft: () => {
          const target = studio.getCameraTarget();
          studio.setCameraTarget(new BABYLON.Vector3(target.x - basePanStep * speedMultiplier, target.y, target.z));
        },
        panRight: () => {
          const target = studio.getCameraTarget();
          studio.setCameraTarget(new BABYLON.Vector3(target.x + basePanStep * speedMultiplier, target.y, target.z));
        }
      };
      
      // Start continuous movement
      const startAction = (action: string, btn: HTMLElement) => {
        if (activeInterval) return;
        btn.style.background = 'rgba(0,212,255,0.4)';
        btn.style.borderColor = '#00d4ff';
        cameraActions[action]?.();
        activeInterval = window.setInterval(() => {
          cameraActions[action]?.();
        }, updateInterval);
      };
      
      // Stop continuous movement
      const stopAction = (btn: HTMLElement) => {
        if (activeInterval) {
          clearInterval(activeInterval);
          activeInterval = null;
        }
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.borderColor = 'rgba(255,255,255,0.2)';
      };
      
      // Bind control buttons with hold-to-move
      const controlButtons = document.querySelectorAll('.cam-ctrl-btn');
      controlButtons.forEach(btn => {
        const action = (btn as HTMLElement).dataset.action;
        if (!action) return;
        
        // Mouse events
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          startAction(action, btn as HTMLElement);
        });
        btn.addEventListener('mouseup', () => stopAction(btn as HTMLElement));
        btn.addEventListener('mouseleave', () => stopAction(btn as HTMLElement));
        
        // Touch events
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          startAction(action, btn as HTMLElement);
        }, { passive: false });
        btn.addEventListener('touchend', () => stopAction(btn as HTMLElement));
        btn.addEventListener('touchcancel', () => stopAction(btn as HTMLElement));
      });
      
      // Reset camera
      document.getElementById('resetCamera')?.addEventListener('click', () => {
        studio.resetCamera();
        // Reset sliders to default values
        const distanceSlider = document.getElementById('cameraDistanceSlider') as HTMLInputElement;
        const heightSlider = document.getElementById('cameraHeightSlider') as HTMLInputElement;
        const focalSlider = document.getElementById('focalLengthSlider') as HTMLInputElement;
        const distanceValue = document.getElementById('cameraDistanceValue');
        const heightValue = document.getElementById('cameraHeightValue');
        const focalValue = document.getElementById('focalLengthValue');
        if (distanceSlider) {
          distanceSlider.value = '25';
          if (distanceValue) distanceValue.textContent = '25m';
        }
        if (heightSlider) {
          heightSlider.value = '1.5';
          if (heightValue) heightValue.textContent = '1.5m';
        }
        if (focalSlider) {
          focalSlider.value = '50';
          if (focalValue) focalValue.textContent = '50mm';
        }
      });

      // Camera Perspective Buttons (Front, Side, Top, etc.)
      document.querySelectorAll('.camera-angle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const angle = (btn as HTMLElement).dataset.angle;
          if (angle) {
            studio.setCameraPerspective(angle);
            // Highlight active button
            document.querySelectorAll('.camera-angle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        });
      });

      // Photographic angles toggle (collapsible section)
      const photographicToggle = document.getElementById('photographicAnglesToggle');
      const photographicContent = document.getElementById('photographicAnglesContent');
      if (photographicToggle && photographicContent) {
        photographicToggle.addEventListener('click', () => {
          const isOpen = photographicContent.style.display !== 'none';
          photographicContent.style.display = isOpen ? 'none' : 'block';
          const icon = photographicToggle.querySelector('.collapsible-icon');
          if (icon) icon.textContent = isOpen ? '▼' : '▲';
        });
      }

      // Camera Distance Slider
      const cameraDistanceSlider = document.getElementById('cameraDistanceSlider') as HTMLInputElement;
      const cameraDistanceValue = document.getElementById('cameraDistanceValue');

      // Camera Height Slider
      const cameraHeightSlider = document.getElementById('cameraHeightSlider') as HTMLInputElement;
      const cameraHeightValue = document.getElementById('cameraHeightValue');

      // Focal Length Slider
      const focalLengthSlider = document.getElementById('focalLengthSlider') as HTMLInputElement;
      const focalLengthValue = document.getElementById('focalLengthValue');

      // Get studio instance (must be defined before use)
      const studio = (window as any).virtualStudio as VirtualStudio;
      
      // Function to sync sliders with current camera state
      const syncCameraSliders = () => {
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (!studioInstance) return;
        const camera = studioInstance.getCamera();
        if (camera && cameraDistanceSlider) {
          const clampedRadius = Math.min(50, Math.max(3, camera.radius));
          cameraDistanceSlider.value = String(clampedRadius);
          if (cameraDistanceValue) cameraDistanceValue.textContent = `${clampedRadius.toFixed(1)}m`;
        }
        // Use camera's actual Y position for height (reflects orbit changes)
        if (camera && cameraHeightSlider) {
          const cameraHeight = camera.position.y;
          const clampedHeight = Math.min(10, Math.max(0, cameraHeight));
          cameraHeightSlider.value = String(clampedHeight);
          if (cameraHeightValue) cameraHeightValue.textContent = `${clampedHeight.toFixed(1)}m`;
        }
        // Sync focal length from camera FOV
        if (camera && focalLengthSlider) {
          // FOV = (50 / focalLength) * 0.8, so focalLength = 50 * 0.8 / FOV = 40 / FOV
          const focalFromFOV = Math.round(40 / camera.fov);
          const clampedFocal = Math.min(400, Math.max(14, focalFromFOV));
          focalLengthSlider.value = String(clampedFocal);
          if (focalLengthValue) focalLengthValue.textContent = `${clampedFocal}mm`;
        }
      };

      // Initial sync (delay to ensure studio is initialized)
      setTimeout(() => {
        syncCameraSliders();
      }, 100);

      // Sync sliders when camera changes (scroll, drag, etc.)
      setTimeout(() => {
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (!studioInstance) return;
        const camera = studioInstance.getCamera();
      if (camera) {
        // Listen for camera view matrix changes (fires on zoom, rotate, pan)
        camera.onViewMatrixChangedObservable.add(() => {
          syncCameraSliders();
        });

        // Also listen for wheel events on the canvas for immediate response
        const canvas = document.getElementById('renderCanvas');
        if (canvas) {
          canvas.addEventListener('wheel', () => {
            // Small delay to let camera update first
            requestAnimationFrame(syncCameraSliders);
          }, { passive: true });
        }
      }
      }, 100);

      // Also sync periodically as backup (delay to ensure studio is initialized)
      setTimeout(() => {
        setInterval(syncCameraSliders, 250);
      }, 100);

      if (cameraDistanceSlider) {
        cameraDistanceSlider.addEventListener('input', () => {
          const studioInstance = (window as any).virtualStudio as VirtualStudio;
          if (!studioInstance) return;
          const distance = parseFloat(cameraDistanceSlider.value);
          const camera = studioInstance.getCamera();
          if (camera) {
            camera.radius = distance;
          }
          if (cameraDistanceValue) cameraDistanceValue.textContent = `${distance.toFixed(1)}m`;
        });
      }

      if (cameraHeightSlider) {
        cameraHeightSlider.addEventListener('input', () => {
          const studioInstance = (window as any).virtualStudio as VirtualStudio;
          if (!studioInstance) return;
          const height = parseFloat(cameraHeightSlider.value);
          const camera = studioInstance.getCamera();
          if (camera) {
            // Calculate beta angle to achieve desired height
            // camera.position.y = target.y + radius * cos(beta)
            // So: beta = acos((height - target.y) / radius)
            const targetY = camera.target.y;
            const radius = camera.radius;
            const deltaY = height - targetY;
            // Clamp to valid range for acos
            const cosB = Math.max(-1, Math.min(1, deltaY / radius));
            camera.beta = Math.acos(cosB);
          }
          if (cameraHeightValue) cameraHeightValue.textContent = `${height.toFixed(1)}m`;
        });
      }

      if (focalLengthSlider) {
        focalLengthSlider.addEventListener('input', () => {
          const studioInstance = (window as any).virtualStudio as VirtualStudio;
          if (!studioInstance) return;
          const focal = parseFloat(focalLengthSlider.value);
          const camera = studioInstance.getCamera();
          if (camera) {
            camera.fov = (50 / focal) * 0.8;
          }
          if (focalLengthValue) focalLengthValue.textContent = `${Math.round(focal)}mm`;
        });
      }

      // Setup camera info dialog handlers - use event delegation for reliability
      const setupCameraInfoDialogs = () => {
        const infoDialog = document.getElementById('cameraInfoDialog');
        const infoDialogTitle = document.getElementById('cameraInfoDialogTitle');
        const infoDialogText = document.getElementById('cameraInfoDialogText');
        const infoDialogClose = document.getElementById('cameraInfoDialogClose');
        
        if (!infoDialog || !infoDialogTitle || !infoDialogText) {
          console.warn('[Camera Info] Dialog elements not found, retrying...');
          return false;
        }
        
        console.log('[Camera Info] Dialog elements found, setting up handlers');
        
        const showInfoDialog = (title: string, text: string) => {
          console.log('[Camera Info] showInfoDialog called:', title);
          infoDialogTitle.textContent = title;
          infoDialogText.textContent = text;
          
          // Get button position to position dialog correctly (relative to panel)
          const activeButton = document.querySelector('.camera-info-btn[data-info-title="' + title + '"]') as HTMLElement;
          const cameraControlsPanel = document.getElementById('cameraControlsPanel');
          if (activeButton && cameraControlsPanel) {
            const buttonRect = activeButton.getBoundingClientRect();
            const panelRect = cameraControlsPanel.getBoundingClientRect();
            // Calculate relative position within panel
            const relativeTop = buttonRect.top - panelRect.top;
            infoDialog.style.top = relativeTop + 'px';
            infoDialog.style.right = 'calc(100% + 16px)';
          }
          
          infoDialog.style.display = 'block';
          infoDialog.style.opacity = '0';
          infoDialog.style.transform = 'translateX(20px)';
          // Force reflow
          void infoDialog.offsetHeight;
          // Add show class
          infoDialog.classList.add('show');
          console.log('[Camera Info] Dialog should now be visible');
        };
        
        const hideInfoDialog = () => {
          infoDialog.classList.remove('show');
          setTimeout(() => {
            if (!infoDialog.classList.contains('show')) {
              infoDialog.style.display = 'none';
            }
          }, 300);
        };
        
        // Use event delegation on document - works even if elements are added dynamically
        const clickHandler = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target && target.classList.contains('camera-info-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const title = target.getAttribute('data-info-title') || '';
            const text = target.getAttribute('data-info-text') || '';
            console.log('[Camera Info] Info button clicked:', title, text);
            if (title && text) {
              showInfoDialog(title, text);
            } else {
              console.warn('[Camera Info] Missing title or text:', { title, text });
            }
          }
        };
        
        document.addEventListener('click', clickHandler, true);
        
        // Close button handler
        if (infoDialogClose) {
          infoDialogClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideInfoDialog();
          });
        }
        
        // Close dialog on Escape key
        const escapeHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && infoDialog.classList.contains('show')) {
            hideInfoDialog();
          }
        };
        document.addEventListener('keydown', escapeHandler);
        
        return true;
      };
      
      // Try to setup immediately
      if (!setupCameraInfoDialogs()) {
        // Retry after a short delay
        setTimeout(() => {
          setupCameraInfoDialogs();
        }, 500);
      }
      
      // Also setup when camera panel is opened
      const cameraControlsPanel = document.getElementById('cameraControlsPanel');
      if (cameraControlsPanel) {
        const observer = new MutationObserver(() => {
          if (cameraControlsPanel.style.display !== 'none') {
            setTimeout(() => {
              setupCameraInfoDialogs();
            }, 100);
          }
        });
        observer.observe(cameraControlsPanel, {
          attributes: true,
          attributeFilter: ['style']
        });
      }

      // Camera settings state
      const apertureStops = ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16', 'f/22'];
      const apertureValues = [1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22];
      const shutterSpeeds = ['1/8000s', '1/4000s', '1/2000s', '1/1000s', '1/500s', '1/250s', '1/125s', '1/60s', '1/30s', '1/15s', '1/8s', '1/4s', '1/2s', '1s'];
      const shutterValues = ['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1'];
      const isoValues = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
      const focalLengths = [14, 16, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200, 300, 400];
      const whiteBalances = [2700, 3200, 4000, 4500, 5000, 5600, 6500, 7500, 9000, 10000];
      
      let apertureIndex = 2; // f/2.8
      let shutterIndex = 6; // 1/125s
      let isoIndex = 1; // 100
      let focalIndex = 6; // 50mm
      let wbIndex = 5; // 5600K
      
      const updateCameraSettings = () => {
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (!studioInstance) return;
        
        // Parse aperture from string (e.g., 'f/2.8' -> 2.8)
        const apertureStr = apertureStops[apertureIndex];
        const apertureMatch = apertureStr.match(/f\/([\d.]+)/);
        const aperture = apertureMatch ? parseFloat(apertureMatch[1]) : apertureValues[apertureIndex];
        
        // Update studio camera settings
        studioInstance.cameraSettings.aperture = aperture;
        studioInstance.cameraSettings.shutter = shutterValues[shutterIndex];
        studioInstance.cameraSettings.iso = isoValues[isoIndex];
        studioInstance.cameraSettings.focalLength = focalLengths[focalIndex];
        (studioInstance.cameraSettings as any).whiteBalance = whiteBalances[wbIndex];
        
        // Update scene brightness based on new settings
        studioInstance.updateSceneBrightness();
        studioInstance.updateExposureDisplay();
      };
      
      const updateCameraDisplay = () => {
        const apertureEl = document.getElementById('apertureValue');
        const shutterEl = document.getElementById('shutterValue');
        const isoEl = document.getElementById('isoValue');
        const focalEl = document.getElementById('focalValue');
        const wbEl = document.getElementById('wbValue');
        const camExposure = document.getElementById('camExposure');
        
        if (apertureEl) apertureEl.textContent = apertureStops[apertureIndex];
        if (shutterEl) shutterEl.textContent = shutterSpeeds[shutterIndex];
        if (isoEl) isoEl.textContent = isoValues[isoIndex].toString();
        if (focalEl) focalEl.textContent = focalLengths[focalIndex] + 'mm';
        if (wbEl) wbEl.textContent = whiteBalances[wbIndex] + 'K';
        
        // Update viewport camera info display
        if (camExposure) {
          camExposure.textContent = `${apertureStops[apertureIndex]} · ${shutterSpeeds[shutterIndex]} · ISO ${isoValues[isoIndex]}`;
        }
        
        // Update camera settings in studio
        updateCameraSettings();
      };
      
      // Helper to add pointer handlers for touch-friendly controls
      const addSettingHandler = (btnId: string, handler: () => void) => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handler();
          });
        }
      };
      
      // Aperture controls
      addSettingHandler('apertureUp', () => {
        apertureIndex = Math.min(apertureStops.length - 1, apertureIndex + 1);
        updateCameraDisplay();
      });
      addSettingHandler('apertureDown', () => {
        apertureIndex = Math.max(0, apertureIndex - 1);
        updateCameraDisplay();
      });
      
      // Shutter controls
      addSettingHandler('shutterUp', () => {
        shutterIndex = Math.max(0, shutterIndex - 1);
        updateCameraDisplay();
      });
      addSettingHandler('shutterDown', () => {
        shutterIndex = Math.min(shutterSpeeds.length - 1, shutterIndex + 1);
        updateCameraDisplay();
      });
      
      // ISO controls
      addSettingHandler('isoUp', () => {
        isoIndex = Math.min(isoValues.length - 1, isoIndex + 1);
        updateCameraDisplay();
      });
      addSettingHandler('isoDown', () => {
        isoIndex = Math.max(0, isoIndex - 1);
        updateCameraDisplay();
      });
      
      // Focal length controls
      addSettingHandler('focalUp', () => {
        focalIndex = Math.min(focalLengths.length - 1, focalIndex + 1);
        updateCameraDisplay();
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (studioInstance) {
          const camera = studioInstance.getCamera();
          if (camera) {
            camera.fov = (50 / focalLengths[focalIndex]) * 0.8;
          }
        }
      });
      addSettingHandler('focalDown', () => {
        focalIndex = Math.max(0, focalIndex - 1);
        updateCameraDisplay();
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (studioInstance) {
          const camera = studioInstance.getCamera();
          if (camera) {
            camera.fov = (50 / focalLengths[focalIndex]) * 0.8;
          }
        }
      });
      
      // White balance controls
      addSettingHandler('wbUp', () => {
        wbIndex = Math.min(whiteBalances.length - 1, wbIndex + 1);
        updateCameraDisplay();
      });
      addSettingHandler('wbDown', () => {
        wbIndex = Math.max(0, wbIndex - 1);
        updateCameraDisplay();
      });
      
      // ND Filter controls
      const ndValues = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
      let ndIndex = 0; // 0 (no filter)
      addSettingHandler('ndUp', () => {
        ndIndex = Math.min(ndValues.length - 1, ndIndex + 1);
        const ndEl = document.getElementById('ndValue');
        if (ndEl) ndEl.textContent = ndValues[ndIndex] === 0 ? '0' : `ND${ndValues[ndIndex]}`;
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (studioInstance) {
          studioInstance.cameraSettings.nd = ndValues[ndIndex];
          studioInstance.updateSceneBrightness();
          studioInstance.updateExposureDisplay();
        }
      });
      addSettingHandler('ndDown', () => {
        ndIndex = Math.max(0, ndIndex - 1);
        const ndEl = document.getElementById('ndValue');
        if (ndEl) ndEl.textContent = ndValues[ndIndex] === 0 ? '0' : `ND${ndValues[ndIndex]}`;
        const studioInstance = (window as any).virtualStudio as VirtualStudio;
        if (studioInstance) {
          studioInstance.cameraSettings.nd = ndValues[ndIndex];
          studioInstance.updateSceneBrightness();
          studioInstance.updateExposureDisplay();
        }
      });
      
      // Tab switching
      const tabCamera = document.getElementById('tabCamera');
      const tabLight = document.getElementById('tabLight');
      const cameraTabContent = document.getElementById('cameraTabContent');
      const lightTabContent = document.getElementById('lightTabContent');
      
      const switchToTab = (tab: 'camera' | 'light') => {
        // #region agent log
        fetch('http://localhost:7243/ingest/82d9ea38-5630-4ae2-b859-214f146ea1b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:15963',message:'switchToTab called',data:{tab,cameraTabContentExists:!!cameraTabContent,lightTabContentExists:!!lightTabContent},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const cameraControlsPanel = document.getElementById('cameraControlsPanel') as HTMLElement;
        const cameraControlsScrollable = document.getElementById('cameraControlsScrollable') as HTMLElement;
        const screenWidth = window.innerWidth;
        // Determine width based on screen size: 1100px for screens 1440px+, 900px otherwise
        const lightTabWidth = screenWidth >= 1440 ? '1100px' : '900px';
        
        if (tab === 'camera') {
          if (tabCamera) {
            tabCamera.style.background = 'rgba(0,212,255,0.15)';
            tabCamera.style.borderBottom = '2px solid #00d4ff';
            tabCamera.style.color = '#00d4ff';
          }
          if (tabLight) {
            tabLight.style.background = 'transparent';
            tabLight.style.borderBottom = '2px solid transparent';
            tabLight.style.color = 'rgba(255,255,255,0.6)';
          }
          if (cameraTabContent) cameraTabContent.style.display = 'flex';
          if (lightTabContent) lightTabContent.style.display = 'none';
          // Reset panel width and scrollable height to default when camera tab is active
          if (cameraControlsPanel) {
            cameraControlsPanel.style.width = '550px';
            cameraControlsPanel.style.maxHeight = 'calc(100vh - 180px)';
          }
          if (cameraControlsScrollable) {
            cameraControlsScrollable.style.maxHeight = 'calc(100vh - 180px)';
            cameraControlsScrollable.style.overflowY = 'auto';
          }
        } else {
          if (tabLight) {
            tabLight.style.background = 'rgba(255,170,0,0.15)';
            tabLight.style.borderBottom = '2px solid #ffaa00';
            tabLight.style.color = '#ffaa00';
          }
          if (tabCamera) {
            tabCamera.style.background = 'transparent';
            tabCamera.style.borderBottom = '2px solid transparent';
            tabCamera.style.color = 'rgba(255,255,255,0.6)';
          }
          if (cameraTabContent) cameraTabContent.style.display = 'none';
          if (lightTabContent) lightTabContent.style.display = 'flex';
          // Ensure light sections are visible (remove any inline display:none)
          const lightPresetsSection = document.querySelector('.light-presets-section') as HTMLElement;
          const lightPatternsSection = document.querySelector('.light-patterns-section') as HTMLElement;
          if (lightPresetsSection) lightPresetsSection.style.removeProperty('display');
          if (lightPatternsSection) lightPatternsSection.style.removeProperty('display');
          // Increase panel width and remove height restriction when light tab is active
          if (cameraControlsPanel) {
            cameraControlsPanel.style.width = lightTabWidth;
            // Remove max-height restriction to show all content
            cameraControlsPanel.style.maxHeight = 'none';
          }
          if (cameraControlsScrollable) {
            // Keep scrolling behavior but increase max-height for light tab
            cameraControlsScrollable.style.maxHeight = 'calc(100vh - 280px)';
            cameraControlsScrollable.style.overflowY = 'auto';
          }
        }
      };
      
      // Collapse/expand functionality for light tab sections
      // Make it available globally so it can be called from other places
      (window as any).setupLightSectionCollapse = () => {
        const lightTabContent = document.getElementById('lightTabContent');
        const lightSectionHeaders = lightTabContent 
          ? Array.from(lightTabContent.querySelectorAll('.light-section-header'))
          : Array.from(document.querySelectorAll('.light-section-header'));
        
        lightSectionHeaders.forEach((header) => {
          // Skip if already has event listener
          if ((header as HTMLElement).dataset.hasListener === 'true') return;
          (header as HTMLElement).dataset.hasListener = 'true';
          
          // Find content element
          let content = header.nextElementSibling as HTMLElement;
          if (!content || !content.classList.contains('light-section-content')) {
            const parent = header.parentElement;
            if (parent) {
              const foundContent = parent.querySelector('.light-section-content');
              if (foundContent) content = foundContent as HTMLElement;
            }
          }
          if (!content) return;
          
          header.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle collapsed class on header
            header.classList.toggle('collapsed');
            const isCollapsed = header.classList.contains('collapsed');
            
            // Toggle content visibility
            if (isCollapsed) {
              content.style.display = 'none';
            } else {
              content.style.display = 'block';
            }
          });
        });
      };
      
      const setupLightSectionCollapse = (window as any).setupLightSectionCollapse;
      
      tabCamera?.addEventListener('click', () => {
        switchToTab('camera');
      });
      tabLight?.addEventListener('click', () => {
        switchToTab('light');
        // Setup collapse functionality when light tab is shown
        setTimeout(setupLightSectionCollapse, 50);
      });
      
      // Initialize: Light sections are now inside #lightTabContent and will be hidden automatically
      // when lightTabContent has display:none (set in HTML)
      
      // Also setup on initial load if light tab is already active
      if (lightTabContent && lightTabContent.style.display !== 'none') {
        setTimeout(setupLightSectionCollapse, 100);
      }
      
      // Update panel width on window resize if light tab is active
      window.addEventListener('resize', () => {
        const cameraControlsPanel = document.getElementById('cameraControlsPanel') as HTMLElement;
        const cameraControlsScrollable = document.getElementById('cameraControlsScrollable') as HTMLElement;
        const tabLight = document.getElementById('tabLight') as HTMLElement;
        if (cameraControlsPanel && tabLight && tabLight.classList.contains('active')) {
          const screenWidth = window.innerWidth;
          const lightTabWidth = screenWidth >= 1440 ? '1100px' : '900px';
          cameraControlsPanel.style.width = lightTabWidth;
          // Ensure height restriction is removed when light tab is active
          cameraControlsPanel.style.maxHeight = 'none';
          if (cameraControlsScrollable) {
            cameraControlsScrollable.style.maxHeight = 'calc(100vh - 280px)';
            cameraControlsScrollable.style.overflowY = 'auto';
          }
        }
      });
      
      // Light controls state
      let lightPower = 100;
      let lightTemp = 5600;
      let lightBeam = 45;
      // Power steps will be determined dynamically based on light type/brand
      let currentPowerSteps: { values: number[], labels: string[], isFlash: boolean } = { values: [0.1, 0.25, 0.5, 0.75, 1.0], labels: ['10%', '25%', '50%', '75%', '100%'], isFlash: false };
      const tempSteps = [2700, 3200, 4000, 5000, 5600, 6500, 7500];
      const beamSteps = [15, 30, 45, 60, 90, 120];
      let powerIndex = 4;
      let tempIndex = 4;
      let beamIndex = 2;
      
      const updateLightDisplay = () => {
        const powerEl = document.getElementById('powerValue');
        const tempEl = document.getElementById('tempValue');
        const beamEl = document.getElementById('beamValue');
        const intensityEl = document.getElementById('intensityValue');
        const softnessEl = document.getElementById('softnessValue');
        const intensitySlider = document.getElementById('intensitySlider') as HTMLInputElement;
        const softnessSlider = document.getElementById('softnessSlider') as HTMLInputElement;
        
        if (powerEl) {
          if (powerIndex >= 0 && powerIndex < currentPowerSteps.labels.length) {
            powerEl.textContent = currentPowerSteps.labels[powerIndex];
          } else {
            powerEl.textContent = '100%';
          }
        }
        if (tempEl) tempEl.textContent = tempSteps[tempIndex] + 'K';
        if (beamEl) beamEl.textContent = beamSteps[beamIndex] + '°';
        if (intensityEl && intensitySlider) intensityEl.textContent = intensitySlider.value + '%';
        if (softnessEl && softnessSlider) softnessEl.textContent = softnessSlider.value + '%';
      };
      
      // Light setting handlers
      const addLightHandler = (btnId: string, handler: () => void) => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handler();
          });
        }
      };
      
      addLightHandler('powerUp', () => {
        powerIndex = Math.min(currentPowerSteps.values.length - 1, powerIndex + 1);
        // Update power multiplier
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Ensure baseIntensity is initialized
            if (!light.baseIntensity) {
              const defaultBase = light.type.includes('softbox') || light.type.includes('umbrella') ? 8 : 12;
              light.baseIntensity = defaultBase;
            }
            // Ensure powerMultiplier is initialized
            if (light.powerMultiplier === undefined) {
              light.powerMultiplier = 1.0;
            }
            // Use current power steps (brand-specific for flashes, percentage for continuous)
            light.powerMultiplier = currentPowerSteps.values[powerIndex];
            // Trigger brightness update to apply the change
            studio.updateSceneBrightness();
            // Update intensity slider to reflect the change
            const intensitySlider = document.getElementById('intensitySlider') as HTMLInputElement;
            if (intensitySlider) {
              const percent = Math.round(light.powerMultiplier * 100);
              intensitySlider.value = String(Math.max(0, Math.min(100, percent)));
            }
            updateLightDisplay();
          }
        }
      });
      addLightHandler('powerDown', () => {
        powerIndex = Math.max(0, powerIndex - 1);
        // Update power multiplier
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Ensure baseIntensity is initialized
            if (!light.baseIntensity) {
              const defaultBase = light.type.includes('softbox') || light.type.includes('umbrella') ? 8 : 12;
              light.baseIntensity = defaultBase;
            }
            // Ensure powerMultiplier is initialized
            if (light.powerMultiplier === undefined) {
              light.powerMultiplier = 1.0;
            }
            // Use current power steps (brand-specific for flashes, percentage for continuous)
            light.powerMultiplier = currentPowerSteps.values[powerIndex];
            // Trigger brightness update to apply the change
            studio.updateSceneBrightness();
            // Update intensity slider to reflect the change
            const intensitySlider = document.getElementById('intensitySlider') as HTMLInputElement;
            if (intensitySlider) {
              const percent = Math.round(light.powerMultiplier * 100);
              intensitySlider.value = String(Math.max(0, Math.min(100, percent)));
            }
            updateLightDisplay();
          }
        }
      });
      addLightHandler('tempUp', () => {
        tempIndex = Math.min(tempSteps.length - 1, tempIndex + 1);
        updateLightDisplay();
        // Update actual light color temperature
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            const newCCT = tempSteps[tempIndex];
            light.cct = newCCT;
            const color = studio.cctToColor(newCCT);
            // Apply CRI effect if specified
            const lightSpec = getLightById(light.type);
            const finalColor = lightSpec?.cri ? studio.applyCRIEffect(color, lightSpec.cri) : color;
            light.light.diffuse = finalColor;
            
            // Update emissive material on mesh with improved formula
            if (light.mesh.material) {
              const mat = light.mesh.material as BABYLON.StandardMaterial | BABYLON.PBRMaterial;
              if (mat.emissiveColor) {
                // Improved formula: minimum 0.3 for visibility, scales up to 2.5 for strong lights
                const emissiveIntensity = Math.min(2.5, 0.3 + (light.intensity || 1) / 3);
                mat.emissiveColor = new BABYLON.Color3(
                  Math.min(2.5, finalColor.r * emissiveIntensity),
                  Math.min(2.5, finalColor.g * emissiveIntensity),
                  Math.min(2.5, finalColor.b * emissiveIntensity)
                );
              }
            }
            
            // Update modeling light color if it exists
            if (light.modelingLight) {
              light.modelingLight.diffuse = finalColor;
            }
          }
        }
      });
      addLightHandler('tempDown', () => {
        tempIndex = Math.max(0, tempIndex - 1);
        updateLightDisplay();
        // Update actual light color temperature
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            const newCCT = tempSteps[tempIndex];
            light.cct = newCCT;
            const color = studio.cctToColor(newCCT);
            // Apply CRI effect if specified
            const lightSpec = getLightById(light.type);
            const finalColor = lightSpec?.cri ? studio.applyCRIEffect(color, lightSpec.cri) : color;
            light.light.diffuse = finalColor;
            
            // Update emissive material on mesh with improved formula
            if (light.mesh.material) {
              const mat = light.mesh.material as BABYLON.StandardMaterial | BABYLON.PBRMaterial;
              if (mat.emissiveColor) {
                // Improved formula: minimum 0.3 for visibility, scales up to 2.5 for strong lights
                const emissiveIntensity = Math.min(2.5, 0.3 + (light.intensity || 1) / 3);
                mat.emissiveColor = new BABYLON.Color3(
                  Math.min(2.5, finalColor.r * emissiveIntensity),
                  Math.min(2.5, finalColor.g * emissiveIntensity),
                  Math.min(2.5, finalColor.b * emissiveIntensity)
                );
              }
            }
            
            // Update modeling light color if it exists
            if (light.modelingLight) {
              light.modelingLight.diffuse = finalColor;
            }
          }
        }
      });
      addLightHandler('beamUp', () => {
        beamIndex = Math.min(beamSteps.length - 1, beamIndex + 1);
        updateLightDisplay();
        // Update actual light beam angle or range
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            if (light.light instanceof BABYLON.SpotLight) {
              // For SpotLights: update angle
              const angle = beamSteps[beamIndex];
              light.light.angle = (angle * Math.PI) / 180;
              
              // Update beam visualization if it exists
              if (light.beamVisualization) {
                const beamLength = 5;
                const beamRadius = Math.tan(light.light.angle) * beamLength;
                
                // Update existing beam visualization geometry
                const oldMesh = light.beamVisualization;
                const oldMat = oldMesh.material;
                oldMesh.dispose();
                
                // Recreate beam visualization with new angle
                light.beamVisualization = BABYLON.MeshBuilder.CreateCylinder(
                  `beam_${studio.selectedLightId}`,
                  {
                    height: beamLength,
                    diameterTop: 0,
                    diameterBottom: beamRadius * 2,
                    tessellation: 16
                  },
                  studio.scene
                );
                
                if (oldMat) {
                  light.beamVisualization.material = oldMat;
                } else {
                  const beamMat = new BABYLON.StandardMaterial(`beamMat_${studio.selectedLightId}`, studio.scene);
                  beamMat.emissiveColor = light.light.diffuse;
                  beamMat.diffuseColor = light.light.diffuse;
                  beamMat.alpha = 0.2;
                  beamMat.disableLighting = true;
                  beamMat.sideOrientation = BABYLON.Mesh.DOUBLESIDE;
                  light.beamVisualization.material = beamMat;
                }
                
                light.beamVisualization.parent = light.mesh;
                light.beamVisualization.isVisible = studio.selectedLightId === light.mesh.name.replace('mesh_', 'light_');
                light.beamVisualization.isPickable = false;
              }
            } else if (light.light instanceof BABYLON.PointLight) {
              // For PointLights: update range (wider beam = longer range)
              // Map beam steps to range: 15° = 8m, 30° = 10m, 45° = 12m, 60° = 15m, 90° = 18m, 120° = 20m
              const rangeMap: { [key: number]: number } = {
                15: 8,
                30: 10,
                45: 12,
                60: 15,
                90: 18,
                120: 20
              };
              const angle = beamSteps[beamIndex];
              const newRange = rangeMap[angle] || 15;
              (light.light as BABYLON.PointLight).range = newRange;
              console.log(`PointLight range updated to ${newRange}m (beam angle: ${angle}°)`);
            }
          }
        }
      });
      addLightHandler('beamDown', () => {
        beamIndex = Math.max(0, beamIndex - 1);
        updateLightDisplay();
        // Update actual light beam angle or range
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            if (light.light instanceof BABYLON.SpotLight) {
              // For SpotLights: update angle
              const angle = beamSteps[beamIndex];
              light.light.angle = (angle * Math.PI) / 180;
              
              // Update beam visualization if it exists
              if (light.beamVisualization) {
                const beamLength = 5;
                const beamRadius = Math.tan(light.light.angle) * beamLength;
                
                // Update existing beam visualization geometry
                const oldMesh = light.beamVisualization;
                const oldMat = oldMesh.material;
                oldMesh.dispose();
                
                // Recreate beam visualization with new angle
                light.beamVisualization = BABYLON.MeshBuilder.CreateCylinder(
                  `beam_${studio.selectedLightId}`,
                  {
                    height: beamLength,
                    diameterTop: 0,
                    diameterBottom: beamRadius * 2,
                    tessellation: 16
                  },
                  studio.scene
                );
                
                if (oldMat) {
                  light.beamVisualization.material = oldMat;
                } else {
                  const beamMat = new BABYLON.StandardMaterial(`beamMat_${studio.selectedLightId}`, studio.scene);
                  beamMat.emissiveColor = light.light.diffuse;
                  beamMat.diffuseColor = light.light.diffuse;
                  beamMat.alpha = 0.2;
                  beamMat.disableLighting = true;
                  beamMat.sideOrientation = BABYLON.Mesh.DOUBLESIDE;
                  light.beamVisualization.material = beamMat;
                }
                
                light.beamVisualization.parent = light.mesh;
                light.beamVisualization.isVisible = studio.selectedLightId === light.mesh.name.replace('mesh_', 'light_');
                light.beamVisualization.isPickable = false;
              }
            } else if (light.light instanceof BABYLON.PointLight) {
              // For PointLights: update range (wider beam = longer range)
              // Map beam steps to range: 15° = 8m, 30° = 10m, 45° = 12m, 60° = 15m, 90° = 18m, 120° = 20m
              const rangeMap: { [key: number]: number } = {
                15: 8,
                30: 10,
                45: 12,
                60: 15,
                90: 18,
                120: 20
              };
              const angle = beamSteps[beamIndex];
              const newRange = rangeMap[angle] || 15;
              (light.light as BABYLON.PointLight).range = newRange;
              console.log(`PointLight range updated to ${newRange}m (beam angle: ${angle}°)`);
            }
          }
        }
      });
      
      // Slider handlers - connected to actual lights
      // Light toggle switch handler
      document.getElementById('lightToggleSwitch')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const lightToggleStatus = document.getElementById('lightToggleStatus');
        if (lightToggleStatus) {
          lightToggleStatus.textContent = isChecked ? 'PÅ' : 'AV';
        }
        if (studio.selectedLightId) {
          studio.toggleLight(studio.selectedLightId, isChecked);
        }
      });

      document.getElementById('intensitySlider')?.addEventListener('input', (e) => {
        updateLightDisplay();
        const value = parseInt((e.target as HTMLInputElement).value);
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Intensity slider controls powerMultiplier directly (0-100% = 0.0-1.0)
            light.powerMultiplier = value / 100;
            // Update power index to match current power steps
            let closestIndex = 0;
            let minDiff = Math.abs(value / 100 - currentPowerSteps.values[0]);
            for (let i = 1; i < currentPowerSteps.values.length; i++) {
              const diff = Math.abs(value / 100 - currentPowerSteps.values[i]);
              if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
              }
            }
            powerIndex = closestIndex;
            updateLightDisplay();
            // Trigger brightness update to apply the change
            studio.updateSceneBrightness();
            
            // Update emissive material intensity based on power
            if (light.mesh.material) {
              const mat = light.mesh.material as BABYLON.StandardMaterial | BABYLON.PBRMaterial;
              if (mat.emissiveColor) {
                const baseEmissive = light.light.diffuse;
                const emissiveIntensity = Math.min(1.0, (light.intensity || 1) * light.powerMultiplier / 10);
                mat.emissiveColor = new BABYLON.Color3(
                  Math.min(1, baseEmissive.r * emissiveIntensity),
                  Math.min(1, baseEmissive.g * emissiveIntensity),
                  Math.min(1, baseEmissive.b * emissiveIntensity)
                );
              }
            }
          }
        }
      });

      document.getElementById('softnessSlider')?.addEventListener('input', (e) => {
        updateLightDisplay();
        // Softness affects light exponent (spotlight falloff) for SpotLights
        const value = parseInt((e.target as HTMLInputElement).value);
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.light instanceof BABYLON.SpotLight) {
            // Softness maps to light exponent (0-100 -> 0-128)
            // Lower exponent = softer falloff, higher = sharper
            // 0 = very soft, 100 = very sharp
            light.light.exponent = (value / 100) * 128;
          } else if (light && light.light instanceof BABYLON.PointLight) {
            // For PointLight, softness affects falloff (range attenuation)
            // Higher softness = longer range, softer falloff
            const range = 15; // Base range
            const softnessFactor = 0.5 + (value / 100) * 1.5; // 0.5 to 2.0
            (light.light as BABYLON.PointLight).range = range * softnessFactor;
          }
        }
      });
      
      // Ambient light slider handler with precise calculations
      document.getElementById('ambientLightSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('ambientLightValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        studio.setAmbientLightIntensity(value);
        
        // Update slider fill indicator
        const slider = e.target as HTMLInputElement;
        const percent = (value / 100) * 100;
        slider.style.setProperty('--slider-percent', `${percent}%`);
      });
      
      // Auto-ambient checkbox handler with visual toggle update
      document.getElementById('autoAmbientCheckbox')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        studio.setAutoAmbient(isChecked);
        
        // Update toggle visual state
        const parent = (e.target as HTMLElement).parentElement;
        if (parent) {
          const track = parent.querySelector('span:first-of-type') as HTMLElement;
          const thumb = parent.querySelector('span:last-of-type') as HTMLElement;
          if (track && thumb) {
            track.style.background = isChecked ? '#4CAF50' : 'rgba(255,255,255,0.2)';
            thumb.style.left = isChecked ? '18px' : '2px';
          }
        }
      });
      
      // Ambient light toggle handler with visual state update
      document.getElementById('ambientToggleSwitch')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        studio.setAmbientLightEnabled(isChecked);
        
        // Update toggle visual state
        const track = document.getElementById('ambientToggleTrack');
        const thumb = document.getElementById('ambientToggleThumb');
        const badge = document.getElementById('ambientStatusBadge');
        
        if (track) {
          track.style.background = isChecked 
            ? 'linear-gradient(90deg,#4CAF50,#66BB6A)' 
            : 'rgba(255,255,255,0.2)';
          track.style.boxShadow = isChecked 
            ? '0 2px 8px rgba(76,175,80,0.3)' 
            : 'none';
        }
        if (thumb) {
          thumb.style.left = isChecked ? '24px' : '2px';
        }
        if (badge) {
          badge.textContent = isChecked ? 'AKTIV' : 'INAKTIV';
          badge.style.background = isChecked ? 'rgba(76,175,80,0.2)' : 'rgba(255,100,100,0.2)';
          badge.style.color = isChecked ? '#4CAF50' : '#ff6464';
          badge.style.borderColor = isChecked ? 'rgba(76,175,80,0.4)' : 'rgba(255,100,100,0.4)';
        }
      });
      
      // Ambient light temperature slider with precise Kelvin calculations
      document.getElementById('ambientTempSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('ambientTempValue');
        
        // Format temperature value with proper precision
        if (valueEl) {
          if (value >= 10000) {
            valueEl.textContent = `${(value / 1000).toFixed(1)}kK`;
          } else {
            valueEl.textContent = `${value}K`;
          }
        }
        
        studio.setAmbientLightTemperature(value);
        
        // Update slider position indicator
        const slider = e.target as HTMLInputElement;
        const percent = ((value - 2700) / (10000 - 2700)) * 100;
        slider.style.setProperty('--slider-percent', `${percent}%`);
      });
      
      // Ambient light ground intensity slider with precise calculations
      document.getElementById('ambientGroundSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('ambientGroundValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        studio.setAmbientLightGroundIntensity(value);
        
        // Update slider fill indicator
        const slider = e.target as HTMLInputElement;
        const percent = (value / 100) * 100;
        slider.style.setProperty('--slider-percent', `${percent}%`);
      });
      
      // Ambient preset buttons
      document.getElementById('ambientPresetDay')?.addEventListener('click', () => {
        studio.setAmbientPreset('day');
      });
      document.getElementById('ambientPresetEvening')?.addEventListener('click', () => {
        studio.setAmbientPreset('evening');
      });
      document.getElementById('ambientPresetNight')?.addEventListener('click', () => {
        studio.setAmbientPreset('night');
      });
      document.getElementById('ambientPresetStudio')?.addEventListener('click', () => {
        studio.setAmbientPreset('studio');
      });

      // Modeling light toggle handler
      document.getElementById('modelingLightToggle')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.modelingLight) {
            light.modelingLightEnabled = isChecked;
            if (light.modelingLightIntensity !== undefined) {
              light.modelingLight.intensity = isChecked ? light.modelingLightIntensity : 0;
              light.modelingLight.setEnabled(isChecked); // Enable/disable based on toggle
            }
            
            // Update status display
            const modelingLightStatus = document.getElementById('modelingLightStatus');
            if (modelingLightStatus) {
              modelingLightStatus.textContent = isChecked ? 'På' : 'Av';
            }
            
            // Update scene to reflect modeling light changes
            // (updateLightMeterReading is called automatically on next render)
          }
        }
      });

      // Modifier selector handler
      document.getElementById('modifierSelect')?.addEventListener('change', (e) => {
        const modifier = (e.target as HTMLSelectElement).value;
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            light.modifier = modifier;
            
            // Apply modifier effect by adjusting light properties
            // Note: We keep the light type (SpotLight/PointLight) but adjust properties based on modifier
            // For soft modifiers (softbox, octabox, umbrella), adjust for softer lighting
            // For directional modifiers (snoot, grid), adjust for sharper, more focused lighting
            
            if (light.light instanceof BABYLON.SpotLight) {
              // Adjust SpotLight properties based on modifier
              switch (modifier) {
                // Focusing modifiers - narrow beam, sharp falloff
                case 'snoot':
                  light.light.angle = Math.PI / 12; // 15°
                  light.light.exponent = 80;
                  break;
                case 'grid':
                  light.light.angle = Math.PI / 8; // 22.5°
                  light.light.exponent = 64;
                  break;
                case 'barndoors':
                  light.light.angle = Math.PI / 5; // 36°
                  light.light.exponent = 48;
                  break;
                case 'fresnel':
                  light.light.angle = Math.PI / 6; // 30°
                  light.light.exponent = 40;
                  break;
                case 'gobo':
                  light.light.angle = Math.PI / 10; // 18°
                  light.light.exponent = 64;
                  break;
                  
                // Softening modifiers - wider beam, soft falloff
                case 'softbox':
                case 'stripbox':
                  light.light.angle = Math.PI / 3; // 60°
                  light.light.exponent = 16;
                  break;
                case 'octabox':
                  light.light.angle = Math.PI / 2.5; // 72°
                  light.light.exponent = 12;
                  break;
                case 'umbrella':
                case 'umbrella-reflective':
                  light.light.angle = Math.PI / 2; // 90°
                  light.light.exponent = 8;
                  break;
                case 'beautydish':
                  light.light.angle = Math.PI / 4; // 45°
                  light.light.exponent = 24;
                  break;
                case 'silkframe':
                  light.light.angle = Math.PI / 2; // 90°
                  light.light.exponent = 4;
                  break;
                  
                // Reflectors - adjust color temperature slightly
                case 'reflector-silver':
                  light.light.angle = Math.PI / 4;
                  light.light.exponent = 32;
                  break;
                case 'reflector-gold':
                  light.light.angle = Math.PI / 4;
                  light.light.exponent = 32;
                  // Warm up the light slightly
                  light.light.diffuse = new BABYLON.Color3(1.0, 0.92, 0.8);
                  break;
                case 'reflector-white':
                  light.light.angle = Math.PI / 3;
                  light.light.exponent = 20;
                  break;
                  
                default:
                  // No modifier - default spotlight settings
                  light.light.angle = Math.PI / 4; // 45°
                  light.light.exponent = 32;
              }
            } else if (light.light instanceof BABYLON.PointLight) {
              // Adjust PointLight range based on modifier
              const rangeMap: { [key: string]: number } = {
                'umbrella': 22, 'umbrella-reflective': 20, 'octabox': 18,
                'softbox': 16, 'stripbox': 16, 'silkframe': 20,
                'beautydish': 14, 'snoot': 10, 'grid': 12,
                'barndoors': 14, 'fresnel': 12, 'gobo': 10,
                'reflector-silver': 15, 'reflector-gold': 15, 'reflector-white': 16,
                'none': 15
              };
              (light.light as BABYLON.PointLight).range = rangeMap[modifier] || 15;
            }
          }
        }
      });

      // Quick light preset buttons
      const applyLightPreset = (preset: 'key' | 'fill' | 'rim' | 'background') => {
        if (!studio.selectedLightId) return;
        const light = studio.lights.get(studio.selectedLightId);
        if (!light) return;
        
        const intensitySlider = document.getElementById('intensitySlider') as HTMLInputElement;
        const softnessSlider = document.getElementById('softnessSlider') as HTMLInputElement;
        const modifierSelect = document.getElementById('modifierSelect') as HTMLSelectElement;
        
        switch (preset) {
          case 'key':
            // Key light: Strong, slightly warm, medium-soft
            const keyPower = 1.0;
            light.powerMultiplier = keyPower;
            light.cct = 5600;
            if (light.light instanceof BABYLON.SpotLight) {
              light.light.angle = Math.PI / 4; // 45°
              light.light.exponent = 32;
            }
            if (intensitySlider) intensitySlider.value = '100';
            if (softnessSlider) softnessSlider.value = '40';
            if (modifierSelect) modifierSelect.value = 'softbox';
            light.modifier = 'softbox';
            break;
            
          case 'fill':
            // Fill light: Softer, cooler, lower power
            light.powerMultiplier = 0.35;
            light.cct = 5600;
            if (light.light instanceof BABYLON.SpotLight) {
              light.light.angle = Math.PI / 3; // 60°
              light.light.exponent = 16;
            }
            if (intensitySlider) intensitySlider.value = '35';
            if (softnessSlider) softnessSlider.value = '70';
            if (modifierSelect) modifierSelect.value = 'umbrella';
            light.modifier = 'umbrella';
            break;
            
          case 'rim':
            // Rim/Hair light: Narrow, sharp, strong
            light.powerMultiplier = 0.75;
            light.cct = 5600;
            if (light.light instanceof BABYLON.SpotLight) {
              light.light.angle = Math.PI / 12; // 15°
              light.light.exponent = 64;
              light.light.innerAngle = Math.PI / 24; // 7.5°
            }
            if (intensitySlider) intensitySlider.value = '75';
            if (softnessSlider) softnessSlider.value = '20';
            if (modifierSelect) modifierSelect.value = 'grid';
            light.modifier = 'grid';
            break;
            
          case 'background':
            // Background light: Wide, colored option, medium power
            light.powerMultiplier = 0.5;
            light.cct = 5000;
            if (light.light instanceof BABYLON.SpotLight) {
              light.light.angle = Math.PI / 2.5; // 72°
              light.light.exponent = 8;
            }
            if (intensitySlider) intensitySlider.value = '50';
            if (softnessSlider) softnessSlider.value = '60';
            if (modifierSelect) modifierSelect.value = 'none';
            light.modifier = 'none';
            break;
        }
        
        // Update light intensity
        light.light.intensity = (light.intensity || 1) * light.powerMultiplier;
        
        // Update color temperature
        const color = studio.cctToColor(light.cct);
        light.light.diffuse = color;
        
        // Update display
        updateLightDisplay();
        studio.updateSceneBrightness();
        studio.updateLightMeterReading();
        
        console.log(`Applied ${preset} light preset`);
      };
      
      document.getElementById('presetKeyLight')?.addEventListener('click', () => applyLightPreset('key'));
      document.getElementById('presetFillLight')?.addEventListener('click', () => applyLightPreset('fill'));
      document.getElementById('presetRimLight')?.addEventListener('click', () => applyLightPreset('rim'));
      document.getElementById('presetBackgroundLight')?.addEventListener('click', () => applyLightPreset('background'));

      // ============================================
      // ADVANCED LIGHT CONTROLS
      // ============================================
      
      // Light Range Control
      document.getElementById('lightRangeSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('lightRangeValue');
        if (valueEl) valueEl.textContent = `${value}m`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            if (light.light instanceof BABYLON.SpotLight) {
              light.light.range = value;
            } else if (light.light instanceof BABYLON.PointLight) {
              (light.light as BABYLON.PointLight).range = value;
            }
          }
        }
      });
      
      // Light Falloff Control
      document.getElementById('lightFalloffSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('lightFalloffValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.light instanceof BABYLON.SpotLight) {
            // Map 0-100 to exponent 0-128
            light.light.exponent = (value / 100) * 128;
          }
        }
      });
      
      // Inner Cone Angle Control
      document.getElementById('innerConeSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('innerConeValue');
        if (valueEl) valueEl.textContent = `${value}°`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.light instanceof BABYLON.SpotLight) {
            // Convert degrees to radians
            light.light.innerAngle = (value * Math.PI) / 180;
          }
        }
      });
      
      // Outer Cone Angle Control
      document.getElementById('outerConeSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('outerConeValue');
        if (valueEl) valueEl.textContent = `${value}°`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.light instanceof BABYLON.SpotLight) {
            // Convert degrees to radians
            light.light.angle = (value * Math.PI) / 180;
          }
        }
      });
      
      // Specular Intensity Control
      document.getElementById('specularSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('specularValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Create a separate specular color based on diffuse with intensity
            const specularIntensity = value / 100;
            light.light.specular = new BABYLON.Color3(
              light.light.diffuse.r * specularIntensity,
              light.light.diffuse.g * specularIntensity,
              light.light.diffuse.b * specularIntensity
            );
          }
        }
      });
      
      // Diffuse Intensity Control
      document.getElementById('diffuseSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('diffuseValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Store original diffuse color if not stored
            if (!light.originalDiffuse) {
              light.originalDiffuse = light.light.diffuse.clone();
            }
            // Adjust diffuse based on intensity
            const diffuseIntensity = value / 100;
            light.light.diffuse = new BABYLON.Color3(
              light.originalDiffuse.r * diffuseIntensity,
              light.originalDiffuse.g * diffuseIntensity,
              light.originalDiffuse.b * diffuseIntensity
            );
          }
        }
      });
      
      // Custom Color Picker
      document.getElementById('lightColorPicker')?.addEventListener('input', (e) => {
        const colorHex = (e.target as HTMLInputElement).value;
        const useCustom = (document.getElementById('useCustomColor') as HTMLInputElement)?.checked;
        
        if (useCustom && studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            const color = BABYLON.Color3.FromHexString(colorHex);
            light.light.diffuse = color;
            light.light.specular = color;
            light.useCustomColor = true;
            light.customColor = colorHex;
          }
        }
      });
      
      document.getElementById('useCustomColor')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const colorPicker = document.getElementById('lightColorPicker') as HTMLInputElement;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            if (isChecked && colorPicker) {
              const color = BABYLON.Color3.FromHexString(colorPicker.value);
              light.light.diffuse = color;
              light.light.specular = color;
              light.useCustomColor = true;
              light.customColor = colorPicker.value;
            } else {
              // Revert to temperature-based color
              const color = studio.cctToColor(light.cct || 5600);
              light.light.diffuse = color;
              light.light.specular = color;
              light.useCustomColor = false;
            }
          }
        }
      });
      
      // ============================================
      // SHADOW CONTROLS
      // ============================================
      
      // Shadow Toggle
      document.getElementById('shadowToggle')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const statusEl = document.getElementById('shadowToggleStatus');
        if (statusEl) statusEl.textContent = isChecked ? 'PÅ' : 'AV';
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.shadowGenerator) {
            // Enable/disable shadow generator
            light.shadowGenerator.setDarkness(isChecked ? 0.3 : 1);
            light.shadowsEnabled = isChecked;
          }
        }
      });
      
      // Shadow Intensity
      document.getElementById('shadowIntensitySlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('shadowIntensityValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.shadowGenerator) {
            // Darkness 0 = fully dark shadows, 1 = no shadows
            const darkness = 1 - (value / 100);
            light.shadowGenerator.setDarkness(darkness);
          }
        }
      });
      
      // Shadow Blur
      document.getElementById('shadowBlurSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('shadowBlurValue');
        if (valueEl) valueEl.textContent = `${value}%`;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.shadowGenerator) {
            // Map 0-100 to blur kernel 0-64
            light.shadowGenerator.blurKernel = Math.floor((value / 100) * 64);
            light.shadowGenerator.useBlurExponentialShadowMap = value > 0;
          }
        }
      });
      
      // Shadow Bias
      document.getElementById('shadowBiasSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('shadowBiasValue');
        // Map 0-100 to 0.00-0.10
        const bias = value / 1000;
        if (valueEl) valueEl.textContent = bias.toFixed(3);
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.shadowGenerator) {
            light.shadowGenerator.bias = bias;
          }
        }
      });
      
      // Shadow Map Size
      document.getElementById('shadowMapSize')?.addEventListener('change', (e) => {
        const size = parseInt((e.target as HTMLSelectElement).value);
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.shadowGenerator) {
            // Need to recreate shadow generator with new size
            const oldGenerator = light.shadowGenerator;
            const newGenerator = new BABYLON.ShadowGenerator(size, light.light as BABYLON.IShadowLight);
            
            // Copy settings
            newGenerator.setDarkness(oldGenerator.getDarkness());
            newGenerator.blurKernel = oldGenerator.blurKernel;
            newGenerator.bias = oldGenerator.bias;
            newGenerator.useBlurExponentialShadowMap = oldGenerator.useBlurExponentialShadowMap;
            
            // Add shadow casters
            studio.scene.meshes.forEach(mesh => {
              if (mesh.receiveShadows) {
                newGenerator.addShadowCaster(mesh);
              }
            });
            
            // Dispose old and replace
            oldGenerator.dispose();
            light.shadowGenerator = newGenerator;
          }
        }
      });
      
      // ============================================
      // VISUALIZATION CONTROLS
      // ============================================
      
      // Show Beam Visualization
      document.getElementById('showBeamViz')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.beamVisualization) {
            light.beamVisualization.setEnabled(isChecked);
          }
        }
      });
      
      // Show Light Helper
      document.getElementById('showLightHelper')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Create or toggle light direction helper
            if (!light.directionHelper && isChecked) {
              // Create an arrow to show light direction
              const arrowLength = 2;
              const direction = light.light instanceof BABYLON.SpotLight ? 
                (light.light as BABYLON.SpotLight).direction.clone() : 
                new BABYLON.Vector3(0, -1, 0);
              
              light.directionHelper = BABYLON.MeshBuilder.CreateLines("lightHelper_" + studio.selectedLightId, {
                points: [
                  BABYLON.Vector3.Zero(),
                  direction.scale(arrowLength)
                ]
              }, studio.scene);
              light.directionHelper.parent = light.mesh;
              light.directionHelper.color = new BABYLON.Color3(1, 1, 0);
            }
            if (light.directionHelper) {
              light.directionHelper.setEnabled(isChecked);
            }
          }
        }
      });
      
      // Show Shadow Frustum
      document.getElementById('showShadowFrustum')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light && light.shadowGenerator) {
            // Babylon.js debug layer can show shadow frustums
            if (isChecked) {
              light.shadowGenerator.forceBackFacesOnly = false;
            }
          }
        }
      });
      
      // ============================================
      // LIGHT TARGETING CONTROLS
      // ============================================
      
      // Aim at Actor
      document.getElementById('aimAtActor')?.addEventListener('click', () => {
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            // Find the first avatar/actor in the scene
            let targetPos = new BABYLON.Vector3(0, 1.6, 0); // Default human head height
            
            // Look for avatar meshes
            studio.scene.meshes.forEach(mesh => {
              if (mesh.name.includes('avatar') || mesh.name.includes('actor') || mesh.name.includes('character')) {
                targetPos = mesh.getAbsolutePosition().clone();
                // Aim at upper body/head level
                const targetHeight = parseFloat((document.getElementById('targetHeightSlider') as HTMLInputElement)?.value || '160') / 100;
                targetPos.y = targetHeight;
              }
            });
            
            studio.aimLightAt(studio.selectedLightId, targetPos);
          }
        }
      });
      
      // Aim at Center
      document.getElementById('aimAtCenter')?.addEventListener('click', () => {
        if (studio.selectedLightId) {
          const targetHeight = parseFloat((document.getElementById('targetHeightSlider') as HTMLInputElement)?.value || '160') / 100;
          const targetPos = new BABYLON.Vector3(0, targetHeight, 0);
          studio.aimLightAt(studio.selectedLightId, targetPos);
        }
      });
      
      // Target Height
      document.getElementById('targetHeightSlider')?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const valueEl = document.getElementById('targetHeightValue');
        if (valueEl) valueEl.textContent = `${value}cm`;
      });

      // Light position controls
      const lightMoveStep = 0.3;
      const lightHeightStep = 0.2;

      const moveLightDirection = (dx: number, dy: number, dz: number) => {
        if (studio.selectedLightId) {
          const light = studio.lights.get(studio.selectedLightId);
          if (light) {
            light.mesh.position.x += dx;
            light.mesh.position.y += dy;
            light.mesh.position.z += dz;
            if (light.light instanceof BABYLON.SpotLight || light.light instanceof BABYLON.DirectionalLight) {
              light.light.position.x += dx;
              light.light.position.y += dy;
              light.light.position.z += dz;
            }
          }
        }
      };

      // Position buttons
      document.getElementById('lightUp')?.addEventListener('click', () => moveLightDirection(0, 0, -lightMoveStep));
      document.getElementById('lightDown')?.addEventListener('click', () => moveLightDirection(0, 0, lightMoveStep));
      document.getElementById('lightLeft')?.addEventListener('click', () => moveLightDirection(-lightMoveStep, 0, 0));
      document.getElementById('lightRight')?.addEventListener('click', () => moveLightDirection(lightMoveStep, 0, 0));
      document.getElementById('lightHeightUp')?.addEventListener('click', () => moveLightDirection(0, lightHeightStep, 0));
      document.getElementById('lightHeightDown')?.addEventListener('click', () => moveLightDirection(0, -lightHeightStep, 0));

      // Populate light type selector from LIGHT_DATABASE
      const lightTypeSelect = document.getElementById('lightTypeSelect') as HTMLSelectElement;
      if (lightTypeSelect) {
        // Clear existing options
        lightTypeSelect.innerHTML = '';
        
        // Group lights by type
        const strobeLights = LIGHT_DATABASE.filter(l => l.type === 'strobe' || l.type === 'flash');
        const continuousLights = LIGHT_DATABASE.filter(l => l.type === 'led' || l.type === 'continuous');
        
        // Add optgroup for strobes/flashes
        if (strobeLights.length > 0) {
          const strobeGroup = document.createElement('optgroup');
          strobeGroup.label = '📸 Blits / Flash';
          strobeLights.forEach(light => {
            const opt = document.createElement('option');
            opt.value = light.id;
            const powerStr = `${light.power}${light.powerUnit}`;
            opt.textContent = `${light.brand} ${light.model} (${powerStr})`;
            strobeGroup.appendChild(opt);
          });
          lightTypeSelect.appendChild(strobeGroup);
        }
        
        // Add optgroup for continuous/LED lights
        if (continuousLights.length > 0) {
          const continuousGroup = document.createElement('optgroup');
          continuousGroup.label = '💡 Videolys / Continuous';
          continuousLights.forEach(light => {
            const opt = document.createElement('option');
            opt.value = light.id;
            const powerStr = `${light.power}${light.powerUnit}`;
            opt.textContent = `${light.brand} ${light.model} (${powerStr})`;
            continuousGroup.appendChild(opt);
          });
          lightTypeSelect.appendChild(continuousGroup);
        }
      }

      // Add new light button
      document.getElementById('addNewLightBtn')?.addEventListener('click', () => {
        const lightTypeSelect = document.getElementById('lightTypeSelect') as HTMLSelectElement;
        const selectedType = lightTypeSelect?.value || 'godox-ad600';
        if (selectedType) {
          const pos = new BABYLON.Vector3(
            (Math.random() - 0.5) * 6,
            3 + Math.random() * 2,
            (Math.random() - 0.5) * 4
          );
          studio.addLight(selectedType, pos);
          updateLightSelectionList();
        }
      });

      // Update light selection list
      const updateLightSelectionList = () => {
        const listEl = document.getElementById('lightSelectionList');
        const countEl = document.getElementById('sceneLightCount');
        const scrollIndicator = document.getElementById('scrollIndicator');
        if (!listEl) return;
        
        // Update light count indicator
        const lightCount = studio.lights.size;
        if (countEl) {
          countEl.textContent = `(${lightCount})`;
          countEl.style.background = lightCount > 0 ? 'rgba(76,175,80,0.3)' : 'rgba(255,170,0,0.3)';
          countEl.style.color = lightCount > 0 ? '#4CAF50' : '#ffaa00';
        }

        if (lightCount === 0) {
          listEl.innerHTML = '<div style="padding:10px;text-align:center;color:rgba(255,255,255,0.4);font-size:13px;">Ingen lys i scenen</div>';
          if (scrollIndicator) scrollIndicator.style.display = 'none';
          return;
        }

        listEl.innerHTML = '';
        studio.lights.forEach((data, id) => {
          const item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;padding:8px 10px;background:rgba(255,170,0,0.1);border-radius:6px;cursor:pointer;gap:8px;';
          const isEnabled = data.enabled !== false; // Default to true if not set
          item.innerHTML = `
            <div style="width:10px;height:10px;border-radius:50%;background:${studio.selectedLightId === id ? '#ffaa00' : 'rgba(255,170,0,0.4)'};"></div>
            <span style="flex:1;font-size:13px;color:${studio.selectedLightId === id ? '#fff' : 'rgba(255,255,255,0.7)'};">${data.name}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.4);">${data.cct}K</span>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;margin-right:4px;">
              <input type="checkbox" class="light-list-toggle" data-id="${id}" ${isEnabled ? 'checked' : ''} style="width:32px;height:18px;accent-color:#4CAF50;cursor:pointer;appearance:none;background:${isEnabled ? 'rgba(76,175,80,0.5)' : 'rgba(158,158,158,0.3)'};border-radius:9px;position:relative;transition:all 0.2s;">
            </label>
            <button class="delete-light-btn" data-id="${id}" style="background:rgba(255,0,0,0.2);border:none;color:#ff6b6b;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">✕</button>
          `;
          
          // Toggle switch handler
          const toggleSwitch = item.querySelector('.light-list-toggle') as HTMLInputElement;
          if (toggleSwitch) {
            toggleSwitch.addEventListener('change', (e) => {
              e.stopPropagation(); // Prevent triggering the item click
              const isChecked = (e.target as HTMLInputElement).checked;
              studio.toggleLight(id, isChecked);
              updateLightSelectionList(); // Refresh list to update visual state
            });
          }

          item.addEventListener('click', (e) => {
            // Don't trigger selection if clicking on toggle or delete button
            if ((e.target as HTMLElement).classList.contains('delete-light-btn') || 
                (e.target as HTMLElement).classList.contains('light-list-toggle') ||
                (e.target as HTMLElement).tagName === 'INPUT' ||
                (e.target as HTMLElement).tagName === 'LABEL') {
              if ((e.target as HTMLElement).classList.contains('delete-light-btn')) {
                const lightId = (e.target as HTMLElement).dataset.id;
                if (lightId) {
                  studio.removeLight(lightId);
                  updateLightSelectionList();
                }
              }
              return;
            }
            studio.selectLight(id);
            updateLightSelectionList();
            updateLightSettingsFromSelected();
          });
          listEl.appendChild(item);
        });
        
        // Show/hide scroll indicator based on scrollable content
        setTimeout(() => {
          if (scrollIndicator) {
            const isScrollable = listEl.scrollHeight > listEl.clientHeight;
            const isAtBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 5;
            scrollIndicator.style.display = isScrollable && !isAtBottom ? 'block' : 'none';
          }
        }, 10);
        
        // Update scroll indicator on scroll
        listEl.onscroll = () => {
          if (scrollIndicator) {
            const isAtBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 5;
            scrollIndicator.style.display = isAtBottom ? 'none' : 'block';
          }
        };
      };

      // Update light settings panel from selected light
      // Azimuth/Elevation direction controls - declare before use
      const azimuthSlider = document.getElementById('azimuthSlider') as HTMLInputElement;
      const elevationSlider = document.getElementById('elevationSlider') as HTMLInputElement;
      const azimuthValue = document.getElementById('azimuthValue');
      const elevationValue = document.getElementById('elevationValue');
      const resetLightDirectionBtn = document.getElementById('resetLightDirection');
      
      const updateLightSettingsFromSelected = () => {
        const settingsSection = document.getElementById('lightSettingsSection');
        const selectedNameEl = document.getElementById('selectedLightName');
        const lightToggleSwitch = document.getElementById('lightToggleSwitch') as HTMLInputElement;
        const lightToggleStatus = document.getElementById('lightToggleStatus');

        if (!studio.selectedLightId) {
          if (settingsSection) {
            settingsSection.style.opacity = '0.5';
            settingsSection.style.pointerEvents = 'none';
          }
          if (selectedNameEl) selectedNameEl.textContent = '';
          if (lightToggleSwitch) lightToggleSwitch.checked = false;
          if (lightToggleStatus) lightToggleStatus.textContent = 'AV';
          return;
        }

        const light = studio.lights.get(studio.selectedLightId);
        if (!light) return;

        if (settingsSection) {
          settingsSection.style.opacity = '1';
          settingsSection.style.pointerEvents = 'auto';
        }

        // Update toggle switch state
        const isEnabled = light.enabled !== false; // Default to true if not set
        if (lightToggleSwitch) {
          lightToggleSwitch.checked = isEnabled;
        }
        if (lightToggleStatus) {
          lightToggleStatus.textContent = isEnabled ? 'PÅ' : 'AV';
        }
        if (selectedNameEl) selectedNameEl.textContent = `(${light.name})`;

        // Update CCT/temp display
        const tempSteps = [2700, 3200, 4000, 5000, 5600, 6500, 7500];
        const foundIndex = tempSteps.indexOf(light.cct);
        tempIndex = foundIndex === -1 ? 4 : foundIndex; // Default to 5600K if not found

        // Get brand-specific power steps for this light
        const lightSpec = getLightById(light.type);
        const brand = lightSpec?.brand;
        currentPowerSteps = studio.getPowerStepsForLight(light.type, brand);
        
        // Update power index based on powerMultiplier
        if (light.powerMultiplier !== undefined) {
          // Find closest matching step
          let closestIndex = 0;
          let minDiff = Math.abs(light.powerMultiplier - currentPowerSteps.values[0]);
          for (let i = 1; i < currentPowerSteps.values.length; i++) {
            const diff = Math.abs(light.powerMultiplier - currentPowerSteps.values[i]);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = i;
            }
          }
          powerIndex = closestIndex;
        } else {
          // Default to full power (last index)
          powerIndex = currentPowerSteps.values.length - 1;
        }

        // Update intensity slider
        const intensitySliderEl = document.getElementById('intensitySlider') as HTMLInputElement;
        if (intensitySliderEl && light.powerMultiplier !== undefined) {
          const percent = Math.round(light.powerMultiplier * 100);
          intensitySliderEl.value = String(Math.max(0, Math.min(100, percent)));
        }

        // Update beam angle index
        const beamStepsArray = [15, 30, 45, 60, 90, 120];
        if (light.light instanceof BABYLON.SpotLight) {
          const angleDeg = (light.light.angle * 180) / Math.PI;
          beamIndex = beamStepsArray.indexOf(Math.round(angleDeg));
          if (beamIndex === -1) {
            // Find closest beam angle
            let closestIndex = 0;
            let minDiff = Math.abs(angleDeg - beamStepsArray[0]);
            for (let i = 1; i < beamStepsArray.length; i++) {
              const diff = Math.abs(angleDeg - beamStepsArray[i]);
              if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
              }
            }
            beamIndex = closestIndex;
          }
        }

        // Update softness slider based on exponent
        const softnessSliderEl = document.getElementById('softnessSlider') as HTMLInputElement;
        if (softnessSliderEl && light.light instanceof BABYLON.SpotLight) {
          // Map exponent (0-128) to softness (0-100)
          const softness = Math.round((light.light.exponent / 128) * 100);
          softnessSliderEl.value = String(Math.max(0, Math.min(100, softness)));
        }

        // Update modifier select
        const modifierSelectEl = document.getElementById('modifierSelect') as HTMLSelectElement;
        if (modifierSelectEl) {
          modifierSelectEl.value = light.modifier || 'none';
        }

        // Update display
        updateLightDisplay();
        
        // Update azimuth/elevation sliders (use variables declared outside function)
        if (azimuthSlider && elevationSlider) {
          // Calculate current azimuth/elevation from light direction if not manually set
          if (light.azimuth === undefined || light.elevation === undefined) {
            // Calculate from current light direction
            if (light.light instanceof BABYLON.SpotLight) {
              const dir = light.light.direction;
              // Convert direction vector to azimuth/elevation (spherical coordinates)
              // Use precise calculations for accurate conversion
              const azimuthOffset = -180;
              const elevationOffset = -10;
              
              // Precise azimuth calculation: angle in XZ plane from negative Z axis
              const azimuthRad = Math.atan2(dir.x, -dir.z);
              const azimuth = azimuthRad * 180 / Math.PI + azimuthOffset;
              
              // Precise elevation calculation: angle from horizontal plane
              // Clamp Y component to valid range for asin [-1, 1]
              const clampedY = Math.max(-1, Math.min(1, dir.y));
              const elevationRad = -Math.asin(clampedY);
              const elevation = elevationRad * 180 / Math.PI + elevationOffset;
              
              light.azimuth = azimuth;
              light.elevation = elevation;
            } else {
              light.azimuth = 0;
              light.elevation = 0;
            }
          }
          
          azimuthSlider.value = String(Math.round(light.azimuth));
          elevationSlider.value = String(Math.round(light.elevation));
          
          if (azimuthValue) azimuthValue.textContent = `${Math.round(light.azimuth)}°`;
          if (elevationValue) elevationValue.textContent = `${Math.round(light.elevation)}°`;
        }


        // Update modeling light section (only for strobes)
        const modelingLightSection = document.getElementById('modelingLightSection');
        const modelingLightToggle = document.getElementById('modelingLightToggle') as HTMLInputElement;
        const modelingLightStatus = document.getElementById('modelingLightStatus');
        const modelingLightPower = document.getElementById('modelingLightPower');
        const modelingLightLux = document.getElementById('modelingLightLux');
        
        const modelingLightSpec = getLightById(light.type);
        const isStrobe = modelingLightSpec?.type === 'strobe' || modelingLightSpec?.type === 'flash';
        const hasModelingLight = isStrobe && modelingLightSpec?.modelingLightPower;
        
        if (modelingLightSection) {
          modelingLightSection.style.display = hasModelingLight ? 'flex' : 'none';
        }
        
        if (hasModelingLight && modelingLightToggle && modelingLightStatus && modelingLightPower && modelingLightLux) {
          modelingLightToggle.checked = light.modelingLightEnabled || false;
          modelingLightStatus.textContent = light.modelingLightEnabled ? 'På' : 'Av';
          
          // Show modeling light specs
          if (modelingLightSpec.modelingLightPower) {
            modelingLightPower.textContent = String(modelingLightSpec.modelingLightPower);
          }
          if (modelingLightSpec.modelingLightLux1m) {
            modelingLightLux.textContent = modelingLightSpec.modelingLightLux1m.toLocaleString();
          } else {
            modelingLightLux.textContent = '-';
          }
        }
        updateLightDisplay();
      };

      // Azimuth/Elevation direction controls - event listeners
      if (azimuthSlider) {
        azimuthSlider.addEventListener('input', (e) => {
          const value = parseInt((e.target as HTMLInputElement).value);
          if (azimuthValue) azimuthValue.textContent = `${value}°`;
          
          if (studio.selectedLightId) {
            const light = studio.lights.get(studio.selectedLightId);
            if (light) {
              light.azimuth = value;
              // Trigger light direction update
              studio.scene.render();
            }
          }
        });
      }
      
      if (elevationSlider) {
        elevationSlider.addEventListener('input', (e) => {
          const value = parseInt((e.target as HTMLInputElement).value);
          if (elevationValue) elevationValue.textContent = `${value}°`;
          
          if (studio.selectedLightId) {
            const light = studio.lights.get(studio.selectedLightId);
            if (light) {
              light.elevation = value;
              // Trigger light direction update
              studio.scene.render();
            }
          }
        });
      }
      
      if (resetLightDirectionBtn) {
        resetLightDirectionBtn.addEventListener('click', () => {
          if (studio.selectedLightId) {
            const light = studio.lights.get(studio.selectedLightId);
            if (light) {
              light.azimuth = undefined;
              light.elevation = undefined;
              
              // Reset sliders
              if (azimuthSlider) {
                azimuthSlider.value = '0';
                if (azimuthValue) azimuthValue.textContent = '0°';
              }
              if (elevationSlider) {
                elevationSlider.value = '0';
                if (elevationValue) elevationValue.textContent = '0°';
              }
              
              // Trigger light direction update to use automatic calculation
              studio.scene.render();
            }
          }
        });
      }

      // Listen for light selection changes
      window.addEventListener('light-selected', () => {
        updateLightSelectionList();
        updateLightSettingsFromSelected();
      });
      
      // Listen for light deletion (Delete/Backspace key)
      window.addEventListener('light-deleted', () => {
        updateLightSelectionList();
        updateLightSettingsFromSelected();
      });

      // Initial population
      setTimeout(() => {
        updateLightSelectionList();
        updateLightSettingsFromSelected();
      }, 500);

      // Light preset buttons (Key, Fill, Rim)
      document.querySelectorAll('.light-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = btn.getAttribute('data-preset');
          if (!preset) return;
          
          // Define preset positions and settings
          const presets: Record<string, { pos: [number, number, number], cct: number, intensity: number }> = {
            key: { pos: [2, 3, 2], cct: 5600, intensity: 1.0 },
            fill: { pos: [-1.5, 2.5, 2], cct: 5600, intensity: 0.4 },
            rim: { pos: [-2, 3.5, -2], cct: 5600, intensity: 0.8 }
          };
          
          const presetData = presets[preset];
          if (!presetData) return;
          
          // Add light at preset position
          const pos = new BABYLON.Vector3(...presetData.pos);
          studio.addLight('godox-ad600', pos);
          
          // Update light settings after a short delay to ensure light is created
          setTimeout(() => {
            if (studio.selectedLightId) {
              const light = studio.lights.get(studio.selectedLightId);
              if (light) {
                light.cct = presetData.cct;
                light.light.intensity = presetData.intensity;
                light.intensity = presetData.intensity;
                const color = studio.cctToColor(presetData.cct);
                light.light.diffuse = color;
                (light.mesh.material as BABYLON.StandardMaterial).emissiveColor = color;
                
                // Update UI
                updateLightSelectionList();
                updateLightSettingsFromSelected();
              }
            }
          }, 100);
        });
      });

      // 3-Point Lighting Preset Button
      document.getElementById('threePointPresetBtn')?.addEventListener('click', () => {
        console.log('Applying 3-Point Lighting preset...');
        
        // Clear existing lights first
        studio.clearAllLights();
        
        // Apply the 3-point lighting setup
        studio.setupDefaultLighting();
        
        // Update UI after lights are created
        setTimeout(() => {
          updateLightSelectionList();
          updateLightSettingsFromSelected();
        }, 500);
      });

      // Open Light Patterns panel (Hollywood)
      document.getElementById('openLightPatternsBtn')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('openCinematographyPatterns'));
        console.log('Opening Hollywood cinematography patterns panel');
      });

      // Open Photo Light Patterns panel
      document.getElementById('openPhotoLightPatternsBtn')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('openLightPatternLibrary'));
        console.log('Opening photo light pattern library');
      });
      
      // Open Avatar Generator panel
      document.getElementById('openAvatarGeneratorBtn')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('openAvatarGenerator'));
        console.log('Opening avatar generator panel');
      });
      
      // Handle avatar generation completed
      window.addEventListener('avatarGenerated', (event: Event) => {
        const customEvent = event as CustomEvent;
        const { glbUrl, metadata } = customEvent.detail;
        console.log('Avatar generated event received:', glbUrl, metadata);
        console.log('window.virtualStudio exists:', !!window.virtualStudio);
        
        // Load the avatar GLB into the scene with name and category
        if (window.virtualStudio) {
          console.log('Calling loadAvatarModel...');
          window.virtualStudio.loadAvatarModel(glbUrl, {
            name: metadata?.name,
            category: metadata?.category
          }).then(() => {
            console.log('Avatar loaded successfully!');
          }).catch((err: any) => {
            console.error('Failed to load avatar:', err);
          });
        } else {
          console.error('window.virtualStudio is not available!');
        }
      });
      
      // Drag functionality for camera controls panel
      const panelHeader = document.getElementById('cameraControlsHeader');
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      
      const startDrag = (clientX: number, clientY: number) => {
        if (!cameraControlsPanel) return;
        isDragging = true;
        const rect = cameraControlsPanel.getBoundingClientRect();
        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;
        cameraControlsPanel.style.transition = 'none';
        cameraControlsPanel.style.right = 'auto';
        if (panelHeader) panelHeader.style.cursor = 'grabbing';
      };
      
      const doDrag = (clientX: number, clientY: number) => {
        if (!isDragging || !cameraControlsPanel) return;
        const viewport = document.getElementById('main-viewport');
        if (!viewport) return;
        const viewportRect = viewport.getBoundingClientRect();
        
        let newX = clientX - dragOffsetX - viewportRect.left;
        let newY = clientY - dragOffsetY - viewportRect.top;
        
        // Constrain to viewport
        const panelRect = cameraControlsPanel.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, viewportRect.width - panelRect.width));
        newY = Math.max(0, Math.min(newY, viewportRect.height - panelRect.height));
        
        cameraControlsPanel.style.left = newX + 'px';
        cameraControlsPanel.style.top = newY + 'px';
      };
      
      const endDrag = () => {
        isDragging = false;
        if (cameraControlsPanel) {
          cameraControlsPanel.style.transition = 'opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease';
        }
        if (panelHeader) panelHeader.style.cursor = 'grab';
      };
      
      panelHeader?.addEventListener('pointerdown', (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
      });
      
      document.addEventListener('pointermove', (e) => {
        if (isDragging) {
          e.preventDefault();
          doDrag(e.clientX, e.clientY);
        }
      });
      
      document.addEventListener('pointerup', endDrag);
      document.addEventListener('pointercancel', endDrag);
      
      console.log('Camera controls initialized with drag, hold-to-move, speed control, and camera settings');
    }
    
    // Mount Accessible 3D Controls with camera connection (hidden, kept for accessibility)
    const accessible3DControlsRoot = document.getElementById('accessible3DControlsRoot');
    if (accessible3DControlsRoot) {
      const controls3DRoot = createRoot(accessible3DControlsRoot);
      
      // Get initial camera state from Babylon.js camera
      const getCameraState = () => {
        const pos = studio.getCameraPosition();
        const target = studio.getCameraTarget();
        return {
          position: [pos.x, pos.y, pos.z] as [number, number, number],
          target: [target.x, target.y, target.z] as [number, number, number],
          zoom: 1.0,
          fov: studio.getCameraFov()
        };
      };
      
      // Get scene objects from store
      const getSceneObjects = () => {
        const store = useAppStore.getState();
        return store.scene.map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          position: node.transform.position,
          rotation: node.transform.rotation,
          scale: node.transform.scale,
          visible: node.visible
        }));
      };
      
      // Get selected object
      const getSelectedObject = () => {
        const store = useAppStore.getState();
        const selectedId = store.selectedNodeId;
        if (!selectedId) return null;
        const node = store.getNode(selectedId);
        if (!node) return null;
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          position: node.transform.position,
          rotation: node.transform.rotation,
          scale: node.transform.scale,
          visible: node.visible
        };
      };
      
      // Camera change handler
      const handleCameraChange = (state: Partial<{
        position: [number, number, number];
        target: [number, number, number];
        zoom: number;
        fov: number;
      }>) => {
        if (state.position) {
          studio.setCameraPosition(new BABYLON.Vector3(state.position[0], state.position[1], state.position[2]));
        }
        if (state.target) {
          studio.setCameraTarget(new BABYLON.Vector3(state.target[0], state.target[1], state.target[2]));
        }
        if (state.fov !== undefined) {
          studio.setCameraFov(state.fov);
        }
        renderControls();
      };
      
      // Camera reset handler
      const handleCameraReset = () => {
        studio.resetCamera();
        renderControls();
      };
      
      // Object select handler
      const handleObjectSelect = (id: string | null) => {
        const store = useAppStore.getState();
        store.selectNode(id);
        renderControls();
      };
      
      // Object transform handler
      const handleObjectTransform = (id: string, transform: Partial<{
        id: string;
        name: string;
        type: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
        visible: boolean;
      }>) => {
        const store = useAppStore.getState();
        if (transform.position || transform.rotation || transform.scale) {
          store.updateNode(id, {
            transform: {
              position: transform.position || store.getNode(id)?.transform.position || [0, 0, 0],
              rotation: transform.rotation || store.getNode(id)?.transform.rotation || [0, 0, 0],
              scale: transform.scale || store.getNode(id)?.transform.scale || [1, 1, 1]
            }
          });
        }
        if (transform.visible !== undefined) {
          store.updateNode(id, { visible: transform.visible });
        }
        renderControls();
      };
      
      const renderControls = () => {
        controls3DRoot.render(React.createElement(Accessible3DControlsApp, {
          cameraState: getCameraState(),
          selectedObject: getSelectedObject(),
          objects: getSceneObjects(),
          onCameraChange: handleCameraChange,
          onCameraReset: handleCameraReset,
          onObjectSelect: handleObjectSelect,
          onObjectTransform: handleObjectTransform
        }));
      };
      
      // Initial render
      renderControls();
      
      // Re-render when store changes
      useAppStore.subscribe(() => {
        renderControls();
      });
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
          // Close other panels when opening Studio Library
          const marketplacePanel = document.getElementById('marketplacePanel');
          const aiAssistantPanel = document.getElementById('aiAssistantPanel');
          const castingPlannerPanel = document.getElementById('castingPlannerPanel');

          if (marketplacePanel && marketplacePanel.classList.contains('open')) {
            window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
          }
          if (aiAssistantPanel && aiAssistantPanel.classList.contains('open')) {
            window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
          }
          if (castingPlannerPanel && castingPlannerPanel.classList.contains('open')) {
            window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
          }

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
        
        // Auto-expand the group when adding items
        if (group) {
          group.style.display = 'block';
          const header = group.previousElementSibling;
          if (header && header.classList.contains('hierarchy-header')) {
            header.setAttribute('aria-expanded', 'true');
            header.classList.add('expanded');
          }
        }
        
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
              
              // For lights, also select in 3D scene and open light panel
              if (type === 'light' && id.startsWith('light')) {
                studio.selectLight(id);
              }
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
      
      // Expose addToHierarchy globally for use by character loader
      (window as any).addToHierarchy = addToHierarchy;
      
      // Function to add avatar to Studio Library "Mine Avatarer" section
      const addToStudioLibrary = (id: string, name: string, _modelUrl: string) => {
        const section = document.getElementById('generatedAvatarsSection');
        const list = document.getElementById('generatedAvatarsList');
        if (!section || !list) return;
        
        section.style.display = 'block';
        
        // Create avatar card matching the gallery style
        const card = document.createElement('div');
        card.className = 'actor-model-card';
        card.setAttribute('data-id', id);
        card.innerHTML = `
          <div class="model-portrait" style="background:linear-gradient(135deg, rgba(0,212,255,0.3), rgba(138,43,226,0.3));">
            <span style="font-size:32px;line-height:110px;">🧑</span>
          </div>
          <div class="model-name">${name}</div>
          <div style="position:absolute;top:4px;left:4px;background:rgba(0,212,255,0.8);color:#fff;font-size:9px;padding:2px 4px;border-radius:3px;">I scene</div>
        `;
        
        // Click to select/focus the avatar in scene
        card.addEventListener('click', () => {
          // Select in hierarchy
          const hierarchyItem = document.querySelector(`.hierarchy-item[data-id="${id}"]`) as HTMLElement;
          if (hierarchyItem) {
            hierarchyItem.click();
          }
          // Focus camera on the model
          useAppStore.getState().selectNode(id);
          console.log('Selected avatar in scene:', name);
        });
        
        list.appendChild(card);
        console.log('Added avatar to Studio Library:', name);
      };
      
      // Expose addToStudioLibrary globally
      (window as any).addToStudioLibrary = addToStudioLibrary;
      
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
        models: ['Alle', 'Kvinner', 'Menn', 'Barn', 'Dyr'],
        lights: [],
        camera: [],
        equipment: [],
        assets: [],
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
          const sidebarEl = document.querySelector('.actor-sidebar') as HTMLElement;
          if (categoriesEl && sidebarEl) {
            const cats = categoryConfig[tabName] || [];
            if (cats.length === 0) {
              sidebarEl.style.display = 'none';
            } else {
              sidebarEl.style.display = 'flex';
              categoriesEl.style.display = 'flex';
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
          }
        });
      });
    }
    
    // Secondary menu bar event listeners
    const menuCastingPlanner = document.getElementById('menuCastingPlanner');
    const menuHjelp = document.getElementById('menuHjelp');
    const menuMarketplace = document.getElementById('menuMarketplace');
    const menuStudioLibrary = document.getElementById('menuStudioLibrary');
    const menuPanelCreator = document.getElementById('menuPanelCreator');
    const menuSceneHierarchy = document.getElementById('menuSceneHierarchy');
    
    if (menuCastingPlanner) {
      menuCastingPlanner.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
      });
    }
    
    if (menuHjelp) {
      menuHjelp.addEventListener('click', () => {
        const helpPanel = document.getElementById('helpPanel');
        const helpTrigger = document.getElementById('helpPanelTrigger');
        if (helpPanel && helpTrigger) {
          const isOpen = helpPanel.classList.contains('open');
          if (isOpen) {
            helpPanel.classList.remove('open');
            helpPanel.style.display = 'none';
            helpTrigger.classList.remove('active');
          } else {
            helpPanel.style.display = 'flex';
            helpPanel.classList.add('open');
            helpTrigger.classList.add('active');
          }
        }
      });
    }
    
    if (menuMarketplace) {
      menuMarketplace.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
      });
    }
    
    if (menuStudioLibrary) {
      menuStudioLibrary.addEventListener('click', () => {
        const actorBottomPanel = document.getElementById('actorBottomPanel');
        const actorPanelTrigger = document.getElementById('actorPanelTrigger');
        if (actorBottomPanel && actorPanelTrigger) {
          const isOpen = actorBottomPanel.classList.contains('open');
          if (isOpen) {
            actorBottomPanel.classList.remove('open');
            actorPanelTrigger.classList.remove('active');
          } else {
            actorBottomPanel.classList.add('open');
            actorPanelTrigger.classList.add('active');
          }
        }
      });
    }
    
    if (menuPanelCreator) {
      menuPanelCreator.addEventListener('click', () => {
        console.log('Menu Panel Creator clicked, dispatching event');
        // Dispatch event to open Panel Creator dialog
        window.dispatchEvent(new CustomEvent('open-panel-creator'));
      });
    }
    
    // Also add click handler to the panel creator trigger button itself
    const panelCreatorTriggerBtn = document.getElementById('panelCreatorTriggerBtn');
    if (panelCreatorTriggerBtn) {
      panelCreatorTriggerBtn.addEventListener('click', () => {
        console.log('Panel Creator trigger button clicked, dispatching event');
        // Dispatch event to open Panel Creator dialog
        window.dispatchEvent(new CustomEvent('open-panel-creator'));
      });
    }
    
    if (menuSceneHierarchy) {
      menuSceneHierarchy.addEventListener('click', () => {
        const leftPanel = document.querySelector('.left-panel') as HTMLElement;
        if (leftPanel) {
          const isOpen = leftPanel.classList.contains('floating-open');
          if (isOpen) {
            leftPanel.classList.remove('floating-open');
            menuSceneHierarchy.classList.remove('active');
          } else {
            leftPanel.classList.add('floating-open');
            menuSceneHierarchy.classList.add('active');
          }
        }
      });
    }
  }
});
