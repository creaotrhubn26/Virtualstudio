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
    
    // Common eye mesh naming patterns across different 3D model formats
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
    
    this.scene.meshes.forEach(mesh => {
      if (!mesh.isEnabled() || !mesh.isVisible) return;
      
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
        
        console.log(`[AutoFocusSystem] Detected ${eyeSide} eye: ${mesh.name} at ${distance.toFixed(2)}m`);
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
    
    // Exclusion patterns - walls, logos, lights, etc.
    const excludePatterns = ['wall', 'Wall', 'logo', 'Logo', 'light', 'Light', 'bulb', 'ground', 'grid'];
    
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
  
  // Smart fallback: Find the topmost point of any character mesh (approximates head/face position)
  public detectTopOfModelFallback(): DetectedEye | null {
    const cameraPos = this.camera.position;
    
    // Common avatar/character mesh name patterns
    const avatarPatterns = ['avatar', 'character', 'actor', 'person', 'human', 'mannequin', 'geometry'];
    
    // Find meshes that look like character/avatar meshes
    const characterMeshes = this.scene.meshes.filter(mesh => {
      if (!mesh.isEnabled() || !mesh.isVisible) return false;
      if (mesh.name.startsWith('gizmo') || mesh.name.startsWith('__')) return false;
      if (mesh.name === 'ground' || mesh.name === 'backWall' || mesh.name === 'grid') return false;
      if (mesh.name.includes('Wall') || mesh.name.includes('wall')) return false;
      if (mesh.name.includes('light') || mesh.name.includes('Light') || mesh.name.includes('bulb')) return false;
      if (mesh.name === 'logo' || mesh.name.startsWith('logo')) return false;
      
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
        const centerZ = (boundingInfo.boundingBox.maximumWorld.z + boundingInfo.boundingBox.minimumWorld.z) / 2;
        // For a ~1.7m figure, eyes are about 12cm below the top (at ~93% of height)
        const height = topY - boundingInfo.boundingBox.minimumWorld.y;
        const eyeOffset = height * 0.07; // 7% down from top
        highestPoint = new BABYLON.Vector3(centerX, topY - eyeOffset, centerZ);
      }
    }
    
    if (highestPoint && highestMesh) {
      const distance = BABYLON.Vector3.Distance(cameraPos, highestPoint);
      
      // Extract actor name from mesh hierarchy
      let actorName = 'Actor';
      if (highestMesh.parent) {
        actorName = highestMesh.parent.name || highestMesh.name;
      } else {
        actorName = highestMesh.name;
      }
      actorName = actorName.replace(/^default_/, '').replace(/_/g, ' ') || 'Actor';
      
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
