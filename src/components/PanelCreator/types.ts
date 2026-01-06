/**
 * TypeScript types and interfaces for PanelCreator
 */

export type PanelType = 'function' | 'service';

export type PanelPosition = 'bottom' | 'left' | 'right' | 'top';

export type MarketplaceCategory = 'plugin' | 'service' | 'integration';

export interface PublishData {
  version: string;
  author: string;
  category: MarketplaceCategory;
  tags: string;
  price: number;
  makePublic: boolean;
}

export type PanelCategory = 'production' | 'planning' | 'tools' | 'communication' | 'analytics' | 'custom' | 'other';

export interface PanelConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  icon?: string;
  enabled: boolean;
  position: PanelPosition;
  defaultHeight?: number;
  content: string; // HTML content
  storageKey: string;
  type: PanelType;
  functionId?: string; // For CreatorHub functions
  serviceId?: string; // For external services
  order?: number; // Order for drag & drop reorganization
  category?: PanelCategory; // General category for organization
  tags?: string[]; // Tags for organization and filtering
  // Marketplace publishing
  publishedToMarketplace?: boolean;
  marketplaceId?: string;
  version?: string;
  author?: string;
  marketplaceCategory?: MarketplaceCategory; // Marketplace-specific category
}

export interface MarketplaceService {
  id: string;
  name: string;
  description: string;
  icon: string;
  installed: boolean;
  category: MarketplaceCategory;
  version?: string;
  author?: string;
}

export interface CreatorHubFunction {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
}

export interface FormData {
  name: string;
  title: string;
  description: string;
  enabled: boolean;
  position: PanelPosition;
  defaultHeight: number;
  content: string;
  type: PanelType;
  functionId: string;
  serviceId: string;
  version?: string;
  author?: string;
  category?: PanelCategory;
  tags?: string[];
  publishedToMarketplace?: boolean;
  marketplaceId?: string;
  marketplaceCategory?: MarketplaceCategory;
}

export type FilterType = 'all' | 'function' | 'service';
export type FilterStatus = 'all' | 'enabled' | 'disabled';

export interface ValidationErrors {
  [key: string]: string;
}

