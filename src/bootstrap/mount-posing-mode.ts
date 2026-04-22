import { mountIsland } from './mount';

export function mountPosingMode(): Promise<unknown> {
  return mountIsland('posingModePanelRoot', () =>
    import('../App').then((m) => m.PosingModePanelApp),
  );
}
