import { Layer } from '../models/sceneComposer';

export type BlendingMode = 'normal' | 'overlay' | 'multiply' | 'screen' | 'add' | 'subtract';

export class LayerManager {
  private layers: Map<string, Layer> = new Map();
  private defaultLayerId: string = 'default';

  constructor() {
    // Create default layer
    const defaultLayer: Layer = {
      id: this.defaultLayerId,
      name: 'Default',
      color: '#00d4ff',
      visible: true,
      locked: false,
      nodeIds: []
    };
    this.layers.set(this.defaultLayerId, defaultLayer);
  }

  /**
   * Get all layers
   */
  public getLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Get a layer by ID
   */
  public getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  /**
   * Add a new layer
   */
  public addLayer(name: string, color: string = '#00d4ff'): Layer {
    const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const layer: Layer = {
      id,
      name,
      color,
      visible: true,
      locked: false,
      nodeIds: []
    };
    this.layers.set(id, layer);
    return layer;
  }

  /**
   * Remove a layer
   */
  public removeLayer(id: string): boolean {
    if (id === this.defaultLayerId) {
      return false; // Cannot remove default layer
    }
    return this.layers.delete(id);
  }

  /**
   * Update a layer
   */
  public updateLayer(id: string, updates: Partial<Layer>): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    
    this.layers.set(id, { ...layer, ...updates });
    return true;
  }

  /**
   * Add a node to a layer
   */
  public addNodeToLayer(layerId: string, nodeId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;
    
    if (!layer.nodeIds.includes(nodeId)) {
      layer.nodeIds.push(nodeId);
    }
    
    // Remove from other layers
    this.layers.forEach((l, id) => {
      if (id !== layerId) {
        l.nodeIds = l.nodeIds.filter(nid => nid !== nodeId);
      }
    });
    
    return true;
  }

  /**
   * Remove a node from a layer
   */
  public removeNodeFromLayer(layerId: string, nodeId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;
    
    layer.nodeIds = layer.nodeIds.filter(nid => nid !== nodeId);
    return true;
  }

  /**
   * Get the layer for a node
   */
  public getLayerForNode(nodeId: string): Layer | undefined {
    for (const layer of this.layers.values()) {
      if (layer.nodeIds.includes(nodeId)) {
        return layer;
      }
    }
    // Return default layer if node is not in any layer
    return this.layers.get(this.defaultLayerId);
  }

  /**
   * Set layer visibility
   */
  public setLayerVisible(layerId: string, visible: boolean): boolean {
    return this.updateLayer(layerId, { visible });
  }

  /**
   * Set layer locked state
   */
  public setLayerLocked(layerId: string, locked: boolean): boolean {
    return this.updateLayer(layerId, { locked });
  }

  /**
   * Reorder layers (move layer to new index)
   */
  public reorderLayer(layerId: string, newIndex: number): boolean {
    const layers = this.getLayers();
    const currentIndex = layers.findIndex(l => l.id === layerId);
    
    if (currentIndex === -1 || newIndex < 0 || newIndex >= layers.length) {
      return false;
    }
    
    // Remove from current position
    const [layer] = layers.splice(currentIndex, 1);
    // Insert at new position
    layers.splice(newIndex, 0, layer);
    
    // Rebuild map in new order (order matters for rendering)
    this.layers.clear();
    layers.forEach(l => this.layers.set(l.id, l));
    
    return true;
  }

  /**
   * Get visible nodes (all nodes in visible layers)
   */
  public getVisibleNodeIds(): string[] {
    const visibleNodes: string[] = [];
    this.layers.forEach(layer => {
      if (layer.visible) {
        visibleNodes.push(...layer.nodeIds);
      }
    });
    return visibleNodes;
  }

  /**
   * Get locked nodes (all nodes in locked layers)
   */
  public getLockedNodeIds(): string[] {
    const lockedNodes: string[] = [];
    this.layers.forEach(layer => {
      if (layer.locked) {
        lockedNodes.push(...layer.nodeIds);
      }
    });
    return lockedNodes;
  }

  /**
   * Load layers from scene composition
   */
  public loadLayers(layers: Layer[]): void {
    this.layers.clear();
    layers.forEach(layer => {
      this.layers.set(layer.id, { ...layer });
    });
    
    // Ensure default layer exists
    if (!this.layers.has(this.defaultLayerId)) {
      const defaultLayer: Layer = {
        id: this.defaultLayerId,
        name: 'Default',
        color: '#00d4ff',
        visible: true,
        locked: false,
        nodeIds: []
      };
      this.layers.set(this.defaultLayerId, defaultLayer);
    }
  }

  /**
   * Export layers as array
   */
  public exportLayers(): Layer[] {
    return this.getLayers();
  }
}

