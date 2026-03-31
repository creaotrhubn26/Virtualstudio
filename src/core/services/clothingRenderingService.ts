export interface ClothingItem {
  id: string;
  name: string;
  label: string;
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'underwear' | 'full-body';
  primaryColor: string;
  secondaryColor?: string;
  material: 'cotton' | 'silk' | 'wool' | 'denim' | 'leather' | 'synthetic' | 'linen' | 'velvet';
  roughness: number;
  metallic: number;
  opacity: number;
  patternType?: 'solid' | 'stripe' | 'check' | 'floral' | 'abstract' | 'geometric';
  modelPath?: string;
  thumbnail?: string;
}

export interface ClothingOutfit {
  id: string;
  name: string;
  label: string;
  description?: string;
  items: ClothingItem[];
  occasion: 'casual' | 'formal' | 'business' | 'sport' | 'evening' | 'wedding' | 'street' | 'school';
}

export const DEFAULT_CLOTHING_ITEMS: ClothingItem[] = [
  { id: 'white-shirt', name: 'white-shirt', label: 'Hvit Skjorte', category: 'top', primaryColor: '#FFFFFF', material: 'cotton', roughness: 0.9, metallic: 0, opacity: 1 },
  { id: 'black-trousers', name: 'black-trousers', label: 'Svarte Bukser', category: 'bottom', primaryColor: '#1A1A1A', material: 'wool', roughness: 0.8, metallic: 0, opacity: 1 },
  { id: 'dark-suit', name: 'dark-suit', label: 'Mørk Dress', category: 'full-body', primaryColor: '#1F2937', material: 'wool', roughness: 0.75, metallic: 0, opacity: 1 },
  { id: 'casual-jeans', name: 'casual-jeans', label: 'Casual Jeans', category: 'bottom', primaryColor: '#3B5998', material: 'denim', roughness: 0.95, metallic: 0, opacity: 1 },
  { id: 'school-uniform', name: 'school-uniform', label: 'Skolekittel', category: 'full-body', primaryColor: '#1565C0', material: 'cotton', roughness: 0.85, metallic: 0, opacity: 1 },
];

class ClothingRenderingService {
  private activeItems: ClothingItem[] = [];

  getItems(): ClothingItem[] {
    return DEFAULT_CLOTHING_ITEMS;
  }

  getItemById(id: string): ClothingItem | undefined {
    return DEFAULT_CLOTHING_ITEMS.find((i) => i.id === id);
  }

  wearItem(item: ClothingItem): void {
    this.activeItems = this.activeItems.filter((i) => i.category !== item.category);
    this.activeItems.push(item);
  }

  removeItem(category: ClothingItem['category']): void {
    this.activeItems = this.activeItems.filter((i) => i.category !== category);
  }

  getActiveItems(): ClothingItem[] {
    return [...this.activeItems];
  }

  createOutfit(name: string, items: ClothingItem[]): ClothingOutfit {
    return {
      id: `outfit-${Date.now()}`,
      name,
      label: name,
      items,
      occasion: 'casual',
    };
  }

  applyOutfit(outfit: ClothingOutfit): void {
    this.activeItems = [...outfit.items];
    console.log(`[ClothingRenderingService] Applied outfit: ${outfit.name}`);
  }
}

export const clothingRenderingService = new ClothingRenderingService();
export default clothingRenderingService;
