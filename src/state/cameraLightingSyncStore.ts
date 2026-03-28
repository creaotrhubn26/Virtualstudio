import { create } from 'zustand';

export interface CameraLightingSyncedCameraState {
  position: [number, number, number];
  target: [number, number, number] | null;
  fov: number;
  focalLength: number;
  aperture: number;
  shutter: string;
  iso: number;
  nd: number;
  whiteBalance?: number | null;
  autoRig: boolean;
  planId: string | null;
  shotType: string | null;
  mood: string | null;
  lastSource: string | null;
}

export interface CameraLightingSyncedLightState {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  intensity: number;
  cct: number | null;
  role: string | null;
  purpose: string | null;
  intent?: string | null;
  modifier?: string | null;
  beamAngle?: number | null;
  rationale?: string | null;
  hazeEnabled?: boolean | null;
  hazeDensity?: number | null;
  behaviorType: string | null;
  environmentAutoRig: boolean;
  position: [number, number, number];
  target: [number, number, number] | null;
  goboId?: string | null;
  goboPattern?: string | null;
  goboRotation?: number | null;
  goboSize?: number | null;
  goboIntensity?: number | null;
  goboProjectionApplied?: boolean | null;
}

export interface CameraLightingGearSelectionState {
  selectedCameraBodyId: string | null;
  selectedLensId: string | null;
  selectedLightId: string | null;
  lastSource: string | null;
}

export interface CameraLightingSyncSnapshot {
  reason: string;
  updatedAt: string;
  camera: CameraLightingSyncedCameraState;
  lighting: {
    lights: CameraLightingSyncedLightState[];
    autoRigPlanId: string | null;
    selectedLightId: string | null;
    lastSource: string | null;
  };
  selection: CameraLightingGearSelectionState;
}

interface CameraLightingSyncState {
  snapshot: CameraLightingSyncSnapshot | null;
  camera: CameraLightingSyncedCameraState;
  lighting: {
    lights: CameraLightingSyncedLightState[];
    autoRigPlanId: string | null;
    selectedLightId: string | null;
    lastSource: string | null;
  };
  selection: CameraLightingGearSelectionState;
  publishRuntimeSnapshot: (snapshot: CameraLightingSyncSnapshot) => void;
  setSelectedCameraBody: (cameraBodyId: string | null, source?: string) => void;
  setSelectedLens: (lensId: string | null, source?: string) => void;
  setSelectedLightId: (lightId: string | null, source?: string) => void;
  reset: () => void;
}

const DEFAULT_CAMERA_STATE: CameraLightingSyncedCameraState = {
  position: [0, 1.6, 5],
  target: [0, 1.5, 0],
  fov: 0.8,
  focalLength: 35,
  aperture: 2.8,
  shutter: '1/125',
  iso: 100,
  nd: 0,
  whiteBalance: 5600,
  autoRig: false,
  planId: null,
  shotType: null,
  mood: null,
  lastSource: null,
};

const DEFAULT_LIGHTING_STATE: CameraLightingSyncState['lighting'] = {
  lights: [],
  autoRigPlanId: null,
  selectedLightId: null,
  lastSource: null,
};

const DEFAULT_SELECTION_STATE: CameraLightingGearSelectionState = {
  selectedCameraBodyId: null,
  selectedLensId: null,
  selectedLightId: null,
  lastSource: null,
};

export const useCameraLightingSyncStore = create<CameraLightingSyncState>((set) => ({
  snapshot: null,
  camera: DEFAULT_CAMERA_STATE,
  lighting: DEFAULT_LIGHTING_STATE,
  selection: DEFAULT_SELECTION_STATE,
  publishRuntimeSnapshot: (snapshot) => set(() => ({
    snapshot,
    camera: snapshot.camera,
    lighting: snapshot.lighting,
    selection: snapshot.selection,
  })),
  setSelectedCameraBody: (selectedCameraBodyId, source = 'panel') => set((state) => ({
    selection: {
      ...state.selection,
      selectedCameraBodyId,
      lastSource: source,
    },
  })),
  setSelectedLens: (selectedLensId, source = 'panel') => set((state) => ({
    selection: {
      ...state.selection,
      selectedLensId,
      lastSource: source,
    },
  })),
  setSelectedLightId: (selectedLightId, source = 'runtime') => set((state) => ({
    lighting: {
      ...state.lighting,
      selectedLightId,
    },
    selection: {
      ...state.selection,
      selectedLightId,
      lastSource: source,
    },
  })),
  reset: () => set({
    snapshot: null,
    camera: DEFAULT_CAMERA_STATE,
    lighting: DEFAULT_LIGHTING_STATE,
    selection: DEFAULT_SELECTION_STATE,
  }),
}));
