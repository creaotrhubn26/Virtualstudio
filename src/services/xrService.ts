/**
 * WebXR VR/AR Service
 * Provides VR headset support and AR preview capabilities
 */

import * as BABYLON from '@babylonjs/core';
import { create } from 'zustand';

// XR Session Types
export type XRSessionType = 'immersive-vr' | 'immersive-ar' | 'inline';

export interface XRControllerState {
  hand: 'left' | 'right';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  buttons: {
    trigger: number;
    grip: number;
    thumbstick: { x: number; y: number };
    buttons: boolean[];
  };
  isConnected: boolean;
}

export interface XRState {
  // Support flags
  isVRSupported: boolean;
  isARSupported: boolean;
  
  // Session state
  isInXR: boolean;
  sessionType: XRSessionType | null;
  
  // Controllers
  leftController: XRControllerState | null;
  rightController: XRControllerState | null;
  
  // Settings
  teleportEnabled: boolean;
  snapTurnEnabled: boolean;
  snapTurnAngle: number;
  movementSpeed: number;
  roomScale: number;
  
  // Helper reference
  xrHelper: BABYLON.WebXRDefaultExperience | null;
  
  // Actions
  checkXRSupport: () => Promise<void>;
  enterVR: (scene: BABYLON.Scene) => Promise<void>;
  enterAR: (scene: BABYLON.Scene) => Promise<void>;
  exitXR: () => Promise<void>;
  setTeleportEnabled: (enabled: boolean) => void;
  setSnapTurnEnabled: (enabled: boolean) => void;
  setSnapTurnAngle: (angle: number) => void;
  setMovementSpeed: (speed: number) => void;
  setRoomScale: (scale: number) => void;
}

// Aliases exported for UI panels referencing these types
export type XRSessionState = XRState;
export type XRController = XRControllerState;

export const useXRStore = create<XRState>((set, get) => ({
  // Initial state
  isVRSupported: false,
  isARSupported: false,
  isInXR: false,
  sessionType: null,
  leftController: null,
  rightController: null,
  teleportEnabled: true,
  snapTurnEnabled: true,
  snapTurnAngle: 45,
  movementSpeed: 1.0,
  roomScale: 1.0,
  xrHelper: null,
  
  checkXRSupport: async () => {
    if (!navigator.xr) {
      set({ isVRSupported: false, isARSupported: false });
      return;
    }
    
    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      
      set({ isVRSupported: vrSupported, isARSupported: arSupported });
    } catch (error) {
      console.error('XR support check failed:', error);
      set({ isVRSupported: false, isARSupported: false });
    }
  },
  
  enterVR: async (scene: BABYLON.Scene) => {
    const { teleportEnabled, snapTurnEnabled, snapTurnAngle, movementSpeed } = get();
    
    try {
      // Create XR experience
      const xrHelper = await scene.createDefaultXRExperienceAsync({
        floorMeshes: scene.getMeshesByTags('floor'),
        disableTeleportation: !teleportEnabled,
        inputOptions: {
          doNotLoadControllerMeshes: false
        }
      });
      
      // Configure teleportation
      if (teleportEnabled && xrHelper.teleportation) {
        xrHelper.teleportation.parabolicCheckRadius = 5;
        xrHelper.teleportation.rotationAngle = snapTurnEnabled
          ? BABYLON.Tools.ToRadians(snapTurnAngle)
          : 0;
      }

      xrHelper.baseExperience.camera.speed = movementSpeed;
      
      // Setup controller tracking
      xrHelper.input.onControllerAddedObservable.add((controller) => {
        const hand = controller.inputSource.handedness as 'left' | 'right';
        
        controller.onMotionControllerInitObservable.add((motionController) => {
          // Track controller state
          scene.onBeforeRenderObservable.add(() => {
            if (!controller.grip) return;
            
            const position = controller.grip.position;
            const rotationQuaternion = controller.grip.rotationQuaternion;
            
            const controllerState: XRControllerState = {
              hand,
              position: { x: position.x, y: position.y, z: position.z },
              rotation: rotationQuaternion ? {
                x: rotationQuaternion.x,
                y: rotationQuaternion.y,
                z: rotationQuaternion.z,
                w: rotationQuaternion.w
              } : { x: 0, y: 0, z: 0, w: 1 },
              buttons: {
                trigger: 0,
                grip: 0,
                thumbstick: { x: 0, y: 0 },
                buttons: []
              },
              isConnected: true
            };
            
            // Get button values from motion controller
            const triggerComponent = motionController.getComponent('xr-standard-trigger');
            const gripComponent = motionController.getComponent('xr-standard-squeeze');
            const thumbstickComponent = motionController.getComponent('xr-standard-thumbstick');
            
            if (triggerComponent) {
              controllerState.buttons.trigger = triggerComponent.value;
            }
            if (gripComponent) {
              controllerState.buttons.grip = gripComponent.value;
            }
            if (thumbstickComponent && thumbstickComponent.axes) {
              controllerState.buttons.thumbstick = {
                x: thumbstickComponent.axes.x,
                y: thumbstickComponent.axes.y
              };
            }
            
            if (hand === 'left') {
              set({ leftController: controllerState });
            } else {
              set({ rightController: controllerState });
            }
          });
          
          // Handle grip for object manipulation
          const gripComponent = motionController.getComponent('xr-standard-squeeze');
          if (gripComponent) {
            gripComponent.onButtonStateChangedObservable.add((component) => {
              if (component.pressed) {
                // Emit grab event
                window.dispatchEvent(new CustomEvent('xr:grab', {
                  detail: { hand, controller }
                }));
              } else {
                window.dispatchEvent(new CustomEvent('xr:release', {
                  detail: { hand, controller }
                }));
              }
            });
          }
          
          // Handle trigger for selection
          const triggerComponent = motionController.getComponent('xr-standard-trigger');
          if (triggerComponent) {
            triggerComponent.onButtonStateChangedObservable.add((component) => {
              if (component.pressed) {
                window.dispatchEvent(new CustomEvent('xr:select', {
                  detail: { hand, controller }
                }));
              }
            });
          }
        });
      });
      
      xrHelper.input.onControllerRemovedObservable.add((controller) => {
        const hand = controller.inputSource.handedness as 'left' | 'right';
        if (hand === 'left') {
          set({ leftController: null });
        } else {
          set({ rightController: null });
        }
      });
      
      // Enter VR
      await xrHelper.baseExperience.enterXRAsync('immersive-vr', 'local-floor');
      
      set({
        xrHelper,
        isInXR: true,
        sessionType: 'immersive-vr'
      });
      
      // Handle session end
      xrHelper.baseExperience.onStateChangedObservable.add((state) => {
        if (state === BABYLON.WebXRState.NOT_IN_XR) {
          set({
            isInXR: false,
            sessionType: null,
            leftController: null,
            rightController: null
          });
        }
      });
      
    } catch (error) {
      console.error('Failed to enter VR:', error);
      throw error;
    }
  },
  
  enterAR: async (scene: BABYLON.Scene) => {
    try {
      const xrHelper = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-ar'
        }
      });
      
      // Enable hit testing for AR placement
      const featuresManager = xrHelper.baseExperience.featuresManager;
      
      // Enable hit test
      const hitTest = featuresManager.enableFeature(
        BABYLON.WebXRHitTest,
        'latest'
      ) as BABYLON.WebXRHitTest;
      
      // Create placement indicator
      const placementIndicator = BABYLON.MeshBuilder.CreateTorus('placement', {
        diameter: 0.5,
        thickness: 0.02,
        tessellation: 32
      }, scene);
      placementIndicator.isVisible = false;
      
      const indicatorMaterial = new BABYLON.StandardMaterial('indicatorMat', scene);
      indicatorMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0.5);
      indicatorMaterial.alpha = 0.7;
      placementIndicator.material = indicatorMaterial;
      
      hitTest.onHitTestResultObservable.add((results) => {
        if (results.length > 0) {
          placementIndicator.isVisible = true;
          const hitResult = results[0];
          hitResult.transformationMatrix.decompose(
            undefined,
            placementIndicator.rotationQuaternion!,
            placementIndicator.position
          );
        } else {
          placementIndicator.isVisible = false;
        }
      });
      
      // Enable light estimation
      try {
        featuresManager.enableFeature(
          BABYLON.WebXRLightEstimation,
          'latest',
          {
            createDirectionalLightSource: true,
            reflectionFormat: 'srgba8',
            cubeMapPollInterval: 1000
          }
        );
      } catch (e) {
        console.log('Light estimation not available');
      }
      
      // Enable plane detection
      try {
        featuresManager.enableFeature(
          BABYLON.WebXRPlaneDetector,
          'latest'
        );
      } catch (e) {
        console.log('Plane detection not available');
      }
      
      await xrHelper.baseExperience.enterXRAsync('immersive-ar', 'local-floor');
      
      set({
        xrHelper,
        isInXR: true,
        sessionType: 'immersive-ar'
      });
      
      xrHelper.baseExperience.onStateChangedObservable.add((state) => {
        if (state === BABYLON.WebXRState.NOT_IN_XR) {
          set({
            isInXR: false,
            sessionType: null
          });
          placementIndicator.dispose();
        }
      });
      
    } catch (error) {
      console.error('Failed to enter AR:', error);
      throw error;
    }
  },
  
  exitXR: async () => {
    const { xrHelper } = get();
    
    if (xrHelper?.baseExperience) {
      await xrHelper.baseExperience.exitXRAsync();
    }
    
    set({
      isInXR: false,
      sessionType: null,
      leftController: null,
      rightController: null,
      xrHelper: null
    });
  },
  
  setTeleportEnabled: (enabled: boolean) => set({ teleportEnabled: enabled }),
  setSnapTurnEnabled: (enabled: boolean) => set({ snapTurnEnabled: enabled }),
  setSnapTurnAngle: (angle: number) => set({ snapTurnAngle: angle }),
  setMovementSpeed: (speed: number) => set({ movementSpeed: speed }),
  setRoomScale: (scale: number) => set({ roomScale: scale })
}));

// XR Interaction Manager for object manipulation
export class XRInteractionManager {
  private scene: BABYLON.Scene;
  private grabbedObjects: Map<string, { mesh: BABYLON.AbstractMesh; hand: string }> = new Map();
  
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    window.addEventListener('xr:grab', ((e: CustomEvent) => {
      this.handleGrab(e.detail.hand, e.detail.controller);
    }) as EventListener);
    
    window.addEventListener('xr:release', ((e: CustomEvent) => {
      this.handleRelease(e.detail.hand);
    }) as EventListener);
    
    window.addEventListener('xr:select', ((e: CustomEvent) => {
      this.handleSelect(e.detail.hand, e.detail.controller);
    }) as EventListener);
  }
  
  private handleGrab(hand: string, controller: BABYLON.WebXRInputSource) {
    if (!controller.grip) return;
    
    // Ray cast from controller
    const ray = new BABYLON.Ray(
      controller.grip.position,
      controller.grip.forward,
      2
    );
    
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.isPickable && mesh.metadata?.grabbable !== false;
    });
    
    if (hit?.pickedMesh) {
      const mesh = hit.pickedMesh;
      
      // Parent to controller
      mesh.setParent(controller.grip);
      
      this.grabbedObjects.set(hand, { mesh, hand });
      
      window.dispatchEvent(new CustomEvent('xr:objectGrabbed', {
        detail: { mesh, hand }
      }));
    }
  }
  
  private handleRelease(hand: string) {
    const grabbed = this.grabbedObjects.get(hand);
    if (grabbed) {
      grabbed.mesh.setParent(null);
      this.grabbedObjects.delete(hand);
      
      window.dispatchEvent(new CustomEvent('xr:objectReleased', {
        detail: { mesh: grabbed.mesh, hand }
      }));
    }
  }
  
  private handleSelect(hand: string, controller: BABYLON.WebXRInputSource) {
    if (!controller.pointer) return;
    
    const ray = new BABYLON.Ray(
      controller.pointer.position,
      controller.pointer.forward,
      100
    );
    
    const hit = this.scene.pickWithRay(ray);
    
    if (hit?.pickedMesh) {
      window.dispatchEvent(new CustomEvent('xr:objectSelected', {
        detail: { mesh: hit.pickedMesh, hand, point: hit.pickedPoint }
      }));
    }
  }
  
  dispose() {
    // Clean up grabbed objects
    this.grabbedObjects.forEach(({ mesh }) => {
      mesh.setParent(null);
    });
    this.grabbedObjects.clear();
  }
}

export default useXRStore;
