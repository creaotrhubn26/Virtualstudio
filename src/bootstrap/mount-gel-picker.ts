import { mountIsland } from './mount';

export function mountGelPicker(): Promise<unknown> {
  return mountIsland('gelPickerRoot', () =>
    import('../apps/GelPickerApp').then((m) => m.default),
  );
}
