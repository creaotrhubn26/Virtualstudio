import { SceneNode } from '../../state/store';

// Camera preset data structure
export interface CameraPreset {
  id: string; // 'camA', 'camB', etc.
  alpha: number;
  beta: number;
  radius: number;
  target: { x: number; y: number; z: number };
  fov: number;
}

// Light state for serialization
export interface LightState {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  cct: number;
  intensity: number;
  modifier: string;
  visible: boolean;
  specs?: {
    power?: number;
    beamAngle?: number;
    colorRendering?: number;
    [key: string]: any;
  };
}

// Camera settings
export interface CameraSettings {
  aperture: number;
  shutter: string;
  iso: number;
  focalLength: number;
  nd: number;
  whiteBalance?: number;
}

// Layer interface
export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  nodeIds: string[];
  opacity?: number; // 0-1
  blendingMode?: 'normal' | 'overlay' | 'multiply' | 'screen' | 'add' | 'subtract';
  parentId?: string; // For hierarchical grouping
  maskId?: string; // Reference to mask layer
}

// Keyframe interface
export interface Keyframe {
  time: number; // seconds
  type: 'camera' | 'light' | 'actor' | 'prop';
  targetId: string;
  properties: Record<string, any>;
}

// Timeline data
export interface TimelineData {
  duration: number; // seconds
  keyframes: Keyframe[];
}

// Scene version for version history
export interface SceneVersion {
  id: string;
  sceneId: string;
  version: number;
  createdAt: string;
  createdBy?: string;
  changes?: string;
  thumbnail?: string;
  data: Partial<SceneComposition>;
}

// Scene folder/collection for organization
export interface SceneFolder {
  id: string;
  name: string;
  parentId?: string;
  sceneIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Scene comparison data
export interface SceneComparison {
  scene1Id: string;
  scene2Id: string;
  differences: {
    cameras: { added: string[]; removed: string[]; modified: string[] };
    lights: { added: string[]; removed: string[]; modified: string[] };
    actors: { added: string[]; removed: string[]; modified: string[] };
    props: { added: string[]; removed: string[]; modified: string[] };
    settings: { changed: string[] };
    environment: {
      walls: { added: string[]; removed: string[]; modified: string[] };
      floors: { added: string[]; removed: string[]; modified: string[] };
      atmosphere: { changed: string[] };
    };
  };
}

// Environment state interfaces for Scene Composer
export interface WallState {
  id: string;
  assetId: string;  // Referanse til asset library
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialOverrides?: {
    color?: string;
    roughness?: number;
    emissiveColor?: string;
  };
}

export interface FloorState {
  id: string;
  assetId: string;
  position: [number, number, number];
  dimensions: { width: number; height: number };
  materialOverrides?: {
    color?: string;
    reflectivity?: number;
  };
}

export interface AtmosphereSettings {
  fogEnabled: boolean;
  fogDensity: number;
  fogColor: string;
  clearColor: string;
  ambientColor: string;
  ambientIntensity: number;
}

export interface GoboState {
  id: string;
  goboId: string;
  pattern: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  attachedToLightId?: string;
  options: {
    size: number;
    rotation: number;
    intensity: number;
  };
}

export interface EnvironmentState {
  walls: WallState[];
  floors: FloorState[];
  atmosphere?: AtmosphereSettings;
  preset?: string; // f.eks. 'lovecraft-temple'
}

// Main scene composition interface
export interface SceneComposition {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  
  // Scene elements
  cameras: CameraPreset[]; // All Cam A-E presets
  lights: LightState[]; // All light positions and settings
  actors: SceneNode[]; // All actors in scene
  props: SceneNode[]; // All props in scene
  cameraSettings: CameraSettings; // Aperture, ISO, shutter, etc.
  
  // Composition
  layers: Layer[];
  timeline?: TimelineData;
  
  // Environment (NEW)
  environment?: EnvironmentState;
  
  // Gobos
  gobos?: GoboState[];
  
  // Metadata
  thumbnail?: string; // Base64 encoded preview
  tags: string[];
  
  // New fields for Phase 1 improvements
  isFavorite?: boolean;
  folderId?: string;
  version?: number;
  size?: number; // Size in bytes
  order?: number; // For custom ordering
  comments?: SceneComment[];
  permissions?: ScenePermissions;
  deletedAt?: string; // For trash/recovery
}

// Scene comment
export interface SceneComment {
  id: string;
  sceneId: string;
  elementId?: string; // Optional: comment on specific element
  elementType?: 'camera' | 'light' | 'actor' | 'prop';
  text: string;
  author?: string;
  createdAt: string;
  position?: { x: number; y: number; z: number }; // 3D position for element comments
}

// Scene permissions
export interface ScenePermissions {
  canView: string[]; // User IDs
  canEdit: string[]; // User IDs
  canDelete: string[]; // User IDs
  isPublic: boolean;
}

// Helper function to create default layer
export function createDefaultLayer(id: string, name: string): Layer {
  return {
    id,
    name,
    color: '#00d4ff',
    visible: true,
    locked: false,
    nodeIds: []
  };
}

// Helper function to create default timeline
export function createDefaultTimeline(duration: number = 60): TimelineData {
  return {
    duration,
    keyframes: []
  };
}

