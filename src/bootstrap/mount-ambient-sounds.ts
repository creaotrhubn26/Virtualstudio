import { mountIsland } from './mount';

export function mountAmbientSounds(): Promise<unknown> {
  return mountIsland('ambientSoundsRoot', () =>
    import('../App').then((m) => m.AmbientSoundsBrowserApp),
  );
}
