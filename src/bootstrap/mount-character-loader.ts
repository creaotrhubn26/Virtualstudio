import { mountIsland } from './mount';

export function mountCharacterLoader(): Promise<unknown> {
  return mountIsland('characterLoaderRoot', () =>
    import('../App').then((m) => m.CharacterLoaderApp),
  );
}
