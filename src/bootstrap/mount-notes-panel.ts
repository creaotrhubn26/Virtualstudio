import { mountIsland } from './mount';

export function mountNotesPanel(): Promise<unknown> {
  return mountIsland('notesPanelRoot', () =>
    import('../apps/NotesPanelApp').then((m) => m.default),
  );
}
