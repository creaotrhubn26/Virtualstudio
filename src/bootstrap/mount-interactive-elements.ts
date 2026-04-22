import { mountIsland } from './mount';

export function mountInteractiveElements(): Promise<unknown> {
  return mountIsland('interactiveElementsRoot', () =>
    import('../App').then((m) => m.InteractiveElementsBrowserApp),
  );
}
