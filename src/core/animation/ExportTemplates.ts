import React from 'react';
import {
  YouTube,
  Instagram,
  Smartphone,
  Inventory,
  Folder,
} from '@mui/icons-material';

export type TemplateIconName = string;

export type CategoryIconName =
  | 'social'
  | 'broadcast'
  | 'archive'
  | 'mobile'
  | 'web'
  | 'cinema'
  | 'custom'
  | 'Smartphone';

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
  Smartphone: React.createElement(Smartphone, { fontSize: 'small' }),
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
  schedule?: {
    type?: 'immediate' | 'delayed' | 'scheduled' | 'recurring' | 'delay' | 'specific_time';
    delayMinutes?: number;
    specificTime?: string;
  };
  presets?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  uploadToDrive?: boolean;
  createSubfolder?: boolean;
  subfolderName?: string;
  userId?: string;
  projectId?: string;
  projectName?: string;
  notifyOnComplete?: boolean;
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

export type ExportTemplateCategory = CategoryIconName;

export interface ScheduleConfig {
  type?: 'immediate' | 'delayed' | 'scheduled' | 'recurring' | 'delay' | 'specific_time';
  enabled?: boolean;
  startAt?: string;
  recurrence?: 'daily' | 'weekly' | 'none';
  notifyEmail?: string;
  delayMinutes?: number;
  specificTime?: string;
}

export interface CategoryConfig {
  label: string;
  icon: CategoryIconName;
  color: string;
}

export const TEMPLATE_CATEGORIES: Record<CategoryIconName, CategoryConfig> = {
  social: { label: 'Sosiale medier', icon: 'social', color: '#e91e63' },
  broadcast: { label: 'Kringkasting', icon: 'broadcast', color: '#f44336' },
  archive: { label: 'Arkiv', icon: 'archive', color: '#607d8b' },
  mobile: { label: 'Mobil', icon: 'mobile', color: '#4caf50' },
  web: { label: 'Web', icon: 'web', color: '#2196f3' },
  cinema: { label: 'Kino', icon: 'cinema', color: '#9c27b0' },
  custom: { label: 'Egendefinert', icon: 'custom', color: '#ff9800' },
  Smartphone: { label: 'Smarttelefon', icon: 'Smartphone', color: '#4caf50' },
};

class ExportTemplateService {
  private templates: ExportTemplate[] = [...EXPORT_TEMPLATES];
  private favorites: Set<string> = new Set();

  getAllTemplates(): ExportTemplate[] {
    return this.templates.map((t) => ({ ...t, isFavorite: this.favorites.has(t.id) }));
  }

  getTemplatesByCategory(category: ExportTemplateCategory): ExportTemplate[] {
    return this.getAllTemplates().filter((t) => t.category === category);
  }

  searchTemplates(query: string): ExportTemplate[] {
    const q = query.toLowerCase();
    return this.getAllTemplates().filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  toggleFavorite(id: string): void {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
  }

  getFavorites(): ExportTemplate[] {
    return this.getAllTemplates().filter((t) => this.favorites.has(t.id));
  }

  addCustomTemplate(template: Omit<ExportTemplate, 'id'>): ExportTemplate {
    const newTemplate: ExportTemplate = { ...template, id: `custom-${Date.now()}` };
    this.templates.push(newTemplate);
    return newTemplate;
  }

  deleteTemplate(id: string): void {
    this.templates = this.templates.filter((t) => t.id !== id);
  }

  updateTemplate(id: string, updates: Partial<ExportTemplate>): void {
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.templates[idx] = { ...this.templates[idx], ...updates };
    }
  }

  duplicateTemplate(id: string): ExportTemplate | null {
    const original = this.templates.find((t) => t.id === id);
    if (!original) return null;
    const copy: ExportTemplate = { ...original, id: `custom-${Date.now()}`, name: `${original.name}-copy`, label: `${original.label} (kopi)` };
    this.templates.push(copy);
    return copy;
  }

  createCustomTemplate(template: Omit<ExportTemplate, 'id'> | Omit<ExportTemplate, 'id' | 'category'>): ExportTemplate {
    const withCategory = { category: 'social' as CategoryIconName, ...template };
    return this.addCustomTemplate(withCategory as Omit<ExportTemplate, 'id'>);
  }

  getPresetsForTemplate(_templateId: string): ExportTemplate[] {
    return this.templates.slice(0, 4);
  }

  estimateDuration(_templateId: string, durationSeconds: number): number {
    return Math.round(durationSeconds * 0.5);
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }

  updateCustomTemplate(id: string, updates: Partial<ExportTemplate>): void {
    this.updateTemplate(id, updates);
  }

  deleteCustomTemplate(id: string): void {
    this.deleteTemplate(id);
  }

  toBatchConfig(template: ExportTemplate, overrides?: Partial<ExportTemplate>): import('./ExportScheduler').BatchExportConfig {
    const merged = { ...template, ...overrides };
    return {
      name: merged.name,
      presets: merged.presets,
      uploadToDrive: merged.uploadToDrive,
      driveConfig: undefined,
      priority: merged.priority ?? 'normal',
    };
  }
}

export const exportTemplateService = new ExportTemplateService();
