import { afterEach, describe, expect, it } from 'vitest';
import { useCameraLightingSyncStore, type CameraLightingSyncSnapshot } from './cameraLightingSyncStore';

function createSnapshot(overrides: Partial<CameraLightingSyncSnapshot> = {}): CameraLightingSyncSnapshot {
  return {
    reason: 'test',
    updatedAt: '2026-03-20T00:00:00.000Z',
    camera: {
      position: [0, 1.6, 5],
      target: [0, 1.4, 0],
      fov: 0.8,
      focalLength: 50,
      aperture: 2.8,
      shutter: '1/125',
      iso: 100,
      nd: 0,
      whiteBalance: 5600,
      autoRig: false,
      planId: null,
      shotType: null,
      mood: null,
      lastSource: 'test',
    },
    lighting: {
      lights: [],
      autoRigPlanId: null,
      selectedLightId: null,
      lastSource: 'test',
    },
    selection: {
      selectedCameraBodyId: 'canon-r5',
      selectedLensId: 'canon-rf85',
      selectedLightId: null,
      lastSource: 'panel',
    },
    ...overrides,
  };
}

describe('cameraLightingSyncStore', () => {
  afterEach(() => {
    useCameraLightingSyncStore.getState().reset();
  });

  it('stores runtime snapshot and keeps light selection in sync', () => {
    useCameraLightingSyncStore.getState().setSelectedCameraBody('canon-r5', 'camera-gear-panel');
    useCameraLightingSyncStore.getState().setSelectedLens('canon-rf85', 'camera-gear-panel');

    useCameraLightingSyncStore.getState().publishRuntimeSnapshot(createSnapshot({
      lighting: {
        lights: [{
          id: 'light_0',
          name: 'Key Light',
          type: 'spotlight',
          enabled: true,
          intensity: 1.2,
          cct: 5600,
          role: 'key',
          purpose: 'Hero key',
          behaviorType: null,
          environmentAutoRig: true,
          position: [1, 2, 3],
          target: [0, 1, 0],
        }],
        autoRigPlanId: 'plan-123',
        selectedLightId: 'light_0',
        lastSource: 'environment-auto-rig',
      },
      selection: {
        selectedCameraBodyId: 'canon-r5',
        selectedLensId: 'canon-rf85',
        selectedLightId: 'light_0',
        lastSource: 'environment-auto-rig',
      },
    }));

    const state = useCameraLightingSyncStore.getState();
    expect(state.camera.focalLength).toBe(50);
    expect(state.lighting.lights).toHaveLength(1);
    expect(state.selection.selectedCameraBodyId).toBe('canon-r5');
    expect(state.selection.selectedLensId).toBe('canon-rf85');
    expect(state.selection.selectedLightId).toBe('light_0');
  });

  it('updates camera and lens selection independently of runtime snapshot', () => {
    const store = useCameraLightingSyncStore.getState();
    store.setSelectedCameraBody('sony-a7iv', 'camera-gear-panel');
    store.setSelectedLens('sony-85', 'camera-gear-panel');

    let state = useCameraLightingSyncStore.getState();
    expect(state.selection.selectedCameraBodyId).toBe('sony-a7iv');
    expect(state.selection.selectedLensId).toBe('sony-85');
    expect(state.selection.lastSource).toBe('camera-gear-panel');

    store.setSelectedLightId('light_2', 'light-controls');
    state = useCameraLightingSyncStore.getState();
    expect(state.selection.selectedLightId).toBe('light_2');
    expect(state.lighting.selectedLightId).toBe('light_2');
  });
});
