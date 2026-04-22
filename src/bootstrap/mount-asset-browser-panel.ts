import { mountIsland } from './mount';

export function mountAssetBrowserPanel(): Promise<unknown> {
  return mountIsland('assetBrowserPanelRoot', () =>
    import('../App').then((m) => m.AssetBrowserPanelApp),
  );
}
