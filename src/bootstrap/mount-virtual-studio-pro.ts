import { mountIsland } from './mount';

export function mountVirtualStudioPro(): Promise<unknown> {
  return mountIsland('virtualStudioProRoot', () =>
    import('../apps/VirtualStudioProApp').then((m) => m.default),
  );
}
