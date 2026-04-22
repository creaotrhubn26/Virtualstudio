import { mountIsland } from './mount';

export function mountScenerPanel(): Promise<unknown> {
  return mountIsland('scenerPanelRoot', () =>
    import('../apps/ScenerPanelApp').then((m) => m.default),
  );
}
