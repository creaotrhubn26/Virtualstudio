import { create } from 'zustand';

export type FocusMode = 'none' | 'single' | 'zone' | 'wide' | 'tracking';
export type SafeAreaMode = 'none' | 'action' | 'title' | 'both';
export type CompositionGuide = 'none' | 'thirds' | 'golden' | 'spiral' | 'diagonal' | 'center' | 'triangle' | 'symmetry';
export type HelperGuide = 'none' | 'colortemp' | 'exposure' | 'height' | 'glasses' | 'classphoto' | 'safety' | 'lighting';

// Autofocus modes: AF-S (single), AF-C (continuous), MF (manual)
export type AutoFocusMode = 'MF' | 'AF-S' | 'AF-C';

// Eye detection priority
export type EyeDetectionPriority = 'nearest' | 'left' | 'right' | 'center';

export interface DetectedEye {
  id: string;
  actorName: string;
  eyeSide: 'left' | 'right';
  worldPosition: { x: number; y: number; z: number };
  distanceFromCamera: number;
  screenPosition: { x: number; y: number } | null;
}

export interface AutoFocusTarget {
  actorId: string;
  actorName: string;
  selectedEye: DetectedEye | null;
  focusDistance: number;
  isLocked: boolean;
}

export interface FocusPoint {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

interface FocusState {
  mode: FocusMode;
  safeAreaMode: SafeAreaMode;
  compositionGuide: CompositionGuide;
  helperGuide: HelperGuide;
  showGrid: boolean;
  showOverlay: boolean;
  activePointId: number;
  singlePoint: { x: number; y: number };
  zonePoints: FocusPoint[];
  focusDistance: number;
  hitObjectName: string | null;
  isDragging: boolean;
  
  setMode: (mode: FocusMode) => void;
  setSafeAreaMode: (mode: SafeAreaMode) => void;
  setCompositionGuide: (guide: CompositionGuide) => void;
  cycleCompositionGuide: () => void;
  setHelperGuide: (guide: HelperGuide) => void;
  cycleHelperGuide: () => void;
  toggleGrid: () => void;
  setShowGrid: (show: boolean) => void;
  toggleOverlay: () => void;
  setShowOverlay: (show: boolean) => void;
  setActivePoint: (id: number) => void;
  updateSinglePoint: (x: number, y: number) => void;
  updateZonePoint: (id: number, x: number, y: number) => void;
  setFocusDistance: (distance: number, objectName?: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  getActivePointPosition: () => { x: number; y: number };
}

const compositionGuides: CompositionGuide[] = ['none', 'thirds', 'golden', 'spiral', 'diagonal', 'center', 'triangle', 'symmetry'];
const helperGuides: HelperGuide[] = ['none', 'colortemp', 'exposure', 'height', 'glasses', 'classphoto', 'safety', 'lighting'];

export const useFocusStore = create<FocusState>((set, get) => ({
  mode: 'none',
  safeAreaMode: 'none',
  compositionGuide: 'none',
  helperGuide: 'none',
  showGrid: false,
  showOverlay: true,
  activePointId: 4,
  singlePoint: { x: 0.5, y: 0.5 },
  zonePoints: [
    { id: 0, x: 0.25, y: 0.25, active: false },
    { id: 1, x: 0.5, y: 0.25, active: false },
    { id: 2, x: 0.75, y: 0.25, active: false },
    { id: 3, x: 0.25, y: 0.5, active: false },
    { id: 4, x: 0.5, y: 0.5, active: true },
    { id: 5, x: 0.75, y: 0.5, active: false },
    { id: 6, x: 0.25, y: 0.75, active: false },
    { id: 7, x: 0.5, y: 0.75, active: false },
    { id: 8, x: 0.75, y: 0.75, active: false },
  ],
  focusDistance: 2.0,
  hitObjectName: null,
  isDragging: false,

  setMode: (mode) => set({ mode }),
  setSafeAreaMode: (mode) => set({ safeAreaMode: mode }),
  setCompositionGuide: (guide) => set({ compositionGuide: guide }),
  cycleCompositionGuide: () => set((state) => {
    const currentIndex = compositionGuides.indexOf(state.compositionGuide);
    const nextGuide = compositionGuides[(currentIndex + 1) % compositionGuides.length];
    return { compositionGuide: nextGuide };
  }),
  setHelperGuide: (guide) => set({ helperGuide: guide }),
  cycleHelperGuide: () => set((state) => {
    const currentIndex = helperGuides.indexOf(state.helperGuide);
    const nextGuide = helperGuides[(currentIndex + 1) % helperGuides.length];
    return { helperGuide: nextGuide };
  }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setShowGrid: (show) => set({ showGrid: show }),
  toggleOverlay: () => set((state) => ({ showOverlay: !state.showOverlay })),
  setShowOverlay: (show) => set({ showOverlay: show }),
  
  setActivePoint: (id) => set((state) => ({
    activePointId: id,
    zonePoints: state.zonePoints.map(p => ({ ...p, active: p.id === id }))
  })),
  
  updateSinglePoint: (x, y) => set({ singlePoint: { x, y } }),
  
  updateZonePoint: (id, x, y) => set((state) => ({
    zonePoints: state.zonePoints.map(p => 
      p.id === id ? { ...p, x, y } : p
    )
  })),
  
  setFocusDistance: (distance, objectName = null) => set({ 
    focusDistance: distance, 
    hitObjectName: objectName 
  }),
  
  setDragging: (isDragging) => set({ isDragging }),
  
  getActivePointPosition: () => {
    const state = get();
    if (state.mode === 'single') {
      return state.singlePoint;
    }
    const activePoint = state.zonePoints.find(p => p.id === state.activePointId);
    return activePoint ? { x: activePoint.x, y: activePoint.y } : { x: 0.5, y: 0.5 };
  }
}));

// Autofocus Store
interface AutoFocusState {
  mode: AutoFocusMode;
  eyePriority: EyeDetectionPriority;
  isActive: boolean;
  isTracking: boolean;
  detectedEyes: DetectedEye[];
  currentTarget: AutoFocusTarget | null;
  focusLocked: boolean;
  smoothTransitionSpeed: number; // 0.0-1.0, higher = faster focus
  showEyeIndicators: boolean;
  dofEnabled: boolean; // Enable/disable depth of field rendering effect
  
  setMode: (mode: AutoFocusMode) => void;
  setEyePriority: (priority: EyeDetectionPriority) => void;
  setActive: (active: boolean) => void;
  setTracking: (tracking: boolean) => void;
  setDetectedEyes: (eyes: DetectedEye[]) => void;
  setCurrentTarget: (target: AutoFocusTarget | null) => void;
  toggleFocusLock: () => void;
  setFocusLocked: (locked: boolean) => void;
  setSmoothTransitionSpeed: (speed: number) => void;
  setShowEyeIndicators: (show: boolean) => void;
  setDofEnabled: (enabled: boolean) => void;
  
  // Convenience methods
  triggerSingleFocus: () => void;
  getNearestEye: () => DetectedEye | null;
}

export const useAutoFocusStore = create<AutoFocusState>((set, get) => ({
  mode: 'AF-C',
  eyePriority: 'nearest',
  isActive: true,
  isTracking: true,
  detectedEyes: [],
  currentTarget: null,
  focusLocked: false,
  smoothTransitionSpeed: 0.15,
  showEyeIndicators: true,
  dofEnabled: true, // DOF enabled by default
  
  setMode: (mode) => set({ mode, isActive: mode !== 'MF', isTracking: mode === 'AF-C' }),
  setEyePriority: (priority) => set({ eyePriority: priority }),
  setActive: (active) => set({ isActive: active }),
  setTracking: (tracking) => set({ isTracking: tracking }),
  setDetectedEyes: (eyes) => set({ detectedEyes: eyes }),
  setCurrentTarget: (target) => set({ currentTarget: target }),
  toggleFocusLock: () => set((state) => ({ focusLocked: !state.focusLocked })),
  setFocusLocked: (locked) => set({ focusLocked: locked }),
  setSmoothTransitionSpeed: (speed) => set({ smoothTransitionSpeed: Math.max(0.01, Math.min(1.0, speed)) }),
  setShowEyeIndicators: (show) => set({ showEyeIndicators: show }),
  setDofEnabled: (enabled) => set({ dofEnabled: enabled }),
  
  triggerSingleFocus: () => {
    const state = get();
    if (state.mode === 'AF-S' && !state.focusLocked) {
      const nearest = state.detectedEyes.length > 0 
        ? state.detectedEyes.reduce((prev, curr) => 
            curr.distanceFromCamera < prev.distanceFromCamera ? curr : prev
          )
        : null;
      if (nearest) {
        set({ 
          focusLocked: true,
          currentTarget: {
            actorId: nearest.id.split('_')[0],
            actorName: nearest.actorName,
            selectedEye: nearest,
            focusDistance: nearest.distanceFromCamera,
            isLocked: true
          }
        });
      }
    }
  },
  
  getNearestEye: () => {
    const state = get();
    if (state.detectedEyes.length === 0) return null;
    
    switch (state.eyePriority) {
      case 'nearest':
        return state.detectedEyes.reduce((prev, curr) => 
          curr.distanceFromCamera < prev.distanceFromCamera ? curr : prev
        );
      case 'left':
        const leftEyes = state.detectedEyes.filter(e => e.eyeSide === 'left');
        return leftEyes.length > 0 
          ? leftEyes.reduce((prev, curr) => curr.distanceFromCamera < prev.distanceFromCamera ? curr : prev)
          : null;
      case 'right':
        const rightEyes = state.detectedEyes.filter(e => e.eyeSide === 'right');
        return rightEyes.length > 0 
          ? rightEyes.reduce((prev, curr) => curr.distanceFromCamera < prev.distanceFromCamera ? curr : prev)
          : null;
      case 'center':
        // Find eye closest to center of view
        return state.detectedEyes.reduce((prev, curr) => {
          if (!curr.screenPosition || !prev.screenPosition) return prev;
          const currDist = Math.hypot(curr.screenPosition.x - 0.5, curr.screenPosition.y - 0.5);
          const prevDist = Math.hypot(prev.screenPosition.x - 0.5, prev.screenPosition.y - 0.5);
          return currDist < prevDist ? curr : prev;
        });
      default:
        return state.detectedEyes[0] || null;
    }
  }
}));

// Focus Peaking Store
export type FocusPeakingColor = 'red' | 'green' | 'blue' | 'yellow' | 'white';

interface FocusPeakingState {
  enabled: boolean;
  color: FocusPeakingColor;
  intensity: number; // 0.0-1.0
  threshold: number; // Edge detection threshold 0.0-1.0
  depthAware: boolean; // Only show peaking in DOF focus range
  
  setEnabled: (enabled: boolean) => void;
  setColor: (color: FocusPeakingColor) => void;
  setIntensity: (intensity: number) => void;
  setThreshold: (threshold: number) => void;
  setDepthAware: (depthAware: boolean) => void;
  toggle: () => void;
}

export const useFocusPeakingStore = create<FocusPeakingState>((set) => ({
  enabled: false,
  color: 'red',
  intensity: 0.8,
  threshold: 0.3,
  depthAware: true,
  
  setEnabled: (enabled) => set({ enabled }),
  setColor: (color) => set({ color }),
  setIntensity: (intensity) => set({ intensity: Math.max(0, Math.min(1, intensity)) }),
  setThreshold: (threshold) => set({ threshold: Math.max(0, Math.min(1, threshold)) }),
  setDepthAware: (depthAware) => set({ depthAware }),
  toggle: () => set((state) => ({ enabled: !state.enabled })),
}));

export interface NodeTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface CameraSettings {
  aperture?: number;
  iso?: number;
  shutter?: number;
  focalLength?: number;
  sensor?: [number, number];
}

export interface SceneNode {
  id: string;
  type: 'light' | 'model' | 'camera' | 'accessory' | 'background' | 'modifier';
  name: string;
  transform: NodeTransform;
  visible: boolean;
  locked?: boolean;
  userData?: Record<string, unknown>;
  camera?: CameraSettings;
}

export interface ActorParams {
  height: number;
  weight: number;
  skinTone: string;
  gender: 'male' | 'female' | 'neutral';
  age: number;
  muscle: number;
}

interface AppState {
  scene: SceneNode[];
  selectedNodeId: string | null;
  actorParams: ActorParams;
  
  addNode: (node: SceneNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<SceneNode>) => void;
  selectNode: (id: string | null) => void;
  getNode: (id: string) => SceneNode | undefined;
  clearScene: () => void;
  setActorParams: (params: Partial<ActorParams>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  scene: [],
  selectedNodeId: null,
  actorParams: {
    height: 0.5,
    weight: 0.5,
    skinTone: '#FFDAB9',
    gender: 'neutral',
    age: 30,
    muscle: 0.5,
  },

  addNode: (node) => set((state) => ({
    scene: [...state.scene, node]
  })),

  removeNode: (id) => set((state) => ({
    scene: state.scene.filter((n) => n.id !== id),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
  })),

  updateNode: (id, updates) => set((state) => ({
    scene: state.scene.map((n) => 
      n.id === id ? { ...n, ...updates } : n
    )
  })),

  selectNode: (id) => set({ selectedNodeId: id }),

  getNode: (id) => get().scene.find((n) => n.id === id),

  clearScene: () => set({ scene: [], selectedNodeId: null }),

  setActorParams: (params) => set((state) => ({
    actorParams: { ...state.actorParams, ...params }
  })),
}));

export const useNodes = () => useAppStore((state) => state.scene);
export const useScene = () => {
  const scene = useAppStore((state) => state.scene);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  return {
    nodes: scene,
    selection: selectedNodeId ? [selectedNodeId] : [],
  };
};
