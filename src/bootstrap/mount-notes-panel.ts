import { mountIsland } from './mount';

export function mountNotesPanel(): Promise<unknown> {
  return mountIsland('notesPanelRoot', () =>
    import('../App').then((m) => m.NotesPanelApp),
  );
}
