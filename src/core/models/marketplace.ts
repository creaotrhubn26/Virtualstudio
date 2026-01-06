export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  category: 'feature' | 'asset' | 'template' | 'plugin';
  price: number; // 0 for gratis
  currency?: string;
  thumbnail: string;
  screenshots: string[];
  version: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  rating: number; // 0-5
  reviewCount: number;
  downloadCount: number;
  installCount: number;
  tags: string[];
  features: string[];
  requirements?: {
    minVersion?: string;
    dependencies?: string[];
  };
  releaseDate: string;
  lastUpdated: string;
  license: string;
  whatsNew?: string; // Hva er nytt i denne versjonen
  isInstalled: boolean;
  installedVersion?: string;
  hasUpdate: boolean;
  isFavorite: boolean;
  toolConfig?: {
    panelComponent: string; // Navn på React-komponent
    icon: string; // SVG data URI
    order?: number; // Sorteringsrekkefølge
  };
}

export interface MarketplaceReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceFilters {
  category?: 'feature' | 'asset' | 'template' | 'plugin' | 'all';
  price?: 'free' | 'paid' | 'all';
  minRating?: number;
  installationStatus?: 'installed' | 'not-installed' | 'has-update' | 'all';
  sortBy?: 'name' | 'price' | 'rating' | 'popularity' | 'newest';
  tags?: string[];
}

