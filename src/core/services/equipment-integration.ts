export interface SceneCostBreakdown {
  total: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    type: 'light' | 'modifier' | 'camera' | 'accessory' | 'prop';
    dailyRate: number;
    quantity: number;
    subtotal: number;
  }>;
  rentalDays: number;
  laborCost: number;
  taxRate: number;
  tax: number;
}

export interface EquipmentCompatibility {
  isCompatible: boolean;
  reason?: string;
  alternatives?: string[];
}

export function calculateSceneCost(
  equipment: Array<{ id: string; name: string; type: string; dailyRate?: number; quantity?: number }>,
  rentalDays = 1,
  laborRate = 0,
  taxRate = 0.25,
): SceneCostBreakdown {
  const items = equipment.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type as 'light' | 'modifier' | 'camera' | 'accessory' | 'prop',
    dailyRate: item.dailyRate ?? 0,
    quantity: item.quantity ?? 1,
    subtotal: (item.dailyRate ?? 0) * (item.quantity ?? 1) * rentalDays,
  }));

  const equipmentTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const laborCost = laborRate * rentalDays;
  const preTax = equipmentTotal + laborCost;
  const tax = preTax * taxRate;

  return {
    total: preTax + tax,
    currency: 'NOK',
    items,
    rentalDays,
    laborCost,
    taxRate,
    tax,
  };
}

export function checkCompatibility(
  lightId: string,
  modifierId: string,
): EquipmentCompatibility {
  void lightId;
  void modifierId;
  return { isCompatible: true };
}

export function getCompatibleModifiers(lightId: string): string[] {
  void lightId;
  return [];
}

export interface EquipmentSpec {
  id: string;
  name: string;
  brand: string;
  model: string;
  type: 'light' | 'modifier' | 'camera' | 'lens' | 'accessory';
  category?: string;
  specifications?: Record<string, unknown>;
  price?: number;
}

export function searchEquipment(query: string, category?: string): EquipmentSpec[] {
  const allEquipment = [...getLightingEquipment(), ...getCameraEquipment(), ...getLensEquipment()];
  const lq = query.toLowerCase();
  return allEquipment.filter((eq) => {
    const matches = eq.name.toLowerCase().includes(lq) || eq.brand.toLowerCase().includes(lq) || eq.model.toLowerCase().includes(lq);
    return matches && (!category || eq.type === category);
  });
}

export function getLightingEquipment(opts?: { brand?: string; type?: string }): EquipmentSpec[] {
  return [
    { id: 'profoto-b10plus', name: 'Profoto B10 Plus', brand: 'Profoto', model: 'B10 Plus', type: 'light', price: 29990 },
    { id: 'godox-ad600pro', name: 'Godox AD600Pro', brand: 'Godox', model: 'AD600Pro', type: 'light', price: 7990 },
    { id: 'aputure-600x-pro', name: 'Aputure 600X Pro', brand: 'Aputure', model: '600X Pro', type: 'light', price: 24990 },
    { id: 'nanlite-forza720b', name: 'Nanlite Forza 720B', brand: 'Nanlite', model: 'Forza 720B', type: 'light', price: 22990 },
  ];
}

export function getCameraEquipment(opts?: { brand?: string }): EquipmentSpec[] {
  return [
    { id: 'canon-r5', name: 'Canon EOS R5', brand: 'Canon', model: 'EOS R5', type: 'camera', price: 39990 },
    { id: 'sony-a7iv', name: 'Sony Alpha A7 IV', brand: 'Sony', model: 'Alpha A7 IV', type: 'camera', price: 29990 },
    { id: 'nikon-z7ii', name: 'Nikon Z 7II', brand: 'Nikon', model: 'Z 7II', type: 'camera', price: 34990 },
  ];
}

export function getLensEquipment(opts?: { brand?: string }): EquipmentSpec[] {
  return [
    { id: 'sigma-85-1.4-art', name: 'Sigma 85mm f/1.4 Art', brand: 'Sigma', model: '85mm f/1.4 Art', type: 'lens', price: 9990 },
    { id: 'canon-rf-50-1.2', name: 'Canon RF 50mm f/1.2L', brand: 'Canon', model: 'RF 50mm f/1.2L', type: 'lens', price: 24990 },
  ];
}

export function getPopularSetups(): Array<{ name: string; lights: EquipmentSpec[]; camera?: EquipmentSpec; description: string }> {
  return [
    { name: 'Portrett', lights: getLightingEquipment().slice(0, 2), description: 'Klassisk portrettoppsett med nøkkel- og fyllyslys' },
    { name: 'Mote', lights: getLightingEquipment().slice(0, 3), description: 'Full motefotografering med bakgrunnsbelysning' },
  ];
}

export function equipmentToLightNode(eq: EquipmentSpec) {
  return {
    id: eq.id,
    type: 'spot' as const,
    name: eq.name,
    position: [0, 3, 3] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    light: { intensity: 500, color: '#FFFFFF', modifier: null },
    userData: eq,
  };
}

export function equipmentToCameraNode(eq: EquipmentSpec) {
  return {
    id: eq.id,
    type: 'mesh' as const,
    name: eq.name,
    position: [0, 1.5, 5] as [number, number, number],
    rotation: [0, 180, 0] as [number, number, number],
    userData: eq,
  };
}
