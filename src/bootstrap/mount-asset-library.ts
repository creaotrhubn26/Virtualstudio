import { mountIsland } from './mount';

export function mountAssetLibrary(): Promise<unknown> {
  return mountIsland('assetLibraryRoot', () =>
    import('../apps/AssetLibraryApp').then((m) => m.default),
  );
}
