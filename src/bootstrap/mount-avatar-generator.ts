import { mountIsland } from './mount';

export function mountAvatarGenerator(): Promise<unknown> {
  return mountIsland('avatarGeneratorRoot', () =>
    import('../App').then((m) => m.AvatarGeneratorApp),
  );
}
