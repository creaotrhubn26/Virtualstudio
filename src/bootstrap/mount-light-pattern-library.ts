import { mountIsland } from './mount';

export function mountLightPatternLibrary(): Promise<unknown> {
  return mountIsland('lightPatternLibraryRoot', () =>
    import('../App').then((m) => m.LightPatternLibraryApp),
  );
}
