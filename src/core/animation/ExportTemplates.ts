import React from 'react';
import {
  YouTube,
  Instagram,
  Smartphone,
  Inventory,
  Folder,
} from '@mui/icons-material';

export type TemplateIconName =
  | 'youtube'
  | 'instagram'
  | 'smartphone'
  | 'inventory'
  | 'folder'
  | 'star'
  | 'rocket'
  | 'video-file';

export type CategoryIconName =
  | 'social'
  | 'broadcast'
  | 'archive'
  | 'mobile'
  | 'web'
  | 'cinema'
  | 'custom';

export const TEMPLATE_ICONS: Record<TemplateIconName, React.ReactElement> = {
  youtube: React.createElement(YouTube, { fontSize: 'small' }),
  instagram: React.createElement(Instagram, { fontSize: 'small' }),
  smartphone: React.createElement(Smartphone, { fontSize: 'small' }),
  inventory: React.createElement(Inventory, { fontSize: 'small' }),
  folder: React.createElement(Folder, { fontSize: 'small' }),
  star: React.createElement(Folder, { fontSize: 'small' }),
  rocket: React.createElement(Folder, { fontSize: 'small' }),
  'video-file': React.createElement(Folder, { fontSize: 'small' }),
};

export const CATEGORY_ICONS: Record<CategoryIconName, React.ReactElement> = {
  social: React.createElement(Instagram, { fontSize: 'small' }),
  broadcast: React.createElement(YouTube, { fontSize: 'small' }),
  archive: React.createElement(Inventory, { fontSize: 'small' }),
  mobile: React.createElement(Smartphone, { fontSize: 'small' }),
  web: React.createElement(Folder, { fontSize: 'small' }),
  cinema: React.createElement(Folder, { fontSize: 'small' }),
  custom: React.createElement(Folder, { fontSize: 'small' }),
};

export interface ExportTemplate {
  id: string;
  name: string;
  label: string;
  description: string;
  category: CategoryIconName;
  icon: TemplateIconName;
  format: string;
  resolution: { width: number; height: number };
  fps: number;
  quality: number;
  isFavorite?: boolean;
  tags: string[];
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'youtube-1080p',
    name: 'youtube-1080p',
    label: 'YouTube 1080p',
    description: 'Standard YouTube HD-format',
    category: 'broadcast',
    icon: 'youtube',
    format: 'mp4',
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    quality: 85,
    tags: ['youtube', 'hd', 'sosiale-medier'],
  },
  {
    id: 'instagram-reel',
    name: 'instagram-reel',
    label: 'Instagram Reel',
    description: 'Vertikalt format for Instagram',
    category: 'social',
    icon: 'instagram',
    format: 'mp4',
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    quality: 80,
    tags: ['instagram', 'vertikal', 'reel'],
  },
  {
    id: 'cinema-4k',
    name: 'cinema-4k',
    label: 'Cinema 4K',
    description: 'Høykvalitets 4K for kino',
    category: 'cinema',
    icon: 'video-file',
    format: 'mov',
    resolution: { width: 3840, height: 2160 },
    fps: 24,
    quality: 100,
    tags: ['4k', 'kino', 'proff'],
  },
];

export function getTemplateIcon(iconName: TemplateIconName): React.ReactElement {
  return TEMPLATE_ICONS[iconName] || React.createElement(Folder, { fontSize: 'small' });
}

export function getCategoryIcon(iconName: CategoryIconName): React.ReactElement {
  return CATEGORY_ICONS[iconName] || React.createElement(Folder, { fontSize: 'small' });
}
