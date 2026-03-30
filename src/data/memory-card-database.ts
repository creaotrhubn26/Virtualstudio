export interface MemoryCard {
  id: string;
  brand: string;
  model: string;
  type: string;
  capacity: number;
  speedWrite: number;
  speedRead: number;
  priceNOK: number;
  descriptionNo?: string;
}

export const MEMORY_CARD_DATABASE: MemoryCard[] = [
  // CFexpress Type A (Sony)
  { id: 'sony-tough-160', brand: 'Sony', model: 'TOUGH CFexpress Type A 160GB', type: 'cfexpress-a', capacity: 160, speedWrite: 700, speedRead: 800, priceNOK: 3999, descriptionNo: 'Toppmodell CFexpress Type A – robust og ultraraskt' },
  { id: 'sony-tough-80', brand: 'Sony', model: 'TOUGH CFexpress Type A 80GB', type: 'cfexpress-a', capacity: 80, speedWrite: 700, speedRead: 800, priceNOK: 2499, descriptionNo: 'Kompakt og rask CFexpress Type A' },
  { id: 'sony-tough-256', brand: 'Sony', model: 'TOUGH CFexpress Type A 256GB', type: 'cfexpress-a', capacity: 256, speedWrite: 700, speedRead: 800, priceNOK: 5499, descriptionNo: '256GB Sony TOUGH for høyoppløsningsvideoopptak' },

  // CFexpress Type B
  { id: 'sandisk-extreme-pro-512', brand: 'SanDisk', model: 'Extreme Pro CFexpress Type B 512GB', type: 'cfexpress-b', capacity: 512, speedWrite: 1400, speedRead: 1700, priceNOK: 4999, descriptionNo: 'Rask CFexpress B for 8K RAW og profesjonell video' },
  { id: 'sandisk-extreme-pro-256', brand: 'SanDisk', model: 'Extreme Pro CFexpress Type B 256GB', type: 'cfexpress-b', capacity: 256, speedWrite: 1400, speedRead: 1700, priceNOK: 3299, descriptionNo: 'Rask CFexpress B for 8K RAW' },
  { id: 'prograde-cfe-b-650', brand: 'ProGrade', model: 'CFexpress Type B GOLD 650GB', type: 'cfexpress-b', capacity: 650, speedWrite: 1500, speedRead: 1800, priceNOK: 6499, descriptionNo: 'ProGrade Gold – høyest ytelse for cinematografi' },
  { id: 'lexar-diamond-512', brand: 'Lexar', model: 'Diamond CFexpress Type B 512GB', type: 'cfexpress-b', capacity: 512, speedWrite: 1700, speedRead: 1900, priceNOK: 5299, descriptionNo: 'Lexar Diamond – topp hastighet for RAW 8K' },

  // SD V90
  { id: 'sandisk-v90-128', brand: 'SanDisk', model: 'Extreme Pro V90 128GB', type: 'sd-v90', capacity: 128, speedWrite: 260, speedRead: 300, priceNOK: 1299, descriptionNo: 'V90 SD-kort for 4K 120p og RAW-stills' },
  { id: 'sandisk-v90-256', brand: 'SanDisk', model: 'Extreme Pro V90 256GB', type: 'sd-v90', capacity: 256, speedWrite: 260, speedRead: 300, priceNOK: 2199, descriptionNo: '256GB V90 for lange opptaksøkter' },
  { id: 'sony-tough-sd-v90-128', brand: 'Sony', model: 'TOUGH SD V90 128GB', type: 'sd-v90', capacity: 128, speedWrite: 299, speedRead: 300, priceNOK: 1599, descriptionNo: 'Tøffe Sony V90 – vanntett og bøyesterk' },
  { id: 'lexar-2000x-128', brand: 'Lexar', model: '2000x GOLD 128GB V90', type: 'sd-v90', capacity: 128, speedWrite: 260, speedRead: 300, priceNOK: 1399, descriptionNo: 'Lexar 2000x – pålitelig V90 for foto og video' },

  // SD V60
  { id: 'sandisk-extreme-v60-256', brand: 'SanDisk', model: 'Extreme Pro V60 256GB', type: 'sd-v60', capacity: 256, speedWrite: 90, speedRead: 200, priceNOK: 899, descriptionNo: 'V60 for 4K video og seriefotografering' },
  { id: 'lexar-silver-v60-256', brand: 'Lexar', model: 'SILVER 256GB V60', type: 'sd-v60', capacity: 256, speedWrite: 90, speedRead: 205, priceNOK: 799, descriptionNo: 'Budsjettvennlig V60 for 4K videofoto' },

  // SD V30 (budget)
  { id: 'sandisk-extreme-v30-128', brand: 'SanDisk', model: 'Extreme V30 128GB', type: 'sd-v30', capacity: 128, speedWrite: 60, speedRead: 160, priceNOK: 449, descriptionNo: 'Budsjettalternativ for 1080p og JPEG-fotografering' },
  { id: 'samsung-evo-select-256', brand: 'Samsung', model: 'EVO Select 256GB', type: 'sd-v30', capacity: 256, speedWrite: 60, speedRead: 130, priceNOK: 499, descriptionNo: 'Samsung EVO – rimelig og pålitelig SD-kort' },

  // CFast 2.0 (Cinema cameras)
  { id: 'sandisk-cfast-256', brand: 'SanDisk', model: 'Extreme Pro CFast 2.0 256GB', type: 'cfast', capacity: 256, speedWrite: 440, speedRead: 525, priceNOK: 4799, descriptionNo: 'CFast 2.0 for Cinema EOS C-serien og Blackmagic' },
  { id: 'lexar-cfast-128', brand: 'Lexar', model: 'CFast 2.0 128GB', type: 'cfast', capacity: 128, speedWrite: 440, speedRead: 510, priceNOK: 2999, descriptionNo: 'CFast 2.0 for professionelle kinokameraer' },

  // CompactFlash (legacy)
  { id: 'sandisk-cf-128', brand: 'SanDisk', model: 'Extreme Pro CF 128GB', type: 'compactflash', capacity: 128, speedWrite: 155, speedRead: 160, priceNOK: 999, descriptionNo: 'Kompaktflash for eldre DSLR-modeller' },
];

export class MemoryCardRecommendationEngine {
  static recommend(cameraId: string, resolution: string, bitrate: number): MemoryCard[] {
    return MEMORY_CARD_DATABASE.filter(card => card.speedWrite >= bitrate / 8);
  }

  static recommendForCamera(mediaType: string): MemoryCard[] {
    const typeMap: Record<string, string[]> = {
      'CFexpress Type A': ['cfexpress-a'],
      'CFexpress Type B': ['cfexpress-b'],
      'SD': ['sd-v90', 'sd-v60', 'sd-v30'],
      'CFast': ['cfast'],
      'CompactFlash': ['compactflash'],
    };
    const types = typeMap[mediaType] || ['sd-v30'];
    return MEMORY_CARD_DATABASE.filter(card => types.includes(card.type));
  }
}

export function getMemoryCardTypesByProfession(profession: string): string[] {
  const types: Record<string, string[]> = {
    photographer: ['cfexpress-a', 'cfexpress-b', 'sd-v90', 'sd-v60'],
    videographer: ['cfexpress-a', 'cfexpress-b', 'sd-v90', 'sd-v60', 'cfast'],
    director: ['cfexpress-b', 'cfast'],
    student: ['sd-v30', 'sd-v60'],
  };
  return types[profession] || ['sd-v30'];
}

export function formatCurrency(amount: number, currency = 'NOK'): string {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency }).format(amount);
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const rates: Record<string, number> = { NOK: 1, USD: 0.094, EUR: 0.086, GBP: 0.074 };
  return amount * (rates[to] || 1) / (rates[from] || 1);
}

export function getMemoryCardById(id: string): MemoryCard | undefined {
  return MEMORY_CARD_DATABASE.find(c => c.id === id);
}

export function getMemoryCardsByType(type: string): MemoryCard[] {
  return MEMORY_CARD_DATABASE.filter(c => c.type === type);
}

export function getMemoryCardsByCapacity(minCapacity: number): MemoryCard[] {
  return MEMORY_CARD_DATABASE.filter(c => c.capacity >= minCapacity);
}
