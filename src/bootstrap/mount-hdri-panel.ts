import { mountIsland } from './mount';

export function mountHdriPanel(): Promise<unknown> {
  return mountIsland('hdriPanelRoot', () =>
    import('../apps/HDRIPanelApp').then((m) => m.default),
  );
}
