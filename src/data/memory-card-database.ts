export interface MemoryCard {
  id: string;
  brand: string;
  model: string;
  type: string;
  capacity: number;
  speedWrite: number;
  speedRead: number;
  priceNOK: number;
}

export const MEMORY_CARD_DATABASE: MemoryCard[] = [
  { id: 'sony-tough-160', brand: 'Sony', model: 'TOUGH CFexpress Type A', type: 'cfexpress-a', capacity: 160, speedWrite: 700, speedRead: 800, priceNOK: 3999 },
  { id: 'sony-tough-80', brand: 'Sony', model: 'TOUGH CFexpress Type A', type: 'cfexpress-a', capacity: 80, speedWrite: 700, speedRead: 800, priceNOK: 2499 },
  { id: 'sandisk-extreme-pro-512', brand: 'SanDisk', model: 'Extreme Pro CFexpress Type B', type: 'cfexpress-b', capacity: 512, speedWrite: 1400, speedRead: 1700, priceNOK: 4999 },
  { id: 'sandisk-v90-128', brand: 'SanDisk', model: 'Extreme Pro V90', type: 'sd-v90', capacity: 128, speedWrite: 260, speedRead: 300, priceNOK: 1299 },
];

export class MemoryCardRecommendationEngine {
  static recommend(cameraId: string, resolution: string, bitrate: number): MemoryCard[] {
    return MEMORY_CARD_DATABASE.filter(card => card.speedWrite >= bitrate / 8);
  }
}

export function getMemoryCardTypesByProfession(profession: string): string[] {
  const types: Record<string, string[]> = {
    photographer: ['cfexpress-a', 'cfexpress-b', 'sd-v90'],
    videographer: ['cfexpress-a', 'cfexpress-b', 'sd-v90', 'sd-v60'],
    director: ['cfexpress-b', 'cfast'],
  };
  return types[profession] || ['sd-v30'];
}

export function formatCurrency(amount: number, currency = 'NOK'): string {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency }).format(amount);
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const rates: Record<string, number> = { NOK: 1, USD: 0.094, EUR: 0.086 };
  return amount * (rates[to] || 1) / (rates[from] || 1);
}
