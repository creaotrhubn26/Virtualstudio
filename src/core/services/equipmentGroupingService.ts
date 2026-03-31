export interface EquipmentGroup {
  id: string;
  name: string;
  label: string;
  description?: string;
  equipmentIds: string[];
  category: 'lighting' | 'camera' | 'modifier' | 'prop' | 'mixed';
  isDefault?: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupingRule {
  type: 'by-brand' | 'by-category' | 'by-use-case' | 'custom';
  param?: string;
}

class EquipmentGroupingService {
  private groups: EquipmentGroup[] = [
    {
      id: 'studio-essentials',
      name: 'studio-essentials',
      label: 'Studio Grunnpakke',
      description: 'Grunnleggende studioutstyr',
      equipmentIds: [],
      category: 'lighting',
      isDefault: true,
      color: '#1565C0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  getAll(): EquipmentGroup[] {
    return [...this.groups];
  }

  getById(id: string): EquipmentGroup | undefined {
    return this.groups.find((g) => g.id === id);
  }

  createGroup(name: string, category: EquipmentGroup['category']): EquipmentGroup {
    const group: EquipmentGroup = {
      id: `group-${Date.now()}`,
      name,
      label: name,
      equipmentIds: [],
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.groups.push(group);
    return group;
  }

  addToGroup(groupId: string, equipmentId: string): void {
    const group = this.groups.find((g) => g.id === groupId);
    if (group && !group.equipmentIds.includes(equipmentId)) {
      group.equipmentIds.push(equipmentId);
      group.updatedAt = new Date().toISOString();
    }
  }

  removeFromGroup(groupId: string, equipmentId: string): void {
    const group = this.groups.find((g) => g.id === groupId);
    if (group) {
      group.equipmentIds = group.equipmentIds.filter((id) => id !== equipmentId);
      group.updatedAt = new Date().toISOString();
    }
  }

  deleteGroup(groupId: string): void {
    this.groups = this.groups.filter((g) => g.id !== groupId);
  }

  autoGroup(equipmentList: Array<{ id: string; brand?: string; type?: string }>, rule: GroupingRule): EquipmentGroup[] {
    if (rule.type === 'by-brand') {
      const byBrand = new Map<string, string[]>();
      equipmentList.forEach((e) => {
        const brand = e.brand ?? 'Unknown';
        if (!byBrand.has(brand)) byBrand.set(brand, []);
        byBrand.get(brand)!.push(e.id);
      });
      return Array.from(byBrand.entries()).map(([brand, ids]) => ({
        id: `brand-${brand}`,
        name: brand,
        label: brand,
        equipmentIds: ids,
        category: 'mixed' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    return [];
  }
}

export const equipmentGroupingService = new EquipmentGroupingService();
export default equipmentGroupingService;
