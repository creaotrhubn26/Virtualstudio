import { mountIsland } from './mount';

export function mountCameraGear(): Promise<unknown> {
  return mountIsland('cameraGearRoot', () =>
    import('../apps/CameraGearApp').then((m) => m.default),
  );
}
