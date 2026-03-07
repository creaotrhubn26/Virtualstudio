import { LibraryAsset, AssetType } from './library';
import settingsService, { getCurrentUserId } from '../../services/settingsService';

const USER_ASSETS_KEY = 'virtualstudio_user_assets';

async function loadUserAssets(): Promise<LibraryAsset[]> {
  const userId = getCurrentUserId();
  try {
    const remote = await settingsService.getSetting<LibraryAsset[]>(USER_ASSETS_KEY, { userId });
    if (remote) return remote;
  } catch (e) {
    console.error('Failed to load user assets:', e);
  }
  return [];
}

async function storeUserAssets(assets: LibraryAsset[]): Promise<void> {
  try {
    await settingsService.setSetting(USER_ASSETS_KEY, assets, { userId: getCurrentUserId() });
  } catch (e) {
    console.error('Failed to store user assets:', e);
  }
}

export async function saveUserAsset(asset: Omit<LibraryAsset, 'id'>): Promise<LibraryAsset> {
  const assets = await loadUserAssets();
  const newAsset: LibraryAsset = {
    ...asset,
    id: `user_,${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  assets.push(newAsset);
  await storeUserAssets(assets);
  return newAsset;
}

export async function getUserAssets(type?: AssetType): Promise<LibraryAsset[]> {
  const assets = await loadUserAssets();
  if (type) {
    return assets.filter(a => a.type === type);
  }
  return assets;
}

export async function deleteUserAsset(id: string): Promise<void> {
  const assets = await loadUserAssets();
  const filtered = assets.filter(a => a.id !== id);
  await storeUserAssets(filtered);
}

export async function renameUserAsset(id: string, newTitle: string): Promise<void> {
  const assets = await loadUserAssets();
  const asset = assets.find(a => a.id === id);
  if (asset) {
    asset.title = newTitle;
    await storeUserAssets(assets);
  }
}
