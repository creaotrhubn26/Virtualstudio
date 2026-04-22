/**
 * Story Character HUD island.
 *
 * First mount extracted from src/main.ts as proof-of-pattern for the
 * bootstrap split (see MAIN_TS_SPLIT_PLAN.md). The App import is dynamic
 * so the HUD module only loads when #storyCharacterHudRoot is present.
 */

import { mountIsland } from './mount';

export function mountStoryCharacterHud(): Promise<unknown> {
  return mountIsland('storyCharacterHudRoot', () =>
    import('../apps/StoryCharacterHUDApp').then((m) => m.default),
  );
}
