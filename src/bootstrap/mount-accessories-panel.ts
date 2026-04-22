import { mountIsland } from './mount';

export function mountAccessoriesPanel(): Promise<unknown> {
  return mountIsland('accessoriesPanelRoot', () =>
    import('../App').then((m) => m.AccessoriesPanelApp),
  );
}
