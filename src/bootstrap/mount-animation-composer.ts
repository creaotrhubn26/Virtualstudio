import { mountIsland } from './mount';

export function mountAnimationComposer(): Promise<unknown> {
  return mountIsland('animationComposerRoot', () =>
    import('../apps/AnimationComposerApp').then((m) => m.default),
  );
}
