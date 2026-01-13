/**
 * Interactive Elements Service
 * Handles interactive 3D elements like doors, light switches, animated objects
 * Physics-based interactions with Babylon.js
 */

import * as BABYLON from '@babylonjs/core';

// ============================================
// Types and Interfaces
// ============================================

export type InteractiveElementType = 
  | 'door'
  | 'light-switch'
  | 'neon-sign'
  | 'ventilation-fan'
  | 'flickering-light'
  | 'elevator-door'
  | 'garage-door'
  | 'traffic-light'
  | 'vending-machine'
  | 'arcade-machine';

export interface DoorOptions extends Record<string, unknown> {
  width?: number;
  height?: number;
  openAngle?: number;
  openSpeed?: number;
  autoClose?: boolean;
  autoCloseDelay?: number;
  sound?: string;
  color?: string;
  material?: 'metal' | 'wood' | 'glass';
}

export interface LightSwitchOptions extends Record<string, unknown> {
  targetLights?: string[];
  onColor?: string;
  offColor?: string;
  sound?: string;
}

export interface NeonSignOptions extends Record<string, unknown> {
  text?: string;
  color?: string;
  flickerIntensity?: number;
  flickerSpeed?: number;
}

export interface VentilationFanOptions extends Record<string, unknown> {
  speed?: number;
  size?: number;
  sound?: string;
}

export interface FlickeringLightOptions extends Record<string, unknown> {
  color?: string;
  intensity?: number;
  flickerPattern?: 'random' | 'regular' | 'dying';
  sound?: string;
}

export interface InteractiveElementConfig {
  id: string;
  type: InteractiveElementType;
  name: string;
  nameNo: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  options?: Record<string, unknown>;
}

// ============================================
// Interactive Element Definitions
// ============================================

export const INTERACTIVE_ELEMENTS: InteractiveElementConfig[] = [
  // Doors
  {
    id: 'metal-door',
    type: 'door',
    name: 'Metal Door',
    nameNo: 'Metalldør',
    position: [0, 0, 0],
    options: { material: 'metal', width: 1, height: 2.2, openAngle: 90, sound: 'door-metal' } as DoorOptions,
  },
  {
    id: 'wooden-door',
    type: 'door',
    name: 'Wooden Door',
    nameNo: 'Tredør',
    position: [0, 0, 0],
    options: { material: 'wood', width: 0.9, height: 2.1, openAngle: 100, sound: 'door-wood' } as DoorOptions,
  },
  {
    id: 'glass-door',
    type: 'door',
    name: 'Glass Door',
    nameNo: 'Glassdør',
    position: [0, 0, 0],
    options: { material: 'glass', width: 1, height: 2.3, openAngle: 90, sound: 'door-glass' } as DoorOptions,
  },
  {
    id: 'fire-exit',
    type: 'door',
    name: 'Fire Exit Door',
    nameNo: 'Brannuttgangsdør',
    position: [0, 0, 0],
    options: { material: 'metal', width: 0.9, height: 2.1, openAngle: 180, color: '#cc0000', sound: 'door-heavy' } as DoorOptions,
  },

  // Light Switches
  {
    id: 'wall-switch',
    type: 'light-switch',
    name: 'Wall Light Switch',
    nameNo: 'Vegg lysbryter',
    position: [0, 1.2, 0],
    options: { onColor: '#00ff00', offColor: '#333333', sound: 'switch-click' } as LightSwitchOptions,
  },
  {
    id: 'industrial-switch',
    type: 'light-switch',
    name: 'Industrial Switch',
    nameNo: 'Industriell bryter',
    position: [0, 1.3, 0],
    options: { onColor: '#ffcc00', offColor: '#222222', sound: 'switch-heavy' } as LightSwitchOptions,
  },

  // Neon Signs
  {
    id: 'neon-open',
    type: 'neon-sign',
    name: 'OPEN Neon Sign',
    nameNo: 'ÅPEN Neonskilt',
    position: [0, 2.5, 0],
    options: { text: 'OPEN', color: '#ff0066', flickerIntensity: 0.1, flickerSpeed: 5 } as NeonSignOptions,
  },
  {
    id: 'neon-bar',
    type: 'neon-sign',
    name: 'BAR Neon Sign',
    nameNo: 'BAR Neonskilt',
    position: [0, 2.5, 0],
    options: { text: 'BAR', color: '#00ccff', flickerIntensity: 0.15, flickerSpeed: 3 } as NeonSignOptions,
  },
  {
    id: 'neon-custom',
    type: 'neon-sign',
    name: 'Custom Neon',
    nameNo: 'Tilpasset neon',
    position: [0, 2.5, 0],
    options: { text: '★', color: '#ff00ff', flickerIntensity: 0.2, flickerSpeed: 4 } as NeonSignOptions,
  },

  // Ventilation Fans
  {
    id: 'vent-small',
    type: 'ventilation-fan',
    name: 'Small Vent Fan',
    nameNo: 'Liten ventilasjonsvifte',
    position: [0, 3, 0],
    options: { speed: 2, size: 0.5, sound: 'fan-small' } as VentilationFanOptions,
  },
  {
    id: 'vent-large',
    type: 'ventilation-fan',
    name: 'Large Industrial Fan',
    nameNo: 'Stor industrivifte',
    position: [0, 3, 0],
    options: { speed: 1, size: 1.2, sound: 'fan-industrial' } as VentilationFanOptions,
  },

  // Flickering Lights
  {
    id: 'flicker-fluorescent',
    type: 'flickering-light',
    name: 'Flickering Fluorescent',
    nameNo: 'Flimrende lysstoffrør',
    position: [0, 3, 0],
    options: { color: '#ffffff', intensity: 1, flickerPattern: 'dying', sound: 'fluorescent-buzz' } as FlickeringLightOptions,
  },
  {
    id: 'flicker-neon',
    type: 'flickering-light',
    name: 'Flickering Neon',
    nameNo: 'Flimrende neon',
    position: [0, 2.5, 0],
    options: { color: '#ff00ff', intensity: 0.8, flickerPattern: 'random', sound: 'neon-buzz' } as FlickeringLightOptions,
  },

  // Special Elements
  {
    id: 'elevator-door',
    type: 'elevator-door',
    name: 'Elevator Doors',
    nameNo: 'Heisdører',
    position: [0, 0, 0],
  },
  {
    id: 'garage-door',
    type: 'garage-door',
    name: 'Garage Door',
    nameNo: 'Garasjeport',
    position: [0, 0, 0],
  },
  {
    id: 'traffic-light',
    type: 'traffic-light',
    name: 'Traffic Light',
    nameNo: 'Trafikklys',
    position: [0, 3, 0],
  },
  {
    id: 'vending-machine',
    type: 'vending-machine',
    name: 'Vending Machine',
    nameNo: 'Brusautomat',
    position: [0, 0, 0],
  },
  {
    id: 'arcade-machine',
    type: 'arcade-machine',
    name: 'Arcade Cabinet',
    nameNo: 'Arkademaskin',
    position: [0, 0, 0],
  },
];

// ============================================
// Interactive Elements Service Class
// ============================================

class InteractiveElementsService {
  private scene: BABYLON.Scene | null = null;
  private activeElements: Map<string, BABYLON.Mesh> = new Map();
  private animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  private elementStates: Map<string, boolean> = new Map(); // true = open/on, false = closed/off

  // Initialize with Babylon scene
  initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    this.setupEventListeners();
    console.log('[InteractiveElements] Service initialized');
  }

  // Setup event listeners for interactions
  private setupEventListeners(): void {
    // Listen for element placement requests
    window.addEventListener('ie-place-element', ((event: CustomEvent) => {
      const { elementId, position, rotation, options } = event.detail;
      this.placeElement(elementId, position, rotation, options);
    }) as EventListener);

    // Listen for interaction requests
    window.addEventListener('ie-interact', ((event: CustomEvent) => {
      const { instanceId } = event.detail;
      this.interactWithElement(instanceId);
    }) as EventListener);

    // Listen for removal requests
    window.addEventListener('ie-remove-element', ((event: CustomEvent) => {
      const { instanceId } = event.detail;
      this.removeElement(instanceId);
    }) as EventListener);
  }

  // Place an interactive element in the scene
  placeElement(
    elementId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    customOptions?: Record<string, unknown>
  ): string | null {
    if (!this.scene) {
      console.error('[InteractiveElements] Scene not initialized');
      return null;
    }

    const elementDef = INTERACTIVE_ELEMENTS.find(e => e.id === elementId);
    if (!elementDef) {
      console.error(`[InteractiveElements] Element not found: ${elementId}`);
      return null;
    }

    const instanceId = `${elementId}-${Date.now()}`;
    const options = { ...elementDef.options, ...customOptions };

    let mesh: BABYLON.Mesh | null = null;

    switch (elementDef.type) {
      case 'door':
        mesh = this.createDoor(instanceId, position, rotation, options as DoorOptions);
        break;
      case 'light-switch':
        mesh = this.createLightSwitch(instanceId, position, rotation, options as LightSwitchOptions);
        break;
      case 'neon-sign':
        mesh = this.createNeonSign(instanceId, position, rotation, options as NeonSignOptions);
        break;
      case 'ventilation-fan':
        mesh = this.createVentilationFan(instanceId, position, rotation, options as VentilationFanOptions);
        break;
      case 'flickering-light':
        mesh = this.createFlickeringLight(instanceId, position, rotation, options as FlickeringLightOptions);
        break;
      default:
        mesh = this.createGenericElement(instanceId, elementDef.type, position, rotation);
    }

    if (mesh) {
      this.activeElements.set(instanceId, mesh);
      this.elementStates.set(instanceId, false);
      
      // Emit placement event
      window.dispatchEvent(new CustomEvent('ie-element-placed', {
        detail: { instanceId, elementId, type: elementDef.type, position }
      }));

      console.log(`[InteractiveElements] Placed ${elementDef.name} at`, position);
      return instanceId;
    }

    return null;
  }

  // Create a door mesh with physics-based animation
  private createDoor(
    instanceId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    options?: DoorOptions
  ): BABYLON.Mesh | null {
    if (!this.scene) return null;

    const width = options?.width ?? 1;
    const height = options?.height ?? 2.2;
    const depth = 0.08;
    const color = options?.color ?? '#666666';
    const material = options?.material ?? 'metal';

    // Create door mesh
    const door = BABYLON.MeshBuilder.CreateBox(instanceId, {
      width,
      height,
      depth,
    }, this.scene);

    // Position with pivot at edge for rotation
    door.position = new BABYLON.Vector3(position[0], position[1] + height / 2, position[2]);
    door.setPivotPoint(new BABYLON.Vector3(-width / 2, 0, 0));

    if (rotation) {
      door.rotation = new BABYLON.Vector3(
        BABYLON.Tools.ToRadians(rotation[0]),
        BABYLON.Tools.ToRadians(rotation[1]),
        BABYLON.Tools.ToRadians(rotation[2])
      );
    }

    // Create material based on type
    const doorMaterial = new BABYLON.StandardMaterial(`${instanceId}-mat`, this.scene);
    doorMaterial.diffuseColor = BABYLON.Color3.FromHexString(color);
    
    switch (material) {
      case 'metal':
        doorMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        doorMaterial.roughness = 0.3;
        break;
      case 'wood':
        doorMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        doorMaterial.roughness = 0.7;
        break;
      case 'glass':
        doorMaterial.alpha = 0.3;
        doorMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        break;
    }

    door.material = doorMaterial;

    // Make pickable for interactions
    door.isPickable = true;
    door.metadata = {
      interactiveType: 'door',
      instanceId,
      options,
    };

    // Create door frame
    this.createDoorFrame(instanceId, position, width, height, this.scene);

    // Create open/close animation
    this.createDoorAnimation(instanceId, door, options?.openAngle ?? 90, options?.openSpeed ?? 1);

    return door;
  }

  private createDoorFrame(
    instanceId: string,
    position: [number, number, number],
    width: number,
    height: number,
    scene: BABYLON.Scene
  ): void {
    const frameWidth = 0.08;
    
    // Left frame
    const leftFrame = BABYLON.MeshBuilder.CreateBox(`${instanceId}-frame-left`, {
      width: frameWidth,
      height: height + frameWidth * 2,
      depth: 0.12,
    }, scene);
    leftFrame.position = new BABYLON.Vector3(position[0] - width / 2 - frameWidth / 2, position[1] + height / 2, position[2]);

    // Right frame
    const rightFrame = BABYLON.MeshBuilder.CreateBox(`${instanceId}-frame-right`, {
      width: frameWidth,
      height: height + frameWidth * 2,
      depth: 0.12,
    }, scene);
    rightFrame.position = new BABYLON.Vector3(position[0] + width / 2 + frameWidth / 2, position[1] + height / 2, position[2]);

    // Top frame
    const topFrame = BABYLON.MeshBuilder.CreateBox(`${instanceId}-frame-top`, {
      width: width + frameWidth * 2,
      height: frameWidth,
      depth: 0.12,
    }, scene);
    topFrame.position = new BABYLON.Vector3(position[0], position[1] + height + frameWidth / 2, position[2]);

    // Frame material
    const frameMat = new BABYLON.StandardMaterial(`${instanceId}-frame-mat`, scene);
    frameMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    leftFrame.material = frameMat;
    rightFrame.material = frameMat;
    topFrame.material = frameMat;
  }

  private createDoorAnimation(
    instanceId: string,
    door: BABYLON.Mesh,
    openAngle: number,
    speed: number
  ): void {
    if (!this.scene) return;

    const frameRate = 30;
    const totalFrames = Math.round(30 / speed);

    // Open animation
    const openAnim = new BABYLON.Animation(
      `${instanceId}-open`,
      'rotation.y',
      frameRate,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    openAnim.setKeys([
      { frame: 0, value: 0 },
      { frame: totalFrames, value: BABYLON.Tools.ToRadians(openAngle) },
    ]);

    // Close animation
    const closeAnim = new BABYLON.Animation(
      `${instanceId}-close`,
      'rotation.y',
      frameRate,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    closeAnim.setKeys([
      { frame: 0, value: BABYLON.Tools.ToRadians(openAngle) },
      { frame: totalFrames, value: 0 },
    ]);

    door.animations = [openAnim, closeAnim];
  }

  // Create a light switch
  private createLightSwitch(
    instanceId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    options?: LightSwitchOptions
  ): BABYLON.Mesh | null {
    if (!this.scene) return null;

    // Create switch plate
    const plate = BABYLON.MeshBuilder.CreateBox(instanceId, {
      width: 0.08,
      height: 0.12,
      depth: 0.02,
    }, this.scene);

    plate.position = new BABYLON.Vector3(position[0], position[1], position[2]);

    if (rotation) {
      plate.rotation = new BABYLON.Vector3(
        BABYLON.Tools.ToRadians(rotation[0]),
        BABYLON.Tools.ToRadians(rotation[1]),
        BABYLON.Tools.ToRadians(rotation[2])
      );
    }

    // Material
    const plateMat = new BABYLON.StandardMaterial(`${instanceId}-mat`, this.scene);
    plateMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    plate.material = plateMat;

    // Create toggle switch
    const toggle = BABYLON.MeshBuilder.CreateBox(`${instanceId}-toggle`, {
      width: 0.02,
      height: 0.04,
      depth: 0.015,
    }, this.scene);
    toggle.parent = plate;
    toggle.position = new BABYLON.Vector3(0, 0, 0.02);

    const toggleMat = new BABYLON.StandardMaterial(`${instanceId}-toggle-mat`, this.scene);
    toggleMat.diffuseColor = BABYLON.Color3.FromHexString(options?.offColor ?? '#333333');
    toggle.material = toggleMat;

    plate.isPickable = true;
    plate.metadata = {
      interactiveType: 'light-switch',
      instanceId,
      options,
      toggleMesh: toggle,
      toggleMaterial: toggleMat,
    };

    return plate;
  }

  // Create a neon sign
  private createNeonSign(
    instanceId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    options?: NeonSignOptions
  ): BABYLON.Mesh | null {
    if (!this.scene) return null;

    const text = options?.text ?? 'NEON';
    const color = options?.color ?? '#ff00ff';

    // Create backing plate
    const backing = BABYLON.MeshBuilder.CreateBox(instanceId, {
      width: text.length * 0.3 + 0.2,
      height: 0.5,
      depth: 0.05,
    }, this.scene);

    backing.position = new BABYLON.Vector3(position[0], position[1], position[2]);

    if (rotation) {
      backing.rotation = new BABYLON.Vector3(
        BABYLON.Tools.ToRadians(rotation[0]),
        BABYLON.Tools.ToRadians(rotation[1]),
        BABYLON.Tools.ToRadians(rotation[2])
      );
    }

    // Dark backing material
    const backingMat = new BABYLON.StandardMaterial(`${instanceId}-backing`, this.scene);
    backingMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    backing.material = backingMat;

    // Create glowing neon material
    const neonMat = new BABYLON.StandardMaterial(`${instanceId}-neon`, this.scene);
    const neonColor = BABYLON.Color3.FromHexString(color);
    neonMat.diffuseColor = neonColor;
    neonMat.emissiveColor = neonColor;

    // Create neon tubes (simplified as cylinders)
    const neonGroup = new BABYLON.TransformNode(`${instanceId}-neon-group`, this.scene);
    neonGroup.parent = backing;

    // Create point light for glow effect
    const glowLight = new BABYLON.PointLight(`${instanceId}-glow`, new BABYLON.Vector3(0, 0, 0.1), this.scene);
    glowLight.parent = backing;
    glowLight.diffuse = neonColor;
    glowLight.intensity = 0.5;
    glowLight.range = 3;

    backing.isPickable = true;
    backing.metadata = {
      interactiveType: 'neon-sign',
      instanceId,
      options,
      glowLight,
      neonMaterial: neonMat,
    };

    // Start flicker animation if enabled
    if (options?.flickerIntensity && options.flickerIntensity > 0) {
      this.startNeonFlicker(instanceId, glowLight, neonMat, options);
    }

    return backing;
  }

  private startNeonFlicker(
    instanceId: string,
    light: BABYLON.PointLight,
    material: BABYLON.StandardMaterial,
    options: NeonSignOptions
  ): void {
    if (!this.scene) return;

    const baseIntensity = light.intensity;
    const flickerIntensity = options.flickerIntensity ?? 0.1;
    const flickerSpeed = options.flickerSpeed ?? 5;

    this.scene.registerBeforeRender(() => {
      const time = performance.now() / 1000;
      const flicker = Math.sin(time * flickerSpeed * Math.PI) * 0.5 + 0.5;
      const noise = Math.random() * flickerIntensity;
      
      light.intensity = baseIntensity * (1 - flickerIntensity + flicker * flickerIntensity + noise);
    });
  }

  // Create ventilation fan
  private createVentilationFan(
    instanceId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    options?: VentilationFanOptions
  ): BABYLON.Mesh | null {
    if (!this.scene) return null;

    const size = options?.size ?? 0.5;
    const speed = options?.speed ?? 2;

    // Create frame
    const frame = BABYLON.MeshBuilder.CreateTorus(`${instanceId}-frame`, {
      diameter: size * 2,
      thickness: size * 0.1,
    }, this.scene);

    frame.position = new BABYLON.Vector3(position[0], position[1], position[2]);
    frame.rotation.x = Math.PI / 2;

    const frameMat = new BABYLON.StandardMaterial(`${instanceId}-frame-mat`, this.scene);
    frameMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    frameMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    frame.material = frameMat;

    // Create blades
    const bladeGroup = new BABYLON.TransformNode(`${instanceId}-blades`, this.scene);
    bladeGroup.position = frame.position.clone();

    for (let i = 0; i < 4; i++) {
      const blade = BABYLON.MeshBuilder.CreateBox(`${instanceId}-blade-${i}`, {
        width: size * 0.15,
        height: size * 0.02,
        depth: size * 0.8,
      }, this.scene);
      
      blade.parent = bladeGroup;
      blade.rotation.y = (Math.PI / 2) * i;
      blade.position.z = size * 0.35;
      
      const bladeMat = new BABYLON.StandardMaterial(`${instanceId}-blade-mat-${i}`, this.scene);
      bladeMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      blade.material = bladeMat;
    }

    // Animate rotation
    this.scene.registerBeforeRender(() => {
      bladeGroup.rotation.x += 0.02 * speed;
    });

    frame.isPickable = true;
    frame.metadata = {
      interactiveType: 'ventilation-fan',
      instanceId,
      options,
      bladeGroup,
    };

    return frame;
  }

  // Create flickering light
  private createFlickeringLight(
    instanceId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    options?: FlickeringLightOptions
  ): BABYLON.Mesh | null {
    if (!this.scene) return null;

    const color = options?.color ?? '#ffffff';
    const intensity = options?.intensity ?? 1;
    const pattern = options?.flickerPattern ?? 'random';

    // Create light fixture
    const fixture = BABYLON.MeshBuilder.CreateCylinder(instanceId, {
      height: 0.1,
      diameterTop: 0.3,
      diameterBottom: 0.4,
    }, this.scene);

    fixture.position = new BABYLON.Vector3(position[0], position[1], position[2]);

    const fixtureMat = new BABYLON.StandardMaterial(`${instanceId}-mat`, this.scene);
    fixtureMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    fixture.material = fixtureMat;

    // Create light source
    const light = new BABYLON.PointLight(`${instanceId}-light`, fixture.position.add(new BABYLON.Vector3(0, -0.1, 0)), this.scene);
    light.diffuse = BABYLON.Color3.FromHexString(color);
    light.intensity = intensity;
    light.range = 8;

    // Apply flicker pattern
    let time = 0;
    this.scene.registerBeforeRender(() => {
      time += this.scene!.getEngine().getDeltaTime() / 1000;
      
      let flickerValue = 1;
      switch (pattern) {
        case 'random':
          flickerValue = 0.7 + Math.random() * 0.3;
          break;
        case 'regular':
          flickerValue = Math.sin(time * 10) * 0.2 + 0.8;
          break;
        case 'dying':
          flickerValue = Math.random() < 0.1 ? 0.1 : (0.6 + Math.random() * 0.4);
          break;
      }
      
      light.intensity = intensity * flickerValue;
    });

    fixture.isPickable = true;
    fixture.metadata = {
      interactiveType: 'flickering-light',
      instanceId,
      options,
      light,
    };

    return fixture;
  }

  // Create generic element placeholder
  private createGenericElement(
    instanceId: string,
    type: InteractiveElementType,
    position: [number, number, number],
    rotation?: [number, number, number]
  ): BABYLON.Mesh | null {
    if (!this.scene) return null;

    // Create a placeholder cube
    const mesh = BABYLON.MeshBuilder.CreateBox(instanceId, { size: 0.5 }, this.scene);
    mesh.position = new BABYLON.Vector3(position[0], position[1], position[2]);

    if (rotation) {
      mesh.rotation = new BABYLON.Vector3(
        BABYLON.Tools.ToRadians(rotation[0]),
        BABYLON.Tools.ToRadians(rotation[1]),
        BABYLON.Tools.ToRadians(rotation[2])
      );
    }

    const mat = new BABYLON.StandardMaterial(`${instanceId}-mat`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    mat.wireframe = true;
    mesh.material = mat;

    mesh.isPickable = true;
    mesh.metadata = {
      interactiveType: type,
      instanceId,
    };

    return mesh;
  }

  // Interact with an element (toggle state)
  interactWithElement(instanceId: string): void {
    const mesh = this.activeElements.get(instanceId);
    if (!mesh || !this.scene) return;

    const metadata = mesh.metadata;
    const currentState = this.elementStates.get(instanceId) ?? false;
    const newState = !currentState;

    switch (metadata.interactiveType) {
      case 'door':
        this.toggleDoor(mesh, newState, metadata.options);
        break;
      case 'light-switch':
        this.toggleLightSwitch(mesh, newState, metadata);
        break;
      case 'neon-sign':
        this.toggleNeonSign(mesh, newState, metadata);
        break;
    }

    this.elementStates.set(instanceId, newState);

    // Emit state change event
    window.dispatchEvent(new CustomEvent('ie-state-changed', {
      detail: { instanceId, state: newState, type: metadata.interactiveType }
    }));
  }

  private toggleDoor(mesh: BABYLON.Mesh, open: boolean, options?: DoorOptions): void {
    if (!this.scene) return;

    const animName = open ? `${mesh.name}-open` : `${mesh.name}-close`;
    const anim = mesh.animations.find(a => a.name === animName);
    
    if (anim) {
      this.scene.beginAnimation(mesh, 0, 30, false, 1);
    }

    // Play sound
    if (options?.sound) {
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { id: options.sound } }));
    }
  }

  private toggleLightSwitch(mesh: BABYLON.Mesh, on: boolean, metadata: any): void {
    const options = metadata.options as LightSwitchOptions;
    const toggleMat = metadata.toggleMaterial as BABYLON.StandardMaterial;
    
    if (toggleMat) {
      toggleMat.diffuseColor = BABYLON.Color3.FromHexString(
        on ? (options?.onColor ?? '#00ff00') : (options?.offColor ?? '#333333')
      );
    }

    // Toggle target lights
    if (options?.targetLights) {
      options.targetLights.forEach(lightId => {
        window.dispatchEvent(new CustomEvent('toggle-light', { detail: { lightId, on } }));
      });
    }

    // Play sound
    if (options?.sound) {
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { id: options.sound } }));
    }
  }

  private toggleNeonSign(mesh: BABYLON.Mesh, on: boolean, metadata: any): void {
    const glowLight = metadata.glowLight as BABYLON.PointLight;
    const neonMat = metadata.neonMaterial as BABYLON.StandardMaterial;
    
    if (glowLight) {
      glowLight.setEnabled(on);
    }
    
    if (neonMat) {
      if (on) {
        const color = BABYLON.Color3.FromHexString(metadata.options?.color ?? '#ff00ff');
        neonMat.emissiveColor = color;
      } else {
        neonMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
      }
    }
  }

  // Remove an element from the scene
  removeElement(instanceId: string): void {
    const mesh = this.activeElements.get(instanceId);
    if (mesh) {
      mesh.dispose();
      this.activeElements.delete(instanceId);
      this.elementStates.delete(instanceId);

      // Emit removal event
      window.dispatchEvent(new CustomEvent('ie-element-removed', {
        detail: { instanceId }
      }));

      console.log(`[InteractiveElements] Removed element: ${instanceId}`);
    }
  }

  // Get all active elements
  getActiveElements(): Map<string, BABYLON.Mesh> {
    return new Map(this.activeElements);
  }

  // Get element state
  getElementState(instanceId: string): boolean | undefined {
    return this.elementStates.get(instanceId);
  }

  // Get available element definitions
  getElementDefinitions(): InteractiveElementConfig[] {
    return [...INTERACTIVE_ELEMENTS];
  }

  // Get elements by type
  getElementsByType(type: InteractiveElementType): InteractiveElementConfig[] {
    return INTERACTIVE_ELEMENTS.filter(e => e.type === type);
  }

  // Cleanup
  dispose(): void {
    this.activeElements.forEach((mesh) => mesh.dispose());
    this.activeElements.clear();
    this.animationGroups.clear();
    this.elementStates.clear();
    this.scene = null;
    console.log('[InteractiveElements] Service disposed');
  }
}

// Export singleton instance
export const interactiveElementsService = new InteractiveElementsService();

// Export for use
export default interactiveElementsService;
