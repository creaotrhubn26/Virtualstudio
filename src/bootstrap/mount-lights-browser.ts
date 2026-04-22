import { mountIsland } from './mount';

export function mountLightsBrowser(): Promise<unknown> {
  return mountIsland('lightsBrowserRoot', () =>
    import('../apps/LightsBrowserApp').then((m) => m.default),
  );
}
