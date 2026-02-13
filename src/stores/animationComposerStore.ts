/**
 * Animation Composer Store - Zustand store for animation composition
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

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

export type BlendMode = 'replace' | 'additive' | 'multiply';
export type TargetType = 'light' | 'mesh' | 'camera' | 'point' | 'actor';

export interface AnimationKeyframe {
  id: string;
  time: number;
  value?: { x: number; y: number; z: number };
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
}

export interface AnimationBehavior {
  id: string;
  type: BehaviorType;
  enabled: boolean;
  speed: number;
  amplitude?: number;
  axis?: 'x' | 'y' | 'z' | 'all';
  radius?: number;
  loop: boolean;
  // Additional parameters for extended behaviors
  intensity?: number;     // For intensity-based behaviors
  randomness?: number;    // For random/noise behaviors (0-1)
  frequency?: number;     // For periodic behaviors
  phase?: number;         // Phase offset (0-360)
  decay?: number;         // For decaying animations
  color?: string;         // For color-changing behaviors
}

export interface TrackingConfig {
  mode: TrackingMode;
  targetId: string | null;
  targetType: TargetType;
  smoothing: number;
  offset?: { x: number; y: number; z: number };
}

export interface AnimationLayer {
  id: string;
  name: string;
  targetId: string;
  targetType: TargetType;
  enabled: boolean;
  solo: boolean;
  locked: boolean;
  color: string;
  keyframes: AnimationKeyframe[];
  behaviors: AnimationBehavior[];
  tracking?: TrackingConfig;
  blendMode: BlendMode;
  weight: number;
}

export interface AnimationSequence {
  id: string;
  name: string;
  duration: number;
  fps: number;
  layers: AnimationLayer[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackableTarget {
  id: string;
  name: string;
  type: TargetType;
}

// ============================================================================
// Store State
// ============================================================================

interface AnimationComposerState {
  sequences: AnimationSequence[];
  activeSequence: AnimationSequence | null;
  selectedLayerId: string | null;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  playbackSpeed: number;
  zoom: number;
  showBehaviorPanel: boolean;
  showTrackingPanel: boolean;
  availableTargets: TrackableTarget[];

  // Actions
  createSequence: (name: string) => void;
  setActiveSequence: (id: string | null) => void;
  updateSequence: (id: string, updates: Partial<AnimationSequence>) => void;
  deleteSequence: (id: string) => void;

  addLayer: (layer: Omit<AnimationLayer, 'id'>) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<AnimationLayer>) => void;
  duplicateLayer: (layerId: string) => void;
  selectLayer: (layerId: string | null) => void;

  addKeyframe: (layerId: string, keyframe: Omit<AnimationKeyframe, 'id'>) => void;
  removeKeyframe: (layerId: string, keyframeId: string) => void;
  updateKeyframe: (layerId: string, keyframeId: string, updates: Partial<AnimationKeyframe>) => void;

  addBehavior: (layerId: string, behavior: Omit<AnimationBehavior, 'id'>) => void;
  removeBehavior: (layerId: string, behaviorId: string) => void;
  updateBehavior: (layerId: string, behaviorId: string, updates: Partial<AnimationBehavior>) => void;

  setTracking: (layerId: string, tracking: TrackingConfig | undefined) => void;

  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLoop: () => void;
  setZoom: (zoom: number) => void;

  setAvailableTargets: (targets: TrackableTarget[]) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// Store Implementation
// ============================================================================

export const useAnimationComposerStore = create<AnimationComposerState>((set) => ({
  sequences: [],
  activeSequence: null,
  selectedLayerId: null,
  currentTime: 0,
  isPlaying: false,
  isLooping: true,
  playbackSpeed: 1,
  zoom: 1,
  showBehaviorPanel: true,
  showTrackingPanel: true,
  availableTargets: [],

  createSequence: (name) => {
    const newSequence: AnimationSequence = {
      id: generateId(),
      name,
      duration: 10,
      fps: 30,
      layers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set(state => ({
      sequences: [...state.sequences, newSequence],
      activeSequence: newSequence,
    }));
  },

  setActiveSequence: (id) => {
    set(state => ({
      activeSequence: id ? state.sequences.find(s => s.id === id) || null : null,
      selectedLayerId: null,
      currentTime: 0,
    }));
  },

  updateSequence: (id, updates) => {
    set(state => ({
      sequences: state.sequences.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s),
      activeSequence: state.activeSequence?.id === id
        ? { ...state.activeSequence, ...updates, updatedAt: new Date() }
        : state.activeSequence,
    }));
  },

  deleteSequence: (id) => {
    set(state => ({
      sequences: state.sequences.filter(s => s.id !== id),
      activeSequence: state.activeSequence?.id === id ? null : state.activeSequence,
    }));
  },

  addLayer: (layer) => {
    const newLayer: AnimationLayer = { ...layer, id: generateId() };
    set(state => {
      if (!state.activeSequence) return state;
      const updated = { ...state.activeSequence, layers: [...state.activeSequence.layers, newLayer] };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
        selectedLayerId: newLayer.id,
      };
    });
  },

  removeLayer: (layerId) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = { ...state.activeSequence, layers: state.activeSequence.layers.filter(l => l.id !== layerId) };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      };
    });
  },

  updateLayer: (layerId, updates) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l => l.id === layerId ? { ...l, ...updates } : l),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  duplicateLayer: (layerId) => {
    set(state => {
      if (!state.activeSequence) return state;
      const layer = state.activeSequence.layers.find(l => l.id === layerId);
      if (!layer) return state;
      const newLayer: AnimationLayer = {
        ...layer,
        id: generateId(),
        name: `${layer.name} (kopi)`,
        keyframes: layer.keyframes.map(k => ({ ...k, id: generateId() })),
        behaviors: layer.behaviors.map(b => ({ ...b, id: generateId() })),
      };
      const updated = { ...state.activeSequence, layers: [...state.activeSequence.layers, newLayer] };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
        selectedLayerId: newLayer.id,
      };
    });
  },

  selectLayer: (layerId) => set({ selectedLayerId: layerId }),

  addKeyframe: (layerId, keyframe) => {
    const newKeyframe: AnimationKeyframe = { ...keyframe, id: generateId() };
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId
            ? { ...l, keyframes: [...l.keyframes, newKeyframe].sort((a, b) => a.time - b.time) }
            : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  removeKeyframe: (layerId, keyframeId) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId
            ? { ...l, keyframes: l.keyframes.filter(k => k.id !== keyframeId) }
            : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  updateKeyframe: (layerId, keyframeId, updates) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId
            ? { ...l, keyframes: l.keyframes.map(k => k.id === keyframeId ? { ...k, ...updates } : k) }
            : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  addBehavior: (layerId, behavior) => {
    const newBehavior: AnimationBehavior = { ...behavior, id: generateId() };
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId
            ? { ...l, behaviors: [...l.behaviors, newBehavior] }
            : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  removeBehavior: (layerId, behaviorId) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId
            ? { ...l, behaviors: l.behaviors.filter(b => b.id !== behaviorId) }
            : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  updateBehavior: (layerId, behaviorId, updates) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId
            ? { ...l, behaviors: l.behaviors.map(b => b.id === behaviorId ? { ...b, ...updates } : b) }
            : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  setTracking: (layerId, tracking) => {
    set(state => {
      if (!state.activeSequence) return state;
      const updated = {
        ...state.activeSequence,
        layers: state.activeSequence.layers.map(l =>
          l.id === layerId ? { ...l, tracking } : l
        ),
      };
      return {
        activeSequence: updated,
        sequences: state.sequences.map(s => s.id === updated.id ? updated : s),
      };
    });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  toggleLoop: () => set(state => ({ isLooping: !state.isLooping })),
  setZoom: (zoom) => set({ zoom }),
  setAvailableTargets: (targets) => set({ availableTargets: targets }),
}));

