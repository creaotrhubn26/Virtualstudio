import { mountIsland } from './mount';

export function mountLightPatternLibrary(): Promise<unknown> {
  return mountIsland('lightPatternLibraryRoot', () =>
    import('../apps/LightPatternLibraryApp').then((m) => m.default),
  );
}
