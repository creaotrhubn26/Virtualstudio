import { mountIsland } from './mount';

export function mountLightsBrowser(): Promise<unknown> {
  return mountIsland('lightsBrowserRoot', () =>
    import('../App').then((m) => m.LightsBrowserApp),
  );
}
