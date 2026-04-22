import { mountIsland } from './mount';

export function mountAccessoriesPanel(): Promise<unknown> {
  return mountIsland('accessoriesPanelRoot', () =>
    import('../apps/AccessoriesPanelApp').then((m) => m.default),
  );
}
