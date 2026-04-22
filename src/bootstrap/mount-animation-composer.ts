import { mountIsland } from './mount';

export function mountAnimationComposer(): Promise<unknown> {
  return mountIsland('animationComposerRoot', () =>
    import('../App').then((m) => m.AnimationComposerApp),
  );
}
