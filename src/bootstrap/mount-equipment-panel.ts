import { mountIsland } from './mount';

export function mountEquipmentPanel(): Promise<unknown> {
  return mountIsland('equipmentPanelRoot', () =>
    import('../apps/EquipmentPanelApp').then((m) => m.default),
  );
}
