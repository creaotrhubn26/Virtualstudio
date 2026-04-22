import { mountIsland } from './mount';

export function mountGelPicker(): Promise<unknown> {
  return mountIsland('gelPickerRoot', () =>
    import('../App').then((m) => m.GelPickerApp),
  );
}
