import { mountIsland } from './mount';

export function mountCameraGear(): Promise<unknown> {
  return mountIsland('cameraGearRoot', () =>
    import('../App').then((m) => m.CameraGearApp),
  );
}
