import { mountIsland } from './mount';

export function mountVirtualStudioPro(): Promise<unknown> {
  return mountIsland('virtualStudioProRoot', () =>
    import('../App').then((m) => m.VirtualStudioProApp),
  );
}
