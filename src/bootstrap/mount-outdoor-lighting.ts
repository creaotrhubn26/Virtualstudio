import { mountIsland } from './mount';

export function mountOutdoorLighting(): Promise<unknown> {
  return mountIsland('outdoorLightingRoot', () =>
    import('../App').then((m) => m.OutdoorLightingApp),
  );
}
