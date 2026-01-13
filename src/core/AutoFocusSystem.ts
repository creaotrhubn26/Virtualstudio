import * as BABYLON from '@babylonjs/core';
import { useAutoFocusStore, DetectedEye, AutoFocusTarget } from '../state/store';
import { useFocusStore } from '../state/store';

export class AutoFocusSystem {
  private scene: BABYLON.Scene;
  private camera: BABYLON.ArcRotateCamera;
  private updateInterval: number | null = null;
  private currentFocusDistance: number = 2.0;
  private targetFocusDistance: number = 2.0;
  private eyeIndicatorMeshes: Map<string, BABYLON.Mesh> = new Map();
  private focusFrameMesh: BABYLON.Mesh | null = null;
  private isInitialized: boolean = false;
  private isTransitioningToTarget: boolean = false; // Flag for AF-S initial transition
  private lastLoggedFocus: string = ''; // Track last logged focus to avoid spam
  
  // Performance optimization: cache and throttle
  private lastCameraPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  private cachedEyeMeshes: BABYLON.AbstractMesh[] | null = null;
  private lastEyeCacheTime: number = 0;
  private readonly EYE_CACHE_TTL = 2000; // Refresh eye mesh cache every 2 seconds
  private lastFocusDistanceUpdate: number = 0;
  private readonly FOCUS_UPDATE_THRESHOLD = 0.001; // Minimum change to trigger update
  
  constructor(scene: BABYLON.Scene, camera: BABYLON.ArcRotateCamera) {
    this.scene = scene;
    this.camera = camera;
    this.initialize();
  }
  
  private initialize(): void {
    if (this.isInitialized) return;
    
    useAutoFocusStore.subscribe((state, prevState) => {
      if (state.mode !== prevState.mode) {
        this.handleModeChange(state.mode);
      }
      if (state.showEyeIndicators !== prevState.showEyeIndicators) {
        this.updateEyeIndicatorVisibility(state.showEyeIndicators);
      }
    });
    
    this.scene.onBeforeRenderObservable.add(() => {
      this.smoothFocusTransition();
    });
    
    // Listen for focus target type changes from DOF animation presets
    window.addEventListener('vs-set-focus-target-type', ((e: CustomEvent) => {
      const { targetType } = e.detail;
      this.handleFocusTargetTypeChange(targetType);
    }) as EventListener);
    
    this.isInitialized = true;
    console.log('[AutoFocusSystem] Initialized');
    
    // Auto-start tracking if default mode is AF-C
    const initialMode = useAutoFocusStore.getState().mode;
    if (initialMode === 'AF-C') {
      // Delay slightly to ensure scene is fully loaded
      setTimeout(() => {
        this.startContinuousTracking();
        console.log('[AutoFocusSystem] Auto-started AF-C tracking on init');
      }, 500);
    }
  }
  
  private handleModeChange(mode: string): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    switch (mode) {
      case 'AF-C':
        // Clear focus lock when entering AF-C - continuous mode should always track
        useAutoFocusStore.getState().setFocusLocked(false);
        useAutoFocusStore.getState().setCurrentTarget(null);
        this.isTransitioningToTarget = false;
        this.startContinuousTracking();
        break;
      case 'AF-S':
        this.detectEyes();
        break;
      case 'MF':
        this.stopTracking();
        break;
    }
    
    console.log(`[AutoFocusSystem] Mode changed to: ${mode}`);
  }
  
  public startContinuousTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // AF-C mode: Fast continuous tracking with cached mesh scanning
    // 150ms interval runs detection every tick using cached eye meshes for speed
    this.updateInterval = window.setInterval(() => {
      const store = useAutoFocusStore.getState();
      if (store.mode === 'AF-C') {
        this.lastCameraPosition = this.camera.position.clone();
        // Run detection every tick - eye mesh caching handles performance
        this.detectAndFocusWithFallback();
      }
    }, 150);
    
    // Run detection immediately on start
    this.detectAndFocusWithFallback();
  }
  
  // Detect eyes with fallback to head/geometry detection
  private detectAndFocusWithFallback(): void {
    // Skip if tracking is paused (e.g., after manual click-to-focus)
    if (this.isPaused) {
      return;
    }
    
    this.detectEyes();
    const store = useAutoFocusStore.getState();
    const nearestEye = store.getNearestEye();
    
    if (nearestEye) {
      this.setFocusTarget(nearestEye);
    } else {
      // Fallback 1: Try head/face detection
      const headTarget = this.detectHeadFallback();
      if (headTarget) {
        this.setFocusTarget(headTarget);
      } else {
        // Fallback 2: Try geometry-based detection (top of model)
        const topTarget = this.detectTopOfModelFallback();
        if (topTarget) {
          this.setFocusTarget(topTarget);
        }
      }
    }
  }
  
  public stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    useAutoFocusStore.getState().setFocusLocked(false);
    useAutoFocusStore.getState().setCurrentTarget(null);
    
    // Reset transitioning flag
    this.isTransitioningToTarget = false;
    
    // Sync current and target focus distances to prevent jumps when switching modes
    const currentStoredDistance = useFocusStore.getState().focusDistance;
    this.currentFocusDistance = currentStoredDistance;
    this.targetFocusDistance = currentStoredDistance;
    
    this.clearEyeIndicators();
    console.log('[AutoFocusSystem] Tracking stopped');
  }
  
  // Temporarily pause tracking (for manual focus override)
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private isPaused: boolean = false;
  
  public pauseTracking(durationMs: number = 2000): void {
    this.isPaused = true;
    
    // Clear any existing pause timeout
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
    
    // Resume after the specified duration
    this.pauseTimeout = setTimeout(() => {
      this.isPaused = false;
    }, durationMs);
  }
  
  public resumeTracking(enterContinuousMode: boolean = false): void {
    // Clear any pending pause timeout
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    
    this.isPaused = false;
    
    // Optionally switch to AF-C mode and restart continuous tracking
    if (enterContinuousMode) {
      useAutoFocusStore.getState().setMode('AF-C');
      this.startContinuousTracking();
      console.log('[AutoFocusSystem] Tracking resumed and entered AF-C mode');
    } else {
      console.log('[AutoFocusSystem] Tracking resumed');
    }
  }
  
  /**
   * Handle focus target type changes from DOF animation presets.
   * Supports 'eye', 'subject', and other target types for AF reacquisition.
   */
  private handleFocusTargetTypeChange(targetType: string): void {
    console.log(`[AutoFocusSystem] Focus target type changed to: ${targetType}`);
    
    // Update store with new focus target type
    const validTargetTypes = ['eye', 'subject', 'face', 'plane', 'background', 'foreground', 'custom', 'auto'];
    if (validTargetTypes.includes(targetType)) {
      useAutoFocusStore.getState().setFocusTargetType(targetType as any);
    } else {
      // Map unknown types to 'auto' for graceful fallback
      useAutoFocusStore.getState().setFocusTargetType('auto');
    }
    
    // Invalidate eye cache to force fresh detection
    this.invalidateEyeCache();
    
    switch (targetType) {
      case 'eye':
        // Eye priority - detect and focus on eyes
        this.detectAndFocusWithFallback();
        break;
      case 'subject':
      case 'face':
        // Subject/face focus - use head detection as primary
        const headTarget = this.detectHeadFallback();
        if (headTarget) {
          this.setFocusTarget(headTarget);
        } else {
          // Fallback to eye detection if no head found
          this.detectAndFocusWithFallback();
        }
        break;
      case 'foreground':
        // Foreground focus - target nearest visible object
        this.detectAndFocusWithFallback();
        break;
      case 'plane':
      case 'background':
        // For background/plane focus, use geometry fallback
        const topTarget = this.detectTopOfModelFallback();
        if (topTarget) {
          this.setFocusTarget(topTarget);
        }
        break;
      case 'custom':
        // Custom target - maintain current focus, don't re-detect
        console.log('[AutoFocusSystem] Custom focus target - maintaining current focus');
        break;
      case 'auto':
      default:
        // Default: run standard detection
        this.detectAndFocusWithFallback();
        break;
    }
  }
  
  /**
   * Refresh the cache of eye-candidate meshes.
   * Called periodically to avoid scanning all scene meshes every detection cycle.
   */
  private refreshEyeMeshCache(): void {
    const eyePatterns = ['eye', 'Eye', 'EYE'];
    const excludePatterns = ['eyebrow', 'Eyebrow', 'eyelash', 'Eyelash', 'eyelid', 'Eyelid'];
    
    this.cachedEyeMeshes = this.scene.meshes.filter(mesh => {
      // Include synthetic eye markers
      if (mesh.metadata?.isEyeMarker === true) return true;
      
      // Check name patterns
      const name = mesh.name;
      const hasEyePattern = eyePatterns.some(p => name.includes(p));
      const isExcluded = excludePatterns.some(p => name.includes(p));
      
      return hasEyePattern && !isExcluded;
    });
  }
  
  /**
   * Force refresh of eye mesh cache (call after loading new models)
   */
  public invalidateEyeCache(): void {
    this.cachedEyeMeshes = null;
    this.lastEyeCacheTime = 0;
  }
  
  public detectEyes(): DetectedEye[] {
    const detectedEyes: DetectedEye[] = [];
    const cameraPos = this.camera.position;
    const now = Date.now();
    
    // Performance optimization: Cache eye-candidate meshes
    if (!this.cachedEyeMeshes || (now - this.lastEyeCacheTime > this.EYE_CACHE_TTL)) {
      this.refreshEyeMeshCache();
      this.lastEyeCacheTime = now;
    }
    
    // Common eye mesh naming patterns (static - no need to recreate each call)
    const leftEyePatterns = [
      '_leftEye', 'leftEye', 'left_eye', 'LeftEye', 'Left_Eye',
      'eye_l', 'eye.l', 'Eye_L', 'Eye.L', 'eyeL', 'EyeL',
      'l_eye', 'L_eye', 'L_Eye', 'LEye',
      'eyeball_l', 'Eyeball_L', 'eyeball.l',
      'lefteye', 'LEFTEYE', 'LEFT_EYE'
    ];
    
    const rightEyePatterns = [
      '_rightEye', 'rightEye', 'right_eye', 'RightEye', 'Right_Eye',
      'eye_r', 'eye.r', 'Eye_R', 'Eye.R', 'eyeR', 'EyeR',
      'r_eye', 'R_eye', 'R_Eye', 'REye',
      'eyeball_r', 'Eyeball_R', 'eyeball.r',
      'righteye', 'RIGHTEYE', 'RIGHT_EYE'
    ];
    
    // Use cached meshes instead of scanning all scene meshes
    const meshesToCheck = this.cachedEyeMeshes || [];
    
    for (const mesh of meshesToCheck) {
      // Check for synthetic eye markers first (created by addEyeMarkersToModel)
      if (mesh.metadata?.isEyeMarker === true) {
        const worldPos = mesh.getAbsolutePosition();
        const distance = BABYLON.Vector3.Distance(cameraPos, worldPos);
        const screenPos = this.getScreenPosition(worldPos);
        
        detectedEyes.push({
          id: mesh.name,
          actorName: mesh.metadata.actorName || 'Actor',
          eyeSide: mesh.metadata.eyeSide as 'left' | 'right',
          worldPosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
          distanceFromCamera: distance,
          screenPosition: screenPos
        });
        continue;
      }
      
      // Skip invisible meshes for normal eye detection (but synthetic markers are OK)
      if (!mesh.isEnabled() || !mesh.isVisible) continue;
      
      const meshNameLower = mesh.name.toLowerCase();
      let eyeSide: 'left' | 'right' | null = null;
      
      // Check for left eye patterns
      for (const pattern of leftEyePatterns) {
        if (mesh.name.includes(pattern) || meshNameLower.includes(pattern.toLowerCase())) {
          eyeSide = 'left';
          break;
        }
      }
      
      // Check for right eye patterns
      if (!eyeSide) {
        for (const pattern of rightEyePatterns) {
          if (mesh.name.includes(pattern) || meshNameLower.includes(pattern.toLowerCase())) {
            eyeSide = 'right';
            break;
          }
        }
      }
      
      if (eyeSide) {
        const worldPos = mesh.getAbsolutePosition();
        const distance = BABYLON.Vector3.Distance(cameraPos, worldPos);
        
        // Extract actor name by removing eye-related parts
        let actorName = mesh.name;
        const allPatterns = [...leftEyePatterns, ...rightEyePatterns];
        for (const pattern of allPatterns) {
          actorName = actorName.replace(pattern, '');
        }
        actorName = actorName.replace(/^[_.-]+|[_.-]+$/g, '').trim() || 'Actor';
        
        const screenPos = this.getScreenPosition(worldPos);
        
        detectedEyes.push({
          id: mesh.name,
          actorName,
          eyeSide,
          worldPosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
          distanceFromCamera: distance,
          screenPosition: screenPos
        });
      }
    }
    
    detectedEyes.sort((a, b) => a.distanceFromCamera - b.distanceFromCamera);
    
    useAutoFocusStore.getState().setDetectedEyes(detectedEyes);
    
    if (useAutoFocusStore.getState().showEyeIndicators) {
      this.updateEyeIndicators(detectedEyes);
    }
    
    return detectedEyes;
  }
  
  private getScreenPosition(worldPos: BABYLON.Vector3): { x: number; y: number } | null {
    const engine = this.scene.getEngine();
    const screenCoords = BABYLON.Vector3.Project(
      worldPos,
      BABYLON.Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    );
    
    const x = screenCoords.x / engine.getRenderWidth();
    const y = screenCoords.y / engine.getRenderHeight();
    
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      return { x, y };
    }
    return null;
  }
  
  public setFocusTarget(eye: DetectedEye): void {
    const store = useAutoFocusStore.getState();
    
    const target: AutoFocusTarget = {
      actorId: eye.id.split('_')[0],
      actorName: eye.actorName,
      selectedEye: eye,
      focusDistance: eye.distanceFromCamera,
      isLocked: store.mode === 'AF-S'
    };
    
    store.setCurrentTarget(target);
    this.targetFocusDistance = eye.distanceFromCamera;
    
    // In AF-S mode, start transitioning to target before locking
    if (store.mode === 'AF-S') {
      this.isTransitioningToTarget = true;
    }
    
    this.showFocusFrame(eye);
    
    // Only log focus changes, not every frame
    const focusKey = `${eye.actorName}-${eye.eyeSide}-${eye.distanceFromCamera.toFixed(2)}`;
    if (this.lastLoggedFocus !== focusKey) {
      console.log(`[AutoFocusSystem] Focus target set: ${eye.actorName} ${eye.eyeSide} eye at ${eye.distanceFromCamera.toFixed(2)}m`);
      this.lastLoggedFocus = focusKey;
    }
  }
  
  private smoothFocusTransition(): void {
    const store = useAutoFocusStore.getState();
    
    // Don't interfere with manual focus
    if (store.mode === 'MF') {
      return;
    }
    
    // In AF-S mode with focus locked and no active transition, don't overwrite
    if (store.mode === 'AF-S' && store.focusLocked && !this.isTransitioningToTarget) {
      return;
    }
    
    const delta = Math.abs(this.currentFocusDistance - this.targetFocusDistance);
    
    // Early-out optimization: skip if focus distance hasn't changed significantly
    if (delta <= this.FOCUS_UPDATE_THRESHOLD && !this.isTransitioningToTarget) {
      return;
    }
    
    const speed = store.smoothTransitionSpeed;
    
    if (delta > this.FOCUS_UPDATE_THRESHOLD) {
      this.currentFocusDistance = BABYLON.Scalar.Lerp(
        this.currentFocusDistance,
        this.targetFocusDistance,
        speed
      );
      
      // Only update store and DOF if value actually changed
      const storedDistance = useFocusStore.getState().focusDistance;
      if (Math.abs(storedDistance - this.currentFocusDistance) > this.FOCUS_UPDATE_THRESHOLD) {
        useFocusStore.getState().setFocusDistance(this.currentFocusDistance);
        this.updateDOFRenderingPipeline(this.currentFocusDistance);
      }
    } else if (this.isTransitioningToTarget) {
      // Transition complete - now we can truly lock AF-S
      this.isTransitioningToTarget = false;
      this.currentFocusDistance = this.targetFocusDistance;
      useFocusStore.getState().setFocusDistance(this.currentFocusDistance);
      this.updateDOFRenderingPipeline(this.currentFocusDistance);
      console.log('[AutoFocusSystem] AF-S transition complete, focus locked');
    }
  }
  
  private updateDOFRenderingPipeline(focusDistance: number): void {
    const studio = (window as any).virtualStudio;
    if (!studio || !studio.updateDOFSettings) return;
    
    // Get camera settings for aperture (fStop)
    const aperture = studio.cameraSettings?.aperture || 2.8;
    
    // Check if DOF is enabled in the store
    const dofEnabled = useAutoFocusStore.getState().dofEnabled ?? true;
    
    // Update the rendering pipeline DOF
    studio.updateDOFSettings(aperture, focusDistance, dofEnabled);
  }
  
  private updateEyeIndicators(eyes: DetectedEye[]): void {
    this.eyeIndicatorMeshes.forEach((mesh, id) => {
      if (!eyes.find(e => e.id === id)) {
        mesh.dispose();
        this.eyeIndicatorMeshes.delete(id);
      }
    });
    
    const store = useAutoFocusStore.getState();
    const currentTarget = store.currentTarget?.selectedEye;
    
    eyes.forEach(eye => {
      let indicator = this.eyeIndicatorMeshes.get(eye.id);
      
      if (!indicator) {
        indicator = BABYLON.MeshBuilder.CreateTorus(`eyeIndicator_${eye.id}`, {
          diameter: 0.08,
          thickness: 0.004,
          tessellation: 32
        }, this.scene);
        
        const material = new BABYLON.StandardMaterial(`eyeIndicatorMat_${eye.id}`, this.scene);
        material.emissiveColor = new BABYLON.Color3(0, 1, 0);
        material.disableLighting = true;
        material.alpha = 0.8;
        indicator.material = material;
        indicator.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        indicator.isPickable = false;
        
        this.eyeIndicatorMeshes.set(eye.id, indicator);
      }
      
      indicator.position = new BABYLON.Vector3(
        eye.worldPosition.x,
        eye.worldPosition.y,
        eye.worldPosition.z
      );
      
      const isTarget = currentTarget?.id === eye.id;
      const mat = indicator.material as BABYLON.StandardMaterial;
      
      if (isTarget) {
        mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
        indicator.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
      } else {
        mat.emissiveColor = new BABYLON.Color3(0.3, 0.6, 0.3);
        indicator.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
      }
    });
  }
  
  private clearEyeIndicators(): void {
    this.eyeIndicatorMeshes.forEach(mesh => mesh.dispose());
    this.eyeIndicatorMeshes.clear();
    if (this.focusFrameMesh) {
      this.focusFrameMesh.dispose();
      this.focusFrameMesh = null;
    }
    if (this.focusFrameAnimation) {
      this.scene.onBeforeRenderObservable.remove(this.focusFrameAnimation);
      this.focusFrameAnimation = null;
    }
  }
  
  private updateEyeIndicatorVisibility(show: boolean): void {
    if (!show) {
      this.clearEyeIndicators();
    } else {
      this.detectEyes();
    }
  }
  
  private focusFrameAnimation: BABYLON.Observer<BABYLON.Scene> | null = null;
  
  private showFocusFrame(eye: DetectedEye): void {
    // Clean up previous frame and animation
    if (this.focusFrameMesh) {
      this.focusFrameMesh.dispose();
    }
    if (this.focusFrameAnimation) {
      this.scene.onBeforeRenderObservable.remove(this.focusFrameAnimation);
      this.focusFrameAnimation = null;
    }
    
    // Create a larger, more visible focus frame
    const size = 0.12; // Larger size
    const corner = 0.04; // Corner length
    
    const lines = BABYLON.MeshBuilder.CreateLineSystem('focusFrame', {
      lines: [
        // Top-left corner
        [new BABYLON.Vector3(-size, size, 0), new BABYLON.Vector3(-size, size - corner, 0)],
        [new BABYLON.Vector3(-size, size, 0), new BABYLON.Vector3(-size + corner, size, 0)],
        // Top-right corner
        [new BABYLON.Vector3(size, size, 0), new BABYLON.Vector3(size, size - corner, 0)],
        [new BABYLON.Vector3(size, size, 0), new BABYLON.Vector3(size - corner, size, 0)],
        // Bottom-left corner
        [new BABYLON.Vector3(-size, -size, 0), new BABYLON.Vector3(-size, -size + corner, 0)],
        [new BABYLON.Vector3(-size, -size, 0), new BABYLON.Vector3(-size + corner, -size, 0)],
        // Bottom-right corner
        [new BABYLON.Vector3(size, -size, 0), new BABYLON.Vector3(size, -size + corner, 0)],
        [new BABYLON.Vector3(size, -size, 0), new BABYLON.Vector3(size - corner, -size, 0)],
        // Center crosshair (small)
        [new BABYLON.Vector3(-0.015, 0, 0), new BABYLON.Vector3(0.015, 0, 0)],
        [new BABYLON.Vector3(0, -0.015, 0), new BABYLON.Vector3(0, 0.015, 0)]
      ]
    }, this.scene);
    
    lines.color = new BABYLON.Color3(0, 1, 0); // Bright green
    lines.position = new BABYLON.Vector3(eye.worldPosition.x, eye.worldPosition.y, eye.worldPosition.z);
    lines.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    lines.isPickable = false;
    lines.renderingGroupId = 3; // Render on top
    
    this.focusFrameMesh = lines as unknown as BABYLON.Mesh;
    
    // Continuous pulsing animation
    let elapsed = 0;
    let pulsePhase = 0;
    this.focusFrameAnimation = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime();
      elapsed += dt;
      pulsePhase += dt * 0.005; // Slow pulse
      
      // Initial rapid blink for 500ms, then slow pulse
      if (elapsed < 500) {
        // Fast blink
        const blink = Math.sin(elapsed * 0.03) > 0;
        lines.visibility = blink ? 1 : 0.3;
        lines.scaling = new BABYLON.Vector3(1 + Math.sin(elapsed * 0.02) * 0.1, 1 + Math.sin(elapsed * 0.02) * 0.1, 1);
      } else {
        // Gentle continuous pulse
        const pulse = 0.85 + Math.sin(pulsePhase) * 0.15;
        lines.visibility = pulse;
        lines.scaling = new BABYLON.Vector3(1 + Math.sin(pulsePhase * 0.5) * 0.05, 1 + Math.sin(pulsePhase * 0.5) * 0.05, 1);
      }
    });
  }
  
  public triggerSingleFocus(): void {
    const store = useAutoFocusStore.getState();
    
    if (store.mode !== 'AF-S') {
      console.log('[AutoFocusSystem] AF-S mode required for single focus');
      return;
    }
    
    if (store.focusLocked) {
      store.setFocusLocked(false);
      console.log('[AutoFocusSystem] Focus unlocked');
      return;
    }
    
    // Debug: List all meshes to help find eye naming patterns
    this.debugListMeshes();
    
    this.detectEyes();
    const nearestEye = store.getNearestEye();
    
    if (nearestEye) {
      this.setFocusTarget(nearestEye);
      store.setFocusLocked(true);
      console.log('[AutoFocusSystem] Focus locked on eye');
    } else {
      // Fallback 1: Try to focus on head/face by name
      const headTarget = this.detectHeadFallback();
      if (headTarget) {
        this.setFocusTarget(headTarget);
        store.setFocusLocked(true);
        console.log('[AutoFocusSystem] Focus locked on head (name fallback)');
      } else {
        // Fallback 2: Find top of character model (smart geometry-based detection)
        const topTarget = this.detectTopOfModelFallback();
        if (topTarget) {
          this.setFocusTarget(topTarget);
          store.setFocusLocked(true);
          console.log('[AutoFocusSystem] Focus locked on detected face (geometry fallback)');
        } else {
          console.log('[AutoFocusSystem] No focus target found - check console for mesh names');
        }
      }
    }
  }
  
  public getDetectedActors(): string[] {
    const eyes = useAutoFocusStore.getState().detectedEyes;
    const actors = new Set<string>();
    eyes.forEach(eye => actors.add(eye.actorName));
    return Array.from(actors);
  }
  
  public focusOnActor(actorName: string, preferredEye: 'left' | 'right' | 'nearest' = 'nearest'): boolean {
    const eyes = useAutoFocusStore.getState().detectedEyes.filter(e => e.actorName === actorName);
    
    if (eyes.length === 0) {
      console.log(`[AutoFocusSystem] No eyes found for actor: ${actorName}`);
      return false;
    }
    
    let targetEye: DetectedEye | undefined;
    
    if (preferredEye === 'nearest') {
      targetEye = eyes.reduce((prev, curr) => 
        curr.distanceFromCamera < prev.distanceFromCamera ? curr : prev
      );
    } else {
      targetEye = eyes.find(e => e.eyeSide === preferredEye) || eyes[0];
    }
    
    if (targetEye) {
      this.setFocusTarget(targetEye);
      return true;
    }
    
    return false;
  }
  
  public dispose(): void {
    this.stopTracking();
    this.clearEyeIndicators();
    console.log('[AutoFocusSystem] Disposed');
  }
  
  // Focus at a specific screen point (click-to-focus)
  public focusAtScreenPoint(screenX: number, screenY: number): boolean {
    const scene = this.scene;
    const engine = scene.getEngine();
    
    // Convert screen coordinates to normalized device coordinates
    const pickResult = scene.pick(screenX, screenY, (mesh) => {
      // Skip gizmos, UI elements, and ground
      if (mesh.name.startsWith('gizmo') || mesh.name.startsWith('__')) return false;
      if (mesh.name.includes('ground') || mesh.name.includes('Ground')) return false;
      if (mesh.name.includes('grid') || mesh.name.includes('Grid')) return false;
      if (mesh.name.includes('Wall') || mesh.name.includes('wall')) return false;
      if (mesh.name.includes('backdrop') || mesh.name.includes('Backdrop')) return false;
      return mesh.isEnabled() && mesh.isVisible;
    });
    
    if (pickResult && pickResult.hit && pickResult.pickedPoint) {
      const distance = BABYLON.Vector3.Distance(this.camera.position, pickResult.pickedPoint);
      
      // Create a synthetic focus target
      const syntheticEye: DetectedEye = {
        id: `clickfocus_${Date.now()}`,
        actorName: pickResult.pickedMesh?.name || 'ClickFocus',
        eyeSide: 'left',
        worldPosition: {
          x: pickResult.pickedPoint.x,
          y: pickResult.pickedPoint.y,
          z: pickResult.pickedPoint.z
        },
        distanceFromCamera: distance,
        screenPosition: this.getScreenPosition(pickResult.pickedPoint)
      };
      
      // Set focus target
      this.setFocusTarget(syntheticEye);
      
      // In AF-S mode, lock focus
      const store = useAutoFocusStore.getState();
      if (store.mode === 'AF-S') {
        store.setFocusLocked(true);
      }
      
      console.log(`[AutoFocusSystem] Click focus at ${distance.toFixed(2)}m on ${pickResult.pickedMesh?.name}`);
      return true;
    } else {
      // No hit - focus at infinity or use depth from screen position
      console.log('[AutoFocusSystem] Click focus - no mesh hit');
      return false;
    }
  }
  
  // Focus at normalized viewport coordinates (0-1 range)
  public focusAtNormalizedPoint(normalizedX: number, normalizedY: number): boolean {
    const engine = this.scene.getEngine();
    const screenX = normalizedX * engine.getRenderWidth();
    const screenY = normalizedY * engine.getRenderHeight();
    return this.focusAtScreenPoint(screenX, screenY);
  }
  
  // Debug method to list all mesh names in the scene
  public debugListMeshes(): void {
    console.log('[AutoFocusSystem] === Scene Mesh Names ===');
    const meshNames: string[] = [];
    this.scene.meshes.forEach(mesh => {
      if (mesh.isEnabled() && mesh.isVisible) {
        meshNames.push(mesh.name);
      }
    });
    meshNames.sort();
    meshNames.forEach(name => console.log(`  - ${name}`));
    console.log(`[AutoFocusSystem] Total visible meshes: ${meshNames.length}`);
    
    // Look for potential focus targets
    const potentialTargets = meshNames.filter(name => {
      const lower = name.toLowerCase();
      return lower.includes('eye') || lower.includes('head') || lower.includes('face') || 
             lower.includes('skull') || lower.includes('hode') || lower.includes('ansikt');
    });
    if (potentialTargets.length > 0) {
      console.log('[AutoFocusSystem] Potential focus targets:');
      potentialTargets.forEach(name => console.log(`  * ${name}`));
    } else {
      console.log('[AutoFocusSystem] No obvious eye/head/face meshes found');
    }
  }
  
  // Fallback: Focus on head/face if no eyes detected
  public detectHeadFallback(): DetectedEye | null {
    const cameraPos = this.camera.position;
    
    const headPatterns = [
      'head', 'Head', 'HEAD', 'hode', 'Hode',
      'face', 'Face', 'FACE', 'ansikt', 'Ansikt',
      'skull', 'Skull', 'cranium', 'Cranium'
    ];
    
    // Exclusion patterns - walls, logos, lights, scene elements, etc.
    const excludePatterns = [
      'wall', 'Wall', 'logo', 'Logo', 'light', 'Light', 'bulb', 'ground', 'grid',
      'world', 'World', 'scene', 'Scene', 'environment', 'Environment', 'skybox', 'Skybox',
      'floor', 'Floor', 'ceiling', 'Ceiling', 'backdrop', 'Backdrop', 'studio', 'Studio',
      'camera', 'Camera', 'root', 'Root', '__root__'
    ];
    
    for (const mesh of this.scene.meshes) {
      if (!mesh.isEnabled() || !mesh.isVisible) continue;
      
      // Skip excluded meshes
      if (excludePatterns.some(ex => mesh.name.includes(ex))) continue;
      
      const meshNameLower = mesh.name.toLowerCase();
      for (const pattern of headPatterns) {
        if (mesh.name.includes(pattern) || meshNameLower.includes(pattern.toLowerCase())) {
          const worldPos = mesh.getAbsolutePosition();
          const distance = BABYLON.Vector3.Distance(cameraPos, worldPos);
          
          // Create a synthetic "eye" target for the head
          const detected: DetectedEye = {
            id: mesh.name,
            actorName: mesh.name.replace(new RegExp(pattern, 'gi'), '').replace(/^[_.-]+|[_.-]+$/g, '').trim() || 'Actor',
            eyeSide: 'left', // Default
            worldPosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
            distanceFromCamera: distance,
            screenPosition: this.getScreenPosition(worldPos)
          };
          
          console.log(`[AutoFocusSystem] Head fallback detected: ${mesh.name} at ${distance.toFixed(2)}m`);
          return detected;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Add synthetic eye marker meshes to a loaded 3D model that doesn't have eye meshes.
   * These invisible markers allow the AutoFocusSystem to detect and focus on eyes.
   * Call this after loading a new avatar/character model.
   */
  public addEyeMarkersToModel(rootMesh: BABYLON.AbstractMesh, modelName?: string): void {
    const name = modelName || rootMesh.name || 'avatar';
    
    // Check if model already has eye meshes or markers
    const existingEyes = rootMesh.getChildMeshes().filter(m => 
      (m.name.toLowerCase().includes('eye') && 
       !m.name.toLowerCase().includes('eyebrow') &&
       !m.name.toLowerCase().includes('eyelash')) ||
      m.metadata?.isEyeMarker === true
    );
    
    if (existingEyes.length > 0) {
      console.log(`[AutoFocusSystem] Model ${name} already has ${existingEyes.length} eye meshes/markers`);
      return;
    }
    
    // Ensure world matrix is computed
    rootMesh.computeWorldMatrix(true);
    
    // Calculate model dimensions in WORLD space
    const boundingInfo = rootMesh.getHierarchyBoundingVectors(true);
    const minY = boundingInfo.min.y;
    const maxY = boundingInfo.max.y;
    const height = maxY - minY;
    
    if (height < 0.3) {
      console.log(`[AutoFocusSystem] Model ${name} too small for eye markers (height: ${height.toFixed(2)}m)`);
      return;
    }
    
    // Calculate eye positions in WORLD space based on human proportions
    // Eyes are typically at ~93-95% of total height from the ground
    const eyeHeightRatio = 0.93;
    const eyeY = minY + (height * eyeHeightRatio);
    
    // Eye separation is typically 6-7cm (interpupillary distance)
    const eyeSeparation = height * 0.035; // ~6cm for 1.7m figure
    
    // Center X position in world space
    const centerX = (boundingInfo.min.x + boundingInfo.max.x) / 2;
    
    // Z position - front of the model (closer to camera)
    const camZ = this.camera.position.z;
    const frontZ = Math.abs(boundingInfo.min.z - camZ) < Math.abs(boundingInfo.max.z - camZ) 
      ? boundingInfo.min.z 
      : boundingInfo.max.z;
    const depth = boundingInfo.max.z - boundingInfo.min.z;
    const eyeZ = frontZ + (frontZ === boundingInfo.min.z ? depth * 0.15 : -depth * 0.15);
    
    // Get the inverse world matrix to convert world positions to local
    const worldMatrix = rootMesh.getWorldMatrix();
    const invWorldMatrix = BABYLON.Matrix.Invert(worldMatrix);
    
    // Create invisible eye marker spheres
    const createEyeMarker = (side: 'left' | 'right') => {
      const xOffset = side === 'left' ? -eyeSeparation : eyeSeparation;
      const markerName = `${name}_${side}Eye`;
      
      // Check if marker already exists
      const existing = this.scene.getMeshByName(markerName);
      if (existing) {
        existing.dispose();
      }
      
      // Calculate world position
      const worldPos = new BABYLON.Vector3(centerX + xOffset, eyeY, eyeZ);
      
      // Convert to local position (relative to parent)
      const localPos = BABYLON.Vector3.TransformCoordinates(worldPos, invWorldMatrix);
      
      const marker = BABYLON.MeshBuilder.CreateSphere(markerName, { 
        diameter: 0.02 // 2cm diameter - small but pickable
      }, this.scene);
      
      // Set LOCAL position (since it will be parented to rootMesh)
      marker.position = localPos;
      marker.isPickable = true;
      marker.isVisible = false; // Invisible but still pickable for raycasting
      
      // Make it a child of the root mesh so it moves with the model
      marker.parent = rootMesh;
      
      // Add metadata for identification
      marker.metadata = {
        isEyeMarker: true,
        eyeSide: side,
        actorName: name
      };
      
      // Verify world position
      marker.computeWorldMatrix(true);
      const finalWorldPos = marker.getAbsolutePosition();
      console.log(`[AutoFocusSystem] Created ${side} eye marker for ${name} at world Y=${finalWorldPos.y.toFixed(2)}`);
      return marker;
    };
    
    createEyeMarker('left');
    createEyeMarker('right');
    
    // Re-run eye detection to find the new markers
    setTimeout(() => {
      this.detectEyes();
    }, 100);
  }
  
  /**
   * Remove eye markers from a model
   */
  public removeEyeMarkersFromModel(rootMesh: BABYLON.AbstractMesh): void {
    const markers = rootMesh.getChildMeshes().filter(m => 
      m.metadata?.isEyeMarker === true
    );
    
    markers.forEach(marker => {
      marker.dispose();
    });
    
    if (markers.length > 0) {
      console.log(`[AutoFocusSystem] Removed ${markers.length} eye markers`);
    }
  }
  
  // Smart fallback: Find the topmost point of any character mesh (approximates head/face position)
  public detectTopOfModelFallback(): DetectedEye | null {
    const cameraPos = this.camera.position;
    
    // Common avatar/character mesh name patterns
    const avatarPatterns = ['avatar', 'character', 'actor', 'person', 'human', 'mannequin', 'geometry'];
    
    // Exclusion patterns - scene elements that should never be focus targets
    const excludePatterns = [
      'wall', 'Wall', 'logo', 'Logo', 'light', 'Light', 'bulb', 'ground', 'grid',
      'world', 'World', 'scene', 'Scene', 'environment', 'Environment', 'skybox', 'Skybox',
      'floor', 'Floor', 'ceiling', 'Ceiling', 'backdrop', 'Backdrop', 'studio', 'Studio',
      'camera', 'Camera', 'root', 'Root', '__root__', 'backWall', 'cyclorama', 'Cyclorama'
    ];
    
    // Find meshes that look like character/avatar meshes
    const characterMeshes = this.scene.meshes.filter(mesh => {
      if (!mesh.isEnabled() || !mesh.isVisible) return false;
      if (mesh.name.startsWith('gizmo') || mesh.name.startsWith('__')) return false;
      
      // Skip any mesh matching exclusion patterns
      if (excludePatterns.some(ex => mesh.name.includes(ex))) return false;
      
      const meshNameLower = mesh.name.toLowerCase();
      
      // Check if it matches known avatar patterns
      const isAvatarByName = avatarPatterns.some(pattern => meshNameLower.includes(pattern));
      
      // Check if it's a reasonable size for a character
      const boundingInfo = mesh.getBoundingInfo();
      if (!boundingInfo || !boundingInfo.boundingBox) return false;
      
      const height = Math.abs(boundingInfo.boundingBox.maximumWorld.y - boundingInfo.boundingBox.minimumWorld.y);
      const isCharacterSized = height > 0.3 && height < 3.0;
      
      // Accept if it matches avatar name OR is character-sized
      if (isAvatarByName || isCharacterSized) {
        console.log(`[AutoFocusSystem] Candidate mesh: ${mesh.name}, height=${height.toFixed(2)}m, isAvatar=${isAvatarByName}`);
        return true;
      }
      
      return false;
    });
    
    if (characterMeshes.length === 0) {
      console.log('[AutoFocusSystem] No character-sized meshes found');
      return null;
    }
    
    // Find the topmost point across all character meshes
    let highestPoint: BABYLON.Vector3 | null = null;
    let highestMesh: BABYLON.AbstractMesh | null = null;
    let maxY = -Infinity;
    
    for (const mesh of characterMeshes) {
      const boundingInfo = mesh.getBoundingInfo();
      const topY = boundingInfo.boundingBox.maximumWorld.y;
      
      if (topY > maxY) {
        maxY = topY;
        highestMesh = mesh;
        // Estimate eye level: eyes are typically 10-15% from the top of a human figure
        const centerX = (boundingInfo.boundingBox.maximumWorld.x + boundingInfo.boundingBox.minimumWorld.x) / 2;
        const minZ = boundingInfo.boundingBox.minimumWorld.z;
        const maxZ = boundingInfo.boundingBox.maximumWorld.z;
        
        // For a ~1.7m figure, eyes are about 12cm below the top (at ~93% of height)
        const height = topY - boundingInfo.boundingBox.minimumWorld.y;
        const eyeOffset = height * 0.07; // 7% down from top
        
        // Position the focus point at the FRONT of the model (closest to camera)
        // Determine which Z is closer to camera
        const camZ = this.camera.position.z;
        const frontZ = Math.abs(minZ - camZ) < Math.abs(maxZ - camZ) ? minZ : maxZ;
        // Offset slightly inward from the very front surface (about 10% of depth)
        const depth = maxZ - minZ;
        const faceZ = frontZ + (frontZ === minZ ? depth * 0.1 : -depth * 0.1);
        
        highestPoint = new BABYLON.Vector3(centerX, topY - eyeOffset, faceZ);
      }
    }
    
    if (highestPoint && highestMesh) {
      const distance = BABYLON.Vector3.Distance(cameraPos, highestPoint);
      
      // Extract actor name from mesh hierarchy, but skip generic parent names
      const genericNames = ['world', 'scene', 'root', '__root__', 'default', 'Scene', 'World', 'Root'];
      let actorName = 'Modell';
      
      // Try to find a meaningful name from the mesh hierarchy
      const technicalNames = ['geometry', 'mesh', 'primitive', 'node', 'object', 'group'];
      let current: BABYLON.Node | null = highestMesh;
      while (current) {
        const name = current.name;
        if (name && !genericNames.some(g => name.toLowerCase().includes(g.toLowerCase()))) {
          const cleanName = name.replace(/^default_/, '').replace(/_/g, ' ').replace(/\d+$/, '').trim();
          // Skip technical mesh names
          if (cleanName && !technicalNames.some(t => cleanName.toLowerCase() === t)) {
            actorName = cleanName;
            break;
          }
        }
        current = current.parent;
      }
      
      // Fallback to a user-friendly name
      if (!actorName || actorName === '' || technicalNames.includes(actorName.toLowerCase())) {
        actorName = 'Modell';
      }
      
      const detected: DetectedEye = {
        id: `${highestMesh.name}_auto_face`,
        actorName,
        eyeSide: 'left', // Default
        worldPosition: { x: highestPoint.x, y: highestPoint.y, z: highestPoint.z },
        distanceFromCamera: distance,
        screenPosition: this.getScreenPosition(highestPoint)
      };
      
      console.log(`[AutoFocusSystem] Auto-detected face at top of model: ${highestMesh.name} at ${distance.toFixed(2)}m (Y=${highestPoint.y.toFixed(2)})`);
      return detected;
    }
    
    return null;
  }
}
