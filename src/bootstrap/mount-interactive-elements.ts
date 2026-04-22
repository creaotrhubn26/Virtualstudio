import { mountIsland } from './mount';

export function mountInteractiveElements(): Promise<unknown> {
  return mountIsland('interactiveElementsRoot', () =>
    import('../apps/InteractiveElementsBrowserApp').then((m) => m.default),
  );
}
