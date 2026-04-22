import { mountIsland } from './mount';

export function mountCharacterLoader(): Promise<unknown> {
  return mountIsland('characterLoaderRoot', () =>
    import('../apps/CharacterLoaderApp').then((m) => m.default),
  );
}
