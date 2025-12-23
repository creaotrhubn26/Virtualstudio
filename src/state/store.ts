import { create } from 'zustand';

export type FocusMode = 'single' | 'zone' | 'wide' | 'tracking';
export type SafeAreaMode = 'none' | 'action' | 'title' | 'both';
export type CompositionGuide = 'none' | 'thirds' | 'golden' | 'spiral' | 'diagonal' | 'center' | 'triangle' | 'symmetry';
export type HelperGuide = 'none' | 'colortemp' | 'exposure' | 'height' | 'glasses' | 'classphoto' | 'safety';

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
  toggleOverlay: () => void;
  setActivePoint: (id: number) => void;
  updateSinglePoint: (x: number, y: number) => void;
  updateZonePoint: (id: number, x: number, y: number) => void;
  setFocusDistance: (distance: number, objectName?: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  getActivePointPosition: () => { x: number; y: number };
}

const compositionGuides: CompositionGuide[] = ['none', 'thirds', 'golden', 'spiral', 'diagonal', 'center', 'triangle', 'symmetry'];
const helperGuides: HelperGuide[] = ['none', 'colortemp', 'exposure', 'height', 'glasses', 'classphoto', 'safety'];

export const useFocusStore = create<FocusState>((set, get) => ({
  mode: 'zone',
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
  toggleOverlay: () => set((state) => ({ showOverlay: !state.showOverlay })),
  
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

export interface NodeTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneNode {
  id: string;
  type: 'light' | 'model' | 'camera' | 'accessory' | 'background' | 'modifier';
  name: string;
  transform: NodeTransform;
  visible: boolean;
  userData?: Record<string, unknown>;
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
