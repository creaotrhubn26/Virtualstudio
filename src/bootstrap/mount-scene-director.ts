import { mountIsland } from './mount';

export function mountSceneDirector(): Promise<unknown> {
  return mountIsland('sceneDirectorRoot', () =>
    import('../apps/SceneDirectorApp').then((m) => m.default),
  );
}
