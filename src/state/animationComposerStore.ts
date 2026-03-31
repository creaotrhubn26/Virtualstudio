import { create } from 'zustand';

// ============================================================================
// Types for Animation Composer System
// ============================================================================

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic' | 'sine' | 'quad' | 'cubic' | 'expo';

// Extended tracking modes
export type TrackingMode =
  | 'none'             // No tracking
  | 'lookAt'           // Light always points at target
  | 'follow'           // Light follows target position
  | 'followWithOffset' // Follow with fixed offset
  | 'orbit'            // Orbit around target
  | 'mirror'           // Mirror target's position
  | 'leadFollow'       // Follow with prediction/anticipation
  | 'elastic'          // Elastic/springy following
  | 'parallel'         // Move parallel to target
  | 'inverse';         // Move opposite to target

// Extended behavior types for light animation
export type BehaviorType =
  // Movement behaviors
  | 'orbit'      // Circular orbit around a point
  | 'pendulum'   // Swing back and forth
  | 'bounce'     // Bounce up and down
  | 'wave'       // Sine wave motion
  | 'spiral'     // Spiral upward/downward
  | 'figure8'    // Figure-8 pattern
  // Intensity behaviors
  | 'breathe'    // Smooth intensity fade in/out
  | 'flicker'    // Random flickering
  | 'pulse'      // Sharp intensity pulse
  | 'strobe'     // On/off strobe effect
  // Physical simulation
  | 'shake'      // Random shake/vibration
  | 'sway'       // Gentle swaying motion
  | 'drift'      // Slow random drift
  | 'jitter'     // Small quick movements
  // Pattern behaviors
  | 'zigzag'     // Zigzag movement
  | 'heartbeat'  // Double pulse like heartbeat
  | 'lightning'  // Random lightning-like flashes
  | 'candle'     // Candle-like flame effect
  | 'disco'      // Rapid color/intensity changes
  | 'sunrise';   // Gradual intensity increase

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AnimationKeyframe {
  id: string;
  time: number;          // Time in seconds
  position?: Vector3;
  rotation?: Vector3;
  intensity?: number;
  color?: string;
  cct?: number;
  easing: EasingType;
}

export interface TrackingConfig {
  mode: TrackingMode;
  targetId: string | null;     // ID of object to track (light, mesh, camera, or position marker)
  targetType: 'light' | 'mesh' | 'camera' | 'point' | 'actor';
  offset?: Vector3;            // Offset from target
  smoothing: number;           // 0-1, how smooth the tracking is
  constraints?: {
    minDistance?: number;
    maxDistance?: number;
    lockX?: boolean;
    lockY?: boolean;
    lockZ?: boolean;
  };
}

export interface AnimationBehavior {
  id: string;
  type: BehaviorType;
  enabled: boolean;
  speed: number;               // Multiplier for animation speed
  amplitude?: number;          // For oscillating behaviors
  axis?: 'x' | 'y' | 'z' | 'all';
  radius?: number;             // For orbit behavior
  phase?: number;              // Phase offset for syncing
  loop: boolean;
  params?: Record<string, number | string | boolean>;
}

export type AnimatableProperty = 
  // Position
  | 'position.x' | 'position.y' | 'position.z'
  // Rotation
  | 'rotation.x' | 'rotation.y' | 'rotation.z'
  // Scale
  | 'scale.x' | 'scale.y' | 'scale.z'
  // Light properties
  | 'intensity' | 'cct' | 'radius' | 'angle'
  // Camera properties
  | 'fov' | 'aperture' | 'iso' | 'focalLength'
  // Material properties for walls/floors
  | 'material.emissiveIntensity'
  | 'material.color.r' | 'material.color.g' | 'material.color.b'
  | 'material.roughness' | 'material.metallic' | 'material.reflectivity'
  // Atmosphere properties
  | 'fog.density'
  | 'fog.color.r' | 'fog.color.g' | 'fog.color.b'
  | 'ambient.intensity'
  | 'ambient.color.r' | 'ambient.color.g' | 'ambient.color.b';

export interface AnimationLayer {
  id: string;
  name: string;
  targetId: string;            // Light ID, Camera ID, Mesh ID, Wall ID, Floor ID, or 'atmosphere'
  targetType: 'light' | 'camera' | 'mesh' | 'group' | 'wall' | 'floor' | 'atmosphere' | 'actor';
  enabled: boolean;
  solo: boolean;
  locked: boolean;
  color: string;               // UI color for track
  
  // Animation data
  keyframes: AnimationKeyframe[];
  behaviors: AnimationBehavior[];
  tracking?: TrackingConfig;
  
  // Blend settings
  blendMode: 'replace' | 'add' | 'multiply';
  weight: number;              // 0-1
}

export interface AnimationSequence {
  id: string;
  name: string;
  description: string;
  duration: number;            // Total duration in seconds
  fps: number;
  layers: AnimationLayer[];
  thumbnail?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PathPoint {
  id: string;
  position: Vector3;
  rotation?: Vector3;
  time?: number;               // Optional time hint
}

export interface AnimationPath {
  id: string;
  name: string;
  points: PathPoint[];
  closed: boolean;             // Loop back to start
  tension: number;             // Curve tension 0-1
}

// ============================================================================
// Store State
// ============================================================================

interface AnimationComposerState {
  // Current sequence
  activeSequence: AnimationSequence | null;
  sequences: AnimationSequence[];

  // Paths
  paths: AnimationPath[];

  // Playback
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  playbackSpeed: number;

  // Selection
  selectedLayerId: string | null;
  selectedKeyframeIds: string[];
  selectedBehaviorId: string | null;

  // UI State
  zoom: number;
  scrollX: number;
  showCurveEditor: boolean;
  showBehaviorPanel: boolean;
  showTrackingPanel: boolean;

  // Available targets (populated from scene)
  availableTargets: { id: string; name: string; type: 'light' | 'camera' | 'mesh' | 'actor' | 'wall' | 'floor' | 'atmosphere' }[];

  // Actions
  createSequence: (name: string, duration?: number) => AnimationSequence;
  deleteSequence: (id: string) => void;
  setActiveSequence: (id: string | null) => void;
  updateSequence: (id: string, updates: Partial<AnimationSequence>) => void;

  // Layer actions
  addLayer: (layer: Omit<AnimationLayer, 'id'>) => AnimationLayer | null;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<AnimationLayer>) => void;
  duplicateLayer: (layerId: string) => AnimationLayer | null;

  // Keyframe actions
  addKeyframe: (layerId: string, keyframe: Omit<AnimationKeyframe, 'id'>) => void;
  removeKeyframe: (layerId: string, keyframeId: string) => void;
  updateKeyframe: (layerId: string, keyframeId: string, updates: Partial<AnimationKeyframe>) => void;
  moveKeyframe: (layerId: string, keyframeId: string, newTime: number) => void;

  // Behavior actions
  addBehavior: (layerId: string, behavior: Omit<AnimationBehavior, 'id'>) => void;
  removeBehavior: (layerId: string, behaviorId: string) => void;
  updateBehavior: (layerId: string, behaviorId: string, updates: Partial<AnimationBehavior>) => void;

  // Tracking actions
  setTracking: (layerId: string, config: TrackingConfig | undefined) => void;

  // Path actions
  createPath: (name: string) => AnimationPath;
  deletePath: (id: string) => void;
  updatePath: (id: string, updates: Partial<AnimationPath>) => void;
  addPathPoint: (pathId: string, point: Omit<PathPoint, 'id'>) => void;
  removePathPoint: (pathId: string, pointId: string) => void;

  // Playback actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLoop: () => void;

  // Selection
  selectLayer: (id: string | null) => void;
  selectKeyframes: (ids: string[]) => void;
  selectBehavior: (id: string | null) => void;

  // UI
  setZoom: (zoom: number) => void;
  setScrollX: (x: number) => void;
  toggleCurveEditor: () => void;
  toggleBehaviorPanel: () => void;
  toggleTrackingPanel: () => void;

  // Scene integration
  setAvailableTargets: (targets: AnimationComposerState['availableTargets']) => void;
}

// ============================================================================
// Utility functions
// ============================================================================

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createDefaultSequence = (name: string, duration: number = 10): AnimationSequence => ({
  id: generateId(),
  name,
  description: '',
  duration,
  fps: 30,
  layers: [],
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ============================================================================
// Store Implementation
// ============================================================================

export const useAnimationComposerStore = create<AnimationComposerState>((set, get) => ({
  activeSequence: null,
  sequences: [],
  paths: [],
  currentTime: 0,
  isPlaying: false,
  isLooping: true,
  playbackSpeed: 1,
  selectedLayerId: null,
  selectedKeyframeIds: [],
  selectedBehaviorId: null,
  zoom: 1,
  scrollX: 0,
  showCurveEditor: false,
  showBehaviorPanel: true,
  showTrackingPanel: true,
  availableTargets: [],

  // Sequence actions
  createSequence: (name, duration = 10) => {
    const seq = createDefaultSequence(name, duration);
    set(state => ({ sequences: [...state.sequences, seq], activeSequence: seq }));
    return seq;
  },

  deleteSequence: (id) => set(state => ({
    sequences: state.sequences.filter(s => s.id !== id),
    activeSequence: state.activeSequence?.id === id ? null : state.activeSequence
  })),

  setActiveSequence: (id) => set(state => ({
    activeSequence: id ? state.sequences.find(s => s.id === id) || null : null
  })),

  updateSequence: (id, updates) => set(state => {
    const sequences = state.sequences.map(s =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    const activeSequence = state.activeSequence?.id === id
      ? { ...state.activeSequence, ...updates, updatedAt: new Date().toISOString() }
      : state.activeSequence;
    return { sequences, activeSequence };
  }),

  // Layer actions
  addLayer: (layerData) => {
    const { activeSequence } = get();
    if (!activeSequence) return null;

    const layer: AnimationLayer = { ...layerData, id: generateId() };
    set(state => {
      if (!state.activeSequence) return state;
      const updatedSeq = {
        ...state.activeSequence,
        layers: [...state.activeSequence.layers, layer],
        updatedAt: new Date().toISOString()
      };
      return {
        activeSequence: updatedSeq,
        sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
      };
    });
    return layer;
  },

  removeLayer: (layerId) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.filter(l => l.id !== layerId),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s),
      selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId
    };
  }),

  updateLayer: (layerId, updates) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => l.id === layerId ? { ...l, ...updates } : l),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  duplicateLayer: (layerId) => {
    const { activeSequence } = get();
    if (!activeSequence) return null;

    const original = activeSequence.layers.find(l => l.id === layerId);
    if (!original) return null;

    const duplicate: AnimationLayer = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId(),
      name: `${original.name} (kopi)`
    };

    set(state => {
      if (!state.activeSequence) return state;
      const updatedSeq = {
        ...state.activeSequence,
        layers: [...state.activeSequence.layers, duplicate],
        updatedAt: new Date().toISOString()
      };
      return {
        activeSequence: updatedSeq,
        sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
      };
    });
    return duplicate;
  },

  // Keyframe actions
  addKeyframe: (layerId, keyframeData) => set(state => {
    if (!state.activeSequence) return state;
    const keyframe: AnimationKeyframe = { ...keyframeData, id: generateId() };
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        const keyframes = [...l.keyframes, keyframe].sort((a, b) => a.time - b.time);
        return { ...l, keyframes };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  removeKeyframe: (layerId, keyframeId) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        return { ...l, keyframes: l.keyframes.filter(k => k.id !== keyframeId) };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s),
      selectedKeyframeIds: state.selectedKeyframeIds.filter(id => id !== keyframeId)
    };
  }),

  updateKeyframe: (layerId, keyframeId, updates) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          keyframes: l.keyframes.map(k => k.id === keyframeId ? { ...k, ...updates } : k)
        };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  moveKeyframe: (layerId, keyframeId, newTime) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        const keyframes = l.keyframes
          .map(k => k.id === keyframeId ? { ...k, time: Math.max(0, newTime) } : k)
          .sort((a, b) => a.time - b.time);
        return { ...l, keyframes };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  // Behavior actions
  addBehavior: (layerId, behaviorData) => set(state => {
    if (!state.activeSequence) return state;
    const behavior: AnimationBehavior = { ...behaviorData, id: generateId() };
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        return { ...l, behaviors: [...l.behaviors, behavior] };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  removeBehavior: (layerId, behaviorId) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        return { ...l, behaviors: l.behaviors.filter(b => b.id !== behaviorId) };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  updateBehavior: (layerId, behaviorId, updates) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          behaviors: l.behaviors.map(b => b.id === behaviorId ? { ...b, ...updates } : b)
        };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  // Tracking actions
  setTracking: (layerId, config) => set(state => {
    if (!state.activeSequence) return state;
    const updatedSeq = {
      ...state.activeSequence,
      layers: state.activeSequence.layers.map(l => {
        if (l.id !== layerId) return l;
        return { ...l, tracking: config };
      }),
      updatedAt: new Date().toISOString()
    };
    return {
      activeSequence: updatedSeq,
      sequences: state.sequences.map(s => s.id === updatedSeq.id ? updatedSeq : s)
    };
  }),

  // Path actions
  createPath: (name) => {
    const path: AnimationPath = {
      id: generateId(),
      name,
      points: [],
      closed: false,
      tension: 0.5
    };
    set(state => ({ paths: [...state.paths, path] }));
    return path;
  },

  deletePath: (id) => set(state => ({ paths: state.paths.filter(p => p.id !== id) })),

  updatePath: (id, updates) => set(state => ({
    paths: state.paths.map(p => p.id === id ? { ...p, ...updates } : p)
  })),

  addPathPoint: (pathId, pointData) => set(state => ({
    paths: state.paths.map(p => {
      if (p.id !== pathId) return p;
      const point: PathPoint = { ...pointData, id: generateId() };
      return { ...p, points: [...p.points, point] };
    })
  })),

  removePathPoint: (pathId, pointId) => set(state => ({
    paths: state.paths.map(p => {
      if (p.id !== pathId) return p;
      return { ...p, points: p.points.filter(pt => pt.id !== pointId) };
    })
  })),

  // Playback
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  setCurrentTime: (time) => set(state => ({
    currentTime: Math.max(0, Math.min(time, state.activeSequence?.duration || 10))
  })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.1, Math.min(4, speed)) }),
  toggleLoop: () => set(state => ({ isLooping: !state.isLooping })),

  // Selection
  selectLayer: (id) => set({ selectedLayerId: id }),
  selectKeyframes: (ids) => set({ selectedKeyframeIds: ids }),
  selectBehavior: (id) => set({ selectedBehaviorId: id }),

  // UI
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setScrollX: (x) => set({ scrollX: Math.max(0, x) }),
  toggleCurveEditor: () => set(state => ({ showCurveEditor: !state.showCurveEditor })),
  toggleBehaviorPanel: () => set(state => ({ showBehaviorPanel: !state.showBehaviorPanel })),
  toggleTrackingPanel: () => set(state => ({ showTrackingPanel: !state.showTrackingPanel })),

  // Scene integration
  setAvailableTargets: (targets) => set({ availableTargets: targets }),
}));

// ============================================================================
// Behavior Presets
// ============================================================================

export const BEHAVIOR_PRESETS: Record<BehaviorType, Partial<AnimationBehavior>> = {
  // Movement behaviors
  orbit: { type: 'orbit', speed: 1, radius: 3, axis: 'y', loop: true },
  pendulum: { type: 'pendulum', speed: 1, amplitude: 2, axis: 'x', loop: true },
  bounce: { type: 'bounce', speed: 1, amplitude: 0.5, axis: 'y', loop: true },
  wave: { type: 'wave', speed: 0.5, amplitude: 1, axis: 'y', loop: true },
  spiral: { type: 'spiral', speed: 0.3, radius: 2, axis: 'y', loop: true },
  figure8: { type: 'figure8', speed: 0.5, radius: 1.5, loop: true },
  // Intensity behaviors
  breathe: { type: 'breathe', speed: 0.5, amplitude: 0.3, loop: true },
  flicker: { type: 'flicker', speed: 2, amplitude: 0.2, loop: true },
  pulse: { type: 'pulse', speed: 1.5, amplitude: 0.5, loop: true },
  strobe: { type: 'strobe', speed: 4, loop: true },
  // Physical simulation
  shake: { type: 'shake', speed: 3, amplitude: 0.1, loop: true },
  sway: { type: 'sway', speed: 0.3, amplitude: 0.3, axis: 'x', loop: true },
  drift: { type: 'drift', speed: 0.1, amplitude: 0.5, loop: true },
  jitter: { type: 'jitter', speed: 5, amplitude: 0.05, loop: true },
  // Pattern behaviors
  zigzag: { type: 'zigzag', speed: 1, amplitude: 1, loop: true },
  heartbeat: { type: 'heartbeat', speed: 1.2, amplitude: 0.4, loop: true },
  lightning: { type: 'lightning', speed: 0.5, amplitude: 1, loop: true },
  candle: { type: 'candle', speed: 2, amplitude: 0.15, loop: true },
  disco: { type: 'disco', speed: 3, amplitude: 0.8, loop: true },
  sunrise: { type: 'sunrise', speed: 0.1, amplitude: 1, loop: false },
};

export const TRACKING_PRESETS: Record<TrackingMode, Partial<TrackingConfig>> = {
  none: { mode: 'none', targetId: null, targetType: 'mesh', smoothing: 0 },
  lookAt: { mode: 'lookAt', targetId: null, targetType: 'actor', smoothing: 0.1 },
  follow: { mode: 'follow', targetId: null, targetType: 'actor', smoothing: 0.2, offset: { x: 0, y: 2, z: 0 } },
  followWithOffset: { mode: 'followWithOffset', targetId: null, targetType: 'actor', smoothing: 0.15, offset: { x: 2, y: 2, z: 2 } },
  orbit: { mode: 'orbit', targetId: null, targetType: 'actor', smoothing: 0 },
  mirror: { mode: 'mirror', targetId: null, targetType: 'light', smoothing: 0 },
  leadFollow: { mode: 'leadFollow', targetId: null, targetType: 'actor', smoothing: 0.3 },
  elastic: { mode: 'elastic', targetId: null, targetType: 'actor', smoothing: 0.05 },
  parallel: { mode: 'parallel', targetId: null, targetType: 'actor', smoothing: 0.1, offset: { x: 3, y: 0, z: 0 } },
  inverse: { mode: 'inverse', targetId: null, targetType: 'actor', smoothing: 0.1 },
};

