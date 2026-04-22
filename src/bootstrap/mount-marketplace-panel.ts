import { mountIsland } from './mount';

export function mountMarketplacePanel(): Promise<unknown> {
  return mountIsland('marketplacePanelRoot', () =>
    import('../apps/MarketplacePanelApp').then((m) => m.default),
  );
}
