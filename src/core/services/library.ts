export type AssetType = 'character' | 'prop' | 'light' | 'modifier' | 'environment' | 'model';

export interface LibraryAsset {
  id: string;
  title: string;
  type: AssetType;
  thumbUrl: string | null;
  data: {
    modelUrl?: string;
    category?: string;
    metadata?: Record<string, unknown>;
  };
}

const AVATAR_ASSETS: LibraryAsset[] = [
  {
    id: 'avatar_child',
    title: 'Barn',
    type: 'character',
    thumbUrl: '/images/avatars/child_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_child.glb',
      category: 'avatar',
      metadata: { age: 'child', height: 120 }
    }
  },
  {
    id: 'avatar_teenager',
    title: 'Tenåring',
    type: 'character',
    thumbUrl: '/images/avatars/teenager_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_teenager.glb',
      category: 'avatar',
      metadata: { age: 'teenager', height: 165 }
    }
  },
  {
    id: 'avatar_woman',
    title: 'Voksen Kvinne',
    type: 'character',
    thumbUrl: '/images/avatars/woman_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_woman.glb',
      category: 'avatar',
      metadata: { age: 'adult', gender: 'female', height: 168 }
    }
  },
  {
    id: 'avatar_man',
    title: 'Voksen Mann',
    type: 'character',
    thumbUrl: '/images/avatars/man_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_man.glb',
      category: 'avatar',
      metadata: { age: 'adult', gender: 'male', height: 180 }
    }
  },
  {
    id: 'avatar_elderly',
    title: 'Eldre Kvinne',
    type: 'character',
    thumbUrl: '/images/avatars/elderly_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_elderly.glb',
      category: 'avatar',
      metadata: { age: 'elderly', height: 160 }
    }
  },
  {
    id: 'avatar_athlete',
    title: 'Atlet',
    type: 'character',
    thumbUrl: '/images/avatars/athlete_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_athlete.glb',
      category: 'avatar',
      metadata: { bodyType: 'athletic', height: 185 }
    }
  },
  {
    id: 'avatar_pregnant',
    title: 'Gravid',
    type: 'character',
    thumbUrl: '/images/avatars/pregnant_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_pregnant.glb',
      category: 'avatar',
      metadata: { bodyType: 'pregnant', height: 165 }
    }
  },
  {
    id: 'avatar_dancer',
    title: 'Balettdanser',
    type: 'character',
    thumbUrl: '/images/avatars/dancer_thumb.png',
    data: {
      modelUrl: '/models/avatars/avatar_dancer.glb',
      category: 'avatar',
      metadata: { bodyType: 'dancer', height: 170 }
    }
  }
];

const PROP_ASSETS: LibraryAsset[] = [
  {
    id: 'stool_wooden',
    title: 'Trekrakk',
    type: 'prop',
    thumbUrl: null,
    data: { modelUrl: '/models/props/stool.glb', category: 'furniture' }
  },
  {
    id: 'chair_posing',
    title: 'Posestol',
    type: 'prop',
    thumbUrl: null,
    data: { modelUrl: '/models/props/chair.glb', category: 'furniture' }
  }
];

const ALL_ASSETS: LibraryAsset[] = [...AVATAR_ASSETS, ...PROP_ASSETS];

export async function listMergedLibrary(type: AssetType): Promise<LibraryAsset[]> {
  return ALL_ASSETS.filter(a => a.type === type);
}

export async function searchMergedLibrary(type: AssetType, query: string): Promise<LibraryAsset[]> {
  let filtered = ALL_ASSETS.filter(a => a.type === type);
  
  if (query && query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.id.toLowerCase().includes(q)
    );
  }
  
  return filtered;
}
