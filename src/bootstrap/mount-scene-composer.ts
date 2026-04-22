import { mountIsland } from './mount';

export function mountSceneComposer(): Promise<unknown> {
  return mountIsland('sceneComposerRoot', () =>
    import('../apps/SceneComposerPanelApp').then((m) => m.default),
  );
}
