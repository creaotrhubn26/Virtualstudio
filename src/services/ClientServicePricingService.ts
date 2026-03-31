export type PricingTier = 'basic' | 'standard' | 'professional' | 'enterprise';
export type ServiceType = 'portrait' | 'event' | 'commercial' | 'wedding' | 'video' | 'school' | 'product' | 'real-estate';

export interface PricingPackage {
  id: string;
  name: string;
  tier: PricingTier;
  serviceType: ServiceType;
  basePrice: number;
  currency: string;
  includes: string[];
  additionalHourRate: number;
  editingIncluded: number;
  deliveryDays: number;
}

export interface PricingCalculation {
  basePrice: number;
  additionalHours: number;
  additionalHourCost: number;
  editing: number;
  editingCost: number;
  totalBeforeTax: number;
  tax: number;
  total: number;
  currency: string;
}

const TAX_RATE = 0.25;

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'portrait-basic',
    name: 'Portrett Basis',
    tier: 'basic',
    serviceType: 'portrait',
    basePrice: 2500,
    currency: 'NOK',
    includes: ['2 timer fotografering', '20 redigerte bilder', 'Digital leveranse'],
    additionalHourRate: 800,
    editingIncluded: 20,
    deliveryDays: 7,
  },
  {
    id: 'portrait-standard',
    name: 'Portrett Standard',
    tier: 'standard',
    serviceType: 'portrait',
    basePrice: 4500,
    currency: 'NOK',
    includes: ['4 timer fotografering', '50 redigerte bilder', 'Digital leveranse', 'Print-pakke'],
    additionalHourRate: 900,
    editingIncluded: 50,
    deliveryDays: 5,
  },
  {
    id: 'event-professional',
    name: 'Event Profesjonell',
    tier: 'professional',
    serviceType: 'event',
    basePrice: 8000,
    currency: 'NOK',
    includes: ['8 timer fotografering', '150 redigerte bilder', 'Digital leveranse', 'Galleri online', 'Trykt album'],
    additionalHourRate: 1200,
    editingIncluded: 150,
    deliveryDays: 10,
  },
  {
    id: 'school-standard',
    name: 'Skolefotografering',
    tier: 'standard',
    serviceType: 'school',
    basePrice: 1200,
    currency: 'NOK',
    includes: ['Individuelt portrett', '5 redigerte bilder per elev', 'Klassebilde'],
    additionalHourRate: 600,
    editingIncluded: 5,
    deliveryDays: 14,
  },
];

class ClientServicePricingService {
  getPackages(serviceType?: ServiceType): PricingPackage[] {
    if (serviceType) return PRICING_PACKAGES.filter((p) => p.serviceType === serviceType);
    return PRICING_PACKAGES;
  }

  getPackageById(id: string): PricingPackage | undefined {
    return PRICING_PACKAGES.find((p) => p.id === id);
  }

  calculate(
    packageId: string,
    additionalHours = 0,
    additionalEdits = 0,
  ): PricingCalculation | null {
    const pkg = this.getPackageById(packageId);
    if (!pkg) return null;

    const additionalHourCost = additionalHours * pkg.additionalHourRate;
    const editingCost = Math.max(0, additionalEdits - pkg.editingIncluded) * 50;
    const totalBeforeTax = pkg.basePrice + additionalHourCost + editingCost;
    const tax = totalBeforeTax * TAX_RATE;

    return {
      basePrice: pkg.basePrice,
      additionalHours,
      additionalHourCost,
      editing: additionalEdits,
      editingCost,
      totalBeforeTax,
      tax,
      total: totalBeforeTax + tax,
      currency: pkg.currency,
    };
  }

  formatPrice(amount: number, currency = 'NOK'): string {
    return new Intl.NumberFormat('nb-NO', { style: 'currency', currency }).format(amount);
  }
}

export const clientServicePricingService = new ClientServicePricingService();
export default clientServicePricingService;
