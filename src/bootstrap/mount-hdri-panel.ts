import { mountIsland } from './mount';

export function mountHdriPanel(): Promise<unknown> {
  return mountIsland('hdriPanelRoot', () =>
    import('../App').then((m) => m.HDRIPanelApp),
  );
}
