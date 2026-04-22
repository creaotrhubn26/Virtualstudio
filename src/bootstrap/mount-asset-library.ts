import { mountIsland } from './mount';

export function mountAssetLibrary(): Promise<unknown> {
  return mountIsland('assetLibraryRoot', () =>
    import('../App').then((m) => m.AssetLibraryApp),
  );
}
