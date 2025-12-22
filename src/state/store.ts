import { create } from 'zustand';

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
