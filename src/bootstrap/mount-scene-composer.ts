import { mountIsland } from './mount';

export function mountSceneComposer(): Promise<unknown> {
  return mountIsland('sceneComposerRoot', () =>
    import('../App').then((m) => m.SceneComposerPanelApp),
  );
}
