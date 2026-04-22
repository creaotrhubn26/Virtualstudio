import { mountIsland } from './mount';

export function mountPosingMode(): Promise<unknown> {
  return mountIsland('posingModePanelRoot', () =>
    import('../apps/PosingModePanelApp').then((m) => m.default),
  );
}
