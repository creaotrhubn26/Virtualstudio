import { mountIsland } from './mount';

export function mountAmbientSounds(): Promise<unknown> {
  return mountIsland('ambientSoundsRoot', () =>
    import('../apps/AmbientSoundsBrowserApp').then((m) => m.default),
  );
}
