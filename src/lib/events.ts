/**
 * Typed Virtual Studio event bus.
 *
 * Cross-island communication in this app flows through window-level CustomEvents
 * (see src/main.ts and various panels). Using raw strings is a foot-gun: a
 * typo or renamed event fails silently. This module is the single source of
 * truth for event names, and provides thin typed helpers around
 * window.dispatchEvent / window.addEventListener.
 *
 * Migration: replace
 *   window.dispatchEvent(new CustomEvent('vs-preset-applied', { detail: x }));
 * with
 *   studioEmit('vs-preset-applied', x);
 *
 * And replace
 *   window.addEventListener('vs-preset-applied', (e) => { ... });
 * with
 *   studioOn('vs-preset-applied', (detail) => { ... });
 *
 * When adding a new event, add it to STUDIO_EVENT_NAMES below. TypeScript
 * will reject emits/listeners for names not in the list.
 */

// Enumerate every event name the app uses. Keep sorted within groups.
export const STUDIO_EVENT_NAMES = [
  // Panel toggles
  'toggle-ai-assistant-panel',
  'toggle-marketplace-panel',
  'toggle-notes-panel',
  'toggle-pro-panel',
  'open-panel-creator',
  'openAvatarGenerator',
  'openCinematographyPatterns',
  'openLightPatternLibrary',
  'ch-open-panel',
  'ai-assistant-toggle-fullscreen',
  'marketplace-toggle-fullscreen',

  // Scene / node events
  'ch-scene-node-removed',
  'ch-scene-node-selected',
  'ch-scene-node-updated',
  'scene-banner-created',
  'sceneConfigResponse',
  'vs-scene-name-changed',

  // Props
  'ch-add-asset-at',
  'ch-add-equipment',
  'vs-add-prop',
  'vs-prop-added',
  'vs-prop-removed',
  'vs-ai-prop-generation-started',

  // Lights
  'ch-light-deselected',
  'ch-light-position-changed',
  'ch-light-updated',
  'light-deleted',
  'light-selected',
  'lights-updated',
  'lighting-preset-applied',
  'vs-gel-applied',
  'vs-light-changed',

  // Camera / framing
  'active-camera-changed',
  'camera-preset-changed',
  'camera-settings-changed',
  'ch-camera-preset-removed',
  'ch-camera-preset-selected',
  'ch-camera-preset-updated',
  'ch-recording-camera-changed',
  'ch-lens-preset',
  'vs-aperture-changed',

  // Characters
  'ch-character-keyboard-control-started',
  'ch-character-keyboard-control-stopped',
  'ch-character-loaded',
  'ch-character-pose-applied',
  'ch-character-quick-pose-applied',
  'ch-character-walk-complete',
  'ch-character-walk-started',
  'ch-character-walk-stopped',
  'ch-clear-story-characters',
  'ch-posing-character-info',
  'ch-posing-mode',
  'ch-posing-no-skeleton',
  'ch-story-character-selected',
  'ch-story-rig-ready',

  // Environment
  'ch-backdrop-loaded',
  'ch-floor-visibility-changed',
  'ch-set-floor-color',
  'ch-set-wall-color',
  'ch-toggle-floor',
  'ch-toggle-grid',
  'ch-toggle-wall',
  'ch-wall-visibility-changed',
  'ch-walls-visibility-changed',
  'vs-environment-changed',
  'vs-environment-diagnostics',
  'vs-outdoor-sun',

  // Rendering / pipeline
  'vs-render-mode-changed',
  'vs-rendering-changed',
  'vs-rendering-pipeline-ready',
  'ch-dof-animation-complete',
  'vs-pov-mode-changed',
  'vs-set-focus-target-type',

  // Groups
  'ch-create-group',
  'ch-import-group',

  // Auto / overlay controls
  'ch-auto-all',
  'ch-auto-exposure',
  'ch-auto-light',
  'ch-auto-wb',
  'ch-photographic-angles',
  'show-overlay-help',

  // Casting / avatar generation
  'casting-avatar-error',
  'casting-avatar-generated',

  // Session / auth
  'ch-logout',
  'ch-show-login',
  'ch-show-register',

  // Monitor / recording
  'ch-monitor-recording-started',
  'ch-monitor-recording-stopped',
  'model-meshes-registered',

  // Shot list / presets
  'vs-preset-applied',
  'vs-shotlist-applied',

  // Notifications
  'show-notification',
] as const;

export type StudioEventName = (typeof STUDIO_EVENT_NAMES)[number];

const _KNOWN: ReadonlySet<string> = new Set(STUDIO_EVENT_NAMES);

/**
 * Fire a typed studio event. Payload stays `unknown` at this layer — consumers
 * that need a specific shape should cast at the handler site. The win here is
 * name safety: unknown names fail at compile time.
 */
export function studioEmit<T = unknown>(name: StudioEventName, detail?: T): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, detail === undefined ? undefined : { detail }));
}

/**
 * Subscribe to a typed studio event. Returns an unsubscribe function.
 */
export function studioOn<T = unknown>(
  name: StudioEventName,
  handler: (detail: T | undefined, event: CustomEvent<T>) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const wrapped = (event: Event) => {
    const ce = event as CustomEvent<T>;
    handler(ce.detail, ce);
  };
  window.addEventListener(name, wrapped);
  return () => window.removeEventListener(name, wrapped);
}

/**
 * Dev-only assertion — call during bootstrap to verify a dispatched event
 * name exists in the registry. Production builds should strip this via
 * import.meta.env.DEV checks at the call site.
 */
export function assertKnownStudioEvent(name: string): asserts name is StudioEventName {
  if (!_KNOWN.has(name)) {
    throw new Error(
      `[studioEvents] Unknown event "${name}". Add it to STUDIO_EVENT_NAMES in src/lib/events.ts.`,
    );
  }
}
