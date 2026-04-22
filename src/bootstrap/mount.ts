/**
 * Shared mount helper for Virtual Studio React islands.
 *
 * The app mounts ~30 distinct React subtrees into pre-declared DOM containers
 * defined in index.html. Historically these were inlined as ~4-line blocks
 * in src/main.ts (`getElementById` → `createRoot` → `render`). This helper
 * is the single source of truth for the pattern.
 *
 * Usage:
 *   import { mountIsland } from './bootstrap/mount';
 *   mountIsland('assetLibraryRoot', () => import('../App').then(m => m.AssetLibraryApp));
 *
 * When combined with dynamic imports, each mount can live in its own module
 * that the browser only downloads when the container is present on the page.
 * See MAIN_TS_SPLIT_PLAN.md for the migration roadmap.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

type AppComponent<P = object> = React.ComponentType<P>;
type AppLoader<P = object> = () => Promise<AppComponent<P>>;

// Keeps a handle per-container so we don't accidentally double-mount.
const activeRoots = new Map<string, Root>();

export async function mountIsland<P extends object = object>(
  containerId: string,
  loader: AppLoader<P>,
  props: P = {} as P,
): Promise<Root | null> {
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (activeRoots.has(containerId)) {
    return activeRoots.get(containerId) ?? null;
  }

  const Component = await loader();
  const root = createRoot(container);
  root.render(React.createElement(Component, props));
  activeRoots.set(containerId, root);
  return root;
}

export function unmountIsland(containerId: string): void {
  const root = activeRoots.get(containerId);
  if (!root) return;
  root.unmount();
  activeRoots.delete(containerId);
}
