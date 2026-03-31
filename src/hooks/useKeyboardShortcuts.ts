import { useEffect, useCallback } from 'react';

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: 'navigation' | 'edit' | 'view' | 'lighting' | 'camera' | 'animation' | 'export' | 'system';
  action?: () => void;
  preventDefault?: boolean;
}

export interface ShortcutCategory {
  id: string;
  label: string;
  shortcuts: Shortcut[];
}

export const SHORTCUT_REFERENCE: ShortcutCategory[] = [
  {
    id: 'navigation',
    label: 'Navigasjon',
    shortcuts: [
      { id: 'undo', keys: ['Ctrl+Z', 'Cmd+Z'], label: 'Angre', description: 'Angre siste handling', category: 'navigation' },
      { id: 'redo', keys: ['Ctrl+Y', 'Ctrl+Shift+Z'], label: 'Gjør om', description: 'Gjør om angret handling', category: 'navigation' },
      { id: 'save', keys: ['Ctrl+S', 'Cmd+S'], label: 'Lagre', description: 'Lagre prosjekt', category: 'navigation' },
      { id: 'open', keys: ['Ctrl+O', 'Cmd+O'], label: 'Åpne', description: 'Åpne prosjekt', category: 'navigation' },
      { id: 'new', keys: ['Ctrl+N', 'Cmd+N'], label: 'Nytt prosjekt', description: 'Opprett nytt prosjekt', category: 'navigation' },
    ],
  },
  {
    id: 'view',
    label: 'Visning',
    shortcuts: [
      { id: 'fullscreen', keys: ['F11', 'F'], label: 'Fullskjerm', description: 'Veksle fullskjerm', category: 'view' },
      { id: 'focus-camera', keys: ['C'], label: 'Kamerafokus', description: 'Sett kamerafokus', category: 'view' },
      { id: 'reset-view', keys: ['R'], label: 'Nullstill visning', description: 'Nullstill kameravinkel', category: 'view' },
      { id: 'grid-toggle', keys: ['G'], label: 'Veksle rutenett', description: 'Veksle rutenett synlighet', category: 'view' },
    ],
  },
  {
    id: 'lighting',
    label: 'Lyssetting',
    shortcuts: [
      { id: 'add-key-light', keys: ['L'], label: 'Legg til nøkkellys', description: 'Legg til et nytt nøkkellys', category: 'lighting' },
      { id: 'toggle-light', keys: ['T'], label: 'Veksle lys', description: 'Slå av/på valgt lys', category: 'lighting' },
      { id: 'increase-intensity', keys: ['=', '+'], label: 'Øk intensitet', description: 'Øk lysintensitet', category: 'lighting' },
      { id: 'decrease-intensity', keys: ['-', '_'], label: 'Reduser intensitet', description: 'Reduser lysintensitet', category: 'lighting' },
    ],
  },
  {
    id: 'camera',
    label: 'Kamera',
    shortcuts: [
      { id: 'camera-orbit', keys: ['Alt+drag'], label: 'Roter kamera', description: 'Roter kameravinkel', category: 'camera' },
      { id: 'camera-pan', keys: ['Shift+drag'], label: 'Panorering', description: 'Panorer kamera', category: 'camera' },
      { id: 'camera-zoom', keys: ['Scroll'], label: 'Zoom', description: 'Zoom kamera', category: 'camera' },
      { id: 'camera-reset', keys: ['Home'], label: 'Nullstill kamera', description: 'Nullstill kameraposisjon', category: 'camera' },
    ],
  },
  {
    id: 'animation',
    label: 'Animasjon',
    shortcuts: [
      { id: 'play-pause', keys: ['Space'], label: 'Spill av / Pause', description: 'Veksle avspilling', category: 'animation' },
      { id: 'stop', keys: ['Escape'], label: 'Stopp', description: 'Stopp animasjon', category: 'animation' },
      { id: 'next-frame', keys: ['ArrowRight', '.'], label: 'Neste bilderamme', description: 'Gå til neste bilderamme', category: 'animation' },
      { id: 'prev-frame', keys: ['ArrowLeft', ','], label: 'Forrige bilderamme', description: 'Gå til forrige bilderamme', category: 'animation' },
      { id: 'first-frame', keys: ['Home'], label: 'Første bilderamme', description: 'Gå til første bilderamme', category: 'animation' },
      { id: 'last-frame', keys: ['End'], label: 'Siste bilderamme', description: 'Gå til siste bilderamme', category: 'animation' },
    ],
  },
  {
    id: 'export',
    label: 'Eksport',
    shortcuts: [
      { id: 'quick-export', keys: ['Ctrl+E', 'Cmd+E'], label: 'Rask eksport', description: 'Eksporter med gjeldende innstillinger', category: 'export' },
      { id: 'screenshot', keys: ['F12', 'PrintScreen'], label: 'Skjermdump', description: 'Ta skjermdump', category: 'export' },
    ],
  },
];

export function useKeyboardShortcuts(shortcuts: Shortcut[] = []) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (!shortcut.action) continue;

        const matched = shortcut.keys.some((keyCombo) => {
          const parts = keyCombo.split('+');
          const key = parts[parts.length - 1];
          const ctrl = parts.includes('Ctrl');
          const shift = parts.includes('Shift');
          const alt = parts.includes('Alt');
          const cmd = parts.includes('Cmd');

          return (
            e.key === key &&
            e.ctrlKey === ctrl &&
            e.shiftKey === shift &&
            e.altKey === alt &&
            (e.metaKey === cmd || (cmd && e.ctrlKey))
          );
        });

        if (matched) {
          if (shortcut.preventDefault !== false) e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
