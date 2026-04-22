import { mountIsland } from './mount';

export function mountScenerPanel(): Promise<unknown> {
  return mountIsland('scenerPanelRoot', () =>
    import('../App').then((m) => m.ScenerPanelApp),
  );
}
