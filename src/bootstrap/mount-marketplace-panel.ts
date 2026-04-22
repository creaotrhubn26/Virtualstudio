import { mountIsland } from './mount';

export function mountMarketplacePanel(): Promise<unknown> {
  return mountIsland('marketplacePanelRoot', () =>
    import('../App').then((m) => m.MarketplacePanelApp),
  );
}
