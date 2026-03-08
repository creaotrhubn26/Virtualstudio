import { MarketplaceProduct, MarketplaceReview, MarketplaceFilters } from '../core/models/marketplace';
import settingsService, { getCurrentUserId } from './settingsService';

const STORAGE_KEY = 'virtualStudio_marketplaceProducts';
const INSTALLED_KEY = 'virtualStudio_installedProducts';
const FAVORITES_KEY = 'virtualStudio_marketplaceFavorites';
const REVIEWS_KEY = 'virtualStudio_marketplaceReviews';
let cachedProducts: MarketplaceProduct[] = [];
let cachedInstalled: MarketplaceProduct[] = [];
let cachedFavorites: string[] = [];
let cachedReviews: MarketplaceReview[] = [];

const setProducts = (products: MarketplaceProduct[]): void => {
  cachedProducts = products;
  void settingsService.setSetting(STORAGE_KEY, products, { userId: getCurrentUserId() });
};

const setInstalled = (installed: MarketplaceProduct[]): void => {
  cachedInstalled = installed;
  void settingsService.setSetting(INSTALLED_KEY, installed, { userId: getCurrentUserId() });
};

const setFavorites = (favorites: string[]): void => {
  cachedFavorites = favorites;
  void settingsService.setSetting(FAVORITES_KEY, favorites, { userId: getCurrentUserId() });
};

const setReviews = (reviews: MarketplaceReview[]): void => {
  cachedReviews = reviews;
  void settingsService.setSetting(REVIEWS_KEY, reviews, { userId: getCurrentUserId() });
};

const hydrateMarketplaceFromDb = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const userId = getCurrentUserId();
    const [products, installed, favorites, reviews] = await Promise.all([
      settingsService.getSetting<MarketplaceProduct[]>(STORAGE_KEY, { userId }),
      settingsService.getSetting<MarketplaceProduct[]>(INSTALLED_KEY, { userId }),
      settingsService.getSetting<string[]>(FAVORITES_KEY, { userId }),
      settingsService.getSetting<MarketplaceReview[]>(REVIEWS_KEY, { userId }),
    ]);

    if (products) cachedProducts = products;
    if (installed) cachedInstalled = installed;
    if (favorites) cachedFavorites = favorites;
    if (reviews) cachedReviews = reviews;
  } catch {
    // Ignore hydration errors
  }
};

void hydrateMarketplaceFromDb();

// Helper functions to avoid circular references
const getAllProductsHelper = (): MarketplaceProduct[] => {
  if (cachedProducts.length === 0) return mockProducts;
  // Merge with mock data to ensure we always have the latest versions
  return cachedProducts.map(storedProduct => {
    const latestProduct = mockProducts.find(p => p.id === storedProduct.id);
    if (latestProduct) {
      // Preserve installation status but update other properties from mock data
      return {
        ...latestProduct,
        isInstalled: storedProduct.isInstalled,
        installedVersion: storedProduct.installedVersion,
        hasUpdate: storedProduct.hasUpdate,
        isFavorite: storedProduct.isFavorite
      };
    }
    return storedProduct;
  }).concat(
    // Add any new products from mock data that aren't in stored
    mockProducts.filter(mockProduct => !cachedProducts.find(p => p.id === mockProduct.id))
  );
};

const getInstalledProductsHelper = (): MarketplaceProduct[] => {
  return cachedInstalled;
};

const getReviewsHelper = (productId: string): MarketplaceReview[] => {
  return cachedReviews.filter(r => r.productId === productId);
};

// Mock data for development
const mockProducts: MarketplaceProduct[] = [
  {
    id: 'feature-advanced-rendering',
    name: 'Avansert Rendering Engine',
    description: 'Kraftig rendering-motor med støtte for ray tracing, global illumination og avanserte shadere.',
    category: 'feature',
    price: 299,
    currency: 'NOK',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 120\'%3E%3Crect fill=\'%2300d4ff\' width=\'200\' height=\'120\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' fill=\'white\' font-size=\'16\'%3ERendering%3C/text%3E%3C/svg%3E',
    screenshots: [],
    version: '1.0.0',
    author: { id: 'dev1', name: 'Virtual Studio Team' },
    rating: 4.5,
    reviewCount: 23,
    downloadCount: 150,
    installCount: 89,
    tags: ['rendering', 'ray-tracing', 'advanced'],
    features: ['Ray tracing', 'Global illumination', 'Advanced shaders', 'Real-time preview'],
    requirements: { minVersion: '1.0.0' },
    releaseDate: '2024-01-15',
    lastUpdated: '2024-12-20',
    license: 'Commercial',
    isInstalled: false,
    hasUpdate: false,
    isFavorite: false,
  },
  {
    id: 'asset-character-pack-1',
    name: 'Karakterpakke Pro',
    description: 'Samling av 10 profesjonelle 3D-karakterer med full rigging og animasjoner.',
    category: 'asset',
    price: 0,
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 120\'%3E%3Crect fill=\'%23ffb800\' width=\'200\' height=\'120\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' fill=\'white\' font-size=\'16\'%3EKarakterer%3C/text%3E%3C/svg%3E',
    screenshots: [],
    version: '2.1.0',
    author: { id: 'dev2', name: 'Asset Creator' },
    rating: 4.8,
    reviewCount: 156,
    downloadCount: 2500,
    installCount: 1800,
    tags: ['characters', '3d-models', 'rigged'],
    features: ['10 karakterer', 'Full rigging', 'Animasjoner', 'HD teksturer'],
    releaseDate: '2024-03-10',
    lastUpdated: '2024-12-15',
    license: 'Free',
    isInstalled: true,
    installedVersion: '2.0.0',
    hasUpdate: true,
    isFavorite: true,
  },
  {
    id: 'template-interior-scene',
    name: 'Interiør Scene Template',
    description: 'Ferdiglaget interiørscene med profesjonell belysning og komposisjon.',
    category: 'template',
    price: 149,
    currency: 'NOK',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 120\'%3E%3Crect fill=\'%2310b981\' width=\'200\' height=\'120\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' fill=\'white\' font-size=\'16\'%3ETemplate%3C/text%3E%3C/svg%3E',
    screenshots: [],
    version: '1.2.0',
    author: { id: 'dev3', name: 'Scene Designer' },
    rating: 4.2,
    reviewCount: 45,
    downloadCount: 320,
    installCount: 210,
    tags: ['template', 'interior', 'scene'],
    features: ['Ferdig scene', 'Profesjonell belysning', 'Kamera-presets'],
    releaseDate: '2024-05-20',
    lastUpdated: '2024-11-30',
    license: 'Commercial',
    isInstalled: false,
    hasUpdate: false,
    isFavorite: false,
  },
  {
    id: 'plugin-ai-assistant',
    name: 'AI Scene Assistant',
    description: 'AI-drevet assistent som hjelper deg med scene-komposisjon og optimalisering.',
    category: 'plugin',
    price: 199,
    currency: 'NOK',
    thumbnail: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 120\'%3E%3Cdefs%3E%3ClinearGradient id=\'aiBg\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' stop-color=\'%231a0d3d\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%230a0519\'/%3E%3C/linearGradient%3E%3ClinearGradient id=\'aiFloor\' x1=\'0%25\' y1=\'0%25\' x2=\'0%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' stop-color=\'%23333\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%23444\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=\'url(%23aiBg)\' width=\'200\' height=\'120\'/%3E%3Crect y=\'80\' fill=\'url(%23aiFloor)\' width=\'200\' height=\'40\'/%3E%3Ctext x=\'100\' y=\'20\' font-family=\'Arial\' font-size=\'16\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'white\'%3EAI SCENE%3C/text%3E%3Ctext x=\'100\' y=\'35\' font-family=\'Arial\' font-size=\'11\' text-anchor=\'middle\' fill=\'%23aaa\'%3EASSISTANT%3C/text%3E%3C!-- Pulsating AI Nodes --%3E%3Ccircle cx=\'30\' cy=\'20\' r=\'8\' fill=\'%238b5cf6\' opacity=\'0.5\'%3E%3Canimate attributeName=\'opacity\' values=\'0.3;0.8;0.3\' dur=\'2s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3Ccircle cx=\'170\' cy=\'20\' r=\'8\' fill=\'%2300d4ff\' opacity=\'0.5\'%3E%3Canimate attributeName=\'opacity\' values=\'0.8;0.3;0.8\' dur=\'2s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3Ccircle cx=\'100\' cy=\'15\' r=\'6\' fill=\'%23ffb800\' opacity=\'0.6\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3C!-- Main AI Brain/Core --%3E%3Cg transform=\'translate(90,35)\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'12\' fill=\'none\' stroke=\'%238b5cf6\' stroke-width=\'2\' opacity=\'0.8\'/%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'8\' fill=\'none\' stroke=\'%2300d4ff\' stroke-width=\'1.5\' opacity=\'0.6\'/%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'4\' fill=\'%238b5cf6\' opacity=\'0.9\'%3E%3Canimate attributeName=\'opacity\' values=\'0.6;1;0.6\' dur=\'1s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3Cpath d=\'M10 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z\' fill=\'%23fff\'/%3E%3Cpath d=\'M18 10l-3 1-1 3-1-3-3-1 3-1 1-3z\' fill=\'%23fff\'/%3E%3Cpath d=\'M10 18l-1-3-3-1 3-1 1-3 1 3 3 1z\' fill=\'%23fff\'/%3E%3Cpath d=\'M2 10l3-1 1-3 1 3 3 1-3 1-1 3z\' fill=\'%23fff\'/%3E%3C!-- Bubble AI Brain --%3E%3Cg transform=\'translate(5,-15)\' opacity=\'0\'%3E%3Canimate attributeName=\'opacity\' values=\'0;1;1;0\' dur=\'4s\' repeatCount=\'indefinite\'/%3E%3Crect x=\'0\' y=\'0\' width=\'30\' height=\'15\' rx=\'5\' fill=\'white\' stroke=\'%23333\' stroke-width=\'0.5\'/%3E%3Ctext x=\'15\' y=\'10\' font-family=\'Arial\' font-size=\'8\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'black\'%3EAnalyserer...%3C/text%3E%3C/g%3E%3C/g%3E%3C!-- Camera with AI Analysis --%3E%3Cg transform=\'translate(30,50)\'%3E%3Crect x=\'0\' y=\'0\' width=\'20\' height=\'15\' rx=\'2\' fill=\'%23555\' stroke=\'%23fff\' stroke-width=\'1\'/%3E%3Ccircle cx=\'10\' cy=\'7.5\' r=\'4\' fill=\'%23333\'/%3E%3Ccircle cx=\'10\' cy=\'7.5\' r=\'2\' fill=\'%23000\'/%3E%3Crect x=\'15\' y=\'5\' width=\'3\' height=\'5\' rx=\'1\' fill=\'%23555\'/%3E%3C!-- AI Analysis Lines --%3E%3Cpath d=\'M25 5l5 0\' stroke=\'%238b5cf6\' stroke-width=\'1.5\' opacity=\'0.8\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' repeatCount=\'indefinite\'/%3E%3C/path%3E%3Cpath d=\'M25 7.5l5 0\' stroke=\'%2300d4ff\' stroke-width=\'1.5\' opacity=\'0.8\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' begin=\'0.3s\' repeatCount=\'indefinite\'/%3E%3C/path%3E%3Cpath d=\'M25 10l5 0\' stroke=\'%23ffb800\' stroke-width=\'1.5\' opacity=\'0.8\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' begin=\'0.6s\' repeatCount=\'indefinite\'/%3E%3C/path%3E%3C!-- Bubble Camera --%3E%3Cg transform=\'translate(30,-8)\' opacity=\'0\'%3E%3Canimate attributeName=\'opacity\' values=\'0;1;1;0\' dur=\'4s\' begin=\'0.5s\' repeatCount=\'indefinite\'/%3E%3Crect x=\'0\' y=\'0\' width=\'35\' height=\'15\' rx=\'5\' fill=\'white\' stroke=\'%23333\' stroke-width=\'0.5\'/%3E%3Ctext x=\'17.5\' y=\'10\' font-family=\'Arial\' font-size=\'7\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'black\'%3EOptimaliser!%3C/text%3E%3C/g%3E%3C/g%3E%3C!-- Light with AI --%3E%3Cg transform=\'translate(150,50)\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'8\' fill=\'%23ffb800\' opacity=\'0.6\'%3E%3Canimate attributeName=\'opacity\' values=\'0.3;0.9;0.3\' dur=\'2s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'5\' fill=\'%23fff\' opacity=\'0.8\'/%3E%3Cpath d=\'M10 0l2 6-2 2-2-2z\' fill=\'%23555\'/%3E%3Cpath d=\'M10 20l2-6-2-2-2 2z\' fill=\'%23555\'/%3E%3Cpath d=\'M0 10l6 2-2 2-2-2z\' fill=\'%23555\'/%3E%3Cpath d=\'M20 10l-6 2 2 2 2-2z\' fill=\'%23555\'/%3E%3C!-- AI Lines to Light --%3E%3Cpath d=\'M-10 10l-5 0\' stroke=\'%238b5cf6\' stroke-width=\'1.5\' opacity=\'0.8\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' repeatCount=\'indefinite\'/%3E%3C/path%3E%3Cpath d=\'M-10 8l-5 0\' stroke=\'%2300d4ff\' stroke-width=\'1.5\' opacity=\'0.8\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' begin=\'0.3s\' repeatCount=\'indefinite\'/%3E%3C/path%3E%3Cpath d=\'M-10 12l-5 0\' stroke=\'%23ffb800\' stroke-width=\'1.5\' opacity=\'0.8\'%3E%3Canimate attributeName=\'opacity\' values=\'0.4;1;0.4\' dur=\'1.5s\' begin=\'0.6s\' repeatCount=\'indefinite\'/%3E%3C/path%3E%3C!-- Bubble Light --%3E%3Cg transform=\'translate(-25,-8)\' opacity=\'0\'%3E%3Canimate attributeName=\'opacity\' values=\'0;1;1;0\' dur=\'4s\' begin=\'1s\' repeatCount=\'indefinite\'/%3E%3Crect x=\'0\' y=\'0\' width=\'30\' height=\'15\' rx=\'5\' fill=\'white\' stroke=\'%23333\' stroke-width=\'0.5\'/%3E%3Ctext x=\'15\' y=\'10\' font-family=\'Arial\' font-size=\'7\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'black\'%3E+15%25 kvalitet%3C/text%3E%3C/g%3E%3C/g%3E%3C!-- Scene Objects with AI Tags --%3E%3Cg transform=\'translate(20,65)\' opacity=\'0.8\'%3E%3Crect x=\'0\' y=\'0\' width=\'12\' height=\'8\' rx=\'1\' fill=\'%23666\'/%3E%3Ccircle cx=\'6\' cy=\'4\' r=\'2\' fill=\'%238b5cf6\' opacity=\'0.6\'%3E%3Canimate attributeName=\'opacity\' values=\'0.3;0.9;0.3\' dur=\'2s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3C!-- Bubble Object 1 --%3E%3Cg transform=\'translate(15,-6)\' opacity=\'0\'%3E%3Canimate attributeName=\'opacity\' values=\'0;1;1;0\' dur=\'4s\' begin=\'1.5s\' repeatCount=\'indefinite\'/%3E%3Crect x=\'0\' y=\'0\' width=\'25\' height=\'12\' rx=\'4\' fill=\'white\' stroke=\'%23333\' stroke-width=\'0.5\'/%3E%3Ctext x=\'12.5\' y=\'8\' font-family=\'Arial\' font-size=\'6\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'black\'%3EForbedre!%3C/text%3E%3C/g%3E%3C/g%3E%3Cg transform=\'translate(160,65)\' opacity=\'0.8\'%3E%3Crect x=\'0\' y=\'0\' width=\'12\' height=\'8\' rx=\'1\' fill=\'%23666\'/%3E%3Ccircle cx=\'6\' cy=\'4\' r=\'2\' fill=\'%2300d4ff\' opacity=\'0.6\'%3E%3Canimate attributeName=\'opacity\' values=\'0.3;0.9;0.3\' dur=\'2s\' begin=\'0.5s\' repeatCount=\'indefinite\'/%3E%3C/circle%3E%3C!-- Bubble Object 2 --%3E%3Cg transform=\'translate(-20,-6)\' opacity=\'0\'%3E%3Canimate attributeName=\'opacity\' values=\'0;1;1;0\' dur=\'4s\' begin=\'2s\' repeatCount=\'indefinite\'/%3E%3Crect x=\'0\' y=\'0\' width=\'25\' height=\'12\' rx=\'4\' fill=\'white\' stroke=\'%23333\' stroke-width=\'0.5\'/%3E%3Ctext x=\'12.5\' y=\'8\' font-family=\'Arial\' font-size=\'6\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'black\'%3EOK!%3C/text%3E%3C/g%3E%3C/g%3E%3C!-- Rotating AI Symbol --%3E%3Cg transform=\'translate(100,25)\'%3E%3CanimateTransform attributeName=\'transform\' type=\'rotate\' values=\'0 0 0;360 0 0\' dur=\'4s\' repeatCount=\'indefinite\'/%3E%3Cpath d=\'M0-8l4 4-4 4M0 8l-4-4 4-4M-8 0l4-4-4-4M8 0l-4 4 4 4\' stroke=\'%238b5cf6\' stroke-width=\'1.5\' fill=\'none\' opacity=\'0.7\'/%3E%3Ccircle cx=\'0\' cy=\'0\' r=\'2\' fill=\'%238b5cf6\'/%3E%3C/g%3E%3C/svg%3E',
    screenshots: [],
    version: '1.5.0',
    author: { id: 'dev4', name: 'AI Solutions' },
    rating: 4.7,
    reviewCount: 89,
    downloadCount: 450,
    installCount: 320,
    tags: ['ai', 'assistant', 'automation'],
    features: ['Scene-komposisjon', 'Optimalisering', 'Anbefalinger', 'Automatisering'],
    releaseDate: '2024-07-01',
    lastUpdated: '2024-12-18',
    license: 'Commercial',
    isInstalled: true,
    installedVersion: '1.5.0',
    hasUpdate: false,
    toolConfig: {
      panelComponent: 'AIAssistantPanel',
      icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M12 2L2 7l10 5 10-5-10-5z\'/%3E%3Cpath d=\'M2 17l10 5 10-5\'/%3E%3Cpath d=\'M2 12l10 5 10-5\'/%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'1\' fill=\'%23fff\'/%3E%3C/svg%3E',
      order: 0,
    },
    isFavorite: false,
  },
];

export const marketplaceService = {
  /**
   * Get all products with optional filters
   */
  getProducts(filters?: MarketplaceFilters): MarketplaceProduct[] {
    let products = getAllProductsHelper();
    
    if (filters) {
      if (filters.category && filters.category !== 'all') {
        products = products.filter(p => p.category === filters.category);
      }
      
      if (filters.price) {
        if (filters.price === 'free') {
          products = products.filter(p => p.price === 0);
        } else if (filters.price === 'paid') {
          products = products.filter(p => p.price > 0);
        }
      }
      
      if (filters.minRating !== undefined) {
        products = products.filter(p => p.rating >= filters.minRating!);
      }
      
      if (filters.installationStatus && filters.installationStatus !== 'all') {
        if (filters.installationStatus === 'installed') {
          products = products.filter(p => p.isInstalled);
        } else if (filters.installationStatus === 'not-installed') {
          products = products.filter(p => !p.isInstalled);
        } else if (filters.installationStatus === 'has-update') {
          products = products.filter(p => p.hasUpdate);
        }
      }
      
      if (filters.tags && filters.tags.length > 0) {
        products = products.filter(p => 
          filters.tags!.some(tag => p.tags.includes(tag))
        );
      }
      
      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'name':
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'price':
            products.sort((a, b) => a.price - b.price);
            break;
          case 'rating':
            products.sort((a, b) => b.rating - a.rating);
            break;
          case 'popularity':
            products.sort((a, b) => b.downloadCount - a.downloadCount);
            break;
          case 'newest':
            products.sort((a, b) => 
              new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
            );
            break;
        }
      }
    }
    
    return products;
  },

  /**
   * Get all products from storage
   */
  getAllProducts(): MarketplaceProduct[] {
    return getAllProductsHelper();
  },

  /**
   * Initialize mock data
   */
  initializeMockData(): void {
    try {
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error initializing mock data:', error);
    }
  },

  /**
   * Force update installed tools with latest versions from mock data
   */
  forceUpdateInstalledTools(): void {
    try {
      const installed = getInstalledProductsHelper();
      const updated = installed.map(installedTool => {
        const latestProduct = mockProducts.find(p => p.id === installedTool.id);
        if (latestProduct && latestProduct.toolConfig) {
          return {
            ...latestProduct,
            isInstalled: installedTool.isInstalled,
            installedVersion: installedTool.installedVersion || latestProduct.version,
            hasUpdate: installedTool.hasUpdate,
            isFavorite: installedTool.isFavorite
          };
        }
        return installedTool;
      });
        setInstalled(updated);
      window.dispatchEvent(new CustomEvent('installed-tools-changed'));
    } catch (error) {
      console.error('Error forcing update of installed tools:', error);
    }
  },

  /**
   * Get product by ID
   */
  getProduct(id: string): MarketplaceProduct | null {
    const products = getAllProductsHelper();
    return products.find(p => p.id === id) || null;
  },

  /**
   * Search products
   */
  searchProducts(query: string): MarketplaceProduct[] {
    const products = getAllProductsHelper();
    const lowerQuery = query.toLowerCase();
    
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      p.author.name.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Install product
   */
  async installProduct(id: string): Promise<boolean> {
    try {
      // Always get the latest version from mock data first
      const latestProduct = mockProducts.find(p => p.id === id);
      if (!latestProduct) return false;
      
      const products = getAllProductsHelper();
      const installed = getInstalledProductsHelper();
      
      if (!installed.find(p => p.id === id)) {
        // Use the latest version from mock data to ensure we have the newest icon
        const productToInstall = {
          ...latestProduct,
          isInstalled: true,
          installedVersion: latestProduct.version
        };
        installed.push(productToInstall);
        setInstalled(installed);
        
        // Update product status in products list
        const index = products.findIndex(p => p.id === id);
        if (index >= 0) {
          products[index] = { ...latestProduct, ...products[index], isInstalled: true, installedVersion: latestProduct.version, hasUpdate: false };
          setProducts(products);
        } else {
          // If product doesn't exist in products list, add it
          products.push({ ...latestProduct, isInstalled: true, installedVersion: latestProduct.version, hasUpdate: false });
          setProducts(products);
        }
        
        // Dispatch event for installed tools change
        if (latestProduct.toolConfig) {
          window.dispatchEvent(new CustomEvent('installed-tools-changed'));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error installing product:', error);
      return false;
    }
  },

  /**
   * Uninstall product
   */
  async uninstallProduct(id: string): Promise<boolean> {
    try {
      const installed = getInstalledProductsHelper();
      const product = installed.find(p => p.id === id);
      const filtered = installed.filter(p => p.id !== id);
      setInstalled(filtered);
      
      // Update product status
      const products = getAllProductsHelper();
      const index = products.findIndex(p => p.id === id);
      if (index >= 0) {
        products[index].isInstalled = false;
        products[index].installedVersion = undefined;
        setProducts(products);
      }
      
      // Dispatch event for installed tools change
      if (product?.toolConfig) {
        window.dispatchEvent(new CustomEvent('installed-tools-changed'));
      }
      
      return true;
    } catch (error) {
      console.error('Error uninstalling product:', error);
      return false;
    }
  },

  /**
   * Update product
   */
  async updateProduct(id: string): Promise<boolean> {
    try {
      const products = getAllProductsHelper();
      const product = products.find(p => p.id === id);
      if (!product || !product.hasUpdate) return false;
      
      const installed = getInstalledProductsHelper();
      const index = installed.findIndex(p => p.id === id);
      if (index >= 0) {
        installed[index].installedVersion = product.version;
        installed[index].hasUpdate = false;
        setInstalled(installed);
      }
      
      // Update product status
      const productIndex = products.findIndex(p => p.id === id);
      if (productIndex >= 0) {
        products[productIndex].isInstalled = true;
        products[productIndex].installedVersion = product.version;
        products[productIndex].hasUpdate = false;
        setProducts(products);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    }
  },

  /**
   * Update product information
   */
  updateProductInfo(updatedProduct: MarketplaceProduct): boolean {
    try {
      const products = getAllProductsHelper();
      const productIndex = products.findIndex(p => p.id === updatedProduct.id);
      
      if (productIndex >= 0) {
        products[productIndex] = {
          ...products[productIndex],
          ...updatedProduct,
          lastUpdated: new Date().toISOString(),
        };
        setProducts(products);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating product info:', error);
      return false;
    }
  },

  /**
   * Get installed products
   */
  getInstalledProducts(): MarketplaceProduct[] {
    return getInstalledProductsHelper();
  },

  /**
   * Get favorites
   */
  getFavorites(): MarketplaceProduct[] {
    const products = getAllProductsHelper();
    return products.filter(p => cachedFavorites.includes(p.id));
  },

  /**
   * Toggle favorite
   */
  toggleFavorite(id: string): void {
    try {
      const favorites = [...cachedFavorites];
      const index = favorites.indexOf(id);
      
      if (index >= 0) {
        favorites.splice(index, 1);
      } else {
        favorites.push(id);
      }
      
      setFavorites(favorites);
      
      // Update product status
      const products = getAllProductsHelper();
      const productIndex = products.findIndex(p => p.id === id);
      if (productIndex >= 0) {
        products[productIndex].isFavorite = !products[productIndex].isFavorite;
        setProducts(products);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  },

  /**
   * Get reviews for product
   */
  getReviews(productId: string): MarketplaceReview[] {
    return getReviewsHelper(productId);
  },

  /**
   * Add review
   */
  addReview(productId: string, review: Omit<MarketplaceReview, 'id' | 'productId' | 'createdAt'>): MarketplaceReview {
    const newReview: MarketplaceReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId,
      createdAt: new Date().toISOString(),
    };
    
    try {
      cachedReviews.push(newReview);
      setReviews(cachedReviews);
      
      // Update product rating
      const reviews = getReviewsHelper(productId);
      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        const products = getAllProductsHelper();
        const index = products.findIndex(p => p.id === productId);
        if (index >= 0) {
          products[index].rating = Math.round(averageRating * 10) / 10;
          products[index].reviewCount = reviews.length;
          setProducts(products);
        }
      }
    } catch (error) {
      console.error('Error adding review:', error);
    }
    
    return newReview;
  },

  /**
   * Update product rating based on reviews
   */
  updateProductRating(productId: string): void {
    const reviews = getReviewsHelper(productId);
    if (reviews.length === 0) return;
    
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    const products = getAllProductsHelper();
    const index = products.findIndex(p => p.id === productId);
    if (index >= 0) {
      products[index].rating = Math.round(averageRating * 10) / 10;
      products[index].reviewCount = reviews.length;
      setProducts(products);
    }
  },

  /**
   * Get categories
   */
  getCategories(): Array<{ id: string; name: string; count: number }> {
    const products = getAllProductsHelper();
    const categories = [
      { id: 'all', name: 'Alle', count: products.length },
      { id: 'feature', name: 'Funksjoner', count: products.filter(p => p.category === 'feature').length },
      { id: 'asset', name: 'Assets', count: products.filter(p => p.category === 'asset').length },
      { id: 'template', name: 'Templates', count: products.filter(p => p.category === 'template').length },
      { id: 'plugin', name: 'Plugins', count: products.filter(p => p.category === 'plugin').length },
    ];
    return categories;
  },

  /**
   * Get recommendations based on installed products
   */
  getRecommendations(limit: number = 5): MarketplaceProduct[] {
    const installed = getInstalledProductsHelper();
    const allProducts = getAllProductsHelper();
    const notInstalled = allProducts.filter(p => !p.isInstalled);
    
    // Simple recommendation: products in same category or with similar tags
    const installedTags = new Set<string>();
    installed.forEach(p => {
      p.tags.forEach(tag => installedTags.add(tag));
    });
    
    const scored = notInstalled.map(p => {
      let score = 0;
      p.tags.forEach(tag => {
        if (installedTags.has(tag)) score += 1;
      });
      score += p.rating * 0.5; // Boost by rating
      return { product: p, score };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.product);
  },

  /**
   * Get installed tools (plugins and features with toolConfig)
   */
  getInstalledTools(): MarketplaceProduct[] {
    const installed = getInstalledProductsHelper();
    
    // Always use latest version from mock data to ensure we have the newest icons
    const updatedInstalled = installed.map(installedTool => {
      const latestProduct = mockProducts.find(p => p.id === installedTool.id);
      if (latestProduct && latestProduct.toolConfig) {
        // Always use the latest version from mock data, but preserve installation status
        const updated = {
          ...latestProduct,
          isInstalled: installedTool.isInstalled,
          installedVersion: installedTool.installedVersion || latestProduct.version,
          hasUpdate: installedTool.hasUpdate,
          isFavorite: installedTool.isFavorite
        };
        
        // Update cached installed list if icon changed
        if (installedTool.toolConfig?.icon !== latestProduct.toolConfig.icon) {
          const index = installed.findIndex(p => p.id === installedTool.id);
          if (index >= 0) {
            installed[index] = updated;
            setInstalled(installed);
          }
        }
        
        return updated;
      }
      return installedTool;
    });
    
    return updatedInstalled
      .filter(p => p.isInstalled && (p.category === 'plugin' || p.category === 'feature') && p.toolConfig)
      .sort((a, b) => {
        const orderA = a.toolConfig?.order ?? 999;
        const orderB = b.toolConfig?.order ?? 999;
        return orderA - orderB;
      });
  },

  /**
   * Check if a tool is installed
   */
  isToolInstalled(toolId: string): boolean {
    const installed = getInstalledProductsHelper();
    const tool = installed.find(p => p.id === toolId);
    return tool?.isInstalled === true && tool?.toolConfig !== undefined;
  },
};

