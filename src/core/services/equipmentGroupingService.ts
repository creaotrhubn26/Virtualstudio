export interface EquipmentNode {
  id: string;
  name: string;
  type: string;
  groupId?: string;
  parentId?: string;
  children?: string[];
  linkedIds: string[];
  metadata?: Record<string, unknown>;
}

export interface LinkSuggestion {
  sourceId: string;
  targetId: string;
  type: 'lighting' | 'camera' | 'modifier' | 'prop' | 'mixed';
  confidence: number;
  reason?: string;
}

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
  locked?: boolean;
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

  createGroup(name: string, categoryOrIds: EquipmentGroup['category'] | string[]): EquipmentGroup {
    const isIds = Array.isArray(categoryOrIds);
    const category: EquipmentGroup['category'] = isIds ? 'mixed' : categoryOrIds;
    const group: EquipmentGroup = {
      id: `group-${Date.now()}`,
      name,
      label: name,
      equipmentIds: isIds ? categoryOrIds : [],
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

  getAllGroups(): EquipmentGroup[] {
    return [...this.groups];
  }

  getAllNodes(): EquipmentNode[] {
    return this.groups.flatMap((g) =>
      g.equipmentIds.map((id) => ({
        id,
        name: id,
        type: g.category,
        groupId: g.id,
        linkedIds: [],
      })),
    );
  }

  getGroup(id: string): EquipmentGroup | undefined {
    return this.groups.find((g) => g.id === id);
  }

  getGroupNodes(groupId: string): EquipmentNode[] {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return [];
    return group.equipmentIds.map((id) => ({ id, name: id, type: group.category, groupId, linkedIds: [] }));
  }

  dissolveGroup(groupId: string): void {
    this.deleteGroup(groupId);
  }

  linkNodes(sourceId: string, targetId: string): void {
    console.warn(`[EquipmentGroupingService] linkNodes: ${sourceId} -> ${targetId}`);
  }

  unlinkNodes(nodeId: string, targetId: string): void {
    console.warn(`[EquipmentGroupingService] unlinkNodes: ${nodeId} -x- ${targetId}`);
  }

  unregisterNode(nodeId: string): void {
    this.groups.forEach((g) => {
      g.equipmentIds = g.equipmentIds.filter((id) => id !== nodeId);
    });
  }

  getSuggestedLinks(_nodeId: string): LinkSuggestion[] {
    return [];
  }

  autoGroupByType(): void {
    console.warn('[EquipmentGroupingService] autoGroupByType called');
  }

  autoGroupByProximity(_threshold: number): void {
    console.warn('[EquipmentGroupingService] autoGroupByProximity called');
  }

  duplicateNodes(ids: string[]): EquipmentNode[] {
    return ids.map((id) => ({ id: `${id}-copy`, name: `${id} (kopi)`, type: 'mixed', linkedIds: [] }));
  }

  getStatistics(): { totalNodes: number; totalGroups: number; linkedPairs: number } {
    return { totalNodes: this.getAllNodes().length, totalGroups: this.groups.length, linkedPairs: 0 };
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
