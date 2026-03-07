import { useEffect, useMemo, useState } from 'react';
import { ALL_LIGHTS, ALL_MODIFIERS, type LightEquipment, type ModifierEquipment } from '../core/data/EquipmentDatabase';
import settingsService, { getCurrentUserId } from '../services/settingsService';

export interface UserEquipmentInventory {
  lights: LightEquipment[];
  modifiers: ModifierEquipment[];
}

const STORAGE_KEY = 'virtualStudio_equipment_inventory';

const buildDefaultInventory = (): UserEquipmentInventory => ({
  lights: ALL_LIGHTS,
  modifiers: ALL_MODIFIERS,
});

const mergeUniqueById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
  const map = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

export const useUserEquipmentInventory = () => {
  const [inventory, setInventory] = useState<UserEquipmentInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInventory = async () => {
      const resolvedUserId = getCurrentUserId();
      const remote = await settingsService.getSetting<UserEquipmentInventory>(STORAGE_KEY, { userId: resolvedUserId });
      const initial = remote ?? buildDefaultInventory();
      setInventory(initial);
      setIsLoading(false);
    };
    void loadInventory();
  }, []);

  useEffect(() => {
    if (!inventory) return;
    void settingsService.setSetting(STORAGE_KEY, inventory, { userId: getCurrentUserId() });
  }, [inventory]);

  useEffect(() => {
    const handleAddEquipment = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id || !inventory) return;

      const matchingLight = ALL_LIGHTS.find((light) => light.id === detail.id);
      const matchingModifier = ALL_MODIFIERS.find((modifier) => modifier.id === detail.id);

      if (!matchingLight && !matchingModifier) return;

      setInventory((prev) => {
        if (!prev) return prev;
        const updated: UserEquipmentInventory = {
          lights: matchingLight ? mergeUniqueById(prev.lights, [matchingLight]) : prev.lights,
          modifiers: matchingModifier ? mergeUniqueById(prev.modifiers, [matchingModifier]) : prev.modifiers,
        };
        return updated;
      });
    };

    window.addEventListener('ch-add-equipment', handleAddEquipment as EventListener);
    return () => {
      window.removeEventListener('ch-add-equipment', handleAddEquipment as EventListener);
    };
  }, [inventory]);

  const userInventory = useMemo(() => inventory, [inventory]);

  return {
    userInventory,
    isLoading,
  };
};
