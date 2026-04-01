export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: string;
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, Shortcut> = new Map();
  private listeners: Map<string, () => void> = new Map();

  register(shortcut: Shortcut, handler: () => void): () => void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.listeners.set(shortcut.id, handler);

    const onKeyDown = (e: KeyboardEvent) => {
      const matched = shortcut.keys.some((keyCombo) => {
        const parts = keyCombo.split('+');
        const key = parts[parts.length - 1];
        const ctrl = parts.includes('Ctrl');
        const shift = parts.includes('Shift');
        const alt = parts.includes('Alt');
        return e.key === key && e.ctrlKey === ctrl && e.shiftKey === shift && e.altKey === alt;
      });
      if (matched) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      this.shortcuts.delete(shortcut.id);
      this.listeners.delete(shortcut.id);
    };
  }

  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getById(id: string): Shortcut | undefined {
    return this.shortcuts.get(id);
  }

  unregisterAll(): void {
    this.shortcuts.clear();
    this.listeners.clear();
  }

  formatShortcut(shortcut: Shortcut): string {
    return shortcut.keys.join(' / ');
  }
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
export default keyboardShortcutsService;
