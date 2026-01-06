export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string, ctrl?: boolean, shift?: boolean, alt?: boolean, meta?: boolean): void {
    const shortcutKey = this.buildShortcutKey(key, ctrl, shift, alt, meta);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    const key = this.buildShortcutKey(
      event.key.toLowerCase(),
      event.ctrlKey,
      event.shiftKey,
      event.altKey,
      event.metaKey
    );

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      return true;
    }

    return false;
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get all registered shortcuts
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return this.buildShortcutKey(
      shortcut.key,
      shortcut.ctrl,
      shortcut.shift,
      shortcut.alt,
      shortcut.meta
    );
  }

  /**
   * Build shortcut key string
   */
  private buildShortcutKey(
    key: string,
    ctrl?: boolean,
    shift?: boolean,
    alt?: boolean,
    meta?: boolean
  ): string {
    const parts: string[] = [];
    if (ctrl || meta) parts.push('ctrl');
    if (shift) parts.push('shift');
    if (alt) parts.push('alt');
    parts.push(key);
    return parts.join('+');
  }
}

export const keyboardShortcutManager = new KeyboardShortcutManager();

// Initialize global keyboard handler
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    keyboardShortcutManager.handleKeyDown(event);
  });
}

