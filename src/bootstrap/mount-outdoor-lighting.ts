import { mountIsland } from './mount';

export function mountOutdoorLighting(): Promise<unknown> {
  return mountIsland('outdoorLightingRoot', () =>
    import('../apps/OutdoorLightingApp').then((m) => m.default),
  );
}
