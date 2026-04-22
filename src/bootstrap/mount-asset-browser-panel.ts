import { mountIsland } from './mount';

export function mountAssetBrowserPanel(): Promise<unknown> {
  return mountIsland('assetBrowserPanelRoot', () =>
    import('../apps/AssetBrowserPanelApp').then((m) => m.default),
  );
}
