import { mountIsland } from './mount';

export function mountAvatarGenerator(): Promise<unknown> {
  return mountIsland('avatarGeneratorRoot', () =>
    import('../apps/AvatarGeneratorApp').then((m) => m.default),
  );
}
