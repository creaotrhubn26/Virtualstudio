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
    
    this.isInitialized = true;
    console.log('[AutoFocusSystem] Initialized');
  }
  
  private handleModeChange(mode: string): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    switch (mode) {
      case 'AF-C':
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
    
    this.updateInterval = window.setInterval(() => {
      const store = useAutoFocusStore.getState();
      if (store.mode === 'AF-C' && !store.focusLocked) {
        this.detectEyes();
        const nearestEye = store.getNearestEye();
        if (nearestEye) {
          this.setFocusTarget(nearestEye);
        }
      }
    }, 100);
    
    console.log('[AutoFocusSystem] Continuous tracking started');
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
  
  public detectEyes(): DetectedEye[] {
    const detectedEyes: DetectedEye[] = [];
    const cameraPos = this.camera.position;
    
    this.scene.meshes.forEach(mesh => {
      if (mesh.name.includes('_leftEye') || mesh.name.includes('_rightEye')) {
        if (!mesh.isEnabled() || !mesh.isVisible) return;
        
        const worldPos = mesh.getAbsolutePosition();
        const distance = BABYLON.Vector3.Distance(cameraPos, worldPos);
        
        const actorName = mesh.name.replace('_leftEye', '').replace('_rightEye', '');
        const eyeSide = mesh.name.includes('_leftEye') ? 'left' : 'right';
        
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
    });
    
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
    
    console.log(`[AutoFocusSystem] Focus target set: ${eye.actorName} ${eye.eyeSide} eye at ${eye.distanceFromCamera.toFixed(2)}m`);
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
    
    const speed = store.smoothTransitionSpeed;
    const delta = Math.abs(this.currentFocusDistance - this.targetFocusDistance);
    
    if (delta > 0.001) {
      this.currentFocusDistance = BABYLON.Scalar.Lerp(
        this.currentFocusDistance,
        this.targetFocusDistance,
        speed
      );
      
      useFocusStore.getState().setFocusDistance(this.currentFocusDistance);
    } else if (this.isTransitioningToTarget) {
      // Transition complete - now we can truly lock AF-S
      this.isTransitioningToTarget = false;
      this.currentFocusDistance = this.targetFocusDistance;
      useFocusStore.getState().setFocusDistance(this.currentFocusDistance);
      console.log('[AutoFocusSystem] AF-S transition complete, focus locked');
    }
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
  }
  
  private updateEyeIndicatorVisibility(show: boolean): void {
    if (!show) {
      this.clearEyeIndicators();
    } else {
      this.detectEyes();
    }
  }
  
  private showFocusFrame(eye: DetectedEye): void {
    if (this.focusFrameMesh) {
      this.focusFrameMesh.dispose();
    }
    
    const lines = BABYLON.MeshBuilder.CreateLineSystem('focusFrame', {
      lines: [
        [new BABYLON.Vector3(-0.05, 0.05, 0), new BABYLON.Vector3(-0.05, 0.03, 0)],
        [new BABYLON.Vector3(-0.05, 0.05, 0), new BABYLON.Vector3(-0.03, 0.05, 0)],
        [new BABYLON.Vector3(0.05, 0.05, 0), new BABYLON.Vector3(0.05, 0.03, 0)],
        [new BABYLON.Vector3(0.05, 0.05, 0), new BABYLON.Vector3(0.03, 0.05, 0)],
        [new BABYLON.Vector3(-0.05, -0.05, 0), new BABYLON.Vector3(-0.05, -0.03, 0)],
        [new BABYLON.Vector3(-0.05, -0.05, 0), new BABYLON.Vector3(-0.03, -0.05, 0)],
        [new BABYLON.Vector3(0.05, -0.05, 0), new BABYLON.Vector3(0.05, -0.03, 0)],
        [new BABYLON.Vector3(0.05, -0.05, 0), new BABYLON.Vector3(0.03, -0.05, 0)]
      ]
    }, this.scene);
    
    lines.color = new BABYLON.Color3(0, 1, 0);
    lines.position = new BABYLON.Vector3(eye.worldPosition.x, eye.worldPosition.y, eye.worldPosition.z);
    lines.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    lines.isPickable = false;
    
    this.focusFrameMesh = lines as unknown as BABYLON.Mesh;
    
    let elapsed = 0;
    const blinkAnimation = this.scene.onBeforeRenderObservable.add(() => {
      elapsed += this.scene.getEngine().getDeltaTime();
      if (elapsed < 500) {
        lines.visibility = Math.sin(elapsed * 0.02) > 0 ? 1 : 0.5;
      } else {
        lines.visibility = 1;
        this.scene.onBeforeRenderObservable.remove(blinkAnimation);
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
    
    this.detectEyes();
    const nearestEye = store.getNearestEye();
    
    if (nearestEye) {
      this.setFocusTarget(nearestEye);
      store.setFocusLocked(true);
      console.log('[AutoFocusSystem] Focus locked');
    } else {
      console.log('[AutoFocusSystem] No eyes detected');
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
}
