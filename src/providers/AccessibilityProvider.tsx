/**
 * AccessibilityProvider - WCAG 2.2 Compliant Accessibility Context
 * 
 * Provides:
 * - useAccessibility hook for settings and announce function
 * - useFocusTrap hook for modal focus management
 * - useAnnounce hook for screen reader announcements
 * - VisuallyHidden component for screen reader only content
 * - Keyboard shortcut registration
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
  category?: string;
}

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  minimumTargetSize: number;
  announceDelay: number;
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  shortcuts: KeyboardShortcut[];
  prefersKeyboard: boolean;
}

const defaultSettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  minimumTargetSize: 56,
  announceDelay: 100,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

interface AccessibilityProviderProps {
  children: ReactNode;
  initialSettings?: Partial<AccessibilitySettings>;
}

export function AccessibilityProvider({
  children,
  initialSettings = {},
}: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [prefersKeyboard, setPrefersKeyboard] = useState(false);

  useEffect(() => {
    const onKeyDown = () => setPrefersKeyboard(true);
    const onMouseDown = () => setPrefersKeyboard(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, []);
  const announcerRef = useRef<HTMLDivElement>(null);
  const announcerAssertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSettings((prev) => ({ ...prev, reduceMotion: mediaQuery.matches }));

    const handler = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, reduceMotion: e.matches }));
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    setSettings((prev) => ({ ...prev, highContrast: contrastQuery.matches }));

    const handler = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, highContrast: e.matches }));
    };
    contrastQuery.addEventListener('change', handler);
    return () => contrastQuery.removeEventListener('change', handler);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const announcer = priority === 'assertive' ? announcerAssertiveRef.current : announcerRef.current;
      if (announcer) {
        announcer.textContent = '';
        setTimeout(() => {
          announcer.textContent = message;
        }, settings.announceDelay);
      }
    },
    [settings.announceDelay]
  );

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      const filtered = prev.filter((s) => s.key.toLowerCase() !== shortcut.key.toLowerCase());
      return [...filtered, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key.toLowerCase() !== key.toLowerCase()));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.modifiers?.includes('ctrl') ? e.ctrlKey : !e.ctrlKey;
        const altMatches = shortcut.modifiers?.includes('alt') ? e.altKey : !e.altKey;
        const shiftMatches = shortcut.modifiers?.includes('shift') ? e.shiftKey : !e.shiftKey;
        const metaMatches = shortcut.modifiers?.includes('meta') ? e.metaKey : !e.metaKey;

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value: AccessibilityContextValue = {
    settings,
    updateSettings,
    announce,
    registerShortcut,
    unregisterShortcut,
    shortcuts,
    prefersKeyboard,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      <div
        ref={announcerAssertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    return {
      settings: defaultSettings,
      updateSettings: () => {},
      announce: () => {},
      registerShortcut: () => {},
      unregisterShortcut: () => {},
      shortcuts: [],
      prefersKeyboard: false,
    };
  }
  return context;
}

export function useAnnounce() {
  const { announce } = useAccessibility();
  return announce;
}

export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

interface VisuallyHiddenProps {
  children: ReactNode;
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
}

export default AccessibilityProvider;
