import { useAppStore, type SceneNode } from '../../state/store';

export interface PresetEquipmentItem {
  name: string;
  modelFunction?: string;
  category?: string;
  options?: Record<string, unknown>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface ScenePresetLike {
  id: string;
  name: string;
  equipment: PresetEquipmentItem[];
}

interface LoadedPresetRecord {
  presetId: string;
  presetName: string;
  nodeIds: string[];
  loadedAt: string;
}

const loadedPresets = new Map<string, LoadedPresetRecord>();

const inferNodeType = (item: PresetEquipmentItem): SceneNode['type'] => {
  const source = `${item.category || ''} ${item.modelFunction || ''} ${item.name}`.toLowerCase();

  if (source.includes('camera')) {
    return 'camera';
  }

  if (
    source.includes('light') ||
    source.includes('softbox') ||
    source.includes('umbrella') ||
    source.includes('beauty') ||
    source.includes('snoot') ||
    source.includes('reflector')
  ) {
    return 'light';
  }

  if (source.includes('modifier')) {
    return 'modifier';
  }

  if (source.includes('backdrop') || source.includes('background')) {
    return 'background';
  }

  return 'prop';
};

const inferPower = (item: PresetEquipmentItem): number => {
  const optionPower = Number(item.options?.power);
  if (Number.isFinite(optionPower) && optionPower > 0) {
    return optionPower;
  }

  const source = `${item.modelFunction || ''} ${item.name}`.toLowerCase();
  if (source.includes('key')) {
    return 120;
  }
  if (source.includes('fill')) {
    return 70;
  }
  if (source.includes('rim') || source.includes('hair')) {
    return 90;
  }

  return 100;
};

class EquipmentIntegrationService {
  loadPreset(preset: ScenePresetLike): SceneNode[] {
    const store = useAppStore.getState();
    const addedNodes: SceneNode[] = [];
    const timestamp = Date.now();

    preset.equipment.forEach((item, index) => {
      const type = inferNodeType(item);
      const nodeId = `preset-${preset.id}-${timestamp}-${index}`;

      const node: SceneNode = {
        id: nodeId,
        type,
        name: item.name,
        transform: {
          position: item.position ?? [0, 0, 0],
          rotation: item.rotation ?? [0, 0, 0],
          scale: item.scale ?? [1, 1, 1],
        },
        visible: true,
        userData: {
          presetId: preset.id,
          presetName: preset.name,
          modelFunction: item.modelFunction,
          source: 'equipmentIntegrationService',
          options: item.options ?? {},
        },
        light:
          type === 'light'
            ? {
                power: inferPower(item),
                modifier:
                  typeof item.options?.modifier === 'string'
                    ? item.options.modifier
                    : undefined,
                temperature:
                  Number.isFinite(Number(item.options?.temperature))
                    ? Number(item.options?.temperature)
                    : undefined,
              }
            : undefined,
      };

      store.addNode(node);
      addedNodes.push(node);
    });

    loadedPresets.set(preset.id, {
      presetId: preset.id,
      presetName: preset.name,
      nodeIds: addedNodes.map((node) => node.id),
      loadedAt: new Date().toISOString(),
    });

    window.dispatchEvent(
      new CustomEvent('ch-preset-loaded', {
        detail: {
          presetId: preset.id,
          presetName: preset.name,
          nodeCount: addedNodes.length,
        },
      }),
    );

    return addedNodes;
  }

  clearLoadedPreset(presetId: string): number {
    const record = loadedPresets.get(presetId);
    if (!record) {
      return 0;
    }

    const store = useAppStore.getState();
    let removedCount = 0;

    record.nodeIds.forEach((nodeId) => {
      const node = store.getNode(nodeId);
      if (node) {
        store.removeNode(nodeId);
        removedCount += 1;
      }
    });

    loadedPresets.delete(presetId);
    return removedCount;
  }

  getLoadedPresets(): LoadedPresetRecord[] {
    return Array.from(loadedPresets.values());
  }
}

export const equipmentIntegrationService = new EquipmentIntegrationService();
