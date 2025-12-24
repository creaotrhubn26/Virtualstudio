import { LibraryAsset, AssetType } from './library';

const USER_ASSETS_KEY = 'virtualstudio_user_assets';

function loadUserAssets(): LibraryAsset[] {
  try {
    const stored = localStorage.getItem(USER_ASSETS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load user assets:', e);
  }
  return [];
}

function storeUserAssets(assets: LibraryAsset[]): void {
  try {
    localStorage.setItem(USER_ASSETS_KEY, JSON.stringify(assets));
  } catch (e) {
    console.error('Failed to store user assets:', e);
  }
}

export async function saveUserAsset(asset: Omit<LibraryAsset, 'id'>): Promise<LibraryAsset> {
  const assets = loadUserAssets();
  const newAsset: LibraryAsset = {
    ...asset,
    id: `user_,${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  assets.push(newAsset);
  storeUserAssets(assets);
  return newAsset;
}

export async function getUserAssets(type?: AssetType): Promise<LibraryAsset[]> {
  const assets = loadUserAssets();
  if (type) {
    return assets.filter(a => a.type === type);
  }
  return assets;
}

export async function deleteUserAsset(id: string): Promise<void> {
  const assets = loadUserAssets();
  const filtered = assets.filter(a => a.id !== id);
  storeUserAssets(filtered);
}

export async function renameUserAsset(id: string, newTitle: string): Promise<void> {
  const assets = loadUserAssets();
  const asset = assets.find(a => a.id === id);
  if (asset) {
    asset.title = newTitle;
    storeUserAssets(assets);
  }
}
