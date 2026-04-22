import { mountIsland } from './mount';

export function mountEquipmentPanel(): Promise<unknown> {
  return mountIsland('equipmentPanelRoot', () =>
    import('../App').then((m) => m.EquipmentPanelApp),
  );
}
