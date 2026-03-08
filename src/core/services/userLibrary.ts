import { LibraryAsset, AssetType } from './library';
import settingsService, { getCurrentUserId } from '../../services/settingsService';

const USER_ASSETS_KEY = 'virtualstudio_user_assets';
const randomSuffix = () => Math.random().toString(36).slice(2, 11);

export interface SaveUserAssetInput {
  type: AssetType;
  title: string;
  thumbUrl?: string | null;
  thumbDataUrl?: string;
  data?: {
    modelUrl?: string;
    category?: string;
    metadata?: Record<string, unknown>;
  };
}

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

export async function saveUserAsset(asset: SaveUserAssetInput): Promise<LibraryAsset> {
  const assets = await loadUserAssets();
  const thumbUrl = asset.thumbUrl ?? asset.thumbDataUrl ?? null;
  const data = asset.data ?? {};

  const existing = assets.find((item) => {
    const existingModel = item.data?.modelUrl;
    const nextModel = data.modelUrl;
    return Boolean(existingModel && nextModel && existingModel === nextModel);
  });

  if (existing) {
    existing.title = asset.title || existing.title;
    existing.thumbUrl = thumbUrl || existing.thumbUrl;
    existing.type = asset.type;
    existing.data = { ...existing.data, ...data };
    await storeUserAssets(assets);
    return existing;
  }

  const newAsset: LibraryAsset = {
    id: `user_,${Date.now()}_${randomSuffix()}`,
    title: asset.title,
    type: asset.type,
    thumbUrl,
    data,
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
